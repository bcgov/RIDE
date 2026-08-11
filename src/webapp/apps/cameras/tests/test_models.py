"""Model tests for apps.cameras.

Needs PostgreSQL: next_drivebc_webcam_id() uses pg_advisory_xact_lock.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from apps.cameras.models import (
    Antenna,
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
    next_drivebc_webcam_id,
)

User = get_user_model()


def make_user(username="tester"):
    return User.objects.create_user(username=username, password="pw")


def make_view(camera, **kwargs):
    return CameraView.objects.create(camera=camera, **kwargs)


class NextWebcamIdTests(TestCase):
    def setUp(self):
        self.camera = Camera.objects.create(title="Cam")

    def test_returns_one_when_no_ids_exist(self):
        with transaction.atomic():
            self.assertEqual(next_drivebc_webcam_id(), 1)

    def test_returns_max_plus_one(self):
        make_view(self.camera, is_on=False, drivebc_webcam_id=41)
        with transaction.atomic():
            self.assertEqual(next_drivebc_webcam_id(), 42)

    def test_gaps_are_not_reused(self):
        make_view(self.camera, is_on=False, drivebc_webcam_id=5)
        make_view(self.camera, is_on=False, drivebc_webcam_id=100)
        with transaction.atomic():
            self.assertEqual(next_drivebc_webcam_id(), 101)

    def test_ignores_views_without_an_id(self):
        make_view(self.camera, is_on=False)
        with transaction.atomic():
            self.assertEqual(next_drivebc_webcam_id(), 1)


class LookupModelTests(TestCase):
    def test_str_is_name(self):
        self.assertEqual(str(Region.objects.create(name="Northern")), "Northern")

    def test_defaults(self):
        region = Region.objects.create(name="R")
        self.assertTrue(region.is_active)
        self.assertEqual(region.description, "")
        self.assertEqual(region.display_order, 0)

    def test_name_is_unique(self):
        Region.objects.create(name="Dup")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Region.objects.create(name="Dup")

    def test_default_ordering_by_name(self):
        Region.objects.create(name="B")
        Region.objects.create(name="A")
        Region.objects.create(name="C")
        self.assertEqual(list(Region.objects.values_list("name", flat=True)), ["A", "B", "C"])

    def test_road_code_is_optional(self):
        self.assertEqual(Road.objects.create(name="Highway 1").code, "")

    def test_camera_type_is_not_ptz_by_default(self):
        self.assertFalse(CameraType.objects.create(name="Fixed").is_ptz)

    def test_antenna_gain_is_nullable_decimal(self):
        self.assertIsNone(Antenna.objects.create(name="A1").gain_dbi)
        antenna = Antenna.objects.create(name="A2", gain_dbi=Decimal("3.50"))
        antenna.refresh_from_db()
        self.assertEqual(antenna.gain_dbi, Decimal("3.50"))


class CameraTests(TestCase):
    def test_str_uses_title(self):
        self.assertEqual(str(Camera.objects.create(title="Hwy 1 at Exit 5")), "Hwy 1 at Exit 5")

    def test_str_falls_back_to_pk(self):
        camera = Camera.objects.create()
        self.assertEqual(str(camera), f"Camera {camera.pk}")

    def test_defaults(self):
        camera = Camera.objects.create()
        self.assertTrue(camera.visible)
        self.assertFalse(camera.marked_delayed)
        self.assertFalse(camera.on_demand)
        self.assertEqual(camera.update_frequency, 0)
        self.assertEqual(camera.display_order, 0)
        self.assertIsNotNone(camera.created)
        self.assertIsNotNone(camera.camera_installed)

    def test_load_creates_then_reuses_pk_1(self):
        first = Camera.load()
        second = Camera.load()
        self.assertEqual(first.pk, 1)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Camera.objects.count(), 1)

    def test_has_password_properties(self):
        camera = Camera.objects.create()
        self.assertFalse(camera.has_admin_password)
        self.assertFalse(camera.has_image_user_password)

        camera.admin_password = "a"
        camera.image_user_password = "b"
        camera.save()
        camera.refresh_from_db()
        self.assertTrue(camera.has_admin_password)
        self.assertTrue(camera.has_image_user_password)

    def test_passwords_round_trip(self):
        camera = Camera.objects.create(admin_password="s3cret", image_user_password="img-s3cret")
        camera.refresh_from_db()
        self.assertEqual(camera.admin_password, "s3cret")
        self.assertEqual(camera.image_user_password, "img-s3cret")

    def test_passwords_are_not_stored_in_plaintext(self):
        camera = Camera.objects.create(admin_password="s3cret")
        with connection.cursor() as cursor:
            cursor.execute(
                f'SELECT admin_password FROM "{Camera._meta.db_table}" WHERE id = %s',
                [camera.pk],
            )
            raw = cursor.fetchone()[0]
        self.assertNotEqual(raw, "s3cret")

    def test_deleting_lookup_sets_fk_null(self):
        road = Road.objects.create(name="Hwy 1")
        camera = Camera.objects.create(road=road)
        road.delete()
        camera.refresh_from_db()
        self.assertIsNone(camera.road)

    def test_related_name_cameras(self):
        region = Region.objects.create(name="South")
        camera = Camera.objects.create(region=region)
        self.assertIn(camera, region.cameras.all())


class CameraViewTests(TestCase):
    def setUp(self):
        self.camera = Camera.objects.create(title="Cam")

    def test_orientation_choices(self):
        self.assertEqual(CameraView.Orientation.NORTH.value, "NORTH")
        self.assertEqual(CameraView.Orientation.SOUTHWEST.label, "Southwest")
        self.assertEqual(len(CameraView.Orientation.choices), 8)

    def test_defaults(self):
        view = make_view(self.camera, is_on=False)
        self.assertFalse(view.is_default)
        self.assertEqual(view.display_order, 0)
        self.assertIsNone(view.drivebc_webcam_id)

    # ---- webcam id from image_url -------------------------------------
    def test_webcam_id_parsed_from_image_url(self):
        view = make_view(self.camera, image_url="https://www.drivebc.ca/images/1150.jpg")
        self.assertEqual(view.drivebc_webcam_id, 1150)

    def test_webcam_id_parsed_when_url_has_query_string(self):
        view = make_view(self.camera, image_url="https://www.drivebc.ca/images/77.jpg?t=123")
        self.assertEqual(view.drivebc_webcam_id, 77)

    def test_image_url_overrides_explicit_id(self):
        view = make_view(
            self.camera,
            is_on=False,
            drivebc_webcam_id=5,
            image_url="https://www.drivebc.ca/images/77.jpg",
        )
        self.assertEqual(view.drivebc_webcam_id, 77)

    def test_non_matching_url_gets_auto_id(self):
        view = make_view(self.camera, image_url="https://example.com/picture.png")
        self.assertIsNotNone(view.drivebc_webcam_id)

    # ---- auto-assigned ids --------------------------------------------
    def test_view_that_is_on_gets_an_id(self):
        view = make_view(self.camera, is_on=True)
        self.assertEqual(view.drivebc_webcam_id, 1)

    def test_ids_are_sequential(self):
        first = make_view(self.camera, is_on=True)
        second = make_view(self.camera, is_on=True)
        self.assertEqual(second.drivebc_webcam_id, first.drivebc_webcam_id + 1)

    def test_auto_id_continues_after_url_derived_id(self):
        make_view(self.camera, image_url="https://www.drivebc.ca/images/1150.jpg")
        view = make_view(self.camera, is_on=True)
        self.assertEqual(view.drivebc_webcam_id, 1151)

    def test_view_that_is_off_gets_no_id(self):
        self.assertIsNone(make_view(self.camera, is_on=False).drivebc_webcam_id)

    def test_turning_view_on_assigns_id(self):
        view = make_view(self.camera, is_on=False)
        view.is_on = True
        view.save()
        self.assertIsNotNone(view.drivebc_webcam_id)

    def test_resaving_keeps_existing_id(self):
        view = make_view(self.camera, is_on=True)
        original = view.drivebc_webcam_id
        view.description = "changed"
        view.save()
        view.refresh_from_db()
        self.assertEqual(view.drivebc_webcam_id, original)

    def test_save_with_update_fields_persists_new_id(self):
        view = make_view(self.camera, is_on=False)
        view.is_on = True
        view.save(update_fields=["is_on"])
        view.refresh_from_db()
        self.assertIsNotNone(view.drivebc_webcam_id)

    def test_webcam_id_is_unique(self):
        make_view(self.camera, is_on=False, drivebc_webcam_id=10)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                make_view(self.camera, is_on=False, drivebc_webcam_id=10)

    def test_deleting_camera_cascades_to_views(self):
        make_view(self.camera, is_on=True)
        self.camera.delete()
        self.assertEqual(CameraView.objects.count(), 0)


class CameraNoteTests(TestCase):
    def setUp(self):
        self.user = make_user()
        self.camera = Camera.objects.create(title="Cam")

    def test_str(self):
        note = CameraNote.objects.create(camera=self.camera, author=self.user, content="x")
        self.assertEqual(str(note), f"Note by {self.user} on {self.camera}")

    def test_ordered_newest_first(self):
        old = CameraNote.objects.create(camera=self.camera, author=self.user, content="old")
        new = CameraNote.objects.create(camera=self.camera, author=self.user, content="new")
        CameraNote.objects.filter(pk=old.pk).update(created=timezone.now() - timedelta(days=1))
        self.assertEqual(list(self.camera.notes.all()), [new, old])

    def test_author_is_protected(self):
        CameraNote.objects.create(camera=self.camera, author=self.user, content="x")
        with self.assertRaises(ProtectedError):
            self.user.delete()

    def test_deleting_camera_deletes_notes(self):
        CameraNote.objects.create(camera=self.camera, author=self.user, content="x")
        self.camera.delete()
        self.assertEqual(CameraNote.objects.count(), 0)


class CameraLogTests(TestCase):
    def setUp(self):
        self.camera = Camera.objects.create(title="Cam")
        self.view = make_view(self.camera, is_on=True)
        self.ts = timezone.now()

    def test_str(self):
        log = CameraLog.objects.create(camera=self.camera, message="hello", timestamp=self.ts)
        self.assertEqual(str(log), f"{self.camera} - {self.ts} - hello")

    def test_ordered_newest_first(self):
        old = CameraLog.objects.create(
            camera=self.camera, message="old", timestamp=self.ts - timedelta(hours=1)
        )
        new = CameraLog.objects.create(camera=self.camera, message="new", timestamp=self.ts)
        self.assertEqual(list(CameraLog.objects.all()), [new, old])

    def test_unique_per_view_timestamp_and_error_flag(self):
        CameraLog.objects.create(camera=self.camera, view=self.view, timestamp=self.ts, message="a")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CameraLog.objects.create(
                    camera=self.camera, view=self.view, timestamp=self.ts, message="b"
                )

    def test_same_timestamp_allowed_when_error_flag_differs(self):
        CameraLog.objects.create(camera=self.camera, view=self.view, timestamp=self.ts, message="a")
        CameraLog.objects.create(
            camera=self.camera, view=self.view, timestamp=self.ts, message="b", is_error=True
        )
        self.assertEqual(CameraLog.objects.count(), 2)

    def test_constraint_does_not_apply_without_a_view(self):
        CameraLog.objects.create(camera=self.camera, timestamp=self.ts, message="a")
        CameraLog.objects.create(camera=self.camera, timestamp=self.ts, message="b")
        self.assertEqual(CameraLog.objects.count(), 2)

    def test_deleting_view_keeps_log(self):
        log = CameraLog.objects.create(camera=self.camera, view=self.view, message="a")
        self.view.delete()
        log.refresh_from_db()
        self.assertIsNone(log.view)


class CameraHistoryTests(TestCase):
    def setUp(self):
        self.camera = Camera.objects.create(title="Cam")

    def test_changes_default_to_empty_dict(self):
        entry = CameraHistory.objects.create(
            camera=self.camera, action_type="create", description="Created"
        )
        self.assertEqual(entry.changes, {})
        self.assertIsNone(entry.user)

    def test_str(self):
        entry = CameraHistory.objects.create(
            camera=self.camera, action_type="update", description="d"
        )
        self.assertEqual(str(entry), f"{self.camera} - update - {entry.created_at}")

    def test_ordered_newest_first(self):
        old = CameraHistory.objects.create(camera=self.camera, action_type="create", description="o")
        new = CameraHistory.objects.create(camera=self.camera, action_type="update", description="n")
        CameraHistory.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=1))
        self.assertEqual(list(self.camera.history.all()), [new, old])

    def test_json_changes_round_trip(self):
        changes = {"title": {"old": "a", "new": "b"}}
        entry = CameraHistory.objects.create(
            camera=self.camera, action_type="update", description="d", changes=changes
        )
        entry.refresh_from_db()
        self.assertEqual(entry.changes, changes)

    def test_deleting_user_keeps_history(self):
        user = make_user()
        entry = CameraHistory.objects.create(
            camera=self.camera, user=user, action_type="update", description="d"
        )
        user.delete()
        entry.refresh_from_db()
        self.assertIsNone(entry.user)


class SettingsModelTests(TestCase):
    def test_report_settings_default_to_empty_list(self):
        self.assertEqual(CameraReportSettings.objects.create().selected_fields, [])

    def test_service_request_ccs_default_to_empty_list(self):
        self.assertEqual(ServiceRequestCcs.objects.create().service_request_ccs, [])

    def test_verbose_names(self):
        self.assertEqual(CameraReportSettings._meta.verbose_name_plural, "Camera report settings")
        self.assertEqual(ServiceRequestCcs._meta.verbose_name_plural, "Service request CCs")


class CameraDefaultMessagingTests(TestCase):
    def test_load_creates_singleton(self):
        first = CameraDefaultMessaging.load()
        second = CameraDefaultMessaging.load()
        self.assertEqual(first.pk, 1)
        self.assertEqual(second.pk, 1)
        self.assertEqual(CameraDefaultMessaging.objects.count(), 1)

    def test_save_always_overwrites_pk_1(self):
        CameraDefaultMessaging(disabled_reason_default="first").save()
        CameraDefaultMessaging(disabled_reason_default="second").save()
        self.assertEqual(CameraDefaultMessaging.objects.count(), 1)
        self.assertEqual(CameraDefaultMessaging.load().disabled_reason_default, "second")

    def test_delete_is_a_no_op(self):
        obj = CameraDefaultMessaging.load()
        obj.delete()
        self.assertEqual(CameraDefaultMessaging.objects.count(), 1)

    def test_clean_rejects_a_second_instance(self):
        CameraDefaultMessaging.load()
        with self.assertRaises(ValidationError):
            CameraDefaultMessaging().clean()

    def test_clean_allows_the_existing_instance(self):
        CameraDefaultMessaging.load().clean()  # should not raise

    def test_str(self):
        self.assertEqual(str(CameraDefaultMessaging.load()), "Default messaging")

    def test_text_fields_default_to_blank(self):
        obj = CameraDefaultMessaging.load()
        self.assertEqual(obj.disabled_reason_default, "")
        self.assertEqual(obj.disabled_short_description, "")
        self.assertEqual(obj.disabled_long_description, "")
