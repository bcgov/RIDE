import copy
from datetime import datetime, timezone
from pprint import pprint

from django.contrib.auth import get_user_model
from rest_framework import fields, serializers
from rest_framework.serializers import Serializer, ModelSerializer, Field
from rest_framework_gis.fields import GeometryField

from .models import Event, Note, TrafficImpact


class UserSerializer(ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = ['id', 'first_name', 'last_name', 'email']


class VersionSerializer(ModelSerializer):

    user = UserSerializer(default=serializers.CurrentUserDefault())


class KeyMoveSerializer(VersionSerializer):
    '''
    A serializer for adjusting keys in the data argument prior to processing.

    Given a dict as argument to the data parameter, a list of source and target
    keys defined in the serializer Meta class will be processed in the __init__
    method before calling super(), allowing a non-conformant data object to be
    made so (e.g., if a REST API call's submission doesn't match the model's
    fields). The value of source will be copied to the target key.  Both source
    and target may be dotted paths.

    The source/target specification is a dict under the serializer's Meta class
    named keys_to_move.  The source/target pairs are processed in the order
    listed.  The target may overwrite an existing value.

    For the source key, if the full path doesn't exist, None will be copied to
    target key.

    For the target key, if the path doesn't exist, dicts will be created to
    fulfill the path specified.

    Values under the source key will not be deleted: as part of serializer
    validation, non-conforming keys/values are not included in validated_data.

    A source path of '__orig__' will make a deep copy of the entire data
    structure and append that the target key.

    e.g., for keys_to_move = { 'foo.bar': 'bar.baz' }, a data argument of
        { 'foo': { 'bar': 1 } } will become { 'bar': { 'baz': 1 } }.
    '''

    def __init__(self, *args, **kwargs):
        self.partial = kwargs.get('partial', False)
        if 'data' in kwargs:
            self.move_keys(kwargs['data'])
        super().__init__(*args, **kwargs)

    def move_keys(self, data):
        ''' Modify `data`, moving values from one key to a different key. '''

        for source, target in self.Meta.keys_to_move.items():

            if source == '__orig__':
                actual = copy.deepcopy(data)
            else:
                actual = data
                for key in source.split('.'):
                    if key in actual:
                        actual = actual[key]
                    else:
                        actual = None
                        break

            current = data
            path = target.split('.')
            for key in path[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]

            if actual is not None or not self.partial:
                current[path[-1]] = actual

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # reverse the ingestion key movement
        for source, target in self.Meta.keys_to_move.items():

            if source == '__orig__':
                continue
            else:
                actual = data
                for key in target.split('.'):
                    parent = actual
                    if key in actual:
                        actual = actual[key]
                    else:
                        actual = None
                        break
                del parent[key]

            current = data
            path = source.split('.')
            for key in path[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]

            current[path[-1]] = actual

        return data

    class Meta:
        keys_to_move = {}  # <source>: <target>


class NoteSerializer(VersionSerializer):

    class Meta:
        model = Note
        fields = '__all__'

    def validate_event(self, value):

        # if Event.objects.filter(id=value).count() == 0:
        #     raise serializers.ValidationError("Event not found for ID")

        return value

    def to_internal_value(self, data):
        validated = super().to_internal_value(data)

        if validated.get('id') is None and self.instance is None:
            validated['id'] = self.get_id()
        return validated

    def get_id(self):
        e = Note.objects.distinct('id').order_by('-id').first()
        if e is None:
            return '100000'
        else:
            return int(e.id) + 1


class NotesListSerializer(fields.ListField):
    child = NoteSerializer()

    def get_attribute(self, instance):
        return Note.current.filter(event=instance.id).order_by('-created')


class EventSerializer(KeyMoveSerializer):

    geometry = GeometryField()
    is_closure = fields.SerializerMethodField()
    last_inactivated = fields.SerializerMethodField()
    ongoing = fields.SerializerMethodField()
    notes = NotesListSerializer(required=False)

    class Meta:
        model = Event
        exclude = ['deleted']
        keys_to_move = {
            '__orig__': 'meta.source',
            'type': 'event_type',
            'location.start': 'start',
            'location.end': 'end',
            'details.direction': 'direction',
            'details.severity': 'severity',
            'details.category': 'category',
            'details.situation': 'situation',
            'delays.amount': 'delay_amount',
            'delays.unit': 'delay_unit',
            'timing.nextUpdate': 'next_update',
            'timing.startTime': 'start_time',
            'timing.endTime': 'end_time',
            'timing.ongoing': 'ongoing',
            'timing.schedules': 'schedules',
            'external.url': 'link',
        }

    def validate_notes(self, notes):
        if len(notes) > 1:
            raise serializers.ValidationError(
                'At most one note can be submitted on Event creation'
            )
        return notes

    def get_is_closure(self, obj):
        ids = [impact['id'] for impact in obj.impacts]
        return TrafficImpact.objects.filter(id__in=ids, closed=True).count() > 0

    def get_last_inactivated(self, obj):
        return obj.meta.get('last_inactivated')

    def get_ongoing(self, obj):
        if obj.start_time is not None and obj.end_time is None:
            return True

        return False

    def to_internal_value(self, data):
        if data.get('id') is None and self.instance is None:  # creating
            data['id'] = self.get_id()

            # Notes can only be created on Event creation; this allows an
            # initial note to be submitted with the Event.
            data['notes'] = data.get('notes', [])
            for note in data['notes']:  # Note needs event ID
                note['event'] = data['id']
        else:  # updating
            if len(data.get('notes', [])) > 0:
                raise serializers.ValidationError({
                    'Notes': 'Submitting notes with existing events is not allowed.'
                })
            if data.get('status') == 'Inactive':
                now = datetime.now(tz=timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
                data['meta']['last_inactivated'] = now

        data['approved'] = self.approval_not_needed(data)
        data['approved'] = True  # temp fix in UAT to disable approval queue

        return super().to_internal_value(data)

    def to_representation(self, instance):
        obj = super().to_representation(instance)

        # have to remove meta here to avoid sending it, rather than as an
        # excluded field, because otherwise meta doesn't get populated on the
        # way in through key movement and to_internal_value()
        del obj['meta']

        return obj

    def approval_not_needed(self, data):
        if data.get('severity') == 'Minor':
            return True

        request = self.context.get('request')
        if request.user.is_approver:
            return True

        return False

    def create(self, validated_data):
        # Notes need to be saved separately since they don't have an actual
        # relation field joining them
        for note in validated_data.get('notes', []):
            Note.objects.create(**note)

        # without a relation, the presence of 'notes' breaks creating the event
        if 'notes' in validated_data:
            del validated_data['notes']

        return super().create(validated_data)

    def get_id(self):
        event = Event.objects.distinct('id').order_by('-id').first()
        if event is None:
            return 'DBC-100000'
        else:
            return f'DBC-{int(event.id.split('-')[-1]) + 1}'


class TrafficImpactSerializer(ModelSerializer):

    class Meta:
        model = TrafficImpact
        fields = ['id', 'label', 'order', 'closed']
