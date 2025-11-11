from django.db import models
from django.contrib.gis.db import models as gis

from apps.events.models import BaseModel


class Organization(BaseModel):
    name = models.CharField(max_length=30, blank=True, default='', unique=True)
    service_areas = models.ManyToManyField('ServiceArea', related_name='organizations')
    contact_name = models.CharField(max_length=30, blank=True, default='')
    contact_id = models.CharField(max_length=30, blank=True, default='')


class ServiceArea(BaseModel):
    id = models.PositiveSmallIntegerField(primary_key=True)
    name = models.CharField(max_length=128, blank=True, default='')
    sortingOrder = models.PositiveSmallIntegerField()
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=False, related_name='children')
    geometry = gis.PolygonField(geography=True, srid=4326, blank=True, null=True)
