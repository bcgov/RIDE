import os
import sys
from time import strftime, strptime

from django.contrib.gis.db import models as gis
from django.db import models, transaction
from django.db.models import ForeignKey
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from apps.events.enums import EventType
from apps.events.helpers import get_route_projection
from apps.events.open511 import sync_open511_data
from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, ChainUp
from apps.shared.models import BaseModel, LocationField, OrderedListField, VersionedModel


class EverythingManager(models.Manager):

    use_in_migrations = True


class PendingManager(models.Manager):

    use_in_migrations = True

    def get_queryset(self):
        return super().get_queryset().filter(latest=True, approved=False, deleted=False)


class LatestApprovedManager(models.Manager):

    use_in_migrations = True

    def get_queryset(self):
        return super().get_queryset().filter(latest_approved=True, deleted=False)

days_of_the_week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
DAY_NAMES = {
  'mon': 'Monday',
  'tue': 'Tuesday',
  'wed': 'Wednesday',
  'thu': 'Thursday',
  'fri': 'Friday',
  'sat': 'Saturday',
  'sun': 'Sunday',
}
SHORT_DAY_NAMES = {
  'mon': 'Mon',
  'tue': 'Tue',
  'wed': 'Wed',
  'thu': 'Thu',
  'fri': 'Fri',
  'sat': 'Sat',
  'sun': 'Sun',
}

# annoying platform difference in underlying C library strftime implementation
TIME_FORMAT = '%-I:%M %p' if os.name != 'nt' else '%#I:%M %p'


def _is_running_tests():
    return "test" in sys.argv or os.getenv("PYTEST_CURRENT_TEST") is not None

def parse_time(time):
    '''
    Return a time string of '17:04' as '5:04 pm'.  Return None on any input
    failing to parse.
    '''

    try:
        return strftime(TIME_FORMAT, strptime(time, '%H:%M'))
    except:
        return None

def desc(schedule, short_days=False):
    ''' Return a string describing the schedule '''

    groups = []
    current = []
    groups.append(current)

    for day in days_of_the_week:
        if schedule[day]:
            if short_days:
                current.append(SHORT_DAY_NAMES[day])
            else:
                current.append(DAY_NAMES[day])
        else:
            current = []
            groups.append(current)

    names = []
    for group in groups:
        if len(group) == 0:
            continue

        if len(group) == 7:
            names.append('every day' if schedule.get('allDay', False) else 'Every day')
        elif len(group) > 2:
            names.append(f'{group[0]} to {group[-1]}')
        else:
            names.extend(group)

    final = ', '.join(names)

    if schedule.get('allDay', False):
        final = f'All day {final}'
    else:
        start = parse_time(schedule.get('startTime'))
        end = parse_time(schedule.get('endTime'))
        if start is not None:
            if end is not None:
                final = f'{final}, from {start} to {end}'
            else:
                final = f'{final}, from {start}'
        elif end is not None:
            final = f'{final}, until {end}'

    if len(final) > 40 and not short_days:
        return desc(schedule, True)

    return final


def schedule_diff(a, b):
    a_scheds = {s['id']:desc(s) for s in a}
    b_scheds = {s['id']:desc(s) for s in b}
    diff = {}

    for s in a:
        if s['id'] not in b_scheds:
            if 'remove' not in diff:
                diff['remove'] = []
            diff['remove'].append(a_scheds[s['id']])
        elif a_scheds[s['id']] != b_scheds[s['id']]:
            if 'change' not in diff:
                diff['change'] = []
            diff['change'].append([a_scheds[s['id']], b_scheds[s['id']]])
    for s in b:
        if s['id'] not in a_scheds:
            if 'add' not in diff:
                diff['add'] = []
            diff['add'].append(b_scheds[s['id']])

    return diff


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
    schedules = OrderedListField(default=list, diff=schedule_diff)

    segment = ForeignKey(Segment, on_delete=models.CASCADE, blank=True, null=True)
    chainup = ForeignKey(ChainUp, on_delete=models.CASCADE, blank=True, null=True)
    service_area = ForeignKey(ServiceArea, on_delete=models.CASCADE, blank=True, null=True)

    delay_amount = models.PositiveIntegerField(default=0)
    delay_unit = models.CharField(default='minutes')

    next_update = models.DateTimeField(null=True)
    start_time = models.DateTimeField(null=True)
    end_time = models.DateTimeField(null=True)

    additional = models.TextField(blank=True, null=True)
    link = models.URLField(max_length=None, blank=True, null=True)

    # for sorting along a highway
    route_projection = models.FloatField(blank=True, default=0)

    # override VersionedModel's .current manager to use latest_approved
    # rather than latest (still available via the .last manager)
    objects = EverythingManager()
    current = LatestApprovedManager()
    pending = PendingManager()

    ignored_fields = ['meta', 'latest_approved']

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

            # Update non-rc/chain-ups segments reference
            if self.event_type not in [EventType.ROAD_CONDITION, EventType.CHAIN_UP] and self.geometry:
                event_srid = self.geometry.srid or 4326
                buffered_geometry = self.geometry.transform(3005, clone=True).buffer(150)
                buffered_geometry.transform(event_srid)
                segment = Segment.objects.filter(geometry__intersects=buffered_geometry).first()
                self.segment = segment

            # Update route projection for sorting
            self.route_projection = get_route_projection(self)

            super().save(*args, **kwargs)

            if not _is_running_tests():
                sync_open511_data(self)

    def get_ignored_fields(self):
        ignored = super().get_ignored_fields().copy()
        ignored.extend(self.ignored_fields)
        return ignored

    def __str__(self):
        return f'{self.id} v{self.version}'


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


class RouteGeometry(models.Model):
    id = models.CharField(max_length=128, primary_key=True)

    routes = gis.MultiLineStringField()

    def __str__(self):
        return self.id
