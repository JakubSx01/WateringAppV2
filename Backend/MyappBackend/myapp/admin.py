# myapp/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Plant, UserPlant, WateringHistory
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin # Import default UserAdmin
from django.contrib.auth.models import User # Import User model

# ... WateringHistoryInline (OK as is)
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
    list_display = ('name', 'species', 'display_image_thumbnail', 'water_amount_ml',
                    'watering_frequency_days', 'sunlight', 'soil_type', 'status', 'proposed_by_link') # Added status and proposed_by
    list_filter = ('status', 'sunlight', 'soil_type', 'species', 'proposed_by') # Added status and proposed_by to filters
    search_fields = ('name', 'species')
    ordering = ('status', 'name',) # Order pending first, then by name
    list_per_page = 25

    fieldsets = (
        (None, {
            'fields': ('name', 'species', 'image')
        }),
        ('Moderation', { # New fieldset for moderation
            'fields': ('status', 'proposed_by'), # Include moderation fields
            'classes': ('collapse',), # Collapse by default
        }),
        ('Wymagania Wodne', {
            'fields': ('water_amount_ml', 'watering_frequency_days')
        }),
        ('Warunki Środowiskowe', {
            'fields': ('sunlight', 'soil_type', 'preferred_temperature'),
        }),
    )
    readonly_fields = ('proposed_by',) # Proposed by is set automatically on creation

    def display_image_thumbnail(self, obj):
        if obj.image:
            # Ensure URL uses media path correctly
            return format_html('<img src="{}" width="50" height="50" style="object-fit: cover;" />', obj.image.url)
        return "Brak zdjęcia"
    display_image_thumbnail.short_description = 'Miniaturka'

    def proposed_by_link(self, obj):
        if obj.proposed_by:
            # Link to the user in Django admin
            user_admin_url = reverse('admin:auth_user_change', args=[obj.proposed_by.pk])
            return format_html('<a href="{}">{}</a>', user_admin_url, obj.proposed_by.username)
        return "-"
    proposed_by_link.short_description = 'Zaproponowany przez'
    proposed_by_link.admin_order_field = 'proposed_by__username' # Allow sorting by proposer


# ... UserPlantAdmin (OK as is)
@admin.register(UserPlant)
class UserPlantAdmin(admin.ModelAdmin):
    list_display = ('user_link', 'get_plant_name_link', 'added_at', 'next_watering_date') # Changed user to user_link
    # Add user__username and plant__name to search_fields for better search
    search_fields = ('user__username', 'plant__name', 'plant__species')
    # Keep existing filters, add plant status filter
    list_filter = ('user', 'plant__status', 'plant__sunlight', 'plant__soil_type', ('next_watering_date', admin.DateFieldListFilter))
    ordering = ('next_watering_date', 'user')
    readonly_fields = ('added_at', 'next_watering_date')
    list_per_page = 25
    # autocomplete_fields are good, keep them
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

    # Add link to user page
    def user_link(self, obj):
        if obj.user:
            user_admin_url = reverse('admin:auth_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', user_admin_url, obj.user.username)
        return "Brak użytkownika"
    user_link.short_description = 'Użytkownik (Link)'
    user_link.admin_order_field = 'user__username'


# ... WateringHistoryAdmin (OK as is)
@admin.register(WateringHistory)
class WateringHistoryAdmin(admin.ModelAdmin):
    list_display = ('get_user_plant_info', 'watered_at')
    list_filter = (('watered_at', admin.DateFieldListFilter), 'user_plant__user', 'user_plant__plant__name')
    search_fields = ('user_plant__user__username', 'user_plant__plant__name')
    ordering = ('-watered_at',)
    readonly_fields = ('watered_at', 'user_plant')
    list_per_page = 50
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False # Prevent changing history entries
    # Keep get_user_plant_info as is

    def get_user_plant_info(self, obj):
        if obj.user_plant:
            user_plant_admin_url = reverse('admin:myapp_userplant_change', args=[obj.user_plant.pk])
            return format_html('<a href="{}">{}</a>', user_plant_admin_url, str(obj.user_plant))
        return "Brak powiązanej rośliny użytkownika"
    get_user_plant_info.short_description = 'Roślina użytkownika (Link)'
    get_user_plant_info.admin_order_field = 'user_plant__plant__name' # Order by plant name

# --- Customize Django's built-in User Admin for our needs ---
# Unregister the default User admin
admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    # Use the fields from UserSerializer for display/editing, maybe add permissions/groups
    # You can customize fields, fieldsets, filter_horizontal etc.
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups') # Add groups filter

    # Add a fieldset for staff/superuser status if not using default UserAdmin fieldsets
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    readonly_fields = ('date_joined', 'last_login') # Make these read-only

    # Add option to view user's plants directly from user admin
    def user_plants_link(self, obj):
         user_plants_url = reverse('admin:myapp_userplant_changelist') + f'?user__id={obj.id}'
         count = obj.user_plants.count()
         return format_html('<a href="{}">{} roślin użytkownika</a>', user_plants_url, count)
    user_plants_link.short_description = 'Rośliny użytkownika'
    list_display += ('user_plants_link',) # Add this link to the list display


    # Override save_model to handle password hashing if needed when admin changes password via admin site
    # The standard Django admin User change form already handles password hashing correctly.
    # If you add a raw password field, you'd override save_model. Sticking to default fields is easier.
    # def save_model(self, request, obj, form, change):
    #     if 'password' in form.changed_data:
    #         obj.password = make_password(obj.password) # Ensure password is hashed
    #     super().save_model(request, obj, form, change)