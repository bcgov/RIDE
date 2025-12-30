from django.contrib.gis.db import models as gis
from django.db import models, transaction
from django.db.models import ForeignKey
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from apps.segments.models import Segment
from apps.shared.models import BaseModel, VersionedModel


class LocationField(models.JSONField):
    '''
    Field for holding a GeoJSON location with supplementary information, and
    validating it.
    '''


class OrderedListField(models.JSONField):
    '''
    Field for holding a list of keys, or objects with key values relating to
    another model or contained extra data.  Order is always preserved.
    '''


class PendingManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(latest=True, approved=False, deleted=False)


class LatestApprovedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(latest_approved=True, deleted=False)


class Event(VersionedModel):
    '''
    An event is an occurrence with 1) a time, and 2) a place.

    Events are versioned: the event ID is a constant value across multiple,
    sequential versions, of which one is the latest.  As some events may need
    review and approval, the latest is not necessarily the one with the highest
    version.
    '''

    meta = models.JSONField(default=dict)
    event_type = models.CharField(blank=True, null=True)
    status = models.CharField(default='Active')
    approved = models.BooleanField(default=False)
    latest_approved = models.BooleanField(default=False)

    start = LocationField(default=dict)
    end = LocationField(default=dict, null=True)
    geometry = gis.GeometryCollectionField(blank=True, null=True)

    # detail
    direction = models.CharField(blank=True, null=True)
    severity = models.CharField(blank=True, null=True)
    category = models.CharField(blank=True, null=True)
    situation = models.PositiveIntegerField(default=0)

    impacts = OrderedListField(default=list)
    restrictions = OrderedListField(default=list)
    conditions = OrderedListField(default=list)
    schedules = OrderedListField(default=list)

    segment = ForeignKey(Segment, on_delete=models.CASCADE, blank=True, null=True)

    delay_amount = models.PositiveIntegerField(default=0)
    delay_unit = models.CharField(default='minutes')

    next_update = models.DateTimeField(null=True)
    start_time = models.DateTimeField(null=True)
    end_time = models.DateTimeField(null=True)

    additional = models.TextField(blank=True, null=True)
    link = models.URLField(max_length=None, blank=True, null=True)

    # override VersionedModel's .current manager to use latest_approved
    # rather than latest (still available via the .last manager)
    current = LatestApprovedManager()
    pending = PendingManager()

    def save(self, *args, **kwargs):
        '''
        Overriding save for maintaining the `latest_approved` field.

        `latest_approved` is a convenience field to allow easy querying
        of the last approved version of a VersionedModel (thus avoiding
        an aggregation query).  Basically just setting `latest_approved`
        to `False` for all the other approved instances in the history.
        '''

        with transaction.atomic():
            self.latest_approved = self.approved
            if self.approved:
                Event.objects\
                    .filter(id=self.id, latest_approved=True)\
                    .update(latest_approved=False)
            super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.id} ({self.version}) {self.latest} {self.approved} {self.latest_approved}'


class Note(VersionedModel):
    event = models.CharField()
    text = models.TextField(blank=True)


@receiver(pre_delete, sender=Event)
def delete_related_notes(instance, **kwargs):
    for note in Note.current.filter(event=instance.id):
        note.delete()


class Choice(BaseModel):
    label = models.CharField()
    order = models.PositiveSmallIntegerField()

    class Meta:
        abstract = True


# class EventType(Choice):
#     pass


# class Category(Choice):
#     pass


class TrafficImpact(Choice):
    closed = models.BooleanField(default=False)


class Condition(Choice):
    pass


# class Restriction(Choice):
#     pass
