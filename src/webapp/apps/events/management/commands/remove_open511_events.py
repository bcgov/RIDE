import logging

import requests
from django.core.management.base import BaseCommand

from apps.events.enums import Status
from config import settings

logger = logging.getLogger(__name__)


class Command(BaseCommand):

    def handle(self, *args, **options):

        def get_event_payload(eid):
            return {
                "id": eid,
                "updated": "2026-04-02T02:02:00",
                "status": Status.OPEN511_ARCHIVED.value,
                "last_update_userid": "RIDE_RAY_LOCAL",
                "last_publish_userid": "RIDE_RAY_LOCAL",
            }

        eids = [
            # Enter event ids to manually remove here
        ]
        event_payload = {
            "events": [get_event_payload(eid) for eid in eids]
        }

        api_url = getattr(settings, "OPEN511_API_URL", "")
        api_key = getattr(settings, "OPEN511_API_KEY", "")
        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": api_key,
        }

        response = requests.patch(api_url, json=event_payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if 'success' in data and data['success']:
                return

            try:
                if 'event_validation_errors' in data:
                    errors = list(data['event_validation_errors'].values())[0]
                    for error in errors:
                        logger.warning(f'validation error while syncing events to Open511: {error}')

            except:
                logger.warning(f"unknown error while syncing events to Open511")
