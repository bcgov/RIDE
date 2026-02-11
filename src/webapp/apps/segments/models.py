from django.contrib.gis.db import models

from apps.organizations.models import ServiceArea
from apps.shared.models import BaseModel, VersionedModel
from config import settings


class Route(BaseModel):
    id = models.PositiveIntegerField(primary_key=True)
    name = models.CharField(max_length=250)

    last_updated = models.DateTimeField(auto_now=True, editable=False, null=True, blank=True)


class SegmentBase(VersionedModel):
    route = models.ForeignKey(Route, on_delete=models.CASCADE)
    name = models.CharField(max_length=90)
    description = models.CharField(max_length=255)
    sorting_order = models.PositiveIntegerField()
    primary_mp = models.FloatField()
    primary_point = models.PointField()
    secondary_mp = models.FloatField()
    secondary_point = models.PointField()
    geometry = models.LineStringField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True, editable=False, null=True, blank=True)

    class Meta:
        abstract = True


class Segment(SegmentBase):
    pass


class ChainUp(SegmentBase):
    active = models.BooleanField(default=False)
    area = models.ForeignKey(ServiceArea, on_delete=models.CASCADE)
    next_update = models.DateTimeField(null=True)
