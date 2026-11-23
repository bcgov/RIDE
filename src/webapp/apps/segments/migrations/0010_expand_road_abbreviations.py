# Generated manually for DBC22-7018
from django.db import migrations

from apps.segments.management.commands.update_segment_names import update_segment_names


def expand_abbreviations(apps, schema_editor):
    # historical models to avoid loading columns that don't exist until later
    update_segment_names((apps.get_model('segments', 'Segment'), apps.get_model('segments', 'ChainUp')))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("segments", "0009_auto_20260430_2352"),
    ]

    operations = [
        migrations.RunPython(expand_abbreviations, noop),
    ]
