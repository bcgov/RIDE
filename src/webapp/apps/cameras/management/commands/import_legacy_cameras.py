"""
Management command: one-time import of legacy camera data from the MSSQL
`Cams_Live` (+ `Regions_Live`, `Highways_Live`, `Cam_Maintenance`, `Cams`)
tables into the Django (Postgres) database.

Legacy rows that share the same latitude/longitude are merged into ONE
Camera with several CameraViews (one view per legacy row).

Usage:
    python manage.py import_legacy_cameras --dry-run
    python manage.py import_legacy_cameras --limit 50 --dry-run
    python manage.py import_legacy_cameras

Requires the `pyodbc` package and an ODBC driver for SQL Server installed
on the machine/container this runs on.
"""

import os
from datetime import datetime
from django.utils import timezone
import pyodbc
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.cameras.models import (
    Antenna,
    BusinessArea,
    Camera,
    CameraMake,
    CameraView,
    CommunicationDevice,
    CommunicationType,
    ElectricalContractor,  # NOTE: adjust to your actual model name/location
    PowerSource,
    Region,
    Road,
    RoadMaintenanceContractor,
    ServiceProvider,
)
from collections import defaultdict

# The 8 view slots every camera gets.
ORIENTATION_CODES = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"]

ORIENTATION_ALIASES = {
    "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W",
    "NORTHEAST": "NE", "NORTHWEST": "NW",
    "SOUTHEAST": "SE", "SOUTHWEST": "SW",
}


def normalize_orientation(value):
    """'North', 'north-east', 'ne' -> 'N', 'NE', 'NE'. Unknown values pass through."""
    v = clean_str(value, 50).upper().replace("-", "").replace("_", "").replace(" ", "")
    return ORIENTATION_ALIASES.get(v, v)


# ---------------------------------------------------------------------------
# Regions_Live: ID, Name, seq, abbrev, upsize_ts -- confirmed schema.
# Highways_Live: ID, Hwy_Number, Section, Number, Description, seq,
# upsize_ts -- confirmed schema. There's no Name column, and each row is a
# highway *section*, so multiple rows share the same Hwy_Number. Since the
# Road model has no "section" concept, sections with the same Hwy_Number
# are collapsed into a single Road below (see _import_row).
# ---------------------------------------------------------------------------
REGION_QUERY = "SELECT [ID], [Name] FROM [WEBCAM_TST].[dbo].[Regions_Live]"
ROAD_QUERY = "SELECT [ID], [Hwy_Number], [Section], [Description] FROM [WEBCAM_TST].[dbo].[Highways_Live]"
BUSINESS_AREA_QUERY = """
SELECT [ID], [Name], [Description]
FROM [WEBCAM_TST].[dbo].[Business_Areas]
"""
CAMERA_MAKE_QUERY = "SELECT [ID] FROM [WEBCAM_TST].[dbo].[Camera_Makes]"

# Cam_Maintenance holds the richer communication/hardware details per physical
# camera. Only the columns we use are selected. Rows are matched to Cams_Live via
# Cam_Maintenance.Serial_MAC <-> Cams_Live.Cam_MaintenanceSN.
MAINTENANCE_QUERY = """
SELECT [ID]
      ,[Cam_Make]
      ,[Serial_MAC]
      ,[Comm_Tech]
      ,[Comm_Device]
      ,[Provider]
      ,[Antenna]
  FROM [WEBCAM_TST].[dbo].[Cam_Maintenance]
  ORDER BY [ID]
"""

# ORDER BY [ID] makes the import deterministic: when several legacy rows share
# a location, the lowest ID always supplies the camera-level fields.
CAMS_QUERY = """
SELECT [ID]
      ,[Cam_InternetName]
      ,[Cam_InternetCaption]
      ,[Cam_InternetCredit]
      ,[Cam_InternetComments]
      ,[Cam_InternetWebsite_URL]
      ,[Cam_InternetGetfile2_URL]
      ,[Cam_InternetDriveBC_URL]
      ,[Cam_InternetDBC_Mark]
      ,[Cam_LocationsRegion]
      ,[Cam_LocationsBusiness_Area]
      ,[Cam_LocationsHighway]
      ,[Cam_LocationsOrientation]
      ,[Cam_LocationsElevation]
      ,[Cam_LocationsGeo_Latitude]
      ,[Cam_LocationsGeo_Longitude]
      ,[Cam_MaintenanceCamera_Make]
      ,[Cam_MaintenanceSN]
      ,[Cam_MaintenanceCredentials]
      ,[Cam_MaintenancePublic_IP]
      ,[Cam_MaintenanceUploads_Every]
      ,[Cam_MaintenanceComm_Tech]
      ,[Cam_MaintenanceComm_Device]
      ,[Cam_MaintenanceService_Provider]
      ,[Cam_MaintenanceModem_ESN]
      ,[Cam_MaintenanceAntennae]
      ,[Cam_MaintenanceModem_Phone]
      ,[Cam_MaintenanceBaud_Rate]
      ,[Cam_MaintenanceMonth_Installed]
      ,[Cam_MaintenanceDay_Installed]
      ,[Cam_MaintenanceYear_Installed]
      ,[Cam_MaintenanceMonth_Modem]
      ,[Cam_MaintenanceDay_Modem]
      ,[Cam_MaintenanceYear_Modem]
      ,[Cam_MaintenanceIs_On_Demand]
      ,[Cam_HydroPower_Source]
      ,[Cam_InstallationActivation_Month]
      ,[Cam_InstallationActivation_Day]
      ,[Cam_InstallationActivation_Year]
      ,[Cam_ControlShort_Message]
      ,[Cam_ControlLong_Message]
      ,[Cam_ControlDisabled]
      ,[Cam_InternetOn_Demand_Username]
      ,[Cam_InternetOn_Demand_Password]
      ,[seq]
  FROM [WEBCAM_TST].[dbo].[Cams_Live]
  ORDER BY [ID]
"""

# Extra per-camera info that only exists on the `Cams` table: road maintenance
# owner, electrical (hydro technical) contact and power source. Keyed by the
# legacy camera ID, so this assumes Cams.ID matches Cams_Live.ID.
CAMS_EXTRA_QUERY = """
SELECT [ID]
      ,[Cam_MaintenanceOwner]
      ,[Cam_HydroTechnical_Contact]
      ,[Cam_HydroPower_Source]
      ,[Cam_MaintenanceMonth_Installed]
      ,[Cam_MaintenanceDay_Installed]
      ,[Cam_MaintenanceYear_Installed]
      ,[Cam_MaintenanceMonth_Modem]
      ,[Cam_MaintenanceDay_Modem]
      ,[Cam_MaintenanceYear_Modem]
  FROM [WEBCAM_TST].[dbo].[Cams]
"""
CONTACTS_QUERY = "SELECT [ID], [Alias] FROM [WEBCAM_TST].[dbo].[Contacts]"


def to_float_or_none(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def location_key(row):
    """Rounded (lat, lon) tuple, or None if the row has no usable coordinates."""
    lat = to_float_or_none(row.get("Cam_LocationsGeo_Latitude"))
    lon = to_float_or_none(row.get("Cam_LocationsGeo_Longitude"))
    if lat is None or lon is None or (lat == 0 and lon == 0):
        return None  # never merge cameras that have no real location
    # Rounding avoids float noise (49.1234560001 vs 49.123456)
    return (round(lat, 6), round(lon, 6))


def get_legacy_connection():
    try:
        server = os.environ["LEGACY_SQL_SERVER_HOST"]
        user = os.environ["LEGACY_SQL_SERVER_USER"]
        password = os.environ["LEGACY_SQL_SERVER_PASSWORD"]

    except KeyError as exc:
        raise CommandError(f"Missing required environment variable: {exc}") from exc

    database = os.environ.get("LEGACY_SQL_SERVER_DB", "WEBCAM_TST")
    driver = os.environ.get("LEGACY_SQL_SERVER_DRIVER", "{ODBC Driver 18 for SQL Server}")

    conn_str = (
        f"DRIVER={driver};SERVER={server};DATABASE={database};"
        f"UID={user};PWD={password};"
        f"Encrypt=yes;TrustServerCertificate=yes"
    )
    return pyodbc.connect(conn_str)


MONTH_NAMES = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


def to_int_or_none(value):
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None

def parse_date(year, month, day):
    """Builds a timezone-aware datetime from separate legacy year/month/day columns."""
    if isinstance(month, str) and month.strip()[:3].upper() in MONTH_NAMES:
        month = MONTH_NAMES[month.strip()[:3].upper()]

    year, month, day = to_int_or_none(year), to_int_or_none(month), to_int_or_none(day)
    if not year or not month or not day:
        return None
    if year < 100:  # 98 -> 1998, 12 -> 2012
        year += 2000 if year < 70 else 1900
    try:
        return timezone.make_aware(datetime(year, month, day))
    except ValueError:  # e.g. Feb 30
        return None


def clean_str(value, max_length=None):
    if value is None:
        return ""
    value = str(value).strip()
    if max_length:
        value = value[:max_length]
    return value


def normalize_key(value):
    """Normalised serial/MAC used to join Cams_Live to Cam_Maintenance."""
    return clean_str(value).upper()


def get_or_create_named(model, name):
    """Returns a `model` instance with the given name, or None for blank names."""
    name = clean_str(name)
    if not name:
        return None
    obj, _ = model.objects.get_or_create(name=name)
    return obj

def get_camera_installed(row, cams_extra_map):
    extra = cams_extra_map.get(row.get("ID")) or {}
    return parse_date(
        extra.get("Cam_MaintenanceYear_Installed"),
        extra.get("Cam_MaintenanceMonth_Installed"),
        extra.get("Cam_MaintenanceDay_Installed"),
    )


def get_modem_installed(row, cams_extra_map):
    extra = cams_extra_map.get(row.get("ID")) or {}
    return parse_date(
        extra.get("Cam_MaintenanceYear_Modem"),
        extra.get("Cam_MaintenanceMonth_Modem"),
        extra.get("Cam_MaintenanceDay_Modem"),
    )

def rows_as_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


class Command(BaseCommand):
    help = (
        "One-time import of legacy camera data from the MSSQL Cams_Live table. "
        "Legacy rows at the same lat/lon become one Camera with multiple CameraViews."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report without writing to the database (rolls back the transaction).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process the first N legacy rows (useful for testing the mapping).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]

        conn = get_legacy_connection()
        try:
            region_map = self._load_lookup(conn, REGION_QUERY)
            road_map = self._load_lookup(conn, ROAD_QUERY)
            business_area_map = self._load_lookup(conn, BUSINESS_AREA_QUERY)
            camera_make_map = self._load_lookup(conn, CAMERA_MAKE_QUERY)
            maintenance_map = self._load_maintenance(conn)
            contacts_map = self._load_lookup(conn, CONTACTS_QUERY)
            cams_extra_map = self._load_lookup(conn, CAMS_EXTRA_QUERY)
            rows = self._load_cams(conn, limit)
        finally:
            conn.close()

        
        unresolved_contacts = self._resolve_contact_aliases(cams_extra_map, contacts_map)
        if unresolved_contacts:
            self.stdout.write(self.style.WARNING(
                f"{unresolved_contacts} cameras reference a technical contact "
                f"ID that was not found in Contacts (left blank)."
            ))

        self.stdout.write(
            f"Fetched {len(rows)} legacy camera rows, "
            f"{len(region_map)} regions, {len(road_map)} roads, "
            f"{len(business_area_map)} business areas, "
            f"{len(camera_make_map)} camera makes, "
            f"{len(maintenance_map)} maintenance records, "
            f"{len(cams_extra_map)} contractor/power-source records."
        )

        imported_cameras, imported_views, already_imported = 0, 0, 0
        skipped, errors = 0, []
        camera_cache = {}  # (lat, lon) -> Camera
        placeholder_views = 0
        with transaction.atomic():
            for row in rows:
                try:
                    with transaction.atomic():  # per-row savepoint
                        new_camera, new_view = self._import_row(
                            row,
                            region_map,
                            road_map,
                            business_area_map,
                            maintenance_map,
                            cams_extra_map,
                            camera_cache,
                            dry_run,
                        )
                    imported_cameras += int(new_camera)
                    imported_views += int(new_view)
                    if not new_view:
                        already_imported += 1
                except Exception as exc:  # noqa: BLE001 - collect and continue past bad rows
                    skipped += 1
                    errors.append((row.get("ID"), str(exc)))

            if not dry_run:
                placeholder_views = self._create_placeholder_views()
            if dry_run:
                self.stdout.write(self.style.WARNING("Dry run: rolling back transaction."))
                transaction.set_rollback(True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {imported_cameras} cameras with {imported_views} views, "
                f"{placeholder_views} empty placeholder views, "
                f"skipped {skipped} (errors), {already_imported} already imported."
            )
        )
        for legacy_id, message in errors[:20]:
            self.stdout.write(self.style.WARNING(f"  legacy ID {legacy_id}: {message}"))
        if len(errors) > 20:
            self.stdout.write(f"  ... and {len(errors) - 20} more errors")

    @staticmethod
    def _load_lookup(conn, query):
        cursor = conn.cursor()
        cursor.execute(query)
        rows = rows_as_dicts(cursor)
        # Keyed by the legacy table's ID column for FK resolution below.
        return {row["ID"]: row for row in rows}

    @staticmethod
    def _load_maintenance(conn):
        """
        Cam_Maintenance rows keyed by normalised Serial_MAC. If several rows
        share a serial, the lowest ID wins (query is ordered by ID).
        """
        cursor = conn.cursor()
        cursor.execute(MAINTENANCE_QUERY)
        maintenance = {}
        for row in rows_as_dicts(cursor):
            key = normalize_key(row.get("Serial_MAC"))
            if key and key not in maintenance:
                maintenance[key] = row
        return maintenance

    @staticmethod
    def _load_cams(conn, limit):
        cursor = conn.cursor()
        query = CAMS_QUERY
        if limit:
            query = query.replace("SELECT [ID]", f"SELECT TOP ({limit}) [ID]", 1)
        cursor.execute(query)
        return rows_as_dicts(cursor)

    def _import_row(
        self,
        row,
        region_map,
        road_map,
        business_area_map,
        maintenance_map,
        cams_extra_map,
        camera_cache,
        dry_run,
    ):
        """
        Returns (new_camera, new_view) booleans.

        - First row at a location: creates the Camera and its first (default) view.
        - Later rows at the same location: only add a CameraView to that Camera.
        - Rows already imported (re-runs): no new view, but the camera's empty
          contractor / power source fields are backfilled.
        """
        legacy_id = row.get("ID")

        # Re-run safety: skip legacy rows that were already imported, but still
        # backfill the contractor / power source on the camera they belong to.
        if not dry_run:
            existing_view = (
                CameraView.objects.filter(drivebc_webcam_id=legacy_id)
                .select_related("camera")
                .first()
            )
            if existing_view is not None:
                camera = existing_view.camera
                update_fields = self._backfill_extras(camera, row, cams_extra_map)
                if update_fields:
                    camera.save(update_fields=update_fields)
                return False, False

        key = location_key(row)
        camera = self._find_existing_camera(key, camera_cache, dry_run)
        is_enabled = not bool(row.get("Cam_ControlDisabled"))
        new_camera = camera is None

        if new_camera:
            camera = self._build_camera(
                row, is_enabled, region_map, road_map, business_area_map,
                maintenance_map, cams_extra_map
            )
            if dry_run:
                camera.full_clean(exclude=["mac_address"])  # sanity check without saving
            else:
                camera.save()
        elif not dry_run:
            update_fields = []
            if is_enabled and not camera.visible:
                camera.visible = True  # visible if ANY of its views is enabled
                update_fields.append("visible")
            update_fields += self._backfill_extras(camera, row, cams_extra_map)
            if update_fields:
                camera.save(update_fields=update_fields)

        if not dry_run:
            self._create_view(row, camera, legacy_id, is_enabled, new_camera)

        # Populate the cache LAST, so a failed row (rolled back by the savepoint)
        # never leaves a stale, unsaved camera in the cache. In a dry run the
        # unsaved camera is cached so later rows at the same location count as
        # extra views rather than new cameras.
        if key:
            camera_cache[key] = camera
        return new_camera, True

    @staticmethod
    def _find_existing_camera(key, camera_cache, dry_run):
        if not key:
            return None

        camera = camera_cache.get(key)
        if camera is not None or dry_run:
            return camera

        # Re-run safety: reuse a camera already in the DB at this location.
        eps = 1e-6
        return Camera.objects.filter(
            locations_geo_latitude__range=(key[0] - eps, key[0] + eps),
            locations_geo_longitude__range=(key[1] - eps, key[1] + eps),
        ).first()

    @staticmethod
    def _get_region(row, region_map):
        region_id = row.get("Cam_LocationsRegion")
        if not region_id or region_id not in region_map:
            return None
        region, _ = Region.objects.get_or_create(
            name=clean_str(region_map[region_id].get("Name")) or f"Region {region_id}",
        )
        return region

    @staticmethod
    def _get_road(row, road_map):
        road_id = row.get("Cam_LocationsHighway")
        if not road_id or road_id not in road_map:
            return None

        road_row = road_map[road_id]
        hwy_number = clean_str(road_row.get("Hwy_Number"))
        # Highways_Live has one row per highway *section*; sections sharing the
        # same Hwy_Number collapse into a single Road.
        if hwy_number:
            road_name = f"Hwy {hwy_number}"
        else:
            road_name = clean_str(road_row.get("Description")) or f"Road {road_id}"

        road, _ = Road.objects.get_or_create(name=road_name, defaults={"code": road_name})
        return road

    @staticmethod
    def _get_business_area(row, business_area_map):
        area_id = row.get("Cam_LocationsBusiness_Area")
        if not area_id or area_id not in business_area_map:
            return None

        area_row = business_area_map[area_id]
        area_name = clean_str(area_row.get("Name")) or f"Business Area {area_id}"
        business_area, _ = BusinessArea.objects.get_or_create(
            name=area_name,
            defaults={"description": clean_str(area_row.get("Description"))},
        )
        return business_area

    @staticmethod
    def _get_road_contractor(row, cams_extra_map):
        """Road maintenance contractor from Cams.Cam_MaintenanceOwner."""
        extra = cams_extra_map.get(row.get("ID")) or {}
        return get_or_create_named(
            RoadMaintenanceContractor, extra.get("Cam_MaintenanceOwner")
        )

    @staticmethod
    def _get_electrical_contractor(row, cams_extra_map):
        """Electrical contractor from Cams.Cam_HydroTechnical_Contact."""
        extra = cams_extra_map.get(row.get("ID")) or {}
        return get_or_create_named(
            ElectricalContractor, extra.get("Cam_HydroTechnical_Contact")
        )

    @staticmethod
    def _get_power_source(row, cams_extra_map):
        """Power source: prefer Cams.Cam_HydroPower_Source, fall back to the
        copy on Cams_Live."""
        extra = cams_extra_map.get(row.get("ID")) or {}
        return get_or_create_named(
            PowerSource,
            extra.get("Cam_HydroPower_Source") or row.get("Cam_HydroPower_Source"),
        )

    @staticmethod
    def _resolve_contact_aliases(cams_extra_map, contacts_map):
        """
        Cams.Cam_HydroTechnical_Contact holds a Contacts.ID. Replace it in place
        with Contacts.Alias so the rest of the import sees a name. IDs that can't
        be resolved become "" (no contractor), rather than creating one named "12".
        Returns the number of unresolved IDs.
        """
        # Compare IDs as trimmed strings so 12 / "12" / "12 " all match.
        alias_by_id = {
            clean_str(contact_id): clean_str(contact.get("Alias"))
            for contact_id, contact in contacts_map.items()
        }

        unresolved = 0
        for extra in cams_extra_map.values():
            contact_id = clean_str(extra.get("Cam_HydroTechnical_Contact"))
            if not contact_id:
                extra["Cam_HydroTechnical_Contact"] = ""
                continue
            alias = alias_by_id.get(contact_id, "")
            if not alias:
                unresolved += 1
            extra["Cam_HydroTechnical_Contact"] = alias
        return unresolved

    def _backfill_extras(self, camera, row, cams_extra_map):
        """
        Fill in the camera's EMPTY road maintenance contractor, electrical
        contractor and power source (never overwrites existing values).
        Mutates `camera` and returns the list of changed field names; the
        caller is responsible for saving them.
        """
        update_fields = []

        if camera.road_maintenance_contractor_id is None:
            contractor = self._get_road_contractor(row, cams_extra_map)
            if contractor is not None:
                camera.road_maintenance_contractor = contractor
                update_fields.append("road_maintenance_contractor")

        if camera.electrical_contractor_id is None:
            contractor = self._get_electrical_contractor(row, cams_extra_map)
            if contractor is not None:
                camera.electrical_contractor = contractor
                update_fields.append("electrical_contractor")

        if camera.power_source_id is None:
            power_source = self._get_power_source(row, cams_extra_map)
            if power_source is not None:
                camera.power_source = power_source
                update_fields.append("power_source")

        return update_fields

    def _get_maintenance_refs(self, row, maintenance_map, cams_extra_map):
        """Prefer the Cam_Maintenance record (matched by serial/MAC); fall back
        to the copies stored on Cams_Live."""
        maintenance = maintenance_map.get(normalize_key(row.get("Cam_MaintenanceSN"))) or {}

        def pick(maintenance_key, row_key):
            return maintenance.get(maintenance_key) or row.get(row_key)

        return {
            "communication_type": get_or_create_named(
                CommunicationType, pick("Comm_Tech", "Cam_MaintenanceComm_Tech")),
            "communication_device": get_or_create_named(
                CommunicationDevice, pick("Comm_Device", "Cam_MaintenanceComm_Device")),
            "antenna": get_or_create_named(
                Antenna, pick("Antenna", "Cam_MaintenanceAntennae")),
            "service_provider": get_or_create_named(
                ServiceProvider, pick("Provider", "Cam_MaintenanceService_Provider")),
            "camera_make": get_or_create_named(
                CameraMake, pick("Cam_Make", "Cam_MaintenanceCamera_Make")),
            "road_maintenance_contractor": self._get_road_contractor(row, cams_extra_map),
            "electrical_contractor": self._get_electrical_contractor(row, cams_extra_map),
        }

    def _build_camera(self, row, is_enabled, region_map, road_map,
                      business_area_map, maintenance_map, cams_extra_map):
        return Camera(
            title=clean_str(row.get("Cam_InternetName"), 255),
            description=clean_str(row.get("Cam_InternetCaption"), 255),
            visible=is_enabled,
            region=self._get_region(row, region_map),
            road=self._get_road(row, road_map),
            business_area=self._get_business_area(row, business_area_map),
            power_source=self._get_power_source(row, cams_extra_map),
            **self._get_maintenance_refs(row, maintenance_map, cams_extra_map),
            camera_credit=clean_str(row.get("Cam_InternetCredit"), 255),
            camera_credit_url=clean_str(row.get("Cam_InternetWebsite_URL"), 500) or None,
            locations_geo_latitude=to_float_or_none(row.get("Cam_LocationsGeo_Latitude")),
            locations_geo_longitude=to_float_or_none(row.get("Cam_LocationsGeo_Longitude")),
            locations_elevation=to_float_or_none(row.get("Cam_LocationsElevation")),
            mac_address=clean_str(row.get("Cam_MaintenanceModem_ESN"), 50),
            username=clean_str(row.get("Cam_InternetOn_Demand_Username"), 20),
            password=clean_str(row.get("Cam_InternetOn_Demand_Password"), 20),
            serial_number=clean_str(row.get("Cam_MaintenanceSN"), 50),
            phone_number=clean_str(row.get("Cam_MaintenanceModem_Phone"), 50),
            baud_rate=row.get("Cam_MaintenanceBaud_Rate") or 0,
            connection_ip_address=clean_str(row.get("Cam_MaintenancePublic_IP")) or None,
            camera_installed=get_camera_installed(row, cams_extra_map),
            modem_installed=get_modem_installed(row, cams_extra_map),
            on_demand=bool(row.get("Cam_MaintenanceIs_On_Demand")),
            update_frequency=row.get("Cam_MaintenanceUploads_Every") or 0,
            display_order=row.get("seq") or 0,
            image_watermark=clean_str(row.get("Cam_InternetDBC_Mark")),
        )

    @staticmethod
    def _create_view(row, camera, legacy_id, is_enabled, new_camera):
        has_views = (not new_camera) and CameraView.objects.filter(camera=camera).exists()

        CameraView.objects.create(
            camera=camera,
            orientation=normalize_orientation(row.get("Cam_LocationsOrientation")),
            image_url=f"https://www.drivebc.ca/images/{legacy_id}.jpg",
            disabled_short_description=clean_str(row.get("Cam_ControlShort_Message"), 255),
            disabled_long_description=clean_str(row.get("Cam_ControlLong_Message")),
            is_on=is_enabled,
            is_default=not has_views,  # only the first view is the default
            drivebc_webcam_id=legacy_id,
        )

    def _create_placeholder_views(self):
        """
        For every camera that has legacy-imported views, add an empty view
        (blank image_url) for each of the 8 orientations it doesn't have yet.
        Safe to re-run: only missing orientations are created.
        """
        camera_ids = list(
            CameraView.objects.filter(drivebc_webcam_id__isnull=False)
            .values_list("camera_id", flat=True)
            .distinct()
        )

        existing = defaultdict(set)
        for camera_id, orientation in CameraView.objects.filter(
            camera_id__in=camera_ids
        ).values_list("camera_id", "orientation"):
            existing[camera_id].add(normalize_orientation(orientation))

        placeholders = [
            CameraView(
                camera_id=camera_id,
                orientation=code,
                image_url="",
                is_on=False,
                is_default=False,
                disabled_short_description="",
                disabled_long_description="",
                drivebc_webcam_id=None,
            )
            for camera_id in camera_ids
            for code in ORIENTATION_CODES
            if code not in existing[camera_id]
        ]
        CameraView.objects.bulk_create(placeholders, batch_size=500)
        return len(placeholders)