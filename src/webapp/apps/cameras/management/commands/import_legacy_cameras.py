"""
Management command: one-time import of legacy camera data from the MSSQL
`Cams_Live` (+ `Regions_Live`, `Highways_Live`) tables into the Django
(Postgres) database.

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

import pyodbc
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.cameras.models import Camera, CameraView, Region, Road, PowerSource, BusinessArea


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
      ,[Cam_LocationsRegion]
      ,[Cam_LocationsBusiness_Area]
      ,[Cam_LocationsHighway]
      ,[Cam_LocationsOrientation]
      ,[Cam_LocationsElevation]
      ,[Cam_LocationsGeo_Latitude]
      ,[Cam_LocationsGeo_Longitude]
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


def parse_date(year, month, day):
    """Builds a datetime from separate legacy year/month/day columns."""
    try:
        if not year or not month or not day:
            return None
        return datetime(int(year), int(month), int(day))
    except (TypeError, ValueError):
        return None


def clean_str(value, max_length=None):
    if value is None:
        return ""
    value = str(value).strip()
    if max_length:
        value = value[:max_length]
    return value


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
            rows = self._load_cams(conn, limit)
        finally:
            conn.close()

        self.stdout.write(
            f"Fetched {len(rows)} legacy camera rows, "
            f"{len(region_map)} regions, {len(road_map)} roads, "
            f"{len(business_area_map)} business areas."
        )

        imported_cameras, imported_views, already_imported = 0, 0, 0
        skipped, errors = 0, []
        camera_cache = {}  # (lat, lon) -> Camera

        with transaction.atomic():
            for row in rows:
                try:
                    with transaction.atomic():  # per-row savepoint
                        new_camera, new_view = self._import_row(
                            row,
                            region_map,
                            road_map,
                            business_area_map,
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

            if dry_run:
                self.stdout.write(self.style.WARNING("Dry run: rolling back transaction."))
                transaction.set_rollback(True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {imported_cameras} cameras with {imported_views} views, "
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
    def _load_cams(conn, limit):
        cursor = conn.cursor()
        query = CAMS_QUERY
        if limit:
            query = query.replace("SELECT [ID]", f"SELECT TOP ({limit}) [ID]", 1)
        cursor.execute(query)
        return rows_as_dicts(cursor)

    def _import_row(self, row, region_map, road_map, business_area_map, camera_cache, dry_run):
        """
        Returns (new_camera, new_view) booleans.

        - First row at a location: creates the Camera and its first (default) view.
        - Later rows at the same location: only add a CameraView to that Camera.
        - Rows already imported (re-runs): no-op.
        """
        legacy_id = row.get("ID")

        # Re-run safety: skip legacy rows that were already imported.
        # Checked first so we never create an orphan camera for a row whose
        # view already exists.
        if not dry_run and CameraView.objects.filter(drivebc_webcam_id=legacy_id).exists():
            return False, False

        key = location_key(row)
        camera = camera_cache.get(key) if key else None

        # Re-run safety: reuse a camera already in the DB at this location.
        if camera is None and key and not dry_run:
            eps = 1e-6
            camera = Camera.objects.filter(
                locations_geo_latitude__range=(key[0] - eps, key[0] + eps),
                locations_geo_longitude__range=(key[1] - eps, key[1] + eps),
            ).first()

        is_enabled = not bool(row.get("Cam_ControlDisabled"))

        if camera is not None:
            # Existing camera: only add a view.
            new_camera = False
            if is_enabled and not camera.visible and not dry_run:
                camera.visible = True  # visible if ANY of its views is enabled
                camera.save(update_fields=["visible"])
        else:
            new_camera = True

            region = None
            region_id = row.get("Cam_LocationsRegion")
            if region_id and region_id in region_map:
                region, _ = Region.objects.get_or_create(
                    name=clean_str(region_map[region_id].get("Name")) or f"Region {region_id}",
                )

            road = None
            road_id = row.get("Cam_LocationsHighway")
            if road_id and road_id in road_map:
                road_row = road_map[road_id]
                hwy_number = clean_str(road_row.get("Hwy_Number"))
                # Highways_Live has one row per highway *section*; sections
                # sharing the same Hwy_Number collapse into a single Road,
                # since the Road model has no per-section field.
                road_name = f"Hwy {hwy_number}" if hwy_number else (
                    clean_str(road_row.get("Description")) or f"Road {road_id}"
                )
                road, _ = Road.objects.get_or_create(
                    name=road_name,
                    defaults={"code": road_name},
                )

            business_area = None
            business_area_id = row.get("Cam_LocationsBusiness_Area")
            if business_area_id and business_area_id in business_area_map:
                business_area_row = business_area_map[business_area_id]
                business_area_name = (
                    clean_str(business_area_row.get("Name"))
                    or f"Business Area {business_area_id}"
                )
                business_area, _ = BusinessArea.objects.get_or_create(
                    name=business_area_name,
                    defaults={
                        "description": clean_str(business_area_row.get("Description")),
                    },
                )

            power_source = None
            power_source_name = clean_str(row.get("Cam_HydroPower_Source"))
            if power_source_name:
                power_source, _ = PowerSource.objects.get_or_create(name=power_source_name)

            camera_installed = parse_date(
                row.get("Cam_MaintenanceYear_Installed"),
                row.get("Cam_MaintenanceMonth_Installed"),
                row.get("Cam_MaintenanceDay_Installed"),
            )
            modem_installed = parse_date(
                row.get("Cam_MaintenanceYear_Modem"),
                row.get("Cam_MaintenanceMonth_Modem"),
                row.get("Cam_MaintenanceDay_Modem"),
            )

            camera = Camera(
                title=clean_str(row.get("Cam_InternetName"), 255),
                description=clean_str(row.get("Cam_InternetCaption"), 255),
                visible=is_enabled,
                region=region,
                road=road,
                business_area=business_area,
                power_source=power_source,
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
                camera_installed=camera_installed,
                modem_installed=modem_installed,
                on_demand=bool(row.get("Cam_MaintenanceIs_On_Demand")),
                update_frequency=row.get("Cam_MaintenanceUploads_Every") or 0,
                display_order=row.get("seq") or 0,
            )

            if dry_run:
                camera.full_clean(exclude=["mac_address"])  # cheap sanity check without saving
            else:
                camera.save()

        if dry_run:
            # Cache the unsaved camera so later rows at the same location
            # are counted as extra views rather than new cameras.
            if key:
                camera_cache[key] = camera
            return new_camera, True

        image_url = f"https://www.drivebc.ca/images/{legacy_id}.jpg"
        has_views = (not new_camera) and CameraView.objects.filter(camera=camera).exists()

        CameraView.objects.create(
            camera=camera,
            orientation=clean_str(row.get("Cam_LocationsOrientation"), 50).upper(),
            image_url=image_url,
            disabled_short_description=clean_str(row.get("Cam_ControlShort_Message"), 255),
            disabled_long_description=clean_str(row.get("Cam_ControlLong_Message")),
            is_on=is_enabled,
            is_default=not has_views,  # only the first view is the default
            drivebc_webcam_id=legacy_id,
        )

        # Populate the cache LAST, so a failed row (rolled back by the savepoint)
        # never leaves a stale, unsaved camera in the cache.
        if key:
            camera_cache[key] = camera
        return new_camera, True
