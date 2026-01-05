import json
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError

from apps.events.models import Event
from apps.events.serializers import EventSerializer
from apps.events.tests import e2
from apps.users.models import RIDEUser


NEW_EVENT = {
    'id': 'DBC-100006',
    'event_type': 'Incident',
}

class Command(BaseCommand):

    def handle(self, *args, **options):
        # user = RIDEUser.objects.get(username='approver')


        Event.objects.filter(id='DBC-100006').delete()

        # e = Event(**NEW_EVENT)
        # e.user = user
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='DBC-100006', latest=True)
        # e.delay_amount = 1
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='DBC-100006', latest=True)
        # e.approved = True
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='DBC-100006', latest=True)
        # e.approved = False
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='DBC-100006', latest=True)
        # e.approved = True
        # e.save()
        # self.print_events()
        # self.print_managers()


    def print_events(self, id):
        print('====')
        for e in Event.objects.filter(id=id).order_by('id', 'version'):
            print(e)

    def print_managers(self):
        pending = Event.pending.filter(id='DBC-100006').first()
        current = Event.current.filter(id='DBC-100006').first()

        print(getattr(pending, 'version', '-'), getattr(current, 'version', '-'))

    def count_field_lengths(self):
        with  open('../../samples/cars.json') as src:
            data = json.load(src)

        output = {
            'segment names': { 'length': 0, 'longest': '', },
            'brief location': { 'length': 0, 'longest': '', },
            'operator': { 'length': 0, 'longest': '', },
            'extent': { 'length': 0, 'longest': '', },
            'nearby': { 'length': 0, 'longest': '', },
            'used operator': 0,
        }

        for event in data:
            for deet in event.get('details', []):
                for loc in deet.get('locations', []):
                    for seg in loc.get('segment-names', []):
                        if len(seg) > output['segment names']['length']:
                            output['segment names']['length'] = max(output['segment names']['length'], len(seg))
                            output['segment names']['longest'] = seg

            has_loc = False
            has_operator = False
            for plan in event.get('communication-plans', []):
                if plan.get('plan-type') == 'BRIEF_LOCATION':
                    has_loc = True
                    if len(plan.get('description')) > output['brief location']['length']:
                        output['brief location']['length'] = len(plan.get('description'))
                        output['brief location']['longest'] = plan.get('description')
                if plan.get('plan-type') == 'OPERATOR':
                    has_operator = True
                    if len(plan.get('description')) > output['operator']['length']:
                        output['operator']['length'] = len(plan.get('description'))
                        output['operator']['longest'] = plan.get('description')
            if has_operator and not has_loc:
                output['used operator'] += 1

            template = event.get('communication-plan-template', {})
            extent = template.get('extent-event-length')
            if extent is not None and len(extent) > output['extent']['length']:
                output['extent']['length'] = len(extent)
                output['extent']['longest'] = extent
            nearby = template.get('nearby-city-reference')
            if nearby is not None and len(nearby) > output['nearby']['length']:
                output['nearby']['length'] = len(nearby)
                output['nearby']['longest'] = nearby

        pprint(output)