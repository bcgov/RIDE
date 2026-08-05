import csv
from datetime import date
from pprint import pprint
import re

from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection

from apps.organizations.models import ServiceArea
from apps.lki.models import Crossroad


def parse_hwy(hwy):
    letter = ''
    if hwy.isdigit():
        num = int(hwy)
    else:
        num = hwy[0:-1]
        letter = hwy[-1:]
    return (num, letter)

service_areas = {}

def load_service_areas():
    for area in ServiceArea.objects.filter(parent__isnull=False):
        service_areas[area.sortingOrder] = area

def get_service_area(name):
    sort_order = int(name[:2])
    return service_areas[sort_order]

pattern = re.compile(r'^Highway\s(\d{1,2})\s?([ABCD]?)\s?[E-Z]{0,2}')
def get_route(name):
    '''
    Return the name, standardized if it's a highway

    In the dataset, some highways have multiple names by including a trailing
    cardinal direction (e.g., 'Highway 6 NS').  Officially, highways may only
    have an ordinal letter after the number, which distinguishes a different
    highway (e.g., 'Highway 19' and 'Highway 19A' are separate highways).

    Standardizes the highway name by removing any non-ordinal characters.
    '''
    matches = pattern.match(name)
    if matches:
        return f'Highway {matches.group(1)}{matches.group(2)}'
    return name

class Command(BaseCommand):

    def handle(self, *args, **options):

        load_service_areas()

        Crossroad.objects.all().delete()
        with connection.cursor() as cursor:
            cursor.execute('ALTER SEQUENCE lki_crossroad_id_seq RESTART')

        with open(f'{settings.BASE_DIR}/samples/dit_reference_points.csv', encoding="utf-8-sig") as file:
            for row in csv.DictReader(file):
                try:
                    data = {
                        'service_area': get_service_area(row['service_area']),
                        'route': get_route(row['route']),
                        'km_from_start': float(row['km_from_start'].replace(',', '')),
                        'locality': row['locality'],
                        'name': row['name'],
                        'geometry': Point((float(row['longitude']),
                                           float(row['latitude'])),
                                          srid=4326),
                    }
                    Crossroad.objects.create(**data)

                except Exception as e:
                    print(e)
                    print(row)

        call_command('dumpdata',
                     'lki.Crossroad',
                     '-o', 'apps/lki/fixtures/crossroads.json',
                     '--indent', '4')
