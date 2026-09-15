from django.conf import settings
from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
from django.core.mail import EmailMultiAlternatives
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.template.loader import render_to_string

from rest_framework import permissions, status
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response

from apps.organizations.models import Organization

from .models import RIDEUser, Request
from .serializers import RIDEUserSerializer, RIDEGroupSerializer


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
        'user_permissions__content_type',
        'groups__permissions__content_type',
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

        response = super().update(request, *args, **kwargs)
        user.refresh_from_db()

        # User inactive, clear organizations
        if not user.is_active:
            user.organizations.clear()

            prefetch_cache = getattr(user, '_prefetched_objects_cache', None)
            if prefetch_cache is not None:
                prefetch_cache.pop('organizations', None)

            serializer = self.get_serializer(user)
            return Response(serializer.data, status=response.status_code)

        return response


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

@api_view(http_method_names=['POST'])
def make_request(request):

    if not request.user.is_authenticated:
        return Response(status=401)

    try:
        request_type = Request.RequestTypes(request.data.get('type'))
    except ValueError:
        return Response(status=400, data={ 'detail': 'Unsupported request type' })

    try:
        organization = Organization.objects.get(id=request.data.get('organization'))
    except (ValueError, Organization.DoesNotExist):
        return Response(status=400, data={ 'detail': 'Organization not found' })

    if Request.objects.filter(user=request.user, request_type=request_type).count() > 0:
        return Response(status=400, data={ 'detail': 'Request already sent' })

    Request.objects.create(user=request.user, request_type=request_type,
                           details={ 'organization': organization.id })

    name = f'{request.user.first_name} {request.user.last_name}'
    context = {
        'name': name,
        'email': request.user.email,
        'organization': organization.name,
        'url': f'{settings.FRONTEND_BASE_URL}admin/users/rideuser/{request.user.id}/change'
    }
    text = render_to_string('email/request_add_to_organization.txt', context)
    html = render_to_string('email/request_add_to_organization.html', context)
    msg = EmailMultiAlternatives(
        f'{{ name }} New user registered',
        text,
        settings.RIDE_FROM_EMAIL_DEFAULT,
        settings.ACCESS_REQUEST_RECEIVERS,
    )
    msg.attach_alternative(html, 'text/html')
    msg.send()

    return Response(status=201)
