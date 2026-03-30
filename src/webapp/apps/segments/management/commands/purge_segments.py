from django.core.management.base import BaseCommand

from apps.segments.models import Route, Segment, ChainUp


class Command(BaseCommand):
    def handle(self, *args, **options):
        Route.objects.all().delete()
        Segment.objects.all().delete()
        ChainUp.objects.all().delete()
