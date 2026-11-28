import re

from django.contrib.gis.geos import LineString, Point
from django.contrib.gis.measure import D
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.events.enums import EventType
from apps.events.models import Event
from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, Route, ChainUp
from apps.segments.serializers import SegmentSerializer, RouteSerializer, ChainUpSerializer
from apps.users.permissions import IsApprover


def get_user_segments(user):
    user_orgs = user.organizations.all()
    user_areas = ServiceArea.objects.filter(organizations__in=user_orgs)
    segment_ids = set()
    for seg_list in user_areas.values_list('segments', flat=True):
        if seg_list:
            segment_ids.update(seg_list)

    # Segment.id is CharField; service area segments store int ids
    return Segment.objects.filter(id__in=[str(sid) for sid in segment_ids])


class SegmentAPIView(ModelViewSet):
    queryset = Segment.current.all()
    serializer_class = SegmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Segment.current.all() if self.request.user.is_superuser \
            else get_user_segments(self.request.user)

        return qs.extra(select={'id_int': 'CAST(id AS INTEGER)'}).order_by('id_int')


class ChainUpAPIView(ModelViewSet):
    queryset = ChainUp.current.all()
    serializer_class = ChainUpSerializer
    permission_classes = [IsApprover]

    def get_queryset(self):
        if self.request.user.is_approver:
            qs = ChainUp.current.all()
        else:
            user_orgs = self.request.user.organizations.all()
            user_areas = ServiceArea.objects.filter(organizations__in=user_orgs)
            qs = ChainUp.current.filter(area__in=user_areas)

        return qs.extra(select={'id_int': 'CAST(id AS INTEGER)'}).order_by('id_int')

    def editable_events(self, chainup):
        events = Event.objects.filter(chainup__id=chainup.id, event_type=EventType.CHAIN_UP)
        if events.filter(latest=True, status='Active').exists():
            raise ValidationError({'detail': 'Chain-up can not be changed when active'})

        return events

    def check_location(self, point, exclude_id=None):
        # snapped pins rarely match to the float, so treat within 10m as the same spot
        nearby = ChainUp.current.filter(primary_point__distance_lte=(point, D(m=10)))
        if nearby.exclude(id=exclude_id).exists():
            raise ValidationError({'detail': 'A chain-up already exists at this location'})

    def nearest_segment(self, point, route=None):
        ''' Nearest segment within 150m, as event saving matches segments; route's own first. '''
        local = point.transform(3005, clone=True)
        buffered = local.buffer(150)
        buffered.transform(point.srid or 4326)
        segments = list(Segment.current.filter(geometry__intersects=buffered).select_related('route'))
        # overlapping highways: keep the chain-up's route when it's nearby
        segments = [s for s in segments if s.route_id == getattr(route, 'id', None)] or segments

        nearest = min(segments, key=lambda s: s.geometry.transform(3005, clone=True).distance(local), default=None)
        if not nearest:
            raise ValidationError({'detail': 'No route found near this location'})

        return nearest

    def route_at(self, point):
        return self.nearest_segment(point).route

    def line_along(self, point, segment):
        ''' 100m of the segment from the pin, matching existing chain-ups; secondary point is its end. '''
        line = segment.geometry.transform(3005, clone=True)
        start = line.project(point.transform(3005, clone=True))
        end = min(start + 100, line.length)
        inner = [c for c in line.coords if start < line.project(Point(c, srid=3005)) < end]

        geometry = LineString([line.interpolate(start).coords, *inner, line.interpolate(end).coords], srid=3005)
        geometry.transform(point.srid or 4326)
        return {'secondary_point': Point(geometry.coords[-1], srid=geometry.srid), 'geometry': geometry}

    @action(detail=False, methods=['get'], url_path='route')
    def route_lookup(self, request):
        ''' Route at lat/lng by geometry, so the create panel knows before submitting. '''
        try:
            point = Point(float(request.query_params['lng']), float(request.query_params['lat']), srid=4326)

        except (KeyError, ValueError):
            raise ValidationError({'detail': 'lat and lng are required'})

        return Response(RouteSerializer(self.route_at(point)).data)

    @transaction.atomic
    def perform_create(self, serializer):
        data = serializer.validated_data
        point = data['primary_point']
        self.check_location(point)

        # route always comes from geometry; any client-sent route is ignored
        segment = self.nearest_segment(point)
        route = segment.route

        # ids are numeric strings shared by all versions; next one across every version
        ChainUp.lock_ids()
        last_id = max((int(i) for i in ChainUp.objects.values_list('id', flat=True) if i and i.isdigit()), default=0)
        last_order = ChainUp.current.filter(area=data['area'], route=route).aggregate(m=Max('sorting_order'))['m']

        serializer.save(
            id=str(last_id + 1),
            route=route,
            user=self.request.user,
            sorting_order=(last_order or 0) + 1,
            # shortcut: no milepost source yet; 0 until one is wired in
            primary_mp=0,
            secondary_mp=0,
            **self.line_along(point, segment),
        )

    @transaction.atomic
    def perform_update(self, serializer):
        events = self.editable_events(serializer.instance)
        extra = {}

        point = serializer.validated_data.get('primary_point')
        if point:
            self.check_location(point, exclude_id=serializer.instance.id)
            # line and route follow the pin
            segment = self.nearest_segment(point, serializer.instance.route)
            extra = {'route': segment.route, **self.line_along(point, segment)}

        chainup = serializer.save(user=self.request.user, **extra)
        events.update(chainup=chainup)

    @transaction.atomic
    def perform_destroy(self, instance):
        events = self.editable_events(instance)

        instance.user = self.request.user
        instance.delete()  # soft-delete: new version with deleted=True

        events.update(chainup=instance)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def restore(self, request, pk):
        ''' Undo a delete; pk may be any version's uuid. '''
        chainup = get_object_or_404(ChainUp.objects, uuid=pk)
        chainup = get_object_or_404(ChainUp.objects, id=chainup.id, latest=True, deleted=True)
        events = Event.objects.filter(chainup__id=chainup.id, event_type=EventType.CHAIN_UP)

        chainup.deleted = False
        chainup.user = request.user
        chainup.save()

        events.update(chainup=chainup)
        return Response(self.get_serializer(chainup).data)


def route_sort_key(route):
    """Sort highways first by number, then non-highways alphabetically."""
    match = re.match(r'^Highway\s+(\d+)(.*)', route.name)
    if match:
        # (0, highway_number, suffix) — highways come first
        return (0, int(match.group(1)), match.group(2))
    # (1, 0, name) — non-highways come after, sorted alphabetically
    return (1, 0, route.name)


class RouteAPIView(ModelViewSet):
    serializer_class = RouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            qs = Route.objects.all()

        else:
            segments = get_user_segments(self.request.user)
            route_ids = segments.values_list('route_id', flat=True)
            qs = Route.objects.filter(id__in=route_ids).distinct()

        return sorted(qs, key=route_sort_key)
