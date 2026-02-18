import json
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError

from apps.events.models import Event
from apps.events.serializers import EventSerializer
from apps.shared.models import VersionedModel
from apps.users.models import RIDEUser


class Command(BaseCommand):

    def handle(self, *args, **options):

        event = Event.last.get(id='DBC-100002')
        pprint(event.get_history())
