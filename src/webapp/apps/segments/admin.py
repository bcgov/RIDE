from django.contrib import admin, messages

from .models import Segment, Route, ChainUp


@admin.register(Segment)
class SegmentAdmin(admin.ModelAdmin):
    search_fields = ['name']


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    actions = ['merge_duplicate_routes']

    @admin.action(description='Repoint foreign keys to first route with same name')
    def merge_duplicate_routes(self, request, queryset):
        names = set(queryset.values_list('name', flat=True))
        if len(names) != 1:
            self.message_user(request, f'Selected routes must all have the same name, got: {", ".join(sorted(names))}', messages.ERROR)
            return

        name = names.pop()
        first, _duplicates = Route.objects.filter(name=name).order_by('pk')

        ChainUp.objects.filter(route__name=name).update(route=first)
        Segment.objects.filter(route__name=name).update(route=first)

        self.message_user(request, f'Segments and ChainUps repointed to route {first.pk}')


@admin.register(ChainUp)
class ChainUpAdmin(admin.ModelAdmin):
    pass
