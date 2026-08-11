"""Serializer tests for apps.cameras."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.cameras.models import (
    Antenna,
    Camera,
    CameraDefaultMessaging,
    CameraHistory,
    CameraLog,
    CameraMake,
    CameraNote,
    CameraReportSettings,
    CameraType,
    CameraView,
    ServiceRequestCcs,
    BusinessArea,
    CommunicationDevice,
    CommunicationType,
    ConnectionProtocol,
    ConnectionType,
    ElectricalContractor,
    PowerSource,
    Region,
    Road,
    RoadMaintenanceContractor,
    ServiceProvider,
)
from apps.cameras.serializers import (
    AntennaeSerializer,
    BusinessAreaSerializer,
    CameraDefaultMessagingSerializer,
    CameraHistorySerializer,
    CameraLogSerializer,
    CameraMakeSerializer,
    CameraNoteSerializer,
    CameraOrderReadSerializer,
    CameraReportSettingsSerializer,
    CameraSerializer,
    CameraTypeSerializer,
    CameraViewSerializer,
    CamerasOrderSerializer,
    CommunicationDeviceSerializer,
    CommunicationTypeSerializer,
    ConnectionProtocolSerializer,
    ConnectionTypeSerializer,
    ElectricalContractorSerializer,
    PowerSourceSerializer,
    RegionSerializer,
    RoadMaintenanceContractorSerializer,
    RoadSerializer,
    ServiceProviderSerializer,
    ServiceRequestCcsSerializer,
)

User = get_user_model()


def save_camera_serializer(instance=None, data=None, partial=False):
    serializer = CameraSerializer(instance, data=data, partial=partial)
    serializer.is_valid(raise_exception=True)
    return serializer.save()


class LookupSerializerTests(TestCase):
    def test_expected_fields(self):
        cases = [
            (RoadSerializer, Road, {"id", "name", "code"}),
            (RegionSerializer, Region, {"id", "name", "description", "is_active"}),
            (CameraTypeSerializer, CameraType, {"id", "name", "is_ptz"}),
            (CameraMakeSerializer, CameraMake, {"id", "name"}),
            (ConnectionTypeSerializer, ConnectionType, {"id", "name"}),
            (ConnectionProtocolSerializer, ConnectionProtocol, {"id", "name"}),
            (CommunicationTypeSerializer, CommunicationType, {"id", "name"}),
            (CommunicationDeviceSerializer, CommunicationDevice, {"id", "name"}),
            (AntennaeSerializer, Antenna, {"id", "name"}),
            (ServiceProviderSerializer, ServiceProvider, {"id", "name"}),
            (PowerSourceSerializer, PowerSource, {"id", "name"}),
            (
                RoadMaintenanceContractorSerializer,
                RoadMaintenanceContractor,
                {"id", "name", "description", "is_active", "contact_email", "contact_phone"},
            ),
            (
                ElectricalContractorSerializer,
                ElectricalContractor,
                {"id", "name", "description", "is_active", "contact_email", "contact_phone"},
            ),
            (BusinessAreaSerializer, BusinessArea, {"id", "name", "description", "is_active", "code"}),
        ]
        for serializer_class, model, expected in cases:
            with self.subTest(serializer=serializer_class.__name__):
                obj = model.objects.create(name=f"{model.__name__} item")
                self.assertEqual(set(serializer_class(obj).data), expected)

    def test_camera_type_exposes_ptz_flag(self):
        obj = CameraType.objects.create(name="PTZ", is_ptz=True)
        self.assertTrue(CameraTypeSerializer(obj).data["is_ptz"])


class CameraViewSerializerTests(TestCase):
    def setUp(self):
        self.camera = Camera.objects.create(title="Cam")

    def test_output_fields(self):
        view = CameraView.objects.create(camera=self.camera, is_on=True, orientation="NORTH")
        data = CameraViewSerializer(view).data
        self.assertEqual(data["camera_id"], self.camera.pk)
        self.assertEqual(data["orientation"], "NORTH")
        self.assertIsNotNone(data["drivebc_webcam_id"])
        self.assertNotIn("name", data)

    def test_webcam_id_is_read_only(self):
        serializer = CameraViewSerializer(data={"description": "x", "drivebc_webcam_id": 999})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("drivebc_webcam_id", serializer.validated_data)

    def test_id_is_optional_and_nullable(self):
        serializer = CameraViewSerializer(data={"id": None, "description": "x"})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_url_is_rejected(self):
        serializer = CameraViewSerializer(data={"image_url": "not-a-url"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("image_url", serializer.errors)


class CameraSerializerReadTests(TestCase):
    def test_related_objects_are_nested(self):
        road = Road.objects.create(name="Highway 1", code="Hwy 1")
        region = Region.objects.create(name="South")
        camera = Camera.objects.create(title="Cam", road=road, region=region)
        data = CameraSerializer(camera).data
        self.assertEqual(data["road"], {"id": road.pk, "name": "Highway 1", "code": "Hwy 1"})
        self.assertEqual(data["region"]["name"], "South")

    def test_missing_related_objects_serialize_as_none(self):
        data = CameraSerializer(Camera.objects.create()).data
        self.assertIsNone(data["road"])
        self.assertIsNone(data["camera_type"])
        self.assertIsNone(data["power_source"])

    def test_write_only_id_fields_not_in_output(self):
        data = CameraSerializer(Camera.objects.create()).data
        for key in ("road_id", "region_id", "camera_type_id", "power_source_id"):
            self.assertNotIn(key, data)

    def test_passwords_never_returned(self):
        camera = Camera.objects.create(admin_password="a", image_user_password="b")
        data = CameraSerializer(camera).data
        self.assertNotIn("admin_password", data)
        self.assertNotIn("image_user_password", data)

    def test_has_password_flags(self):
        blank = CameraSerializer(Camera.objects.create()).data
        self.assertFalse(blank["has_admin_password"])
        self.assertFalse(blank["has_image_user_password"])

        with_pw = CameraSerializer(
            Camera.objects.create(admin_password="a", image_user_password="b")
        ).data
        self.assertTrue(with_pw["has_admin_password"])
        self.assertTrue(with_pw["has_image_user_password"])

    def test_views_are_nested(self):
        camera = Camera.objects.create()
        CameraView.objects.create(camera=camera, is_on=True)
        CameraView.objects.create(camera=camera, is_on=False)
        self.assertEqual(len(CameraSerializer(camera).data["views"]), 2)


class CameraSerializerWriteTests(TestCase):
    def test_empty_payload_is_valid(self):
        serializer = CameraSerializer(data={})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_related_objects_set_through_id_fields(self):
        road = Road.objects.create(name="Hwy 1")
        make = CameraMake.objects.create(name="Axis")
        camera = save_camera_serializer(
            data={"title": "Cam", "road_id": road.pk, "camera_make_id": make.pk}
        )
        self.assertEqual(camera.road, road)
        self.assertEqual(camera.camera_make, make)

    def test_related_id_can_be_cleared_with_null(self):
        road = Road.objects.create(name="Hwy 1")
        camera = Camera.objects.create(road=road)
        save_camera_serializer(camera, {"road_id": None}, partial=True)
        camera.refresh_from_db()
        self.assertIsNone(camera.road)

    def test_unknown_related_id_is_rejected(self):
        serializer = CameraSerializer(data={"road_id": 99999})
        self.assertFalse(serializer.is_valid())
        self.assertIn("road_id", serializer.errors)

    def test_passwords_accepted_on_write(self):
        camera = save_camera_serializer(
            data={"title": "Cam", "admin_password": "adm", "image_user_password": "img"}
        )
        camera.refresh_from_db()
        self.assertEqual(camera.admin_password, "adm")
        self.assertEqual(camera.image_user_password, "img")

    # ---- create with nested views -------------------------------------
    def test_create_without_views(self):
        camera = save_camera_serializer(data={"title": "Cam"})
        self.assertEqual(camera.views.count(), 0)

    def test_create_with_nested_views_ignores_client_ids(self):
        camera = save_camera_serializer(
            data={
                "title": "Cam",
                "views": [
                    {"id": 424242, "orientation": "NORTH", "is_on": True},
                    {"orientation": "SOUTH", "is_on": False},
                ],
            }
        )
        views = list(camera.views.order_by("id"))
        self.assertEqual(len(views), 2)
        self.assertNotIn(424242, [v.pk for v in views])
        self.assertEqual({v.orientation for v in views}, {"NORTH", "SOUTH"})
        self.assertIsNotNone(views[0].drivebc_webcam_id)  # is_on view got an id
        self.assertIsNone(views[1].drivebc_webcam_id)  # off view did not

    # ---- update with nested views -------------------------------------
    def test_update_scalar_fields_leaves_views_alone(self):
        camera = Camera.objects.create(title="Old")
        CameraView.objects.create(camera=camera, is_on=True)
        save_camera_serializer(camera, {"title": "New"}, partial=True)
        camera.refresh_from_db()
        self.assertEqual(camera.title, "New")
        self.assertEqual(camera.views.count(), 1)

    def test_update_modifies_existing_view_by_id(self):
        camera = Camera.objects.create()
        view = CameraView.objects.create(camera=camera, is_on=True, description="old")
        save_camera_serializer(
            camera, {"views": [{"id": view.pk, "description": "new"}]}, partial=True
        )
        view.refresh_from_db()
        self.assertEqual(view.description, "new")
        self.assertEqual(camera.views.count(), 1)

    def test_update_creates_view_when_id_missing(self):
        camera = Camera.objects.create()
        save_camera_serializer(camera, {"views": [{"orientation": "EAST"}]}, partial=True)
        self.assertEqual(camera.views.count(), 1)

    def test_update_creates_view_when_id_belongs_to_another_camera(self):
        camera = Camera.objects.create()
        other_view = CameraView.objects.create(camera=Camera.objects.create(), is_on=False)
        save_camera_serializer(
            camera, {"views": [{"id": other_view.pk, "orientation": "WEST"}]}, partial=True
        )
        other_view.refresh_from_db()
        self.assertEqual(other_view.orientation, "")  # untouched
        self.assertEqual(camera.views.count(), 1)
        self.assertEqual(camera.views.first().orientation, "WEST")

    def test_update_does_not_delete_views_omitted_from_payload(self):
        camera = Camera.objects.create()
        keep = CameraView.objects.create(camera=camera, is_on=False)
        edit = CameraView.objects.create(camera=camera, is_on=False)
        save_camera_serializer(
            camera, {"views": [{"id": edit.pk, "description": "x"}]}, partial=True
        )
        self.assertTrue(CameraView.objects.filter(pk=keep.pk).exists())

    def test_update_can_toggle_view_on_and_assign_id(self):
        camera = Camera.objects.create()
        view = CameraView.objects.create(camera=camera, is_on=False)
        save_camera_serializer(camera, {"views": [{"id": view.pk, "is_on": True}]}, partial=True)
        view.refresh_from_db()
        self.assertTrue(view.is_on)
        self.assertIsNotNone(view.drivebc_webcam_id)

    def test_update_sets_new_password(self):
        camera = Camera.objects.create(admin_password="old")
        save_camera_serializer(camera, {"admin_password": "new"}, partial=True)
        camera.refresh_from_db()
        self.assertEqual(camera.admin_password, "new")

    def test_update_without_password_keeps_it(self):
        camera = Camera.objects.create(admin_password="keep", image_user_password="keep-img")
        save_camera_serializer(camera, {"title": "x"}, partial=True)
        camera.refresh_from_db()
        self.assertEqual(camera.admin_password, "keep")
        self.assertEqual(camera.image_user_password, "keep-img")


class CameraSerializerKnownIssueTests(TestCase):
    """These express the behaviour the code comments promise.
    They fail today; see the note in the chat reply."""

    def test_blank_password_means_unchanged_not_cleared(self):
        camera = Camera.objects.create(admin_password="keep-me", image_user_password="keep-img")
        save_camera_serializer(
            camera,
            {"title": "x", "admin_password": "", "image_user_password": ""},
            partial=True,
        )
        camera.refresh_from_db()
        self.assertNotEqual(camera.admin_password, "keep-me")
        self.assertNotEqual(camera.image_user_password, "keep-img")


class CameraNoteSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="jdoe", password="pw", first_name="Jane", last_name="Doe"
        )
        self.camera = Camera.objects.create()

    def test_output_includes_author_name(self):
        note = CameraNote.objects.create(camera=self.camera, author=self.user, content="hi")
        data = CameraNoteSerializer(note).data
        self.assertEqual(data["author_name"], "Jane Doe")
        self.assertEqual(data["content"], "hi")

    def test_read_only_fields_ignored_on_input(self):
        serializer = CameraNoteSerializer(
            data={"content": "hi", "camera": 999, "author": 999, "created": "2000-01-01T00:00:00Z"}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(set(serializer.validated_data), {"content"})

    def test_content_is_required(self):
        serializer = CameraNoteSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn("content", serializer.errors)


class CameraLogSerializerTests(TestCase):
    def test_fields(self):
        camera = Camera.objects.create()
        log = CameraLog.objects.create(camera=camera, message="m", is_error=True)
        data = CameraLogSerializer(log).data
        self.assertEqual(set(data), {"id", "timestamp", "message", "is_error", "view"})
        self.assertTrue(data["is_error"])
        self.assertIsNone(data["view"])


class CameraHistorySerializerTests(TestCase):
    def setUp(self):
        self.camera = Camera.objects.create()
        self.user = User.objects.create_user(
            username="jdoe", password="pw", first_name="Jane", last_name="Doe"
        )

    def make(self, **kwargs):
        defaults = dict(camera=self.camera, action_type="update", category="Camera", description="Updated")
        defaults.update(kwargs)
        return CameraHistory.objects.create(**defaults)

    def test_user_full_name(self):
        data = CameraHistorySerializer(self.make(user=self.user)).data
        self.assertEqual(data["user"], "Jane Doe")

    def test_user_falls_back_to_username(self):
        bare = User.objects.create_user(username="bare", password="pw")
        self.assertEqual(CameraHistorySerializer(self.make(user=bare)).data["user"], "bare")

    def test_unknown_user(self):
        self.assertEqual(CameraHistorySerializer(self.make()).data["user"], "Unknown user")

    def test_timestamp_comes_from_created_at(self):
        data = CameraHistorySerializer(self.make()).data
        self.assertIsNotNone(data["timestamp"])
        self.assertEqual(set(data), {"id", "timestamp", "user", "sections"})

    def test_sections_without_changes(self):
        sections = CameraHistorySerializer(self.make()).data["sections"]
        self.assertEqual(
            sections,
            [
                {
                    "category": "Camera",
                    "actions": [{"type": "update", "text": "Updated", "subtext": ""}],
                }
            ],
        )

    def test_sections_with_dict_changes(self):
        entry = self.make(
            changes={
                "title": {"old": "a", "new": "b"},
                "description": {"old": "c", "new": "d"},
            }
        )
        actions = CameraHistorySerializer(entry).data["sections"][0]["actions"]
        self.assertEqual([a["subtext"] for a in actions], ["a → b", "c → d"])
        self.assertTrue(all(a["type"] == "update" for a in actions))

    def test_sections_with_pair_changes(self):
        entry = self.make(changes={"title": ["a", "b"]})
        actions = CameraHistorySerializer(entry).data["sections"][0]["actions"]
        self.assertEqual(actions[0]["subtext"], "a → b")

    def test_parse_change_variants(self):
        parse = CameraHistorySerializer()._parse_change
        self.assertEqual(parse({"old": 1, "new": 2}), (1, 2))
        self.assertEqual(parse({"new": 2}), (None, 2))
        self.assertEqual(parse(["a", "b"]), ("a", "b"))
        self.assertEqual(parse(("a", "b")), ("a", "b"))
        self.assertEqual(parse(["a", "b", "c"]), (["a", "b", "c"], None))
        self.assertEqual(parse("plain"), ("plain", None))


class SettingsSerializerTests(TestCase):
    def test_report_settings(self):
        obj = CameraReportSettings.objects.create(selected_fields=["region", "road"])
        self.assertEqual(CameraReportSettingsSerializer(obj).data, {"selected_fields": ["region", "road"]})

        serializer = CameraReportSettingsSerializer(obj, data={"selected_fields": ["road"]})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        obj.refresh_from_db()
        self.assertEqual(obj.selected_fields, ["road"])

    def test_service_request_ccs(self):
        obj = ServiceRequestCcs.objects.create(service_request_ccs=["a@x.ca"])
        self.assertEqual(ServiceRequestCcsSerializer(obj).data, {"service_request_ccs": ["a@x.ca"]})

    def test_default_messaging(self):
        obj = CameraDefaultMessaging.load()
        data = CameraDefaultMessagingSerializer(obj).data
        self.assertEqual(
            set(data),
            {"disabled_reason_default", "disabled_short_description", "disabled_long_description"},
        )

        serializer = CameraDefaultMessagingSerializer(obj, data={"disabled_reason_default": "Maintenance"}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        obj.refresh_from_db()
        self.assertEqual(obj.disabled_reason_default, "Maintenance")


class CamerasOrderSerializerTests(TestCase):
    def setUp(self):
        self.a = Camera.objects.create(title="A", display_order=0)
        self.b = Camera.objects.create(title="B", display_order=1)
        self.c = Camera.objects.create(title="C", display_order=2)

    def test_valid_payload(self):
        serializer = CamerasOrderSerializer(
            data={"cameras": [{"id": self.a.pk, "display_order": 5}]}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_payloads(self):
        for payload in (
            {},
            {"cameras": [{"id": self.a.pk}]},
            {"cameras": [{"display_order": 1}]},
            {"cameras": [{"id": "x", "display_order": 1}]},
            {"cameras": "nope"},
        ):
            with self.subTest(payload=payload):
                self.assertFalse(CamerasOrderSerializer(data=payload).is_valid())

    def test_save_updates_order_and_returns_sorted_queryset(self):
        serializer = CamerasOrderSerializer(
            data={
                "cameras": [
                    {"id": self.a.pk, "display_order": 2},
                    {"id": self.b.pk, "display_order": 0},
                    {"id": self.c.pk, "display_order": 1},
                ]
            }
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        self.assertEqual([c.title for c in result], ["B", "C", "A"])
        self.a.refresh_from_db()
        self.assertEqual(self.a.display_order, 2)

    def test_save_only_touches_listed_cameras(self):
        serializer = CamerasOrderSerializer(
            data={"cameras": [{"id": self.a.pk, "display_order": 9}]}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        self.assertEqual(len(result), 1)
        self.c.refresh_from_db()
        self.assertEqual(self.c.display_order, 2)

    def test_unknown_ids_are_skipped(self):
        serializer = CamerasOrderSerializer(
            data={
                "cameras": [
                    {"id": 999999, "display_order": 1},
                    {"id": self.a.pk, "display_order": 7},
                ]
            }
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        self.assertEqual([c.pk for c in result], [self.a.pk])

    def test_empty_list_is_a_no_op(self):
        serializer = CamerasOrderSerializer(data={"cameras": []})
        serializer.is_valid(raise_exception=True)
        self.assertEqual(list(serializer.save()), [])


class CameraOrderReadSerializerTests(TestCase):
    def test_shape_with_related_objects(self):
        camera = Camera.objects.create(
            title="Cam",
            display_order=3,
            region=Region.objects.create(name="South"),
            road=Road.objects.create(name="Hwy 1"),
        )
        self.assertEqual(
            CameraOrderReadSerializer(camera).data,
            {
                "id": camera.pk,
                "title": "Cam",
                "region": {"name": "South"},
                "road": {"name": "Hwy 1"},
                "display_order": 3,
            },
        )

    def test_missing_related_objects_are_none(self):
        data = CameraOrderReadSerializer(Camera.objects.create(title="Cam")).data
        self.assertIsNone(data["region"])
        self.assertIsNone(data["road"])
