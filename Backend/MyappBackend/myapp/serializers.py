# myapp/serializers.py
from rest_framework import serializers
from .models import Plant, UserPlant, WateringHistory
from django.contrib.auth.models import User, Group # Import Group if using it for roles
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

# UserRegistrationSerializer (OK as is for now)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Hasła nie są identyczne."})
        # password2 is popped here, so it's not passed to create
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''), # email is optional in Django User model
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        # Note: password2 is already removed by validate method
        return user

# --- Updated PlantSerializer ---
class PlantSerializer(serializers.ModelSerializer):
    # proposed_by will be read-only for general users
    # For admin/moderator, it might be writable or displayed differently
    proposed_by = serializers.ReadOnlyField(source='proposed_by.username') # Display proposer's username

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
            'preferred_temperature',
            'status',       # Include status
            'proposed_by'   # Include proposed_by (read-only via source)
        ]
        read_only_fields = ['status', 'proposed_by'] # Default read-only for non-staff

    # Custom create to set default status and proposed_by
    def create(self, validated_data):
        # Assuming the user is available in the serializer context (set by the view)
        request_user = self.context['request'].user
        # New plants proposed by users default to pending
        validated_data['status'] = Plant.STATUS_PENDING
        validated_data['proposed_by'] = request_user
        return super().create(validated_data)


# UserPlantSerializer (Mostly fine, ensure it uses the updated PlantSerializer)
class UserPlantSerializer(serializers.ModelSerializer):
    # This will now use the updated PlantSerializer which includes status and proposed_by
    plant = PlantSerializer(read_only=True)
    plant_id = serializers.PrimaryKeyRelatedField(
        queryset=Plant.objects.all(),
        source='plant',
        write_only=True
    )
    last_watered_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserPlant
        fields = [
            'id',
            'user',
            'plant',
            'plant_id',
            'added_at',
            'next_watering_date',
            'last_watered_at'
            ]
        read_only_fields = ['user', 'added_at', 'next_watering_date', 'last_watered_at', 'plant']

    def get_last_watered_at(self, obj):
        # Use obj.watering_history for efficiency
        last_watering = obj.watering_history.order_by('-watered_at').first()
        # Convert to user's timezone if needed, otherwise use obj.watered_at directly
        # Assuming default Django settings handle timezone, use localtime
        return timezone.localtime(last_watering.watered_at) if last_watering else None

    # No need for custom create logic here, next_watering_date is calculated in the model's save or view's perform_create


# WateringHistorySerializer (OK as is)
class WateringHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WateringHistory
        fields = '__all__'
        read_only_fields = ['watered_at']


# --- New Serializer for User Management (Admin Only) ---
class UserSerializer(serializers.ModelSerializer):
    # Include staff and superuser status
    is_moderator = serializers.SerializerMethodField() # Custom field for clarity

    class Meta:
        model = User
        # Add fields needed for display and editing (exclude sensitive ones like password)
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',      # Moderator status
            'is_superuser',  # Admin status
            'date_joined',
            'last_login',
            'is_moderator' # Custom field
        ]
        read_only_fields = ['date_joined', 'last_login', 'is_superuser', 'is_moderator'] # is_superuser is read-only

    def get_is_moderator(self, obj):
        # Moderator check (e.g., if is_staff is the definition of a moderator)
        return obj.is_staff and not obj.is_superuser # Superusers are admins, not just moderators

    # Add update logic for changing user details (excluding password here)
    def update(self, instance, validated_data):
        # Prevent changing superuser status via this serializer for safety
        validated_data.pop('is_superuser', None)
         # Prevent changing moderator status if user is not an admin (handled by permission)
        # Also prevent non-admin from changing their OWN is_staff status
        request_user = self.context.get('request').user
        if 'is_staff' in validated_data and (not request_user.is_superuser or request_user == instance):
             validated_data.pop('is_staff', None)

        return super().update(instance, validated_data)


# Serializer specifically for changing a user's password (Admin Only)
class SetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Hasła nie są identyczne."})
        return data