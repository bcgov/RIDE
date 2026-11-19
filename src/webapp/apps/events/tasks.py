import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db.models import F, Q
from django.template.loader import render_to_string
from huey import crontab
from huey.contrib.djhuey import db_periodic_task, lock_task, on_startup, post_execute

from ..users.models import EmailSubscription, RIDEUser, get_task_user
from .enums import (
    EventDisplayCategory,
    EventSeverity,
    NotificationCreator,
    NotificationEventType,
    NOTIFICATION_EVENT_TYPE_MAP,
    NotificationKind,
    NOTIFICATION_KIND_STATUSES,
    NOTIFICATION_SUBJECTS,
    EventType,
)
from .helpers import area_label, get_display_category, get_ride_event_data, get_severity_category
from .models import Event, EventReminderNotification, QueuedEventNotification, _is_notification_disabled
from .serializers import DriveBCChainupSerializer, DriveBCEventSerializer, EventSerializer

logger = logging.getLogger(__name__)


@db_periodic_task(crontab(minute="*"))
@lock_task('check-end-time')
def check_end_time():
    '''
    Find current events with an end time earlier than now + one minute, and
    clear them.

    To accommodate lag in the time that clearing shows up on the browser, we
    query for one minute into the future (i.e., the same time as the period of
    the task being run) so that events show as cleared possibly several seconds
    before end_time, rather than afterwards.

    See DBC22-5632 for design rationale.
    '''

    cutoff = datetime.now(timezone.utc) + timedelta(minutes=1)
    user = get_task_user()

    for event in Event.current.filter(end_time__lte=cutoff, status='Active'):
        event.status = 'Inactive'
        event.user = user
        event.last_inactivated = event.end_time
        event.save()


# --- DBC22-7326: email notifications ---------------------------------------
# Follows DBC apps/event/tasks.py (DBC22-6954 @ dd9770a3): versions are queued
# on save and drained by a periodic task, but each queued version is sent as
# individual emails rather than batched into digests.

REMINDER_INTERVAL = timedelta(minutes=15)
QUEUE_RETRY_LIMIT = timedelta(days=1)  # queued versions not sent by then are dropped


class NotificationSendError(Exception):
    ''' None of a version's emails could be sent, e.g. SMTP is down; safe to retry '''


# Fields compared to decide whether a version changed what users see
CONTENT_FIELDS = (
    'event_type', 'start', 'end', 'direction', 'severity', 'category', 'situation',
    'impacts', 'restrictions', 'conditions', 'schedules', 'chainup_id',
    'delay_amount', 'delay_unit', 'next_update', 'start_time', 'end_time',
    'additional', 'link',
)


def is_active_approver(user):
    # is_approver is has_perm(), which is True for active superusers
    return user is not None and user.is_active and user.is_approver


def content_changes(event, baseline):
    ''' Return the set of CONTENT_FIELDS that differ between two versions '''

    changes = set()
    for field in CONTENT_FIELDS:
        current = getattr(event, field)
        previous = getattr(baseline, field)
        if current == previous:
            continue

        # compare locations as users see them, ignoring e.g. unincluded nearby places
        if field in ('start', 'end') and current and previous:
            if not Event._meta.get_field(field).diff(previous, current):
                continue

        changes.add(field)

    return changes


def get_notification_status(event):
    '''
    Classify a newly saved event version.

    Returns (kind, baseline, phrase) or None when no notification is sent.
    The baseline is the last approved version before this one, i.e., what
    DriveBC shows; phrase is 'new', 'updated' or 'cleared' for approval
    requests.
    '''

    if event.deleted:
        return None

    if not event.service_area_id:
        logger.warning(f'No notifications for {event}: no service area')
        return None

    prior = Event.objects.filter(id=event.id, version=event.version - 1).first() if event.version else None
    baseline = Event.objects.filter(
        id=event.id, approved=True, version__lt=event.version,
    ).order_by('-version').first()

    if not event.approved:
        return get_approval_request_status(event, prior, baseline)

    return get_published_status(event, prior, baseline)


def get_approval_request_phrase(event, baseline):
    ''' 'new', 'updated' or 'cleared' for a pending version, or None when it requests nothing '''

    if baseline is None:
        return 'new' if event.status == 'Active' else None

    if baseline.status == 'Active' and event.status == 'Inactive':
        return 'cleared'

    if baseline.status == 'Inactive' and event.status == 'Inactive':
        return None

    return 'updated'


def get_approval_request_status(event, prior, baseline):
    ''' Classify a version awaiting approval '''

    # Approved before the queue was sent; the approval sends its own email
    if Event.objects.filter(id=event.id, version__gt=event.version, approved=True).exists():
        return None

    phrase = get_approval_request_phrase(event, baseline)
    if phrase is None:
        return None

    # Re-saving a pending version without changes
    if prior and not prior.approved and prior.status == event.status and not content_changes(event, prior):
        return None

    return NotificationKind.APPROVAL_REQUESTED, baseline, phrase


def is_approval(event, prior, confirm):
    '''
    Only an approver saving over a pending version approves it; auto approval
    (e.g., the task user clearing at end time) is not approval
    '''

    return bool(prior and not prior.approved and is_active_approver(event.user) and not confirm)


def get_first_publish_status(event, approval):
    ''' Classify the first approved version '''

    if event.status != 'Active':
        return None

    kind = NotificationKind.APPROVED_PUBLISHED if approval else NotificationKind.NEW
    return kind, None, None


def get_status_change_kind(event, baseline, approval, prior_inactive):
    ''' Kind for a version that clears or reactivates the published event, else None '''

    if baseline.status == 'Active' and event.status == 'Inactive':
        return NotificationKind.CLEARING_APPROVED if approval and prior_inactive else NotificationKind.CLEARED

    if baseline.status == 'Inactive' and event.status == 'Active':  # reactivated
        return NotificationKind.UPDATE_APPROVED if approval else NotificationKind.UPDATED

    return None


def get_published_status(event, prior, baseline):
    ''' Classify an approved version against the published baseline '''

    # meta carries over to later versions, so only a save that changed no
    # more than the next update of the version it confirmed (the published
    # one, even with a pending version in between) is the reconfirmation
    confirmed = baseline or prior
    confirm = (event.meta or {}).get('source') == 'confirm_rcs' and \
        (confirmed is None or content_changes(event, confirmed) <= {'next_update'})
    approval = is_approval(event, prior, confirm)
    prior_inactive = bool(prior and prior.status == 'Inactive')

    if baseline is None:
        return get_first_publish_status(event, approval)

    kind = get_status_change_kind(event, baseline, approval, prior_inactive)
    if kind:
        return kind, baseline, None

    if event.status == 'Inactive':
        return None

    if confirm and event.event_type == EventType.ROAD_CONDITION:
        return NotificationKind.RECONFIRMED, baseline, None

    # Reject Clear: approver keeps the event active, nothing published changes
    return get_content_change_status(event, baseline, approval and not prior_inactive)


def get_content_change_status(event, baseline, approval):
    ''' Classify an active version by what changed since the baseline '''

    changes = content_changes(event, baseline)
    if not changes:
        return None

    if approval:
        return NotificationKind.UPDATE_APPROVED, baseline, None

    if changes == {'next_update'} and event.event_type == EventType.ROAD_CONDITION:
        return NotificationKind.RECONFIRMED, baseline, None

    return NotificationKind.UPDATED, baseline, None


def get_notification_event(event):
    '''
    Return the DriveBC view of a RIDE event version, built from RIDE's API
    representation the same way DBC builds it from /api/events/relevant.
    '''

    data = dict(EventSerializer(event).data)
    is_chainup = event.event_type == EventType.CHAIN_UP
    serializer = (DriveBCChainupSerializer if is_chainup else DriveBCEventSerializer)(data=data)

    if not serializer.is_valid():
        logger.warning(f'Error building notification data for {event}: {serializer.errors}')
        return None

    fields = dict(serializer.validated_data) if is_chainup else get_ride_event_data(data, serializer.validated_data)
    if is_chainup:
        fields.setdefault('start', None)
        fields.setdefault('end', None)
        fields.setdefault('impacts', [])
        fields.setdefault('restrictions', [])
        fields.setdefault('schedules', [])
        fields.setdefault('additional', '')
        fields.setdefault('link', '')
        fields.setdefault('event_sub_type', '')  # as DBC's RIDEChainupSerializer

    notification_event = SimpleNamespace(**fields)
    notification_event.display_category = get_display_category(notification_event)
    notification_event.ride = event
    return notification_event


def get_image_type_file_name(event):
    major_delay_icon_map = {
        EventType.CONSTRUCTION: 'construction-major.png',
        EventType.INCIDENT: 'incident-major.png',
    }

    minor_delay_icon_map = {
        EventType.CONSTRUCTION: 'construction-minor.png',
        EventType.INCIDENT: 'incident-minor.png'
    }

    icon_name_map = {
        EventDisplayCategory.CLOSURE: 'closure.png',
        EventDisplayCategory.ROAD_CONDITION: 'road.png',
        EventDisplayCategory.FUTURE_DELAYS: 'future.png',
        EventDisplayCategory.CHAIN_UP: 'chain-up.png'
    }

    if event.display_category == EventDisplayCategory.MAJOR_DELAYS:
        return major_delay_icon_map.get(event.event_type, 'incident-minor.png')

    elif event.display_category == EventDisplayCategory.MINOR_DELAYS:
        return minor_delay_icon_map.get(event.event_type, 'incident-minor.png')

    else:
        return icon_name_map.get(event.display_category, 'incident-minor.png')


def get_event_subject_label(event):
    # closures omit the event type
    if event.display_category == EventDisplayCategory.CLOSURE:
        return 'closure'

    if event.display_category == EventDisplayCategory.ROAD_CONDITION:
        return 'road condition'

    if event.display_category == EventDisplayCategory.CHAIN_UP:
        return 'commercial chain-up'

    severity = 'major' if event.severity == EventSeverity.MAJOR else 'minor'
    if event.display_category == EventDisplayCategory.FUTURE_DELAYS:
        # model severity is never CLOSURE; API derives it from closed
        return 'future closure' if event.closed else f'{severity} future event'

    event_type = 'incident' if event.event_type == EventType.INCIDENT else 'delay'
    return f'{severity} {event_type}'


def get_event_subject(event, kind, location_label):
    subject = NOTIFICATION_SUBJECTS[kind].format(label=get_event_subject_label(event), area=location_label)
    return f'{settings.RIDE_NOTIFICATION_SUBJECT_PREFIX}({event.id}) {subject}'


def get_notification_subscriptions(event, kind, notification_event):
    '''
    Return the users to email about an event version.

    Users must have notifications on, with matching type, status, severity,
    creator and service area filters, and still have access to the event's
    service area through one of their organizations.
    '''

    type_code = NOTIFICATION_EVENT_TYPE_MAP.get(event.event_type)
    if type_code is None or not event.service_area_id:
        return []

    status_filter = Q()
    for status in NOTIFICATION_KIND_STATUSES[kind]:
        status_filter |= Q(notification_statuses__contains=[status])

    # Separate filter() calls so each many-to-many condition gets its own join
    subscriptions = EmailSubscription.objects \
        .filter(notification=True, user__is_active=True) \
        .filter(notification_types__contains=[type_code]) \
        .filter(status_filter) \
        .filter(notification_areas=event.service_area_id) \
        .filter(user__organizations__service_areas=event.service_area_id) \
        .exclude(user__email='') \
        .exclude(user__username='taskuser')

    # Severity only applies to incidents and planned events, since road
    # conditions and chain-ups are always minor.  Whether it should apply to
    # them too is an open question for the business.
    if type_code in (NotificationEventType.INCIDENTS, NotificationEventType.PLANNED_EVENTS):
        subscriptions = subscriptions.filter(
            notification_severities__contains=[get_severity_category(notification_event)]
        )

    creator_id = event.get_creator_id()
    creator_filter = Q(notification_creator=NotificationCreator.ALL)
    if creator_id:
        same_organization = RIDEUser.objects.filter(organizations__users=creator_id).values('id')
        creator_filter |= Q(notification_creator=NotificationCreator.ME, user_id=creator_id)
        creator_filter |= Q(notification_creator=NotificationCreator.ORGANIZATION,
                            user_id__in=same_organization)
    subscriptions = subscriptions.filter(creator_filter)

    if kind == NotificationKind.APPROVAL_REQUESTED:
        subscriptions = subscriptions.filter(
            Q(user__is_superuser=True) |
            Q(user__user_permissions__codename='approve_ride_events') |
            Q(user__groups__permissions__codename='approve_ride_events')
        )

    return [subscription.user for subscription in subscriptions.select_related('user').distinct()]


def send_event_emails(notification_event, kind, context, recipients):
    '''
    Send one email per recipient.  Follows DBC's send_event_emails, without
    combining events into one email.
    '''

    if _is_notification_disabled() or not recipients:
        return 0

    area = area_label(notification_event.ride.service_area)
    context = {
        **context,
        'event': notification_event,
        'kind': kind,
        'area_label': area,
        'fe_base_url': settings.FRONTEND_BASE_URL,
        'support_email': settings.RIDE_SUPPORT_EMAIL,
    }
    subject = get_event_subject(notification_event, kind, area)
    text = render_to_string('email/event_updated.txt', context)

    # One SMTP session for all recipients
    connection = get_connection()
    try:
        connection.open()
    except Exception as error:
        raise NotificationSendError(f'Could not connect to send {kind} notifications') from error

    sent = 0
    failed = False
    try:
        for user in recipients:
            msg = EmailMultiAlternatives(
                subject,
                text,
                settings.RIDE_NOTIFICATION_FROM_EMAIL_SENDER,
                [user.email],
                connection=connection,
            )
            try:
                msg.send()
                sent += 1
            except Exception:
                failed = True
                logger.exception(f'Failed to send {kind} notification for {notification_event.id} to user {user.pk}')
    finally:
        try:
            connection.close()
        except Exception:
            logger.exception('Failed to close the notification SMTP connection')

    # Nothing was sent, so it's safe to retry; partial failures are only
    # logged, so nobody gets an email twice
    if failed and not sent:
        raise NotificationSendError(f'Could not send {kind} notifications')

    return sent


def send_event_notification(event, kind, baseline=None, phrase=None):
    ''' Email subscribers about a classified event version; returns emails sent '''

    if not EmailSubscription.objects.filter(notification=True, notification_areas=event.service_area_id).exists():
        return 0

    notification_event = get_notification_event(event)
    if notification_event is None:
        return 0

    recipients = get_notification_subscriptions(event, kind, notification_event)
    context = {'phrase': phrase, 'baseline': baseline}
    return send_event_emails(notification_event, kind, context, recipients)


def send_queued_event_notifications():
    ''' Send emails for each queued event version, oldest first '''

    total = 0
    for queued in QueuedEventNotification.objects.order_by('created'):
        # Claim the row before sending so a version is never emailed twice
        claimed, _ = QueuedEventNotification.objects.filter(pk=queued.pk).delete()
        if not claimed or _is_notification_disabled():
            continue

        # e.g. queued during a long SMTP outage: too late to be useful
        if queued.created < datetime.now(timezone.utc) - QUEUE_RETRY_LIMIT:
            logger.error(f'Dropped notifications for event version {queued.event_uuid}, queued at {queued.created}')
            continue

        try:
            event = Event.objects.select_related('user', 'service_area', 'segment', 'chainup') \
                                 .filter(uuid=queued.event_uuid).first()
            result = event and get_notification_status(event)
            if result:
                kind, baseline, phrase = result
                total += send_event_notification(event, kind, baseline, phrase)

        except NotificationSendError:
            # Nothing was sent, e.g. SMTP is down: try again next run
            logger.exception(f'Failed to send notifications for event version {queued.event_uuid}')
            requeue_event_notification(queued)

        except Exception:
            # e.g. bad data: retrying won't help
            logger.exception(f'Failed to send notifications for event version {queued.event_uuid}')

    if total:
        logger.warning(f'Sent {total} event notification emails')

    return total


def requeue_event_notification(queued):
    ''' Put back a claimed queue row, keeping its age for QUEUE_RETRY_LIMIT '''

    requeued, _ = QueuedEventNotification.objects.get_or_create(event_uuid=queued.event_uuid)
    QueuedEventNotification.objects.filter(pk=requeued.pk).update(created=queued.created)


def send_event_reminder_notifications(now=None):
    '''
    Email update due soon and overdue reminders for published events.

    Due soon is sent once, 15 minutes before the next update.  Overdue is sent
    when the next update passes, then every 15 minutes until the event gets a
    new next update or end time, or is cleared.
    '''

    if _is_notification_disabled():
        return 0

    current_time = now or datetime.now(timezone.utc)
    now = current_time.replace(second=0, microsecond=0)  # sends are recorded per minute
    total = 0

    events = list(Event.current.filter(
        status='Active',
        next_update__isnull=False,
        next_update__lte=current_time + REMINDER_INTERVAL,
        service_area__isnull=False,
    ).select_related('user', 'service_area', 'segment', 'chainup'))

    # One query for the reminders already sent for these events
    reminders = {
        (reminder.event_id, reminder.kind, reminder.next_update): reminder
        for reminder in EventReminderNotification.objects.filter(event_id__in={event.id for event in events})
    }

    for event in events:
        try:
            total += send_event_reminder(event, now, current_time, reminders)
        except Exception:
            logger.exception(f'Failed to send reminder notifications for {event}')

    if total:
        logger.warning(f'Sent {total} event reminder emails')

    return total


def send_event_reminder(event, now, current_time=None, reminders=None):
    '''
    Send any due soon or overdue reminder for a published event; returns
    emails sent.  `now` is the minute sends are recorded at, `current_time`
    the actual time, and `reminders` those already sent, by (event_id, kind,
    next_update).
    '''

    current_time = current_time or now
    kind = NotificationKind.DUE_SOON if event.next_update > current_time else NotificationKind.OVERDUE
    reminder = (reminders or {}).get((event.id, kind, event.next_update))

    if reminder is None:
        # Create the record before sending so concurrent runs can't both send
        reminder, created = EventReminderNotification.objects.get_or_create(
            event_id=event.id, kind=kind, next_update=event.next_update,
            defaults={'end_time': event.end_time, 'last_sent': now},
        )
        if created:
            return send_event_notification(event, kind)

    if kind == NotificationKind.DUE_SOON:  # sent once
        return 0

    if reminder.stopped:
        return 0

    if reminder.end_time != event.end_time:  # a new end time resolves the overdue event
        reminder.stopped = True
        reminder.save(update_fields=['stopped'])
        return 0

    if now >= reminder.last_sent + REMINDER_INTERVAL:
        claimed = EventReminderNotification.objects \
            .filter(pk=reminder.pk, last_sent=reminder.last_sent) \
            .update(last_sent=now, count=F('count') + 1)
        if claimed:
            return send_event_notification(event, NotificationKind.OVERDUE)

    return 0


def purge_event_reminder_notifications(now):
    ''' Remove week-old reminder records no longer matching a published event '''

    stale = list(EventReminderNotification.objects.filter(last_sent__lt=now - timedelta(days=7)))
    if not stale:
        return

    current = set(Event.current.filter(
        status='Active', id__in={reminder.event_id for reminder in stale},
    ).values_list('id', 'next_update'))

    EventReminderNotification.objects.filter(pk__in=[
        reminder.pk for reminder in stale
        if (reminder.event_id, reminder.next_update) not in current
    ]).delete()


@db_periodic_task(crontab(minute="*"))
@lock_task('notifications-lock')
def send_queued_event_notifications_task():
    send_queued_event_notifications()


@db_periodic_task(crontab(minute="*"))
@lock_task('event-reminders-lock')
def send_event_reminder_notifications_task():
    send_event_reminder_notifications()


@db_periodic_task(crontab(hour="3", minute="15"))
@lock_task('event-reminders-purge-lock')
def purge_event_reminder_notifications_task():
    purge_event_reminder_notifications(datetime.now(timezone.utc))
