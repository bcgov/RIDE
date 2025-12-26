from django.shortcuts import render

from django.views import generic
from django.views.generic import edit
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, Note, TrafficImpact
from .serializers import EventSerializer, NoteSerializer, PendingSerializer
from .serializers import TrafficImpactSerializer


class Events(viewsets.ModelViewSet):
    queryset = Event.last.all()
    serializer_class = EventSerializer
    lookup_field = 'id'
    permission_classes = [IsAuthenticated]


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

