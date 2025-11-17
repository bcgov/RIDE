import json
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError

from apps.events.models import Event
from apps.events.serializers import EventSerializer
from apps.events.tests import e2


class Command(BaseCommand):

    def handle(self, *args, **options):
        # e = EventSerializer(data=e2)
        # if e.is_valid():
        #     ee = e.save()
        #     pprint(e.data)
        # else:
        #     print(e.errors)

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