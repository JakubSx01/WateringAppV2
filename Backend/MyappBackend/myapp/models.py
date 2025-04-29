# myapp/models.py
from django.db import models
from django.contrib.auth.models import User
from datetime import date, timedelta
from django.utils import timezone # Import timezone

class Plant(models.Model):
    name = models.CharField(max_length=100, unique=True) # Keep unique for the definition name
    species = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='plant_images/', blank=True, null=True)
    water_amount_ml = models.PositiveIntegerField(help_text="Optymalna ilość wody w ml")
    watering_frequency_days = models.PositiveIntegerField(help_text="Optymalna częstotliwość podlewania (dni)")

    # --- Zaktualizowane Choices dla Sunlight ---
    SUNLIGHT_FULL_SUN = 'full_sun'
    SUNLIGHT_PARTIAL_SHADE = 'partial_shade'
    SUNLIGHT_BRIGHT_INDIRECT = 'bright_indirect'
    SUNLIGHT_SHADE = 'shade'
    SUNLIGHT_CHOICES = [
        (SUNLIGHT_FULL_SUN, 'Pełne słońce'),
        (SUNLIGHT_PARTIAL_SHADE, 'Półcień'),
        (SUNLIGHT_BRIGHT_INDIRECT, 'Jasne rozproszone'),
        (SUNLIGHT_SHADE, 'Cień'),
    ]
    sunlight = models.CharField(
        max_length=50,
        choices=SUNLIGHT_CHOICES,
        blank=True,
        null=True,
        help_text="Wymagania dotyczące światła"
    )

    # --- Dodane Choices dla Soil Type ---
    SOIL_UNIVERSAL = 'universal'
    SOIL_SANDY = 'sandy'
    SOIL_PEAT = 'peat'
    SOIL_CLAY = 'clay'
    SOIL_LOAMY = 'loamy'
    SOIL_CHALKY = 'chalky'
    SOIL_TYPE_CHOICES = [
        (SOIL_UNIVERSAL, 'Uniwersalna'),
        (SOIL_SANDY, 'Piaszczysta'),
        (SOIL_PEAT, 'Torfowa'),
        (SOIL_CLAY, 'Gliniasta'),
        (SOIL_LOAMY, 'Próchnicza'),
        (SOIL_CHALKY, 'Wapienna'),
    ]
    soil_type = models.CharField(
        max_length=100,
        choices=SOIL_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text="Preferowany typ gleby"
    )
    preferred_temperature = models.IntegerField(blank=True, null=True, help_text="Temperatura °C")

    # --- New Fields for Moderation ---
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Approval'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_APPROVED, # Existing plants are approved by default
        help_text="Status zatwierdzenia rośliny w bazie globalnej"
    )
    proposed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL, # Keep plant if user is deleted
        null=True,
        blank=True,
        related_name='proposed_plants',
        help_text="Użytkownik, który zaproponował dodanie tej rośliny do bazy"
    )
    # --- End New Fields ---


    def __str__(self):
        # Indicate pending status in string representation
        if self.status == self.STATUS_PENDING:
             return f"{self.name} (Pending)"
        if self.status == self.STATUS_REJECTED:
             return f"{self.name} (Rejected)"
        return self.name

# Model roślin użytkownika
class UserPlant(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_plants')
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    next_watering_date = models.DateField(null=True, blank=True, help_text="Data następnego podlewania")

    # --- REMOVE or COMMENT OUT the unique_together constraint ---
    # class Meta:
    #     unique_together = ('user', 'plant') # REMOVE THIS LINE to allow multiple instances

    def __str__(self):
        # Add User ID or unique identifier if needed, but username is fine for display
        return f"{self.plant.name} ({self.user.username})"

    def update_next_watering(self):
        """Oblicza datę następnego podlewania na podstawie modelu rośliny."""
        # Use timezone.localdate() for timezone-aware date
        self.next_watering_date = timezone.localdate() + timezone.timedelta(days=self.plant.watering_frequency_days)
        self.save()


# Model historii podlewania
class WateringHistory(models.Model):
    user_plant = models.ForeignKey(UserPlant, on_delete=models.CASCADE, related_name='watering_history')
    watered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-watered_at']

    def __str__(self):
        # Use timezone.localtime for timezone-aware datetime display
        return f"{self.user_plant.plant.name} podlana {timezone.localtime(self.watered_at):%Y-%m-%d %H:%M}"