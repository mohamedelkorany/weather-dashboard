"""
URL Configuration for Dashboard App

This module defines URL routing for the weather dashboard application.

URL Patterns:
- '' (root): Serves the main dashboard HTML page
- 'api/weather': API endpoint for fetching weather data via AJAX
"""

from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Main dashboard page
    path('', views.index, name='index'),
    
    # API endpoints for AJAX requests
    path('api/weather', views.get_weather, name='get_weather'),
]