# myapp/views.py
import logging
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException
from django.db import IntegrityError
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly

# Usunięto importy django.utils.decorators i ratelimit.decorators

from django.contrib.auth.signals import user_login_failed
from django.dispatch import receiver
from django.utils import timezone

from .models import Plant, UserPlant, WateringHistory
from .serializers import (
    PlantSerializer, UserPlantSerializer, WateringHistorySerializer,
    UserRegistrationSerializer, UserSerializer, SetPasswordSerializer
)

security_logger = logging.getLogger('security')
app_logger = logging.getLogger('myapp')

# --- Custom Permissions ---
class IsModeratorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)

class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

# UserRegistrationView
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            security_logger.info(
                f"User registered successfully: username='{user.username}', email='{user.email}'",
                extra={'request': request}
            )
            return Response({"message": "Rejestracja zakończona pomyślnie."}, status=status.HTTP_201_CREATED)
        except ValidationError as e:
             security_logger.warning(
                 f"User registration validation failed: Errors: {e.detail}",
                 extra={'request': request}
             )
             raise e
        except Exception as e:
             app_logger.exception(
                 f"Unexpected error during registration: {e}",
                 extra={'request': request}
             )
             security_logger.error(
                 f"Unexpected server error during registration attempt.",
                  extra={'request': request}
             )
             raise APIException("Wystąpił nieoczekiwany błąd serwera.")

# PlantViewSet (Standard User/Public)
class PlantViewSet(viewsets.ModelViewSet):
    serializer_class = PlantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user and (user.is_staff or user.is_superuser):
             return Plant.objects.all().select_related('proposed_by')
        else:
             return Plant.objects.filter(status=Plant.STATUS_APPROVED).select_related('proposed_by')

    # Usunięto dekorator ratelimit
    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
             security_logger.warning(
                 f"Unauthorized attempt to propose plant.",
                 extra={'request': self.request}
             )
             raise PermissionDenied("Authentication is required to propose a new plant.")
        instance = serializer.save(status=Plant.STATUS_PENDING, proposed_by=self.request.user)
        app_logger.info(
            f"User '{self.request.user.username}' proposed plant '{instance.name}' (ID: {instance.id}).",
             extra={'request': self.request}
        )

    def update(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
             raise PermissionDenied("Editing plant definitions is not allowed via this endpoint.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not (request.user.is_staff or request.user.is_superuser):
             raise PermissionDenied("Deleting plant definitions is not allowed via this endpoint.")
        return super().destroy(request, *args, **kwargs)

# UserPlantViewSet (User's Shelf)
class UserPlantViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPlant.objects.filter(user=self.request.user).select_related('plant')

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
             raise PermissionDenied("Authentication is required to add a plant to your collection.")

        plant_id = serializer.validated_data.get('plant').id
        try:
            plant_definition = Plant.objects.get(id=plant_id)
            if plant_definition.status != Plant.STATUS_APPROVED:
                 raise ValidationError({"plant_id": "Możesz dodać do swojej kolekcji tylko zatwierdzone definicje roślin."})

            initial_next_watering = timezone.localdate() + timezone.timedelta(days=plant_definition.watering_frequency_days)

            serializer.save(user=self.request.user, next_watering_date=initial_next_watering)

        except Plant.DoesNotExist:
             raise ValidationError({"plant_id": "Wybrana definicja rośliny nie istnieje."})
        except IntegrityError as e:
            app_logger.error(f"IntegrityError creating UserPlant for user {self.request.user.id}, plant {plant_id}: {e}", extra={'request': self.request})
            raise ValidationError("Wystąpił błąd podczas dodawania rośliny do kolekcji. Możliwe, że już ją posiadasz lub wystąpił błąd danych.")
        except Exception as e:
            app_logger.exception(f"Unexpected error creating UserPlant for user {self.request.user.id}, plant {plant_id}: {e}", extra={'request': self.request})
            raise APIException("Wystąpił nieoczekiwany błąd serwera.")

    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        user_plant = self.get_object()
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering()
        serializer = self.get_serializer(user_plant)
        return Response(serializer.data, status=status.HTTP_200_OK)

# WateringHistoryViewSet
class WateringHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WateringHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WateringHistory.objects.filter(user_plant__user=self.request.user).order_by('-watered_at')

# --- ViewSets for Admin Panel (Admin and Moderator Access) ---

# AdminPlantViewSet
class AdminPlantViewSet(viewsets.ModelViewSet):
    queryset = Plant.objects.all().select_related('proposed_by')
    serializer_class = PlantSerializer
    permission_classes = [IsModeratorOrAdmin]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['is_admin_plant_view'] = True
        return context

    def create(self, request, *args, **kwargs):
         if not (request.user.is_staff or request.user.is_superuser):
              raise PermissionDenied("Only administrators or moderators can create plant definitions directly.")
         serializer = self.get_serializer(data=request.data)
         serializer.is_valid(raise_exception=True)
         instance = serializer.save()
         app_logger.info(
             f"Admin/Mod '{request.user.username}' created new plant definition '{instance.name}' (ID: {instance.id}).",
             extra={'request': request}
         )
         headers = self.get_success_headers(serializer.data)
         return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        instance = serializer.save()
        app_logger.info(
             f"Admin/Mod '{self.request.user.username}' updated plant definition '{instance.name}' (ID: {instance.id}).",
             extra={'request': self.request}
        )

    def perform_destroy(self, instance):
        plant_name = instance.name
        plant_id = instance.id
        super().perform_destroy(instance)
        security_logger.warning(
             f"Admin/Mod '{self.request.user.username}' DELETED plant definition '{plant_name}' (ID: {plant_id}).",
             extra={'request': self.request}
        )

    @action(detail=True, methods=['post'], permission_classes=[IsModeratorOrAdmin])
    def approve(self, request, pk=None):
        plant = self.get_object()
        plant.status = Plant.STATUS_APPROVED
        plant.save(update_fields=['status'])
        serializer = self.get_serializer(plant)
        security_logger.info(
            f"Admin/Mod '{request.user.username}' APPROVED plant '{plant.name}' (ID: {plant.id}).",
            extra={'request': request}
        )
        return Response({'status': 'plant approved', 'plant': serializer.data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsModeratorOrAdmin])
    def reject(self, request, pk=None):
        plant = self.get_object()
        plant.status = Plant.STATUS_REJECTED
        plant.save(update_fields=['status'])
        serializer = self.get_serializer(plant)
        security_logger.info(
            f"Admin/Mod '{request.user.username}' REJECTED plant '{plant.name}' (ID: {plant.id}).",
            extra={'request': request}
        )
        return Response({'status': 'plant rejected', 'plant': serializer.data}, status=status.HTTP_200_OK)

# AdminUserPlantViewSet
class AdminUserPlantViewSet(viewsets.ModelViewSet):
    queryset = UserPlant.objects.all().select_related('user', 'plant')
    serializer_class = UserPlantSerializer
    permission_classes = [IsModeratorOrAdmin]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['is_admin_user_plant_view'] = True
        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        if user_id is not None:
             try:
                 user_id = int(user_id)
                 queryset = queryset.filter(user_id=user_id)
             except ValueError:
                 queryset = queryset.none()
        return queryset

    def create(self, request, *args, **kwargs):
         serializer = self.get_serializer(data=request.data)
         serializer.is_valid(raise_exception=True)
         plant_instance = serializer.validated_data.get('plant')
         if not plant_instance or plant_instance.status != Plant.STATUS_APPROVED:
              raise ValidationError({"plant_id": "Możesz dodać tylko zatwierdzone definicje roślin do kolekcji użytkownika."})
         user_instance = serializer.validated_data.get('user')
         if not user_instance:
             raise ValidationError({"user": "Użytkownik musi być podany podczas dodawania rośliny przez administratora."})
         initial_next_watering = timezone.localdate() + timezone.timedelta(days=plant_instance.watering_frequency_days)
         instance = serializer.save(user=user_instance, next_watering_date=initial_next_watering)
         app_logger.info(
             f"Admin/Mod '{request.user.username}' added plant '{plant_instance.name}' to user '{user_instance.username}'.",
             extra={'request': request}
         )
         headers = self.get_success_headers(serializer.data)
         return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_destroy(self, instance):
        user_plant_info = f"UserPlant ID {instance.id} (Plant: {instance.plant.name}, User: {instance.user.username})"
        super().perform_destroy(instance)
        security_logger.warning(
            f"Admin/Mod '{self.request.user.username}' deleted {user_plant_info}.",
            extra={'request': self.request}
        )

    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        user_plant = self.get_object()
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering()
        serializer = self.get_serializer(user_plant)
        app_logger.info(
            f"Admin/Mod '{request.user.username}' watered plant '{user_plant.plant.name}' for user '{user_plant.user.username}'.",
            extra={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

# AdminUserViewSet
class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsModeratorOrAdmin]

    def get_serializer_context(self):
         context = super().get_serializer_context()
         return context

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied("Only administrators can create users.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.is_superuser:
             if serializer.validated_data.get('is_staff', False) is True or serializer.validated_data.get('is_superuser', False) is True:
                  raise ValidationError("Only administrators can set staff or superuser status.")
        user = User.objects.create_user(
            username=serializer.validated_data['username'],
            email=serializer.validated_data.get('email', ''),
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', ''),
            is_active=serializer.validated_data.get('is_active', True),
            is_staff=serializer.validated_data.get('is_staff', False),
            is_superuser=serializer.validated_data.get('is_superuser', False)
        )
        security_logger.info(
            f"Administrator '{request.user.username}' created user '{user.username}'.",
            extra={'request': request}
        )
        serializer = self.get_serializer(user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        instance = self.get_object()
        original_data = UserSerializer(instance).data
        updated_instance = serializer.save()
        changed_fields = [k for k, v in serializer.validated_data.items()]
        security_logger.info(
              f"Admin/Mod '{self.request.user.username}' updated user details for '{updated_instance.username}' (ID: {updated_instance.id}). Changed fields: {changed_fields}",
              extra={'request': self.request}
        )

    def perform_destroy(self, instance):
        username = instance.username
        user_id = instance.id
        if not self.request.user.is_superuser:
             security_logger.warning(
                  f"Moderator '{self.request.user.username}' UNAUTHORIZED attempt to delete user '{username}' (ID: {user_id}).",
                  extra={'request': self.request}
             )
             raise PermissionDenied("Only administrators can delete users.")
        if self.request.user == instance:
             security_logger.warning(
                  f"Administrator '{self.request.user.username}' attempted to delete own account.",
                  extra={'request': self.request}
             )
             raise ValidationError("Nie możesz usunąć własnego konta administratora.")
        super().perform_destroy(instance)
        security_logger.warning(
             f"Administrator '{self.request.user.username}' DELETED user '{username}' (ID: {user_id}).",
             extra={'request': self.request}
        )

    # Usunięto dekorator ratelimit
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def set_password(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser and request.user != user:
             security_logger.warning(
                  f"Administrator '{request.user.username}' UNAUTHORIZED attempt to set password for administrator '{user.username}'.",
                  extra={'request': request}
             )
             raise PermissionDenied("Administrators cannot change the password of other administrator accounts.")
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        security_logger.info(
             f"Administrator '{request.user.username}' successfully set password for user '{user.username}' (ID: {user.id}).",
             extra={'request': request}
        )
        return Response({'status': 'password set successfully'}, status=status.HTTP_200_OK)

# CurrentUserView
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get(self, request):
        serializer = self.serializer_class(request.user, context={'request': request})
        return Response(serializer.data)

# Signal receiver for failed login attempts
@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    username = credentials.get('username', 'unknown_user')
    security_logger.warning(
        f"Failed login attempt for username='{username}'.",
        extra={'request': request}
    )