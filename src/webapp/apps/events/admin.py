from django.contrib import admin

from .enums import EventType
from .models import Event


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


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_filter = (
        RoadConditionsFilter,
        ActiveEventsFilter,
        LatestFilter,
        LatestApprovedFilter,
    )
    list_display = ('id', 'event_type', 'status', 'user', 'latest', 'approved', 'latest_approved')
