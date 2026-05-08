from django.contrib.gis.geos import Point
from rest_framework import permissions

from apps.organizations.models import ServiceArea


def get_user_service_areas(user):
    if user.is_superuser:
        return ServiceArea.objects.all()

    return ServiceArea.objects.filter(
        organizations__in=user.organizations.all()
    ).distinct()


def coords_from_start(start):
    if not isinstance(start, dict):
        return None
    coords = start.get('coords')
    if (
        not isinstance(coords, (list, tuple))
        or len(coords) < 2
    ):
        return None
    try:
        return float(coords[0]), float(coords[1])
    except (TypeError, ValueError):
        return None


def extract_event_start_coords(request_data, instance=None):
    """
    Read start coordinates from inbound JSON (before or after KeyMoveSerializer).

    Accepts either `start` or `location.start` from the client payload. If missing
    (e.g. partial update) and `instance` is provided, uses saved `instance.start`.
    """
    if isinstance(request_data, dict):
        start = request_data.get('start')
        if not isinstance(start, dict):
            location = request_data.get('location')
            if isinstance(location, dict):
                start = location.get('start')
        coords = coords_from_start(start)
        if coords is not None:
            return coords

    if instance is None:
        return None
    start_saved = getattr(instance, 'start', None)
    return coords_from_start(start_saved)


def user_may_use_point(user, coords):
    if coords is None:
        return False
    point = Point(coords[0], coords[1])
    return get_user_service_areas(user).filter(geometry__contains=point).exists()


class EventServiceAreaPermission(permissions.BasePermission):
    """
    Checks that the user has access to the area the start-point is in.
    """

    message = 'You do not have permission to create or update an event at this location.'

    def has_permission(self, request, view):
        return self._start_location_allowed(request.user, request.data, instance=None)

    def has_object_permission(self, request, view, obj):
        return self._start_location_allowed(request.user, request.data, instance=obj)

    def _start_location_allowed(self, user, request_data, instance=None):
        coords = extract_event_start_coords(request_data, instance)
        if coords is None:
            self.message = (
                'Unable to determine event start location for permission check.'
            )
            return False

        if user_may_use_point(user, coords):
            return True

        self.message = (
            'You do not have permission to create or update an event at this location.'
        )
        return False
