from datetime import timedelta

from django.contrib import admin, messages
from django.utils import timezone

from .enums import EventType
from .models import Event
from .serializers import EventSerializer
from ..users.models import get_task_user


class YesNoFilter(admin.SimpleListFilter):
    yes_label = 'Yes'
    no_label = 'No'

    def lookups(self, request, model_admin):
        return (
            ('yes', self.yes_label),
            ('no', self.no_label),
        )

    def apply_yes(self, queryset):
        raise NotImplementedError

    def apply_no(self, queryset):
        raise NotImplementedError

    def queryset(self, request, queryset):
        value = self.value()
        if value == 'yes':
            return self.apply_yes(queryset)
        if value == 'no':
            return self.apply_no(queryset)
        return queryset


class RoadConditionsFilter(YesNoFilter):
    title = 'road conditions'
    parameter_name = 'road_conditions'
    yes_label = 'Road conditions only'
    no_label = 'Exclude road conditions'

    def apply_yes(self, queryset):
        return queryset.filter(event_type=EventType.ROAD_CONDITION)

    def apply_no(self, queryset):
        return queryset.exclude(event_type=EventType.ROAD_CONDITION)


class ActiveEventsFilter(YesNoFilter):
    title = 'active events'
    parameter_name = 'active_events'
    yes_label = 'Active only'
    no_label = 'Inactive only'

    def apply_yes(self, queryset):
        return queryset.filter(status='Active')

    def apply_no(self, queryset):
        return queryset.filter(status='Inactive')


class LatestFilter(YesNoFilter):
    title = 'latest'
    parameter_name = 'latest'
    yes_label = 'Latest only'
    no_label = 'Not latest'

    def apply_yes(self, queryset):
        return queryset.filter(latest=True)

    def apply_no(self, queryset):
        return queryset.filter(latest=False)


class LatestApprovedFilter(YesNoFilter):
    title = 'latest approved'
    parameter_name = 'latest_approved'
    yes_label = 'Latest approved only'
    no_label = 'Not latest approved'

    def apply_yes(self, queryset):
        return queryset.filter(latest_approved=True)

    def apply_no(self, queryset):
        return queryset.filter(latest_approved=False)


@admin.action(description='Create dummy inactive event (advance ID sequence)')
def create_dummy_inactive_event(modeladmin, request, queryset):
    # Ignore selection; Django still requires at least one row checked.
    event_id = EventSerializer().get_id()
    now = timezone.now()
    # bulk_create bypasses Model.save(), so Open511 sync never runs.
    Event.objects.bulk_create([
        Event(
            id=event_id,
            event_type=EventType.INCIDENT.label,
            status='Inactive',
            approved=True,
            latest=True,
            latest_approved=True,
            version=0,
            user=get_task_user(),
            additional='Dummy placeholder for event ID sequence',
            last_inactivated=now - timedelta(days=30),
            created=now,
            last_updated=now,
        )
    ])
    prefix, number = event_id.rsplit('-', 1)
    modeladmin.message_user(
        request,
        f'Created dummy inactive event {event_id}. '
        f'Next event will be {prefix}-{int(number) + 1}.',
        level=messages.SUCCESS,
    )


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_filter = (
        RoadConditionsFilter,
        ActiveEventsFilter,
        LatestFilter,
        LatestApprovedFilter,
    )
    list_display = ('id', 'event_type', 'status', 'user', 'latest', 'approved', 'latest_approved')
    search_fields = ['id']
    actions = [create_dummy_inactive_event]
