from django.core.management.base import BaseCommand

from apps.segments.models import Area, Route, Segment


class Command(BaseCommand):
    help = 'Review or toggle flags on users identified by email address'

    def handle(self, *args, **options):
        Route.objects.all().delete()
        Segment.objects.all().delete()
        Area.objects.all().delete()
