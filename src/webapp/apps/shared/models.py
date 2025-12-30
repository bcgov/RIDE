import uuid

from django.conf import settings
from django.db import models, transaction
from django.db.models.signals import pre_delete
from django.utils import timezone

EXCLUDED = [
    '_state', 'uuid', 'id', 'version', 'latest', 'created', 'last_updated', 'user',
]


class BaseModel(models.Model):
    created = models.DateTimeField(default=timezone.now, editable=False)
    last_updated = models.DateTimeField(auto_now=True, editable=False)
    deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True


class VersionedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(latest=True, deleted=False)


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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    deleted = models.BooleanField(default=False)

    objects = models.Manager()
    current = VersionedManager()
    last = VersionedManager()

    class Meta:
        ordering = ['id', 'version']
        get_latest_by = ['id', 'version']
        abstract = True
        _delete_related = []

    def __str__(self):
        return f'{self.id} ({self.version})'

    def save(self, *args, make_latest=True, **kwargs):
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

                if self.unchanged_since(last):
                    return

                if last:
                    type(self).objects.filter(id=self.id).update(latest=False)
                    self.version = last.version + 1

                self.pk = None  # ensure INSERT over UPDATE
                self.latest = True

            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pre_delete.send(sender=self.__class__, instance=self)
        self.deleted = True
        self.save()

    def unchanged_since(self, instance):
        '''
        Return False if at least one model field differs from the comparison

        Keys listed in EXCLUDED are not compared because those keys would not
        be different, or they manage history.  The only fields that should be
        compared are the content fields.

        This function short circuits, returning `False` on the first detected
        difference in field values.
        '''

        if instance is None: return False

        for key, value in self.__dict__.items():
            if key in EXCLUDED:
                continue

            if instance.__dict__[key] != value:
                return False

        return True

    def get_current(self):
        return self if self.latest else type(self).current.get(id=self.id)
