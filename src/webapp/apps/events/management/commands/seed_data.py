import copy
import json
import math
import random
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.geos import GeometryCollection, LineString, Point
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import ProtectedError, Q
from django.test import override_settings
from email_log.models import Email
from rest_framework.test import APIRequestFactory

from apps.events import tasks
from apps.events.enums import (
    NotificationCreator,
    NOTIFICATION_EVENT_TYPES,
    NOTIFICATION_SEVERITIES,
    NOTIFICATION_STATUSES,
)
from apps.events.helpers import area_label, get_chainup_next_update, get_default_next_update
from apps.events.models import (
    Condition,
    Event,
    EventReminderNotification,
    Note,
    QueuedEventNotification,
    RouteGeometry,
    TrafficImpact,
)
from apps.events.serializers import ChainUpEventSerializer, EventSerializer, RcSerializer
from apps.organizations.models import Organization, ServiceArea
from apps.segments.models import ChainUp, Segment
from apps.users.models import EmailSubscription, Request
from config.adapter import get_oidc_claims

# (category, situation ids) by event type; from PHRASES in
# frontend/app/events/references.js, without ferry situations
SITUATIONS = {
    'Incident': {
        'Avalanche': [84, 279, 283, 86],
        'Hazard': [90, 91, 92, 104, 76, 77, 78, 87, 188, 79, 80, 285, 296,
                   106, 305, 108, 103, 105, 81, 93, 95, 192, 218, 88, 107,
                   96, 72, 89, 144, 97, 98, 99, 295, 100, 298, 102, 300],
        'Special event': [287],
    },
    'Planned event': {
        'Avalanche': [13, 292],
        'Construction': [10, 11, 282, 12, 226],
        'Maintenance': [15, 19, 284, 205, 245, 21, 280, 25, 191, 28, 68, 69,
                        70, 94, 71, 112, 109, 110, 111, 251, 113, 117, 114,
                        115, 116],
        'Special event': [7],
    },
}

DIRECTIONS = ['Both directions', 'Northbound', 'Eastbound', 'Southbound', 'Westbound']
DIRECTION_NAMES = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest']

# Additional information for pending updates, so the update always changes something
UPDATE_NOTES = [
    'Crews on scene. Expect delays.',
    'Detour in place on local roads.',
    'Work extended because of weather.',
    'Single lane alternating traffic with flaggers.',
    'Use an alternate route if possible.',
]

# Sample organizations and their users.  --clear deletes users whose
# username starts with the prefix; they have no password, so can't sign in.
SAMPLE_USER_PREFIX = 'sample_'
PACIFIC = ZoneInfo('America/Vancouver')  # times the scheduled scenario prints
SUBMITTERS_PER_ORGANIZATION = 2
ORGANIZATION_SUFFIXES = ['Road Services', 'Roads', 'Highways', 'Contracting', 'Maintenance', 'Roadworks']
ORGANIZATION_NAME_LENGTH = 30  # the organization form's limit
FIRST_NAMES = ['Alex', 'Amrit', 'Avery', 'Casey', 'Ethan', 'Harper', 'Jamie', 'Jordan', 'Liam', 'Maya',
               'Morgan', 'Noah', 'Priya', 'Quinn', 'Riley', 'Rowan', 'Sam', 'Sofia', 'Taylor', 'Wei']
LAST_NAMES = ['Anderson', 'Brown', 'Campbell', 'Chen', 'Dhillon', 'Fraser', 'Gill', 'Kaur', 'Lee', 'MacDonald',
              'Martin', 'Nguyen', 'Park', 'Roy', 'Sandhu', 'Singh', 'Thompson', 'Tremblay', 'Wilson', 'Wong']

# Share of published events created by a superuser in no organization, so
# "created by my organization" leaves some events out
OUTSIDE_SHARE = 0.15

# Minimum pending events, road conditions and chain-ups in --user's areas
USER_PENDING = 3
USER_BULK = 3  # road conditions and chain-ups, by --user, another member and the outsider

LOCATION_ATTEMPTS = 20


def iso(dt):
    return dt.isoformat().replace('+00:00', 'Z')


def road_name(segment):
    ''' Return the event location name for a segment, e.g., "Hwy 1" '''
    return segment.route.name.replace('Highway ', 'Hwy ')


def line_parts(geometry):
    ''' Return the LineStrings in a geometry, e.g., a segment clipped to an area '''

    if geometry.geom_type == 'LineString':
        return [geometry]

    if geometry.geom_type in ('MultiLineString', 'GeometryCollection'):
        return [line for part in geometry for line in line_parts(part)]

    return []


def location_point(key, segment, coords):
    '''
    A start or end location with the fields the event form saves (form
    LOCATION_BLANK), plus a reference location worded as the form's
    population centres, e.g., "12km North of Keremeos", measured from the
    nearer end named in the segment, e.g., "Highway 3A - Keremeos to Green
    Mountain Road".  Events without them break the form.
    '''

    nearby = []
    _, _, ends = segment.name.partition(' - ')
    names = ends.split(' to ', 1)
    points = [segment.primary_point, segment.secondary_point]
    if len(names) == 2 and all(points):
        here = Point(coords, srid=4326)
        name, place = min(zip(names, points), key=lambda end: end[1].distance(here))
        km = place.transform(3005, clone=True).distance(here.transform(3005, clone=True)) / 1000
        distance = f'{round(km * 1000)}m' if km < 1 else f'{round(km)}km'
        nearby.append({
            'id': f'{key}-seed-{segment.id}-{names.index(name)}',
            'source': 'bcgnws',
            'name': name,
            'coords': list(place.coords),
            'distance': round(km, 3),
            'direction': compass_direction(place.coords, coords),
            'phrase': f'{distance} {compass_direction(place.coords, coords)} of {name}',
        })

    return {
        'name': road_name(segment),
        'coords': list(coords),
        'alias': None,
        'aliases': [],
        'useAlias': True,
        'other': None,
        'useOther': False,
        'nearby': nearby,
        'nearbyPending': False,
        'nearbyError': '',
    }


def compass_direction(origin, target):
    ''' As the frontend's getCardinalDirection(origin, target, true) '''

    lat1, lat2 = math.radians(origin[1]), math.radians(target[1])
    d_lon = math.radians(target[0] - origin[0])
    y = math.sin(d_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(d_lon)
    bearing = (math.degrees(math.atan2(y, x)) + 360) % 360
    return DIRECTION_NAMES[round(bearing / 45) % 8]


def needs_approval(data):
    ''' As EventSerializer.is_automatically_approved for a new event '''
    return data['details']['severity'] != 'Minor' or any(impact['closed'] for impact in data['impacts'])


def start_area_id(start):
    ''' The service area EventSerializer gives an event starting here '''
    point = Point(start['coords'][0], start['coords'][1])
    area = ServiceArea.objects.filter(parent__isnull=False, geometry__contains=point).first()
    return area.id if area else None


class Command(BaseCommand):

    help = ('Seed random sample data for testing: organizations with their own service areas and '
            'users, incidents and planned events (some awaiting approval), road conditions and chain-ups')

    def add_arguments(self, parser):
        parser.add_argument('-n', '--count', type=int, default=100,
                            help='Number of events to create (default 100)')
        parser.add_argument('--seed', type=int, default=None,
                            help='Random seed, for repeatable data')
        parser.add_argument('--pending', type=int, default=None,
                            help='Number of events left awaiting approval (default 10%% of count).  With '
                                 'sample organizations, a quarter each are updates and clears of published '
                                 'events, and the rest new events.')
        parser.add_argument('--road-conditions', type=int, default=30,
                            help='Number of highway segments given road conditions, as the Road '
                                 'Conditions page saves them (default 30)')
        parser.add_argument('--chain-ups', type=int, default=10,
                            help='Number of chain-ups switched on, as the Chain-ups page does (default 10)')
        parser.add_argument('--organizations', type=int, default=6,
                            help='Number of sample organizations to create (default 6).  Each gets '
                                 'neighbouring service areas no other organization has, an approver '
                                 f'and {SUBMITTERS_PER_ORGANIZATION} submitters, and events go in their '
                                 'areas, created by their members or a sample superuser in no '
                                 'organization.  0 creates none and puts events anywhere, created by '
                                 '--user and --submitter.')
        parser.add_argument('--user-orgs', type=int, default=None,
                            help='Number of the sample organizations --user joins (default 2, or 1 with '
                                 'one organization)')
        parser.add_argument('--user', default=None,
                            help='Username that joins sample organizations and creates some of '
                                 'their events, or all events without them; first superuser by default')
        parser.add_argument('--submitter', default=None,
                            help='Non-approver username for pending events without sample organizations; '
                                 'first user without approval permission by default')
        parser.add_argument('--clear', action='store_true',
                            help='First delete every event, every organization, requests to join one and '
                                 f'the sample users (usernames starting {SAMPLE_USER_PREFIX})')
        parser.add_argument('--notify', action='store_true',
                            help='Queue notification emails for the new events.  Off by default, so the '
                                 'notification task does not email every sample event; due soon and '
                                 'overdue reminders still go out once it runs.')
        parser.add_argument('--sync', action='store_true',
                            help='Sync created events to Open511 (off by default)')
        parser.add_argument('--email-scenarios', action='store_true',
                            help='Email --user one notification of each kind (new, updated, cleared, '
                                 'each approval step, closures, planned events, road conditions, '
                                 'chain-ups and reminders), by making those changes in their sample '
                                 'organizations through the real notification queue.  Turns on '
                                 '--user\'s notifications for everything in their areas.  Uses the '
                                 'existing sample data, or seeds it first with --clear.')
        parser.add_argument('--scheduled-scenario', type=int, nargs='?', const=50, default=None,
                            metavar='MINUTES',
                            help='Create events whose scheduled emails (update due soon, overdue and the '
                                 'clear at end time) come due in the next few minutes, then run the '
                                 'notification tasks every minute for MINUTES (default 50), as Huey '
                                 'does, for those events and any saved while it runs.  Turns on '
                                 '--user\'s notifications for everything in their areas.')

    def handle(self, *args, **options):
        admins = self.grant_admins()

        if options['scheduled_scenario'] is not None:
            random.seed(options['seed'])
            self.scheduled_scenario(self.get_user(options['user']), options['scheduled_scenario'])
            return

        if options['email_scenarios'] and not options['clear']:
            random.seed(options['seed'])
            self.email_scenarios(self.get_user(options['user']))
            return

        count = options['count']
        if count < 1:
            raise CommandError('--count must be at least 1')

        pending = count // 10 if options['pending'] is None else options['pending']
        if not 0 <= pending <= count:
            raise CommandError('--pending must be between 0 and --count')

        if options['road_conditions'] < 0 or options['chain_ups'] < 0:
            raise CommandError('--road-conditions and --chain-ups must be 0 or more')

        organization_count = options['organizations']
        if organization_count < 0:
            raise CommandError('--organizations must be 0 or more')

        user_orgs = options['user_orgs']
        if user_orgs is None:
            user_orgs = min(2, organization_count)
        if organization_count and not 0 <= user_orgs <= organization_count:
            raise CommandError('--user-orgs must be between 0 and --organizations')

        random.seed(options['seed'])

        user = self.get_user(options['user'])
        if options['clear'] and user.username.startswith(SAMPLE_USER_PREFIX):
            raise CommandError(f'--clear deletes {user.username}; pass another --user')
        if not organization_count and options['chain_ups'] and not user.is_approver:
            raise CommandError(f'{user.username} is not an approver, so can\'t switch on chain-ups; '
                               'pass --chain-ups 0 or an approver --user')

        segments = self.get_segments()
        impacts = list(TrafficImpact.objects.filter(deleted=False)
                                            .values('id', 'label', 'closed'))

        overrides = {'DISABLE_OPEN511_SYNC': not options['sync']}
        if not options['notify']:
            overrides['DISABLE_EVENT_NOTIFICATIONS'] = True

        with override_settings(**overrides), transaction.atomic():
            if options['clear']:
                self.clear()

            if organization_count:
                organizations, outsider = self.create_organizations(organization_count, user, user_orgs, admins)
                self.create_organization_events(organizations, outsider, user, segments, impacts, count, pending)
            else:
                organizations, outsider = [], None
                submitter = self.get_submitter(options['submitter']) if pending else None
                self.create_events(user, submitter, segments, impacts, count, pending)

            self.create_road_conditions(organizations, outsider, user, segments, options['road_conditions'])
            self.create_chain_ups(organizations, outsider, user, options['chain_ups'])

        if options['email_scenarios']:
            self.email_scenarios(user)

    def grant_admins(self):
        '''
        Make each IDIR in RIDE_ADMIN_IDIRS a superuser, so testers on a PR
        preview or a local stack can sign in as admins.  An IDIR that hasn't
        signed in yet gets an idir__ user with no password, which
        config.adapter links to that IDIR on first sign-in, so only that
        person can use it.

        Returns the users.
        '''

        idirs = {}
        for idir in settings.RIDE_ADMIN_IDIRS:
            idir = idir.strip()
            if idir:
                idirs.setdefault(idir.lower(), idir)
        if not idirs:
            return []

        # Users who already signed in with one of the IDIRs, whatever their username
        signed_in = {}
        for account in SocialAccount.objects.select_related('user').order_by('id'):
            idir = (get_oidc_claims(account).get('idir_username') or '').lower()
            if idir in idirs:
                signed_in.setdefault(idir, account.user)

        users = get_user_model().objects
        admins = []
        for key, idir in idirs.items():
            username = f'idir__{idir}'
            user = signed_in.get(key) or users.filter(username__iexact=username).first()
            if user is None:
                user = users.create_user(username=username)  # no password
                action = 'Created admin'
            else:
                action = 'Made admin' if not (user.is_staff and user.is_superuser) else 'Already admin'

            user.is_staff = True
            user.is_superuser = True
            user.save(update_fields=['is_staff', 'is_superuser'])
            self.stdout.write(f'{action}: {user.username} (IDIR {idir})')
            if not user.is_active:
                self.stderr.write(f'{user.username} is inactive, so can\'t sign in until reactivated')
            admins.append(user)

        return admins

    def get_user(self, username):
        users = get_user_model().objects
        if username:
            user = users.filter(username=username).first()
            if user is None:
                raise CommandError(f'No user named {username}')
            return user

        user = users.filter(is_superuser=True).exclude(username__startswith=SAMPLE_USER_PREFIX).first() or \
            users.first()
        if user is None:
            raise CommandError('No users found; create a user before running this command.')
        return user

    def get_submitter(self, username):
        if username:
            user = self.get_user(username)
            if user.is_approver:
                raise CommandError(f'{username} is an approver; pending events need a non-approver')
            return user

        users = get_user_model().objects.filter(is_active=True, is_superuser=False).order_by('id')
        user = next((user for user in users if not user.is_approver), None)
        if user is None:
            raise CommandError('No non-approver user found for pending events; '
                               'pass --submitter or --pending 0.')
        return user

    def get_segments(self):
        segments = list(Segment.current.filter(geometry__isnull=False)
                                       .select_related('route'))

        # get_route_projection() fails on a route geometry with no points
        empty_routes = {rg.id for rg in RouteGeometry.objects.all()
                        if not any(len(route) for route in rg.routes)}
        if empty_routes:
            self.stdout.write(self.style.WARNING(
                f'Skipping routes with empty geometry: {", ".join(sorted(empty_routes))}'))
            segments = [segment for segment in segments
                        if road_name(segment).replace('Hwy ', '') not in empty_routes]

        if not segments:
            raise CommandError('No segments with geometry found; load segments first.')

        return segments

    def clear(self):
        ''' Delete every event, every organization, requests to join one and the sample users '''

        events = Event.objects.values('id').distinct().count()
        versions = Event.objects.count()
        organizations = Organization.objects.count()
        requests = Request.objects.filter(request_type=Request.RequestTypes.ADD_TO_ORG)
        request_count = requests.count()
        sample_users = get_user_model().objects.filter(username__startswith=SAMPLE_USER_PREFIX)
        users = sample_users.count()

        Note.objects.all().delete()
        Event.objects.all().delete()
        QueuedEventNotification.objects.all().delete()
        EventReminderNotification.objects.all().delete()
        Organization.objects.all().delete()
        requests.delete()  # they name an organization that no longer exists
        try:
            sample_users.delete()
        except ProtectedError as e:
            raise CommandError(f'Sample users still have records, so were not deleted: {e}') from e

        self.stdout.write(self.style.WARNING(
            f'Deleted {events} events ({versions} versions), {organizations} organizations, '
            f'{request_count} requests to join an organization and {users} sample users'))

    def create_organizations(self, count, user, user_orgs, admins=()):
        '''
        Create count organizations, each with a run of neighbouring service
        areas that no other organization has (the rest stay unassigned), an
        approver and submitters.  The user and admins (from RIDE_ADMIN_IDIRS)
        join the same user_orgs of them.  Also creates a superuser in no
        organization.

        Returns ([{'organization', 'areas', 'approvers', 'submitters'}], superuser).
        '''

        # an organization holding a district can edit in all of its areas
        held = ServiceArea.objects.filter(organizations__isnull=False)
        free = list(ServiceArea.objects.filter(parent__isnull=False)
                                       .exclude(geometry=None)
                                       .exclude(id__in=held)
                                       .exclude(parent__in=held)
                                       .select_related('parent'))
        if len(free) < count:
            raise CommandError(f'{count} organizations need a service area each, but only {len(free)} '
                               'have no organization; pass --clear or fewer --organizations.')

        # 2-5 areas each while they last, with the rest left unassigned
        # between and around the runs
        sizes = [1] * count
        spare = len(free) - count
        for index in range(count):
            extra = min(spare, random.randint(1, 4))
            sizes[index] += extra
            spare -= extra

        gaps = [0] * (count + 1)
        for _ in range(spare):
            gaps[random.randrange(count + 1)] += 1

        permission = self.approver_permission()
        names = set(Organization.objects.values_list('name', flat=True))
        usernames = set(get_user_model().objects.filter(username__startswith=SAMPLE_USER_PREFIX)
                                                .values_list('username', flat=True))
        organizations = []
        position = 0
        for index in range(count):
            position += gaps[index]
            areas = free[position:position + sizes[index]]
            position += sizes[index]

            organization = Organization.objects.create(name=self.organization_name(areas[0].parent, names))
            organization.service_areas.set(areas)

            # the approver is the organization's authoritative contact
            approver = self.create_sample_user(usernames, organization, permission)
            organization.contact_name = approver.get_full_name()
            organization.contact_id = approver.username.removeprefix(SAMPLE_USER_PREFIX).upper()
            organization.save()

            organizations.append({
                'organization': organization,
                'areas': areas,
                'approvers': [approver],
                'submitters': [self.create_sample_user(usernames, organization)
                               for _ in range(SUBMITTERS_PER_ORGANIZATION)],
            })

        joined = random.sample(organizations, user_orgs)
        for member in [user] + [admin for admin in admins if admin != user]:
            for entry in joined:
                member.organizations.add(entry['organization'])
                entry['approvers' if member.is_approver else 'submitters'].append(member)

        # like ministry staff, who can edit events anywhere
        outsider = self.create_sample_user(usernames)
        outsider.is_superuser = True
        outsider.save()

        self.describe_organizations(organizations, outsider, user)
        return organizations, outsider

    def organization_name(self, district, taken):
        ''' A unique name like "Thompson-Nicola Road Services" '''

        names = [f'{district.name} {suffix}'
                 for suffix in random.sample(ORGANIZATION_SUFFIXES, len(ORGANIZATION_SUFFIXES))]
        names = [name for name in names if len(name) <= ORGANIZATION_NAME_LENGTH] or \
            [district.name[:ORGANIZATION_NAME_LENGTH]]
        name = next((name for name in names if name not in taken), None)

        number = 2
        while name is None:
            numbered = f'{names[0][:ORGANIZATION_NAME_LENGTH - len(str(number)) - 1]} {number}'
            name = numbered if numbered not in taken else None
            number += 1

        taken.add(name)
        return name

    def approver_permission(self):
        ''' The permission RIDE's user admin grants approvers '''

        content_type = ContentType.objects.get(app_label='users', model='rideuser')
        permission, _ = Permission.objects.get_or_create(
            codename='approve_ride_events',
            content_type=content_type,
            defaults={'name': 'Can approve ride events'},
        )
        return permission

    def create_sample_user(self, usernames, organization=None, permission=None):
        # a full name no other sample user has, while there are some left
        names = [(first, last) for first in FIRST_NAMES for last in LAST_NAMES]
        taken = {(user.first_name, user.last_name)
                 for user in get_user_model().objects.filter(username__startswith=SAMPLE_USER_PREFIX)}
        first, last = random.choice([name for name in names if name not in taken] or names)
        base = f'{SAMPLE_USER_PREFIX}{first[0]}{last}'.lower()
        username = base
        number = 2
        while username in usernames:
            username = f'{base}{number}'
            number += 1
        usernames.add(username)

        user = get_user_model().objects.create_user(
            username=username,
            email=f'{username.removeprefix(SAMPLE_USER_PREFIX)}@example.com',
            first_name=first,
            last_name=last,
        )
        if organization:
            user.organizations.add(organization)
        if permission:
            user.user_permissions.add(permission)

        return get_user_model().objects.get(pk=user.pk)  # clear permission caches

    def describe_organizations(self, organizations, outsider, user):
        for entry in organizations:
            self.stdout.write(self.style.MIGRATE_HEADING(entry['organization'].name))
            self.stdout.write(f'  Areas: {", ".join(area_label(area) for area in entry["areas"])}')
            for role in ('approvers', 'submitters'):
                members = ', '.join(f'{member.username} ({member.get_full_name() or "no name"})'
                                    for member in entry[role])
                self.stdout.write(f'  {role.title()}: {members}')

        self.stdout.write(f'Superuser in no organization: {outsider.username} ({outsider.get_full_name()})')

        joined = [entry for entry in organizations if user in entry['approvers'] + entry['submitters']]
        self.stdout.write(f'{user.username} joined: '
                          f'{", ".join(entry["organization"].name for entry in joined) or "none"}')

        unassigned = ServiceArea.objects.filter(parent__isnull=False, organizations__isnull=True)
        self.stdout.write(f'No organization: {", ".join(area_label(area) for area in unassigned) or "none"}')

        # notifications need the area in both the settings and the user's organizations
        subscription = EmailSubscription.objects.filter(user=user, notification=True).first()
        if subscription:
            area_ids = {area.id for entry in joined for area in entry['areas']}
            lost = subscription.notification_areas.exclude(id__in=area_ids)
            if lost.exists():
                self.stdout.write(self.style.WARNING(
                    f'{user.username}\'s notification settings include areas outside their organizations, '
                    f'which get no emails: {", ".join(area_label(area) for area in lost)}.  Save '
                    'Notification settings again to choose from the new areas.'))
        self.stdout.write('')

    def area_lines(self, areas, segments):
        '''
        Return {area id: [(segment, part of its line inside the area)]}, so
        event locations can start in a given area.
        '''

        by_id = {segment.id: segment for segment in segments}
        lines = {}
        for area in areas:
            area_segments = [by_id[str(segment_id)] for segment_id in area.segments if str(segment_id) in by_id]
            lines[area.id] = [
                (segment, part)
                for segment in area_segments
                for part in line_parts(segment.geometry.intersection(area.geometry))
                if part.num_points > 1 and part.length > 0
            ]
        return lines

    def area_location(self, area, lines):
        ''' A random location on the area's lines that starts in the area '''

        for _ in range(LOCATION_ATTEMPTS):
            segment, line = random.choice(lines)
            location = self.random_location(segment, line)
            if start_area_id(location[0]) == area.id:
                return location

        raise CommandError(f'No location found in {area_label(area)} after {LOCATION_ATTEMPTS} tries')

    def create_organization_events(self, organizations, outsider, user, segments, impacts, count, pending):
        '''
        Create events in the organizations' service areas, as their members:
        pending events from submitters, events needing approval from
        approvers, and the rest from anyone in the organization.  Some
        published events come from the outsider, a superuser in no
        organization.  A quarter each of the pending events are updates and
        clears of events an approver published.
        '''

        owners = {area.id: entry for entry in organizations for area in entry['areas']}
        lines = self.area_lines([area for entry in organizations for area in entry['areas']], segments)
        areas = [area for entry in organizations for area in entry['areas'] if lines[area.id]]
        skipped = [area_label(area) for entry in organizations for area in entry['areas'] if not lines[area.id]]
        if skipped:
            self.stdout.write(self.style.WARNING(f'No segments to put events on in: {", ".join(skipped)}'))
        if not areas:
            raise CommandError('No segments found in the organizations\' service areas.')

        kinds = ['update'] * (pending // 4) + ['clear'] * (pending // 4)
        kinds += ['new'] * (pending - len(kinds)) + ['published'] * (count - pending)
        random.shuffle(kinds)

        # at least a few pending events where --user can review them
        user_areas = [area for area in areas
                      if user in owners[area.id]['approvers'] + owners[area.id]['submitters']]
        reserved = min(pending, USER_PENDING) if user_areas else 0

        totals = {entry['organization'].pk: {'events': 0, 'pending': 0, 'outside': 0} for entry in organizations}
        for index, kind in enumerate(kinds):
            if kind != 'published' and reserved:
                area = random.choice(user_areas)
                reserved -= 1
            else:
                area = random.choice(areas)
            entry = owners[area.id]
            location = self.area_location(area, lines[area.id])

            if kind == 'published':
                data = self.random_event(location, impacts)
                event = self.save_event(index, data, self.random_creator(entry, outsider, needs_approval(data)))

            elif kind == 'new':
                event = self.save_event(index, self.random_event(location, impacts, major=True),
                                        random.choice(entry['submitters']))

            else:
                # a submitter's change to a major event needs approval
                data = self.random_event(location, impacts, major=True)
                change = self.pending_change(data, kind)
                published = self.save_event(index, data, random.choice(entry['approvers']))
                event = self.save_event(index, change, random.choice(entry['submitters']), published)

            is_pending = kind != 'published'
            if event.approved == is_pending or event.service_area_id != area.id:
                raise CommandError(f'{event.id} was created {"approved" if event.approved else "pending"} '
                                   f'in {area_label(event.service_area) or "no service area"}; expected '
                                   f'{"pending" if is_pending else "approved"} in {area_label(area)}')

            counts = totals[entry['organization'].pk]
            counts['events'] += 1
            counts['pending'] += is_pending
            counts['outside'] += event.user == outsider

        self.stdout.write('')
        for entry in organizations:
            counts = totals[entry['organization'].pk]
            self.stdout.write(f'{entry["organization"].name}: {counts["events"]} events '
                              f'({counts["pending"]} awaiting approval, {counts["outside"]} '
                              'created outside the organization)')
        self.stdout.write(self.style.SUCCESS(
            f'Created {count} events ({pending} awaiting approval: {kinds.count("new")} new, '
            f'{kinds.count("update")} updates, {kinds.count("clear")} clears) '
            f'in {len(organizations)} organizations'))

    def pending_change(self, data, kind):
        ''' A copy of the event data, cleared or with new details '''

        change = copy.deepcopy(data)
        if kind == 'clear':
            change['status'] = 'Inactive'
            return change

        change['additional'] = random.choice(UPDATE_NOTES)
        change['delays'] = {'amount': random.choice([15, 30, 45, 60, 90]), 'unit': 'minutes'}
        if change['timing']['nextUpdate']:
            later = datetime.fromisoformat(change['timing']['nextUpdate']) + timedelta(hours=random.randint(1, 4))
            change['timing']['nextUpdate'] = iso(later)
        return change

    def create_events(self, user, submitter, segments, impacts, count, pending):
        ''' Create events anywhere, as the user, and pending ones as the submitter '''

        # Major events from a non-approver need approval (see
        # EventSerializer.is_automatically_approved)
        pending_indexes = set(random.sample(range(count), pending))
        for index in range(count):
            is_pending = index in pending_indexes
            data = self.random_event(self.random_location(random.choice(segments)), impacts, is_pending)
            self.save_event(index, data, submitter if is_pending else user)

        self.stdout.write(self.style.SUCCESS(f'Created {count} events ({pending} awaiting approval)'))

    def save_event(self, index, data, creator, instance=None, serializer_class=EventSerializer, name=None):
        ''' Create an event, or a new version of instance, as the creator '''

        request = APIRequestFactory().post('/')
        request.user = creator
        serializer = serializer_class(instance, data=data, context={'request': request})
        if not serializer.is_valid():
            raise CommandError(f'{data["type"]} {index + 1} failed validation: {serializer.errors}')

        event = serializer.save()
        change = '' if instance is None else (' cleared' if event.status == 'Inactive' else ' updated')
        self.stdout.write(f'{event.id}  {event.event_type:<14}  {event.severity:<5}  '
                          f'{area_label(event.service_area):<24}  {creator.username:<20}  '
                          f'{name or event.start.get("name", "")}{change}  '
                          f'{"" if event.approved else "(pending approval)"}')
        return event

    def random_creator(self, entry, outsider, approver=False):
        ''' Someone in the organization, an approver if needed, or sometimes the outsider '''

        if outsider and random.random() < OUTSIDE_SHARE:
            return outsider

        return random.choice(entry['approvers'] if approver else entry['approvers'] + entry['submitters'])

    def bulk_event_data(self, event_type, item, next_update):
        '''
        Event data for a segment or chain-up, as the Road Conditions and
        Chain-ups pages send it (frontend getInitialRc / getInitialChainUp,
        with the location and geometry the views add)
        '''

        return {
            'type': event_type,
            'status': 'Active',
            'from_bulk': True,
            'geometry': {'type': 'GeometryCollection', 'geometries': [json.loads(item.geometry.json)]},
            'location': {
                'start': {'coords': list(item.primary_point.coords)},
                'end': {'coords': list(item.secondary_point.coords)} if item.secondary_point else None,
            },
            'details': {'direction': 'Both directions', 'severity': 'Minor', 'category': None, 'situation': 0},
            'impacts': [],
            'restrictions': [],
            'conditions': [],
            'delays': {'amount': 0, 'unit': 'minutes'},
            'timing': {
                'nextUpdate': iso(next_update.astimezone(timezone.utc).replace(microsecond=0)),
                'nextUpdateIsDefault': True,
                'endTime': None,
                'ongoing': True,
                'startTime': None,
                'schedules': [],
            },
            'additional': '',
            'external': {'url': ''},
            'notes': [],
            'meta': {},
        }

    def members(self, entry, approver=False):
        return entry['approvers'] if approver else entry['approvers'] + entry['submitters']

    def bulk_candidates(self, items, organizations, allowed, active):
        '''
        Return [(item, area id, organization entry or None)] for segments or
        chain-ups that start in an organization's area and that its page
        would offer it (allowed), or in any area without organizations.
        Skips items that already have an active event, as the pages do.
        '''

        owners = {area.id: entry for entry in organizations for area in entry['areas']}
        candidates = []
        for item in items:
            if item.pk in active:
                continue

            area_id = start_area_id({'coords': item.primary_point.coords})
            entry = owners.get(area_id)
            if organizations and (entry is None or not allowed(item, entry)):
                continue
            if area_id is not None:
                candidates.append((item, area_id, entry))
        return candidates

    def create_bulk_events(self, kind, candidates, outsider, user, count, approver, build, serializer_class):
        '''
        Save up to count of the candidates.  The first few in --user's areas
        are created by --user, another member and the outsider, so each
        creator filter has one; the rest by random members.
        '''

        mine = [candidate for candidate in candidates
                if candidate[2] and user in self.members(candidate[2])]
        reserved = random.sample(mine, min(len(mine), USER_BULK, count))
        rest = [candidate for candidate in candidates if candidate not in reserved]
        chosen = reserved + random.sample(rest, min(count - len(reserved), len(rest)))

        for index, (item, area_id, entry) in enumerate(chosen):
            if entry is None:
                creator = user
            elif index < len(reserved):
                role = ('user', 'member', 'outsider')[index % 3]
                others = [member for member in self.members(entry, approver) if member != user]
                creator = (user if role == 'user' and (user.is_approver or not approver) else
                           outsider if role == 'outsider' and outsider else
                           random.choice(others))
            else:
                creator = self.random_creator(entry, outsider, approver)

            event = self.save_event(index, build(item), creator, serializer_class=serializer_class, name=item.name)
            if not event.approved or event.service_area_id != area_id:
                raise CommandError(f'{event.id} was created {"approved" if event.approved else "pending"} in '
                                   f'{area_label(event.service_area) or "no service area"}; expected approved in '
                                   f'{area_label(ServiceArea.objects.get(id=area_id))}')

        if len(chosen) < count:
            self.stdout.write(self.style.WARNING(f'Only {len(candidates)} {kind} available'))
        return len(chosen)

    def create_road_conditions(self, organizations, outsider, user, segments, count):
        '''
        Road conditions on segments starting in the organizations' areas, by
        members whose Road Conditions page lists the segment
        '''

        if not count:
            return

        conditions = list(Condition.objects.filter(deleted=False).values('id', 'label'))
        if not conditions:
            raise CommandError('No road conditions found to choose from; load conditions or pass '
                               '--road-conditions 0.')

        def listed(segment, entry):
            # validate_allowed_segments: the segment is in one of the organization's areas' lists
            return any(str(segment_id) == segment.id for area in entry['areas'] for segment_id in area.segments)

        def build(segment):
            data = self.bulk_event_data('ROAD_CONDITION', segment, get_default_next_update())
            data['segment'] = str(segment.uuid)
            data['conditions'] = random.sample(conditions, k=min(len(conditions), random.randint(1, 3)))
            return data

        active = set(Event.objects.filter(event_type='ROAD_CONDITION', latest=True, status='Active')
                                  .values_list('segment_id', flat=True))
        candidates = self.bulk_candidates(segments, organizations, listed, active)
        created = self.create_bulk_events('segments', candidates, outsider, user, count, False, build, RcSerializer)
        self.stdout.write(self.style.SUCCESS(f'Created {created} road conditions'))

    def create_chain_ups(self, organizations, outsider, user, count):
        '''
        Chain-ups switched on in the organizations' areas, by approvers whose
        Chain-ups page lists them
        '''

        if not count:
            return

        def listed(chain_up, entry):
            # ChainUpAPIView lists chain-ups by their area
            return any(area.id == chain_up.area_id for area in entry['areas'])

        def build(chain_up):
            data = self.bulk_event_data('CHAIN_UP', chain_up, get_chainup_next_update())
            data['chainup'] = str(chain_up.uuid)
            return data

        active = set(Event.objects.filter(event_type='CHAIN_UP', latest=True, status='Active')
                                  .values_list('chainup_id', flat=True))
        candidates = self.bulk_candidates(ChainUp.current.filter(geometry__isnull=False), organizations, listed, active)
        created = self.create_bulk_events('chain-ups', candidates, outsider, user, count, True, build,
                                          ChainUpEventSerializer)
        self.stdout.write(self.style.SUCCESS(f'Switched on {created} chain-ups'))

    def random_event(self, location, impacts, major=False):
        '''
        Return event data for the location.  Major events are active and may
        be closures, so need an approver.
        '''

        event_type = random.choice(list(SITUATIONS))
        category = random.choice(list(SITUATIONS[event_type]))
        start, end, geometry = location
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        status = 'Active' if major or random.random() < 0.9 else 'Inactive'

        if event_type == 'Planned event':
            # as the form: no next update, and active ones haven't ended yet;
            # some go until further notice
            start_time = now + timedelta(days=random.randint(-14, 7))
            ongoing = random.random() < 0.15
            end_time = None if ongoing else max(start_time, now) + timedelta(days=random.randint(1, 14))
            timing = {
                'startTime': iso(start_time),
                'endTime': iso(end_time) if end_time else None,
                'nextUpdate': None,
                'ongoing': ongoing,
            }
        else:
            timing = {
                'startTime': None,
                'endTime': None,
                'nextUpdate': iso(now + timedelta(hours=random.randint(1, 6))),
                'ongoing': False,
            }
        timing.update(schedules=[], nextUpdateIsDefault=False)

        event_impacts = random.sample(impacts, k=min(len(impacts), random.choice([0, 0, 1, 1, 2])))
        closures = [impact for impact in impacts if impact['closed']]
        if major and closures and random.random() < 0.5:
            closure = random.choice(closures)
            if closure not in event_impacts:
                event_impacts.append(closure)

        data = {
            'type': event_type,
            'status': status,
            'geometry': geometry,
            'location': {'start': start, 'end': end},
            'details': {
                'direction': random.choice(DIRECTIONS),
                'severity': 'Major' if major or random.random() < 0.2 else 'Minor',
                'category': category,
                'situation': random.choice(SITUATIONS[event_type][category]),
            },
            'impacts': event_impacts,
            'restrictions': [],
            'conditions': [],
            'delays': {'amount': random.choice([0, 0, 10, 15, 20, 30, 45, 60]), 'unit': 'minutes'},
            'timing': timing,
            'additional': '',
            'external': {'url': ''},
            'notes': [],
        }

        # the app only shows events cleared in the last week
        if status == 'Inactive':
            data['last_inactivated'] = iso(now - timedelta(hours=random.randint(1, 72)))

        return data

    def random_location(self, segment, line=None):
        '''
        Return (start, end, geometry) for a random point or stretch along the
        segment, or the part of it in a service area.  Geometry is ordered
        start point, end point, line, matching events created through the form.
        '''

        if line is None:
            line = segment.geometry

        if random.random() < 0.6:
            point = line.interpolate_normalized(random.random())
            start = location_point('start', segment, point.coords)
            geometry = GeometryCollection(Point(point.coords))
            return start, None, json.loads(geometry.json)

        a, b = sorted(random.uniform(0, 1) for _ in range(2))
        first = line.interpolate_normalized(a)
        last = line.interpolate_normalized(b)
        between = [coords for coords in line.coords
                   if a < line.project_normalized(Point(coords, srid=line.srid)) < b]
        path = LineString([first.coords, *between, last.coords])

        start = location_point('start', segment, first.coords)
        end = location_point('end', segment, last.coords)
        geometry = GeometryCollection(Point(first.coords), Point(last.coords), path)
        return start, end, json.loads(geometry.json)

    # --email-scenarios ----------------------------------------------------

    def email_scenarios(self, user):
        '''
        Email the user one notification of each kind, by making the changes
        that send them in their sample organizations, as sample members,
        then sending what the notification queue holds as its task does
        '''

        if not user.email:
            raise CommandError(f'{user.username} has no email address to send the scenarios to')
        if not user.is_approver:
            raise CommandError(f'{user.username} is not an approver, so would not get approval requests')

        context = self.scenario_context(user)
        self.subscribe_to_everything(user)

        with override_settings(DISABLE_OPEN511_SYNC=True, DISABLE_EVENT_NOTIFICATIONS=False):
            results = self.run_scenarios(context)

        self.stdout.write('')
        for label, subject in results:
            self.stdout.write(f'{label:<42}  {subject or self.style.ERROR("not sent")}')
        sent = sum(1 for _, subject in results if subject)
        style = self.style.SUCCESS if sent == len(results) else self.style.WARNING
        self.stdout.write(style(f'Sent {sent} of {len(results)} scenario emails to {user.email}'))

    def scenario_context(self, user):
        '''
        The user's first sample organization with an approver, a submitter
        and segments in an area, and a chain-up in one of the user's areas
        that is switched off, with an approver of its organization
        '''

        segments = self.get_segments()
        sample = {'username__startswith': SAMPLE_USER_PREFIX}
        context = None
        for organization in user.organizations.order_by('name'):
            members = organization.users.filter(**sample, is_superuser=False)
            approvers = [member for member in members if member.is_approver]
            submitters = [member for member in members if not member.is_approver]
            areas = list(organization.service_areas.filter(parent__isnull=False).exclude(geometry=None))
            lines = self.area_lines(areas, segments)
            area = next((area for area in areas if lines[area.id]), None)
            if approvers and submitters and area:
                context = {'segments': segments, 'area': area, 'lines': lines[area.id],
                           'approver': approvers[0], 'submitter': submitters[0]}
                break

        if context is None:
            raise CommandError(f'{user.username} is in no sample organization with an approver, a submitter '
                               'and segments; run seed_data --clear first.')

        active = set(Event.objects.filter(event_type='CHAIN_UP', latest=True, status='Active')
                                  .values_list('chainup_id', flat=True))
        user_areas = ServiceArea.objects.filter(organizations__users=user)
        chain_ups = []
        for chain_up in ChainUp.current.filter(geometry__isnull=False, area__in=user_areas).order_by('id'):
            approvers = [member for member in chain_up.area.organizations.get().users.filter(**sample)
                         if member.is_approver and not member.is_superuser]
            if approvers:
                chain_ups.append((chain_up.pk in active, chain_up, approvers[0]))

        # one switched off, or else switch one off quietly, as the Chain-ups page does
        if chain_ups:
            switched_on, chain_up, approver = min(chain_ups, key=lambda item: item[0])
            if switched_on:
                self.switch_off_chain_up(chain_up, approver)
            context.update(chain_up=chain_up, chain_up_approver=approver)

        return context

    def switch_off_chain_up(self, chain_up, approver):
        event = Event.objects.get(chainup=chain_up, event_type='CHAIN_UP', latest=True, status='Active')
        data = self.bulk_event_data('CHAIN_UP', chain_up, get_chainup_next_update())
        data.update(id=event.id, chainup=str(chain_up.uuid), status='Inactive')
        data['timing']['nextUpdate'] = None
        with override_settings(DISABLE_OPEN511_SYNC=True, DISABLE_EVENT_NOTIFICATIONS=True):
            self.save_event(0, data, approver, event, serializer_class=ChainUpEventSerializer, name=chain_up.name)

    def subscribe_to_everything(self, user):
        subscription, _ = EmailSubscription.objects.get_or_create(user=user)
        subscription.notification = True
        subscription.notification_types = list(NOTIFICATION_EVENT_TYPES)
        subscription.notification_severities = list(NOTIFICATION_SEVERITIES)
        subscription.notification_statuses = list(NOTIFICATION_STATUSES)
        subscription.notification_creator = NotificationCreator.ALL
        subscription.save()

        areas = ServiceArea.objects.filter(organizations__users=user, parent__isnull=False).distinct()
        subscription.notification_areas.set(areas)
        self.stdout.write(self.style.WARNING(
            f'Turned on {user.username}\'s notifications for everything in {areas.count()} areas'))

    def scenario_event(self, context, **changes):
        '''
        Data for a major incident by the approver in the scenario area, with
        top level and nested changes
        '''

        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        data = self.random_event(self.area_location(context['area'], context['lines']), [], major=True)
        data.update(type='Incident', status='Active', impacts=[], restrictions=[], additional='',
                    delays={'amount': 0, 'unit': 'minutes'})
        data['details'].update(direction='Northbound', severity='Major', category='Hazard', situation=105)
        data['timing'] = {'startTime': None, 'endTime': None, 'ongoing': False, 'schedules': [],
                          'nextUpdate': iso(now + timedelta(hours=3)), 'nextUpdateIsDefault': False}
        for key, value in changes.items():
            if isinstance(value, dict) and isinstance(data.get(key), dict):
                data[key].update(value)
            else:
                data[key] = value
        return data

    def run_scenarios(self, context):
        '''
        Make each change and send its email.  Returns [(label, subject or
        None)].  A send Google refuses is retried once.
        '''

        approver, submitter = context['approver'], context['submitter']
        impacts = {impact.label: {'id': impact.id, 'label': impact.label, 'closed': impact.closed}
                   for impact in TrafficImpact.objects.filter(deleted=False)}
        lane = impacts.get('Lane blocked') or next(i for i in impacts.values() if not i['closed'])
        left_lane = impacts.get('Left lane closed') or lane
        closed = impacts.get('Closed') or next(i for i in impacts.values() if i['closed'])
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        results = []

        def latest(event):
            return Event.objects.get(id=event.id, latest=True)

        def save(data, creator, instance=None, **kwargs):
            return self.save_event(len(results), copy.deepcopy(data), creator, instance, **kwargs)

        def deliver(label, event):
            # as the notification task, then once more if the send failed
            outbox = Email.objects.count()
            sent = tasks.send_queued_event_notifications()
            if not sent:
                result = tasks.get_notification_status(latest(event))
                sent = tasks.send_event_notification(latest(event), *result) if result else 0
            email = Email.objects.order_by('-pk').first() if Email.objects.count() > outbox else None
            results.append((label, email.subject if sent and email else None))

        def remind(label, event):
            sent = tasks.send_event_reminder(latest(event), now, datetime.now(timezone.utc))
            email = Email.objects.order_by('-pk').first()
            results.append((label, email.subject if sent and email else None))

        # an approver publishes, updates and clears a major incident
        data = self.scenario_event(
            context, impacts=[lane], delays={'amount': 20, 'unit': 'minutes'},
            restrictions=[{'id': 1, 'label': 'Speed limit reduced to', 'text': '50 km/h'}],
            additional='Crews are clearing a vehicle incident. Expect delays.',
            external={'url': 'https://www.drivebc.ca/'})
        incident = save(data, approver)
        deliver('New', incident)

        data.update(impacts=[left_lane], delays={'amount': 45, 'unit': 'minutes'},
                    additional='Crews are clearing a vehicle incident. Use an alternate route.')
        data['timing']['nextUpdate'] = iso(now + timedelta(hours=4))
        save(data, approver, latest(incident))
        deliver('Updated (changes highlighted)', incident)

        data['status'] = 'Inactive'
        save(data, approver, latest(incident))
        deliver('Cleared', incident)

        # a submitter's new event, update and clear, each approved
        data = self.scenario_event(context, impacts=[lane],
                                   additional='Vehicle incident blocking the northbound lane.')
        pending = save(data, submitter)
        deliver('Approval requested (new)', pending)
        save(data, approver, latest(pending))
        deliver('Approved and published', pending)

        data.update(impacts=[left_lane], additional='Both northbound lanes are now blocked.')
        save(data, submitter, latest(pending))
        deliver('Approval requested (updated)', pending)
        save(data, approver, latest(pending))
        deliver('Update approved', pending)

        data['status'] = 'Inactive'
        save(data, submitter, latest(pending))
        deliver('Approval requested (cleared)', pending)
        save(data, approver, latest(pending))
        deliver('Clearing approved', pending)

        # closures and a planned event
        event = save(self.scenario_event(context, impacts=[closed], details={'direction': 'Both directions'},
                                         additional='Highway closed in both directions for a collision.'),
                     approver)
        deliver('New closure', event)

        planned = {'type': 'Planned event', 'details': {'category': 'Construction', 'situation': 10},
                   'timing': {'startTime': iso(now + timedelta(days=3)), 'endTime': iso(now + timedelta(days=4)),
                              'nextUpdate': None}}
        event = save(self.scenario_event(context, **copy.deepcopy(planned), impacts=[closed],
                                         additional='Closed for bridge work.'), approver)
        deliver('New future closure', event)

        planned['timing'].update(startTime=iso(now + timedelta(days=2)), endTime=iso(now + timedelta(days=9)))
        planned['details']['severity'] = 'Minor'
        minor = impacts.get('Expect minor delays') or lane
        event = save(self.scenario_event(context, **planned, impacts=[minor],
                                         additional='Paving operations. Expect delays of up to 20 minutes.'),
                     approver)
        deliver('New planned event (In effect)', event)

        # a road condition, then reconfirmed, as the Road Conditions page does
        active = set(Event.objects.filter(event_type='ROAD_CONDITION', latest=True, status='Active')
                                  .values_list('segment_id', flat=True))
        area_segments = {str(segment_id) for segment_id in context['area'].segments}
        segment = next((segment for segment in context['segments']
                        if segment.id in area_segments and segment.pk not in active
                        and start_area_id({'coords': segment.primary_point.coords}) == context['area'].id), None)
        if segment:
            data = self.bulk_event_data('ROAD_CONDITION', segment, get_default_next_update())
            data['segment'] = str(segment.uuid)
            data['conditions'] = [{'id': 4, 'label': 'Compact snow'}, {'id': 25, 'label': 'Slippery sections'}]
            road = save(data, approver, serializer_class=RcSerializer, name=segment.name)
            deliver('New road condition', road)

            road = latest(road)
            road.next_update = road.next_update + timedelta(days=1)
            road.user = approver
            road.meta = {'source': 'confirm_rcs'}
            road.save()
            deliver('Reconfirmed road condition', road)
        else:
            results += [('New road condition', None), ('Reconfirmed road condition', None)]
            self.stdout.write(self.style.WARNING(f'No segment free for a road condition in '
                                                 f'{area_label(context["area"])}'))

        # a chain-up switched on, as the Chain-ups page does
        chain_up = context.get('chain_up')
        if chain_up:
            data = self.bulk_event_data('CHAIN_UP', chain_up, get_chainup_next_update())
            data['chainup'] = str(chain_up.uuid)
            event = save(data, context['chain_up_approver'], serializer_class=ChainUpEventSerializer,
                         name=chain_up.name)
            deliver('New commercial chain-up', event)
        else:
            results.append(('New commercial chain-up', None))
            self.stdout.write(self.style.WARNING('No chain-up in your areas is switched off'))

        # reminders, for events created without their own New emails
        with override_settings(DISABLE_EVENT_NOTIFICATIONS=True):
            minor_incident = {'details': {'severity': 'Minor'}, 'impacts': [lane]}
            soon = save(self.scenario_event(context, **copy.deepcopy(minor_incident),
                                            timing={'nextUpdate': iso(now + timedelta(minutes=10))}), approver)
            late = save(self.scenario_event(context, **copy.deepcopy(minor_incident)), approver)
        Event.objects.filter(uuid=latest(late).uuid).update(next_update=now - timedelta(minutes=5))
        remind('Update due soon', soon)
        remind('Overdue', late)

        return results

    # --scheduled-scenario -------------------------------------------------

    def scheduled_scenario(self, user, minutes):
        '''
        Create three incidents whose scheduled emails come due soon, then run
        the end time, queue and reminder tasks once a minute as Huey does.
        Huey doesn't run locally, and its tasks unscoped would also remind
        the user about every overdue sample event, so they only run for
        these events and any saved while this runs.
        '''

        if not user.email:
            raise CommandError(f'{user.username} has no email address to send the scenario to')

        context = self.scenario_context(user)
        self.subscribe_to_everything(user)
        approver = context['approver']
        start = datetime.now(timezone.utc).replace(second=0, microsecond=0)

        def at(offset):
            return iso(start + timedelta(minutes=offset))

        def local(offset):
            return (start + timedelta(minutes=offset)).astimezone(PACIFIC).strftime('%H:%M')

        scenario = [
            ('next update in 5 minutes', 'Scheduled scenario: next update in 5 minutes.',
             {'nextUpdate': at(5)},
             [(0, 'Update due soon'), (5, 'Overdue'), (20, 'Overdue again'), (35, 'Overdue again')]),
            ('next update in 20 minutes', 'Scheduled scenario: next update in 20 minutes.',
             {'nextUpdate': at(20)},
             [(5, 'Update due soon'), (20, 'Overdue'), (35, 'Overdue again')]),
            ('ends in 10 minutes', 'Scheduled scenario: ends in 10 minutes.',
             {'nextUpdate': at(180), 'endTime': at(10)},
             [(9, 'Cleared, by the end time task')]),
        ]

        with override_settings(DISABLE_OPEN511_SYNC=True, DISABLE_EVENT_NOTIFICATIONS=False):
            events = []
            for index, (name, additional, timing, _) in enumerate(scenario):
                data = self.scenario_event(context, details={'severity': 'Minor'}, impacts=[],
                                           additional=additional, timing=timing)
                events.append(self.save_event(index, data, approver, name=name))

            self.stdout.write('')
            self.stdout.write(f'Emails to {user.email}, each a minute or so after the time shown:')
            self.stdout.write(f'  {local(0)}  New, for each event')
            for event, (name, _, _, expected) in zip(events, scenario):
                for offset, label in expected:
                    if offset < minutes:
                        self.stdout.write(f'  {local(offset)}  {label}: {event.id} ({name})')
            self.stdout.write('Overdue repeats every 15 minutes until the event gets a new next update or end '
                              'time, or is cleared.  Saves made in RIDE meanwhile are emailed too.')
            self.stdout.write(f'Running until {local(minutes)}; Ctrl-C stops it.')
            self.stdout.write('')

            try:
                self.run_scheduled_tasks({event.id for event in events}, start, minutes)
            except KeyboardInterrupt:
                self.stdout.write('Stopped')

    def run_scheduled_tasks(self, ids, start, minutes):
        ''' Run the notification tasks for these events, and any saved since start, once a minute '''

        last_email = Email.objects.order_by('-pk').values_list('pk', flat=True).first() or 0
        end = start + timedelta(minutes=minutes)

        while True:
            current_time = datetime.now(timezone.utc)
            if current_time >= end:
                break
            now = current_time.replace(second=0, microsecond=0)
            events = Event.current.filter(Q(id__in=ids) | Q(created__gte=start), status='Active')

            try:
                # check_end_time
                for event in events.filter(end_time__lte=current_time + timedelta(minutes=1)):
                    event.status = 'Inactive'
                    event.user = tasks.get_task_user()
                    event.last_inactivated = event.end_time
                    event.save()

                tasks.send_queued_event_notifications()

                # send_event_reminder_notifications
                for event in events.filter(next_update__lte=current_time + tasks.REMINDER_INTERVAL,
                                           service_area__isnull=False) \
                                   .select_related('user', 'service_area', 'segment', 'chainup'):
                    tasks.send_event_reminder(event, now, current_time)
            except Exception as error:  # keep running, as Huey would
                self.stdout.write(self.style.ERROR(f'{now.astimezone(PACIFIC):%H:%M}  {error!r}'))

            for email in Email.objects.filter(pk__gt=last_email).order_by('pk'):
                last_email = email.pk
                status = 'sent' if email.ok else self.style.ERROR('not sent')
                self.stdout.write(f'{email.date_sent.astimezone(PACIFIC):%H:%M}  {status}  {email.subject}')

            # just after the next minute
            time.sleep(max(1, 61 - datetime.now(timezone.utc).second))

        self.stdout.write(f'Finished at {end.astimezone(PACIFIC):%H:%M}')
