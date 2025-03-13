from django.db import models
from django.contrib.auth.models import User
# Create your models here.
class Plant(models.Model):
    # Model przechowujący informacje o roślinie
    name = models.CharField(max_length=100, unique=True)
    species = models.CharField(max_length=100, blank=True, null=True)
    image = models.ImageField(upload_to='plant_images/', blank=True, null=True)
    water_amount_ml = models.IntegerField(help_text="Optymalna ilość wody w ml")
    watering_frequency_days = models.IntegerField(help_text="Optymalna częstotliwość podlewania (dni)")

    # Opcjonalne dodatkowe informacje (np. nasłonecznienie, typ gleby, temperatura)
    sunlight = models.CharField(
        max_length=50,
        choices=[
            ('full_sun', 'Pełne słońce'),
            ('partial_shade', 'Półcień'),
            ('shade', 'Cień'),
        ],
        blank=True,
        null=True
    )
    soil_type = models.CharField(max_length=100, blank=True, null=True)
    preferred_temperature = models.IntegerField(blank=True, null=True, help_text="Temperatura °C")

    def __str__(self):
        return self.name
    
class UserPlant(models.Model):
    # Model przechowujący informacje o roślinie użytkownika
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_plants')
    plant = models.ForeignKey(Plant, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    next_watering_date = models.DateField(null=True, blank=True, help_text="Data, kiedy roślina powinna być podlana")

    def __str__(self):
        return f"{self.plant.name} ({self.user.username})"

    def update_next_watering(self):

        """
        Metoda, która może obliczyć i zaktualizować datę następnego podlewania na podstawie
        optymalnej częstotliwości podlewania z modelu Plant.
        """
        from datetime import date, timedelta
        self.next_watering_date = date.today() + timedelta(days=self.plant.watering_frequency_days)
        self.save()

class WateringHistory(models.Model):
    """
    Historia podlewania dla roślin użytkownika.
    Po kliknięciu przycisku 'podlej' zostanie utworzony rekord z aktualną datą.
    """
    user_plant = models.ForeignKey(UserPlant, on_delete=models.CASCADE, related_name='watering_history')
    watered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_plant.plant.name} podlana {self.watered_at:%Y-%m-%d %H:%M}"
