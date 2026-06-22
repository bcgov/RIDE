import logging

from datetime import datetime, timezone
from functools import cached_property

from django.contrib.gis.geos import Point

from rest_framework import fields, serializers
from rest_framework.serializers import ModelSerializer

from config.settings import EVENT_PREFIX
from .models import Event, Note, TrafficImpact, Condition
from .permissions import coords_from_start, get_user_service_areas
from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, ChainUp
from apps.segments.serializers import SegmentSerializer, ChainUpSerializer
from apps.shared.serializers import HistorySerializer, KeyMoveSerializer, UserSerializer, VersionSerializer

log = logging.getLogger('debug')


class NoteSerializer(VersionSerializer):

    class Meta:
        model = Note
        fields = '__all__'

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

    def _event_ids_for_prefetch(self):
        # Should only be used in EventSerializer
        parent = self.parent
        if parent is None:
            return []

        # Return list of event IDs in list serializer, i.e., Events Viewset
        list_serializer = parent.parent
        if list_serializer is not None and getattr(list_serializer, 'many', False):
            iterable = list_serializer.instance
            if iterable is None:
                return []

            if hasattr(iterable, 'values_list'):
                return list(iterable.values_list('id', flat=True).distinct())

            return list({obj.id for obj in iterable})

        # Return single ID if not serializing list
        if parent.instance is not None:
            return [parent.instance.id]

        # Empty fallback
        return []

    @cached_property
    def _notes_by_event(self):
        event_ids = self._event_ids_for_prefetch()
        if not event_ids:
            return {}

        notes = (
            Note.current.filter(event__in=event_ids)
            .select_related('user')
            .order_by('-created')
        )
        by_event = {}
        for note in notes:
            by_event.setdefault(note.event, []).append(note)

        return by_event

    def get_attribute(self, instance):
        return self._notes_by_event.get(instance.id, [])


class EventSerializer(KeyMoveSerializer):
    is_closure = fields.SerializerMethodField()
    ongoing = fields.SerializerMethodField()
    notes = NotesListSerializer(required=False)
    segment = SegmentSerializer(required=False, allow_null=True)
    chainup = ChainUpSerializer(required=False, allow_null=True)
    description = fields.SerializerMethodField()
    ivr = fields.SerializerMethodField()

    class Meta:
        model = Event
        # 'polygon' in to_representation; only for road conditions
        exclude = ['deleted', 'polygon']
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
        return any([impact.get('closed', False) for impact in obj.impacts])

    def get_ongoing(self, obj):
        if obj.start_time is not None and obj.end_time is None:
            return True

        return False

    @cached_property
    def _editable_areas(self):
        '''
        Resolve the requesting user's editable service areas once per request to avoid repetition
        '''
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None

        allowed_area_geometries = (
            get_user_service_areas(user)
            .exclude(geometry=None)
            .values_list('geometry', flat=True)
        )

        return [geometry.prepared for geometry in allowed_area_geometries]

    def get_description(self, obj):
        return obj.description

    def get_ivr(self, obj):
        return obj.ivr

    def to_internal_value(self, data):
        request = self.context.get("request")
        if self.instance and request and hasattr(request, "user"):
            self.instance.user = request.user

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

            if data.get('status') == 'Inactive' and self.instance and self.instance.status == 'Active':
                data['last_inactivated'] = datetime.now(tz=timezone.utc)
            elif data.get('status') == 'Active' and self.instance and self.instance.status == 'Inactive':
                data['last_inactivated'] = None

        data['approved'] = self.is_automatically_approved(data)

        coords = data.get('start', {}).get('coords')
        if coords is not None:
            try:
                point = Point(coords[0], coords[1])
                sa = ServiceArea.objects.filter(parent__isnull=False,
                                                geometry__contains=point).first()
                if sa is not None:
                    data['service_area'] = sa.id
            except Exception as e:
                log.error(f'getting service area failed for coords {coords} for event {data.get('id')}')
                log.exception(e)

        return super().to_internal_value(data)

    def to_representation(self, instance):
        obj = super().to_representation(instance)

        # have to remove meta here to avoid sending it, rather than as an
        # excluded field, because otherwise meta doesn't get populated on the
        # way in through key movement and to_internal_value()
        if 'meta' in obj:
            del obj['meta']

        if obj.get('type') == 'ROAD_CONDITION':
            if instance.segment:
                obj['location']['start']['name'] = instance.segment.name

            obj['polygon'] = instance.polygon

        else:
            # Only serialize polygon/segment for road conditions
            if 'polygon' in obj:
                del obj['polygon']

            if 'segment' in obj:
                del obj['segment']

        # Only serialize chainup for chainups
        if obj.get('type') != 'CHAIN_UP' and 'chainup' in obj:
            del obj['chainup']

        return obj

    def is_automatically_approved(self, data):
        '''
        Return whether or not the data allows for automatic approval.

        If the severity of the event is major, or the event impacts include a
        closure, approval is not automatic unless the person submitting it is
        an approver.

        Where the submission does not include the impacts or severity, the
        current values for the instance are used if an instance exists.

        When an event had an impact with closure, and the update removes that
        impact, approval is still required.
        '''

        impacts = data.get('impacts')
        severity = data.get('severity')
        currently_major = False
        was_closure = False

        if self.instance is not None:
            if severity is None:
                severity = self.instance.severity

            prior_impacts = self.instance.impacts
            # need to detect a change from closure to non closure due to
            # removing an impact triggering closure
            was_closure = len([el for el in (prior_impacts or []) if el.get('closed', False)]) > 0

            if impacts is None:
                impacts = prior_impacts

            currently_major = self.instance.severity == 'Major'

        is_closure = was_closure or len([el for el in (impacts or []) if el.get('closed', False)]) > 0

        if severity == 'Minor' and not is_closure and not currently_major:
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
            return f'{EVENT_PREFIX}-100000'
        else:
            return f'{EVENT_PREFIX}-{int(event.id.split('-')[-1]) + 1}'


class EventHistorySerializer(EventSerializer, HistorySerializer):
    pass


class EventDiffSerializer(EventSerializer, HistorySerializer):
    class Meta:
        model = Event
        fields=['version', 'diff']
        keys_to_move = {}


class PendingSerializer(EventSerializer):

    latest_published_version = serializers.SerializerMethodField()
    clearing = serializers.SerializerMethodField()

    @cached_property
    def _batched_queries(self):
        '''
        Fetch and cache querysets in memory to prevent repeated queries from each instance
        '''

        # When serializing a list, the loaded objects live on the parent
        # ListSerializer; for a single object they live on this serializer.
        instances = self.parent.instance if self.parent is not None else self.instance
        if instances is None:
            return {}, set()

        # make single event instance iterable for logic below
        if not hasattr(instances, '__iter__'):
            instances = [instances]

        ids = {obj.id for obj in instances}
        if not ids:
            return {}, set()

        published_versions = dict(
            Event.current.filter(id__in=ids).values_list('id', 'version')
        )
        active_event_ids = set(
            Event.objects.filter(id__in=ids, status='Active').values_list('id', flat=True)
        )
        return published_versions, active_event_ids

    def get_latest_published_version(self, obj):
        published_versions = self._batched_queries[0]
        return published_versions.get(obj.id)

    def get_clearing(self, obj):
        if obj.status == 'Active':
            return False

        # is there an earlier version, approved or not, that was active?
        active_event_ids = self._batched_queries[1]
        return obj.id in active_event_ids


class TrafficImpactSerializer(ModelSerializer):

    class Meta:
        model = TrafficImpact
        fields = ['id', 'label', 'order', 'closed']


class ConditionSerializer(ModelSerializer):
    class Meta:
        model = Condition
        fields = "__all__"


class ChainUpEventSerializer(EventSerializer):
    chainup = serializers.PrimaryKeyRelatedField(queryset=ChainUp.objects.all(), required=False, allow_null=True)
    first_reported = serializers.SerializerMethodField()

    def get_first_reported(self, obj):
        first_approved_event = Event.objects.filter(approved=True, id=obj.id).order_by('version').first()
        return {
            'user': UserSerializer(first_approved_event.user).data if first_approved_event and first_approved_event.user else None,
            'date': first_approved_event.created if first_approved_event else None,
        }

    class Meta:
        model = Event
        fields = "__all__"
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


class RcSerializer(EventSerializer):
    segment = serializers.PrimaryKeyRelatedField(
        queryset=Segment.objects.all(),
        required=False,
        allow_null=True,
    )

    first_reported = serializers.SerializerMethodField()

    def get_first_reported(self, obj):
        first_approved_event = Event.objects.filter(approved=True, id=obj.id).order_by('version').first()
        return {
            'user': UserSerializer(first_approved_event.user).data,
            'date': first_approved_event.created,
        }

    def to_representation(self, instance):
        """Override to normalize conditions to {id, label} objects."""
        obj = super().to_representation(instance)

        conditions = obj.get('conditions') or []
        if conditions:
            condition_ids = [
                condition for condition in conditions
                if isinstance(condition, int)
            ]
            condition_ids.extend([
                condition.get('id') for condition in conditions
                if isinstance(condition, dict) and isinstance(condition.get('id'), int)
            ])
            id_to_label = dict(
                Condition.objects.filter(id__in=condition_ids).values_list('id', 'label')
            )
            normalized = []
            for condition in conditions:
                if isinstance(condition, int):
                    label = id_to_label.get(condition)
                    if label is not None:
                        normalized.append({'id': condition, 'label': label})
                elif isinstance(condition, dict):
                    condition_id = condition.get('id')
                    if isinstance(condition_id, int):
                        normalized.append({
                            'id': condition_id,
                            'label': condition.get('label') or id_to_label.get(condition_id),
                        })
            obj['conditions'] = normalized

        return obj

    class Meta:
        model = Event
        fields = "__all__"
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
