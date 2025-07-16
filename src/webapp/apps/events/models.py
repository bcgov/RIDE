from pprint import pprint
import uuid

from django.db import models, transaction
from django.db.models.constraints import UniqueConstraint
from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.gis.db import models as gis
from django.utils import timezone


from .enums import EventType, EventSubtype, Severity, Status


class EventManager(models.Manager):

    def get_queryset(self):
        return super().get_queryset().filter(latest=True)


class RelatedEventManager(models.Manager):

    def get_queryset(self, **hints):

        print('related event manager')
        pprint(dir(self))
        return super().get_queryset()


EXCLUDED = ['_state', 'uuid', 'id', 'version', 'latest', 'created', 'last_updated', 'user']

class Event(models.Model):

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id = models.CharField(max_length=20, blank=True, null=True)
    version = models.IntegerField(default=0)
    latest = models.BooleanField(default=False)

    created = models.DateTimeField(default=timezone.now, editable=False)
    last_updated = models.DateTimeField(auto_now=True, editable=False)
    user = models.CharField(max_length=100, blank=True, null=True)
    metadata = models.JSONField(default=dict, encoder=DjangoJSONEncoder, editable=False)

    event_type = models.CharField(max_length=30, choices=EventType, blank=True, null=True)
    event_subtype = models.CharField(max_length=30, choices=EventSubtype, blank=True, null=True)

    status = models.CharField(max_length=20, choices=Status, blank=True, null=True)
    severity = models.CharField(max_length=20, choices=Severity.choices, blank=True, null=True)
    is_closure = models.BooleanField(default=False)

    geometry = gis.GeometryField(blank=True, null=True)
    # tlids = models.JSONField(default=list, null=True)

    headline = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    objects = models.Manager()
    current = EventManager()
    relations = RelatedEventManager()

    class Meta:
        ordering = ['id', 'version']
        get_latest_by = ['id', 'version']
        constraints = [
            UniqueConstraint(fields=['id', 'version'], name='id_version'),
        ]
        base_manager_name = 'relations'

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
                history = Event.objects.filter(id=self.id).order_by('version')

                # propogate created timestamp to all versions
                first = history.first()
                if first:
                    self.created = first.created

                # get latest prior version for calculating new version number
                last = history.last()

                if self.unchanged_since(last):
                    return

                if last:
                    Event.objects.filter(id=self.id).update(latest=False)
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


class RelatedManager(models.Manager):

    def get_queryset(self):
        # print('in related manager')
        return super().get_queryset()


class Related(models.Model):

    name = models.TextField(blank=True, null=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)

    objects = RelatedManager()

