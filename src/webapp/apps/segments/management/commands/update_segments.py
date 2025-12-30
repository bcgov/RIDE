from django.core.management.base import BaseCommand
from django.utils.timezone import now

from apps.segments.models import Segment


class Command(BaseCommand):
    def handle(self, *args, **options):
        Segment.objects.all().update(last_updated=now())
