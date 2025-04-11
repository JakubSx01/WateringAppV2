from rest_framework import serializers
from .models import Plant, UserPlant, WateringHistory
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

# Rejestracja użytkownika
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)  # Potwierdzenie hasła

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Hasła nie są identyczne."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)

# Globalne rośliny
class PlantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plant
        # Upewnij się, że WSZYSTKIE te pola tu są
        fields = [
            'id',
            'name',
            'species',
            'image',
            'water_amount_ml',
            'watering_frequency_days',
            'sunlight',                 
            'soil_type',                
            'preferred_temperature'     
        ]

# Rośliny przypisane do użytkownika
class UserPlantSerializer(serializers.ModelSerializer):
    plant = PlantSerializer(read_only=True)
    plant_id = serializers.PrimaryKeyRelatedField(
        queryset=Plant.objects.all(),
        source='plant',
        write_only=True
    )
    # Dodajemy pole SerializerMethodField dla daty ostatniego podlewania
    last_watered_at = serializers.SerializerMethodField()

    class Meta:
        model = UserPlant
        # Dodaj 'last_watered_at' do pól
        fields = ['id', 'plant', 'plant_id', 'added_at', 'next_watering_date', 'last_watered_at']
        read_only_fields = ['user', 'added_at', 'next_watering_date', 'last_watered_at'] # Dodaj 'last_watered_at'

    def get_last_watered_at(self, obj):
        """Zwraca datę ostatniego podlewania dla danej rośliny użytkownika."""
        last_watering = WateringHistory.objects.filter(user_plant=obj).order_by('-watered_at').first()
        if last_watering:
            # Używamy timezone.localtime, aby przekonwertować na lokalną strefę czasową (jeśli USE_TZ=True)
            # Możesz też zwrócić po prostu last_watering.watered_at, jeśli nie potrzebujesz konwersji
            return timezone.localtime(last_watering.watered_at)
        return None # Zwróć None, jeśli roślina nie była jeszcze podlewana

    def create(self, validated_data):
        user = self.context['request'].user
        # Przy tworzeniu nowej UserPlant, od razu ustawiamy datę następnego podlewania
        plant = validated_data['plant']
        next_watering_date = timezone.now().date() + timezone.timedelta(days=plant.watering_frequency_days)
        # Zapisujemy obiekt z dodatkowymi danymi
        return UserPlant.objects.create(user=user, next_watering_date=next_watering_date, **validated_data)


# Historia podlewania
class WateringHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WateringHistory
        fields = '__all__' # Możesz tu też wybrać konkretne pola, jeśli chcesz
        read_only_fields = ['watered_at'] # data jest ustawiana automatycznie
