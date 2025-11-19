from django.contrib import admin

from .models import RIDEUser

@admin.register(RIDEUser)
class RIDEUserAdmin(admin.ModelAdmin):
    list_display = (
        'username', 'email',
        'first_name', 'last_name',
        'is_staff', 'is_superuser',
    )