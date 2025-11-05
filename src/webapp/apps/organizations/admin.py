from django.contrib import admin

from .models import Organization, ServiceArea


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    pass


@admin.register(ServiceArea)
class ServiceAreaAdmin(admin.ModelAdmin):
    pass
