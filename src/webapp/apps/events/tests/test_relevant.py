from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import GeometryCollection, LineString, Point
from django.test import TestCase

from apps.events.enums import EventType
from apps.events.models import Event


# local .env may enable toolbar; it renders even on json and needs djdt urls
@patch('config.settings.django.SHOW_DEBUG_TOOLBAR', False)
class TestRelevantExcludesClearedBulkEvents(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_superuser(username='admin', password='pw')
        self.client.force_login(user)
        for eid, event_type, from_bulk, status in [
            ('RIDE-1', EventType.ROAD_CONDITION, True, 'Inactive'),
            ('RIDE-2', EventType.ROAD_CONDITION, True, 'Active'),
            ('RIDE-3', EventType.ROAD_CONDITION, False, 'Inactive'),
            ('RIDE-4', EventType.INCIDENT, False, 'Inactive'),
            ('RIDE-5', EventType.CHAIN_UP, True, 'Inactive'),
            ('RIDE-6', EventType.CHAIN_UP, True, 'Active'),
        ]:
            Event.objects.create(
                id=eid, user=user, event_type=event_type, from_bulk=from_bulk, status=status,
                approved=True, latest=True, last_inactivated='2099-01-01T00:00:00Z',
            )

    def test_cleared_bulk_rcs_and_chainups_left_out(self):
        response = self.client.get('/api/events/relevant')
        assert response.status_code == 200
        ids = {event['id'] for event in response.json()}
        assert ids == {'RIDE-2', 'RIDE-3', 'RIDE-4', 'RIDE-6'}


class TestSimplifyCoords(TestCase):
    def test_coords_simplified(self):
        event = Event(
            event_type=EventType.INCIDENT,
            start={'coords': [-123.0000012, 49.0000012]},
            geometry=GeometryCollection(
                Point(-123.0000012, 49.0000012),
                LineString((-123.0, 49.0), (-122.99999, 49.000001), (-122.912341, 49.0)),
            ),
        )
        event._simplify_coords()
        point, line = event.geometry
        assert event.start['coords'] == [-123.0, 49.0]
        assert point.coords == (-123.0, 49.0)
        assert line.coords == ((-123.0, 49.0), (-122.91234, 49.0))
