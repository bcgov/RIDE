from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db.models import F, Q
from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny

from . import models, serializers

intersection_types = ['A1', 'A2', 'A3', 'A5', 'A8', ]

other_types = [
    # 'D1',  # major structures
    'S4',  # signage
    # 'Y1', 'Y3', 'Y4', # rest areas and POI
]

class Landmarks(viewsets.ReadOnlyModelViewSet):

    queryset = models.Landmark.objects.filter(
        Q(landmark_type__in=intersection_types,
          sourced_intersection__isnull=False)
        | Q(landmark_type__in=other_types)
    )
    serializer_class = serializers.Landmark
    lookup_field = 'id'
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        lat = self.request.query_params.get('lat')
        lon = self.request.query_params.get('lon')
        if lat is not None and lon is not None:
            pnt = Point((float(lon), float(lat)), srid=4326)
            return queryset.filter(geometry__distance_lte=(pnt, 10000)) \
                .annotate(distance=Distance("geometry", pnt)) \
                .order_by('distance')
        return queryset