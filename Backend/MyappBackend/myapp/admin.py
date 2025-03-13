from django.contrib import admin
from .models import Plant, WateringHistory, UserPlant

# Konfiguracja dla modelu Plant
@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ('name', 'species', 'water_amount_ml', 'watering_frequency_days', 'sunlight')
    search_fields = ('name', 'species')
    list_filter = ('sunlight',)
    ordering = ('name',)

# Konfiguracja dla modelu UserPlant
@admin.register(UserPlant)
class UserPlantAdmin(admin.ModelAdmin):
    list_display = ('user', 'plant', 'added_at', 'next_watering_date')
    list_filter = ('user', 'plant')
    search_fields = ('user__username', 'plant__name')
    ordering = ('-added_at',)
    readonly_fields = ('added_at', 'next_watering_date')

# Konfiguracja dla modelu WateringHistory
@admin.register(WateringHistory)
class WateringHistoryAdmin(admin.ModelAdmin):
    list_display = ('user_plant', 'watered_at')
    list_filter = ('user_plant__user', 'user_plant__plant')
    search_fields = ('user_plant__user__username', 'user_plant__plant__name')
    ordering = ('-watered_at',)
