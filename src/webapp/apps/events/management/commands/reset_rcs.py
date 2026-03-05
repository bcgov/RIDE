from django.core.management.base import BaseCommand

from apps.events.enums import EventType
from apps.events.models import Event


class Command(BaseCommand):
    def handle(self, *args, **options):
        Event.objects.filter(event_type=EventType.ROAD_CONDITION).delete()
