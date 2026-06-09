from django.db import migrations, models

def copy_type_to_ms(apps, schema_editor):
    MatiereSection = apps.get_model('exam_planning', 'MatiereSection')
    for ms in MatiereSection.objects.select_related('matiere').iterator():
        ms.type = ms.matiere.type
        ms.save(update_fields=['type'])

class Migration(migrations.Migration):

    dependencies = [
        ('exam_planning', '0008_templateexamen'),
    ]

    operations = [
        migrations.AddField(
            model_name='matieresection',
            name='type',
            field=models.CharField(choices=[('obligatoire', 'إجبارية'), ('optionnelle', 'اختيارية')], default='obligatoire', max_length=20),
        ),
        migrations.RunPython(copy_type_to_ms, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='matiere',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='matiere',
            name='type',
        ),
    ]
