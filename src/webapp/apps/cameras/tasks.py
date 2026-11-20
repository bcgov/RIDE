
import logging

import requests
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from huey import crontab
from huey.contrib.djhuey import db_periodic_task

from apps.cameras.models import CameraView, CameraLog

logger = logging.getLogger(__name__)

URL = "https://www.drivebc.ca/api/webcams/"

ABBR = {
    "NORTH": "N",
    "SOUTH": "S",
    "EAST": "E",
    "WEST": "W",
    "NORTHEAST": "NE",
    "NORTHWEST": "NW",
    "SOUTHEAST": "SE",
    "SOUTHWEST": "SW",
}


def sync_webcam_logs():
    """Fetch DriveBC webcams and record status changes."""
    resp = requests.get(URL, timeout=(3, 10))
    resp.raise_for_status()

    data = resp.json()
    items = data if isinstance(data, list) else data.get("results", [])
    webcams = {str(w["id"]): w for w in items if "id" in w}

    pairs = CameraView.objects.filter(
        drivebc_webcam_id__isnull=False
    ).values_list("pk", "drivebc_webcam_id")

    processed = 0

    for pk, webcam_id in pairs.iterator():
        webcam = webcams.get(str(webcam_id))
        if webcam and process_webcam_view(pk, webcam):
            processed += 1

    logger.info("Webcam polling completed; logged %s status changes", processed)


@transaction.atomic
def process_webcam_view(pk, webcam):
    view = (
        CameraView.objects.select_for_update()
        .select_related("camera")
        .get(pk=pk)
    )

    attempt = parse_datetime(webcam.get("last_update_attempt") or "")
    modified = parse_datetime(webcam.get("last_update_modified") or "")

    if attempt is None:
        return False

    stored_attempt = view.last_update_attempt
    stored_modified = view.last_update_modified

    # First sighting: establish the baseline without creating a log.
    if stored_attempt is None:
        view.last_update_attempt = attempt
        view.last_update_modified = modified
        view.save(
            update_fields=["last_update_attempt", "last_update_modified"]
        )
        return False

    # Ignore unchanged or older attempts.
    if attempt <= stored_attempt:
        return False

    got_image = modified is not None and (
        stored_modified is None or modified > stored_modified
    )

    label = ABBR.get(
        (view.orientation or "").upper(),
        view.orientation or "",
    )

    CameraLog.objects.get_or_create(
        camera=view.camera,
        view=view,
        timestamp=(modified if got_image else attempt) or timezone.now(),
        is_error=not got_image,
        defaults={
            "message": (
                f"{'Image received' if got_image else 'No image received'}"
                f" - {label}"
            )
        },
    )

    view.last_update_attempt = attempt
    if got_image:
        view.last_update_modified = modified

    view.save(
        update_fields=["last_update_attempt", "last_update_modified"]
    )
    return True


@db_periodic_task(crontab(minute="*"))
def poll_webcam_logs():
    """Run the webcam status poll once per minute."""
    logger.info("Starting scheduled webcam status poll")

    try:
        sync_webcam_logs()
    except Exception:
        logger.exception("Scheduled webcam status poll failed")
        raise
