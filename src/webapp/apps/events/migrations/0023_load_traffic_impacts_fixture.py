from django.db import migrations
from django.core.management import call_command


class Migration(migrations.Migration):

    def load_fixture(apps, schema_editor):
        call_command('loaddata', 'TrafficImpacts.json', app_label='events')

    def reverse_fixture(apps, schema_editor):
        pass

    dependencies = [
        ('events', '0022_alter_event_managers_event_tlids'),
    ]

    operations = [
        migrations.RunPython(load_fixture, reverse_fixture)
    ]
