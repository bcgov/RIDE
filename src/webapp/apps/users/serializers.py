from rest_framework import serializers

from apps.users.models import RIDEUser
from django.contrib.auth.models import Group


class RIDEUserSerializer(serializers.ModelSerializer):
    social_username = serializers.SerializerMethodField()
    social_provider = serializers.SerializerMethodField()
    is_approver = serializers.SerializerMethodField()

    class Meta:
        model = RIDEUser
        fields = "__all__"

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


class RIDEGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = "__all__"
