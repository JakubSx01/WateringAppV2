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
    UserRegistrationView
)

router = DefaultRouter()
router.register(r'plants', PlantViewSet, basename='plant')
router.register(r'user-plants', UserPlantViewSet, basename='userplant')
router.register(r'watering-history', WateringHistoryViewSet, basename='wateringhistory')

urlpatterns = [
    path('admin/', admin.site.urls),
    # ... (twoje ścieżki API)
    path('api/token/', TokenObtainPairView.as_view(permission_classes=[AllowAny]), name='token_obtain'),
    path('api/token/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),
    path('api/', include(router.urls)),
    path('api/register/', UserRegistrationView.as_view(), name='register'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)