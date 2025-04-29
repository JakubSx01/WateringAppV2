# MyappBackend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from myapp.views import (
    PlantViewSet,
    UserPlantViewSet,
    WateringHistoryViewSet,
    UserRegistrationView,
    AdminPlantViewSet,
    AdminUserPlantViewSet,
    AdminUserViewSet,
    CurrentUserView # <--- Check this name here
)

# Create separate routers for different access levels if you want distinct prefixes like /api/admin/
router = DefaultRouter()
router.register(r'plants', PlantViewSet, basename='plant') # Standard user/public plant views
router.register(r'user-plants', UserPlantViewSet, basename='userplant') # Standard user's plants views
router.register(r'watering-history', WateringHistoryViewSet, basename='wateringhistory') # Standard user's history

# Router for Admin/Moderator views
admin_router = DefaultRouter()
admin_router.register(r'plants', AdminPlantViewSet, basename='admin-plant') # Admin/Mod managing ALL plants
admin_router.register(r'user-plants', AdminUserPlantViewSet, basename='admin-userplant') # Admin/Mod managing ALL user plants
admin_router.register(r'users', AdminUserViewSet, basename='admin-user') # Admin/Mod managing users


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(permission_classes=[AllowAny]), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),
    path('api/register/', UserRegistrationView.as_view(), name='register'),

    # New endpoint to get current user details
    path('api/user/me/', CurrentUserView.as_view(), name='current_user'),

    path('api/', include(router.urls)),
    path('api/admin/', include(admin_router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
