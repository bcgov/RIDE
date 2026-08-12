import json
import os
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIRequestFactory
from timezonefinder import TimezoneFinder
from zoneinfo import ZoneInfo

from apps.events.models import Event
from apps.events.serializers import EventSerializer
from apps.users.models import RIDEUser


tz_finder = TimezoneFinder(in_memory=True)

def format_timestamp(dt, zone):
    suffix = get_day_suffix(dt.astimezone(zone).day)
    format_string = f'%A, %B %-d{suffix}, %Y %I:%M:%S %p %Z'
    if os.name == 'nt':
        format_string = f'%A, %B %#d{suffix}, %Y %I:%M:%S %p %Z'
    return dt.astimezone(zone).strftime(format_string)

def get_day_suffix(day):
    if day in [1, 21, 31]:
        return 'st'
    if day in [2, 22]:
        return 'nd'
    return 'th'

DETAILS = '''
      id: {id} v{version} ({uuid})
    type: {event_type}
  status: {status}
  latest: {latest} {current}
approved: {approved} (latest: {latest_approved})
    bulk: {from_bulk}
 created: {created} (v0)
 updated: {updated} (v{version} created)
    user: {user}
'''

def get_username(user):
    for account in user.socialaccount_set.all():
        return getattr(account, 'extra_data', {}).get('idir_username', 'BCeID')
    return 'Django'

USER = '{first_name} {last_name} <{email}> ({account})'

VANCOUVER = [-123.116226, 49.246292]


class Command(BaseCommand):

    help = 'Review or modify individual events'
    requires_system_checks = []
    suppressed_base_arguments = ['--verbosity', '--no-color', '--force-color',
                                 '--traceback', '--pythonpath', '--settings',
                                 '--version', ]

    def add_arguments(self, parser):
        parser.add_argument('id', )
        parser.add_argument('version', nargs='?', default=None,
                            help='Optional; latest by default')
        parser.add_argument('-d', '--details', action='store_true',
                            help='Show user info')

        parser.add_argument('-m', '--meta', action='store_true',
                            help='Show event meta')

        parser.add_argument('-s', '--source', action='store_true',
                            help='Show event source')

        parser.add_argument('-c', '--current', action='store_true',
                            help='Show current version (i.e., latest approved)')

        parser.add_argument('-p', '--pending', action='store_true',
                            help='Show pending changes')

        parser.add_argument('--history', action='store_true',
                            help='Show history as diffs')

        # parser.add_argument('-c', '--clear', action='store_true',
        #                     help='Clear this event')
        # parser.add_argument('-r', '--reactivate', action='store_true',
        #                     help='Reactivate this event')

    def handle(self, *args, **options):

        if options['current'] and options['version']:
            raise CommandError('Specify either a version or --current, not both')

        filters = { 'id': options['id'] }

        if options['version']:
            filters['version'] = options['version']

        elif options['current']:
            filters['latest_approved'] = True

        event = Event.objects.filter(**filters)\
                             .select_related('user')\
                             .prefetch_related('user__socialaccount_set')\
                             .order_by('-version').first()

        if event is None:
            event = Event.objects.filter(id=options['id'])\
                                 .select_related('user')\
                                 .prefetch_related('user__socialaccount_set')\
                                 .order_by('-version').first()

            if options['current']:
                raise CommandError('No current (i.e., approved) version for this event.\n'
                                    '    Use --pending to see the unapproved event')

            version = f', v{options['version']}' if options['version'] else ''
            if event:
                event = f' (highest is v{event.version})'
            else:
                event = ''
                version = ''

            raise CommandError(f'No event found with id {options['id']}{version}{event}')

        current = event
        latest = ''
        if not event.latest:
            current = Event.objects.filter(id=options['id']).order_by('-version').first()
            latest = f'(v{current.version} is current)'

        coords = event.start.get('coords', VANCOUVER)
        zone = tz_finder.timezone_at(lng=coords[0], lat=coords[1]) or 'America/Vancouver'
        timezone = ZoneInfo(zone)

        # if no specific output is requested, print details
        outputs = [options[option] for option in ['details', 'meta', 'source', 'pending', 'history']]
        if not any(outputs):
            options['details'] = True

        if options['details']:
            data = vars(event)
            data['current'] = latest
            data['created'] = format_timestamp(event.created, timezone)
            data['updated'] = format_timestamp(event.last_updated, timezone)
            data['user'] = USER.format(**vars(event.user),
                                       account=get_username(event.user))
            print(DETAILS.format(**data))

        if options['meta']:
            print('Meta:')
            pprint(event.meta)

        if options['source']:
            print('Source:')
            pprint(event.meta.get('source'))
