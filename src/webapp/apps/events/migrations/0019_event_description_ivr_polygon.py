from django.db import migrations, models

from apps.events.enums import EventType
from apps.events.open511 import build_event_description


def backfill_derived(apps, schema_editor):
    Event = apps.get_model("events", "Event")

    for event in Event._default_manager.all().iterator():
        try:
            description = build_event_description(event)
            ivr = build_event_description(event, ivr=True)
        except Exception:
            description = ''
            ivr = ''

        polygon = None
        if event.event_type == EventType.ROAD_CONDITION and event.geometry:
            try:
                ring = event.geometry.buffer_with_style(.01, end_cap_style=2, join_style=2).coords[0]
                polygon = [list(point) for point in ring]
            except Exception:
                polygon = None

        # update() avoids creating a new version row
        Event._default_manager.filter(pk=event.pk).update(
            description=description,
            ivr=ivr,
            polygon=polygon,
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0018_event_from_bulk"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="event",
            name="ivr",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="event",
            name="polygon",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_derived, reverse_code=noop),
    ]
