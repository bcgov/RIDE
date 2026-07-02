from django.core.management.base import BaseCommand

from apps.events.models import Event, Note


class Command(BaseCommand):
    def handle(self, *args, **options):
        events = Event.objects.all().iterator(chunk_size=100)
        for event_batch in events:
            event_batch.delete()

        notes = Note.objects.all().iterator(chunk_size=100)
        for note_batch in notes:
            note_batch.delete()
