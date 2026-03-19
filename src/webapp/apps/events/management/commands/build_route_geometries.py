from django.contrib.gis.geos import LineString, MultiLineString, Point
from django.core.management.base import BaseCommand
import requests

from apps.events.hwy_coords import hwy_coords
from apps.events.models import RouteGeometry
from config import settings

def reverse_ls_routes(ls_routes):
    """
    Reverse a list of linestrings and all their points

    """
    res = ls_routes[::-1]
    return [LineString(ls[::-1]) for ls in res]

def build_route_geometries():
    """
    DBC22-1183

    Using hwy_coords for each route as payload to feed into the routing API,
    build linestrings to be used for calculating the distance/order of cameras
    along their route

    """
    for key, routes in hwy_coords.items():
        ls_routes = []

        # Go through each route and create a geometry
        for route in routes:
            payload = {
                "points": route,
            }

            response = requests.get(
                settings.ROUTE_PLANNER_API_URL + "/directions.json",
                params=payload,
                headers={
                    "apiKey": settings.ROUTE_PLANNER_API_KEY,
                }
            )

            points_list = [Point(p) for p in response.json()['route']]
            ls_routes.append(LineString(points_list))

        # DBC22-2456
        highways_to_reverse = [
            '2', '3B', '9', '11', '13', '15', '17A', '23',
            '27', '29', '31', '33', '35', '37', '43', '91A',
            '93', '95', '97', '97C'
        ]

        if key in highways_to_reverse:
            ls_routes = reverse_ls_routes(ls_routes)

        # Save or update
        if not RouteGeometry.objects.filter(id=key).first():
            RouteGeometry.objects.create(id=key, routes=MultiLineString(ls_routes))

        else:
            RouteGeometry.objects.filter(id=key).update(routes=MultiLineString(ls_routes))


class Command(BaseCommand):
    def handle(self, *args, **options):
        build_route_geometries()
