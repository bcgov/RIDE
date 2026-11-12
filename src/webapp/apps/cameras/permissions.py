# permissions.py
import hmac
from django.conf import settings
from rest_framework.permissions import BasePermission

class HasServiceToken(BasePermission):
    def has_permission(self, request, view):
        expected = getattr(settings, "INTERNAL_API_TOKEN", "")
        provided = request.headers.get("X-Internal-Token", "")
        return bool(expected) and hmac.compare_digest(provided, expected)