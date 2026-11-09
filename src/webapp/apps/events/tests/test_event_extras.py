# DBC22-7322: ported from DBC apps/event/tests/test_event_extras.py and
# test_helpers_details.py (DBC22-6954 @ dd9770a3).  RIDE events are DBC-shaped
# SimpleNamespaces; schedules use RIDE's desc().
import datetime
from types import SimpleNamespace

from django.test import SimpleTestCase, override_settings
from django.contrib.gis.geos import LineString, Point

from apps.events.enums import EventDisplayCategory
from apps.events.helpers import (
    build_event_site_link,
    get_in_effect_items,
    get_traffic_impact_items,
)
from apps.events.templatetags.event_extras import (
    event_label,
    event_theme,
    event_title,
    item_changes,
    item_icon,
    location_blocks,
    location_extent,
    no_autolink,
    sub_type_label,
)

WEEKDAYS = {'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': False, 'sun': False}
UTC = datetime.timezone.utc


def event(**kwargs):
    fields = {'start': None, 'end': None, 'schedules': [], 'timezone': 'America/Vancouver',
              'delay_amount': 0, 'delay_unit': 'minutes', 'impacts': [], 'restrictions': [], 'conditions': []}
    return SimpleNamespace(**{**fields, **kwargs})


class EventExtrasTest(SimpleTestCase):
    def test_future_closure_label_and_theme(self):
        closure = event(display_category=EventDisplayCategory.FUTURE_DELAYS, severity='MINOR', closed=True,
                        event_type='CONSTRUCTION')
        assert event_label(closure) == 'future closure'
        assert event_theme(closure)['color'] == '#B73433'

        planned = event(display_category=EventDisplayCategory.FUTURE_DELAYS, severity='MINOR', closed=False,
                        event_type='CONSTRUCTION')
        assert event_label(planned) == 'minor future event'
        assert event_theme(planned)['color'] == '#584215'

    def test_no_autolink(self):
        assert no_autolink('Highway 20') == 'Highway\xa0\u200c20'
        assert no_autolink('Northbound on Highway 5') == 'Northbound \u200con \u200cHighway\xa0\u200c5'

    def test_location_blocks_strip_labels_and_add_landmark(self):
        description = 'Starts: <br>30 km South of Quesnel<br><br>Ends: <br>12 km Southwest of Kamloops'
        assert location_blocks(description, 'Lhtako Dene') == [
            ['30 km South of Quesnel', 'Lhtako Dene'],
            ['12 km Southwest of Kamloops'],
        ]

    def test_location_blocks_skip_duplicate_landmark(self):
        assert location_blocks('Starts: <br>30 km South of Quesnel', '30 km South of Quesnel') == \
            [['30 km South of Quesnel']]
        assert location_blocks('', 'Quesnel') == [['Quesnel']]

    def test_item_icon(self):
        assert item_icon('Estimated 20 minute delay', 'impacts') == 'impact-clock'
        assert item_icon('Right lane closed', 'impacts') == 'impact-do-not-enter'
        assert item_icon('Blasting', 'impacts') == 'impact-exclamation-circle'
        assert item_icon('Speed limit reduced', 'restrictions') == 'restriction-triangle'
        assert item_icon('Until further notice', 'in_effect') == ''

    def test_event_title(self):
        assert event_title(event(route_at='Highway 97, Okanagan Highway', direction='N',
                                 highway_segment_names='')) == \
            {'title': 'Northbound on Highway 97', 'subtitle': 'Okanagan Highway'}

        assert event_title(event(route_at='Highway 97', direction='NONE', highway_segment_names='')) == \
            {'title': 'Highway 97', 'subtitle': ''}

    def test_item_changes(self):
        current = event(impacts=[{'label': 'Both lanes closed'}, {'label': 'Blasting'}])
        current.previous = event(impacts=[{'label': 'Blasting'}, {'label': 'Single lane alternating'}])

        assert item_changes(current, 'impacts') == [
            ('Both lanes closed', 'added'), ('Blasting', ''), ('Single lane alternating', 'removed'),
        ]

    def test_sub_type_label(self):
        assert sub_type_label(event(event_sub_type='ROAD_CONSTRUCTION')) == 'Road construction'

    def test_in_effect_until_end(self):
        item = event(start=datetime.datetime(2020, 1, 1, tzinfo=UTC),
                     end=datetime.datetime(2025, 9, 9, 19, 5, tzinfo=UTC))

        assert get_in_effect_items(item) == ['Until 12:05 pm on Tuesday, September 9, 2025']

    def test_in_effect_future_start_with_schedule(self):
        # summer date: UTC-7 with or without BC's 2026 permanent time zone data
        item = event(start=datetime.datetime(2099, 7, 1, 16, tzinfo=UTC),
                     schedules=[{**WEEKDAYS, 'startTime': '09:00', 'endTime': '15:00'}])

        assert get_in_effect_items(item) == [
            'From 9:00 am on Wednesday, July 1, 2099 until further notice',
            'Mon to Fri, from 9:00 AM to 3:00 PM',  # RIDE desc() shortens long schedules
        ]

    def test_in_effect_hidden_for_ongoing_incident(self):
        assert get_in_effect_items(event(start=datetime.datetime(2020, 1, 1, tzinfo=UTC))) == []

    def test_traffic_impact_singular_delay_unit(self):
        item = event(delay_amount=2, delay_unit='hours', impacts=[{'label': 'Both lanes closed'}])

        assert get_traffic_impact_items(item) == ['Estimated 2 hour delay', 'Both lanes closed']

    def test_drivebc_link(self):
        item = event(id='RIDE-100001', display_category='majorEvents', location=Point(-123.36, 48.43))

        with override_settings(DRIVEBC_BASE_URL=''):
            assert build_event_site_link(item) is None

        with override_settings(DRIVEBC_BASE_URL='https://www.drivebc.ca/'):
            assert build_event_site_link(item) == (
                'https://www.drivebc.ca/?type=event&display_category=majorEvents&id=RIDE-100001'
                '&pan=-123.36,48.43&zoom=11'
            )

            item.location = LineString((-120.0, 50.0), (-120.0, 51.0), srid=4326)
            assert build_event_site_link(item).endswith('&pan=-120.0,50.5&zoom=11')

    def test_location_text_is_escaped_in_emails(self):
        from django.template.loader import render_to_string

        html = render_to_string('email/event_location_blocks.html', {
            'blocks': location_blocks('Starts: <br><a href="https://evil.example">Re-verify</a>', '<img src=x>'),
            'tone': '',
        })
        assert '<a href' not in html
        assert '<img' not in html
        assert '&lt;a href=&quot;https://evil.example&quot;&gt;Re-verify&lt;/a&gt;' in html

    def test_location_extent(self):
        line = LineString((-120.79, 50.17), (-120.79, 50.46), srid=4326)  # ~32 km north-south
        item = event(
            location=line,
            location_description='Starts: <br>8 km North of Merritt<br>94.6 km Southwest of Kamloops'
                                 '<br><br>Ends: <br>19 km South of Merritt',
        )
        item.previous = event(location_description='Starts: <br>8 km North of Merritt<br>94.6 km Southwest of '
                                                   'Kamloops<br><br>Ends: <br>18.9 km South of Merritt')

        extent = location_extent(item)

        assert extent['length'] == '32'
        assert extent['sides'] == [
            {'label': 'Starts', 'lines': ['8 km North of Merritt', '94.6 km Southwest of Kamloops'],
             'previous': None, 'changed': False},
            {'label': 'Ends', 'lines': ['19 km South of Merritt'],
             'previous': ['18.9 km South of Merritt'], 'changed': True},
        ]

    def test_location_extent_none_for_point(self):
        assert location_extent(event(location=None, location_description='Starts: <br>8 km North of Merritt')) is None

    def test_extent_text_is_escaped_in_emails(self):
        from django.template.loader import render_to_string

        side = {'label': 'Starts', 'lines': ['<a href="https://evil.example">Re-verify</a>'],
                'previous': None, 'changed': False}
        html = render_to_string('email/event_location_end.html', {'side': side})
        assert '<a href' not in html
        assert '&lt;a href=' in html

    def test_traffic_impacts_skip_unlabelled(self):
        item = event(impacts=[{'label': 'Blasting'}, {'id': None}])

        assert get_traffic_impact_items(item) == ['Blasting']
