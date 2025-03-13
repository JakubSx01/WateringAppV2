from django.db import models
from django.contrib.auth.models import User
from datetime import date, timedelta

# Model globalnych roślin
class Plant(models.Model):
    name = models.CharField(max_length=100, unique=True)
    species = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='plant_images/', blank=True, null=True)
    water_amount_ml = models.PositiveIntegerField(help_text="Optymalna ilość wody w ml")
    watering_frequency_days = models.PositiveIntegerField(help_text="Optymalna częstotliwość podlewania (dni)")

    SUNLIGHT_CHOICES = [
        ('full_sun', 'Pełne słońce'),
        ('partial_shade', 'Półcień'),
        ('shade', 'Cień'),
    ]
    sunlight = models.CharField(max_length=50, choices=SUNLIGHT_CHOICES, blank=True, null=True)
    soil_type = models.CharField(max_length=100, blank=True, null=True)
    preferred_temperature = models.IntegerField(blank=True, null=True, help_text="Temperatura °C")

    def __str__(self):
        return self.name


# Model roślin użytkownika
class UserPlant(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_plants')
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    next_watering_date = models.DateField(null=True, blank=True, help_text="Data następnego podlewania")

    class Meta:
        unique_together = ('user', 'plant')  # Zapobiega duplikacji tej samej rośliny dla jednego użytkownika

    def __str__(self):
        return f"{self.plant.name} ({self.user.username})"

    def update_next_watering(self):
        """Oblicza datę następnego podlewania na podstawie modelu rośliny."""
        self.next_watering_date = date.today() + timedelta(days=self.plant.watering_frequency_days)
        self.save()


# Model historii podlewania
class WateringHistory(models.Model):
    user_plant = models.ForeignKey(UserPlant, on_delete=models.CASCADE, related_name='watering_history')
    watered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-watered_at']  # Sortowanie od najnowszych wpisów

    def __str__(self):
        return f"{self.user_plant.plant.name} podlana {self.watered_at:%Y-%m-%d %H:%M}"
