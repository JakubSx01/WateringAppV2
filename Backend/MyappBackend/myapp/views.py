from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Plant, UserPlant, WateringHistory
from .serializers import PlantSerializer, UserPlantSerializer, WateringHistorySerializer, UserRegistrationSerializer

# Rejestracja użytkownika
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Rejestracja zakończona pomyślnie."}, status=status.HTTP_201_CREATED)

# Przeglądanie globalnej listy roślin
class PlantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plant.objects.all()
    serializer_class = PlantSerializer
    permission_classes = [permissions.AllowAny]

# Zarządzanie roślinami użytkownika
class UserPlantViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPlant.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        user_plant = self.get_object()

        if user_plant.user != request.user:
            return Response({'error': 'Brak dostępu do tej rośliny'}, status=status.HTTP_403_FORBIDDEN)

        # Rejestrowanie podlewania
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering()
        
        return Response({'status': 'roślina podlana'}, status=status.HTTP_200_OK)

# Historia podlewania roślin użytkownika
class WateringHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WateringHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WateringHistory.objects.filter(user_plant__user=self.request.user)
    
def perform_create(self, serializer):
    try:
        serializer.save(user=self.request.user)
    except Exception as e:
        print("Błąd dodawania rośliny:", e)