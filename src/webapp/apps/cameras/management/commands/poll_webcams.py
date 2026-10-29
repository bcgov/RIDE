import requests
from django.core.management.base import BaseCommand
from apps.cameras.tasks import sync_webcam_logs

URL = "https://www.drivebc.ca/api/webcams/"
ABBR = {
    "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W",
    "NORTHEAST": "NE", "NORTHWEST": "NW", "SOUTHEAST": "SE", "SOUTHWEST": "SW",
}

class Command(BaseCommand):
    help = "Write camera logs when DriveBC webcam status changes."

    def handle(self, *args, **options):
        sync_webcam_logs()
        self.stdout.write(
            self.style.SUCCESS("Webcam polling completed.")
        )