from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny # Ensure AllowAny is imported

from myapp.views import (
    PlantViewSet, # Standard user/public (Read-only list, POST to propose)
    UserPlantViewSet, # Standard user's plants
    WateringHistoryViewSet, # Standard user's history
    UserRegistrationView, # Registration (AllowAny)
    AdminPlantViewSet, # Admin/Mod managing ALL plants/definitions
    AdminUserPlantViewSet, # Admin/Mod managing ALL user plants
    AdminUserViewSet, # Admin/Mod managing users
    CurrentUserView # Get current user details
)

# Standard user API routes
router = DefaultRouter()
# PlantViewSet now allows POST for proposing, but list/retrieve are read-only (handled by get_queryset)
router.register(r'plants', PlantViewSet, basename='plant')
router.register(r'user-plants', UserPlantViewSet, basename='userplant')
router.register(r'watering-history', WateringHistoryViewSet, basename='wateringhistory')

# Admin/Moderator API routes (all under /api/admin/)
admin_router = DefaultRouter()
admin_router.register(r'plants', AdminPlantViewSet, basename='admin-plant') # Admin/Mod managing ALL plants/definitions
admin_router.register(r'user-plants', AdminUserPlantViewSet, basename='admin-userplant') # Admin/Mod managing ALL user plants
admin_router.register(r'users', AdminUserViewSet, basename='admin-user') # Admin/Mod managing users


urlpatterns = [
    path('admin/', admin.site.urls),
    # JWT Token endpoints (AllowAny)
    path('api/token/', TokenObtainPairView.as_view(permission_classes=[AllowAny]), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),
    # User Registration endpoint (AllowAny)
    path('api/register/', UserRegistrationView.as_view(), name='register'),

    # New endpoint to get current user details (IsAuthenticated)
    path('api/user/me/', CurrentUserView.as_view(), name='current_user'),

    # Standard User API routes
    path('api/', include(router.urls)),
    # Admin/Moderator API routes
    path('api/admin/', include(admin_router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)