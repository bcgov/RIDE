from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.test import TestCase

from apps.events.enums import EventType
from apps.events.models import Event
from apps.segments.models import ChainUp, Segment


# local .env may enable toolbar; it renders even on json and needs djdt urls
@patch('config.settings.django.SHOW_DEBUG_TOOLBAR', False)
class TestChainUpUpdate(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(username='admin', password='pw')
        self.client.force_login(self.user)
        self.chainup = ChainUp.current.first()  # loaded by segments migration fixture

    def add_event(self, status):
        return Event.objects.create(
            id='RIDE-1', user=self.user, event_type=EventType.CHAIN_UP, status=status,
            approved=True, latest=True, chainup=self.chainup,
        )

    def patch(self):
        return self.client.patch(
            f'/api/chainups/{self.chainup.uuid}',
            {'name': 'Renamed', 'direction': 'NORTHBOUND'},
            content_type='application/json',
        )

    def test_update_creates_version_and_moves_events(self):
        event = self.add_event('Inactive')

        response = self.patch()

        assert response.status_code == 200, response.content
        latest = ChainUp.current.get(id=self.chainup.id)
        assert latest.uuid != self.chainup.uuid
        assert latest.name == 'Renamed'
        assert latest.direction == 'NORTHBOUND'
        event.refresh_from_db()
        assert event.chainup_id == latest.uuid

    def test_active_chainup_rejected(self):
        self.add_event('Active')

        response = self.patch()

        assert response.status_code == 400, response.content
        assert ChainUp.current.get(id=self.chainup.id).uuid == self.chainup.uuid

    def test_delete_is_soft_and_restore_undoes_it(self):
        event = self.add_event('Inactive')

        response = self.client.delete(f'/api/chainups/{self.chainup.uuid}')

        assert response.status_code == 204, response.content
        assert not ChainUp.current.filter(id=self.chainup.id).exists()
        deleted = ChainUp.objects.get(id=self.chainup.id, latest=True)
        assert deleted.deleted
        assert ChainUp.objects.filter(id=self.chainup.id).count() == 2  # history kept
        event.refresh_from_db()
        assert event.chainup_id == deleted.uuid

        # undo with the uuid the page had before deleting
        response = self.client.post(f'/api/chainups/{self.chainup.uuid}/restore')

        assert response.status_code == 200, response.content
        restored = ChainUp.current.get(id=self.chainup.id)
        assert response.json()['uuid'] == str(restored.uuid)
        assert restored.name == self.chainup.name
        event.refresh_from_db()
        assert event.chainup_id == restored.uuid

    def test_active_chainup_delete_rejected(self):
        self.add_event('Active')

        response = self.client.delete(f'/api/chainups/{self.chainup.uuid}')

        assert response.status_code == 400, response.content
        assert ChainUp.current.filter(id=self.chainup.id).exists()

    def test_restore_requires_deleted_chainup(self):
        response = self.client.post(f'/api/chainups/{self.chainup.uuid}/restore')

        assert response.status_code == 404

    def test_failed_event_repoint_rolls_back_update(self):
        event = self.add_event('Inactive')
        update = QuerySet.update

        def fail_on_events(qs, **kwargs):
            if qs.model is Event:
                raise RuntimeError('repoint failed')
            return update(qs, **kwargs)

        self.client.raise_request_exception = False
        with patch.object(QuerySet, 'update', fail_on_events):
            response = self.patch()

        assert response.status_code == 500
        assert ChainUp.current.get(id=self.chainup.id).uuid == self.chainup.uuid
        assert ChainUp.objects.filter(id=self.chainup.id).count() == 1
        event.refresh_from_db()
        assert event.chainup_id == self.chainup.uuid

    def create(self, point, **extra):
        data = {
            'name': 'New', 'description': 'Somewhere', 'direction': 'EASTBOUND',
            'area': self.chainup.area_id,
            'primary_point': {'type': 'Point', 'coordinates': point},
            **extra,
        }
        return self.client.post('/api/chainups', data, content_type='application/json')

    def road_point(self):
        segment = Segment.current.filter(route=self.chainup.route).exclude(geometry=None).first()
        return segment, list(segment.geometry.coords[len(segment.geometry.coords) // 2])

    def assert_line_on(self, chainup, segment):
        line = chainup.geometry.transform(3005, clone=True)
        assert abs(line.length - 100) < 1  # same 100m as existing chain-ups
        assert chainup.secondary_point.coords == chainup.geometry.coords[-1]
        assert segment.geometry.transform(3005, clone=True).distance(line) < 1

    def test_create_fills_generated_fields(self):
        last_id = max(int(i) for i in ChainUp.objects.values_list('id', flat=True))
        segment, point = self.road_point()

        response = self.create(point)

        assert response.status_code == 201, response.content
        created = ChainUp.current.get(id=str(last_id + 1))
        assert created.name == 'New'
        assert created.user == self.user
        self.assert_line_on(created, segment)
        siblings = ChainUp.current.filter(area=created.area, route=created.route).exclude(id=created.id)
        assert created.sorting_order == max(c.sorting_order for c in siblings) + 1

    def test_create_on_existing_location_rejected(self):
        response = self.create(list(self.chainup.primary_point.coords))

        assert response.status_code == 400, response.content
        assert b'already exists' in response.content

    def test_move_follows_route_geometry(self):
        segment, point = self.road_point()

        response = self.client.patch(
            f'/api/chainups/{self.chainup.uuid}',
            {'primary_point': {'type': 'Point', 'coordinates': point}},
            content_type='application/json',
        )

        assert response.status_code == 200, response.content
        moved = ChainUp.current.get(id=self.chainup.id)
        assert moved.route_id == segment.route_id
        self.assert_line_on(moved, segment)

    def test_move_onto_another_chainup_rejected(self):
        other = ChainUp.current.exclude(id=self.chainup.id).first()

        response = self.client.patch(
            f'/api/chainups/{self.chainup.uuid}',
            {'primary_point': {'type': 'Point', 'coordinates': list(other.primary_point.coords)}},
            content_type='application/json',
        )

        assert response.status_code == 400, response.content
        assert b'already exists' in response.content

    def test_create_ignores_client_route(self):
        segment = Segment.current.exclude(geometry=None).first()
        coords = segment.geometry.coords
        point = list(coords[len(coords) // 2])
        other = Segment.current.exclude(route=segment.route).first()

        response = self.create(point, route=other.route_id)

        assert response.status_code == 201, response.content
        assert response.json()['route'] == segment.route_id

    def test_create_far_from_roads_rejected(self):
        response = self.create([-131.0, 51.0])  # open Pacific

        assert response.status_code == 400, response.content
        assert b'No route found' in response.content

    def test_route_lookup(self):
        segment = Segment.current.exclude(geometry=None).first()
        lng, lat = segment.geometry.coords[len(segment.geometry.coords) // 2]

        found = self.client.get('/api/chainups/route', {'lat': lat, 'lng': lng})
        missing = self.client.get('/api/chainups/route', {'lat': 51.0, 'lng': -131.0})

        assert found.status_code == 200, found.content
        assert found.json()['id'] == segment.route_id
        assert missing.status_code == 400
