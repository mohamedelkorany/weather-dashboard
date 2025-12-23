from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch
import requests

class WeatherDashboardTests(TestCase):

    def test_index_view_status_code(self):
        response = self.client.get(reverse('dashboard:index'))
        self.assertEqual(response.status_code, 200)

    @patch('dashboard.services.requests.get')
    def test_weather_api_success(self, mock_get):
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {
            'main': {'temp': 280, 'humidity': 80},
            'wind': {'speed': 5},
            'weather': [{'description': 'clear sky'}]
        }
        response = self.client.get(reverse('dashboard:index'))
        self.assertContains(response, 'clear sky')
        self.assertContains(response, '80%')
        self.assertContains(response, '5 m/s')

    @patch('dashboard.services.requests.get')
    def test_weather_api_failure(self, mock_get):
        mock_get.return_value.ok = False
        response = self.client.get(reverse('dashboard:index'))
        self.assertContains(response, 'Error fetching weather data', status_code=200)

    def test_invalid_city_input(self):
        response = self.client.post(reverse('dashboard:index'), {'city': 'InvalidCity'})
        self.assertContains(response, 'City not found', status_code=200)

    def test_geolocation_permission_denied(self):
        # Simulate a scenario where geolocation is denied
        with patch('dashboard.views.get_geolocation') as mock_geolocation:
            mock_geolocation.side_effect = Exception('Geolocation permission denied')
            response = self.client.get(reverse('dashboard:index'))
            self.assertContains(response, 'Unable to access location', status_code=200)