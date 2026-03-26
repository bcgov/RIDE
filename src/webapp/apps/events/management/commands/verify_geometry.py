from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand

from apps.events.models import Event, Note


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('id', )
        parser.add_argument('-ev', '--event-version', action='store', type=int,
                            dest='version', help='Only apply to version')
        parser.add_argument('-f', '--fix', action='store_true',
                            help='Correct issues')

    def verify_geometry(self, event, correct):
        print(event)
        if event.geometry.num_geom == 1 and event.geometry[0].geom_type == 'LineString':
            print('  fixing linestring')
            event.geometry[0] = Point(event.start['coords'])
            event.save(force_update=True)

    def handle(self, *args, **options):

        events = Event.objects.filter(id=options['id'])
        if len(events) == 0:
            print(f'No events found for id {options['id']}')
            return

        version = options.get('version', False)
        if version:
            events = events.filter(version=version)
            if len(events) == 0:
                print(f'No event found for version {version}')
                return

        correct = options.get('fix', False)
        for event in events:
            self.verify_geometry(event, correct)
