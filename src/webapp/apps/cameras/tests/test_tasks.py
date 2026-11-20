from datetime import timedelta
from unittest.mock import patch, MagicMock
import requests
from django.test import TestCase
from django.utils import timezone
from apps.cameras.models import Camera, CameraView, CameraLog
from apps.cameras import tasks
from apps.cameras.tasks import (
    sync_webcam_logs,
    process_webcam_view,
    poll_webcam_logs,
)

MODULE = "apps.cameras.tasks"


def iso(dt):
    return dt.isoformat()


def make_view(**kwargs):
    """Create a Camera + CameraView. Adjust required fields to your models."""
    camera = kwargs.pop("camera", None) or Camera.objects.create(
        title="Test Camera",
        description="Test Camera Description"
    )
    defaults = {
        "camera": camera,
        "drivebc_webcam_id": 100,
        "orientation": "NORTH",
        "last_update_attempt": None,
        "last_update_modified": None,
    }
    defaults.update(kwargs)
    return CameraView.objects.create(**defaults)


class ProcessWebcamViewTests(TestCase):
    def setUp(self):
        self.now = timezone.now().replace(microsecond=0)
        self.t0 = self.now - timedelta(minutes=10)
        self.t1 = self.now - timedelta(minutes=5)
        self.t2 = self.now

    def test_missing_attempt_returns_false_and_changes_nothing(self):
        view = make_view()
        result = process_webcam_view(view.pk, {"last_update_attempt": None})
        view.refresh_from_db()

        self.assertFalse(result)
        self.assertIsNone(view.last_update_attempt)
        self.assertEqual(CameraLog.objects.count(), 0)

    def test_first_sighting_sets_baseline_without_log(self):
        view = make_view()
        webcam = {
            "last_update_attempt": iso(self.t0),
            "last_update_modified": iso(self.t0),
        }

        self.assertFalse(process_webcam_view(view.pk, webcam))

        view.refresh_from_db()
        self.assertEqual(view.last_update_attempt, self.t0)
        self.assertEqual(view.last_update_modified, self.t0)
        self.assertEqual(CameraLog.objects.count(), 0)

    def test_unchanged_attempt_is_ignored(self):
        view = make_view(last_update_attempt=self.t1, last_update_modified=self.t0)
        webcam = {
            "last_update_attempt": iso(self.t1),
            "last_update_modified": iso(self.t1),
        }

        self.assertFalse(process_webcam_view(view.pk, webcam))
        self.assertEqual(CameraLog.objects.count(), 0)

    def test_older_attempt_is_ignored(self):
        view = make_view(last_update_attempt=self.t1, last_update_modified=self.t0)
        webcam = {"last_update_attempt": iso(self.t0), "last_update_modified": iso(self.t0)}

        self.assertFalse(process_webcam_view(view.pk, webcam))
        view.refresh_from_db()
        self.assertEqual(view.last_update_attempt, self.t1)

    def test_new_image_logs_success_and_updates_both_timestamps(self):
        view = make_view(last_update_attempt=self.t0, last_update_modified=self.t0)
        webcam = {"last_update_attempt": iso(self.t2), "last_update_modified": iso(self.t2)}

        self.assertTrue(process_webcam_view(view.pk, webcam))

        log = CameraLog.objects.get()
        self.assertFalse(log.is_error)
        self.assertEqual(log.timestamp, self.t2)
        self.assertEqual(log.message, "Image received - N")
        self.assertEqual(log.camera, view.camera)
        self.assertEqual(log.view, view)

        view.refresh_from_db()
        self.assertEqual(view.last_update_attempt, self.t2)
        self.assertEqual(view.last_update_modified, self.t2)

    def test_new_attempt_without_new_image_logs_error(self):
        view = make_view(last_update_attempt=self.t0, last_update_modified=self.t0)
        webcam = {
            "last_update_attempt": iso(self.t2),
            "last_update_modified": iso(self.t0),  # unchanged
        }

        self.assertTrue(process_webcam_view(view.pk, webcam))

        log = CameraLog.objects.get()
        self.assertTrue(log.is_error)
        self.assertEqual(log.timestamp, self.t2)  # uses attempt time
        self.assertEqual(log.message, "No image received - N")

        view.refresh_from_db()
        self.assertEqual(view.last_update_attempt, self.t2)
        self.assertEqual(view.last_update_modified, self.t0)  # not advanced

    def test_stored_modified_none_with_modified_counts_as_image(self):
        view = make_view(last_update_attempt=self.t0, last_update_modified=None)
        webcam = {"last_update_attempt": iso(self.t2), "last_update_modified": iso(self.t1)}

        process_webcam_view(view.pk, webcam)

        self.assertFalse(CameraLog.objects.get().is_error)

    def test_missing_modified_logs_error(self):
        view = make_view(last_update_attempt=self.t0, last_update_modified=self.t0)
        webcam = {"last_update_attempt": iso(self.t2), "last_update_modified": None}

        process_webcam_view(view.pk, webcam)

        self.assertTrue(CameraLog.objects.get().is_error)

    def test_orientation_labels(self):
        cases = [
            ("NORTH", "N"),
            ("southwest", "SW"),   # case-insensitive
            ("UP", "UP"),          # unknown passes through
            ("", ""),              # empty orientation
        ]
        for orientation, expected in cases:
            with self.subTest(orientation=orientation):
                CameraLog.objects.all().delete()
                view = make_view(
                    orientation=orientation,
                    last_update_attempt=self.t0,
                    last_update_modified=self.t0,
                )
                process_webcam_view(
                    view.pk,
                    {"last_update_attempt": iso(self.t2), "last_update_modified": iso(self.t2)},
                )
                self.assertEqual(
                    CameraLog.objects.get().message,
                    f"Image received - {expected}",
                )
                view.delete()

    def test_does_not_duplicate_existing_log(self):
        view = make_view(last_update_attempt=self.t0, last_update_modified=self.t0)
        CameraLog.objects.create(
            camera=view.camera, view=view, timestamp=self.t2,
            is_error=False, message="Image received - N",
        )
        webcam = {"last_update_attempt": iso(self.t2), "last_update_modified": iso(self.t2)}

        process_webcam_view(view.pk, webcam)

        self.assertEqual(CameraLog.objects.count(), 1)


class SyncWebcamLogsTests(TestCase):
    def setUp(self):
        self.now = timezone.now().replace(microsecond=0)
        self.old = self.now - timedelta(minutes=10)

    def _mock_response(self, payload):
        resp = MagicMock()
        resp.json.return_value = payload
        resp.raise_for_status.return_value = None
        return resp

    @patch(f"{MODULE}.requests.get")
    def test_list_payload_processes_matching_views(self, mock_get):
        view = make_view(drivebc_webcam_id=1,
                         last_update_attempt=self.old, last_update_modified=self.old)
        mock_get.return_value = self._mock_response([
            {"id": 1, "last_update_attempt": iso(self.now), "last_update_modified": iso(self.now)},
        ])

        sync_webcam_logs()

        mock_get.assert_called_once_with(tasks.URL, timeout=(3, 10))
        self.assertEqual(CameraLog.objects.filter(view=view).count(), 1)

    @patch(f"{MODULE}.requests.get")
    def test_dict_payload_with_results_key(self, mock_get):
        make_view(drivebc_webcam_id=1,
                  last_update_attempt=self.old, last_update_modified=self.old)
        mock_get.return_value = self._mock_response({
            "results": [
                {"id": 1, "last_update_attempt": iso(self.now), "last_update_modified": iso(self.now)},
            ]
        })

        sync_webcam_logs()

        self.assertEqual(CameraLog.objects.count(), 1)

    @patch(f"{MODULE}.requests.get")
    def test_views_without_matching_webcam_or_id_are_skipped(self, mock_get):
        make_view(drivebc_webcam_id=999,
                  last_update_attempt=self.old, last_update_modified=self.old)
        make_view(drivebc_webcam_id=None)
        mock_get.return_value = self._mock_response([
            {"id": 1, "last_update_attempt": iso(self.now), "last_update_modified": iso(self.now)},
        ])

        sync_webcam_logs()

        self.assertEqual(CameraLog.objects.count(), 0)

    @patch(f"{MODULE}.requests.get")
    def test_webcam_entries_without_id_are_ignored(self, mock_get):
        mock_get.return_value = self._mock_response([{"foo": "bar"}])
        sync_webcam_logs()  # should not raise
        self.assertEqual(CameraLog.objects.count(), 0)

    @patch(f"{MODULE}.requests.get")
    def test_http_error_propagates(self, mock_get):
        resp = MagicMock()
        resp.raise_for_status.side_effect = requests.HTTPError("500")
        mock_get.return_value = resp

        with self.assertRaises(requests.HTTPError):
            sync_webcam_logs()

    @patch(f"{MODULE}.requests.get", side_effect=requests.Timeout)
    def test_timeout_propagates(self, _mock_get):
        with self.assertRaises(requests.Timeout):
            sync_webcam_logs()

    @patch(f"{MODULE}.requests.get")
    def test_id_type_mismatch_is_handled(self, mock_get):
        """API returns string ids, DB stores ints (or vice versa)."""
        make_view(drivebc_webcam_id=1,
                  last_update_attempt=self.old, last_update_modified=self.old)
        mock_get.return_value = self._mock_response([
            {"id": "1", "last_update_attempt": iso(self.now), "last_update_modified": iso(self.now)},
        ])

        sync_webcam_logs()

        self.assertEqual(CameraLog.objects.count(), 1)


class PollWebcamLogsTests(TestCase):
    @patch(f"{MODULE}.sync_webcam_logs")
    def test_calls_sync(self, mock_sync):
        poll_webcam_logs.call_local()
        mock_sync.assert_called_once()

    @patch(f"{MODULE}.sync_webcam_logs", side_effect=RuntimeError("boom"))
    def test_logs_and_reraises(self, _mock_sync):
        with self.assertLogs(MODULE, level="ERROR") as cm:
            with self.assertRaises(RuntimeError):
                poll_webcam_logs.call_local()
        self.assertTrue(any("failed" in m for m in cm.output))