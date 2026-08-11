from django.db import models

class Camera(models.Model):
    # ============================================================
    # Internet
    # ============================================================

    internet_name = models.CharField(max_length=255, null=True, blank=True)
    internet_caption = models.CharField(max_length=255, null=True, blank=True)
    internet_credit = models.CharField(max_length=255, null=True, blank=True)
    internet_comments = models.TextField(null=True, blank=True)
    internet_website_url = models.CharField(max_length=255, null=True, blank=True)
    internet_getfile2_url = models.CharField(max_length=255, null=True, blank=True)
    internet_drivebc_url = models.CharField(max_length=255, null=True, blank=True)
    internet_ftp_path = models.CharField(max_length=255, null=True, blank=True)
    internet_ftp_folder = models.CharField(max_length=255, null=True, blank=True)
    internet_ftp_filename = models.CharField(max_length=255, null=True, blank=True)
    internet_display_folder = models.CharField(max_length=255, null=True, blank=True)
    internet_display_filename = models.CharField(max_length=50, null=True, blank=True)
    internet_contact_notes = models.TextField(null=True, blank=True)
    internet_dbc_mark = models.CharField(max_length=50, null=True, blank=True)
    internet_inset_horizontal = models.BooleanField()
    internet_updated_by = models.CharField(max_length=50, null=True, blank=True)
    internet_last_updated = models.DateTimeField(null=True, blank=True)

    # ============================================================
    # Locations
    # ============================================================

    locations_region = models.CharField(max_length=50, null=True, blank=True)
    locations_business_area = models.CharField(max_length=50, null=True, blank=True)
    locations_highway = models.CharField(max_length=50, null=True, blank=True)
    locations_highway_section = models.CharField(max_length=255, null=True, blank=True)
    locations_orientation = models.CharField(max_length=50, null=True, blank=True)
    locations_landmark = models.CharField(max_length=255, null=True, blank=True)
    locations_crossroad = models.CharField(max_length=255, null=True, blank=True)
    locations_elevation = models.CharField(max_length=50, null=True, blank=True)
    locations_cam_group = models.CharField(max_length=50, null=True, blank=True)
    locations_geo_latitude = models.CharField(max_length=32, null=True, blank=True)
    locations_geo_longitude = models.CharField(max_length=32, null=True, blank=True)
    locations_albers_northing = models.CharField(max_length=255, null=True, blank=True)
    locations_albers_easting = models.CharField(max_length=255, null=True, blank=True)
    locations_segment = models.CharField(max_length=255, null=True, blank=True)
    locations_lrs_node = models.CharField(max_length=255, null=True, blank=True)
    locations_dd = models.CharField(max_length=255, null=True, blank=True)
    locations_map_art_no = models.CharField(max_length=255, null=True, blank=True)
    locations_thumbnail_map_url = models.CharField(max_length=255, null=True, blank=True)
    locations_regional_map_url = models.CharField(max_length=255, null=True, blank=True)
    locations_updated_by = models.CharField(max_length=255, null=True, blank=True)
    locations_last_updated = models.DateTimeField(null=True, blank=True)
    locations_weather_station = models.CharField(max_length=255, null=True, blank=True)
    locations_forecast_id = models.CharField(max_length=255, null=True, blank=True)

    # ============================================================
    # Maintenance
    # ============================================================

    maintenance_asset_no = models.CharField(max_length=255, null=True, blank=True)
    maintenance_camera_make = models.CharField(max_length=255, null=True, blank=True)
    maintenance_sn = models.CharField(max_length=255, null=True, blank=True)
    maintenance_local_ip = models.CharField(max_length=255, null=True, blank=True)
    maintenance_credentials = models.CharField(max_length=255, null=True, blank=True)
    maintenance_public_ip = models.CharField(max_length=255, null=True, blank=True)
    maintenance_upload_image = models.CharField(max_length=255, null=True, blank=True)
    maintenance_uploads_every = models.CharField(max_length=255, null=True, blank=True)
    maintenance_link_check = models.CharField(max_length=255, null=True, blank=True)
    maintenance_comm_tech = models.CharField(max_length=255, null=True, blank=True)
    maintenance_comm_device = models.CharField(max_length=255, null=True, blank=True)
    maintenance_service_provider = models.CharField(max_length=255, null=True, blank=True)
    maintenance_modem_ip = models.CharField(max_length=255, null=True, blank=True)
    maintenance_signal = models.CharField(max_length=255, null=True, blank=True)
    maintenance_modem_esn = models.CharField(max_length=255, null=True, blank=True)
    maintenance_msl = models.CharField(max_length=255, null=True, blank=True)
    maintenance_antennae = models.CharField(max_length=255, null=True, blank=True)
    maintenance_modem_phone = models.CharField(max_length=255, null=True, blank=True)
    maintenance_ps_sn = models.CharField(max_length=255, null=True, blank=True)
    maintenance_baud_rate = models.CharField(max_length=255, null=True, blank=True)

    maintenance_month_implemented = models.CharField(
        max_length=255, null=True, blank=True
    )
    maintenance_day_implemented = models.CharField(
        max_length=255, null=True, blank=True
    )
    maintenance_year_implemented = models.CharField(
        max_length=255, null=True, blank=True
    )

    maintenance_month_installed = models.CharField(
        max_length=50, null=True, blank=True
    )
    maintenance_day_installed = models.CharField(
        max_length=50, null=True, blank=True
    )
    maintenance_year_installed = models.CharField(
        max_length=50, null=True, blank=True
    )

    maintenance_month_modem = models.CharField(
        max_length=50, null=True, blank=True
    )
    maintenance_day_modem = models.CharField(
        max_length=50, null=True, blank=True
    )
    maintenance_year_modem = models.CharField(
        max_length=50, null=True, blank=True
    )

    maintenance_signal_strength = models.CharField(
        max_length=255, null=True, blank=True
    )
    maintenance_owner = models.CharField(max_length=255, null=True, blank=True)
    maintenance_alternate_owner = models.CharField(
        max_length=255, null=True, blank=True
    )
    maintenance_maint_notes = models.CharField(
        max_length=255, null=True, blank=True
    )
    maintenance_notes = models.TextField(null=True, blank=True)
    maintenance_hardware_notes = models.TextField(null=True, blank=True)

