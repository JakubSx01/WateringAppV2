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

# Usunięto import ratelimit.decorators

from myapp.views import (
    PlantViewSet, UserPlantViewSet, WateringHistoryViewSet,
    UserRegistrationView, AdminPlantViewSet, AdminUserPlantViewSet,
    AdminUserViewSet, CurrentUserView
)

# Standard user API routes
router = DefaultRouter()
router.register(r'plants', PlantViewSet, basename='plant')
router.register(r'user-plants', UserPlantViewSet, basename='userplant')
router.register(r'watering-history', WateringHistoryViewSet, basename='wateringhistory')

# Admin/Moderator API routes
admin_router = DefaultRouter()
admin_router.register(r'plants', AdminPlantViewSet, basename='admin-plant')
admin_router.register(r'user-plants', AdminUserPlantViewSet, basename='admin-userplant')
admin_router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('admin/', admin.site.urls),
    # Usunięto opakowania ratelimit
    path(
        'api/token/',
        TokenObtainPairView.as_view(permission_classes=[AllowAny]),
        name='token_obtain_pair'
    ),
    path(
        'api/token/refresh/',
        TokenRefreshView.as_view(permission_classes=[AllowAny]),
        name='token_refresh'
    ),
    path(
        'api/register/',
        UserRegistrationView.as_view(),
        name='register'
    ),

    path('api/user/me/', CurrentUserView.as_view(), name='current_user'),

    path('api/', include(router.urls)),
    path('api/admin/', include(admin_router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)