from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Plant, UserPlant, WateringHistory

class UserRegistrationTestCase(APITestCase):
    def test_user_registration(self):
        data = {
            "username": "testuser",
            "password": "TestPass123!",
            "password2": "TestPass123!",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
        }
        response = self.client.post('/api/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)

class UserLoginJWTTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="TestPass123!"
        )
        
    def test_login_jwt(self):
        data = {
            "username": "testuser",
            "password": "TestPass123!"
        }
        response = self.client.post('/api/token/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

class UserPlantAccessTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="userplant",
            password="PlantPass123!"
        )
        self.plant = Plant.objects.create(
            name="Aloe Vera",
            species="Succulent",
            water_amount_ml=100,
            watering_frequency_days=7
        )
        self.token = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_create_user_plant(self):
        data = {"plant_id": self.plant.id}
        response = self.client.post('/api/user-plants/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_access_user_plants(self):
        UserPlant.objects.create(user=self.user, plant=self.plant)
        response = self.client.get('/api/user-plants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
