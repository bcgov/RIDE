from django.core.management.base import BaseCommand

from apps.events.models import Event


class Command(BaseCommand):
    def handle(self, *args, **options):
        for event in Event.current.filter(impacts__contains=[{"closed": True}]):
            try:
                event._update_tlids()
            except Exception as e:
                print(e)
                print(f'Error updating TLIDs for {event}')
