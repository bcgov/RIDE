from django.db import migrations


class Migration(migrations.Migration):

    def create_task_user(apps, schema_editor):
        ''' Create a user who can't log in to use for task operations. '''

        # Historical model, so later fields on RIDEUser don't break this
        # migration on new databases
        user_model = apps.get_model('users', 'RIDEUser')
        user_model.objects.create_user(username='taskuser',
                                       email='donotreply@gov.bc.ca',
                                       first_name='Task',
                                       last_name='User', )

    def remove_task_user(apps, schema_editor):
        ''' A no-op task since removing taskuser may impact existing records. '''

        pass

    dependencies = [
        ('users', '0004_auto_20260227_1925'),
    ]

    operations = [
        migrations.RunPython(create_task_user, remove_task_user),
    ]
