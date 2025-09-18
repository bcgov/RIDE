import copy
from pprint import pprint
from rest_framework import fields
from rest_framework.serializers import BaseSerializer, ModelSerializer

from .models import Event

class KeyMoveSerializer(BaseSerializer):
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

            current[path[-1]] = actual

    class Meta:
        keys_to_move = {}  # <source>: <target>

from rest_framework_gis.fields import GeometryField
class EventSerializer(KeyMoveSerializer, ModelSerializer):

    geometry = GeometryField()
    is_closure = fields.SerializerMethodField()

    class Meta:
        model = Event
        fields = '__all__'
        # exclude = ['meta']
        keys_to_move = {
            '__orig__': 'meta.source',
            'location.start': 'start',
            'location.end': 'end',
            'details.direction': 'direction',
            'details.severity': 'severity',
            'details.category': 'category',
            'details.situation': 'situation',
            'delays.amount': 'delay_amount',
            'delays.unit': 'delay_unit',
            'timing.nextUpdate': 'next_update',
            'timing.endTime': 'end_time',
        }

    def get_is_closure(self, obj):
        return len([i for i in obj.impacts if i['id'] == 7]) > 0

    def to_internal_value(self, data):
        validated = super().to_internal_value(data)

        if validated.get('id') is None:
            validated['id'] = self.get_id()
        return validated

    def to_representation(self, instance):
        data = super().to_representation(instance)
        del data['meta']
        del data['latest']
        del data['deleted']

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

    def get_id(self):
        e = Event.current.distinct('id').order_by('-id').first()
        if e is None:
            return 'DBC-100000'
        else:
            return f'DBC-{int(e.id.split('-')[-1]) + 1}'
