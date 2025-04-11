# myapp/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
# from django.utils.safestring import mark_safe # Już niepotrzebne
from .models import Plant, UserPlant, WateringHistory

# ... WateringHistoryInline bez zmian ...
class WateringHistoryInline(admin.TabularInline):
    model = WateringHistory
    extra = 0
    readonly_fields = ('watered_at',)
    fields = ('watered_at',)
    ordering = ('-watered_at',)
    can_delete = False
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = ('name', 'species', 'display_image_thumbnail', 'water_amount_ml', 'watering_frequency_days', 'sunlight', 'soil_type') # Dodano soil_type do listy
    list_filter = ('sunlight', 'soil_type', 'species') # Dodano soil_type do filtrów
    search_fields = ('name', 'species')
    ordering = ('name',)
    list_per_page = 25

    fieldsets = (
        (None, {
            'fields': ('name', 'species', 'image')
        }),
        ('Wymagania Wodne', {
            'fields': ('water_amount_ml', 'watering_frequency_days')
        }),
        ('Warunki Środowiskowe', {
            'fields': ('sunlight', 'soil_type', 'preferred_temperature'), # Upewnij się, że soil_type tu jest
            # 'classes': ('collapse',), # Możesz usunąć collapse, jeśli chcesz widzieć domyślnie
        }),
    )

    def display_image_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;" />', obj.image.url)
        return "Brak zdjęcia"
    display_image_thumbnail.short_description = 'Miniaturka'

# ... UserPlantAdmin i WateringHistoryAdmin bez większych zmian (można dodać soil_type do filtrów jeśli chcesz) ...
@admin.register(UserPlant)
class UserPlantAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_plant_name_link', 'added_at', 'next_watering_date')
    list_filter = ('user', 'plant__sunlight', 'plant__soil_type', ('next_watering_date', admin.DateFieldListFilter)) # Filtruj po polach rośliny
    search_fields = ('user__username', 'plant__name', 'plant__species')
    ordering = ('next_watering_date', 'user')
    readonly_fields = ('added_at', 'next_watering_date')
    list_per_page = 25
    autocomplete_fields = ['user', 'plant']
    inlines = [WateringHistoryInline]
    fieldsets = (
        (None, {'fields': ('user', 'plant')}),
        ('Informacje o Podlewaniu', {'fields': ('added_at', 'next_watering_date')}),
    )
    def get_plant_name_link(self, obj):
        if obj.plant:
            plant_admin_url = reverse('admin:myapp_plant_change', args=[obj.plant.pk])
            return format_html('<a href="{}">{}</a>', plant_admin_url, obj.plant.name)
        return "Brak rośliny"
    get_plant_name_link.short_description = 'Roślina (Link)'
    get_plant_name_link.admin_order_field = 'plant__name'

@admin.register(WateringHistory)
class WateringHistoryAdmin(admin.ModelAdmin):
    list_display = ('get_user_plant_info', 'watered_at')
    list_filter = (('watered_at', admin.DateFieldListFilter), 'user_plant__user', 'user_plant__plant__name') # Filtruj po nazwie rośliny
    search_fields = ('user_plant__user__username', 'user_plant__plant__name')
    ordering = ('-watered_at',)
    readonly_fields = ('watered_at', 'user_plant')
    list_per_page = 50
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def get_user_plant_info(self, obj):
        if obj.user_plant:
            user_plant_admin_url = reverse('admin:myapp_userplant_change', args=[obj.user_plant.pk])
            return format_html('<a href="{}">{}</a>', user_plant_admin_url, str(obj.user_plant))
        return "Brak powiązanej rośliny użytkownika"
    get_user_plant_info.short_description = 'Roślina użytkownika (Link)'
    get_user_plant_info.admin_order_field = 'user_plant'