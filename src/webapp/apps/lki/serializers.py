from rest_framework import fields, serializers
from rest_framework.serializers import ModelSerializer

from .models import Landmark

class Landmark(ModelSerializer):

    distance = fields.SerializerMethodField()

    def get_distance(self, obj):
        return obj.distance.m

    class Meta:
        model = Landmark
        fields = '__all__'
