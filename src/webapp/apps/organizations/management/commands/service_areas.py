from pprint import pprint
# from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
import json
from django.contrib.gis.geos import GEOSGeometry

from apps.organizations.models import ServiceArea

CHECK = {
  "1": (1, 29, 48),
  "3": (3, 4, 50),
  "4": (4, 5, 50),
  "5": (5, 6, 50),
  "6": (6, 7, 50),
  "8": (8, 1, 46),
  "9": (9, 2, 46),
  "10": (10, 3, 46),
  "12": (12, 11, 47),
  "13": (13, 12, 47),
  "15": (15, 9, 44),
  "16": (16, 10, 44),
  "18": (18, 8, 41),
  "19": (19, 13, 41),
  "21": (21, 14, 42),
  "22": (22, 15, 42),
  "24": (24, 16, 48),
  "25": (25, 17, 48),
  "26": (26, 18, 48),
  "28": (28, 21, 51),
  "29": (29, 22, 51),
  "31": (31, 19, 45),
  "32": (32, 20, 45),
  "33": (33, 23, 45),
  "35": (35, 24, 43),
  "36": (36, 25, 43),
  "37": (37, 28, 43),
  "39": (39, 26, 49),
  "40": (40, 27, 49),
  "41": (41, 5, None),
  "42": (42, 6, None),
  "43": (43, 10, None),
  "44": (44, 4, None),
  "45": (45, 9, None),
  "46": (46, 2, None),
  "47": (47, 3, None),
  "48": (48, 7, None),
  "49": (49, 11, None),
  "50": (50, 1, None),
  "51": (51, 8, None),
}

class Command(BaseCommand):
    help = 'Review or toggle flags on users identified by email address'

    def handle(self, *args, **options):

        with open('../../samples/service areas.json') as file:
            areas = json.load(file)

        ServiceArea.objects.all().delete()

        sa = {}

        for area in areas['features']:
            parent = area.get('parent')

            check = CHECK[str(area['id'])]

            if parent is not None:
                if parent != check[2]:
                    print(parent, check[2])
                parent = sa[str(parent)]

            sorting_order = area['properties']['OBJECTID']
            if sorting_order != check[1]:
                print(sorting_order, check[1])

            name = area['properties']['CONTRACT_AREA_NAME']
            area['geometry']['crs'] = 3005

            g = GEOSGeometry(json.dumps(area['geometry']), srid=3005)
            g.transform(4326)
            sa[str(area['id'])] = ServiceArea.objects.create(id=area['id'], name=name, sortingOrder=sorting_order, geometry=g.json, parent=parent)
