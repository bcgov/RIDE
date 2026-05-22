import json

from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db.models import F, Q, Value
from django.shortcuts import render
import requests
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from . import models, serializers

intersection_types = ['A1', 'A2', 'A3', 'A5', 'A8', ]

other_types = [
    'B3', # 'B4',  gore points
    'D1',  # major structures
    'G6',  # forestry service roads
    'R1', 'R2',  # park access
    'S4',  # signage
    'Y1', 'Y3', 'Y4', # rest areas and POI
]

class Landmarks(viewsets.ReadOnlyModelViewSet):

    queryset = models.Landmark.objects.filter(
        Q(landmark_type__in=intersection_types,
          sourced_intersection__isnull=False)
        | Q(landmark_type__in=other_types)
    ).prefetch_related('segment__highways')
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


@api_view(['GET'])
def search(request):
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')
    term = request.query_params.get('term')

    if lat is None or lon is None or term is None:
        return Response({ 'detail': 'lat, lon and term are required arguments' },
                        status=status.HTTP_400_BAD_REQUEST)
    if len(term) < 4:
        return Response([])

    term = term.lower()
    pnt = Point((float(lon), float(lat)), srid=4326)

    results = []

    # geocoder intersections
    params = {
      'point': f'{lon},{lat}',
      'maxDistance': 10000,
      'outputSRS': 4326,
      'maxResults': 5,
      'minDegree': 3,
      'excludeUnits': True,
      'onlyCivic': True,
    }

    url = 'https://geocoder.api.gov.bc.ca/intersections/near.json'
    response = requests.get(url, params=params)
    for result in response.json()['features']:
        name = result.get('properties', {}).get('fullAddress', '')
        if term in name.lower():
            coords = result.get('geometry', {}).get('coordinates', [lon, lat])
            loc = Point((float(coords[0]), float(coords[1])), srid=4326)
            result['distance'] = pnt.distance(loc) * 1000
            result['id'] = f'intersection-{result['properties'].get('intersectionID')}'
            result['source'] = 'intersections'
            result['label'] = name
            results.append(result)

    # LKI results
    qs = models.Landmark.objects.filter(
        Q(landmark_type__in=intersection_types,
          sourced_intersection__isnull=False)
        | Q(landmark_type__in=other_types),
        geometry__distance_lte=(pnt, 10000)
    )
    qs = qs.filter(description__icontains=term)
    qs = qs.annotate(distance=Distance("geometry", pnt))
    qs = qs.order_by('distance')

    results += serializers.Landmark(qs, many=True).data
    return Response(results)
