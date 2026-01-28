import datetime

from django.contrib.gis.geos import GeometryCollection
from django.core.management.base import BaseCommand

from apps.events.enums import EventType
from apps.events.models import Event
from apps.segments.models import Segment


class Command(BaseCommand):
    def handle(self, *args, **options):
        Event.objects.all().delete()

        seg = Segment.objects.get(id="12")
        seg2 = Segment.objects.get(id="49")
        seg3 = Segment.objects.get(id="61")
        seg4 = Segment.objects.get(id="114")
        seg5 = Segment.objects.get(id="561")

        next_update = datetime.datetime.now() + datetime.timedelta(days=21, hours=6, minutes=30)
        Event.objects.create(
            id='DBC-1',
            event_type=EventType.ROAD_CONDITION,
            approved=True,
            latest_approved=True,
            start={'coords': seg.primary_point.coords},
            geometry=GeometryCollection(seg.geometry),
            segment=seg,
            next_update=next_update,
            user_id=1,
            conditions=[1,2,3]
        )

        next_update_outdated = datetime.datetime.now() - datetime.timedelta(days=1, hours=2, minutes=20)
        Event.objects.create(
            id='DBC-2',
            event_type=EventType.ROAD_CONDITION,
            approved=True,
            latest_approved=True,
            start={'coords': seg2.primary_point.coords},
            geometry=GeometryCollection(seg2.geometry),
            segment=seg2,
            next_update=next_update_outdated,
            user_id=1,
            conditions=[3,4,5]
        )
        Event.objects.create(
            id='DBC-3',
            event_type=EventType.ROAD_CONDITION,
            approved=True,
            latest_approved=True,
            start={'coords': seg3.primary_point.coords},
            geometry=GeometryCollection(seg3.geometry),
            segment=seg3,
            next_update=next_update_outdated,
            user_id=1,
            conditions=[7]
        )

        Event.objects.create(
            id='DBC-4',
            event_type=EventType.ROAD_CONDITION,
            approved=True,
            latest_approved=True,
            start={'coords': seg4.primary_point.coords},
            geometry=GeometryCollection(seg4.geometry),
            segment=seg4,
            next_update=next_update,
            user_id=1,
            conditions=[9, 10]
        )

        Event.objects.create(
            id='DBC-5',
            event_type=EventType.ROAD_CONDITION,
            approved=True,
            latest_approved=True,
            start={'coords': seg5.primary_point.coords},
            geometry=GeometryCollection(seg5.geometry),
            segment=seg5,
            next_update=next_update,
            user_id=1,
            conditions=[11, 13, 15]
        )

