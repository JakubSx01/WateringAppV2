from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Plant, UserPlant, WateringHistory
from .serializers import PlantSerializer, UserPlantSerializer, WateringHistorySerializer, UserRegistrationSerializer
from rest_framework.permissions import AllowAny

# Widok rejestracji użytkownika.
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Rejestracja zakończona pomyślnie."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# Widok umożliwiający przeglądanie globalnej listy roślin.
class PlantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plant.objects.all()
    serializer_class = PlantSerializer
    permission_classes = [permissions.AllowAny]

# Widok umożliwiający zarządzanie roślinami użytkownika.
class UserPlantViewSet(viewsets.ModelViewSet):
    serializer_class = UserPlantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Zwraca tylko rośliny przypisane do zalogowanego użytkownika.
        return UserPlant.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Przypisuje nowy rekord do zalogowanego użytkownika.
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def water(self, request, pk=None):
        # Rejestruje podlewanie rośliny i aktualizuje datę następnego podlewania.
        user_plant = self.get_object()
        WateringHistory.objects.create(user_plant=user_plant)
        user_plant.update_next_watering()
        return Response({'status': 'roślina podlana'}, status=status.HTTP_200_OK)

# Widok umożliwiający przeglądanie historii podlewania roślin użytkownika.
class WateringHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WateringHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WateringHistory.objects.filter(user_plant__user=self.request.user)
