from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.events.management.commands.build_route_geometries import build_route_geometries


class TestBuildRouteGeometries(SimpleTestCase):
    def test_sends_route_points_as_a_comma_separated_value(self):
        response = Mock()
        response.json.return_value = {'route': [[-123.0, 49.0], [-122.0, 50.0]]}

        with (
            patch(
                'apps.events.management.commands.build_route_geometries.sys.argv',
                ['manage.py'],
            ),
            patch(
                'apps.events.management.commands.build_route_geometries.hwy_coords',
                {'1': [[-123.0, 49.0, -122.0, 50.0]]},
            ),
            patch(
                'apps.events.management.commands.build_route_geometries.requests.get',
                return_value=response,
            ) as get,
            patch(
                'apps.events.management.commands.build_route_geometries.RouteGeometry.objects.filter',
            ) as filter_geometry,
            patch(
                'apps.events.management.commands.build_route_geometries.RouteGeometry.objects.create',
            ),
        ):
            filter_geometry.return_value.first.return_value = None
            build_route_geometries()

        self.assertEqual(
            get.call_args.kwargs['params']['points'],
            '-123.0,49.0,-122.0,50.0',
        )
