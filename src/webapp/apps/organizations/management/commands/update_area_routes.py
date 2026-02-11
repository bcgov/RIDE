from django.core.management.base import BaseCommand

from apps.organizations.models import ServiceArea
from apps.segments.models import Segment


class Command(BaseCommand):
    help = 'Update the routes list on each ServiceArea from its segments'

    def handle(self, *args, **options):
        for sa in ServiceArea.objects.all():
            if not sa.segments:
                continue

            segment_ids = [str(sid) for sid in sa.segments]
            route_ids = list(
                Segment.objects.filter(id__in=segment_ids, latest=True)
                .values_list('route_id', flat=True)
                .distinct()
            )
            sa.routes = sorted(route_ids)
            sa.save()
