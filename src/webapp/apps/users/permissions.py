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

class IsCameraRole(permissions.BasePermission):
    """
    Allows access to users with the Camera role (view/access cameras page).
    Camera admins are also camera-role users, so this passes for both.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        user = request.user
        is_camera_user = getattr(user, 'is_camera_role', False)
        is_camera_admin = getattr(user, 'is_camera_admin', False)

        return is_camera_user or is_camera_admin

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsCameraAdmin(permissions.BasePermission):
    """
    Allows access only to Camera Admins — required for actions such as create/update/delete/export
    operations on cameras.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return getattr(request.user, 'is_camera_admin', False)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)