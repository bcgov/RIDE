from django.shortcuts import render

from django.views import generic
from django.views.generic import edit
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

# from .forms import EventForm
from .models import Event, Note, TrafficImpact
from .serializers import EventSerializer, NoteSerializer, TrafficImpactSerializer


class Events(viewsets.ModelViewSet):
    queryset = Event.current.all()
    serializer_class = EventSerializer
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

# def home(request):

#     return render(request, 'events/home.html')


# class ListView(generic.ListView):
#     model = Event
#     template_name = 'events/list.html'
#     context_object_name = 'events'

#     def get_ordering(self):
#         ordering = self.request.GET.get('ordering', '-id')
#         return ordering

#     def get_paginate_by(self, queryset=...):
#         size = self.request.GET.get('size', 20)
#         return size


# class CreateView(edit.CreateView):
#     model = Event
#     form_class = EventForm
#     template_name = 'events/create.html'
#     success_url = '/events/{id}'


# class UpdateView(edit.UpdateView):
#     model = Event
#     form_class = EventForm
#     template_name = 'events/update.html'
#     success_url = '/events/{id}'
#     slug_field = 'id'
#     query_pk_and_slug = True
#     pk_url_kwarg = 'uuid'

#     def get_form_kwargs(self):
#         kwargs = super().get_form_kwargs()
#         kwargs['label_suffix'] = ''
#         return kwargs
