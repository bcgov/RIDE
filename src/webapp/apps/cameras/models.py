from django.db import models


class BaseLookupModel(models.Model):
    """Abstract base class for standard lookup/reference tables."""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ["name"]

    def __str__(self):
        return self.name


class Road(BaseLookupModel):
    """MOTT managed roads and highways."""
    code = models.CharField(max_length=50, null=True, blank=True, help_text="e.g. Hwy 1, Hwy 99")

    class Meta:
        verbose_name = "Road / Highway"
        verbose_name_plural = "Roads & Highways"


class Region(BaseLookupModel):
    """Transportation regions."""
    number = models.PositiveIntegerField(null=True, blank=True)


class RoadMaintenanceContractor(BaseLookupModel):
    """Road maintenance service providers / contractors."""
    contact_email = models.EmailField(null=True, blank=True)
    contact_phone = models.CharField(max_length=30, null=True, blank=True)


class ElectricalContractor(BaseLookupModel):
    """Electrical service contractors."""
    contact_email = models.EmailField(null=True, blank=True)
    contact_phone = models.CharField(max_length=30, null=True, blank=True)


class BusinessArea(BaseLookupModel):
    """Business areas or operational districts."""
    code = models.CharField(max_length=50, null=True, blank=True)


class ConnectionType(BaseLookupModel):
    """Type of network/data connection (e.g., Cellular, Fiber, Satellite)."""
    pass


class ConnectionProtocol(BaseLookupModel):
    """Protocol used for connection (e.g., HTTP, HTTPS, RTSP, SNMP)."""
    pass


class CommunicationType(BaseLookupModel):
    """Type of communication method (e.g., Serial, IP, Wireless)."""
    pass


class CommunicationDevice(BaseLookupModel):
    """Hardware device for comms (e.g., Modem model, Router model)."""
    model_number = models.CharField(max_length=100, null=True, blank=True)


class Antenna(BaseLookupModel):
    """Antenna type/hardware used for wireless links."""
    gain_dbi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)


class ServiceProvider(BaseLookupModel):
    """Telecom / ISP service providers (e.g., Telus, Rogers)."""
    account_number = models.CharField(max_length=100, null=True, blank=True)


class PowerSource(BaseLookupModel):
    """Power grid / generation source (e.g., Solar, AC Grid, Battery)."""
    pass

class Camera(models.Model):

    # ============================================================
    # CCP
    # ============================================================
    ccp_camera_title = models.CharField(max_length=255, null=True, blank=True)
    ccp_camera_description = models.CharField(max_length=255, null=True, blank=True)
    ccp_camera_highway = models.CharField(max_length=50, null=True, blank=True)
    ccp_region = models.CharField(max_length=50, null=True, blank=True)

    # ============================================================ 
    # Location & Jurisdiction
    # ============================================================ 
    road = models.ForeignKey(
        Road,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
        verbose_name="Road / Highway",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    business_area = models.ForeignKey(
        BusinessArea,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )

    # ============================================================ 
    # Contractors
    # ============================================================ 
    road_maintenance_contractor = models.ForeignKey(
        RoadMaintenanceContractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    electrical_contractor = models.ForeignKey(
        ElectricalContractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )

    # ============================================================ 
    # Networking & Comms Infrastructure
    # ============================================================ 
    connection_type = models.ForeignKey(
        ConnectionType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    connection_protocol = models.ForeignKey(
        ConnectionProtocol,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    communication_type = models.ForeignKey(
        CommunicationType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    communication_device = models.ForeignKey(
        CommunicationDevice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    antenna = models.ForeignKey(
        Antenna,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    service_provider = models.ForeignKey(
        ServiceProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )

    # ============================================================ 
    # Power
    # ============================================================ 
    power_source = models.ForeignKey(
        PowerSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )

    def __str__(self):
        return self.ccp_camera_title or f"Camera {self.pk}"


class CameraView(models.Model):

    class Orientation(models.TextChoices):
        NORTH = "NORTH", "North"
        SOUTH = "SOUTH", "South"
        EAST = "EAST", "East"
        WEST = "WEST", "West"
        NORTHEAST = "NORTHEAST", "Northeast"
        NORTHWEST = "NORTHWEST", "Northwest"
        SOUTHEAST = "SOUTHEAST", "Southeast"
        SOUTHWEST = "SOUTHWEST", "Southwest"


    camera = models.ForeignKey(
        Camera,
        on_delete=models.CASCADE,
        related_name="views",
    )

    description = models.CharField(max_length=255, null=True, blank=True)
    orientation = models.CharField(max_length=20, choices=Orientation.choices)

    image_url = models.URLField(null=True, blank=True)
    image_name = models.CharField(max_length=255, null=True, blank=True)

    display_order = models.PositiveIntegerField(default=0)
    is_on = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
