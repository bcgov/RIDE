from django.contrib import admin

from .models import RIDEUser

@admin.register(RIDEUser)
class RIDEUserAdmin(admin.ModelAdmin):
    pass