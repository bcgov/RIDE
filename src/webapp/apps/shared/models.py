import uuid

from dictdiffer import diff

from django.conf import settings
from django.db import models, transaction
from django.db.models.signals import pre_delete
from django.utils import timezone

EXCLUDED = [
    '_state', 'uuid', 'id', 'version', 'latest', 'created', 'last_updated', 'user',
]


class LocationField(models.JSONField):
    '''
    Field for holding a GeoJSON location with supplementary information, and
    validating it.
    '''

    fields = ['name']

    def get_internal_type(self):
        return "LocationField"

    def db_type(self, connection):
        return models.JSONField().db_type(connection)

    def diff(self, a, b):

        result = {}

        coords_a = a.get('coords')
        coords_b = b.get('coords')

        if coords_a != coords_b:
            result['coords'] = {}
            if coords_a is None:
                result['coords']['add'] = f'[{coords_b[0]:.6f}, {coords_b[1]:.6f}]'
            elif coords_b is None:
                result['coords']['remove'] = f'[{coords_a[0]:.6f}, {coords_a[1]:.6f}]'
            else:
                result['coords']['change'] = f'[{coords_a[0]:.6f}, {coords_a[1]:.6f}]'

        if b.get('name') != a.get('name'):
            result['name'] = {}
            if not a['name']:
                result['name']['add'] = b.get('name')
            elif not b['name']:
                result['name']['remove'] = a.get('name')
            else:
                result['name']['change'] = [a.get('name'), b.get('name')]

        alias_a = a.get('alias') if a.get('alias') and a.get('useAlias', False) else None
        alias_b = b.get('alias') if b.get('alias') and b.get('useAlias', False) else None
        if alias_b != alias_a:
            result['alias'] = {}
            if not alias_a:
                result['alias']['add'] = alias_b
            elif not alias_b:
                result['alias']['remove'] = alias_a
            else:
                result['alias']['change'] = [alias_a, alias_b]

        other_a = a.get('other') if a.get('other') and a.get('useOther', False) else None
        nearby_a = {n['phrase'] for n in a['nearby'] if n.get('include', False)}
        if other_a:
            nearby_a.add(other_a)
        other_b = b.get('other') if b.get('other') and b.get('useOther', False) else None
        nearby_b = {n['phrase'] for n in b['nearby'] if n.get('include', False)}
        if other_b:
            nearby_b.add(other_b)
        added = nearby_b.difference(nearby_a)
        removed = nearby_a.difference(nearby_b)
        if removed:
            if 'nearby' not in result: result['nearby'] = {}
            result['nearby']['remove'] = removed
        if added:
            if 'nearby' not in result: result['nearby'] = {}
            result['nearby']['add'] = added

        return result


class OrderedListField(models.JSONField):
    '''
    Field for holding a list of keys, or objects with key values relating to
    another model or contained extra data.  Order is always preserved.

    The method to be used for generating the diff may be passed in as an
    argument.
    '''

    def __init__(self, *args, **kwargs):
        if 'diff' in kwargs:
            self.diff = kwargs.pop('diff')

        super().__init__(*args, **kwargs)

    def get_internal_type(self):
        return "OrderedListField"

    def db_type(self, connection):
        return models.JSONField().db_type(connection)

    def diff(self, a, b):
        '''
        Return a diff treating the entities as basic units

        If a and b have any difference, a and b are treated as a single change;
        differences are not itemized.  For purposes of detecting adding or
        removing, the id field of the entity is used.
        '''

        result = {}
        in_a = {aa['id'] for aa in a}
        in_b = {aa['id'] for aa in b}
        lookup = {aa['id']:aa for aa in a}

        for bb in b:
            if bb['id'] not in lookup:
                lookup[bb['id']] = bb
                continue
            aa = lookup[bb['id']]
            y = list(diff(aa, bb))
            if len(y) > 0:
                if 'change' not in result:
                    result['change'] = []
                result['change'].append({ 'id': bb['id'], 'diff': y })

        added = in_b.difference(in_a)
        removed = in_a.difference(in_b)
        if added:
            result['add'] = [lookup[add] for add in added]
        if removed:
            result['remove'] = [lookup[remove] for remove in removed]

        return result


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

    versioning_fields = ['uuid', 'id', 'version', 'latest', 'created', 'last_updated', 'user', 'deleted']

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

    def prior(self):
        ''' Return the the most immediate earlier version, or None. '''

        if self.version == 0:
            return None
        return self.__class__.objects.get(id=self.id, version=self.version - 1)

    def diff(self, earlier=None):
        '''
        Return a dict containing key/value pairs of fields with earlier values
        different from this version.

        By default, the earlier version is the immediately prior version of the
        instance, but passing an earlier instance will generate a diff with that
        version instead.  Note that this then excludes changed values in
        intervening versions (e.g., for version 20, diff'ing with version 15
        will directly compare those two, ignoring changes in versions 16-19).

        Checking for difference in values excludes fields returned from the
        .get_ignored_fields() method.  Models inheriting this model should
        override this method to add their own fields to the list.
        '''

        changes = {}

        if self.version > 0:
            prior = earlier or self.prior()

            for field in self._meta.get_fields():
                if field.name in self.get_ignored_fields():
                    continue

                current = getattr(self, field.name)
                previous = getattr(prior, field.name)

                if current != previous:
                    if field.get_internal_type() in ['LocationField', 'OrderedListField']:
                        changes[field.name] = field.diff(previous, current)
                    elif field.get_internal_type() == 'JSONField':
                        changes[field.name] = diff(previous, current)
                    else:
                        changes[field.name] = previous

        return changes

    def get_ignored_fields(self):
        return self.versioning_fields

    def get_history(self):
        ''' Returns a list of diffs from this version back to the first. '''

        if self.version == 0:
            return [self.diff()]

        history = self.prior().get_history()
        history.append(self.diff())
        return history


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
