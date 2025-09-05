from pprint import pprint
import uuid

from django.db import models, transaction
from django.db.models.constraints import UniqueConstraint
from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.gis.db import models as gis
from django.utils import timezone


from .enums import EventType, EventSubtype, Severity, Status


class VersionedManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(latest=True)


class RelatedEventManager(models.Manager):

    def get_queryset(self, **hints):

        print('related event manager')
        pprint(dir(self))
        return super().get_queryset()


EXCLUDED = [
    '_state', 'uuid', 'id', 'version', 'latest', 'created', 'last_updated', 'user',
]


class VersionedModel(models.Model):
    '''
    A versioned model keeps a history of all changes.

    The model has an ID field uniquely identifying the entity (but not the row),
    and an incrementing version number.  A UUID uniquely identifies each row;
    A unique identifier for the entity is the combination of ID and version
    number.

    The latest version of the record is complete.  The created timestamp is
    carried forward unchanged through each.  Entities are soft deleted.

    The user recorded for the version is the user causing that version to be
    saved.
    '''

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id = models.CharField(max_length=20, blank=True, null=True)
    version = models.IntegerField(default=0)
    latest = models.BooleanField(default=False)
    created = models.DateTimeField(default=timezone.now, editable=False)
    last_updated = models.DateTimeField(auto_now=True, editable=False)
    user = models.CharField(max_length=100, blank=True, null=True)
    deleted = models.BooleanField(default=False)

    objects = models.Manager()
    current = VersionedManager()

    class Meta:
        ordering = ['id', 'version']
        get_latest_by = ['id', 'version']
        # base_manager_name = 'relations'
        abstract = True

    def __str__(self):
        return f'{self.id} ({self.version})'

    def save(self, *args, **kwargs):
        '''
        Overriding save for purposes of keeping model history.

        This model maintains its own history by:

        1)  always inserting a new record when saving, with a new PK, same ID,
            and incremented version number, and

        2)  keeping the latest version flagged with a field `latest` that is
            `True` (while all earlier versions are `False`).

        3)  The model retains in every version the created timestamp of the
            first version.

        This behaviour can be avoided by including the standard argument
        `force_update=True`; the model will then use only the `super()` save
        method as normal.

        The latest version is complete: no data needs to be retrieved from
        earlier versions, which exist only to provide a change and audit log.
        '''

        with transaction.atomic():
            if not kwargs.get('force_update'):
                history = type(self).objects.filter(id=self.id).order_by('version')

                # propogate created timestamp to all versions
                first = history.first()
                if first:
                    self.created = first.created

                # get latest prior version for calculating new version number
                last = history.last()

                # if self.unchanged_since(last):
                #     return

                if last:
                    type(self).objects.filter(id=self.id).update(latest=False)
                    self.version = last.version + 1

                self.pk = None  # ensure INSERT over UPDATE
                self.latest = True

            super().save(*args, **kwargs)

    def unchanged_since(self, event):
        '''
        Return False if at least one model field differs from the comparison

        Keys listed in EXCLUDED are not compared because those keys would not
        be different or that manage history.  The only fields that should be
        compared are the content fields.

        This function short circuits, returning `False` on the first detected
        difference in field values.
        '''

        if event is None: return False

        for key, value in self.__dict__.items():
            if key in EXCLUDED:
                continue

            if event.__dict__[key] != value:
                return False

        return True

    def get_current(self):

        return self if self.latest else Event.current.get(id=self.id)


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


class Event(VersionedModel):

    meta = models.JSONField(default=dict)
    event_type = models.CharField(blank=True, null=True)
    status = models.CharField(default='Active')

    start = LocationField(default=dict)
    end = LocationField(default=dict, null=True)
    geometry = gis.GeometryCollectionField(blank=True, null=True)

    # detail
    direction = models.CharField(blank=True, null=True)
    severity = models.CharField(blank=True, null=True)
    category = models.CharField(blank=True, null=True)
    situation = models.PositiveIntegerField(default=0)

    impacts = OrderedListField()
    restrictions = OrderedListField()
    conditions = OrderedListField()

    delay_amount = models.PositiveIntegerField(default=0)
    delay_unit = models.CharField(default='minutes')

    next_update = models.DateTimeField(null=True)
    end_time = models.DateTimeField(null=True)

    additional = models.TextField(blank=True, null=True)
    # is_closure = models.BooleanField(default=False)
    # tlids = models.JSONField(default=list, null=True)


class Comment(VersionedModel):

    text = models.TextField(blank=True)


# class Choice(models.Model):

#     label = models.CharField(max_length=20)
#     order = models.PositiveSmallIntegerField()

#     class Meta:
#         abstract = True


# class EventType(Choice):
#     pass


# class Category(Choice):
#     pass


# class TrafficImpact(Choice):
#     pass


# class Restriction(Choice):
#     pass


sample = '''{
  "type": "Incident",
  "start": {
    "location": [
      -120.69816026633748,
      50.09734902191738
    ],
    "name": "Hwy 97C",
    "alias": "Hwy 5A",
    "aliases": [
      "Hwy 5A",
      "Merritt-Princeton Hwy 5A"
    ],
    "nearby": {
      "options": [
        {
          "source": "BCGNWS",
          "name": "Merritt",
          "type": "City",
          "coordinates": [
            -120.788333334,
            50.1124999965
          ],
          "distance": 15.431,
          "direction": "E",
          "priority": 6,
          "phrase": "15.4km E of Merritt"
        },
        {
          "source": "BCGNWS",
          "name": "Kamloops",
          "type": "City",
          "coordinates": [
            -120.3394444447,
            50.6758333294
          ],
          "distance": 98.428,
          "direction": "S",
          "priority": 6,
          "phrase": "98.4km S of Kamloops"
        },
        {
          "source": "BCGNWS",
          "name": "Logan Lake",
          "type": "District Municipality (1)",
          "coordinates": [
            -120.8133333333,
            50.4944444401
          ],
          "distance": 63.998,
          "direction": "S",
          "priority": 5,
          "phrase": "64km S of Logan Lake"
        },
        {
          "source": "BCGNWS",
          "name": "Peachland",
          "type": "District Municipality (1)",
          "coordinates": [
            -119.7363888889,
            49.7738888844
          ],
          "distance": 108.016,
          "direction": "NW",
          "priority": 5,
          "phrase": "108km NW of Peachland"
        },
        {
          "source": "BCGNWS",
          "name": "Princeton",
          "type": "Town",
          "coordinates": [
            -120.5089678006,
            49.4590345969
          ],
          "distance": 82.293,
          "direction": "N",
          "priority": 4,
          "phrase": "82.3km N of Princeton"
        }
      ],
      "picked": [
        0,
        2
      ],
      "other": ""
    }
  },
  "end": {
    "location": "",
    "route": "",
    "name": null,
    "alias": "",
    "aliases": null,
    "nearby": {
      "options": null,
      "picked": [],
      "other": ""
    }
  },
  "route": [],
  "impacts": [
    "1",
    "4",
    "3"
  ],
  "restrictions": [],
  "conditions": [],
  "delay": {
    "amount": "20",
    "unit": "hours"
  },
  "timing": {
    "nextUpdate": "2025-08-22T13:04",
    "end": ""
  },
  "additional": "Additional Messaging",
  "direction": "Both",
  "severity": "Minor (30- minute delay)",
  "situation": "92"
}'''

