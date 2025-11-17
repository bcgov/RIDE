import json
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError

from apps.events.models import Event, Note


class Command(BaseCommand):

    def handle(self, *args, **options):
        Event.objects.all().delete()
        Note.objects.all().delete()
