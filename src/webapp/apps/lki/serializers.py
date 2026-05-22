from rest_framework import fields, serializers
from rest_framework.serializers import ModelSerializer

from . import models


class Highway(ModelSerializer):

    full_name = fields.SerializerMethodField()

    class Meta:
        model = models.Highway
        fields = ['number', 'letter', 'description', 'full_name']

    def get_full_name(self, obj):
        return f'{obj.number}{obj.letter}'


class Segment(ModelSerializer):

    highways = Highway(many=True)

    class Meta:
        model = models.Segment
        fields = ['id', 'highways', 'direction']


class Landmark(ModelSerializer):

    id = fields.SerializerMethodField()
    distance = fields.SerializerMethodField()
    source = fields.SerializerMethodField()
    label = fields.SerializerMethodField()
    segment = Segment()

    def get_distance(self, obj):
        return obj.distance.m

    def get_label(self, obj):
        return obj.description

    def get_id(self, obj):
        return f'landmark-{obj.id}'

    def get_source(self, obj):
        return 'landmarks'

    class Meta:
        model = models.Landmark
        fields = '__all__'
