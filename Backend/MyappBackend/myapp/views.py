# myapp/views.py
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException
from django.db import IntegrityError, models
from django.contrib.auth.models import User # Import User model
from django.contrib.auth.hashers import make_password # Import make_password
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer # Reuse UserSerializer

from .models import Plant, UserPlant, WateringHistory
from .serializers import (
    PlantSerializer,
    UserPlantSerializer,
    WateringHistorySerializer,
    UserRegistrationSerializer,
    UserSerializer,         # Import new User serializer
    SetPasswordSerializer   # Import password serializer
)

# --- Custom Permissions ---
# IsAdminUser is already built-in (is_superuser)
# IsStaffUser checks if user.is_staff is True (can be used for Moderators)
class IsModeratorOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow staff (moderators) and superusers (admins) access.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated request if needed,
        # but for these views, we restrict write access to staff/admin.
        # The viewset's get_queryset should handle read restrictions.
        return request.user and (request.user.is_staff or request.user.is_superuser)

class IsAdminOnly(permissions.BasePermission):
    """
    Custom permission to only allow superusers (admins) access.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


# UserRegistrationView (OK as is, already uses AllowAny)
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Optional: Prevent registration if not allowed (e.g., admin only registration)
        # For now, AllowAny is fine per original code.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Optional: Log or send confirmation email here
        return Response({"message": "Rejestracja zakończona pomyślnie."}, status=status.HTTP_201_CREATED)


# --- Updated PlantViewSet (Global Plant Definitions) ---
class PlantViewSet(viewsets.ModelViewSet):
    # Users can read approved plants. Staff/Admin can read all, create, update, delete.
    # Moderation actions (approve/reject) are separate actions.
    serializer_class = PlantSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # Allow anyone to see, authenticated to propose

    def get_queryset(self):
            user = self.request.user
            if user and (user.is_staff or user.is_superuser):
                return Plant.objects.all() # Staff/Admin see all
            else:
                # Regular users (authenticated or not) only see approved plants
                return Plant.objects.filter(status=Plant.STATUS_APPROVED)
            
    def perform_create(self, serializer):
        # Set proposed_by and default status to PENDING
        serializer.save(proposed_by=self.request.user, status=Plant.STATUS_PENDING)
        # Note: PlantSerializer create method already sets status=PENDING and proposed_by.
        # This perform_create might be redundant if create is overridden in serializer,
        # but it's good practice in viewset if logic is complex or needs request context.
        # Let's keep the logic in serializer's create for now as shown in Serializers section.
        # serializer.save() # -> Call without arguments if create handles it


    # Restrict update/delete to staff/admin
    def perform_update(self, serializer):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            # Should be caught by permission_classes if IsAdminOrModerator was used.
            # With IsAuthenticatedOrReadOnly, we need an explicit check here for updates.
            # Or override update() method completely.
            # Let's use IsModeratorOrAdmin permission class for update/destroy.
            raise PermissionDenied("You do not have permission to edit plant definitions.")
        serializer.save()

    def perform_destroy(self, instance):
         if not (self.request.user.is_staff or self.request.user.is_superuser):
            raise PermissionDenied("You do not have permission to delete plant definitions.")
         instance.delete()


    # --- New Actions for Moderation ---
    @action(detail=True, methods=['post'], permission_classes=[IsModeratorOrAdmin])
    def approve(self, request, pk=None):
        plant = self.get_object()
        plant.status = Plant.STATUS_APPROVED
        plant.save()
        return Response({'status': 'plant approved', 'plant': PlantSerializer(plant).data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsModeratorOrAdmin])
    def reject(self, request, pk=None):
        plant = self.get_object()
        plant.status = Plant.STATUS_REJECTED
        plant.save()
        # Optional: Add a reason for rejection field
        return Response({'status': 'plant rejected', 'plant': PlantSerializer(plant).data}, status=status.HTTP_200_OK)


# --- Updated UserPlantViewSet (User's Shelf) ---
class UserPlantViewSet(viewsets.ModelViewSet):
    # Users manage their OWN plants. Admin/Moderator can manage ALL user plants via a separate viewset.
    serializer_class = UserPlantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Ensure users only see their own UserPlants
        return UserPlant.objects.filter(user=self.request.user).select_related('plant') # Optimize with select_related

    def perform_create(self, serializer):
        # Ensure the user is adding an APPROVED plant definition
        plant_id = serializer.validated_data.get('plant').id # Get plant ID from validated data
        try:
            plant_definition = Plant.objects.get(id=plant_id)
            if plant_definition.status != Plant.STATUS_APPROVED:
                 raise ValidationError("You can only add approved plant definitions to your collection.")

            # Create the UserPlant instance
            # Calculate initial next_watering_date
            initial_next_watering = timezone.localdate() + timezone.timedelta(days=plant_definition.watering_frequency_days)
            serializer.save(user=self.request.user, next_watering_date=initial_next_watering)

        except Plant.DoesNotExist:
             raise ValidationError("Selected plant definition does not exist.")
        except IntegrityError:
            # This catch is less likely after removing unique_together, but good practice
            # DRF serializer validation should handle most cases.
             raise ValidationError("Failed to add plant. It might already be in your collection (though multiple allowed now, check logic).") # Adjust message


    def perform_update(self, serializer):
        # Ensure users can only update their own UserPlants (handled by get_queryset)
        # Prevent changing the 'user' or 'plant' fields via update if necessary
        # (Serializer read_only_fields helps here)
        serializer.save()

    def perform_destroy(self, instance):
        # Ensure users can only delete their own UserPlants (handled by get_queryset)
        instance.delete()


    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        user_plant = self.get_object() # get_object already filters by user based on get_queryset

        # Re-check ownership just to be absolutely safe, though get_object filters
        # if user_plant.user != request.user:
        #    return Response({'error': 'Brak dostępu do tej rośliny'}, status=status.HTTP_403_FORBIDDEN)

        # Rejestrowanie podlewania
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering() # This method handles saving

        # Return the updated user_plant data in the response
        serializer = self.get_serializer(user_plant)
        return Response(serializer.data, status=status.HTTP_200_OK)


# WateringHistoryViewSet (OK as is, filters by user's plants)
class WateringHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WateringHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WateringHistory.objects.filter(user_plant__user=self.request.user).order_by('-watered_at')


# --- New ViewSets for Admin and Moderator Panels ---

# ViewSet for Admin/Moderator to manage ALL Plant Definitions
class AdminPlantViewSet(viewsets.ModelViewSet):
    queryset = Plant.objects.all().select_related('proposed_by') # Include proposer
    serializer_class = PlantSerializer # Use the same serializer
    permission_classes = [IsModeratorOrAdmin] # Restrict to staff/admin

    # No need for custom create/update/delete methods here unless
    # Admin/Moderator creation/update logic differs from regular users.
    # For now, they can use the standard create/update/delete with full fields
    # (assuming PlantSerializer allows status/proposed_by edits for staff/admin context,
    # which it currently doesn't - need to adjust serializer or override methods if staff/admin
    # should edit status directly via PUT/PATCH, not just 'approve'/'reject' actions).
    # Let's add status/proposed_by to writable fields for staff/admin in the serializer context.

    # Alternative: Override update to allow staff/admin to change status directly
    def update(self, request, *args, **kwargs):
         instance = self.get_object()
         # Pass the request context to the serializer
         serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False), context={'request': request})
         serializer.is_valid(raise_exception=True)

         # --- Custom Logic: Allow status and proposed_by changes for staff/admin ---
         if request.user.is_staff or request.user.is_superuser:
              # Allow updating status
              if 'status' in serializer.validated_data:
                   instance.status = serializer.validated_data['status']
              # Allow changing proposed_by (requires User object)
              # If proposed_by is sent as username, you need to resolve it
              # For simplicity, let's assume proposed_by is read-only even for staff/admin
              # Or require sending proposed_by_id
              # If proposed_by field is made writable in serializer, this logic is handled there
              pass # Let serializer handle standard fields

         self.perform_update(serializer)
         return Response(serializer.data)


# ViewSet for Admin/Moderator to manage ALL User Plants
class AdminUserPlantViewSet(viewsets.ModelViewSet):
    queryset = UserPlant.objects.all().select_related('user', 'plant') # Include related objects
    serializer_class = UserPlantSerializer # Use the same serializer
    permission_classes = [IsModeratorOrAdmin] # Restrict to staff/admin

    # Admin/Moderator can create a UserPlant for any user
    # Need to modify create logic or serializer to accept user_id in addition to plant_id
    # Let's add a user_id field to UserPlantSerializer specifically for writing in admin context.

    # Overriding create to allow specifying user_id
    def create(self, request, *args, **kwargs):
         serializer = self.get_serializer(data=request.data)
         serializer.is_valid(raise_exception=True)

         # Admin/Moderator should be able to specify a user_id
         user_id = request.data.get('user') # Assuming user ID is sent as 'user' in the request body
         if user_id is None:
              raise ValidationError({"user": "User ID is required for creating a UserPlant in this view."})

         try:
             target_user = User.objects.get(id=user_id)
         except User.DoesNotExist:
             raise ValidationError({"user": "Invalid User ID."})

         # Ensure the plant definition is approved
         plant_id = serializer.validated_data.get('plant').id
         try:
            plant_definition = Plant.objects.get(id=plant_id)
            if plant_definition.status != Plant.STATUS_APPROVED:
                 raise ValidationError({"plant_id": "You can only add approved plant definitions."})
         except Plant.DoesNotExist:
             raise ValidationError({"plant_id": "Invalid Plant ID."})


         # Calculate initial next_watering_date
         initial_next_watering = timezone.localdate() + timezone.timedelta(days=plant_definition.watering_frequency_days)

         # Save with the specified user and calculated date
         instance = serializer.save(user=target_user, next_watering_date=initial_next_watering)

         headers = self.get_success_headers(serializer.data)
         return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # Standard update/delete/retrieve methods are fine, they operate on the specified pk


    # Water action for Admin/Moderator (can water any user's plant)
    @action(detail=True, methods=['post']) # Permissions are handled at the viewset level
    def water(self, request, pk=None):
        user_plant = self.get_object() # Get the specific UserPlant instance

        # Re-check permission explicitly if needed, but viewset permission should be enough
        # if not (request.user.is_staff or request.user.is_superuser):
        #     raise PermissionDenied(...)

        # Rejestrowanie podlewania
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering()

        serializer = self.get_serializer(user_plant)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ViewSet for Admin/Moderator to manage Users
class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username') # Order users
    serializer_class = UserSerializer
    permission_classes = [IsModeratorOrAdmin] # Staff/Admin can list/view users
    # Create/Update/Delete require IsAdminOnly (superuser)
    # Use method-level permissions or override methods

    # List and Retrieve are accessible by Moderator/Admin
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    # Create, Update, Destroy require Admin privileges
    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied("Only administrators can create users.")
        # Use UserRegistrationSerializer for creation if full details are needed
        # Or a simplified UserSerializer if only basic fields are allowed
        # Let's use a simplified serializer for admin creation here
        serializer = UserSerializer(data=request.data, context={'request': request}) # Pass context
        serializer.is_valid(raise_exception=True)
        # Manually hash password if sending it plain in request
        # Best practice: Use a dedicated serializer or action for password setting
        # For creation, if password is sent, hash it. Assuming password is NOT in UserSerializer fields for safety
        # If password needs to be set on creation by admin, use a combined serializer or separate step.
        # Let's assume password is NOT set via initial creation, admin sets it later.

        # Ensure staff/superuser status can only be set by superuser
        if not request.user.is_superuser:
             if serializer.validated_data.get('is_staff') or serializer.validated_data.get('is_superuser'):
                  raise ValidationError("Only administrators can set staff or superuser status.")

        user = serializer.save() # Save the user
        # Handle password setting separately

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
             # Allow staff to update non-sensitive fields of other users? Or only admins?
             # Let's say Moderators can update non-sensitive fields (first_name, last_name, is_active)
             # But only Admins can change is_staff or delete users.
             instance = self.get_object()
             # Check if staff/superuser status is being changed by a non-superuser
             if ('is_staff' in request.data or 'is_superuser' in request.data) and not request.user.is_superuser:
                  raise PermissionDenied("Only administrators can change staff or superuser status.")
             # Check if staff is trying to change their own staff status (should not be allowed?)
             # Handled in UserSerializer update method
             pass # Continue with update

        # If user is superuser or allowed fields are updated by staff
        kwargs['partial'] = True # Allow partial updates
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False), context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
             raise PermissionDenied("Only administrators can delete users.")
        instance = self.get_object()
        # Optional: Prevent deleting the *current* admin user
        if request.user == instance:
             raise ValidationError("You cannot delete your own administrator account.")
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Action for Admin to set a user's password
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOnly]) # Only superuser
    def set_password(self, request, pk=None):
        user = self.get_object() # The user whose password is being set
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'status': 'password set successfully'}, status=status.HTTP_200_OK)

    # --- IP Whitelisting Note ---
    # IP whitelisting for Admin actions (or even just accessing admin views)
    # should ideally be handled server-side, possibly in a middleware or a custom permission class
    # that checks request.META['REMOTE_ADDR'] against a list defined in settings.
    # Implementing this accurately requires more setup (e.g., handling proxy headers if used)
    # For this exercise, we will skip explicit IP whitelist code, but note that views above
    # are where you would integrate such checks (e.g., in a custom permission or view dispatch).
    # Example check:
    # def dispatch(self, request, *args, **kwargs):
    #     allowed_ips = ['127.0.0.1'] # Example list from settings
    #     if not request.user.is_superuser or request.META.get('REMOTE_ADDR') not in allowed_ips:
    #         raise PermissionDenied("Access from this IP is not allowed for admin.")
    #     return super().dispatch(request, *args, **kwargs)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer # Use the UserSerializer to format the output

    def get(self, request):
        serializer = self.serializer_class(request.user) # Use self.serializer_class
        return Response(serializer.data) # Make sure Response is imported