from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response

from apps.users.models import RIDEUser
from apps.users.serializers import RIDEUserSerializer, RIDEGroupSerializer


class RIDEUserAPIView(ModelViewSet):
    r'''
    This viewset provides for listing, creating, updating, and deleting RIDEUser objects.
    Only administrators have access to these endpoints. Unauthenticated users will receive a 403 response.

    **GET /api/users

    Returns a list of all RIDEUser objects.

    **POST /api/users

    Creates a new RIDEUser object.

    Returns the created user with a 201 status code, including the ID of the record.

    User object structure:
        {
            "username": <string>,
            "email": <string>,
            ... other user fields ...
        }

    **DELETE /api/users/<id>

    Removes the user with the specified ID from the database.
    <id> is the ID of the user record.

    **PUT /api/users/<id>

    Updates the user identified by <id>. Requires entire object to be sent.

    **PATCH /api/users/<id>

    Updates the user identified by <id>. Partial update is allowed, sending
    only those fields with changing values.
    '''

    queryset = RIDEUser.objects.prefetch_related(
        'socialaccount_set',
        'organizations',
        'user_permissions',
    ).all()
    serializer_class = RIDEUserSerializer
    permission_classes = [permissions.IsAdminUser]
    # permission_classes = [permissions.AllowAny]   # For development

    def update(self, request, *args, **kwargs):
        user = self.get_object()

        # Approver role handling
        is_approver = request.data.get('is_approver', None)
        content_type = ContentType.objects.get(app_label='users', model='rideuser')
        perm, _ = Permission.objects.get_or_create(
            codename='approve_ride_events',
            content_type=content_type,
            name='Can approve ride events'
        )

        if is_approver is not None:
            if is_approver:
                user.user_permissions.add(perm)
            else:
                user.user_permissions.remove(perm)
            user.save()

        return super().update(request, *args, **kwargs)


class RIDEGroupAPIView(ModelViewSet):
    r'''
    This viewset provides for listing, creating, updating, and deleting user groups.
    Only administrators have access to these endpoints. Unauthenticated users will receive a 403 response.

    **GET /api/users

    Returns a list of all group objects.

    **POST /api/users

    Creates a new group object.

    Returns the created user with a 201 status code, including the ID of the record.

    User object structure:
        {
            "username": <string>,
            "email": <string>,
            ... other user fields ...
        }

    **DELETE /api/groups/<id>

    Removes the group with the specified ID from the database.
    <id> is the ID of the group record.

    **PUT /api/groups/<id>

    Updates the group identified by <id>. Requires entire object to be sent.

    **PATCH /api/groups/<id>

    Updates the group identified by <id>. Partial update is allowed, sending
    only those fields with changing values.
    '''

    queryset = Group.objects.all()
    serializer_class = RIDEGroupSerializer
    permission_classes = [permissions.IsAdminUser]
    # permission_classes = [permissions.AllowAny]   # For development


class session(APIView):
    def get(self, request, format=None):
        if request.user.is_authenticated:
            serializer = RIDEUserSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        else:
            response = JsonResponse({"username": None})

        response.set_cookie('csrftoken', get_token(request, ))
        return response
