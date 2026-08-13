from django.core.management.base import BaseCommand

from apps.segments.models import ChainUp, Segment
from apps.shared.helpers import transform_road_abbreviations


def update_segment_names():
    for model in (Segment, ChainUp):
        for obj in model.objects.all():
            transformed_name = transform_road_abbreviations(obj.name)
            transformed_description = transform_road_abbreviations(obj.description)
            model.objects.filter(id=obj.id).update(
                name=transformed_name,
                description=transformed_description,
            )


class Command(BaseCommand):
    help = 'Expand road abbreviations in segment and chainup name/description fields'

    def handle(self, *args, **options):
        update_segment_names()
