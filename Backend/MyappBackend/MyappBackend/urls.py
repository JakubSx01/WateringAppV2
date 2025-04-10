# Create or update this file at Backend/MyappBackend/MyappBackend/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from myapp.views import PlantViewSet, UserPlantViewSet, WateringHistoryViewSet, UserRegistrationView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

# Tworzenie routera dla API
router = routers.DefaultRouter()
router.register(r'plants', PlantViewSet)
router.register(r'user-plants', UserPlantViewSet, basename='userplant')
router.register(r'watering-history', WateringHistoryViewSet, basename='wateringhistory')

urlpatterns = [
    path('admin/', admin.site.urls),
    # Endpoint dla API
    path('api/', include(router.urls)),
    # Endpoint dla rejestracji użytkownika
    path('api/register/', UserRegistrationView.as_view(), name='register'),
    # Endpointy dla JWT autentykacji
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Dodanie obsługi plików statycznych i media w trybie deweloperskim
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)