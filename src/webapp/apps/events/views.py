import json
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.events.models import Event, Condition
from apps.events.serializers import EventSerializer, ConditionSerializer
from apps.segments.models import Segment
from .enums import EventType
from .helpers import get_default_next_update
from .models import Note, TrafficImpact
from .serializers import NoteSerializer, PendingSerializer, RcSerializer
from .serializers import TrafficImpactSerializer


class Events(viewsets.ModelViewSet):
    queryset = Event.last.all()
    serializer_class = EventSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]


class RoadConditions(Events):
    queryset = Event.current.filter(event_type=EventType.ROAD_CONDITION)
    serializer_class = RcSerializer

    @action(detail=False, methods=['post'], url_path='clear')
    def clear_rcs(self, request):
        segPks = request.data.get('segPks', [])
        if not isinstance(segPks, list):
            return Response({'error': 'segPks must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        cleared_events = []
        existing_events = Event.current.filter(segment_id__in=segPks)
        for event in existing_events:
            event.status = 'Inactive'
            event.save()
            cleared_events.append(RcSerializer(event).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': cleared_events}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='confirm')
    def confirm_rcs(self, request):
        segPks = request.data.get('segPks', [])
        if not isinstance(segPks, list):
            return Response({'error': 'segPks must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        confirmed_events = []
        existing_events = Event.current.filter(segment_id__in=segPks)
        for event in existing_events:
            event.next_update = get_default_next_update()
            event.save()
            confirmed_events.append(RcSerializer(event).data)

        return Response({'status': status.HTTP_202_ACCEPTED, 'data': confirmed_events}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'], url_path='bulk_update')
    def bulk_update_rcs(self, request):
        segment_pks = request.data.get('segPks', [])
        event_data = request.data.get('eventData', {})
        if not isinstance(segment_pks, list) or not isinstance(event_data, dict):
            return Response({'error': 'invalid segment_pks or event_data'}, status=status.HTTP_400_BAD_REQUEST)

        updated_events = []
        for seg_pk in segment_pks:
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
                    'conditions': [c['id'] for c in event_data['conditions']],
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


class Pending(viewsets.ModelViewSet):
    queryset = Event.pending.all()
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
