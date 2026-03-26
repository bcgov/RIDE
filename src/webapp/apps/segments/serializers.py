import re

from rest_framework import serializers

from apps.shared.serializers import UserSerializer
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
    sort_key = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = "__all__"

    def get_sort_key(self, route):

        if route.name.startswith('Highway '):
            match = re.match(r'^Highway\s+(\d+)(.*)', route.name)
            return f'0-{int(match.group(1)):03}-{match.group(2)}'
        return f'1-0-{route.name}'
