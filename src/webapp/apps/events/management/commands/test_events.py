from pprint import pprint
from django.core.management.base import BaseCommand, CommandError

from apps.events.models import Event
from apps.events.serializers import EventSerializer
from apps.events.tests import e2


class Command(BaseCommand):

    def handle(self, *args, **options):
        e = EventSerializer(data=e2)
        if e.is_valid():
            ee = e.save()
            pprint(e.data)
        else:
            print(e.errors)


