import datetime
import re

from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, Route, ChainUp
from apps.segments.serializers import SegmentSerializer, RouteSerializer, ChainUpSerializer
from apps.users.permissions import Approver


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
    permission_classes = [Approver]

    def get_queryset(self):
        if self.request.user.is_superuser:
            qs = ChainUp.current.all()
        else:
            user_orgs = self.request.user.organizations.all()
            user_areas = ServiceArea.objects.filter(organizations__in=user_orgs)
            qs = ChainUp.current.filter(area__in=user_areas)

        return qs.extra(select={'id_int': 'CAST(id AS INTEGER)'}).order_by('id_int')

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        uuids = request.data.get('uuids', [])
        if not isinstance(uuids, list):
            return Response({'error': 'uuids must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        toggled = []
        chainups = ChainUp.current.filter(uuid__in=uuids)
        for chainup in chainups:
            chainup.active = not chainup.active
            chainup.user = request.user

            if chainup.active:
                chainup.next_update = datetime.datetime.now() + datetime.timedelta(days=1)

            else:
                chainup.next_update = None

            chainup.save()
            toggled.append(ChainUpSerializer(chainup).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': toggled}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='reconfirm')
    def reconfirm(self, request):
        uuids = request.data.get('uuids', [])
        if not isinstance(uuids, list):
            return Response({'error': 'uuids must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        reconfirmed = []
        chainups = ChainUp.current.filter(uuid__in=uuids)
        for chainup in chainups:
            chainup.next_update = datetime.datetime.now() + datetime.timedelta(days=1)
            chainup.user = request.user
            chainup.save()
            reconfirmed.append(ChainUpSerializer(chainup).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': reconfirmed}, status=status.HTTP_202_ACCEPTED)


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
