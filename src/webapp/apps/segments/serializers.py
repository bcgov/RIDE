from rest_framework import serializers

from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, Route, ChainUp


class SegmentSerializer(serializers.ModelSerializer):
    area = serializers.SerializerMethodField()

    class Meta:
        model = Segment
        # fields = "__all__"
        exclude = ["geometry"]

    def get_area(self, obj):
        sa = ServiceArea.objects.filter(segments__contains=int(obj.id)).exclude(parent=None).first()
        return sa.id if sa else None


class ChainUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChainUp
        exclude = ["geometry"]


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = "__all__"
