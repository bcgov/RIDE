from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from django.core import mail

from apps.events import tasks
from apps.events.enums import NotificationKind as KIND
from apps.events.models import EventReminderNotification

from .notification_utils import NotificationTestCase

NOW = datetime(2025, 7, 15, 19, 0, tzinfo=timezone.utc)
MINUTE = timedelta(minutes=1)


class TestEventReminders(NotificationTestCase):
    ''' DBC22-7326: update due soon and overdue reminders '''

    def run_at(self, now):
        mail.outbox = []
        tasks.send_event_reminder_notifications(now=now)
        return [email.subject for email in mail.outbox]

    def test_due_soon_sent_once(self):
        event = self.make_event(next_update=NOW + 10 * MINUTE)

        self.assertEqual(self.run_at(NOW - 10 * MINUTE), [])  # more than 15 minutes away
        self.assertEqual(self.run_at(NOW), [f'({event.id}) Updated required for minor incident in 01 - South Island'])
        self.assertEqual(self.run_at(NOW + MINUTE), [])

    def test_overdue_repeats_every_15_minutes(self):
        event = self.make_event(next_update=NOW - MINUTE)
        overdue = [f'({event.id}) Overdue minor incident in 01 - South Island']

        self.assertEqual(self.run_at(NOW), overdue)
        self.assertEqual(self.run_at(NOW + 14 * MINUTE), [])
        self.assertEqual(self.run_at(NOW + 15 * MINUTE + timedelta(seconds=2)), overdue)
        self.assertEqual(self.run_at(NOW + 16 * MINUTE), [])

        reminder = EventReminderNotification.objects.get(event_id=event.id, kind=KIND.OVERDUE)
        self.assertEqual(reminder.count, 2)

    def test_no_burst_after_outage(self):
        self.make_event(next_update=NOW - MINUTE)
        self.run_at(NOW)

        self.assertEqual(len(self.run_at(NOW + timedelta(hours=1))), 1)
        self.assertEqual(self.run_at(NOW + timedelta(hours=1) + MINUTE), [])

    def test_new_next_update_stops_overdue(self):
        event = self.make_event(next_update=NOW - MINUTE)
        self.run_at(NOW)

        self.save_version(event, self.submitter, next_update=NOW + timedelta(hours=2))
        self.assertEqual(self.run_at(NOW + 15 * MINUTE), [])

    def test_new_end_time_stops_overdue(self):
        event = self.make_event(next_update=NOW - MINUTE)
        self.run_at(NOW)

        self.save_version(event, self.submitter, end_time=NOW + timedelta(days=1))
        self.assertEqual(self.run_at(NOW + 15 * MINUTE), [])
        self.assertTrue(EventReminderNotification.objects.get(event_id=event.id).stopped)

    def test_cleared_event_stops_overdue(self):
        event = self.make_event(next_update=NOW - MINUTE)
        self.run_at(NOW)

        self.save_version(event, self.submitter, status='Inactive')
        self.assertEqual(self.run_at(NOW + 15 * MINUTE), [])

    def test_only_published_versions(self):
        event = self.make_event(next_update=NOW + timedelta(hours=2), severity='Major', user=self.approver)
        # pending update with an overdue next update; DriveBC still shows the published one
        self.save_version(event, self.submitter, approved=False, next_update=NOW - MINUTE)
        self.assertEqual(self.run_at(NOW), [])

    def test_planned_events_without_next_update(self):
        self.make_event(event_type='Planned event', next_update=None)
        self.assertEqual(self.run_at(NOW), [])

    def test_kill_switch(self):
        self.make_event(next_update=NOW - MINUTE)
        with patch('apps.events.tasks._is_notification_disabled', return_value=True):
            self.assertEqual(self.run_at(NOW), [])
        self.assertFalse(EventReminderNotification.objects.exists())

    def test_purge(self):
        live = self.make_event(next_update=NOW - MINUTE)
        self.run_at(NOW)
        gone = self.make_event(next_update=NOW - MINUTE)
        self.run_at(NOW)
        self.save_version(gone, self.submitter, status='Inactive')

        later = NOW + timedelta(days=8)
        EventReminderNotification.objects.update(last_sent=NOW)
        with patch('apps.events.tasks.send_event_notification', return_value=0):
            tasks.purge_event_reminder_notifications(later)

        self.assertEqual(set(EventReminderNotification.objects.values_list('event_id', flat=True)), {live.id})

    def test_one_failing_event_does_not_stop_others(self):
        broken = self.make_event(next_update=NOW - MINUTE)
        working = self.make_event(next_update=NOW - MINUTE)
        send = tasks.send_event_notification

        def flaky(event, kind, *args, **kwargs):
            if event.id == broken.id:
                raise RuntimeError('bad data')
            return send(event, kind, *args, **kwargs)

        with patch('apps.events.tasks.send_event_notification', side_effect=flaky):
            self.assertEqual(self.run_at(NOW), [f'({working.id}) Overdue minor incident in 01 - South Island'])

    def test_passed_next_update_is_overdue_not_due_soon(self):
        event = self.make_event(next_update=NOW + timedelta(seconds=30))

        # 45 seconds into the minute the next update has passed
        self.assertEqual(self.run_at(NOW + timedelta(seconds=45)),
                         [f'({event.id}) Overdue minor incident in 01 - South Island'])

    def test_no_emails_built_without_subscribers(self):
        self.subscription.notification_areas.set([self.other_area])
        self.make_event(next_update=NOW - MINUTE)
        with patch('apps.events.tasks.get_notification_event') as build:
            self.assertEqual(self.run_at(NOW), [])
        build.assert_not_called()
