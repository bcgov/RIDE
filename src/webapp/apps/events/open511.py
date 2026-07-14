import datetime
import logging
from zoneinfo import ZoneInfo

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
import requests
from rest_framework.exceptions import ValidationError
from timezonefinder import TimezoneFinder
tz_finder = TimezoneFinder(in_memory=True)

from apps.events.enums import EVENT_SUBTYPE_GROUPS, Severity, Status, EventType, PHRASES_LOOKUP
from apps.events.roads import roads

logger = logging.getLogger(__name__)

accepted_roads = {road["NAME"]: road["ID"] for road in roads}

DEFAULT_ZONEINFO = ZoneInfo("America/Vancouver")


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


def format_long_date(value, zone_info=DEFAULT_ZONEINFO):
    if not value:
        return None
    local = value.astimezone(zone_info) if value.tzinfo else value
    day = local.day
    if 11 <= day <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    time_str = local.strftime("%I:%M%p").lstrip("0").lower()
    return f"{local.strftime('%B')} {day}{suffix}, {local.year} at {time_str} {local.strftime("%Z")}"


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


def get_schedule_description(schedule, start_time):
    '''
    Return a one line description for the schedule, or None.

    Parse the schedule object and return a one line description that includes
    the time of day and the days of the week.  Where possible, condense text
    as in common usage (e.g., "Monday to Thursday" instead of listing each day,
    or "weekends" instead of "Saturday, Sunday").

    `start_time` must be a timezone aware datetime that should be geographically
    correct with respect to the start point of the event (e.g., an event in
    Cranbrook shows as being in either MST or MDT, rather than PDT)

    If the end time is earlier than the start time, present the times as
    starting on one day and ending on the next.

    Examples:
        All day, every day
        From 9:00 AM to 6:00 PM MDT, weekdays
        From 6:00 PM to 6:00 AM MDT the next day, Thursday to Saturday
        All day, Tuesday to Thursday and weekends
    '''

    # find sequential groups of days in the week
    group = []
    groups = [group]

    for day in ORDERED_DAYS:
        if schedule.get(day):
            group.append(DAY_LABELS[day])
        else:
            group = []
            groups.append(group)

    groups = [group for group in groups if len(group) > 0]

    if len(groups) == 0:  # no days selected
        return None

    # convert groups to phrases
    grouped = []
    for group in groups:
        if len(group) == 7:
            grouped.append('every day')
        elif len(group) > 2:
            last_day = group.pop()
            if group[0] == 'Monday' and last_day == 'Friday':
                grouped.append('weekdays')
            else:
                grouped.append(f'{group[0]} to {last_day}')
        elif group == ['Saturday', 'Sunday']:
            grouped.append('weekends')
        else:
            grouped = grouped + group

    day_text = words_join(grouped)

    if schedule.get("allDay"):
        return sentence(f"All day, {day_text}")

    starts_dt = starts = ends = next_day = ''
    timezone = start_time.strftime('%Z')

    if schedule.get("startTime"):
        starts_dt = datetime.datetime.strptime(schedule.get("startTime"), '%H:%M')
        starts_dt = starts_dt.replace(year=start_time.year,
                                month=start_time.month,
                                day=start_time.day,
                                tzinfo=start_time.tzinfo)
        starts = starts_dt.strftime("%I:%M %p").lstrip("0")

    if schedule.get("endTime"):
        ends = datetime.datetime.strptime(schedule.get("endTime"), '%H:%M')
        ends = ends.replace(year=start_time.year,
                            month=start_time.month,
                            day=start_time.day,
                            tzinfo=start_time.tzinfo)
        if starts_dt and ends <= starts_dt:
            next_day = ' the next day'
        ends = ends.strftime("%I:%M %p").lstrip("0")

    text = None
    if starts and ends:
        text = sentence(f"From {starts} to {ends} {timezone}{next_day}, {day_text}")
    elif starts:
        text = sentence(f"From {starts} {timezone}, {day_text}")
    elif ends:
        text = sentence(f"Until {ends} {timezone}, {day_text}")

    return text


def get_location_description(event):
    res = ''

    has_start_location = event.start and event.start.get('name')
    has_end_location = event.end and event.end.get('name')

    start_point_name = ''
    if has_start_location:  # Defensive, start point is mandatory
        start_point_name = event.start.get('name')

        # Start descriptions
        res = ' from ' if has_end_location else ' at '
        res += start_point_name

        # Add phrase from first start ref location
        start_ref_locations = event.start.get('nearby') if 'nearby' in event.start else []  # target_event.start is mandatory
        has_start_ref_locs = start_ref_locations and len(start_ref_locations) > 0

        if has_start_ref_locs:
            for start_i, start_loc in enumerate(start_ref_locations):
                # Add 'and' if last location of many
                last_start_loc = start_i == len(start_ref_locations) - 1 and len(start_ref_locations) > 1
                res += ' and ' if last_start_loc else ', '
                res += start_loc['phrase']

    # End descriptions
    if has_end_location:  # end point is optional
        end_point_name = event.end.get('name')

        # end point is on a different road
        has_different_name = start_point_name != end_point_name

        # has at least one reference location
        end_ref_locations = event.end.get('nearby') if 'nearby' in event.end else []
        has_ref_locs = end_ref_locations and len(end_ref_locations) > 0

        # Append to res if either or both is true
        if has_different_name or has_ref_locs:
            res += ' to '

            if has_different_name:
                res += end_point_name + ', '

            if has_ref_locs:
                for end_i, end_loc in enumerate(end_ref_locations):
                    # Add 'and' if last location of many
                    last_end_loc = end_i == len(end_ref_locations) - 1 and len(end_ref_locations) > 1
                    if last_end_loc:
                        res += ' and '

                    # comma if not first ref location
                    elif end_i != 0:
                        res += ', '

                    res += end_loc['phrase']

    return res

DAY_LABELS = {
    "mon": "Monday",
    "tue": "Tuesday",
    "wed": "Wednesday",
    "thu": "Thursday",
    "fri": "Friday",
    "sat": "Saturday",
    "sun": "Sunday",
}
ORDERED_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

VANCOUVER = [-123.116226, 49.246292]

def build_event_description(event, ivr=False):

    parts = []

    start_location = event.start or None
    timezone = ZoneInfo('America/Vancouver')
    if start_location is not None:
        coords = start_location.get('coords') or VANCOUVER
        zone = tz_finder.timezone_at(lng=coords[0], lat=coords[1]) or 'America/Vancouver'
        timezone = ZoneInfo(zone)

    # Situation
    if event.situation and event.situation in PHRASES_LOOKUP:
        # Non-rc location for IVR
        sitn_loc_description = get_location_description(event) if ivr else ''
        parts.append(sentence(PHRASES_LOOKUP[event.situation] + sitn_loc_description))

    # Rcs and chainups
    if event.event_type == EventType.ROAD_CONDITION or event.event_type == EventType.CHAIN_UP:
        conditions_prefix = ''

        # Conditions for rcs
        if event.event_type == EventType.ROAD_CONDITION:
            for index, condition in enumerate(event.conditions):
                if index > 0:
                    if index == len(event.conditions) - 1:
                        conditions_prefix += " and "

                    else:
                        conditions_prefix += ", "

                conditions_prefix += f"{condition['label']}"

        # Static text for chainups
        else:
            conditions_prefix = 'Commercial chain up in effect on '

        # Location for IVR
        loc_description = ''
        if ivr:
            # Bulk rcs
            if event.segment:
                loc_description = event.segment.description.split(',')[1]

            # Non-segment rcs
            elif event.chainup:
                loc_description = event.chainup.name

            else:
                loc_description = get_location_description(event)

        parts.append(sentence(conditions_prefix + loc_description))

    # Schedule
    local_start_time = datetime.datetime.now(timezone)
    if event.start_time or event.end_time:

        short_start = short_end = None

        if event.start_time:
            local_start_time = event.start_time.astimezone(timezone)
            short_start = f'{local_start_time.strftime('%a %b')} {local_start_time.day}'

        if event.end_time:
            local_end_time = event.end_time.astimezone(timezone)
            short_end = f'{local_end_time.strftime('%a %b')} {local_end_time.day}'

        if short_start and short_end:
            parts.append(sentence(f"Starting {short_start} until {short_end}"))
        elif short_start:
            parts.append(sentence(f"Starting {short_start}"))
        elif short_end:
            parts.append(sentence(f"Until {short_end}"))

    for schedule in event.schedules or []:
        parts.append(get_schedule_description(schedule, local_start_time))

    # Estimated delay amount/unit
    if event.delay_amount:
        unit = event.delay_unit or "minutes"
        parts.append(sentence(f"Expect {event.delay_amount} {unit} delay"))

    # Impacts
    for impact in event.impacts or []:
        label = get_impact_label(impact)
        if label:
            parts.append(sentence(label))

    # Restrictions
    for restriction in event.restrictions or []:
        label = restriction.get("label")
        text = restriction.get("text")
        if label and text:
            parts.append(sentence(f"{label} restriction: {text}"))
        elif label:
            parts.append(sentence(label))
        elif text:
            parts.append(sentence(text))

    if ivr:
        # Last update for ivr
        last_update = event.last_updated or datetime.datetime.now(timezone)
        if last_update:
            parts.append(sentence(f"Last update: {format_long_date(last_update, timezone)}"))

        # Next update for ivr
        next_update = event.next_update
        if next_update:
            parts.append(sentence(f"Next update: {format_long_date(next_update, timezone)}"))

    # Additional
    if event.additional:
        parts.append(sentence(event.additional))

    # External url, not to be added to ivr. To be removed in rework
    if event.link and not ivr:
        parts.append(sentence(f"More info: {event.link}"))

    return " ".join([part for part in parts if part])

def get_username(target_event):
    prefix = getattr(settings, 'EVENT_PREFIX', 'RIDE') + '_'
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
    local = value.astimezone(DEFAULT_ZONEINFO)
    return local.replace(tzinfo=None).isoformat(timespec="seconds")


def build_open511_schedule(target_event):
    # Start time is mandatory, fallback to created time if missing
    start_time_str = target_event.start_time if target_event.start_time else target_event.created
    start = format_open511_datetime(start_time_str)
    interval = f"{start}/"

    # End time is optional
    end = format_open511_datetime(target_event.end_time) if target_event.end_time else ''
    interval += f"{end}"

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

        if target_event.geometry.geom_type == "GeometryCollection":
            # Start point(0), end point(1), linestring(2) - return linestring
            if len(target_event.geometry) > 1:
                return target_event.geometry[2]

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

    def get_default_road_name():
        road_name = "Other Roads"

        # DBC22-6236: Use segment name for bulk road conditions
        if target_event.event_type == EventType.ROAD_CONDITION and target_event.segment:
            road_name = target_event.segment.route.name

        return road_name

    def build_road():
        road_name_keys = (
            "name",
            "ROAD_NAME_FULL",
            "ROAD_NAME_ALIAS1",
            "ROAD_NAME_ALIAS2",
            "ROAD_NAME_ALIAS3",
            "ROAD_NAME_ALIAS4",
        )
        corrected_name = get_default_road_name()
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

        else:
            road["from"] = get_default_road_name()

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
        "+ivr_message": build_event_description(target_event, ivr=True),
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

        # Roll back the Event.save() transaction and surface error to the frontend
        try:
            if 'event_validation_errors' in data:
                errors = list(data['event_validation_errors'].values())[0]
                for error in errors:
                    logger.warning(f'validation error while syncing event {event.id} to Open511: {error}')

                raise ValidationError({'open511': errors})

        except:
            logger.warning(response.text)
            raise ValidationError({'open511': [response.text]})

    logger.warning(response.text)
    raise ValidationError({'open511': [response.text]})

