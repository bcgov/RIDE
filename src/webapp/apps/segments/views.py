from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, Route
from apps.segments.serializers import SegmentSerializer, RouteSerializer

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

        return qs.order_by('id')
