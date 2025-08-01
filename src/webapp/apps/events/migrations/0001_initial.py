# Generated by Django 5.2 on 2025-04-29 17:56

import django.contrib.gis.db.models.fields
import django.core.serializers.json
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('id', models.CharField(blank=True, max_length=20, null=True)),
                ('version', models.IntegerField(default=0)),
                ('current', models.BooleanField(default=False)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('user', models.CharField(blank=True, max_length=100, null=True)),
                ('metadata', models.JSONField(default=dict, editable=False, encoder=django.core.serializers.json.DjangoJSONEncoder)),
                ('event_type', models.CharField(blank=True, choices=[('CONSTRUCTION', 'Construction'), ('INCIDENT', 'Incident'), ('SPECIAL_EVENT', 'Special event'), ('WEATHER_CONDITION', 'Weather condition'), ('ROAD_CONDITION', 'Road condition')], max_length=30, null=True)),
                ('event_subtype', models.CharField(blank=True, choices=[('ALMOST_IMPASSABLE', 'Almost impassable'), ('FIRE', 'Fire'), ('HAZARD', 'Hazard'), ('ROAD_CONSTRUCTION', 'Road construction'), ('ROAD_MAINTENANCE', 'Road maintenance'), ('PARTLY_ICY', 'Partly icy'), ('ICE_COVERED', 'Ice covered'), ('SNOW_PACKED', 'Snow packed'), ('PARTLY_SNOW_PACKED', 'Partly snow packed'), ('MUD', 'Mud'), ('PLANNED_EVENT', 'Planned event'), ('POOR_VISIBILITY', 'Poor visiblity'), ('PARTLY_SNOW_COVERED', 'Partly snow packed'), ('DRIFTING_SNOW', 'Drifting snow'), ('PASSABLE_WITH_CARE', 'Passable with care')], max_length=30, null=True)),
                ('status', models.CharField(blank=True, choices=[('ACTIVE', 'Active'), ('INACTIVE', 'Inactive')], max_length=20, null=True)),
                ('severity', models.CharField(blank=True, choices=[('MINOR', 'Minor'), ('MAJOR', 'Major')], max_length=20, null=True)),
                ('is_closure', models.BooleanField(default=False)),
                ('geometry', django.contrib.gis.db.models.fields.GeometryField(blank=True, null=True, srid=4326)),
                ('headline', models.CharField(blank=True, max_length=100, null=True)),
                ('description', models.TextField(blank=True, null=True)),
            ],
        ),
    ]
