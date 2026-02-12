from rest_framework import serializers

from apps.events.serializers import UserSerializer
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
    first_reported = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    def get_first_reported(self, obj):
        first_version = obj if obj.version == 0 else ChainUp.objects.get(id=obj.id, version=0)
        return {
            'user': UserSerializer(first_version.user).data if first_version.user else None,
            'date': first_version.created,
        }

    def get_user(self, obj):
        return UserSerializer(obj.user).data

    class Meta:
        model = ChainUp
        exclude = ["geometry"]


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = "__all__"
