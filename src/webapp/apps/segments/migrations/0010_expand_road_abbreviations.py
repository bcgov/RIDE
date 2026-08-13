# Generated manually for DBC22-7018
from django.core.management import call_command
from django.db import migrations


def expand_abbreviations(apps, schema_editor):
    call_command('update_segment_names')


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("segments", "0009_auto_20260430_2352"),
    ]

    operations = [
        migrations.RunPython(expand_abbreviations, noop),
    ]
