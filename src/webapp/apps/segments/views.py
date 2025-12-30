from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from apps.segments.models import Segment, Route
from apps.segments.serializers import SegmentSerializer, RouteSerializer


class SegmentAPIView(ModelViewSet):
    queryset = Segment.objects.extra(select={'id_int': 'CAST(id AS INTEGER)'}).order_by('id_int')
    serializer_class = SegmentSerializer
    permission_classes = [permissions.IsAuthenticated]


class RouteAPIView(ModelViewSet):
    queryset = Route.objects.all().order_by('id')
    serializer_class = RouteSerializer
    permission_classes = [permissions.IsAuthenticated]
