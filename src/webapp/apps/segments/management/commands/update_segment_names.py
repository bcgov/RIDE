from django.core.management.base import BaseCommand

from apps.segments.models import Segment
from apps.shared.helpers import transform_road_abbreviations


def update_segment_names():
    for seg in Segment.objects.all():
        transformed_name = transform_road_abbreviations(seg.name)
        transformed_description = transform_road_abbreviations(seg.description)
        Segment.objects.filter(id=seg.id).update(name=transformed_name, description=transformed_description)


class Command(BaseCommand):
    def handle(self, *args, **options):
        update_segment_names()