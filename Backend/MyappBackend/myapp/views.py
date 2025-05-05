# myapp/views.py
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException
from django.db import IntegrityError
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly

from django.utils import timezone

# Import models - ADD THIS LINE
from .models import Plant, UserPlant, WateringHistory

# Import serializers
from .serializers import (
    PlantSerializer,
    UserPlantSerializer,
    WateringHistorySerializer,
    UserRegistrationSerializer,
    UserSerializer,
    SetPasswordSerializer
)

# --- Custom Permissions ---
class IsModeratorOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow staff (moderators) and superusers (admins) access.
    """
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)

class IsAdminOnly(permissions.BasePermission):
    """
    Custom permission to only allow superusers (admins) access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser


# UserRegistrationView
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": "Rejestracja zakończona pomyślnie."}, status=status.HTTP_201_CREATED)


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

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
             raise PermissionDenied("Authentication is required to propose a new plant.")

        serializer.save(status=Plant.STATUS_PENDING, proposed_by=self.request.user)

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
            print(f"IntegrityError creating UserPlant: {e}")
            raise ValidationError("Wystąpił błąd podczas dodawania rośliny do kolekcji. Możliwe, że już ją posiadasz lub wystąpił błąd danych.")
        except Exception as e:
            print(f"Unexpected error creating UserPlant: {e}")
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

# AdminPlantViewSet (Admin/Mod managing ALL Plant Definitions)
class AdminPlantViewSet(viewsets.ModelViewSet):
    queryset = Plant.objects.all().select_related('proposed_by')
    serializer_class = PlantSerializer
    permission_classes = [IsModeratorOrAdmin]

    def get_serializer_context(self):
        """Add custom context flag for serializer to know it's an admin view."""
        context = super().get_serializer_context()
        context['is_admin_plant_view'] = True # Use a specific flag
        return context


    def create(self, request, *args, **kwargs):
         if not (request.user.is_staff or request.user.is_superuser):
              raise PermissionDenied("Only administrators or moderators can create plant definitions directly.")

         serializer = self.get_serializer(data=request.data) # Context is added by get_serializer_context
         serializer.is_valid(raise_exception=True)
         instance = serializer.save()
         headers = self.get_success_headers(serializer.data)
         return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
         kwargs['partial'] = True
         instance = self.get_object()
         serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False)) # Context added here too
         serializer.is_valid(raise_exception=True)
         self.perform_update(serializer)
         return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsModeratorOrAdmin])
    def approve(self, request, pk=None):
        plant = self.get_object()
        plant.status = Plant.STATUS_APPROVED
        plant.save(update_fields=['status'])
        serializer = self.get_serializer(plant) # Context added here
        return Response({'status': 'plant approved', 'plant': serializer.data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsModeratorOrAdmin])
    def reject(self, request, pk=None):
        plant = self.get_object()
        plant.status = Plant.STATUS_REJECTED
        plant.save(update_fields=['status'])
        serializer = self.get_serializer(plant) # Context added here
        return Response({'status': 'plant rejected', 'plant': serializer.data}, status=status.HTTP_200_OK)


# AdminUserPlantViewSet (Admin/Mod managing ALL User Plants)
class AdminUserPlantViewSet(viewsets.ModelViewSet):
    queryset = UserPlant.objects.all().select_related('user', 'plant')
    serializer_class = UserPlantSerializer
    permission_classes = [IsModeratorOrAdmin]

    def get_serializer_context(self):
        """Add custom context flag for serializer to know it's an admin user plant view."""
        context = super().get_serializer_context()
        context['is_admin_user_plant_view'] = True # Use a different flag
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
         serializer = self.get_serializer(data=request.data) # Context added here
         serializer.is_valid(raise_exception=True)

         plant_instance = serializer.validated_data.get('plant')
         if not plant_instance or plant_instance.status != Plant.STATUS_APPROVED:
              raise ValidationError({"plant_id": "Możesz dodać tylko zatwierdzone definicje roślin do kolekcji użytkownika."})

         user_instance = serializer.validated_data.get('user')
         if not user_instance:
             raise ValidationError({"user": "Użytkownik musi być podany podczas dodawania rośliny przez administratora."})

         initial_next_watering = timezone.localdate() + timezone.timedelta(days=plant_instance.watering_frequency_days)

         instance = serializer.save(user=user_instance, next_watering_date=initial_next_watering)

         headers = self.get_success_headers(serializer.data)
         return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        user_plant = self.get_object()
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering()
        serializer = self.get_serializer(user_plant) # Context added here
        return Response(serializer.data, status=status.HTTP_200_OK)


# AdminUserViewSet (Admin/Mod managing Users)
class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsModeratorOrAdmin]

    def get_serializer_context(self):
         """Add context to serializer if needed (e.g., for permissions logic in serializer)."""
         context = super().get_serializer_context()
         # context['is_admin_user_view'] = True # Example context flag if needed
         return context

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied("Only administrators can create users.")
        serializer = self.get_serializer(data=request.data) # Context added here
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

        serializer = self.get_serializer(user) # Serialize the created user for response
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        request_user = request.user

        if not request_user.is_superuser:
            if instance.is_superuser or (instance.is_staff and instance != request_user):
                 raise PermissionDenied("You do not have permission to update administrators or other moderators.")

        if not request_user.is_superuser and 'is_superuser' in request.data:
             raise PermissionDenied("Only administrators can change superuser status.")

        kwargs['partial'] = True
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False)) # Context added here
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
             raise PermissionDenied("Only administrators can delete users.")
        instance = self.get_object()

        if request.user == instance:
             raise ValidationError("Nie możesz usunąć własnego konta administratora.")

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly])
    def set_password(self, request, pk=None):
        user = self.get_object()

        # Prevent an admin from setting the password for another superuser account
        if user.is_superuser and request.user != user:
             raise PermissionDenied("Administrators cannot change the password of other administrator accounts.")

        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])

        # print(f"DEBUG: Password successfully set for user ID: {pk}")
        return Response({'status': 'password set successfully'}, status=status.HTTP_200_OK)


# CurrentUserView
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get(self, request):
        serializer = self.serializer_class(request.user, context={'request': request})
        return Response(serializer.data)