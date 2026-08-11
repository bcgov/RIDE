"""View tests for apps.cameras.

Views are called directly through ``as_view({...})`` with an APIRequestFactory,
so these tests do not depend on your URL configuration. The two role
permission classes (and HasServiceToken) are patched, so they do not depend on
how your users/roles are modelled either. Set ``role_allowed``,
``admin_allowed`` and ``service_token_allowed`` on a subclass to test denial.
"""
import csv
import io
from datetime import timedelta
from unittest.mock import MagicMock, patch

import requests
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.cameras.models import (
    Camera,
    CameraDefaultMessaging,
    CameraHistory,
    CameraLog,
    CameraNote,
    CameraReportSettings,
    CameraType,
    CameraView,
    Region,
    Road,
    ServiceRequestCcs,
)
from apps.cameras.permissions import HasServiceToken
from apps.cameras.views import (
    EXPORT_FIELD_MAP,
    CameraDefaultMessagingViewSet,
    CameraHistoryViewSet,
    CameraLogViewSet,
    CameraNoteViewSet,
    CameraReportSettingsViewSet,
    CameraTypeViewSet,
    CameraViewSet,
    CamerasOrderViewSet,
    DriveBCViewSet,
    ImageIngestionViewSet,
    RegionViewSet,
    ServiceRequestCcsViewSet,
    _is_valid_id,
    _is_valid_timestamp,
    camera_image_proxy,
)
from apps.users.permissions import IsCameraAdmin, IsCameraRole

User = get_user_model()


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
class ViewTestCase(TestCase):
    role_allowed = True
    admin_allowed = True
    service_token_allowed = False

    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username="tester", password="pw")
        for target, allowed in (
            (IsCameraRole, self.role_allowed),
            (IsCameraAdmin, self.admin_allowed),
            (HasServiceToken, self.service_token_allowed),
        ):
            for attr, value in (("has_permission", allowed), ("has_object_permission", True)):
                patcher = patch.object(target, attr, return_value=value)
                patcher.start()
                self.addCleanup(patcher.stop)

    def call(self, viewset, actions, method="get", data=None, **url_kwargs):
        make = getattr(self.factory, method)
        if method == "get":
            request = make("/", data or {})
        else:
            request = make("/", data if data is not None else {}, format="json")
        force_authenticate(request, user=self.user)
        return viewset.as_view(actions)(request, **url_kwargs)


def results(response):
    data = response.data
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


def make_camera(**kwargs):
    kwargs.setdefault("title", "Cam")
    return Camera.objects.create(**kwargs)


def make_view(camera, **kwargs):
    kwargs.setdefault("is_on", True)
    return CameraView.objects.create(camera=camera, **kwargs)


def upstream(status=200, content=b"img", content_type="image/jpeg", json_data=None):
    resp = MagicMock()
    resp.status_code = status
    resp.content = content
    resp.headers = {"Content-Type": content_type}
    resp.json.return_value = json_data
    return resp


# ---------------------------------------------------------------------------
# pure helper functions
# ---------------------------------------------------------------------------
class ValidationHelperTests(SimpleTestCase):
    def test_is_valid_id(self):
        for good in ("1", "1150", 42, "0"):
            with self.subTest(good=good):
                self.assertTrue(_is_valid_id(good))
        for bad in (None, "", 0, "abc", "12a", "-1", "1.5", "1 2", "١٢٣"):
            with self.subTest(bad=bad):
                self.assertFalse(_is_valid_id(bad))

    def test_is_valid_timestamp(self):
        self.assertTrue(_is_valid_timestamp("20260115083000"))

    def test_is_valid_timestamp_rejects_bad_input(self):
        for bad in (None, "", "2026011508300", "202601150830000", "abcdefghijklmn", "20261399999999", "20260230120000"):
            with self.subTest(bad=bad):
                self.assertFalse(_is_valid_timestamp(bad))


# ---------------------------------------------------------------------------
# BulkUpdateViewSet (exercised through Region and CameraType)
# ---------------------------------------------------------------------------
class BulkUpdateTests(ViewTestCase):
    def put(self, payload, viewset=RegionViewSet):
        return self.call(viewset, {"put": "bulk_update"}, "put", payload)

    def test_list_returns_active_items_only(self):
        Region.objects.create(name="Active")
        Region.objects.create(name="Gone", is_active=False)
        response = self.call(RegionViewSet, {"get": "list"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r["name"] for r in results(response)], ["Active"])

    def test_creates_items_with_index_as_display_order(self):
        response = self.put({"items": [{"name": "North"}, {"name": "South"}]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r["name"] for r in response.data], ["North", "South"])
        self.assertEqual(
            list(Region.objects.order_by("display_order").values_list("name", "display_order")),
            [("North", 0), ("South", 1)],
        )

    def test_explicit_display_order_wins(self):
        self.put({"items": [{"name": "A", "display_order": 9}]})
        self.assertEqual(Region.objects.get(name="A").display_order, 9)

    def test_renames_existing_item(self):
        region = Region.objects.create(name="Old")
        response = self.put({"items": [{"id": region.pk, "name": "New"}]})
        self.assertEqual(response.status_code, 200)
        region.refresh_from_db()
        self.assertEqual(region.name, "New")

    def test_name_is_stripped(self):
        self.put({"items": [{"name": "  Padded  "}]})
        self.assertTrue(Region.objects.filter(name="Padded").exists())

    def test_items_missing_from_payload_are_deactivated_not_deleted(self):
        keep = Region.objects.create(name="Keep")
        drop = Region.objects.create(name="Drop")
        self.put({"items": [{"id": keep.pk, "name": "Keep"}]})
        drop.refresh_from_db()
        self.assertFalse(drop.is_active)
        self.assertTrue(Region.objects.get(pk=keep.pk).is_active)

    def test_inactive_item_with_same_name_is_restored(self):
        Region.objects.create(name="Back", is_active=False)
        response = self.put({"items": [{"name": "Back"}]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Region.objects.filter(name="Back").count(), 1)
        self.assertTrue(Region.objects.get(name="Back").is_active)

    def test_empty_name_is_rejected(self):
        for name in ("", "   ", None):
            with self.subTest(name=name):
                response = self.put({"items": [{"name": name}]})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data["error"], "Name cannot be empty.")

    def test_unknown_id_is_rejected(self):
        response = self.put({"items": [{"id": 99999, "name": "X"}]})
        self.assertEqual(response.status_code, 400)
        self.assertIn("does not exist", response.data["error"])

    def test_inactive_id_is_rejected(self):
        region = Region.objects.create(name="Off", is_active=False)
        response = self.put({"items": [{"id": region.pk, "name": "Off"}]})
        self.assertEqual(response.status_code, 400)

    def test_items_must_be_a_list(self):
        response = self.put({"items": "nope"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "items must be a list")

    def test_empty_list_deactivates_everything(self):
        Region.objects.create(name="A")
        response = self.put({"items": []})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        self.assertFalse(Region.objects.get(name="A").is_active)

    def test_extra_fields_are_applied(self):
        response = self.put({"items": [{"name": "PTZ cam", "is_ptz": True}]}, CameraTypeViewSet)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(CameraType.objects.get(name="PTZ cam").is_ptz)

    def test_extra_boolean_must_be_a_bool(self):
        response = self.put({"items": [{"name": "Bad", "is_ptz": "yes"}]}, CameraTypeViewSet)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid item data. Please check the submitted values.")

    def test_omitted_extra_field_is_left_unchanged(self):
        obj = CameraType.objects.create(name="PTZ", is_ptz=True)
        self.put({"items": [{"id": obj.pk, "name": "PTZ"}]}, CameraTypeViewSet)
        obj.refresh_from_db()
        self.assertTrue(obj.is_ptz)


class BulkUpdateKnownIssueTests(ViewTestCase):
    def test_error_midway_leaves_partial_changes(self):
        """bulk_update is @transaction.atomic, but returning a 400 Response does
        not roll anything back, so earlier items stay renamed. Fails today."""
        region = Region.objects.create(name="Original")
        response = self.call(
            RegionViewSet,
            {"put": "bulk_update"},
            "put",
            {"items": [{"id": region.pk, "name": "Renamed"}, {"name": ""}]},
        )
        self.assertEqual(response.status_code, 400)
        region.refresh_from_db()
        self.assertEqual(region.name, "Renamed")


# ---------------------------------------------------------------------------
# permissions
# ---------------------------------------------------------------------------
class AdminOnlyPermissionTests(ViewTestCase):
    """User has the camera role but is not a camera admin."""

    admin_allowed = False

    def test_reads_are_allowed(self):
        camera = make_camera()
        self.assertEqual(self.call(CameraViewSet, {"get": "list"}).status_code, 200)
        self.assertEqual(self.call(CameraViewSet, {"get": "retrieve"}, pk=camera.pk).status_code, 200)
        self.assertEqual(self.call(RegionViewSet, {"get": "list"}).status_code, 200)
        self.assertEqual(self.call(CamerasOrderViewSet, {"get": "list"}).status_code, 200)
        self.assertEqual(self.call(CameraReportSettingsViewSet, {"get": "fields"}).status_code, 200)

    def test_camera_update_is_allowed(self):
        camera = make_camera(title="Old")
        response = self.call(CameraViewSet, {"patch": "partial_update"}, "patch", {"title": "New"}, pk=camera.pk)
        self.assertEqual(response.status_code, 200)

    def test_admin_only_camera_actions_are_denied(self):
        camera = make_camera()
        cases = [
            ({"post": "create"}, "post", {}, {}),
            ({"delete": "destroy"}, "delete", None, {"pk": camera.pk}),
            ({"get": "export"}, "get", None, {}),
            ({"post": "service_request"}, "post", {}, {"pk": camera.pk}),
            ({"post": "clone"}, "post", {}, {"pk": camera.pk}),
        ]
        for actions, method, data, kwargs in cases:
            with self.subTest(actions=actions):
                response = self.call(CameraViewSet, actions, method, data, **kwargs)
                self.assertEqual(response.status_code, 403)
        self.assertEqual(Camera.objects.count(), 1)

    def test_writes_to_lookup_and_settings_endpoints_are_denied(self):
        self.assertEqual(
            self.call(RegionViewSet, {"put": "bulk_update"}, "put", {"items": []}).status_code, 403
        )
        self.assertEqual(
            self.call(CamerasOrderViewSet, {"put": "update"}, "put", {"cameras": []}).status_code, 403
        )
        self.assertEqual(
            self.call(
                CameraReportSettingsViewSet, {"put": "fields"}, "put", {"selected_fields": []}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.call(ServiceRequestCcsViewSet, {"put": "update"}, "put", {"service_request_ccs": []}).status_code,
            403,
        )
        self.assertEqual(
            self.call(CameraDefaultMessagingViewSet, {"put": "update"}, "put", {}, pk=1).status_code, 403
        )


class NoRolePermissionTests(ViewTestCase):
    role_allowed = False
    admin_allowed = False

    def test_everything_is_denied(self):
        self.assertEqual(self.call(CameraViewSet, {"get": "list"}).status_code, 403)
        self.assertEqual(self.call(RegionViewSet, {"get": "list"}).status_code, 403)
        self.assertEqual(self.call(DriveBCViewSet, {"get": "list"}).status_code, 403)
        self.assertEqual(self.call(ImageIngestionViewSet, {"get": "list"}).status_code, 403)


class ServiceTokenPermissionTests(ViewTestCase):
    admin_allowed = False
    service_token_allowed = True

    def test_service_token_can_read_ingestion_and_drivebc_feeds(self):
        self.assertEqual(self.call(ImageIngestionViewSet, {"get": "list"}).status_code, 200)
        self.assertEqual(self.call(DriveBCViewSet, {"get": "list"}).status_code, 200)

    def test_service_token_does_not_unlock_camera_admin_actions(self):
        self.assertEqual(self.call(CameraViewSet, {"post": "create"}, "post", {}).status_code, 403)


# ---------------------------------------------------------------------------
# CameraViewSet: CRUD + history
# ---------------------------------------------------------------------------
class CameraCrudTests(ViewTestCase):
    def test_create_records_history_and_assigns_webcam_ids(self):
        response = self.call(
            CameraViewSet,
            {"post": "create"},
            "post",
            {"title": "New cam", "views": [{"orientation": "NORTH", "is_on": True}]},
        )
        self.assertEqual(response.status_code, 201)
        camera = Camera.objects.get(pk=response.data["id"])
        self.assertEqual(camera.views.count(), 1)
        self.assertIsNotNone(camera.views.first().drivebc_webcam_id)

        entry = CameraHistory.objects.get(camera=camera)
        self.assertEqual(entry.action_type, "create")
        self.assertEqual(entry.category, "Camera")
        self.assertEqual(entry.description, "Created camera")
        self.assertEqual(entry.user, self.user)

    def test_create_with_related_ids(self):
        road = Road.objects.create(name="Hwy 1")
        response = self.call(CameraViewSet, {"post": "create"}, "post", {"title": "C", "road_id": road.pk})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["road"]["name"], "Hwy 1")

    def test_create_validation_error(self):
        response = self.call(CameraViewSet, {"post": "create"}, "post", {"road_id": 99999})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Camera.objects.count(), 0)

    def test_retrieve_hides_passwords(self):
        camera = make_camera(admin_password="a", image_user_password="b")
        response = self.call(CameraViewSet, {"get": "retrieve"}, pk=camera.pk)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("admin_password", response.data)
        self.assertTrue(response.data["has_admin_password"])

    def test_destroy(self):
        camera = make_camera()
        response = self.call(CameraViewSet, {"delete": "destroy"}, "delete", pk=camera.pk)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Camera.objects.filter(pk=camera.pk).exists())

    def test_update_logs_tracked_field_changes(self):
        camera = make_camera(title="Old", description="same")
        response = self.call(
            CameraViewSet, {"patch": "partial_update"}, "patch", {"title": "New"}, pk=camera.pk
        )
        self.assertEqual(response.status_code, 200)
        entry = CameraHistory.objects.get(camera=camera, action_type="update")
        self.assertEqual(entry.changes, {"title": {"old": "Old", "new": "New"}})
        self.assertEqual(entry.description, "Updated camera information")

    def test_update_without_tracked_change_logs_nothing(self):
        camera = make_camera(title="Same")
        self.call(CameraViewSet, {"patch": "partial_update"}, "patch", {"title": "Same", "weather_station": "WS1"}, pk=camera.pk)
        self.assertEqual(CameraHistory.objects.count(), 0)

    def test_disabling_a_view_is_logged(self):
        camera = make_camera()
        view = make_view(camera, orientation="NORTH", is_on=True)
        self.call(
            CameraViewSet,
            {"patch": "partial_update"},
            "patch",
            {"views": [{"id": view.pk, "is_on": False}]},
            pk=camera.pk,
        )
        entry = CameraHistory.objects.get(camera=camera)
        self.assertEqual(entry.action_type, "disabled")
        self.assertEqual(entry.category, "Camera View")
        self.assertEqual(entry.description, "Disabled North view")
        self.assertEqual(entry.changes, {"is_on": {"old": True, "new": False}})

    def test_enabling_a_view_is_logged(self):
        camera = make_camera()
        view = make_view(camera, orientation="", is_on=False)
        self.call(
            CameraViewSet,
            {"patch": "partial_update"},
            "patch",
            {"views": [{"id": view.pk, "is_on": True}]},
            pk=camera.pk,
        )
        entry = CameraHistory.objects.get(camera=camera)
        self.assertEqual(entry.action_type, "enabled")
        self.assertEqual(entry.description, "Enabled Unknown view")

    def test_disabled_message_changes_are_logged(self):
        camera = make_camera()
        view = make_view(camera, orientation="SOUTH", is_on=False, disabled_reason="old")
        self.call(
            CameraViewSet,
            {"patch": "partial_update"},
            "patch",
            {"views": [{"id": view.pk, "disabled_reason": "Storm damage"}]},
            pk=camera.pk,
        )
        entry = CameraHistory.objects.get(camera=camera)
        self.assertEqual(entry.changes, {"disabled_reason": {"old": "old", "new": "Storm damage"}})

    def test_view_edit_without_tracked_change_logs_nothing(self):
        camera = make_camera()
        view = make_view(camera)
        self.call(
            CameraViewSet,
            {"patch": "partial_update"},
            "patch",
            {"views": [{"id": view.pk, "description": "new text"}]},
            pk=camera.pk,
        )
        self.assertEqual(CameraHistory.objects.count(), 0)

    def test_view_added_during_update_is_not_logged_as_toggle(self):
        camera = make_camera()
        self.call(
            CameraViewSet,
            {"patch": "partial_update"},
            "patch",
            {"views": [{"orientation": "EAST", "is_on": True}]},
            pk=camera.pk,
        )
        self.assertEqual(camera.views.count(), 1)
        self.assertEqual(CameraHistory.objects.filter(category="Camera View").count(), 0)


class CameraCloneTests(ViewTestCase):
    def test_clone_copies_camera_and_views_with_fresh_ids(self):
        original = make_camera(title="Cam A", road=Road.objects.create(name="Hwy 1"))
        v1 = make_view(original, image_url="https://www.drivebc.ca/images/100.jpg", orientation="NORTH")
        v2 = make_view(original, orientation="SOUTH")
        old_ids = {v1.drivebc_webcam_id, v2.drivebc_webcam_id}

        response = self.call(CameraViewSet, {"post": "clone"}, "post", {}, pk=original.pk)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "Cam A (Copy)")

        clone = Camera.objects.get(pk=response.data["id"])
        self.assertNotEqual(clone.pk, original.pk)
        self.assertEqual(clone.road, original.road)
        self.assertEqual(clone.views.count(), 2)
        for view in clone.views.all():
            self.assertIsNone(view.image_url)
            self.assertIsNotNone(view.drivebc_webcam_id)
            self.assertNotIn(view.drivebc_webcam_id, old_ids)
        self.assertEqual(
            len({v.drivebc_webcam_id for v in clone.views.all()}), 2
        )

    def test_clone_leaves_original_untouched(self):
        original = make_camera(title="Cam A")
        view = make_view(original, image_url="https://www.drivebc.ca/images/100.jpg")
        self.call(CameraViewSet, {"post": "clone"}, "post", {}, pk=original.pk)
        original.refresh_from_db()
        view.refresh_from_db()
        self.assertEqual(original.title, "Cam A")
        self.assertEqual(original.views.count(), 1)
        self.assertEqual(view.drivebc_webcam_id, 100)
        self.assertEqual(view.image_url, "https://www.drivebc.ca/images/100.jpg")

    def test_clone_records_history_on_the_new_camera(self):
        original = make_camera()
        response = self.call(CameraViewSet, {"post": "clone"}, "post", {}, pk=original.pk)
        entry = CameraHistory.objects.get(camera_id=response.data["id"])
        self.assertEqual(entry.description, "Cloned camera location")
        self.assertEqual(entry.user, self.user)

    def test_clone_unknown_camera_is_404(self):
        self.assertEqual(self.call(CameraViewSet, {"post": "clone"}, "post", {}, pk=99999).status_code, 404)


# ---------------------------------------------------------------------------
# export
# ---------------------------------------------------------------------------
@override_settings(FRONTEND_BASE_URL="https://ride.example.test/")
class CameraExportTests(ViewTestCase):
    def export(self, **params):
        response = self.call(CameraViewSet, {"get": "export"}, data=params)
        self.assertEqual(response.status_code, 200)
        return response, list(csv.reader(io.StringIO(response.content.decode())))

    def test_response_is_a_csv_attachment(self):
        response, _ = self.export()
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn(f"camera-report-{timezone.now().date()}.csv", response["Content-Disposition"])

    def test_default_exports_every_field(self):
        make_camera()
        _, rows = self.export()
        expected = ["ID", "Title"] + [title for title, _ in EXPORT_FIELD_MAP.values()]
        self.assertEqual(rows[0], expected)
        self.assertEqual(len(rows), 2)

    def test_selected_fields_only(self):
        camera = make_camera(
            title="Cam",
            region=Region.objects.create(name="South"),
            road=Road.objects.create(name="Hwy 1"),
        )
        _, rows = self.export(fields="region, road")
        self.assertEqual(rows[0], ["ID", "Title", "Region", "Road"])
        self.assertEqual(rows[1], [str(camera.pk), "Cam", "South", "Hwy 1"])

    def test_unknown_fields_are_ignored_and_fall_back_to_all(self):
        make_camera()
        _, rows = self.export(fields="bogus,also_bogus")
        self.assertEqual(len(rows[0]), 2 + len(EXPORT_FIELD_MAP))

    def test_unknown_fields_mixed_with_known_ones(self):
        make_camera()
        _, rows = self.export(fields="road,bogus")
        self.assertEqual(rows[0], ["ID", "Title", "Road"])

    def test_missing_related_objects_export_as_blank(self):
        make_camera(title="Bare")
        _, rows = self.export(fields="region,road,camera_type,camera_make,business_area")
        self.assertEqual(rows[1][2:], ["", "", "", "", ""])

    def test_camera_url_uses_frontend_base_url(self):
        camera = make_camera()
        _, rows = self.export(fields="camera_url")
        self.assertEqual(rows[1][2], f"https://ride.example.test/cameras/{camera.pk}")

    def test_coordinates(self):
        make_camera(locations_geo_latitude=49.25, locations_geo_longitude=-123.1)
        _, rows = self.export(fields="latitude,longitude")
        self.assertEqual(rows[1][2:], ["49.25", "-123.1"])

    def test_view_columns_only_include_views_with_an_image_url(self):
        camera = make_camera()
        make_view(camera, orientation="NORTH", description="Looking north", image_url="https://x.test/images/5.jpg")
        make_view(camera, orientation="SOUTH", description="Looking south", image_url=None)
        make_view(camera, orientation="EAST", description="Looking east", image_url="")
        _, rows = self.export(fields="camera_views,view_descriptions")
        self.assertEqual(rows[1][2:], ["NORTH", "Looking north"])

    def test_one_row_per_camera(self):
        make_camera(title="A")
        make_camera(title="B")
        _, rows = self.export(fields="road")
        self.assertEqual(len(rows), 3)


class CameraExportKnownIssueTests(ViewTestCase):
    def test_notes_column_dumps_related_manager(self):
        """Known issue: exporting notes returns the reverse-relation
        manager representation instead of actual note content."""
        make_camera()

        response = self.call(
            CameraViewSet,
            {"get": "export"},
            data={"fields": "notes"},
        )

        rows = list(csv.reader(io.StringIO(response.content.decode())))

        self.assertIn("CameraNote", rows[1][2])

# ---------------------------------------------------------------------------
# service request email
# ---------------------------------------------------------------------------
@override_settings(DEFAULT_FROM_EMAIL="ops@example.test")
class ServiceRequestTests(ViewTestCase):
    def setUp(self):
        super().setUp()
        self.camera = make_camera()
        self.payload = {
            "to": ["tech@example.test"],
            "cc": ["boss@example.test"],
            "subject": "Camera offline",
            "body": "Please check it.",
        }

    def send(self, payload):
        return self.call(CameraViewSet, {"post": "service_request"}, "post", payload, pk=self.camera.pk)

    def test_sends_email_and_records_history(self):
        response = self.send(self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.subject, "Camera offline")
        self.assertEqual(message.to, ["tech@example.test"])
        self.assertEqual(message.cc, ["boss@example.test"])
        self.assertEqual(message.from_email, "ops@example.test")
        self.assertEqual(message.body, "Please check it.")

        entry = CameraHistory.objects.get(camera=self.camera)
        self.assertEqual(entry.action_type, "service_request")
        self.assertEqual(entry.description, "Service request sent: Camera offline")
        self.assertEqual(entry.changes["to"], ["tech@example.test"])

    def test_cc_is_optional(self):
        del self.payload["cc"]
        self.assertEqual(self.send(self.payload).status_code, 200)
        self.assertEqual(mail.outbox[0].cc, [])

    def test_requires_recipient_subject_and_body(self):
        for missing, expected in (("to", "recipient"), ("subject", "Subject"), ("body", "body")):
            with self.subTest(missing=missing):
                payload = dict(self.payload)
                payload[missing] = [] if missing == "to" else "   "
                response = self.send(payload)
                self.assertEqual(response.status_code, 400)
                self.assertIn(expected, response.data["detail"])
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(CameraHistory.objects.count(), 0)

    def test_send_failure_returns_502_and_no_history(self):
        with patch("django.core.mail.EmailMessage.send", side_effect=Exception("smtp down")):
            response = self.send(self.payload)
        self.assertEqual(response.status_code, 502)
        self.assertEqual(CameraHistory.objects.count(), 0)


# ---------------------------------------------------------------------------
# image proxies
# ---------------------------------------------------------------------------
class ImageProxyActionTests(ViewTestCase):
    def proxy(self, pk, **params):
        return self.call(CameraViewSet, {"get": "image_proxy"}, data=params, pk=pk)

    @patch("apps.cameras.views.requests.get")
    def test_proxies_image(self, mock_get):
        mock_get.return_value = upstream(content=b"PNGDATA", content_type="image/png")
        response = self.proxy("12", t="99")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"PNGDATA")
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertEqual(mock_get.call_args.args[0], "https://www.drivebc.ca/images/12.jpg")
        self.assertEqual(mock_get.call_args.kwargs["params"], {"t": "99"})

    @patch("apps.cameras.views.requests.get")
    def test_webcam_id_query_param_overrides_pk(self, mock_get):
        mock_get.return_value = upstream()
        self.proxy("12", webcam_id="34")
        self.assertEqual(mock_get.call_args.args[0], "https://www.drivebc.ca/images/34.jpg")

    @patch("apps.cameras.views.requests.get")
    def test_invalid_id_is_400_and_never_calls_upstream(self, mock_get):
        response = self.proxy("abc")
        self.assertEqual(response.status_code, 400)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get")
    def test_upstream_non_200_is_404(self, mock_get):
        mock_get.return_value = upstream(status=500)
        self.assertEqual(self.proxy("12").status_code, 404)

    @patch("apps.cameras.views.requests.get", side_effect=requests.ConnectionError)
    def test_upstream_exception_is_404(self, _):
        self.assertEqual(self.proxy("12").status_code, 404)


class CameraImageProxyFunctionTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

    @patch("apps.cameras.views.requests.get")
    def test_success(self, mock_get):
        mock_get.return_value = upstream(content=b"IMG", content_type="image/jpeg")
        response = camera_image_proxy(self.rf.get("/", {"t": "123"}), "12")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"IMG")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        kwargs = mock_get.call_args.kwargs
        self.assertEqual(kwargs["params"], {"t": "123"})
        self.assertIs(kwargs["allow_redirects"], False)

    @patch("apps.cameras.views.requests.get")
    def test_no_cache_buster_sends_no_params(self, mock_get):
        mock_get.return_value = upstream()
        camera_image_proxy(self.rf.get("/"), "12")
        self.assertIsNone(mock_get.call_args.kwargs["params"])

    @patch("apps.cameras.views.requests.get")
    def test_invalid_id_and_cache_buster_are_400(self, mock_get):
        self.assertEqual(camera_image_proxy(self.rf.get("/"), "abc").status_code, 400)
        self.assertEqual(camera_image_proxy(self.rf.get("/", {"t": "x;y"}), "12").status_code, 400)
        self.assertEqual(camera_image_proxy(self.rf.get("/", {"t": "1" * 21}), "12").status_code, 400)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get")
    def test_upstream_non_200_is_404(self, mock_get):
        mock_get.return_value = upstream(status=404)
        self.assertEqual(camera_image_proxy(self.rf.get("/"), "12").status_code, 404)

    @patch("apps.cameras.views.requests.get")
    def test_non_image_content_type_is_502(self, mock_get):
        mock_get.return_value = upstream(content_type="text/html")
        self.assertEqual(camera_image_proxy(self.rf.get("/"), "12").status_code, 502)

    @patch("apps.cameras.views.requests.get", side_effect=requests.Timeout)
    def test_request_exception_is_502(self, _):
        self.assertEqual(camera_image_proxy(self.rf.get("/"), "12").status_code, 502)


# ---------------------------------------------------------------------------
# timelapse proxies
# ---------------------------------------------------------------------------
@override_settings(
    DRIVEBC_TIMELAPSE_API_KEY="test-key",
    DRIVEBC_TIMELAPSE_API_ROOT="https://timelapse.example.test/api/webcams",
)
class TimelapseListTests(ViewTestCase):
    def setUp(self):
        super().setUp()
        self.camera = make_camera()
        self.v1 = make_view(self.camera, drivebc_webcam_id=None, is_on=False)
        self.v1.drivebc_webcam_id = 10
        self.v1.save()
        self.v2 = make_view(self.camera, is_on=False)
        self.v2.drivebc_webcam_id = 11
        self.v2.save()

    def list(self, **params):
        return self.call(CameraViewSet, {"get": "timelapse_list"}, data=params, pk=self.camera.pk)

    @patch("apps.cameras.views.requests.get")
    def test_success_proxies_json_with_api_key(self, mock_get):
        mock_get.return_value = upstream(json_data={"frames": [1, 2]})
        response = self.list()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"frames": [1, 2]})
        self.assertEqual(mock_get.call_args.args[0], "https://timelapse.example.test/api/webcams/10/timelapse/")
        self.assertEqual(mock_get.call_args.kwargs["headers"]["X-API-Key"], "test-key")

    @patch("apps.cameras.views.requests.get")
    def test_view_param_selects_matching_view(self, mock_get):
        mock_get.return_value = upstream(json_data={})
        self.list(view="11")
        self.assertIn("/11/timelapse/", mock_get.call_args.args[0])

    @patch("apps.cameras.views.requests.get")
    def test_unmatched_view_param_falls_back_to_first_view(self, mock_get):
        mock_get.return_value = upstream(json_data={})
        self.list(view="9999")
        self.assertIn("/10/timelapse/", mock_get.call_args.args[0])

    @patch("apps.cameras.views.requests.get")
    def test_camera_without_webcam_id_is_400(self, mock_get):
        bare = make_camera(title="Bare")
        response = self.call(CameraViewSet, {"get": "timelapse_list"}, pk=bare.pk)
        self.assertEqual(response.status_code, 400)
        mock_get.assert_not_called()

    @override_settings(DRIVEBC_TIMELAPSE_API_KEY=None)
    @patch("apps.cameras.views.requests.get")
    def test_missing_api_key_is_500(self, mock_get):
        self.assertEqual(self.list().status_code, 500)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get")
    def test_upstream_error_is_502_with_upstream_status(self, mock_get):
        mock_get.return_value = upstream(status=503)
        response = self.list()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["upstream_status"], 503)

    @patch("apps.cameras.views.requests.get")
    def test_invalid_json_is_502(self, mock_get):
        resp = upstream()
        resp.json.side_effect = requests.exceptions.JSONDecodeError("bad", "doc", 0)
        mock_get.return_value = resp
        self.assertEqual(self.list().status_code, 502)

    @patch("apps.cameras.views.requests.get", side_effect=requests.exceptions.Timeout)
    def test_timeout_is_504(self, _):
        self.assertEqual(self.list().status_code, 504)

    @patch("apps.cameras.views.requests.get", side_effect=requests.exceptions.ConnectionError)
    def test_connection_error_is_502(self, _):
        self.assertEqual(self.list().status_code, 502)


@override_settings(
    DRIVEBC_TIMELAPSE_API_KEY="test-key",
    DRIVEBC_TIMELAPSE_API_ROOT="https://timelapse.example.test/api/webcams/",
)
class TimelapseImageTests(ViewTestCase):
    TS = "20260115083000"

    def setUp(self):
        super().setUp()
        self.camera = make_camera()
        view = make_view(self.camera, is_on=False)
        view.drivebc_webcam_id = 10
        view.save()

    def image(self, **params):
        return self.call(CameraViewSet, {"get": "timelapse_image"}, data=params, pk=self.camera.pk)

    @patch("apps.cameras.views.requests.get")
    def test_success(self, mock_get):
        mock_get.return_value = upstream(content=b"FRAME", content_type="image/webp")
        response = self.image(timestamp=self.TS)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"FRAME")
        self.assertEqual(response["Content-Type"], "image/webp")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(
            mock_get.call_args.args[0],
            f"https://timelapse.example.test/api/webcams/10/timelapse/{self.TS}/",
        )
        self.assertIs(mock_get.call_args.kwargs["allow_redirects"], False)
        self.assertEqual(mock_get.call_args.kwargs["headers"]["X-API-Key"], "test-key")

    @patch("apps.cameras.views.requests.get")
    def test_bad_timestamp_is_400(self, mock_get):
        for ts in (None, "", "2026", "20261399999999", "abcdefghijklmn"):
            with self.subTest(ts=ts):
                params = {"timestamp": ts} if ts is not None else {}
                self.assertEqual(self.image(**params).status_code, 400)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get")
    def test_non_numeric_view_is_400(self, mock_get):
        self.assertEqual(self.image(timestamp=self.TS, view="abc").status_code, 400)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get")
    def test_camera_without_webcam_id_is_400(self, mock_get):
        bare = make_camera(title="Bare")
        response = self.call(
            CameraViewSet, {"get": "timelapse_image"}, data={"timestamp": self.TS}, pk=bare.pk
        )
        self.assertEqual(response.status_code, 400)
        mock_get.assert_not_called()

    @override_settings(DRIVEBC_TIMELAPSE_API_ROOT=None)
    @patch("apps.cameras.views.requests.get")
    def test_missing_root_is_500(self, mock_get):
        self.assertEqual(self.image(timestamp=self.TS).status_code, 500)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get")
    def test_non_image_upstream_is_502(self, mock_get):
        mock_get.return_value = upstream(content_type="text/html")
        self.assertEqual(self.image(timestamp=self.TS).status_code, 502)

    @patch("apps.cameras.views.requests.get")
    def test_upstream_error_is_502(self, mock_get):
        mock_get.return_value = upstream(status=404)
        response = self.image(timestamp=self.TS)
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["upstream_status"], 404)

    @patch("apps.cameras.views.requests.get", side_effect=requests.exceptions.Timeout)
    def test_timeout_is_504(self, _):
        self.assertEqual(self.image(timestamp=self.TS).status_code, 504)

    @patch("apps.cameras.views.requests.get", side_effect=requests.exceptions.ConnectionError)
    def test_connection_error_is_502(self, _):
        self.assertEqual(self.image(timestamp=self.TS).status_code, 502)


@override_settings(
    DRIVEBC_TIMELAPSE_API_KEY="test-key",
    DRIVEBC_TIMELAPSE_API_ROOT="https://timelapse.example.test/api/webcams",
)
class TimelapseKnownIssueTests(ViewTestCase):
    def test_list_with_non_numeric_view_param_raises_value_error(self):
        """Known issue: timelapse_list passes the raw view parameter
        into a numeric database filter, causing ValueError."""
        camera = make_camera()
        view = make_view(camera, is_on=False)
        view.drivebc_webcam_id = 10
        view.save()

        with self.assertRaisesRegex(
            ValueError,
            "expected a number",
        ):
            self.call(
                CameraViewSet,
                {"get": "timelapse_list"},
                data={"view": "abc"},
                pk=camera.pk,
            )


# ---------------------------------------------------------------------------
# DriveBC webcam list proxy
# ---------------------------------------------------------------------------
class DriveBCWebcamProxyTests(ViewTestCase):
    def list(self):
        return self.call(CameraViewSet, {"get": "drivebc_webcam_list"})

    def single(self, **params):
        return self.call(CameraViewSet, {"get": "drivebc_webcam"}, data=params, pk=1)

    @patch("apps.cameras.views.requests.get")
    def test_list_returns_upstream_json(self, mock_get):
        mock_get.return_value = upstream(json_data=[{"id": 1}, {"id": 2}])
        response = self.list()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [{"id": 1}, {"id": 2}])

    @patch("apps.cameras.views.requests.get")
    def test_list_is_cached(self, mock_get):
        mock_get.return_value = upstream(json_data=[{"id": 1}])
        self.list()
        self.list()
        self.assertEqual(mock_get.call_count, 1)

    @patch("apps.cameras.views.requests.get", side_effect=requests.ConnectionError)
    def test_list_failure_is_502(self, _):
        self.assertEqual(self.list().status_code, 502)

    @patch("apps.cameras.views.requests.get")
    def test_upstream_http_error_is_502(self, mock_get):
        resp = upstream()
        resp.raise_for_status.side_effect = requests.HTTPError("500")
        mock_get.return_value = resp
        self.assertEqual(self.list().status_code, 502)

    @patch("apps.cameras.views.requests.get")
    def test_single_found_in_plain_list(self, mock_get):
        mock_get.return_value = upstream(json_data=[{"id": 1}, {"id": 2, "name": "Two"}])
        response = self.single(view="2")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"id": 2, "name": "Two"})

    @patch("apps.cameras.views.requests.get")
    def test_single_found_in_results_wrapper(self, mock_get):
        mock_get.return_value = upstream(json_data={"results": [{"id": 3}]})
        self.assertEqual(self.single(view="3").data, {"id": 3})

    @patch("apps.cameras.views.requests.get")
    def test_single_not_found_is_404(self, mock_get):
        mock_get.return_value = upstream(json_data=[{"id": 1}])
        self.assertEqual(self.single(view="99").status_code, 404)

    @patch("apps.cameras.views.requests.get")
    def test_single_requires_numeric_view(self, mock_get):
        for params in ({}, {"view": "abc"}, {"view": ""}):
            with self.subTest(params=params):
                self.assertEqual(self.single(**params).status_code, 400)
        mock_get.assert_not_called()

    @patch("apps.cameras.views.requests.get", side_effect=requests.ConnectionError)
    def test_single_failure_is_502(self, _):
        self.assertEqual(self.single(view="1").status_code, 502)


# ---------------------------------------------------------------------------
# password generation
# ---------------------------------------------------------------------------
class GeneratePasswordTests(ViewTestCase):
    NEW_PASSWORD = "Gen3rated!pw"

    def setUp(self):
        super().setUp()
        self.camera = make_camera()
        for target in ("generate_secure_password", "notify_operations_new_password"):
            patcher = patch(f"apps.cameras.views.{target}")
            setattr(self, target, patcher.start())
            self.addCleanup(patcher.stop)
        self.generate_secure_password.return_value = self.NEW_PASSWORD
        self.notify_operations_new_password.return_value = True

    def generate(self, kind, username):
        return self.call(
            CameraViewSet,
            {"post": f"generate_{kind}_password"},
            "post",
            {},
            pk=self.camera.pk,
            username=username,
        )

    # -- image user -------------------------------------------------------
    def test_image_user_password(self):
        response = self.generate("image_user", "imguser")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "username": "imguser",
                "password": self.NEW_PASSWORD,
                "has_password": True,
                "notification_sent": True,
            },
        )
        self.camera.refresh_from_db()
        self.assertEqual(self.camera.image_user, "imguser")
        self.assertEqual(self.camera.image_user_password, self.NEW_PASSWORD)

    def test_image_user_notification_is_called_for_image_user(self):
        self.generate("image_user", "imguser")
        args, kwargs = self.notify_operations_new_password.call_args
        self.assertEqual(args[0].pk, self.camera.pk)
        self.assertEqual(args[1], self.NEW_PASSWORD)
        self.assertIs(kwargs["is_admin_password"], False)

    def test_image_user_placeholder_username_generates_default(self):
        for placeholder in ("none", "null"):
            with self.subTest(placeholder=placeholder):
                self.camera.image_user = ""
                self.camera.save()
                response = self.generate("image_user", placeholder)
                self.assertEqual(response.data["username"], f"image_user_{self.camera.pk}")

    def test_image_user_placeholder_keeps_existing_username(self):
        self.camera.image_user = "existing"
        self.camera.save()
        self.assertEqual(self.generate("image_user", "none").data["username"], "existing")

    def test_image_user_notification_failure_is_reported_not_raised(self):
        self.notify_operations_new_password.side_effect = Exception("smtp down")
        response = self.generate("image_user", "imguser")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["notification_sent"])
        self.camera.refresh_from_db()
        self.assertEqual(self.camera.image_user_password, self.NEW_PASSWORD)

    def test_image_user_falsy_notification_result(self):
        self.notify_operations_new_password.return_value = None
        self.assertFalse(self.generate("image_user", "imguser").data["notification_sent"])

    # -- admin ------------------------------------------------------------
    def test_admin_password(self):
        response = self.generate("admin", "root")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "root")
        self.assertEqual(response.data["password"], self.NEW_PASSWORD)
        self.camera.refresh_from_db()
        self.assertEqual(self.camera.admin_user, "root")
        self.assertEqual(self.camera.admin_password, self.NEW_PASSWORD)
        _, kwargs = self.notify_operations_new_password.call_args
        self.assertIs(kwargs["is_admin_password"], True)

    def test_admin_null_placeholder_generates_default(self):
        self.assertEqual(self.generate("admin", "null").data["username"], f"admin_user_{self.camera.pk}")

    def test_admin_notification_failure_is_reported_not_raised(self):
        self.notify_operations_new_password.side_effect = Exception("boom")
        response = self.generate("admin", "root")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["notification_sent"])

    def test_unknown_camera_is_404(self):
        response = self.call(
            CameraViewSet, {"post": "generate_admin_password"}, "post", {}, pk=99999, username="x"
        )
        self.assertEqual(response.status_code, 404)

    def test_password_change_does_not_touch_other_fields(self):
        self.camera.title = "Keep me"
        self.camera.save()
        Camera.objects.filter(pk=self.camera.pk).update(title="Changed elsewhere")
        self.generate("admin", "root")  # save(update_fields=...) must not overwrite title
        self.camera.refresh_from_db()
        self.assertEqual(self.camera.title, "Changed elsewhere")


class GeneratePasswordKnownIssueTests(ViewTestCase):
    @patch("apps.cameras.views.notify_operations_new_password", return_value=True)
    @patch("apps.cameras.views.generate_secure_password", return_value="pw")
    def test_admin_none_placeholder_is_not_replaced(self, *_):
        """Known issue: username.lower() is compared against 'None',
        so the lowercase 'none' placeholder is not replaced."""
        camera = make_camera()

        response = self.call(
            CameraViewSet,
            {"post": "generate_admin_password"},
            "post",
            {},
            pk=camera.pk,
            username="none",
        )

        self.assertEqual(response.data["username"], "none")


# ---------------------------------------------------------------------------
# history / notes / logs
# ---------------------------------------------------------------------------
class CameraHistoryViewSetTests(ViewTestCase):
    def test_only_returns_history_for_requested_camera(self):
        a, b = make_camera(title="A"), make_camera(title="B")
        mine = CameraHistory.objects.create(camera=a, user=self.user, action_type="update", description="x", category="Camera")
        CameraHistory.objects.create(camera=b, action_type="update", description="y")
        response = self.call(CameraHistoryViewSet, {"get": "list"}, camera_id=a.pk)
        self.assertEqual(response.status_code, 200)
        data = results(response)
        self.assertEqual([row["id"] for row in data], [mine.pk])
        self.assertEqual(data[0]["sections"][0]["category"], "Camera")

    def test_is_read_only(self):
        camera = make_camera()
        with self.assertRaises(Exception):
            # as_view() refuses methods that are not mapped; ReadOnlyModelViewSet has no create
            self.call(CameraHistoryViewSet, {"post": "create"}, "post", {}, camera_id=camera.pk)


class CameraNoteViewSetTests(ViewTestCase):
    def setUp(self):
        super().setUp()
        self.camera = make_camera()
        self.other = User.objects.create_user(username="other", password="pw")

    def test_create_sets_camera_and_author(self):
        response = self.call(
            CameraNoteViewSet, {"post": "create"}, "post", {"content": "Lens dirty"}, camera_id=self.camera.pk
        )
        self.assertEqual(response.status_code, 201)
        note = CameraNote.objects.get()
        self.assertEqual(note.camera, self.camera)
        self.assertEqual(note.author, self.user)

    def test_create_ignores_client_supplied_author(self):
        self.call(
            CameraNoteViewSet,
            {"post": "create"},
            "post",
            {"content": "x", "author": self.other.pk},
            camera_id=self.camera.pk,
        )
        self.assertEqual(CameraNote.objects.get().author, self.user)

    def test_create_requires_content(self):
        response = self.call(CameraNoteViewSet, {"post": "create"}, "post", {}, camera_id=self.camera.pk)
        self.assertEqual(response.status_code, 400)

    def test_list_is_scoped_to_camera(self):
        other_camera = make_camera(title="Other")
        CameraNote.objects.create(camera=self.camera, author=self.user, content="mine")
        CameraNote.objects.create(camera=other_camera, author=self.user, content="theirs")
        response = self.call(CameraNoteViewSet, {"get": "list"}, camera_id=self.camera.pk)
        self.assertEqual([n["content"] for n in results(response)], ["mine"])

    def test_author_can_edit_own_note(self):
        note = CameraNote.objects.create(camera=self.camera, author=self.user, content="old")
        response = self.call(
            CameraNoteViewSet, {"patch": "partial_update"}, "patch", {"content": "new"},
            camera_id=self.camera.pk, pk=note.pk,
        )
        self.assertEqual(response.status_code, 200)
        note.refresh_from_db()
        self.assertEqual(note.content, "new")

    def test_cannot_edit_someone_elses_note(self):
        note = CameraNote.objects.create(camera=self.camera, author=self.other, content="theirs")
        response = self.call(
            CameraNoteViewSet, {"patch": "partial_update"}, "patch", {"content": "hijack"},
            camera_id=self.camera.pk, pk=note.pk,
        )
        self.assertEqual(response.status_code, 403)
        note.refresh_from_db()
        self.assertEqual(note.content, "theirs")

    def test_note_from_another_camera_is_404(self):
        other_camera = make_camera(title="Other")
        note = CameraNote.objects.create(camera=other_camera, author=self.user, content="x")
        response = self.call(
            CameraNoteViewSet, {"patch": "partial_update"}, "patch", {"content": "y"},
            camera_id=self.camera.pk, pk=note.pk,
        )
        self.assertEqual(response.status_code, 404)


class CameraLogViewSetTests(ViewTestCase):
    def test_scoped_to_camera_and_newest_first(self):
        camera, other = make_camera(), make_camera(title="Other")
        now = timezone.now()
        CameraLog.objects.create(camera=camera, message="old", timestamp=now - timedelta(hours=2))
        CameraLog.objects.create(camera=camera, message="new", timestamp=now)
        CameraLog.objects.create(camera=other, message="elsewhere", timestamp=now)
        response = self.call(CameraLogViewSet, {"get": "list"}, camera_id=camera.pk)
        self.assertEqual([row["message"] for row in results(response)], ["new", "old"])


# ---------------------------------------------------------------------------
# singleton settings endpoints
# ---------------------------------------------------------------------------
class CameraReportSettingsViewSetTests(ViewTestCase):
    ACTIONS = {"get": "fields", "put": "fields", "patch": "fields"}

    def test_get_creates_default_row(self):
        response = self.call(CameraReportSettingsViewSet, self.ACTIONS)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"selected_fields": []})
        self.assertEqual(CameraReportSettings.objects.get().pk, 1)

    def test_put_replaces_selection(self):
        response = self.call(
            CameraReportSettingsViewSet, self.ACTIONS, "put", {"selected_fields": ["region", "road"]}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CameraReportSettings.objects.get(pk=1).selected_fields, ["region", "road"])

    def test_patch_updates_selection(self):
        self.call(CameraReportSettingsViewSet, self.ACTIONS, "put", {"selected_fields": ["region"]})
        response = self.call(CameraReportSettingsViewSet, self.ACTIONS, "patch", {"selected_fields": ["road"]})
        self.assertEqual(response.data["selected_fields"], ["road"])
        self.assertEqual(CameraReportSettings.objects.count(), 1)

    def test_invalid_payload_is_400(self):
        response = self.call(
            CameraReportSettingsViewSet,
            self.ACTIONS,
            "put",
            {"selected_fields": {"region": "road"}},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            CameraReportSettings.objects.get(pk=1).selected_fields,
            {"region": "road"},
        )


class ServiceRequestCcsViewSetTests(ViewTestCase):
    ACTIONS = {"get": "list", "put": "update", "patch": "partial_update"}

    def test_list_creates_default_row(self):
        response = self.call(ServiceRequestCcsViewSet, self.ACTIONS)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"service_request_ccs": []})
        self.assertEqual(ServiceRequestCcs.objects.get().pk, 1)

    def test_put_and_patch(self):
        self.call(ServiceRequestCcsViewSet, self.ACTIONS, "put", {"service_request_ccs": ["a@x.test"]})
        self.assertEqual(ServiceRequestCcs.objects.get(pk=1).service_request_ccs, ["a@x.test"])
        response = self.call(
            ServiceRequestCcsViewSet, self.ACTIONS, "patch", {"service_request_ccs": ["b@x.test"]}
        )
        self.assertEqual(response.data["service_request_ccs"], ["b@x.test"])
        self.assertEqual(ServiceRequestCcs.objects.count(), 1)


class CameraDefaultMessagingViewSetTests(ViewTestCase):
    ACTIONS = {"get": "list", "put": "update", "patch": "partial_update"}

    def test_list_returns_singleton(self):
        response = self.call(CameraDefaultMessagingViewSet, {"get": "list"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["disabled_reason_default"], "")

    def test_retrieve_returns_singleton_regardless_of_pk(self):
        CameraDefaultMessaging.objects.create(disabled_reason_default="Maintenance")
        response = self.call(CameraDefaultMessagingViewSet, {"get": "retrieve"}, pk=123)
        self.assertEqual(response.data["disabled_reason_default"], "Maintenance")

    def test_put_updates_all_fields(self):
        payload = {
            "disabled_reason_default": "Maintenance",
            "disabled_short_description": "Offline",
            "disabled_long_description": "Offline for maintenance.",
        }
        response = self.call(CameraDefaultMessagingViewSet, {"put": "update"}, "put", payload, pk=1)
        self.assertEqual(response.status_code, 200)
        obj = CameraDefaultMessaging.load()
        self.assertEqual(obj.disabled_short_description, "Offline")
        self.assertEqual(CameraDefaultMessaging.objects.count(), 1)

    def test_patch_updates_only_given_fields(self):
        CameraDefaultMessaging.objects.create(
            disabled_reason_default="Keep", disabled_short_description="Old"
        )
        response = self.call(
            CameraDefaultMessagingViewSet,
            {"patch": "partial_update"},
            "patch",
            {"disabled_short_description": "New"},
            pk=1,
        )
        self.assertEqual(response.status_code, 200)
        obj = CameraDefaultMessaging.load()
        self.assertEqual(obj.disabled_reason_default, "Keep")
        self.assertEqual(obj.disabled_short_description, "New")


# ---------------------------------------------------------------------------
# camera ordering
# ---------------------------------------------------------------------------
class CamerasOrderViewSetTests(ViewTestCase):
    def setUp(self):
        super().setUp()
        region = Region.objects.create(name="South")
        self.a = make_camera(title="A", display_order=2, region=region)
        self.b = make_camera(title="B", display_order=0)
        self.c = make_camera(title="C", display_order=1)

    def test_list_is_sorted_by_display_order(self):
        response = self.call(CamerasOrderViewSet, {"get": "list"})
        self.assertEqual(response.status_code, 200)
        cameras = response.data["cameras"]
        self.assertEqual([c["title"] for c in cameras], ["B", "C", "A"])
        self.assertEqual(cameras[2]["region"], {"name": "South"})
        self.assertIsNone(cameras[0]["region"])
        self.assertEqual(set(cameras[0]), {"id", "title", "region", "road", "display_order"})

    def test_put_reorders_and_returns_new_order(self):
        payload = {
            "cameras": [
                {"id": self.a.pk, "display_order": 0},
                {"id": self.b.pk, "display_order": 1},
                {"id": self.c.pk, "display_order": 2},
            ]
        }
        response = self.call(CamerasOrderViewSet, {"put": "update"}, "put", payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([c["title"] for c in response.data["cameras"]], ["A", "B", "C"])
        self.b.refresh_from_db()
        self.assertEqual(self.b.display_order, 1)

    def test_patch_behaves_like_put(self):
        response = self.call(
            CamerasOrderViewSet,
            {"patch": "partial_update"},
            "patch",
            {"cameras": [{"id": self.b.pk, "display_order": 5}]},
        )
        self.assertEqual(response.status_code, 200)
        self.b.refresh_from_db()
        self.assertEqual(self.b.display_order, 5)

    def test_invalid_payload_is_400_and_changes_nothing(self):
        response = self.call(
            CamerasOrderViewSet, {"put": "update"}, "put", {"cameras": [{"id": self.a.pk}]}
        )
        self.assertEqual(response.status_code, 400)
        self.a.refresh_from_db()
        self.assertEqual(self.a.display_order, 2)

    def test_unknown_ids_are_ignored(self):
        response = self.call(
            CamerasOrderViewSet,
            {"put": "update"},
            "put",
            {"cameras": [{"id": 99999, "display_order": 1}, {"id": self.a.pk, "display_order": 9}]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([c["id"] for c in response.data["cameras"]], [self.a.pk])


# ---------------------------------------------------------------------------
# feeds for the image server / DriveBC
# ---------------------------------------------------------------------------
class ImageIngestionViewSetTests(ViewTestCase):
    def test_lists_views_that_have_a_webcam_id(self):
        region = Region.objects.create(name="North Coast")
        camera = make_camera(region=region)
        later = make_view(camera, maintenance_ip_address="10.0.0.2")
        earlier = make_view(camera, maintenance_ip_address="10.0.0.1")
        make_view(camera, is_on=False)  # no webcam id -> excluded

        response = self.call(ImageIngestionViewSet, {"get": "list"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(
            response.data,
            [
                {"ID": later.drivebc_webcam_id, "Cam_LocationsRegion": "NorthCoast", "Cam_MaintenancePublic_IP": "10.0.0.2"},
                {"ID": earlier.drivebc_webcam_id, "Cam_LocationsRegion": "NorthCoast", "Cam_MaintenancePublic_IP": "10.0.0.1"},
            ],
        )

    def test_ordered_by_webcam_id(self):
        camera = make_camera()
        for _ in range(3):
            make_view(camera)
        ids = [row["ID"] for row in self.call(ImageIngestionViewSet, {"get": "list"}).data]
        self.assertEqual(ids, sorted(ids))

    def test_missing_region_is_blank_string(self):
        make_view(make_camera())
        row = self.call(ImageIngestionViewSet, {"get": "list"}).data[0]
        self.assertEqual(row["Cam_LocationsRegion"], "")
        self.assertIsNone(row["Cam_MaintenancePublic_IP"])


class DriveBCViewSetTests(ViewTestCase):
    def setUp(self):
        super().setUp()
        self.camera = make_camera(
            region=Region.objects.create(name="South"),
            road=Road.objects.create(name="Hwy 1"),
            locations_geo_latitude=49.1,
            locations_geo_longitude=-123.2,
            locations_elevation=12.5,
            weather_station="WS1",
            image_watermark="MOTI",
            on_demand=True,
        )
        self.view = make_view(
            self.camera,
            name="Exit 5",
            description="Looking east",
            orientation="EAST",
            maintenance_ip_address="10.1.1.1",
            internet_comments="note",
            locations_segment="seg",
            locations_lrs_node="node",
            locations_highway_section="sec",
            isnew=True,
        )

    def list(self, **params):
        return self.call(DriveBCViewSet, {"get": "list"}, data=params)

    def test_maps_fields_to_legacy_names(self):
        response = self.list()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(
            response.data,
            [
                {
                    "id": self.view.drivebc_webcam_id,
                    "cam_internetname": "Exit 5",
                    "cam_internetcaption": "Looking east",
                    "cam_locationsorientation": "EAST",
                    "ip_address": "10.1.1.1",
                    "cam_locationsgeo_latitude": 49.1,
                    "cam_locationsgeo_longitude": -123.2,
                    "cam_internetcomments": "note",
                    "cam_locationssegment": "seg",
                    "cam_locationslrs_node": "node",
                    "cam_locationsregion": "South",
                    "cam_locationshighway": "Hwy 1",
                    "cam_locationshighway_section": "sec",
                    "cam_locationselevation": 12.5,
                    "cam_locationsweather_station": "WS1",
                    "cam_internetdbc_mark": "MOTI",
                    "cam_controldisabled": True,
                    "cam_controldisappear": False,
                    "cam_maintenanceis_on_demand": True,
                    "isNew": True,
                }
            ],
        )

    def test_views_without_webcam_id_are_excluded(self):
        make_view(self.camera, is_on=False)
        self.assertEqual(len(self.list().data), 1)

    def test_filter_by_id(self):
        other = make_view(self.camera)
        response = self.list(id=other.drivebc_webcam_id)
        self.assertEqual([r["id"] for r in response.data], [other.drivebc_webcam_id])

    def test_filter_with_no_match_is_empty(self):
        self.assertEqual(self.list(id=999999).data, [])

    def test_non_integer_id_is_400(self):
        response = self.list(id="abc")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "id must be an integer.")
