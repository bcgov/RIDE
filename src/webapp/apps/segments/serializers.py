from rest_framework import serializers

from apps.events.models import Event
from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, Route


class SegmentSerializer(serializers.ModelSerializer):
    areas = serializers.SerializerMethodField()

    class Meta:
        model = Segment
        # fields = "__all__"
        exclude = ["geometry"]

    def get_areas(self, obj):
        return ServiceArea.objects.filter(segments__contains=int(obj.id)).order_by('id').values_list('id', flat=True)


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = "__all__"
