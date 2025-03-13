from django.contrib import admin
from .models import Plant, WateringHistory, UserPlant

# Register your models here.

admin.site.register(Plant)
admin.site.register(WateringHistory)
admin.site.register(UserPlant)