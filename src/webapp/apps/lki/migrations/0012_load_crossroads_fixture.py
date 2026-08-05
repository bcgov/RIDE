from django.db import migrations
from django.core.management import call_command


class Migration(migrations.Migration):

    def load_fixture(apps, schema_editor):
        call_command('loaddata', 'crossroads.json', app_label='lki')

    def reverse_fixture(apps, schema_editor):
        pass

    dependencies = [
        ('lki', '0011_alter_intersection_landmark_crossroad'),
    ]

    operations = [
        migrations.RunPython(load_fixture, reverse_fixture)
    ]
