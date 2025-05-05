# myapp/serializers.py
from rest_framework import serializers
from .models import Plant, UserPlant, WateringHistory
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework.exceptions import ValidationError

# --- FIX: Remove circular import ---
# from .views import AdminUserPlantViewSet # REMOVE THIS LINE

# UserRegistrationSerializer (OK as is)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')

    def validate(self, data):
        if User.objects.filter(username=data['username']).exists():
             raise serializers.ValidationError({"username": "Użytkownik o tej nazwie już istnieje."})
        if 'email' in data and data['email'] and User.objects.filter(email=data['email']).exists():
             raise serializers.ValidationError({"email": "Użytkownik o tym adresie email już istnieje."})

        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Hasła nie są identyczne."})

        validated_data = super().validate(data)
        validated_data.pop('password2')
        return validated_data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

# PlantSerializer
class PlantSerializer(serializers.ModelSerializer):
    proposed_by = serializers.ReadOnlyField(source='proposed_by.username')
    status = serializers.ChoiceField(choices=Plant.STATUS_CHOICES, read_only=True) # Default read-only

    class Meta:
        model = Plant
        fields = [
            'id', 'name', 'species', 'image', 'water_amount_ml',
            'watering_frequency_days', 'sunlight', 'soil_type',
            'preferred_temperature', 'status', 'proposed_by'
        ]
        read_only_fields = ['proposed_by']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request_user = self.context.get('request').user if 'request' in self.context else None

        # --- FIX: Check for specific context flag instead of view type ---
        is_admin_plant_view_context = self.context.get('is_admin_plant_view', False)

        # If in admin plant view context (staff/superuser), make status writable
        if is_admin_plant_view_context:
             self.fields['status'].read_only = False
        # Otherwise (standard user view, or non-admin view), status remains read-only (default)


# UserPlantSerializer
class UserPlantSerializer(serializers.ModelSerializer):
    plant = PlantSerializer(read_only=True)

    plant_id = serializers.PrimaryKeyRelatedField(
        queryset=Plant.objects.all(),
        source='plant',
        write_only=True
    )
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False
    )

    last_watered_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserPlant
        fields = [
            'id', 'user', 'plant', 'plant_id', 'added_at',
            'next_watering_date', 'last_watered_at'
        ]
        read_only_fields = ['added_at', 'next_watering_date', 'last_watered_at', 'plant']

    def __init__(self, *args, **kwargs):
         super().__init__(*args, **kwargs)
         # --- FIX: Check for specific context flag instead of view type ---
         is_admin_user_plant_view_context = self.context.get('is_admin_user_plant_view', False)

         # Make 'user' field writable ONLY in the admin user plant view context
         self.fields['user'].read_only = not is_admin_user_plant_view_context


    def get_last_watered_at(self, obj):
        last_watering = obj.watering_history.order_by('-watered_at').first()
        return timezone.localtime(last_watering.watered_at) if last_watering else None


# WateringHistorySerializer
class WateringHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WateringHistory
        fields = '__all__'
        read_only_fields = ['watered_at', 'user_plant']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.user_plant:
             representation['user'] = instance.user_plant.user.username
             representation['plant_name'] = instance.user_plant.plant.name
        return representation


# UserSerializer (Admin/Moderator Only)
class UserSerializer(serializers.ModelSerializer):
    is_moderator = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'is_moderator'
        ]
        read_only_fields = ['date_joined', 'last_login', 'is_superuser', 'is_moderator']

    def get_is_moderator(self, obj):
        return obj.is_staff and not obj.is_superuser

    def update(self, instance, validated_data):
        request_user = self.context.get('request').user

        if 'is_staff' in validated_data and validated_data['is_staff'] is True and not request_user.is_superuser:
             raise ValidationError({"is_staff": "Only administrators can grant moderator status."})

        return super().update(instance, validated_data)


# SetPasswordSerializer (Admin Only)
class SetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Hasła nie są identyczne."})
        return data