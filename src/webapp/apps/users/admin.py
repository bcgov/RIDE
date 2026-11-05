from django.contrib import admin

from .models import RIDEUser


@admin.register(RIDEUser)
class RIDEUserAdmin(admin.ModelAdmin):
    list_display = (
        'username', 'email',
        'first_name', 'last_name',
        'organization',
        'is_active', 'is_staff', 'is_superuser',
    )
    list_filter = ['is_staff', 'is_superuser', 'organizations__name', ]

    def organization(self, obj):
        org = obj.organizations.first()
        if org:
            return org.name
        return None

    search_fields = ['username', 'email', 'first_name', 'last_name']
    exclude = ['password']
