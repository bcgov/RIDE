import re
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from django.core import mail
from django.db import transaction
from django.test import override_settings

from apps.events import tasks
from apps.events.enums import (
    EventDisplayCategory,
    NotificationCreator,
    NotificationEventType,
    NotificationKind as KIND,
    NotificationStatus,
)
from apps.events.models import Event, QueuedEventNotification
from apps.users.models import get_task_user

from .notification_utils import NotificationTestCase

CLOSED_IMPACT = [{'id': 1, 'label': 'Closed', 'closed': True}]


class TestNotificationStatus(NotificationTestCase):
    ''' DBC22-7326: classifying each new event version '''

    def status(self, event):
        result = tasks.get_notification_status(event)
        return result[0] if result else None

    def test_new_event(self):
        event = self.make_event()
        self.assertEqual(tasks.get_notification_status(event), (KIND.NEW, None, None))

    def test_creation_requested(self):
        event = self.make_event(approved=False, severity='Major')
        self.assertEqual(tasks.get_notification_status(event), (KIND.APPROVAL_REQUESTED, None, 'new'))

    def test_creation_approved_before_sending(self):
        event = self.make_event(approved=False, severity='Major')
        self.save_version(event, self.approver, approved=True)
        self.assertIsNone(self.status(event))

    def test_approved_and_published(self):
        event = self.make_event(approved=False, severity='Major')
        published = self.save_version(event, self.approver, approved=True)
        self.assertEqual(self.status(published), KIND.APPROVED_PUBLISHED)

    def test_auto_approved_by_submitter_is_not_approval(self):
        # e.g., the was_closure loophole: a submitter's save is auto approved
        event = self.make_event(approved=False, impacts=CLOSED_IMPACT)
        published = self.save_version(event, self.submitter, approved=True, impacts=[])
        self.assertEqual(self.status(published), KIND.NEW)

    def test_updated(self):
        event = self.make_event()
        updated = self.save_version(event, self.submitter, additional='Bring snacks')
        kind, baseline, phrase = tasks.get_notification_status(updated)
        self.assertEqual(kind, KIND.UPDATED)
        self.assertEqual(baseline.uuid, event.uuid)
        self.assertIsNone(phrase)

    def test_no_visible_change(self):
        event = self.make_event()
        resaved = self.save_version(event, self.submitter, meta={'source': {'anything': True}})
        self.assertIsNone(tasks.get_notification_status(resaved))

    def test_excluded_nearby_place_is_not_a_change(self):
        event = self.make_event()
        start = {**event.start, 'nearby': event.start['nearby'] + [{'phrase': 'hidden', 'include': False}]}
        resaved = self.save_version(event, self.submitter, start=start)
        self.assertIsNone(tasks.get_notification_status(resaved))

    def test_road_condition_confirm(self):
        event = self.make_event(event_type='ROAD_CONDITION', direction='Both directions')
        # confirming in the same next update slot changes nothing but is still a reconfirmation
        confirmed = self.save_version(event, self.submitter, meta={'source': 'confirm_rcs'})
        self.assertEqual(self.status(confirmed), KIND.RECONFIRMED)

    def test_confirm_over_pending_version_is_reconfirmed(self):
        published = self.make_event(event_type='ROAD_CONDITION', direction='Both directions')
        self.save_version(published, self.submitter, approved=False, conditions=[{'id': 901, 'label': 'Snow packed'}])
        # confirm_rcs copies the published version, not the pending one
        confirmed = self.save_version(published, self.approver, meta={'source': 'confirm_rcs'},
                                      next_update=published.next_update.replace(hour=22))
        self.assertEqual(self.status(confirmed), KIND.RECONFIRMED)

    def test_later_edit_after_confirm_is_update(self):
        event = self.make_event(event_type='ROAD_CONDITION', direction='Both directions')
        confirmed = self.save_version(event, self.submitter, meta={'source': 'confirm_rcs'})
        # meta carries over to the next save, which changes the conditions
        edited = self.save_version(confirmed, self.submitter, conditions=[{'id': 901, 'label': 'Snow packed'}])
        self.assertEqual(self.status(edited), KIND.UPDATED)

    def test_road_condition_next_update_only(self):
        event = self.make_event(event_type='ROAD_CONDITION', direction='Both directions')
        confirmed = self.save_version(event, self.submitter, next_update=event.next_update.replace(hour=22))
        self.assertEqual(self.status(confirmed), KIND.RECONFIRMED)

    def test_incident_next_update_only_is_update(self):
        event = self.make_event()
        updated = self.save_version(event, self.submitter, next_update=event.next_update.replace(hour=22))
        self.assertEqual(self.status(updated), KIND.UPDATED)

    def test_update_requested(self):
        event = self.make_event(severity='Major', user=self.approver)
        pending = self.save_version(event, self.submitter, approved=False, additional='More')
        kind, baseline, phrase = tasks.get_notification_status(pending)
        self.assertEqual((kind, phrase), (KIND.APPROVAL_REQUESTED, 'updated'))
        self.assertEqual(baseline.uuid, event.uuid)

    def test_update_approved(self):
        event = self.make_event(severity='Major', user=self.approver)
        pending = self.save_version(event, self.submitter, approved=False, additional='More')
        approved = self.save_version(pending, self.approver, approved=True)
        kind, baseline, _ = tasks.get_notification_status(approved)
        self.assertEqual(kind, KIND.UPDATE_APPROVED)
        self.assertEqual(baseline.uuid, event.uuid)  # the published version, not the pending one

    def test_cleared(self):
        event = self.make_event()
        cleared = self.save_version(event, self.submitter, status='Inactive')
        self.assertEqual(self.status(cleared), KIND.CLEARED)

    def test_clearing_requested(self):
        event = self.make_event(severity='Major', user=self.approver)
        pending = self.save_version(event, self.submitter, approved=False, status='Inactive')
        self.assertEqual(tasks.get_notification_status(pending)[::2], (KIND.APPROVAL_REQUESTED, 'cleared'))

    def test_clearing_approved(self):
        event = self.make_event(severity='Major', user=self.approver)
        pending = self.save_version(event, self.submitter, approved=False, status='Inactive')
        approved = self.save_version(pending, self.approver, approved=True)
        self.assertEqual(self.status(approved), KIND.CLEARING_APPROVED)

    def test_auto_clear_of_pending_clear_is_cleared(self):
        event = self.make_event(severity='Major', user=self.approver)
        self.save_version(event, self.submitter, approved=False, status='Inactive')

        # check_end_time saves the published version as the task user
        published = Event.current.get(id=event.id)
        cleared = self.save_version(published, get_task_user(), status='Inactive')
        self.assertEqual(self.status(cleared), KIND.CLEARED)

    def test_reject_clear_sends_nothing(self):
        event = self.make_event(severity='Major', user=self.approver)
        pending = self.save_version(event, self.submitter, approved=False, status='Inactive')
        rejected = self.save_version(pending, self.approver, approved=True, status='Active')
        self.assertIsNone(tasks.get_notification_status(rejected))

    def test_approver_clearing_event_with_pending_update(self):
        event = self.make_event(severity='Major', user=self.approver)
        pending = self.save_version(event, self.submitter, approved=False, additional='More')
        cleared = self.save_version(pending, self.approver, approved=True, status='Inactive')
        self.assertEqual(self.status(cleared), KIND.CLEARED)

    def test_reactivated(self):
        event = self.make_event()
        cleared = self.save_version(event, self.submitter, status='Inactive')
        reactivated = self.save_version(cleared, self.submitter, status='Active')
        self.assertEqual(self.status(reactivated), KIND.UPDATED)

    def test_deleted_or_no_service_area(self):
        event = self.make_event()
        deleted = self.save_version(event, self.submitter, deleted=True)
        self.assertIsNone(tasks.get_notification_status(deleted))
        self.assertIsNone(tasks.get_notification_status(self.make_event(service_area=None)))


class TestNotificationSubscriptions(NotificationTestCase):
    ''' DBC22-7326: choosing who to email '''

    def recipients(self, event, kind):
        notification_event = tasks.get_notification_event(event)
        return set(tasks.get_notification_subscriptions(event, kind, notification_event))

    def test_matching_subscriber(self):
        event = self.make_event()
        self.assertEqual(self.recipients(event, KIND.NEW), {self.recipient})

    def test_exclusions(self):
        disabled = self.make_user('disabled')
        self.subscribe(disabled, notification=False)
        inactive = self.make_user('inactive', is_active=False)
        self.subscribe(inactive)
        no_email = self.make_user('noemail', email='')
        self.subscribe(no_email)
        self.subscribe(get_task_user())
        other_area = self.make_user('otherarea')
        self.subscribe(other_area, areas=[self.other_area])
        lost_access = self.make_user('lostaccess', organizations=[])
        self.subscribe(lost_access)

        self.assertEqual(self.recipients(self.make_event(), KIND.NEW), {self.recipient})

    def test_event_type_filter(self):
        planned_only = self.make_user('planned')
        self.subscribe(planned_only, notification_types=[NotificationEventType.PLANNED_EVENTS])

        self.assertEqual(self.recipients(self.make_event(), KIND.NEW), {self.recipient})
        self.assertEqual(self.recipients(self.make_event(event_type='Planned event'), KIND.NEW),
                         {self.recipient, planned_only})

    def test_severity_filter(self):
        majors = self.make_user('majors')
        self.subscribe(majors, notification_severities=[EventDisplayCategory.MAJOR_DELAYS])
        closures = self.make_user('closures')
        self.subscribe(closures, notification_severities=[EventDisplayCategory.CLOSURE])

        self.assertEqual(self.recipients(self.make_event(severity='Major'), KIND.NEW),
                         {self.recipient, majors})

        # closure takes precedence over major
        major_closure = self.make_event(severity='Major', impacts=CLOSED_IMPACT)
        self.assertEqual(self.recipients(major_closure, KIND.NEW), {self.recipient, closures})

    def test_severity_ignored_for_road_conditions(self):
        roads = self.make_user('roads')
        self.subscribe(roads, notification_types=[NotificationEventType.ROAD_CONDITIONS],
                       notification_severities=[])

        event = self.make_event(event_type='ROAD_CONDITION', direction='Both directions')
        self.assertEqual(self.recipients(event, KIND.NEW), {self.recipient, roads})

    def test_approval_outcomes_match_underlying_status(self):
        new_only = self.make_user('newonly')
        self.subscribe(new_only, notification_statuses=[NotificationStatus.NEW])
        approved_only = self.make_user('approvedonly')
        self.subscribe(approved_only, notification_statuses=[NotificationStatus.APPROVED])
        updated_only = self.make_user('updatedonly')
        self.subscribe(updated_only, notification_statuses=[NotificationStatus.UPDATED])
        cleared_only = self.make_user('clearedonly')
        self.subscribe(cleared_only, notification_statuses=[NotificationStatus.CLEARED])

        event = self.make_event()
        everyone = {self.recipient}
        self.assertEqual(self.recipients(event, KIND.NEW), everyone | {new_only})
        self.assertEqual(self.recipients(event, KIND.APPROVED_PUBLISHED), everyone | {new_only, approved_only})
        self.assertEqual(self.recipients(event, KIND.UPDATE_APPROVED),
                         everyone | {updated_only, approved_only})
        self.assertEqual(self.recipients(event, KIND.CLEARING_APPROVED),
                         everyone | {cleared_only, approved_only})
        self.assertEqual(self.recipients(event, KIND.UPDATED), everyone | {updated_only})

    def test_approval_requests_only_to_approvers(self):
        self.subscribe(self.approver)
        group_approver = self.make_approver_group_user('groupapprover')
        self.subscribe(group_approver)
        superuser = self.make_user('super', is_superuser=True)
        self.subscribe(superuser)

        event = self.make_event(approved=False, severity='Major')
        self.assertEqual(self.recipients(event, KIND.APPROVAL_REQUESTED),
                         {self.approver, group_approver, superuser})

    def test_creator_filters(self):
        creator = self.make_user('creator', organizations=[self.other_org])
        self.subscribe(creator, notification_creator=NotificationCreator.ME)
        colleague = self.make_user('colleague', organizations=[self.org, self.other_org])
        self.subscribe(colleague, notification_creator=NotificationCreator.ORGANIZATION)
        stranger = self.make_user('stranger')
        self.subscribe(stranger, notification_creator=NotificationCreator.ORGANIZATION)
        mine = self.make_user('mine')
        self.subscribe(mine, notification_creator=NotificationCreator.ME)

        # the colleague's area access is through Org A; they share Org B with the creator
        event = self.make_event(user=creator)
        updated = self.save_version(event, self.submitter, additional='More')
        self.assertEqual(self.recipients(updated, KIND.UPDATED), {self.recipient, creator, colleague})


class TestNotificationQueue(NotificationTestCase):
    ''' DBC22-7326: queueing versions on save and sending individual emails '''

    def test_new_versions_are_queued(self):
        event = self.make_event(approved=False, severity='Major')
        self.assertTrue(QueuedEventNotification.objects.filter(event_uuid=event.uuid).exists())

        # unchanged (pending) saves and forced updates insert no version
        unchanged = Event.objects.get(uuid=event.uuid)
        unchanged.save()
        unchanged.save(force_update=True)
        self.assertEqual(QueuedEventNotification.objects.count(), 1)

        # deleting saves a deleted version, which is not queued
        unchanged.delete()
        self.assertEqual(QueuedEventNotification.objects.count(), 1)

    def test_rolled_back_saves_are_not_queued(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                self.make_event()
                raise RuntimeError()

        self.assertEqual(QueuedEventNotification.objects.count(), 0)

    def test_kill_switch(self):
        with patch('apps.events.models._is_notification_disabled', return_value=True):
            self.make_event()
        self.assertEqual(QueuedEventNotification.objects.count(), 0)

        self.make_event()
        with patch('apps.events.tasks._is_notification_disabled', return_value=True):
            self.assertEqual(tasks.send_queued_event_notifications(), 0)
        self.assertEqual(QueuedEventNotification.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_requeued_when_smtp_is_down(self):
        self.make_event(severity='Major', user=self.approver)
        queued = QueuedEventNotification.objects.get()

        with patch('django.core.mail.backends.locmem.EmailBackend.open', side_effect=ConnectionRefusedError):
            self.assertEqual(tasks.send_queued_event_notifications(), 0)
        self.assertEqual(len(mail.outbox), 0)
        requeued = QueuedEventNotification.objects.get()
        self.assertEqual((requeued.event_uuid, requeued.created), (queued.event_uuid, queued.created))

        # sent once SMTP is back
        self.assertEqual(tasks.send_queued_event_notifications(), 1)
        self.assertEqual(QueuedEventNotification.objects.count(), 0)

    def test_requeued_when_every_send_fails(self):
        self.make_event(severity='Major', user=self.approver)

        with patch('django.core.mail.backends.locmem.EmailBackend.send_messages', side_effect=ConnectionRefusedError):
            self.assertEqual(tasks.send_queued_event_notifications(), 0)
        self.assertEqual(QueuedEventNotification.objects.count(), 1)

        self.assertEqual(tasks.send_queued_event_notifications(), 1)

    def test_versions_older_than_retry_limit_are_dropped(self):
        self.make_event(severity='Major', user=self.approver)
        QueuedEventNotification.objects.update(
            created=datetime.now(timezone.utc) - tasks.QUEUE_RETRY_LIMIT - timedelta(minutes=1))

        self.assertEqual(tasks.send_queued_event_notifications(), 0)
        self.assertEqual(QueuedEventNotification.objects.count(), 0)
        self.assertEqual(mail.outbox, [])

    def test_bad_data_is_not_retried(self):
        self.make_event(severity='Major', user=self.approver)

        with patch('apps.events.tasks.get_notification_status', side_effect=KeyError('bad data')):
            self.assertEqual(tasks.send_queued_event_notifications(), 0)
        self.assertEqual(QueuedEventNotification.objects.count(), 0)

    @override_settings(RIDE_NOTIFICATION_FROM_EMAIL_SENDER='DriveBC RIDE <DoNotReply_RIDE@gov.bc.ca>')
    def test_individual_emails(self):
        second = self.make_user('second')
        self.subscribe(second)
        event = self.make_event(severity='Major', user=self.approver)

        self.assertEqual(tasks.send_queued_event_notifications(), 2)
        self.assertEqual(QueuedEventNotification.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual({tuple(email.to) for email in mail.outbox},
                         {('recipient@gov.bc.ca',), ('second@gov.bc.ca',)})

        email = mail.outbox[0]
        self.assertEqual(email.subject, f'({event.id}) New major incident in 01 - South Island')
        self.assertEqual(email.from_email, 'DriveBC RIDE <DoNotReply_RIDE@gov.bc.ca>')
        self.assertIn('The following new event has been published to DriveBC', email.body)
        self.assertIn(f'Reference ID: {event.id}', email.body)

    def test_subjects(self):
        incident = tasks.get_notification_event(self.make_event(severity='Major'))
        road = tasks.get_notification_event(self.make_event(event_type='ROAD_CONDITION',
                                                            direction='Both directions'))
        closure = tasks.get_notification_event(self.make_event(impacts=CLOSED_IMPACT))
        future = datetime(2099, 1, 1, tzinfo=timezone.utc)
        future_closure = tasks.get_notification_event(self.make_event(impacts=CLOSED_IMPACT, start_time=future))
        future_incident = tasks.get_notification_event(self.make_event(start_time=future))
        area = '01 - South Island'

        expected = {
            KIND.NEW: 'New major incident in 01 - South Island',
            KIND.UPDATED: 'Update to major incident in 01 - South Island',
            KIND.CLEARED: 'Cleared major incident in 01 - South Island',
            KIND.APPROVAL_REQUESTED: 'Approval requested for major incident in 01 - South Island',
            KIND.APPROVED_PUBLISHED: 'Approved and published major incident in 01 - South Island',
            KIND.UPDATE_APPROVED: 'Approved and updated major incident in 01 - South Island',
            KIND.CLEARING_APPROVED: 'Approved and updated major incident in 01 - South Island',
            KIND.DUE_SOON: 'Updated required for major incident in 01 - South Island',
            KIND.OVERDUE: 'Overdue major incident in 01 - South Island',
        }
        for kind, subject in expected.items():
            self.assertEqual(tasks.get_event_subject(incident, kind, area), f'({incident.id}) {subject}')

        self.assertEqual(tasks.get_event_subject(road, KIND.RECONFIRMED, area),
                         f'({road.id}) Reconfirmed Road Condition in 01 - South Island')
        self.assertEqual(tasks.get_event_subject(closure, KIND.NEW, area),
                         f'({closure.id}) New closure in 01 - South Island')
        self.assertEqual(tasks.get_event_subject(future_closure, KIND.NEW, area),
                         f'({future_closure.id}) New future closure in 01 - South Island')
        self.assertEqual(tasks.get_event_subject(future_incident, KIND.NEW, area),
                         f'({future_incident.id}) New minor future event in 01 - South Island')

        with override_settings(RIDE_NOTIFICATION_SUBJECT_PREFIX='[DEV] '):
            self.assertEqual(tasks.get_event_subject(incident, KIND.OVERDUE, area),
                             f'[DEV] ({incident.id}) Overdue major incident in 01 - South Island')

    def test_ride_event_sub_type(self):
        from apps.events.helpers import get_ride_event_sub_type

        self.assertEqual(get_ride_event_sub_type({'type': 'Planned event', 'details': {'situation': 10}}),
                         'ROAD_CONSTRUCTION')
        self.assertEqual(get_ride_event_sub_type({'type': 'Planned event', 'details': {'situation': 1}}),
                         'PLANNED_EVENT')
        self.assertEqual(get_ride_event_sub_type({'type': 'Incident', 'details': {}}), 'HAZARD')

    def test_notification_event_matches_drivebc(self):
        event = self.make_event(
            end={'name': 'Highway 97', 'coords': [-123.3, 48.5],
                 'nearby': [{'name': 'Kamloops', 'phrase': '12 km Southwest of Kamloops', 'include': True}]},
        )
        notification_event = tasks.get_notification_event(event)

        self.assertEqual(notification_event.id, event.id)
        self.assertEqual(notification_event.route_at, 'Highway 97')
        self.assertEqual(notification_event.direction, 'N')
        self.assertEqual(notification_event.closest_landmark, 'Quesnel')
        self.assertEqual(notification_event.location_description,
                         'Starts: <br>30 km South of Quesnel<br><br>Ends: <br>12 km Southwest of Kamloops')
        self.assertEqual(notification_event.display_category, EventDisplayCategory.MINOR_DELAYS)
        self.assertEqual(notification_event.event_sub_type, 'OBSTRUCTION')  # situation 105, as DBC
        self.assertEqual(notification_event.timezone, 'America/Vancouver')


@override_settings(DRIVEBC_BASE_URL='https://www.drivebc.ca/', FRONTEND_BASE_URL='https://ride.example/')
class TestNotificationEmails(NotificationTestCase):
    ''' DBC22-7322: email content, ported DBC card adjusted to the RIDE Figma '''

    def send(self):
        mail.outbox.clear()
        tasks.send_queued_event_notifications()
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        return email, email.alternatives[0][0]

    def test_new_event(self):
        event = self.make_event(severity='Major', additional='Bring snacks', link='https://example.com/info',
                                impacts=[{'id': 1, 'label': 'Both lanes closed', 'closed': False}])
        email, html = self.send()

        self.assertIn('The following <b>new event</b> has been <b>published</b> to DriveBC:', html)
        self.assertIn('Major incident', html)
        self.assertIn('Obstruction', html)  # DriveBC sub type for situation 105
        self.assertIn('Northbound on Highway 97', html.replace('\u200c', '').replace('\xa0', ' '))  # no_autolink
        self.assertIn('30 km South of Quesnel', html)
        self.assertIn('Both lanes closed', html)
        self.assertIn('Bring snacks', html)
        self.assertIn('href="https://example.com/info"', html)
        self.assertIn('Jul 15, 2025 at 12:30 pm', html)  # next update as DriveBC shows it, Pacific time
        self.assertIn(f'Reference ID: {event.id}', html)
        self.assertIn('More information on DriveBC', html)
        self.assertIn(f'href="https://ride.example/events/?event={event.id}"', html)
        self.assertIn(f'View on RIDE: https://ride.example/events/?event={event.id}', email.body)
        self.assertIn(f'https://www.drivebc.ca/?type=event&amp;display_category=majorEvents&amp;id={event.id}', html)
        self.assertIn('notifications for the 01 - South Island service area', html)
        self.assertIn('href="https://ride.example/notifications/"', html)
        self.assertNotIn('strikethrough', html)  # no legend without changes
        self.assertNotIn('Close', html)

        # only the images the email shows, related to the HTML so mail apps don't list them as attachments
        content_ids = {attachment['Content-ID'] for attachment in email.attachments}
        self.assertTrue({'<bclogo>', '<incident-major>', '<map-pin>', '<impact-do-not-enter>'} <= content_ids)
        self.assertNotIn('<restriction-triangle>', content_ids)  # no restrictions
        self.assertEqual({f'<{cid}>' for cid in re.findall(r'cid:([\w.-]+)', html)}, content_ids)
        self.assertEqual(email.message().get_content_subtype(), 'related')
        self.assertIn('The following new event has been published to DriveBC:', email.body)

    def test_updated_event_highlights_changes(self):
        event = self.make_event(additional='Old details',
                                impacts=[{'id': 1, 'label': 'Blasting', 'closed': False}])
        tasks.send_queued_event_notifications()
        self.save_version(event, self.submitter, additional='New details',
                          impacts=[{'id': 2, 'label': 'Single lane alternating', 'closed': False}])
        email, html = self.send()

        self.assertIn('The following <b>existing event</b> has been <b>updated</b>:', html)
        self.assertIn('New details', html)
        self.assertIn('Old details', html)
        self.assertIn('line-through">Blasting', html)
        self.assertIn('Single lane alternating', html)
        self.assertIn('green highlight', html)  # legend
        self.assertTrue(email.subject.endswith('Update to minor incident in 01 - South Island'))

    def test_cleared_event(self):
        event = self.make_event(additional='As published')
        tasks.send_queued_event_notifications()
        self.save_version(event, self.submitter, status='Inactive', additional='Changed when clearing')
        email, html = self.send()

        self.assertIn('The following event has been marked as <b>cleared</b>:', html)
        self.assertIn('This minor incident has been cleared.', html)
        self.assertIn('As published', html)  # shows the published event
        self.assertNotIn('More information on DriveBC', html)
        self.assertIn('View on RIDE', html)

    def test_approval_requested(self):
        self.subscribe(self.approver)
        event = self.make_event(severity='Major', user=self.approver, additional='Before')
        tasks.send_queued_event_notifications()
        self.save_version(event, self.submitter, approved=False, additional='After')

        mail.outbox.clear()
        tasks.send_queued_event_notifications()
        self.assertEqual([email.to for email in mail.outbox], [['approver@gov.bc.ca']])
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('The following <b>updated</b> event <b>requires approval</b> before being updated', html)
        self.assertIn('line-through', html)

    def test_new_event_requiring_approval_has_no_drivebc_link(self):
        self.subscribe(self.approver)
        self.make_event(severity='Major', approved=False)

        tasks.send_queued_event_notifications()
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('The following <b>new</b> event <b>requires approval</b>', html)
        self.assertNotIn('More information on DriveBC', html)

    def test_update_approval_request_links_to_published_version(self):
        from django.utils.html import escape
        from apps.events.helpers import build_event_site_link

        self.subscribe(self.approver)
        event = self.make_event(user=self.approver)
        tasks.send_queued_event_notifications()
        mail.outbox.clear()

        self.save_version(event, self.submitter, approved=False, severity='Major')
        tasks.send_queued_event_notifications()
        html = mail.outbox[0].alternatives[0][0]
        published = tasks.get_notification_event(Event.objects.get(uuid=event.uuid))
        self.assertIn('requires approval', html)
        self.assertIn(escape(build_event_site_link(published)), html)
        self.assertIn('minorEvents', build_event_site_link(published))

    def test_reactivation_requiring_approval_has_no_drivebc_link(self):
        self.subscribe(self.approver)
        event = self.make_event(severity='Major', user=self.approver)
        cleared = self.save_version(event, self.approver, status='Inactive')
        tasks.send_queued_event_notifications()
        mail.outbox.clear()

        self.save_version(cleared, self.submitter, status='Active', approved=False)
        tasks.send_queued_event_notifications()
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('requires approval', html)
        self.assertNotIn('More information on DriveBC', html)

    def test_cid_in_event_text_is_not_an_image(self):
        self.make_event(additional='Spill of acid:sulfuric')
        with self.assertNoLogs('apps.shared.helpers', level='ERROR'):
            email, html = self.send()
        self.assertIn('acid:sulfuric', html)
        self.assertNotIn('<sulfuric>', {part['Content-ID'] for part in email.attachments})

    def test_road_condition(self):
        self.make_event(event_type='ROAD_CONDITION', direction='Both directions',
                        conditions=[{'id': 901, 'label': 'Snow packed'}])
        email, html = self.send()

        self.assertIn('Road condition', html)
        self.assertNotIn('>Conditions<', html)  # no conditions section, as DBC
        self.assertIn('<img src="cid:road"', html)


class TestAdminTestEmails(NotificationTestCase):
    ''' DBC22-7322: admin actions that email the admin a version's notification '''

    def run_action(self, action, queryset):
        from unittest.mock import MagicMock
        from types import SimpleNamespace

        modeladmin = MagicMock()
        mail.outbox.clear()
        action(modeladmin, SimpleNamespace(user=self.approver), queryset)
        return modeladmin.message_user.call_args

    def test_sends_to_the_admin(self):
        from apps.events import admin

        event = self.make_event(severity='Major')
        call = self.run_action(admin.send_me_new_notification, Event.objects.filter(uuid=event.uuid))

        self.assertEqual([email.to for email in mail.outbox], [['approver@gov.bc.ca']])
        self.assertIn('Sent 1 notification email(s)', call.args[1])

    def test_nothing_to_send_is_a_warning(self):
        from django.contrib import messages
        from apps.events import admin

        event = self.make_event()
        unchanged = self.save_version(event, self.submitter)
        call = self.run_action(admin.send_me_version_notification, Event.objects.filter(uuid=unchanged.uuid))

        self.assertEqual(mail.outbox, [])
        self.assertEqual(call.kwargs['level'], messages.WARNING)

    def test_send_errors_are_reported(self):
        from django.contrib import messages
        from apps.events import admin

        event = self.make_event()
        with patch('apps.events.tasks.send_event_notification', side_effect=RuntimeError('bad data')):
            call = self.run_action(admin.send_me_new_notification, Event.objects.filter(uuid=event.uuid))

        self.assertEqual(call.kwargs['level'], messages.ERROR)
        self.assertIn(event.id, call.args[1])

    def test_unbuildable_email_is_reported(self):
        from django.contrib import messages
        from apps.events import admin

        event = self.make_event()
        with patch('apps.events.tasks.get_notification_event', return_value=None):
            call = self.run_action(admin.send_me_new_notification, Event.objects.filter(uuid=event.uuid))

        self.assertEqual(call.kwargs['level'], messages.ERROR)
        self.assertIn(event.id, call.args[1])

    def test_kill_switch(self):
        from django.contrib import messages
        from apps.events import admin

        event = self.make_event()
        with patch('apps.events.admin._is_notification_disabled', return_value=True):
            call = self.run_action(admin.send_me_new_notification, Event.objects.filter(uuid=event.uuid))

        self.assertEqual(mail.outbox, [])
        self.assertEqual(call.kwargs['level'], messages.ERROR)
        self.assertIn('DISABLE_EVENT_NOTIFICATIONS', call.args[1])
