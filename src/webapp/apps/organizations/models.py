from django.db import models

from apps.events.models import BaseModel


class Organization(BaseModel):
    name = models.CharField(max_length=128, blank=True, default='')
    service_areas = models.ManyToManyField('ServiceArea', related_name='organizations')


class ServiceArea(BaseModel):
    id = models.PositiveSmallIntegerField(primary_key=True)
    name = models.CharField(max_length=128, blank=True, default='')
    sortingOrder = models.PositiveSmallIntegerField()
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=False, related_name='children')
