import datetime
import logging
from zoneinfo import ZoneInfo
from django.contrib.gis.geos import LineString, Point

logger = logging.getLogger(__name__)


def get_default_next_update():
    # Current time with 30 minutes buffer
    now = datetime.datetime.now(tz=ZoneInfo("America/Vancouver")) + datetime.timedelta(minutes=30)
    now = now.replace(second=0, microsecond=0)
    month = now.month
    day = now.day

    # October 1 - April 30
    in_winter_season = (month > 9 or month < 5) or (month == 10 and day >= 1) or (month == 4 and day <= 30)
    if in_winter_season:
        times = [datetime.time(5, 0), datetime.time(7, 0), datetime.time(16, 0)]
        candidates = []
        for t in times:
            candidate = now.replace(hour=t.hour, minute=t.minute)
            if candidate <= now:
                candidate += datetime.timedelta(days=1)
            candidates.append(candidate)
        return min(candidates)

    else:
        return now + datetime.timedelta(days=1)


def get_chainup_next_update():
    now = datetime.datetime.now(tz=ZoneInfo("America/Vancouver"))
    return now + datetime.timedelta(days=1)


def get_route_projection(event):
    from apps.events.models import RouteGeometry

    key = event.start.get('name', '').replace('Hwy ', '')

    # Only process if reference linestring exists
    route_geometry = RouteGeometry.objects.filter(id=key).first()
    if route_geometry:
        # Combine all coordinates into a single linestring for sorting
        all_coords = ()
        for route in route_geometry.routes:
            all_coords += route.coords

        # Project in a meter-based CRS, then convert to km.
        srid = route_geometry.routes.srid or 4326
        route_ls = LineString(all_coords, srid=srid)
        start_point = Point(event.start['coords'], srid=srid)

        if srid != 3005:
            route_ls = route_ls.transform(3005, clone=True)
            start_point = start_point.transform(3005, clone=True)

        projection_m = route_ls.project(start_point)
        return round(projection_m / 1000, 1)

    return 0
