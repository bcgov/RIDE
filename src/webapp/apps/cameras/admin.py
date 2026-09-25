from django.contrib import admin
from .models import Camera, Road, Region

@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Camera._meta.concrete_fields]
    search_fields = ("title",)

@admin.register(Road)
class RoadAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Road._meta.concrete_fields]
    search_fields = ("name",)

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = [field.name for field in Region._meta.concrete_fields]
    search_fields = ("name",)