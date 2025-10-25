from rest_framework import permissions


class Approver(permissions.BasePermission):
    """
    Permission class that allows access only to users with Approver role.
    """

    def has_permission(self, request, view):
        # Check if the user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Implement your specific logic for checking if user has approver role
        # For example:
        # return request.user.role == 'approver'
        # or
        # return request.user.groups.filter(name='approver').exists()
        return hasattr(request.user, 'is_approver') and request.user.is_approver
