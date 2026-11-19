import datetime
import logging
from zoneinfo import ZoneInfo
from django.contrib.gis.geos import LineString, Point

logger = logging.getLogger(__name__)


def get_default_next_update():
    # Current time with 30 minutes buffer
    now = datetime.datetime.now(tz=ZoneInfo("America/Vancouver")) + datetime.timedelta(minutes=30)
    now = now.replace(second=0, microsecond=0)
    month = now.month
    day = now.day

    # October 1 - April 30
    in_winter_season = (month > 9 or month < 5) or (month == 10 and day >= 1) or (month == 4 and day <= 30)
    if in_winter_season:
        times = [datetime.time(5, 0), datetime.time(7, 0), datetime.time(16, 0)]
        candidates = []
        for t in times:
            candidate = now.replace(hour=t.hour, minute=t.minute)
            if candidate <= now:
                candidate += datetime.timedelta(days=1)
            candidates.append(candidate)
        return min(candidates)

    else:
        return now + datetime.timedelta(days=1)


def get_chainup_next_update():
    now = datetime.datetime.now(tz=ZoneInfo("America/Vancouver"))
    return now + datetime.timedelta(days=1)


def get_route_projection(event):
    from apps.events.models import RouteGeometry

    key = event.start.get('name', '').replace('Hwy ', '')

    # Only process if reference linestring exists
    route_geometry = RouteGeometry.objects.filter(id=key).first()
    if route_geometry:
        # Combine all coordinates into a single linestring for sorting
        all_coords = ()
        for route in route_geometry.routes:
            all_coords += route.coords

        # Project in a meter-based CRS, then convert to km.
        srid = route_geometry.routes.srid or 4326
        route_ls = LineString(all_coords, srid=srid)
        start_point = Point(event.start['coords'], srid=srid)

        if srid != 3005:
            route_ls = route_ls.transform(3005, clone=True)
            start_point = start_point.transform(3005, clone=True)

        projection_m = route_ls.project(start_point)
        return round(projection_m / 1000, 1)

    return 0


# --- DBC22-7326: email notifications ---------------------------------------
# Ported from DBC DBC22-6954 @ dd9770a3 (apps/event/helpers.py, apps/event/ride.py)
# so RIDE builds the same DriveBC view of an event that DBC reads from RIDE's
# /api/events/relevant.  Kept close to the DBC source to ease future syncing.

from apps.events.enums import (  # noqa: E402
    EventDirection,
    EventDisplayCategory,
    EventSeverity,
    EventSubtype,
    EventType,
)

# DBC apps/feed/constants.py
DIRECTIONS = {
  'in both directions': 'BOTH',
  'northbound': 'N',
  'southbound': 'S',
  'eastbound': 'E',
  'westbound': 'W',
}

# Mirrors RIDE open511.py mappings (DBC apps/event/ride.py)
EVENT_TYPE_MAP = {
    'Planned event': EventType.CONSTRUCTION,
    'Incident': EventType.INCIDENT,
    'ROAD_CONDITION': EventType.ROAD_CONDITION,
}

DIRECTION_MAP = {
    'Eastbound': EventDirection.EAST,
    'Westbound': EventDirection.WEST,
    'Northbound': EventDirection.NORTH,
    'Southbound': EventDirection.SOUTH,
    'Both directions': EventDirection.BOTH,
}

# RIDE EVENT_SUBTYPE_GROUPS, situation ids per subtype
SUBTYPE_SITUATIONS = {
    'OBSTRUCTION': [104, 105],
    'HAZARD': [
        72, 76, 77, 78, 79, 80, 81, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 102, 118, 144, 153, 156, 158,
        160, 161, 164, 165, 168, 192, 218, 265, 266, 267, 268, 269, 271, 285, 287, 296, 305,
    ],
    'FIRE': [87, 88, 89, 188, 298],
    'MUD': [103],
    'SIGNAL_LIGHT_FAILURE': [107, 117],
    'AVALANCHE_HAZARD': [84, 86, 283, 292],
    'ROAD_CONSTRUCTION': [10, 11, 12, 191, 226, 282],
    'ROAD_MAINTENANCE': [
        13, 15, 19, 21, 25, 28, 68, 69, 70, 71, 109, 110, 111, 112, 113, 114, 115, 116, 205, 245, 251, 280,
        284, 295, 300,
    ],
    'POOR_VISIBILITY': [106],
    'SPILL': [108],
    'ALMOST_IMPASSABLE': [
        4, 9, 73, 74, 82, 146, 147, 148, 149, 150, 151, 152, 224, 233, 234, 235, 236, 238, 239, 240, 252, 253,
        254, 255, 256, 257, 258, 259, 261, 262, 263, 264, 279, 281, 289, 304,
    ],
    'PLANNED_EVENT': [7],
}


def parse_direction_from_text(*texts):
    '''
    Derive EventDirection from free-text fields that contain
    eastbound/westbound/northbound/southbound phrases.

    Used for chain-ups where RIDE encodes direction in route_from
    (e.g. "Hwy 20, Westbound, ...").
    '''
    for text in texts:
        if not text:
            continue
        lower = text.lower()
        # "Both Directions" appears in chain-up names; check before cardinals
        if 'both directions' in lower:
            return EventDirection.BOTH
        for phrase, code in DIRECTIONS.items():
            if phrase in lower:
                return code
    return EventDirection.NONE


def parse_ride_iso_datetime(value):
    if value is None:
        return None

    if isinstance(value, datetime.datetime):
        return value

    text = value.replace('Z', '+00:00', 1) if isinstance(value, str) else value

    return datetime.datetime.fromisoformat(text)


def parse_ride_datetime_seconds(value):
    dt = parse_ride_iso_datetime(value)
    return dt.replace(microsecond=0) if dt else None


def format_schedule_datetime(value):
    return value.astimezone(ZoneInfo('America/Vancouver')).isoformat(timespec='seconds') if value else ''


def get_linestring_from_collection(geometry):
    for g in (geometry or {}).get('geometries') or []:
        if isinstance(g, dict) and g.get('type') == 'LineString':
            return g


def get_ride_road_name(data):
    # Bulk road conditions: "Highway 1, between ..."
    description = (data.get('segment') or {}).get('description')
    return description.split(', ')[0] if description else 'Other Roads'


def get_ride_location(data, start):
    geometry = data.get('geometry') or {}
    return get_linestring_from_collection(geometry) or \
        next(iter(geometry.get('geometries') or []), None) or \
        {'type': 'Point', 'coordinates': start.get('coords')}


def get_ride_event_sub_type(data):
    situation = data.get('details', {}).get('situation')
    for sub_type, situations in SUBTYPE_SITUATIONS.items():
        if situation in situations:
            return sub_type

    return EventSubtype.PLANNED_EVENT if data.get('type') == 'Planned event' else EventSubtype.HAZARD


def get_ride_event_data(data, ride_fields):
    """Adds fields previously sourced from Open511, built the same way RIDE builds its Open511 payload."""
    details = data.get('details', {})
    start = data.get('location', {}).get('start') or {}
    timing = data.get('timing', {})

    road_name = get_ride_road_name(data)
    location = get_ride_location(data, start)

    first_created = parse_ride_datetime_seconds(data.get('created'))
    start_time = parse_ride_datetime_seconds(timing.get('startTime')) or first_created
    end_time = parse_ride_datetime_seconds(timing.get('endTime'))
    delays = data.get('delays') or {}

    return {
        **ride_fields,
        'description': data.get('description', ''),
        'event_type': EVENT_TYPE_MAP.get(data.get('type'), EventType.INCIDENT),
        'event_sub_type': get_ride_event_sub_type(data),
        'severity': (details.get('severity') or 'Minor').upper(),
        'direction': DIRECTION_MAP.get(details.get('direction'), EventDirection.BOTH),
        'location': location,
        'route_at': ride_fields['route_at'] or road_name,
        'route_from': start.get('ROAD_NAME_FULL') or road_name,
        'route_to': '',
        'first_created': first_created,
        'last_updated': parse_ride_datetime_seconds(data.get('last_updated')),
        'schedule': {'intervals': [f'{format_schedule_datetime(start_time)}/{format_schedule_datetime(end_time)}']},
        'start': start_time,
        'end': end_time,
        'impacts': data.get('impacts') or [],
        'restrictions': data.get('restrictions') or [],
        'schedules': timing.get('schedules') or [],
        'delay_amount': delays.get('amount') or 0,
        'delay_unit': delays.get('unit') or 'minutes',
        'additional': data.get('additional') or '',
        'link': (data.get('external') or {}).get('url') or '',
    }


def parse_recurring_datetime(date_string, time_string):
    # Parse the date and time strings into datetime objects
    stripped_date_string = date_string.split("T")[0]
    date = datetime.datetime.strptime(stripped_date_string, "%Y-%m-%d").date()
    time = datetime.datetime.strptime(time_string, "%H:%M").time()

    # Combine the date and time into a single datetime object
    dt = datetime.datetime.combine(date, time)

    # Convert the datetime object to Pacific Time and return
    return dt.replace(tzinfo=ZoneInfo('America/Vancouver'))


def get_display_category(event, test_datetime=None):
    current_datetime = test_datetime if test_datetime else datetime.datetime.now(ZoneInfo('UTC'))
    if event.start and current_datetime < event.start:
        return EventDisplayCategory.FUTURE_DELAYS

    if 'recurring_schedules' in event.schedule and len(event.schedule['recurring_schedules']):
        recurring_schedules = event.schedule['recurring_schedules'][0]
        start_datetime = parse_recurring_datetime(
            recurring_schedules['start_date'],
            recurring_schedules['daily_start_time']
        )

        if current_datetime < start_datetime:
            return EventDisplayCategory.FUTURE_DELAYS

    if event.closed:
        return EventDisplayCategory.CLOSURE

    if event.event_type == 'ROAD_CONDITION' or event.event_type == 'WEATHER_CONDITION':
        return EventDisplayCategory.ROAD_CONDITION
    elif event.event_type == 'CHAIN_UP':
        return EventDisplayCategory.CHAIN_UP

    return EventDisplayCategory.MAJOR_DELAYS \
        if event.severity == EventSeverity.MAJOR \
        else EventDisplayCategory.MINOR_DELAYS


def get_severity_category(event):
    ''' RIDE: closure > major > minor, ignoring future/type categories, for severity filters '''

    if event.closed:
        return EventDisplayCategory.CLOSURE

    return EventDisplayCategory.MAJOR_DELAYS \
        if event.severity == EventSeverity.MAJOR \
        else EventDisplayCategory.MINOR_DELAYS


def area_label(service_area):
    ''' "01 - South Island", matching the frontend service area labels '''

    return f'{service_area.sortingOrder:02} - {service_area.name}' if service_area else ''


def format_in_effect_datetime(value, tz):
    from apps.events.models import TIME_FORMAT  # '%-I' isn't supported on Windows

    dt = value.astimezone(ZoneInfo(tz or 'America/Vancouver'))
    return dt.strftime(TIME_FORMAT).lower() + f' on {dt:%A}, {dt:%B} {dt.day}, {dt.year}'


def get_in_effect_items(event):
    '''Lines for the "In effect" section; empty for ongoing events with no end or schedule'''
    # RIDE: schedules described with RIDE's desc(), as in the RIDE event preview
    from apps.events.models import desc

    start = event.start and event.start > datetime.datetime.now(datetime.timezone.utc)
    start_text = f'From {format_in_effect_datetime(event.start, event.timezone)}' if start else ''
    schedules = [desc(schedule) for schedule in event.schedules or []]

    if event.end:
        end_text = f'until {format_in_effect_datetime(event.end, event.timezone)}'
    elif start or schedules:
        end_text = 'until further notice'
    else:
        return []

    period = f'{start_text} {end_text}' if start_text else 'U' + end_text[1:]
    return [period] + schedules


def get_traffic_impact_items(event):
    from apps.events.open511 import get_impact_label

    unit = (event.delay_unit or 'minutes').rstrip('s')
    delay = [f'Estimated {event.delay_amount} {unit} delay'] if event.delay_amount else []
    labels = [get_impact_label(impact) for impact in event.impacts or []]
    return delay + [label for label in labels if label]  # skip impacts without a label


def get_restriction_items(event):
    return [f"{item.get('label', '')} {item.get('text') or ''}".strip() for item in event.restrictions or []]


# "For N km" on extents
def get_location_length(event):
    if not event.location or event.location.geom_type == 'Point':
        return ''

    geom = event.location.clone()
    geom.srid = geom.srid or 4326
    geom.transform(3005)  # BC Albers, metres
    km = geom.length / 1000
    return f'{km:.0f}' if km >= 10 else f'{km:.1f}'


# Match DriveBC EventsListPage "View on map" for area notification emails
_EVENT_VIEW_ZOOM = 11


def build_event_site_link(event):
    '''
    DriveBC map URL for an event, as DBC builds for area notifications.
    None when no DriveBC URL is configured.
    '''
    from django.conf import settings

    if not settings.DRIVEBC_BASE_URL:
        return None

    link = (
        f'{settings.DRIVEBC_BASE_URL}?type=event'
        f'&display_category={event.display_category}&id={event.id}'
    )

    location = getattr(event, 'location', None)
    if location is not None and not location.empty:
        if location.geom_type == 'Point':
            pan_lon, pan_lat = location.x, location.y
        else:
            centroid = location.centroid
            pan_lon, pan_lat = centroid.x, centroid.y
        link += f'&pan={pan_lon},{pan_lat}&zoom={_EVENT_VIEW_ZOOM}'

    return link
