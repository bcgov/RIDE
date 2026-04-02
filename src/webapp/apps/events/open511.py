import datetime
import logging
from zoneinfo import ZoneInfo

import requests
from allauth.socialaccount.models import SocialAccount
from django.conf import settings

from apps.events.enums import EVENT_SUBTYPE_GROUPS, Severity, Status, EventType
from apps.events.roads import roads

logger = logging.getLogger(__name__)

accepted_roads = {road["NAME"]: road["ID"] for road in roads}

def build_event_description(target_event):
    day_labels = {
        "mon": "Monday",
        "tue": "Tuesday",
        "wed": "Wednesday",
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday",
        "sun": "Sunday",
    }
    ordered_days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    def sentence(text):
        text = (text or "").strip()
        if not text:
            return ""
        return text if text.endswith(".") else f"{text}."

    def words_join(items):
        items = [i for i in items if i]
        if not items:
            return ""
        if len(items) == 1:
            return items[0]
        if len(items) == 2:
            return f"{items[0]} and {items[1]}"
        return f"{', '.join(items[:-1])}, and {items[-1]}"

    def parse_clock(value):
        if not value:
            return None
        try:
            dt = datetime.datetime.strptime(value, "%H:%M")
            return dt.strftime("%I:%M %p").lstrip("0")
        except ValueError:
            return None

    def format_short_date(value):
        if not value:
            return None
        local = value.astimezone(ZoneInfo("America/Vancouver")) if value.tzinfo else value
        return f"{local.strftime('%a %b')} {local.day}"

    def get_impact_label(impact):
        label = impact.get("label")
        if label:
            return label
        impact_id = impact.get("id")
        if not impact_id:
            return None
        from apps.events.models import TrafficImpact
        match = TrafficImpact.objects.filter(id=impact_id).first()
        return match.label if match else None

    parts = []

    # 1) Category
    if target_event.category:
        parts.append(sentence(f"{target_event.category} work planned"))

    # 2) Schedule
    if target_event.start_time or target_event.end_time:
        start_s = format_short_date(target_event.start_time)
        end_s = format_short_date(target_event.end_time)
        if start_s and end_s:
            parts.append(sentence(f"Starting {start_s} until {end_s}"))
        elif start_s:
            parts.append(sentence(f"Starting {start_s}"))
        elif end_s:
            parts.append(sentence(f"Until {end_s}"))

    schedules = target_event.schedules or []
    for schedule in schedules:
        active_days = [day_labels[d] for d in ordered_days if schedule.get(d)]
        day_text = words_join(active_days)
        if not day_text:
            continue

        if schedule.get("allDay"):
            parts.append(sentence(f"All day on {day_text}"))
            continue

        start_time = parse_clock(schedule.get("startTime"))
        end_time = parse_clock(schedule.get("endTime"))
        if start_time and end_time:
            parts.append(sentence(f"From {start_time} to {end_time} PST on {day_text}"))
        elif start_time:
            parts.append(sentence(f"From {start_time} PST on {day_text}"))
        elif end_time:
            parts.append(sentence(f"Until {end_time} PST on {day_text}"))

    # 3) Estimated delay amount/unit
    if target_event.delay_amount:
        unit = target_event.delay_unit or "minutes"
        parts.append(sentence(f"Expect {target_event.delay_amount} {unit} delay"))

    # 4) Impacts
    for impact in target_event.impacts or []:
        label = get_impact_label(impact)
        if label:
            parts.append(sentence(label))

    # 5) Restrictions
    for restriction in target_event.restrictions or []:
        label = restriction.get("label")
        text = restriction.get("text")
        if label and text:
            parts.append(sentence(f"{label} restriction: {text}"))
        elif label:
            parts.append(sentence(label))
        elif text:
            parts.append(sentence(text))

    # 6) Additional
    if target_event.additional:
        parts.append(sentence(target_event.additional))

    return " ".join([part for part in parts if part])

def get_username(target_event):
    prefix = 'RIDE_'
    suffix = target_event.user.first_name + " " + target_event.user.last_name

    social_account = SocialAccount.objects.filter(user=target_event.user).first()
    if social_account:
        suffix = social_account.extra_data['bceid_username'] if 'bceid_username' in social_account.extra_data \
            else social_account.extra_data['idir_username']

    return prefix + suffix


def format_open511_datetime(value):
    """Format a datetime for Open511 JSON (America/Vancouver, ISO-8601 with seconds)."""
    if value is None:
        return None
    local = value.astimezone(ZoneInfo("America/Vancouver"))
    return local.replace(tzinfo=None).isoformat(timespec="seconds")


def build_open511_schedule(target_event):
    """Build the Open511 ``schedule`` object for an :class:`~apps.events.models.Event`."""
    start = format_open511_datetime(target_event.start_time)
    end = format_open511_datetime(target_event.end_time)
    if start and end:
        interval = f"{start}/{end}"
    elif start and not end:
        interval = f"{start}/"
    elif end and not start:
        interval = f"/{end}"
    else:
        interval = f"{format_open511_datetime(target_event.created)}/"
    return {"intervals": [interval]}


def build_event_payload(target_event):
    def normalize_direction(direction):
        mapping = {
            "Eastbound": "E",
            "Westbound": "W",
            "Northbound": "N",
            "Southbound": "S",
            "Both directions": "BOTH",
            "Both": "BOTH",
            "E": "E",
            "W": "W",
            "N": "N",
            "S": "S",
            "BOTH": "BOTH",
        }
        return mapping.get(direction, "BOTH")

    def normalize_status(status):
        if status == "Inactive" or status == Status.INACTIVE:
            return Status.OPEN511_ARCHIVED
        return Status.ACTIVE

    def get_severity(severity_label):
        severity_map = {severity.label: severity.value for severity in Severity}
        return severity_map.get(severity_label, Severity.MINOR.value)

    def get_event_type(event_type):
        event_type_map = {
            'Planned event': EventType.CONSTRUCTION.value,
            'Incident': EventType.INCIDENT.value,
            'ROAD_CONDITION': EventType.ROAD_CONDITION.value,
        }

        if event_type in event_type_map:
            return event_type_map[event_type]

        return EventType.INCIDENT.value

    def get_primary_geometry():
        if target_event.geometry is None:
            return None
        if target_event.geometry.geom_type == "GeometryCollection" and len(target_event.geometry) > 0:
            return target_event.geometry[0]
        return target_event.geometry

    def get_coordinates(geometry):
        if geometry is None:
            start_coords = (target_event.start or {}).get("coords")
            return start_coords or []
        if geometry.geom_type == "Point":
            return list(geometry.coords)
        return [list(pair) for pair in geometry.coords]

    def get_state():
        from apps.events.models import TrafficImpact

        impact_ids = [impact.get("id") for impact in (target_event.impacts or []) if impact.get("id")]
        if not impact_ids:
            return "ALL_LANES_OPEN"
        is_closed = TrafficImpact.objects.filter(id__in=impact_ids, closed=True).exists()
        return "CLOSED" if is_closed else "ALL_LANES_OPEN"

    def get_headline():
        return target_event.event_type

    def get_event_subtypes():
        category = target_event.category or ""
        matched = []
        for subtype, labels in EVENT_SUBTYPE_GROUPS.items():
            if category in labels:
                matched.append(subtype)
                break
        if target_event.event_type == "Planned event":
            matched.append("PLANNED_EVENT")
        return matched or ["HAZARD"]

    def build_road():
        road_name_keys = (
            "ROAD_NAME_ALIAS1",
            "ROAD_NAME_ALIAS2",
            "ROAD_NAME_ALIAS3",
            "ROAD_NAME_ALIAS4",
        )
        corrected_name = "Other Roads"
        for key in road_name_keys:
            name = (target_event.start or {}).get(key)
            candidate = name.replace("Hwy", "Highway") if name else ""
            if candidate in accepted_roads:
                corrected_name = candidate
                break

        road = {
            "name": corrected_name,
            "direction": normalize_direction(target_event.direction),
            "state": get_state(),
        }
        if (target_event.start or {}).get("ROAD_NAME_FULL"):
            road["from"] = target_event.start.get("ROAD_NAME_FULL")
        if target_event.delay_amount:
            road["+delay"] = f"{target_event.delay_amount} {target_event.delay_unit}"
        if target_event.additional:
            road["+detour"] = target_event.additional
        return road

    def get_last_publish_userid():
        from apps.events.models import Event

        first_approved = Event.objects.filter(
            approved=True,
            id=target_event.id
        ).order_by("version").first()

        return get_username(first_approved or target_event)

    def get_areas():
        areas = []
        if target_event.service_area:
            sa = target_event.service_area
            areas.append({"name": (sa.parent.name if sa.parent else sa.name) + ' ' + 'District'})

        return areas

    geometry = get_primary_geometry()
    payload_event = {
        "jurisdiction": "drivebc.ca",
        "id": target_event.id,
        "headline": get_headline(),
        "status": normalize_status(target_event.status).value,
        "created": format_open511_datetime(target_event.created),
        "updated": format_open511_datetime(target_event.last_updated),
        "timezone": "America/Vancouver",
        "description": build_event_description(target_event),
        "+ivr_message": build_event_description(target_event),
        "+linear_reference_km": 0,
        "schedule": build_open511_schedule(target_event),
        "event_type": get_event_type(target_event.event_type),
        "event_subtypes": get_event_subtypes(),
        "severity": get_severity(target_event.severity),
        "last_update_userid": get_username(target_event),
        "last_publish_userid": get_last_publish_userid(),
        "geography": {
            "type": geometry.geom_type if geometry else "Point",
            "coordinates": get_coordinates(geometry),
        },
        "roads": [build_road()],
        "areas": get_areas(),
    }

    if geometry is not None:
        centroid = geometry.centroid
        payload_event["midpoint_longitude"] = centroid.x
        payload_event["midpoint_latitude"] = centroid.y

    if target_event.service_area_id:
        payload_event["service_area_number"] = target_event.service_area_id

    return payload_event


def generate_open511_payload(event, previous_approved=None):
    # Event removed or updated, generate difference from last approved version
    if previous_approved:
        current_payload = build_event_payload(event)
        previous_payload = build_event_payload(previous_approved)
        patch_event = {"id": event.id}

        compare_keys = (
            set(current_payload.keys()) | set(previous_payload.keys())
        ) - {"id", "created"}

        for key in compare_keys:
            previous_value = previous_payload.get(key)
            current_value = current_payload.get(key)
            if previous_value != current_value:
                patch_event[key] = current_value

        # Updated value found, fill user ids and patch
        if len(patch_event) > 1:
            patch_event['last_update_userid'] = current_payload.get('last_update_userid')
            patch_event['last_publish_userid'] = current_payload.get('last_publish_userid')
            return {"events": [patch_event]}

    # Event created, generate entire payload
    return {"events": [build_event_payload(event)]}


# Sync approved minor, major, and road conditions to Open511
def sync_open511_data(event):
    from apps.events.models import Event

    api_url = getattr(settings, "OPEN511_API_URL", "")
    api_key = getattr(settings, "OPEN511_API_KEY", "")
    if not api_url or not api_key:
        logger.warning("missing OPEN511_API_URL or OPEN511_API_KEY")
        return None

    # Do not sync unapproved events
    if not event.approved:
        return None

    # Use last approved version to decide create vs update.
    previous_approved = Event.objects.filter(id=event.id, approved=True)\
        .exclude(uuid=event.uuid).order_by("-version").first()

    payload = generate_open511_payload(event, previous_approved)
    if payload is None:
        return None

    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": api_key,
    }

    request_method = requests.patch if previous_approved else requests.post

    response = request_method(api_url, json=payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if 'success' in data and data['success']:
            return

        try:
            if 'event_validation_errors' in data:
                errors = list(data['event_validation_errors'].values())[0]
                for error in errors:
                    logger.warning(f'validation error while syncing event {event.id} to Open511: {error}')

        except:
            logger.warning(f"unknown error while syncing event {event.id} to Open511")
