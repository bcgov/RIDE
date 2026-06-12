import re

from functools import cached_property

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

    @cached_property
    def _segment_to_area(self):
        # Create map with all SAs to avoid N+1 query
        mapping = {}
        for sa in ServiceArea.objects.exclude(parent=None):
            for segment_id in sa.segments:
                mapping.setdefault(int(segment_id), sa.id)
        return mapping

    def get_area(self, obj):
        return self._segment_to_area.get(int(obj.id))


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
