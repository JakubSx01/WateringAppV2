from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
from myapp.views import (
    PlantViewSet,
    UserPlantViewSet,
    WateringHistoryViewSet,
    UserRegistrationView
)

# Konfiguracja routera DRF
router = DefaultRouter()
router.register(r'plants', PlantViewSet, basename='plant')
router.register(r'user-plants', UserPlantViewSet, basename='userplant')
router.register(r'watering-history', WateringHistoryViewSet, basename='wateringhistory')

# Główne ścieżki URL
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Autoryzacja JWT (Token Access + Refresh)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Rejestracja użytkownika
    path('api/register/', UserRegistrationView.as_view(), name='register'),

    # Endpointy API
    path('api/', include(router.urls)),
]

# Obsługa plików multimedialnych w trybie developerskim
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
