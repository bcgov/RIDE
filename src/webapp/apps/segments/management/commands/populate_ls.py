import requests
from django.contrib.gis.geos import LineString, Point
from django.core.management.base import BaseCommand

from apps.segments.models import Segment
from config.settings import ROUTE_PLANNER_API_URL, ROUTE_PLANNER_API_KEY


def truncate(f, n):
    '''Truncates/pads a float f to n decimal places without rounding'''
    s = '{}'.format(f)
    if 'e' in s or 'E' in s:
        return '{0:.{1}f}'.format(f, n)
    i, _, d = s.partition('.')
    return '.'.join([i, (d+'0'*n)[:n]])


class Command(BaseCommand):
    def handle(self, *args, **options):
        seg = Segment.objects.get(id=449)
        seg.secondary_point = Point(-117.29974, 48.99999)
        seg.save()

        url = ROUTE_PLANNER_API_URL + '/directions.json'

        # iterate through segments and populate geometry via routing API
        failed = []
        for segment in Segment.objects.all():
        # for segment in Segment.objects.filter(id__in=failed):
            params = {
                'apikey': ROUTE_PLANNER_API_KEY,
                'points': str(truncate(segment.primary_point.coords[0], 6)) + ',' + str(truncate(segment.primary_point.coords[1], 6)) + ',' +
                            str(truncate(segment.secondary_point.coords[0], 6)) + ',' + str(truncate(segment.secondary_point.coords[1], 6)),
                'criteria': 'fastest',
                "enable": "gdf,ldf,tr,xc,tc,",
                "gdf": "freeway:1,local:1,yield_lane:1,collector_major:1,collector_minor:1,ferry:1,arterial_minor:1,lane:1,arterial_major:1,resource:1.3,ramp:1,recreation:1.2,highway_major:1,strata:1,highway_minor:1,driveway:1,restricted:1.2,service:1.2,alleyway:1,",
                "xingCost": "3.0,10.0,7.0,1.2",
                "turnCost": "3.0,1.0",
                "simplifyThreshold": "250",
                "departure": "2025-12-23T14:03:00-08:00",
                "correctSide": "false",
                "roundTrip": "false"
            }

            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if 'route' in data and len(data['route']) > 1:
                    segment.geometry = LineString(data['route'])
                    segment.save()

                else:
                    failed.append(segment.id)
                    self.stdout.write(self.style.WARNING(f'No routes found for Segment ID {segment.id}'))
            else:
                failed.append(segment.id)
                self.stdout.write(self.style.ERROR(f'Failed to fetch route for Segment ID {segment.id}: {response.status_code}'))
