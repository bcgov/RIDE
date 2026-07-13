from unittest import TestCase
from datetime import datetime
from zoneinfo import ZoneInfo

from timezonefinder import TimezoneFinder
timezone_finder = TimezoneFinder(in_memory=True)

from ..open511 import get_schedule_description

vancouver = { 'lat': 49.246292, 'lng': -123.116226 }  # Pacific time
cranbrook = { 'lat': 49.509724, 'lng': -115.766670 }  # aligned with Alberta, with DST
fort_st_john = { 'lat': 56.2525, 'lng': -120.846667 }  # aligned with Alberta, without DST

vancouver_tz = ZoneInfo(timezone_finder.timezone_at(**vancouver))
cranbrook_tz = ZoneInfo(timezone_finder.timezone_at(**cranbrook))
fort_st_john_tz = ZoneInfo(timezone_finder.timezone_at(**fort_st_john))

schedules = [
    # no days selected
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': False, 'tue': False, 'wed': False, 'thu': False, 'fri': False, 'sat': False, 'sun': False},
        'vancouver': None,
        'cranbrook': None,
        'fort_st_john': None,
    },
    # every day
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': True, 'sun': True},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, every day.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, every day.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, every day.',
    },
    # no end time
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': None,
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': True, 'sun': True},
        'vancouver': 'From 9:00 AM PDT, every day.',
        'cranbrook': 'From 9:00 AM MDT, every day.',
        'fort_st_john': 'From 9:00 AM MST, every day.',
    },
    # no start time
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': None, 'endTime': '18:00',
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': True, 'sun': True},
        'vancouver': 'Until 6:00 PM PDT, every day.',
        'cranbrook': 'Until 6:00 PM MDT, every day.',
        'fort_st_john': 'Until 6:00 PM MST, every day.',
    },
    # every day
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': True, 'sun': True},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, every day.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, every day.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, every day.',
    },
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': True, 'sun': True},
        'vancouver': 'All day, every day.',
        'cranbrook': 'All day, every day.',
        'fort_st_john': 'All day, every day.',
    },
    # weekdays
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': False, 'sun': False},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, weekdays.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, weekdays.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, weekdays.',
    },
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': False, 'sun': False},
        'vancouver': 'All day, weekdays.',
        'cranbrook': 'All day, weekdays.',
        'fort_st_john': 'All day, weekdays.',
    },
    # weekdays+
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': False, 'sun': True},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, weekdays and Sunday.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, weekdays and Sunday.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, weekdays and Sunday.',
    },
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': True, 'tue': True, 'wed': True, 'thu': True, 'fri': True, 'sat': False, 'sun': True},
        'vancouver': 'All day, weekdays and Sunday.',
        'cranbrook': 'All day, weekdays and Sunday.',
        'fort_st_john': 'All day, weekdays and Sunday.',
    },
    # weekends
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': False, 'tue': False, 'wed': False, 'thu': False, 'fri': False, 'sat': True, 'sun': True},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, weekends.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, weekends.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, weekends.',
    },
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': False, 'tue': False, 'wed': False, 'thu': False, 'fri': False, 'sat': True, 'sun': True},
        'vancouver': 'All day, weekends.',
        'cranbrook': 'All day, weekends.',
        'fort_st_john': 'All day, weekends.',
    },
    # weekends+
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': False, 'tue': True, 'wed': True, 'thu': True, 'fri': False, 'sat': True, 'sun': True},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, Tuesday to Thursday and weekends.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, Tuesday to Thursday and weekends.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, Tuesday to Thursday and weekends.',
    },
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': False, 'tue': True, 'wed': True, 'thu': True, 'fri': False, 'sat': True, 'sun': True},
        'vancouver': 'All day, Tuesday to Thursday and weekends.',
        'cranbrook': 'All day, Tuesday to Thursday and weekends.',
        'fort_st_john': 'All day, Tuesday to Thursday and weekends.',
    },
    # ranges
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '09:00', 'endTime': '18:00',
                     'mon': True, 'tue': True, 'wed': False, 'thu': True, 'fri': True, 'sat': True, 'sun': False},
        'vancouver': 'From 9:00 AM to 6:00 PM PDT, Monday, Tuesday, and Thursday to Saturday.',
        'cranbrook': 'From 9:00 AM to 6:00 PM MDT, Monday, Tuesday, and Thursday to Saturday.',
        'fort_st_john': 'From 9:00 AM to 6:00 PM MST, Monday, Tuesday, and Thursday to Saturday.',
    },
    {
        'schedule': {'type': 'week', 'allDay': True, 'startTime': None, 'endTime': None,
                     'mon': True, 'tue': True, 'wed': False, 'thu': True, 'fri': True, 'sat': True, 'sun': False},
        'vancouver': 'All day, Monday, Tuesday, and Thursday to Saturday.',
        'cranbrook': 'All day, Monday, Tuesday, and Thursday to Saturday.',
        'fort_st_john': 'All day, Monday, Tuesday, and Thursday to Saturday.',
    },
    # overnight
    {
        'schedule': {'type': 'week', 'allDay': False, 'startTime': '18:00', 'endTime': '6:00',
                     'mon': True, 'tue': True, 'wed': False, 'thu': True, 'fri': True, 'sat': True, 'sun': False},
        'vancouver': 'From 6:00 PM to 6:00 AM PDT the next day, Monday, Tuesday, and Thursday to Saturday.',
        'cranbrook': 'From 6:00 PM to 6:00 AM MDT the next day, Monday, Tuesday, and Thursday to Saturday.',
        'fort_st_john': 'From 6:00 PM to 6:00 AM MST the next day, Monday, Tuesday, and Thursday to Saturday.',
    },
]


class TestOpen511(TestCase):

    def test_schedule_generation(self):

        vancouver_date = datetime(2026, 7, 1, tzinfo=vancouver_tz)
        cranbrook_date = datetime(2026, 7, 1, tzinfo=cranbrook_tz)
        fort_st_john_date = datetime(2026, 7, 1, tzinfo=fort_st_john_tz)

        for schedule in schedules:
            actual = get_schedule_description(schedule['schedule'], vancouver_date)
            self.assertEqual(actual, schedule['vancouver'])

            actual = get_schedule_description(schedule['schedule'], cranbrook_date)
            self.assertEqual(actual, schedule['cranbrook'])

            actual = get_schedule_description(schedule['schedule'], fort_st_john_date)
            self.assertEqual(actual, schedule['fort_st_john'])
