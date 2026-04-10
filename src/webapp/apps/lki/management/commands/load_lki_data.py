import csv
from datetime import date
from pprint import pprint

from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand, CommandError

from apps.lki.models import Highway, LandmarkType, ClassCategory, Changelog, LatLonSource
from apps.lki.models import ClassCharacteristic, Segment, SegmentArea, SegmentClass
from apps.lki.models import Landmark, Intersection
from apps.organizations.models import ServiceArea

def parse_date(st):
    try:
        st = st.split('/')
        return date(int(st[2]), int(st[1]), int(st[0]))
    except:
        return None

def parse_boolean(b):
    if b == 'TRUE':
        return True
    elif b == 'FALSE':
        return False

    return None

def parse_hwy(hwy):
    letter = ''
    if hwy.isdigit():
        num = int(hwy)
    else:
        num = hwy[0:-1]
        letter = hwy[-1:]
    return (num, letter)

def post_segment(row, obj):
    for name in ['hwy1', 'hwy2', 'hwy3']:
        val = row.get(name)
        del row[name]
        if val == '': continue
        num, letter = parse_hwy(val)
        highway = Highway.objects.get(number=num, letter=letter)
        obj.highways.add(highway)

def pre_landmark(row):
    row['geometry'] = Point((row['longitude'], row['latitude']), srid=4326)

def pre_landmark_intersection(row):
    row['intersection'].landmarks.add(row['landmark'])

FILES = {
    'HIGHWAY': {
        'convert': [('number', int)],
        'model': Highway,
    },
    'LANDMARK_TYPES': {
        'convert': [],
        'model': LandmarkType,
    },
    'CLASS_CATEGORY': {
        'convert': [('number', int), ('version', int)],
        'model': ClassCategory,
    },
    'CHANGELOG': {
        'convert': [('changed', parse_date)],
        'model': Changelog,
    },
    'LATLON_SOURCE': {
        'convert': [('id', int)],
        'model': LatLonSource,
    },

    'CLASS_CHARACTERISTIC': {
        'convert': [('number', int), ('version', int), ('category', int)],
        'model': ClassCharacteristic,
        'keys': [('category', ClassCategory, 'number')],
    },
    'SEGMENT': {
        'convert': [
            ('search_sequence', int), ('report_sequence', int),
            ('length', float), ('revised', parse_date), ('effective', parse_date),
            ('created', parse_date), ('road_added', parse_date),
            ('devolved', parse_date), ('begin_km', float), ('end_km', float),
            ('nway', int), ('km_year', int),
        ],
        'model': Segment,
        'remove': ['hwy1', 'hwy2', 'hwy3'],
        'post': post_segment,
    },
    'SEGAREA': {
        'convert': [('area', int), ('start', float), ('end', float)],
        'model': SegmentArea,
        'keys': [('segment', Segment, 'id'), ('area', ServiceArea, 'sortingOrder', {'parent__isnull': False})],
    },
    'SEGCLASS': {
        'convert': [('category', int), ('from_date', parse_date), ('to_date', parse_date), ('start', float), ('end', float)],
        'model': SegmentClass,
        'keys': [('segment', Segment, 'id'),
                 ('category', ClassCategory, 'number'),
                 ('characteristic', ClassCharacteristic, 'code',
                  {'category': lambda row: row['category']})
                 ],
    },
    'LANDMARK': {
        'convert': [('km', float), ('number', int), ('source', int),
                    ('latitude', float), ('longitude', float), ('km_post', float)],
        'model': Landmark,
        'keys': [('segment', Segment, 'id'),
                 ('landmark_type', LandmarkType, 'code'),
                 ('source', LatLonSource, 'id'),
                 ],
        'remove': ['latitude', 'longitude'],
        'pre': pre_landmark,
    },
    'INTERSECTION': {
        'convert': [('legs', int), ('legs_confirmed', parse_boolean), ('landmark', int), ('year_signalized', int)],
        'model': Intersection,
        'keys': [('landmark', Landmark, 'id')],
    },
    'LANDMARK_INTERSECTION': {
        'convert': [('landmark', int), ('intersection', int)],
        'keys': [('landmark', Landmark, 'id'), ('intersection', Intersection, 'id')],
        'pre': pre_landmark_intersection,
    },
}

class Command(BaseCommand):

    def handle(self, *args, **options):

        terms = {
            'landmark_type__in': [
                # 'A1', 'A2', 'A3', 'A4', 'A8',  # intersections
                'D1',  # major structures
                'S1', 'S2', 'S3', 'S4',  # signage
                'Y1', 'Y3', 'Y4', # rest areas and POI
            ]
        }
        print(Landmark.objects.count())
        print(Landmark.objects.filter(**terms).count())
        print(Intersection.objects.count())

    def load(self):
        for key in FILES.keys():
            with open(f'{settings.BASE_DIR}/samples/lki_bc_202507.xlsx - {key}.csv', encoding="utf-8") as file:
                print(f'{settings.BASE_DIR}/samples/lki_bc_202507.xlsx - {key}.csv')
                reader = csv.DictReader(file)
                obj = FILES[key]
                for row in reader:
                    try:
                        # convert string values from CSV to other type
                        for field in obj['convert']:
                            if row[field[0]] == '':
                                row[field[0]] = None
                            else:
                                row[field[0]] = field[1](row[field[0]])

                        # replace foreign key IDs with the object
                        for field in obj.get('keys', []):
                            lookup = {}
                            if len(field) > 3:
                                lookup = field[3].copy()
                                for key, value in lookup.items():
                                    if callable(value):
                                        lookup[key] = value(row)
                            lookup[field[2]] = row[field[0]]
                            fk = field[1].objects.get(**lookup)
                            row[field[0]] = fk

                        # run code on the row before creating object
                        obj.get('pre', lambda a: None)(row)

                        # remove csv colums not used by object
                        row2 = row.copy()
                        for field in obj.get('remove', []):
                            del row[field]

                        # create object in db
                        if 'model' in obj:
                            mod = obj['model'].objects.update_or_create(**row)
                            # run code on row and object (e.g., for adding m2m relations)
                            obj.get('post', lambda a, b: None)(row2, mod[0])
                    except Exception as e:
                        print(e)
                        print(row)
