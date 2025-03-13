from rest_framework import serializers
from .models import Plant, UserPlant, WateringHistory
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

# Serializer do rejestracji użytkownika
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)  # Potwierdzenie hasła

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {'email': {'required': True}}

    # Walidacja, aby oba hasła były takie same
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Hasła nie są takie same."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')  # Usunięcie potwierdzenia hasła z danych
        user = User.objects.create_user(**validated_data)
        return user

# Serializer globalnych roślin - konwertuje dane modelu Plant na JSON i odwrotnie.
class PlantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plant
        fields = '__all__'

# Serializer roślin użytkownika - umożliwia przypisanie rośliny (poprzez plant_id) do użytkownika,
# a także wyświetla szczegóły rośliny.
class UserPlantSerializer(serializers.ModelSerializer):
    plant = PlantSerializer(read_only=True)
    plant_id = serializers.PrimaryKeyRelatedField(
        queryset=Plant.objects.all(),
        source='plant',
        write_only=True
    )
    
    class Meta:
        model = UserPlant
        fields = ['id', 'user', 'plant', 'plant_id', 'added_at', 'next_watering_date']
        read_only_fields = ['user', 'added_at', 'next_watering_date']

# Serializer historii podlewania - konwertuje dane modelu WateringHistory na JSON.
class WateringHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WateringHistory
        fields = '__all__'
