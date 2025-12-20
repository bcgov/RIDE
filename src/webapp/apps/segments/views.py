from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from apps.segments.models import Segment
from apps.segments.serializers import SegmentSerializer


class SegmentAPIView(ModelViewSet):
    queryset = Segment.objects.all().order_by('id')
    serializer_class = SegmentSerializer
    permission_classes = [permissions.IsAuthenticated]
