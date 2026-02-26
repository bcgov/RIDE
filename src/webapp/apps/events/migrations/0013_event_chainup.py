import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0012_event_segment"),
        ("segments", "0007_remove_chainup_active_remove_chainup_next_update"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="chainup",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to="segments.chainup"),
        ),
    ]
