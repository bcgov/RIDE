import json
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from apps.events.models import Event, Condition
from apps.events.serializers import EventSerializer, EventHistorySerializer, EventDiffSerializer, ConditionSerializer
from apps.organizations.models import ServiceArea
from apps.segments.models import Segment, ChainUp
from apps.users.permissions import Approver
from .enums import EventType
from .helpers import get_default_next_update, get_chainup_next_update
from .models import Note, TrafficImpact
from .serializers import NoteSerializer, PendingSerializer, RcSerializer, ChainUpEventSerializer
from .serializers import TrafficImpactSerializer


class Events(viewsets.ModelViewSet):
    queryset = Event.last.all().select_related(
        'user',
        'segment__route',
        'chainup__route',
        'chainup__area',
        'service_area', 
    ).prefetch_related(
        'service_area__parent', 
        'chainup__area__parent',
    )
    serializer_class = EventSerializer
    lookup_field = 'id'
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        
        if self.action in ['list', 'retrieve', 'history', 'diffs', 'toggle', 'clear', 'confirm']:
            try:
                if self.detail:
                    event_ids = [self.kwargs.get('id')]
                else:
                    queryset = self.filter_queryset(self.get_queryset())
                    event_ids = list(queryset.values_list('id', flat=True))

                first_versions = Event.objects.filter(
                    id__in=event_ids, 
                    approved=True
                ).order_by('id', 'version').distinct('id').select_related('user')
                
                context['first_reported_map'] = {
                    v.id: {'user': v.user, 'created': v.created} 
                    for v in first_versions
                }

                notes_qs = Note.current.filter(event__in=event_ids).order_by('-created')
                notes_map = {}
                for note in notes_qs:
                    if note.event not in notes_map:
                        notes_map[note.event] = []
                    notes_map[note.event].append(note)
                context['notes_map'] = notes_map

            except Exception:
                context['first_reported_map'] = {}
                context['notes_map'] = {}

            context['closed_impact_ids'] = set(
                TrafficImpact.objects.filter(closed=True).values_list('id', flat=True)
            )

            context['condition_labels'] = dict(
                Condition.objects.values_list('id', 'label')
            )

        return context

    @action(detail=True)
    def history(self, request, id):
        event = self.get_object()
        queryset = Event.objects.filter(id=event.id)
        serializer = EventHistorySerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=True)
    def diffs(self, request, id):
        event = self.get_object()
        queryset = Event.objects.filter(id=event.id)
        serializer = EventDiffSerializer(queryset, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)


def validate_allowed_segments(user, segPks):
    if user.is_superuser:
        return True

    user_orgs = user.organizations.all()
    user_areas = ServiceArea.objects.filter(organizations__in=user_orgs)
    segment_ids = set()
    for seg_ids_list in user_areas.values_list('segments', flat=True):
        if seg_ids_list:
            segment_ids.update(seg_ids_list)

    allowed_seg_pks = Segment.current.filter(id__in=segment_ids).values_list('pk', flat=True)
    for pk in segPks:
        if pk not in [str(uuid) for uuid in allowed_seg_pks]:
            return False

    return True


class RoadConditions(Events):
    queryset = Event.current.filter(event_type=EventType.ROAD_CONDITION, from_bulk=True).select_related(
        'user',
        'segment__route',
        'service_area',
    ).prefetch_related(
        'service_area__parent',
    )
    serializer_class = RcSerializer

    @action(detail=False, methods=['post'], url_path='clear')
    def clear_rcs(self, request):
        segPks = request.data.get('segPks', [])
        if not isinstance(segPks, list):
            return Response({'error': 'segPks must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        if not validate_allowed_segments(request.user, segPks):
            return Response(
                {'error': 'unauthorized', 'detail': 'Segment outside your service area.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        cleared_events = []
        existing_events = Event.current.filter(segment_id__in=segPks)
        for event in existing_events:
            event.status = 'Inactive'
            event.save()
            cleared_events.append(RcSerializer(event, context=self.get_serializer_context()).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': cleared_events}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='confirm')
    def confirm_rcs(self, request):
        segPks = request.data.get('segPks', [])
        if not isinstance(segPks, list):
            return Response({'error': 'segPks must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        if not validate_allowed_segments(request.user, segPks):
            return Response(
                {'error': 'unauthorized', 'detail': 'Segment outside your service area.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        confirmed_events = []
        existing_events = Event.current.filter(segment_id__in=segPks)
        for event in existing_events:
            event.next_update = get_default_next_update()
            event.user = request.user
            event.save()
            confirmed_events.append(RcSerializer(event).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': confirmed_events}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='bulk_update')
    def bulk_update_rcs(self, request):
        segPks = request.data.get('segPks', [])
        event_data = request.data.get('eventData', {})
        if not isinstance(segPks, list) or not isinstance(event_data, dict):
            return Response({'error': 'invalid segment_pks or event_data'}, status=status.HTTP_400_BAD_REQUEST)

        if not validate_allowed_segments(request.user, segPks):
            return Response(
                {'error': 'unauthorized', 'detail': 'Segment outside your service area.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        updated_events = []
        for seg_pk in segPks:
            try:
                segment = Segment.objects.get(uuid=seg_pk)

                existing_event = Event.objects.filter(segment=segment, event_type=EventType.ROAD_CONDITION, latest=True, status='Active').first()

                # Convert segment geometry to GeoJSON format
                geometry_geojson = None
                if segment.geometry:
                    # Create GeoJSON GeometryCollection with the segment's LineString
                    geometry_geojson = {
                        'type': 'GeometryCollection',
                        'geometries': [
                            json.loads(segment.geometry.json)  # Convert LineString to GeoJSON
                        ]
                    }

                default_event_data = {
                    'id': existing_event.id if existing_event else None,
                    'conditions': event_data.get('conditions', []),
                    'segment': seg_pk,
                    'geometry': geometry_geojson,
                    'location': {
                        'start': {'coords': segment.primary_point.coords},
                        'end': {'coords': segment.secondary_point.coords} if segment.secondary_point else None
                    },
                    'status': 'Active',
                    'meta': {},  # Ensure meta is always a dict
                }

                merged_data = {**event_data, **default_event_data}

                # Use RcSerializer to validate and save
                # The serializer will handle user via CurrentUserDefault() and meta via default
                serializer = RcSerializer(
                    instance=existing_event,
                    data=merged_data,
                    context={'request': request}
                )

                if serializer.is_valid():
                    event = serializer.save()
                    updated_events.append(RcSerializer(event, context={'request': request}).data)
                else:
                    # Log validation errors for debugging
                    print(f"Validation errors for segment {seg_pk}: {serializer.errors}")
                    continue

            except Segment.DoesNotExist:
                # Skip segments that don't exist
                continue

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': updated_events}, status=status.HTTP_202_ACCEPTED)


class ChainUps(Events):
    queryset = Event.current.filter(event_type=EventType.CHAIN_UP, from_bulk=True).select_related(
        'user',
        'chainup__route',
        'chainup__area',
    ).prefetch_related(
        'chainup__area__parent',
    )
    serializer_class = ChainUpEventSerializer
    permission_classes = [Approver]

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_chainups(self, request):
        chainupPks = request.data.get('chainupPks', [])
        event_data = request.data.get('eventData', {})
        if not isinstance(chainupPks, list) or not isinstance(event_data, dict):
            return Response({'error': 'invalid chainupPks or eventData'}, status=status.HTTP_400_BAD_REQUEST)

        toggled_events = []
        for chainup_pk in chainupPks:
            try:
                chainup = ChainUp.objects.get(uuid=chainup_pk)
                existing_event = Event.objects.filter(chainup=chainup, event_type=EventType.CHAIN_UP, latest=True).order_by('-created').first()

                next_status = 'Inactive' if existing_event and existing_event.status == 'Active' else 'Active'

                geometry_geojson = None
                if chainup.geometry:
                    geometry_geojson = {
                        'type': 'GeometryCollection',
                        'geometries': [json.loads(chainup.geometry.json)]
                    }

                default_event_data = {
                    'id': existing_event.id if existing_event and next_status == 'Inactive' else None,
                    'type': EventType.CHAIN_UP.value,
                    'chainup': chainup_pk,
                    'geometry': geometry_geojson,
                    'location': {
                        'start': {'coords': chainup.primary_point.coords},
                        'end': {'coords': chainup.secondary_point.coords} if chainup.secondary_point else None
                    },
                    'status': next_status,
                    'meta': {},
                }

                merged_data = {**event_data, **default_event_data}
                merged_data.setdefault('timing', {})
                merged_data['timing']['nextUpdate'] = (
                    get_chainup_next_update().isoformat() if next_status == 'Active' else None
                )

                # Convert to JSON string and back to dict to ensure proper serialization
                merged_data = json.loads(json.dumps(merged_data, cls=DjangoJSONEncoder))

                serializer = ChainUpEventSerializer(
                    instance=existing_event if existing_event and next_status == 'Inactive' else None,
                    data=merged_data,
                    context={'request': request}
                )

                if serializer.is_valid():
                    event = serializer.save()
                    toggled_events.append(ChainUpEventSerializer(event, context={'request': request}).data)
                else:
                    # Log validation errors for debugging
                    print(f"Validation errors for chainup {chainup_pk}: {serializer.errors}")

            except ChainUp.DoesNotExist:
                continue

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': toggled_events}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='reconfirm')
    def reconfirm_chainups(self, request):
        chainupPks = request.data.get('chainupPks', [])
        if not isinstance(chainupPks, list):
            return Response({'error': 'chainupPks must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        reconfirmed_events = []
        existing_events = Event.current.filter(chainup_id__in=chainupPks, event_type=EventType.CHAIN_UP)
        for event in existing_events:
            if event.status != 'Active':
                continue
            event.next_update = get_chainup_next_update()
            event.user = request.user
            event.save()
            reconfirmed_events.append(ChainUpEventSerializer(event, context={'request': request}).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': reconfirmed_events}, status=status.HTTP_202_ACCEPTED)


class Pending(viewsets.ModelViewSet):
    queryset = Event.pending.all().select_related(
        'user',
        'segment__route',
        'chainup__route',
        'chainup__area',
    ).prefetch_related(
        'service_area',
        'service_area__parent',
        'chainup__area__parent',
    )
    serializer_class = PendingSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]


class Notes(viewsets.ModelViewSet):
    queryset = Note.current.all()
    serializer_class = NoteSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]


class TrafficImpacts(viewsets.ModelViewSet):

    queryset = TrafficImpact.objects.filter(deleted=False)
    serializer_class = TrafficImpactSerializer
    lookup_field = 'id'


class Conditions(viewsets.ModelViewSet):
    queryset = Condition.objects.all()
    serializer_class = ConditionSerializer
