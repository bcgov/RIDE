import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import GeometryCollection, LineString, Point
from django.test import TestCase

from apps.events.open511 import build_event_payload, build_open511_schedule
from apps.events.models import Event, TrafficImpact
from apps.organizations.models import ServiceArea

class TestOpen511Sync(TestCase):
    def setUp(self):
        super().setUp()
        base = Path(__file__).parent / "test_data"

        self.patch_payload = json.loads((base / "patch_1_event.json").read_text())
        self.post_payload = json.loads((base / "post_2_new_events.json").read_text())

        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="vcschuni",
            email="v@x.com",
            password="pw",
        )
        TrafficImpact.objects.create(id=999, label="Closed", order=1, closed=True)

    def _parse_dt(self, value):
        dt = datetime.fromisoformat(value)
        return dt if dt.tzinfo else dt.replace(tzinfo=ZoneInfo("America/Vancouver"))

    def _make_event(self, payload, service_area):
        geography = payload["geography"]
        if geography["type"] == "Point":
            shape = Point(*geography["coordinates"])
        else:
            shape = LineString(*geography["coordinates"])
        geometry = GeometryCollection(shape)

        road = payload["roads"][0]
        schedule_interval = payload["schedule"]["intervals"][0]
        start_s, end_s = schedule_interval.split("/")
        start_time = self._parse_dt(start_s) if start_s else None
        end_time = self._parse_dt(end_s) if end_s else None

        event_type = {
            "INCIDENT": "Incident",
            "CONSTRUCTION": "Planned event",
            "ROAD_CONDITION": "ROAD_CONDITION",
        }[payload["event_type"]]
        severity = {
            "MAJOR": "Major",
            "MINOR": "Minor",
            "CLOSURE": "Closure",
        }[payload["severity"]]
        status = "Inactive" if payload["status"] == "INACTIVE" else "Active"

        event = Event.objects.create(
            id=payload["id"],
            approved=True,
            latest=True,
            latest_approved=True,
            user=self.user,
            event_type=event_type,
            status=status,
            severity=severity,
            category="Road Maintenance" if "ROAD_MAINTENANCE" in payload["event_subtypes"] else "Collision",
            direction={
                "E": "Eastbound",
                "W": "Westbound",
                "N": "Northbound",
                "S": "Southbound",
                "BOTH": "Both directions",
            }[road["direction"]],
            start={
                "name": road["name"],
                "other": road.get("from"),
                "coords": geography["coordinates"] if geography["type"] == "Point" else geography["coordinates"][0],
                "ROAD_NAME_ALIAS1": road["name"],
                "ROAD_NAME_FULL": road.get("from"),
            },
            end={"name": road["name"], "other": road.get("to"), "coords": geography["coordinates"][-1]} if road.get("to") else None,
            impacts=[{"id": 999}] if road.get("state") == "CLOSED" else [],
            delay_amount=int((road.get("+delay", "0 minutes").split(" ")[0])) if road.get("+delay") else 0,
            delay_unit="minutes",
            additional=road.get("+detour"),
            start_time=start_time,
            end_time=end_time,
            geometry=geometry,
            service_area=service_area,
            meta={
                "source": {
                    "headline": payload["headline"],
                    "description": payload["description"],
                }
            },
        )
        Event.objects.filter(uuid=event.uuid).update(
            created=self._parse_dt(payload["created"]),
            last_updated=self._parse_dt(payload["updated"]),
        )
        event.refresh_from_db()
        return event

    def _normalize(self, payload):
        normalized = json.loads(json.dumps(payload))
        for evt in normalized.get("events", []):
            evt.pop("midpoint_longitude", None)
            evt.pop("midpoint_latitude", None)
            evt.pop("service_area_number", None)
            evt.pop("created", None)
            evt.pop("updated", None)
            evt.pop("event_subtypes", None)
            evt.pop("event_type", None)
            evt.pop("description", None)
            evt.pop("+ivr_message", None)
            evt.pop("headline", None)
            evt.pop("last_update_userid", None)
            evt.pop("last_publish_userid", None)
            roads = evt.get("roads", [])
            if roads:
                roads[0].pop("to", None)
        return normalized

    def test_post_payload(self):
        sa1 = ServiceArea.objects.create(id=1, name="Lower Mainland", sortingOrder=1, parent=None)
        sa2 = ServiceArea.objects.create(id=2, name="Thompson-Nicola", sortingOrder=2, parent=None)

        e1 = self._make_event(self.post_payload["events"][0], sa1)
        e2 = self._make_event(self.post_payload["events"][1], sa2)

        payload = {"events": [build_event_payload(e1), build_event_payload(e2)]}

        assert payload["events"][0]["event_type"] == "INCIDENT"
        assert payload["events"][1]["event_type"] == "CONSTRUCTION"
        assert payload["events"][0]["event_subtypes"] == ["HAZARD"]
        assert payload["events"][1]["event_subtypes"] == ["ROAD_MAINTENANCE", "PLANNED_EVENT"]
        assert payload["events"][0]["headline"] == "Incident"
        assert payload["events"][1]["headline"] == "Planned event"

        assert payload["events"][0]["description"] == payload["events"][0]["+ivr_message"]
        assert payload["events"][1]["description"] == payload["events"][1]["+ivr_message"]

        expected = self._normalize(self.post_payload)
        for evt, event in zip(expected["events"], (e1, e2)):
            evt["schedule"] = build_open511_schedule(event)
        assert self._normalize(payload) == expected

    def test_patch_payload(self):
        sa = ServiceArea.objects.create(id=1, name="Lower Mainland District", sortingOrder=1, parent=None)
        patch_event = self.patch_payload["events"][0]

        event = Event.objects.create(
            id=patch_event["id"],
            approved=True,
            latest=True,
            latest_approved=True,
            user=self.user,
            event_type="Incident",
            status="Active",
            severity="Major",
            category="Collision",
            direction="Both directions",
            start={
                "name": patch_event["roads"][0]["name"],
                "other": patch_event["roads"][0]["from"],
                "coords": [-123.03, 49.27],
                "ROAD_NAME_ALIAS1": patch_event["roads"][0]["name"],
                "ROAD_NAME_FULL": patch_event["roads"][0]["from"],
            },
            impacts=[],
            geometry=GeometryCollection(Point(-123.03, 49.27)),
            service_area=sa,
            meta={"source": {"headline": patch_event["headline"], "description": "x"}},
        )
        Event.objects.filter(uuid=event.uuid).update(
            created=self._parse_dt(patch_event["created"]),
            last_updated=self._parse_dt(patch_event["updated"]),
        )
        event.refresh_from_db()

        built = build_event_payload(event)
        payload = {
            "events": [{
                "id": built["id"],
                "headline": built["headline"],
                "roads": built["roads"],
            }]
        }

        # Current helper behavior: headline uses event_type text.
        assert payload["events"][0]["id"] == patch_event["id"]
        assert payload["events"][0]["headline"] == "Incident"
        assert payload["events"][0]["roads"] == patch_event["roads"]

    def test_build_road_uses_first_matching_alias(self):
        sa, _ = ServiceArea.objects.get_or_create(
            id=9001,
            defaults={"name": "Sample District", "sortingOrder": 3, "parent": None},
        )

        event = Event.objects.create(
            id="alias-priority-event",
            approved=False,
            latest=True,
            latest_approved=True,
            user=self.user,
            event_type="Incident",
            status="Active",
            severity="Major",
            category="Collision",
            direction="Both directions",
            start={
                "name": "Unknown Road",
                "other": "Some marker",
                "coords": [-123.03, 49.27],
                "ROAD_NAME_ALIAS1": "Unknown Road",
                "ROAD_NAME_ALIAS2": "Hwy 1A",
                "ROAD_NAME_ALIAS3": "Riverview Bridge",
                "ROAD_NAME_ALIAS4": None,
                "ROAD_NAME_FULL": "Some marker",
            },
            impacts=[],
            geometry=GeometryCollection(Point(-123.03, 49.27)),
            service_area=sa,
            meta={"source": {"headline": "Incident", "description": "x"}},
        )

        payload = build_event_payload(event)
        assert payload["roads"][0]["name"] == "Highway 1A"

    def test_build_road_defaults_to_other_roads(self):
        sa, _ = ServiceArea.objects.get_or_create(
            id=9002,
            defaults={"name": "Sample District 2", "sortingOrder": 4, "parent": None},
        )

        event = Event.objects.create(
            id="alias-fallback-event",
            approved=False,
            latest=True,
            latest_approved=True,
            user=self.user,
            event_type="Incident",
            status="Active",
            severity="Major",
            category="Collision",
            direction="Both directions",
            start={
                "name": "Unknown Road",
                "other": "Some marker",
                "coords": [-123.03, 49.27],
                "ROAD_NAME_ALIAS1": "Unknown Road",
                "ROAD_NAME_ALIAS2": "Another Unknown Road",
                "ROAD_NAME_ALIAS3": "Third Unknown Road",
                "ROAD_NAME_ALIAS4": None,
                "ROAD_NAME_FULL": "Some marker",
            },
            impacts=[],
            geometry=GeometryCollection(Point(-123.03, 49.27)),
            service_area=sa,
            meta={"source": {"headline": "Incident", "description": "x"}},
        )

        payload = build_event_payload(event)
        assert payload["roads"][0]["name"] == "Other Roads"
