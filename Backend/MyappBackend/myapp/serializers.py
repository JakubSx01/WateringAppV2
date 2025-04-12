# myapp/serializers.py
from rest_framework import serializers
from .models import Plant, UserPlant, WateringHistory
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

# UserRegistrationSerializer (no changes needed here)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Hasła nie są identyczne."})
        # Remove password2 before creating the user
        data.pop('password2')
        return data

    def create(self, validated_data):
        # Use create_user to handle password hashing
        user = User.objects.create_user(**validated_data)
        return user

# PlantSerializer (no changes needed here)
class PlantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plant
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

# --- Corrected UserPlantSerializer ---
class UserPlantSerializer(serializers.ModelSerializer):
    plant = PlantSerializer(read_only=True) # Display nested plant info on GET
    plant_id = serializers.PrimaryKeyRelatedField(
        queryset=Plant.objects.all(),
        source='plant', # Map incoming plant_id to the 'plant' field
        write_only=True # Only use plant_id for writing (POST/PUT)
    )
    last_watered_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserPlant
        fields = [
            'id',                   # Read-only after creation
            'user',                 # Read-only, set automatically
            'plant',                # Read-only (nested object)
            'plant_id',             # Write-only (for creating/updating)
            'added_at',             # Read-only
            'next_watering_date',   # Read-only (calculated)
            'last_watered_at'       # Read-only (method field)
            ]
        # User is set by the view, others are auto/calculated
        read_only_fields = ['user', 'added_at', 'next_watering_date', 'last_watered_at', 'plant']

    def get_last_watered_at(self, obj):
        last_watering = obj.watering_history.order_by('-watered_at').first()
        # Use obj.watering_history which is the related_name='watering_history'
        # from WateringHistory model. It's more efficient than filtering globally.
        return timezone.localtime(last_watering.watered_at) if last_watering else None

    def create(self, validated_data):
        # 'user' is automatically added to validated_data by view's perform_create
        # user = self.context['request'].user # <- No longer needed here

        # Get the plant object (correctly sourced from plant_id)
        plant = validated_data.get('plant') # Use .get() for safety, though required by plant_id field

        if not plant:
             # This case shouldn't happen if plant_id validation passes, but good practice
             raise serializers.ValidationError("Plant ID is required.")

        # Calculate next_watering_date based on the associated Plant
        next_watering_date = timezone.now().date() + timezone.timedelta(days=plant.watering_frequency_days)

        # Add the calculated date to the data before creating the UserPlant instance
        validated_data['next_watering_date'] = next_watering_date

        # Create the UserPlant instance using the validated data (which includes 'user' and 'plant')
        # No explicit 'user=...' here because it's already in validated_data thanks to perform_create
        try:
            instance = UserPlant.objects.create(**validated_data)
            return instance
        except Exception as e:
            # Catch potential database errors (like unique_together constraint)
            # Although DRF validation should handle unique_together, explicit catch can help debugging
            print(f"Error creating UserPlant: {e}") # Log the specific error
            # Re-raise a validation error for DRF to handle
            raise serializers.ValidationError(f"Could not create UserPlant entry. Error: {e}")


# WateringHistorySerializer (no changes needed here)
class WateringHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WateringHistory
        fields = '__all__'
        read_only_fields = ['watered_at']