# W wygenerowanym pliku migracji myapp/migrations/xxxx_auto_....py
from django.db import migrations

def remove_media_prefix(apps, schema_editor):
    Plant = apps.get_model('myapp', 'Plant')
    for plant in Plant.objects.all():
        if plant.image and plant.image.name.startswith('media/'):
            # Usuwamy tylko pierwszy 'media/'
            new_name = plant.image.name.replace('media/', '', 1)
            plant.image.name = new_name
            plant.save(update_fields=['image'])

class Migration(migrations.Migration):

    dependencies = [
        # Zależność od poprzedniej migracji
        ('myapp', '0002_alter_wateringhistory_options_and_more'),
    ]

    operations = [
        migrations.RunPython(remove_media_prefix),
    ]