import json
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIRequestFactory

from apps.events.models import Event
from apps.events.serializers import EventSerializer
from apps.users.models import RIDEUser


NEW_EVENT = {
    'id': 'RIDE-100006',
    'event_type': 'Incident',
}
TEST = {
    "uuid": "ec7a89c3-b36b-48f2-8e5b-310e31694694",
    "geometry": {
        "type": "GeometryCollection",
        "geometries": [
            {
                "type": "Point",
                "coordinates": [
                    -121.4373779296624,
                    49.7717549592025
                ]
            }
        ]
    },
    "is_closure": False,
    "last_inactivated": None,
    "notes": [],
    "chainup": None,
    "id": "RIDE-100031",
    "version": 6,
    "latest": True,
    "created": "2026-03-25T17:48:48.418066Z",
    "last_updated": "2026-04-02T15:52:48.022062Z",
    "from_bulk": False,
    "status": "Active",
    "approved": True,
    "latest_approved": True,
    "impacts": [
        {
            "id": 2,
            "label": "Assessment in progress",
            "closed": False
        },
        {
            "id": 4,
            "label": "Centre lane blocked",
            "closed": False
        }
    ],
    "restrictions": [],
    "conditions": [],
    "additional": "",
    "route_projection": 399.2,
    "service_area": 6,
    "type": "Incident",
    "location": {
        "start": {
            "name": "Hwy 1",
            "alias": "Trans-Canada Hwy",
            "other": "",
            "coords": [
                -121.4373779296624,
                49.7717549592025
            ],
            "nearby": [
                {
                    "name": "Chilliwack",
                    "type": "City",
                    "phrase": "105km NE of Chilliwack",
                    "source": "BCGNWS",
                    "include": True,
                    "distance": 104.986,
                    "priority": 6,
                    "direction": "NE",
                    "coordinates": [
                        -121.9508333002,
                        49.1577777667
                    ]
                },
                {
                    "name": "Merritt",
                    "type": "City",
                    "phrase": "173.5km SW of Merritt",
                    "source": "BCGNWS",
                    "distance": 173.458,
                    "priority": 6,
                    "direction": "SW",
                    "coordinates": [
                        -120.788333334,
                        50.1124999965
                    ]
                },
                {
                    "name": "Hope",
                    "type": "District Municipality (1)",
                    "phrase": "53km N of Hope",
                    "source": "BCGNWS",
                    "distance": 52.996,
                    "priority": 5,
                    "direction": "N",
                    "coordinates": [
                        -121.4413888893,
                        49.3799999959
                    ]
                },
                {
                    "name": "Kent",
                    "type": "District Municipality (1)",
                    "phrase": "80.7km N of Kent",
                    "source": "BCGNWS",
                    "distance": 80.703,
                    "priority": 5,
                    "direction": "N",
                    "coordinates": [
                        -121.7625000004,
                        49.2380555511
                    ]
                },
                {
                    "name": "Mission",
                    "type": "District Municipality (1)",
                    "phrase": "128.5km NE of Mission",
                    "source": "BCGNWS",
                    "distance": 128.489,
                    "priority": 5,
                    "direction": "NE",
                    "coordinates": [
                        -122.283888889,
                        49.1591666625
                    ]
                }
            ],
            "aliases": [
                "Trans-Canada Hwy"
            ],
            "pending": False,
            "OBJECTID": 248030890,
            "useAlias": True,
            "useOther": False,
            "ROAD_CLASS": "highway",
            "FEATURE_CODE": None,
            "FEATURE_TYPE": "Road",
            "ROAD_SURFACE": "paved",
            "nearbyPending": False,
            "ROAD_NAME_FULL": "Trans-Canada Hwy",
            "NUMBER_OF_LANES": 2,
            "FEATURE_LENGTH_M": 728.6307,
            "ROAD_NAME_ALIAS1": "Hwy 1",
            "ROAD_NAME_ALIAS2": None,
            "ROAD_NAME_ALIAS3": None,
            "ROAD_NAME_ALIAS4": None,
            "SE_ANNO_CAD_DATA": None,
            "DATA_CAPTURE_DATE": None,
            "SEGMENT_LENGTH_2D": 728.631,
            "SEGMENT_LENGTH_3D": None,
            "HIGHWAY_EXIT_NUMBER": None,
            "HIGHWAY_ROUTE_NUMBER": "1",
            "DIGITAL_ROAD_ATLAS_LINE_ID": 385896
        },
        "end": None
    },
    "details": {
        "direction": "Both directions",
        "severity": "Minor",
        "category": "Hazard",
        "situation": 76
    },
    "delays": {
        "amount": 20,
        "unit": "minutes"
    },
    "timing": {
        "nextUpdate": "2026-05-02T16:00:00.000Z",
        "startTime": None,
        "endTime": None,
        "ongoing": False,
        "schedules": [],
        "nextUpdateIsDefault": False
    },
    "external": {
        "url": ""
    },
    "was_closure": False,
    "showPreview": True,
    "showForm": True,
    "showHistory": False
}

class Command(BaseCommand):

    def handle(self, *args, **options):

        request = APIRequestFactory().request()
        request.user = RIDEUser.objects.get(username='approver')
        print(request.user)
        es = EventSerializer(data=TEST, context={'request': request})
        print(es.is_valid())
        print(es.errors)

        # user = RIDEUser.objects.get(username='approver')


        # Event.objects.filter(id='RIDE-100006').delete()

        # e = Event(**NEW_EVENT)
        # e.user = user
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='RIDE-100006', latest=True)
        # e.delay_amount = 1
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='RIDE-100006', latest=True)
        # e.approved = True
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='RIDE-100006', latest=True)
        # e.approved = False
        # e.save()
        # self.print_events()
        # self.print_managers()

        # e = Event.last.get(id='RIDE-100006', latest=True)
        # e.approved = True
        # e.save()
        # self.print_events()
        # self.print_managers()


    def print_events(self, id):
        print('====')
        for e in Event.objects.filter(id=id).order_by('id', 'version'):
            print(e)

    def print_managers(self):
        pending = Event.pending.filter(id='RIDE-100006').first()
        current = Event.current.filter(id='RIDE-100006').first()

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