from unittest import TestCase

from django.contrib.gis.geos import GeometryCollection, LineString

from apps.events.enums import EventType
from apps.events.models import Event


class EventPolygonTest(TestCase):
    def test_build_polygon_simplifies_and_rounds_coordinates(self):
        line = LineString(
            *[(-123 + index * 0.001, 49 + (index % 2) * 0.0001) for index in range(20)],
            srid=4326,
        )
        event = Event(
            event_type=EventType.ROAD_CONDITION,
            geometry=GeometryCollection(line),
        )

        polygon = event._build_polygon()
        original_ring = event.geometry.buffer_with_style(
            .01, end_cap_style=2, join_style=2
        ).coords[0]

        self.assertLess(len(polygon), len(original_ring))
        for point in polygon:
            for coordinate in point:
                self.assertEqual(coordinate, round(coordinate, 5))

    def test_build_polygon_returns_none_for_non_road_conditions(self):
        event = Event(event_type=EventType.CHAIN_UP)

        self.assertIsNone(event._build_polygon())
