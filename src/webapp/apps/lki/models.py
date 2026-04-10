from django.db import models
from django.contrib.gis.db import models as gis

from apps.organizations.models import ServiceArea
from apps.shared.models import BaseModel


class Highway(BaseModel):

    number = models.IntegerField()
    letter = models.CharField(blank=True)
    description = models.CharField()

    def __str__(self):
        return f'{self.number}{self.letter}'

class LandmarkType(BaseModel):

    code = models.CharField(primary_key=True)
    description = models.CharField()
    notes = models.CharField(blank=True)

    def __str__(self):
        return f'{self.code} - {self.description}'

class ClassCategory(BaseModel):

    number = models.IntegerField(primary_key=True)
    version = models.IntegerField()
    short_name = models.CharField()
    name = models.CharField()
    notes = models.CharField()

    def __str__(self):
        return f'{self.number} - {self.name}'

class Changelog(BaseModel):

    changed = models.DateField()
    who = models.CharField()
    description = models.CharField()

class LatLonSource(BaseModel):

    description = models.CharField()
    notes = models.CharField()

class ClassCharacteristic(BaseModel):

    version = models.IntegerField()
    category = models.ForeignKey(ClassCategory, on_delete=models.CASCADE)
    number = models.IntegerField()
    code = models.CharField()
    name = models.CharField()

class Segment(BaseModel):

    id = models.CharField(primary_key=True)
    areas = models.ManyToManyField(ServiceArea, through='SegmentArea')
    highways = models.ManyToManyField(Highway)

    direction = models.CharField()
    search_sequence = models.IntegerField()
    report_sequence = models.IntegerField()
    length = models.FloatField()

    revised = models.DateField(null=True)
    effective = models.DateField(null=True)
    created = models.DateField(null=True)
    road_added = models.DateField(null=True)
    devolved = models.DateField(null=True)

    begin_node = models.CharField()
    begin_continuity = models.CharField()
    begin_km = models.FloatField(null=True)

    end_node = models.CharField()
    end_continuity = models.CharField()
    end_km = models.FloatField(null=True)

    nway = models.IntegerField()

    opposite_segment = models.CharField(blank=True)
    opposite = models.ForeignKey('Segment', null=True, on_delete=models.SET_NULL)

    description = models.CharField()
    km_year = models.IntegerField(null=True)

class SegmentArea(BaseModel):

    segment = models.ForeignKey(Segment, on_delete=models.CASCADE)
    start = models.FloatField(default=0.00)
    end = models.FloatField(default=999.90)
    area = models.ForeignKey(ServiceArea, on_delete=models.CASCADE)

class SegmentClass(BaseModel):

    segment = models.ForeignKey(Segment, on_delete=models.CASCADE)
    from_date = models.DateField()
    to_date = models.DateField()
    start = models.FloatField(default=0.00)
    end = models.FloatField(default=999.90)
    category = models.ForeignKey(ClassCategory, on_delete=models.CASCADE)
    characteristic = models.ForeignKey(ClassCharacteristic, on_delete=models.CASCADE)

class Landmark(BaseModel):

    segment = models.ForeignKey(Segment, null=True, on_delete=models.SET_NULL)
    km = models.FloatField()
    number = models.IntegerField()
    landmark_type = models.ForeignKey(LandmarkType, null=True, on_delete=models.SET_NULL)
    description = models.CharField()
    side = models.CharField(blank=True)
    point = models.CharField(blank=True)
    ext_id = models.CharField(blank=True)
    geometry = gis.PointField(null=True)
    source = models.ForeignKey(LatLonSource, null=True, on_delete=models.SET_NULL)
    km_post = models.FloatField(null=True)

class Intersection(BaseModel):

    legs = models.IntegerField()
    legs_confirmed = models.BooleanField()
    road1 = models.CharField()
    road2 = models.CharField()
    road3 = models.CharField(blank=True)
    place = models.CharField(blank=True)
    landmark = models.ForeignKey(Landmark, on_delete=models.CASCADE, related_name='sourced_intersection')
    landmarks = models.ManyToManyField(Landmark)
    year_signalized = models.IntegerField(null=True)

