from rest_framework import permissions


class IsApprover(permissions.BasePermission):
    """
    Permission class that allows access only to users with Approver role.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        return hasattr(request.user, 'is_approver') and request.user.is_approver

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
