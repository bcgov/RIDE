"""
Management command: one-time import of legacy camera data from the MSSQL
`Cams_Live` (+ `Regions_Live`, `Highways_Live`) tables into the Django
(Postgres) database.

Place this file at:
    <your_app>/management/commands/import_legacy_cameras.py
(create empty __init__.py files in management/ and management/commands/
if they don't already exist)

Usage:
    python manage.py import_legacy_cameras --dry-run
    python manage.py import_legacy_cameras --limit 50 --dry-run
    python manage.py import_legacy_cameras

Required environment variables (add to your .env / workflow secrets):
    LEGACY_SQL_SERVER_HOST
    LEGACY_SQL_SERVER_DB        (defaults to "WEBCAM_TST")
    LEGACY_SQL_SERVER_USER
    LEGACY_SQL_SERVER_PASSWORD
    LEGACY_SQL_SERVER_DRIVER    (defaults to "{ODBC Driver 17 for SQL Server}")

Requires the `pyodbc` package and an ODBC driver for SQL Server installed
on the machine/container this runs on.
"""

import os
from datetime import datetime

import pyodbc
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

# Adjust this import to match your actual app name / models module.
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
"""


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
        f"UID={user};PWD={password}"
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
    help = "One-time import of legacy camera data from the MSSQL Cams_Live table."

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
            f"{len(region_map)} regions, {len(road_map)} roads."
            f"{len(business_area_map)} business areas."
        )

        imported, skipped, errors = 0, 0, []

        with transaction.atomic():
            for row in rows:
                try:
                    # self._import_row(row, region_map, road_map, dry_run)
                    self._import_row(
                        row,
                        region_map,
                        road_map,
                        business_area_map,
                        dry_run,
                    )
                    imported += 1
                except Exception as exc:  # noqa: BLE001 - collect and continue past bad rows
                    skipped += 1
                    errors.append((row.get("ID"), str(exc)))

            if dry_run:
                self.stdout.write(self.style.WARNING("Dry run: rolling back transaction."))
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(f"Imported {imported} cameras, skipped {skipped}."))
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

    def _import_row(self, row, region_map, road_map, business_area_map, dry_run):
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
                    "description": clean_str(
                        business_area_row.get("Description")
                    ),
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
            visible=not bool(row.get("Cam_ControlDisabled")),
            region=region,
            road=road,
            business_area=business_area,
            power_source=power_source,
            camera_credit=clean_str(row.get("Cam_InternetCredit"), 255),
            camera_credit_url=clean_str(row.get("Cam_InternetWebsite_URL"), 500) or None,
            locations_geo_latitude=row.get("Cam_LocationsGeo_Latitude"),
            locations_geo_longitude=row.get("Cam_LocationsGeo_Longitude"),
            locations_elevation=row.get("Cam_LocationsElevation"),
            # ASSUMPTION: modem ESN doubles as the closest legacy equivalent
            # of a MAC address. Verify against real data / hardware docs.
            mac_address=clean_str(row.get("Cam_MaintenanceModem_ESN"), 50),
            # ASSUMPTION: on-demand credentials map to the generic
            # username/password fields. Adjust if these serve a different
            # purpose (e.g. FTP credentials via Cam_MaintenanceCredentials).
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
            return

        camera.save()

        image_url = (
            clean_str(row.get("Cam_InternetGetfile2_URL"))
            or clean_str(row.get("Cam_InternetDriveBC_URL"))
            or None
        )
        CameraView.objects.create(
            camera=camera,
            orientation=clean_str(row.get("Cam_LocationsOrientation"), 50).upper(),
            image_url=image_url,
            disabled_short_description=clean_str(row.get("Cam_ControlShort_Message"), 255),
            disabled_long_description=clean_str(row.get("Cam_ControlLong_Message")),
            is_on=not bool(row.get("Cam_ControlDisabled")),
            is_default=True,
            drivebc_webcam_id=row.get("ID"),
        )
