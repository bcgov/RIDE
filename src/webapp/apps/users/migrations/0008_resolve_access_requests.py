from django.db import migrations


class Migration(migrations.Migration):
    '''
    DBC22-6697: access requests are now resolved when the user is given an
    organization; resolve those already granted
    '''

    def resolve_access_requests(apps, schema_editor):
        request_model = apps.get_model('users', 'Request')
        request_model.objects.filter(request_type='ADD_TO_ORGANIZATION', user__organizations__isnull=False).delete()

    dependencies = [
        ('users', '0007_emailsubscription'),
    ]

    operations = [
        migrations.RunPython(resolve_access_requests, migrations.RunPython.noop),
    ]
