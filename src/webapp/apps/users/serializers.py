from rest_framework import serializers

from apps.events.enums import (
    NotificationCreator,
    NOTIFICATION_CREATORS,
    NotificationEventType,
    NOTIFICATION_EVENT_TYPES,
    NOTIFICATION_SEVERITIES,
    NOTIFICATION_STATUSES,
)
from apps.organizations.models import ServiceArea
from apps.users.models import EmailSubscription, RIDEUser, Request
from django.contrib.auth.models import Group
from config.adapter import get_oidc_claims


class RIDEUserSerializer(serializers.ModelSerializer):
    email_subscription = serializers.SerializerMethodField()  # DBC22-7325
    social_username = serializers.SerializerMethodField()
    social_provider = serializers.SerializerMethodField()
    is_approver = serializers.SerializerMethodField()
    service_areas = serializers.SerializerMethodField()
    request_organization = serializers.SerializerMethodField()

    class Meta:
        model = RIDEUser
        fields = "__all__"
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def to_internal_value(self, data):
        # DBC22-6339 staff must match superuser for IsAdmin permission to work
        if 'is_superuser' in data:
            data['is_staff'] = data['is_superuser']
        return super().to_internal_value(data)

    def _get_social_account(self, obj):
        # prefetch_related makes .all() use the cache, .first() does not
        accounts = obj.socialaccount_set.all()
        return accounts[0] if accounts else None

    def get_email_subscription(self, obj):
        ''' DBC22-7325: the user's notification settings, read only '''

        try:
            return EmailSubscriptionSerializer(obj.email_subscription).data
        except EmailSubscription.DoesNotExist:
            return {'id': None, **get_notifications_off()}

    def get_social_username(self, obj):
        social_account = self._get_social_account(obj)
        if not social_account:
            return ''
        claims = get_oidc_claims(social_account)
        return claims.get('bceid_username') \
            if social_account.provider == 'bceid' \
            else claims.get('idir_username')

    def get_social_provider(self, obj):
        social_account = self._get_social_account(obj)
        if not social_account:
            return None
        return social_account.provider

    def get_is_approver(self, obj):
        return obj.is_approver

    def get_service_areas(self, obj):
        # uses prefetched organizations__service_areas where available
        return sorted(get_user_notification_area_ids(obj))

    def get_request_organization(self, obj):
        '''
        Return true if the user has no organizations and no requests to be
        added to an organization (thus prompting the user on the frontend)
        '''

        return (
            obj.organizations.count() == 0 and
            obj.request_set.filter(
                request_type=Request.RequestTypes.ADD_TO_ORG
            ).count() == 0
        )


class SessionUserSerializer(RIDEUserSerializer):
    ''' DBC22-7325: the signed-in user; notification settings load from their own endpoint '''

    email_subscription = None


class RIDEGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = "__all__"


def get_notifications_off():
    ''' Settings with notifications off; nothing else is remembered (DBC22-7324) '''

    return {
        'notification': False,
        'notification_areas': [],
        'notification_types': [],
        'notification_severities': [],
        'notification_statuses': [],
        'notification_creator': NotificationCreator.ALL,
    }


def get_user_notification_area_ids(user):
    '''
    IDs of the service areas a user may receive notifications for: their
    organizations' service areas, excluding districts.  Uses prefetched
    organizations__service_areas where available.
    '''

    prefetched = 'organizations' in getattr(user, '_prefetched_objects_cache', {}) and all(
        'service_areas' in getattr(organization, '_prefetched_objects_cache', {})
        for organization in user.organizations.all()
    )
    if not prefetched:
        return set(ServiceArea.objects.filter(organizations__users=user, parent__isnull=False)
                   .values_list('id', flat=True))

    return {
        area.id
        for organization in user.organizations.all()
        for area in organization.service_areas.all()
        if area.parent_id is not None
    }


def get_notification_setting_errors(user, areas, types, severities, statuses):
    ''' Validation errors for turning notifications on with these choices '''

    errors = {}
    if not user.email:
        errors['notification'] = 'An email address is required to receive notifications.'
    if not areas:
        errors['notification_areas'] = 'At least one service area must be selected.'
    if not types:
        errors['notification_types'] = 'At least one event type must be selected.'
    if not statuses:
        errors['notification_statuses'] = 'At least one event status must be selected.'

    # Severity only applies to incidents and planned events
    if not severities and (NotificationEventType.INCIDENTS in types or
                           NotificationEventType.PLANNED_EVENTS in types):
        errors['notification_severities'] = 'At least one event severity must be selected.'

    return errors


class EmailSubscriptionSerializer(serializers.ModelSerializer):
    '''
    DBC22-7326: a user's notification settings.  Mirrors DBC's
    EmailSubscriptionSerializer; validation follows DBC NotificationEventType.
    '''

    notification_areas = serializers.PrimaryKeyRelatedField(
        many=True, queryset=ServiceArea.objects.all(), required=False)
    notification_types = serializers.ListField(
        child=serializers.ChoiceField(choices=NOTIFICATION_EVENT_TYPES), required=False)
    notification_severities = serializers.ListField(
        child=serializers.ChoiceField(choices=NOTIFICATION_SEVERITIES), required=False)
    notification_statuses = serializers.ListField(
        child=serializers.ChoiceField(choices=NOTIFICATION_STATUSES), required=False)
    notification_creator = serializers.ChoiceField(choices=NOTIFICATION_CREATORS, required=False)

    class Meta:
        model = EmailSubscription
        fields = (
            'id',
            'notification',
            'notification_areas',
            'notification_types',
            'notification_severities',
            'notification_statuses',
            'notification_creator',
        )

    def _get_user(self):
        if self.instance is not None:
            return self.instance.user

        request = self.context.get('request')
        return request.user if request else None

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Drop areas the user no longer has through their organizations
        allowed = get_user_notification_area_ids(instance.user)
        data['notification_areas'] = [area for area in data['notification_areas'] if area in allowed]
        return data

    def _current(self, attrs, field, default):
        ''' The submitted value, else the saved one, else the default '''

        if field in attrs:
            return attrs[field]
        if self.instance is not None:
            value = getattr(self.instance, field)
            return list(value.all()) if field == 'notification_areas' else value
        return default

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self._get_user()

        # Notifications off: nothing to remember (DBC22-7324)
        if not self._current(attrs, 'notification', False):
            attrs.update(get_notifications_off())
            return attrs

        # Silently drop areas outside the user's organizations, e.g. stale ids
        allowed = get_user_notification_area_ids(user)
        areas = [area for area in self._current(attrs, 'notification_areas', []) if area.id in allowed]
        types = self._current(attrs, 'notification_types', [])
        severities = self._current(attrs, 'notification_severities', [])
        statuses = self._current(attrs, 'notification_statuses', [])

        errors = get_notification_setting_errors(user, areas, types, severities, statuses)
        if errors:
            raise serializers.ValidationError(errors)

        attrs['notification_areas'] = areas
        return attrs
