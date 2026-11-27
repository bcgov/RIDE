import logging

from django.conf import settings
from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.template.loader import render_to_string

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view
from rest_framework.generics import get_object_or_404
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response

from apps.organizations.models import Organization, ServiceArea
from apps.shared.models import SiteSettings

from apps.shared.helpers import attach_email_images, get_used_email_images

from .models import EmailSubscription, RIDEUser, Request
from .serializers import EmailSubscriptionSerializer, RIDEUserSerializer, RIDEGroupSerializer, SessionUserSerializer

logger = logging.getLogger(__name__)


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

    # DBC22-7325: ids only for service areas, without their geometry
    queryset = RIDEUser.objects.select_related(
        'email_subscription',
    ).prefetch_related(
        'socialaccount_set',
        Prefetch('organizations__service_areas', queryset=ServiceArea.objects.only('id', 'parent_id')),
        'user_permissions__content_type',
        'groups__permissions__content_type',
        Prefetch('email_subscription__notification_areas', queryset=ServiceArea.objects.only('id')),
        'request_set',
    ).all()
    serializer_class = RIDEUserSerializer
    permission_classes = [permissions.IsAdminUser]
    # permission_classes = [permissions.AllowAny]   # For development

    def update(self, request, *args, **kwargs):
        # without the list's prefetches; super().update gets the full user
        user = get_object_or_404(RIDEUser, pk=kwargs[self.lookup_field])

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


class EmailSubscriptionViewset(viewsets.ModelViewSet):
    r'''
    DBC22-7326: this viewset provides for reading and updating the email
    notification settings of the authenticated user, mirroring DBC's
    EmailSubscriptionViewset.  Unauthenticated users will receive a 403
    response.  A user has at most one subscription.

    **GET /api/users/email-subscriptions**

    Returns a list containing the user's subscription, if they have one.

    **POST /api/users/email-subscriptions**

    Creates the subscription for the user.

        {
            "notification": <boolean>,
            "notification_areas": <list of service area IDs>,
            "notification_types": <list of event type codes>,
            "notification_severities": <list of severity codes>,
            "notification_statuses": <list of status codes>,
            "notification_creator": <"all" | "organization" | "me">
        }

    **PUT /api/users/email-subscriptions/*<id\>***

    Updates the subscription identified by *<id\>*.  Requires entire object to be sent.

    **PATCH /api/users/email-subscriptions/*<id\>***

    Updates the subscription identified by *<id\>*.  Partial update is allowed.
    '''

    queryset = EmailSubscription.objects.all()
    serializer_class = EmailSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        return EmailSubscription.objects.filter(user=self.request.user).prefetch_related('notification_areas')

    def create(self, request, *args, **kwargs):
        duplicate = Response({'code': 'duplicate_subscription'}, status=status.HTTP_400_BAD_REQUEST)
        if EmailSubscription.objects.filter(user=request.user).exists():
            return duplicate

        try:
            with transaction.atomic():
                return super().create(request, *args, **kwargs)
        except IntegrityError:  # created by a simultaneous request
            return duplicate

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class session(APIView):
    def get(self, request, format=None):
        flags = SiteSettings.objects.values('enable_map_setup').first() or {}

        if request.user.is_authenticated:
            # service areas come from one id query, see get_user_notification_area_ids
            serializer = SessionUserSerializer(request.user)
            return Response({**serializer.data, **flags}, status=status.HTTP_200_OK)

        else:
            response = JsonResponse({"username": None, **flags})

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

    # DBC22-6697: one request at a time per user (e.g. a double click)
    with transaction.atomic():
        user = RIDEUser.objects.select_for_update().get(pk=request.user.pk)
        # given one meanwhile; requests are resolved on assignment
        if user.organizations.exists():
            return Response(status=400,
                            data={ 'detail': 'You already belong to an organization. Please reload RIDE.' })
        if Request.objects.filter(user=request.user, request_type=request_type).exists():
            return Response(status=400, data={ 'detail': 'Request already sent' })

        access_request = Request.objects.create(user=request.user, request_type=request_type,
                                                details={ 'organization': organization.id })

    # Sent after the request is saved, outside the transaction, so a failed
    # send is still logged (email_log); the request is then removed so the
    # user can retry
    try:
        send_access_request_email(request.user, organization)
    except OSError:  # includes smtplib.SMTPException and socket timeouts
        logger.exception(f'Failed to send the access request email for user {request.user.pk}')
        access_request.delete()
        return Response(status=503, data={ 'detail': 'Your request could not be sent. Please try again.' })

    return Response(status=201)


def send_access_request_email(user, organization):
    # DBC22-6697: both links open the RIDE Users screen filtered to this user;
    # Grant permission also assigns the requested organization (RIDE Figma 9984:14090)
    context = {
        'name': user.get_full_name() or user.email or user.username,
        'email': user.email,
        'organization': organization.name,
        'contact_name': organization.contact_name or 'Not provided',
        'contact_id': organization.contact_id or 'Not provided',
        'grant_url': f'{settings.FRONTEND_BASE_URL}users/?grant={user.id}',
        'users_url': f'{settings.FRONTEND_BASE_URL}users/?user={user.id}',
    }
    text = render_to_string('email/request_add_to_organization.txt', context)
    html = render_to_string('email/request_add_to_organization.html', context)
    msg = EmailMultiAlternatives(
        'A RIDE user has requested to be added to an organization',
        text,
        settings.RIDE_NOTIFICATION_FROM_EMAIL_SENDER,
        settings.ACCESS_REQUEST_RECEIVERS,
    )
    msg.attach_alternative(html, 'text/html')
    attach_email_images(msg, get_used_email_images(html))
    msg.send()
