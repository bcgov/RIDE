import json
import logging
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIRequestFactory

from apps.events.serializers import EventSerializer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        path = Path(__file__).parent / 'event.json'
        with path.open() as f:
            data = json.load(f)

        for geom in data.get('geometry', {}).get('geometries', []):
            if geom.get('type') == 'Linestring':
                geom['type'] = 'LineString'

        user = get_user_model().objects.filter(is_superuser=True).first()
        if user is None:
            user = get_user_model().objects.first()
        if user is None:
            raise CommandError('No users found; create a user before running this command.')

        request = APIRequestFactory().post('/')
        request.user = user

        serializer = EventSerializer(data=data, context={'request': request})
        if not serializer.is_valid():
            raise CommandError(serializer.errors)

        event = serializer.save()
        self.stdout.write(self.style.SUCCESS(f'Created event {event.id} (version {event.version})'))
