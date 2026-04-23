import logging

from datetime import datetime, timezone

from django.contrib.gis.geos import Point

from rest_framework import fields, serializers
from rest_framework.serializers import ModelSerializer
from rest_framework_gis.fields import GeometryField

from config.settings import EVENT_PREFIX
from .models import Event, Note, TrafficImpact, Condition
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

    def get_attribute(self, instance):
        notes_map = self.context.get('notes_map')
        if notes_map is not None:
            return notes_map.get(instance.id, [])
        
        return Note.current.filter(event=instance.id).order_by('-created')


class EventSerializer(KeyMoveSerializer):
    geometry = GeometryField()
    is_closure = fields.SerializerMethodField()
    last_inactivated = fields.SerializerMethodField()
    ongoing = fields.SerializerMethodField()
    notes = NotesListSerializer(required=False)
    segment = SegmentSerializer(required=False, allow_null=True)
    chainup = ChainUpSerializer(required=False, allow_null=True)

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
        closed_ids = self.context.get('closed_impact_ids')
        
        if closed_ids is None:
            ids = [impact['id'] for impact in (obj.impacts or []) if isinstance(impact, dict)]
            return TrafficImpact.objects.filter(id__in=ids, closed=True).exists()

        event_impact_ids = [impact['id'] for impact in (obj.impacts or []) if isinstance(impact, dict)]
        return any(impact_id in closed_ids for impact_id in event_impact_ids)

    def get_last_inactivated(self, obj):
        return obj.meta.get('last_inactivated')

    def get_ongoing(self, obj):
        if obj.start_time is not None and obj.end_time is None:
            return True

        return False

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
            if data.get('status') == 'Inactive':
                now = datetime.now(tz=timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
                data['meta']['last_inactivated'] = now

        data['approved'] = self.is_automatically_approved(data)

        coords = data.get('start', {}).get('coords')
        if coords is not None:
            try:
                point = Point(coords[0], coords[1])
                sa = ServiceArea.objects.filter(geometry__contains=point).first()
                if sa is not None:
                   data['service_area'] = sa.id
            except Exception as e:
                log.error(f'getting service area failed for coords {coords} for event {data.get('id')}')
                log.exception(e)

        return super().to_internal_value(data)

    def to_representation(self, instance):
        obj = super().to_representation(instance)
        conditions = obj.get('conditions') or []
        
        id_to_label = self.context.get('condition_labels')
        
        if id_to_label is None:
            condition_ids = [c if isinstance(c, int) else c.get('id') for c in conditions]
            id_to_label = dict(Condition.objects.filter(id__in=condition_ids).values_list('id', 'label'))

        normalized = []
        for condition in conditions:
            cid = condition if isinstance(condition, int) else condition.get('id')
            label = id_to_label.get(cid)
            if label:
                normalized.append({'id': cid, 'label': label})
        
        obj['conditions'] = normalized
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

    def get_latest_published_version(self, obj):
        latest = Event.current.filter(id=obj.id).first()
        return None if latest is None else latest.version

    def get_clearing(self, obj):
        if obj.status == 'Active':
            return False

        # is there an earlier version, approved or not, that was active?
        latest = Event.objects.filter(id=obj.id, status='Active').order_by('-version').first()
        if latest:
            return True

        return False


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
        obj = super().to_representation(instance)
        conditions = obj.get('conditions') or []
        
        id_to_label = self.context.get('condition_labels', {})

        normalized = []
        for condition in conditions:
            c_id = None
            c_label = None
            
            if isinstance(condition, int):
                c_id = condition
                c_label = id_to_label.get(c_id)
            elif isinstance(condition, dict):
                c_id = condition.get('id')
                c_label = condition.get('label') or id_to_label.get(c_id)

            if c_id and c_label:
                normalized.append({'id': c_id, 'label': c_label})
        
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
