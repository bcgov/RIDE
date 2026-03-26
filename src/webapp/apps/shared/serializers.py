import copy

from django.contrib.auth import get_user_model
from rest_framework import fields, serializers
from rest_framework.serializers import ModelSerializer


class UserSerializer(ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = ['id', 'first_name', 'last_name', 'email', 'username']

class VersionSerializer(ModelSerializer):

    user = UserSerializer(default=serializers.CurrentUserDefault())


class HistorySerializer(VersionSerializer):
    diff = fields.SerializerMethodField()

    def get_diff(self, obj):
        return obj.diff()


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

    def move_keys(self, data, partial=False):
        ''' Modify `data`, moving values from one key to a different key. '''

        partial = partial or self.partial

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

            if actual is not None or not partial:
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
