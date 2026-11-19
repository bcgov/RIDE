from datetime import datetime, timezone
from unittest.mock import patch

from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.geos import GeometryCollection, Point
from django.test import TestCase

from apps.events.enums import (
    NotificationCreator,
    NOTIFICATION_EVENT_TYPES,
    NOTIFICATION_SEVERITIES,
    NOTIFICATION_STATUSES,
)
from apps.events.models import Event
from apps.organizations.models import Organization, ServiceArea
from apps.users.models import EmailSubscription, RIDEUser


def approver_permission():
    content_type = ContentType.objects.get(app_label='users', model='rideuser')
    permission, _ = Permission.objects.get_or_create(
        codename='approve_ride_events',
        content_type=content_type,
        defaults={'name': 'Can approve ride events'},
    )
    return permission


class NotificationTestCase(TestCase):
    '''
    Base for DBC22-7326 notification tests: a district with two service
    areas, an organization covering both, a submitter, an approver and a
    recipient with every notification option on for the first area.
    '''

    def setUp(self):
        super().setUp()

        for target in ('apps.events.models._is_notification_disabled',
                       'apps.events.tasks._is_notification_disabled',
                       'apps.events.admin._is_notification_disabled'):
            patcher = patch(target, return_value=False)
            patcher.start()
            self.addCleanup(patcher.stop)

        # from the service areas fixture loaded by migrations
        self.area = ServiceArea.objects.get(id=8)  # 01 - South Island
        self.other_area = ServiceArea.objects.get(id=9)  # 02 - Central Island

        self.org = Organization.objects.create(name='Org A')
        self.org.service_areas.set([self.area, self.other_area])
        self.other_org = Organization.objects.create(name='Org B')
        self.other_org.service_areas.set([self.area])

        self.submitter = self.make_user('submitter')
        self.approver = self.make_user('approver', approver=True)
        self.recipient = self.make_user('recipient')
        self.subscription = self.subscribe(self.recipient)

        self.event_number = 100000

    def make_user(self, username, organizations=None, approver=False, **kwargs):
        user = RIDEUser.objects.create_user(
            username=username,
            email=kwargs.pop('email', f'{username}@gov.bc.ca'),
            password='pw',
            first_name=username.title(),
            **kwargs,
        )
        user.organizations.set(organizations if organizations is not None else [self.org])
        if approver:
            user.user_permissions.add(approver_permission())
        return RIDEUser.objects.get(pk=user.pk)  # clear permission caches

    def make_approver_group_user(self, username):
        group = Group.objects.create(name=f'{username} approvers')
        group.permissions.add(approver_permission())
        user = self.make_user(username)
        user.groups.add(group)
        return RIDEUser.objects.get(pk=user.pk)

    def subscribe(self, user, areas=None, **kwargs):
        options = {
            'notification': True,
            'notification_types': list(NOTIFICATION_EVENT_TYPES),
            'notification_severities': list(NOTIFICATION_SEVERITIES),
            'notification_statuses': list(NOTIFICATION_STATUSES),
            'notification_creator': NotificationCreator.ALL,
            **kwargs,
        }
        subscription = EmailSubscription.objects.create(user=user, **options)
        subscription.notification_areas.set(areas if areas is not None else [self.area])
        return subscription

    def make_event(self, user=None, **kwargs):
        self.event_number += 1
        fields = {
            'id': f'RIDE-{self.event_number}',
            'user': user or self.submitter,
            'event_type': 'Incident',
            'status': 'Active',
            'approved': True,
            'severity': 'Minor',
            'situation': 105,
            'direction': 'Northbound',
            'start': {
                'name': 'Highway 97',
                'coords': [-123.36, 48.43],
                'nearby': [
                    {'name': 'Quesnel', 'phrase': '30 km South of Quesnel', 'include': True},
                ],
            },
            'impacts': [],
            'geometry': GeometryCollection(Point(-123.36, 48.43)),
            'service_area': self.area,
            'next_update': datetime(2025, 7, 15, 19, 30, tzinfo=timezone.utc),
        }
        fields.update(kwargs)
        event = Event(**fields)
        event.save()
        return event

    def save_version(self, event, user, **changes):
        ''' Save a new version of an event with changes, as the API does '''

        version = Event.objects.get(uuid=event.uuid)
        for key, value in changes.items():
            setattr(version, key, value)
        version.user = user
        version.save()
        return Event.objects.select_related('user', 'service_area').get(uuid=version.uuid)
