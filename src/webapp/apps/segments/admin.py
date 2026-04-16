from django.contrib import admin

from .models import Segment, Route, ChainUp


@admin.register(Segment)
class SegmentAdmin(admin.ModelAdmin):
    pass


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    pass


@admin.register(ChainUp)
class ChainUpAdmin(admin.ModelAdmin):
    pass
