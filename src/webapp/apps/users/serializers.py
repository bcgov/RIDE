from rest_framework import serializers

from apps.organizations.models import ServiceArea
from apps.users.models import RIDEUser, Request
from django.contrib.auth.models import Group


class RIDEUserSerializer(serializers.ModelSerializer):
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

    def _get_social_account(self, obj):
        # prefetch_related makes .all() use the cache, .first() does not
        accounts = obj.socialaccount_set.all()
        return accounts[0] if accounts else None

    def get_social_username(self, obj):
        social_account = self._get_social_account(obj)
        if not social_account:
            return ''
        return social_account.extra_data.get('bceid_username') \
            if social_account.provider == 'bceid' \
            else social_account.extra_data.get('idir_username')

    def get_social_provider(self, obj):
        social_account = self._get_social_account(obj)
        if not social_account:
            return None
        return social_account.provider

    def get_is_approver(self, obj):
        return obj.is_approver

    def get_service_areas(self, obj):
        user_orgs = obj.organizations.all()
        user_areas = (
            ServiceArea.objects.filter(organizations__in=user_orgs)
            .exclude(parent=None)
            .distinct()
        )

        return list(user_areas.values_list('id', flat=True))

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


class RIDEGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = "__all__"
