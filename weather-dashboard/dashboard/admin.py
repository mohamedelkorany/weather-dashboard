from django.contrib import admin
from .models import WeatherData  # Assuming you have a model for weather data

@admin.register(WeatherData)
class WeatherDataAdmin(admin.ModelAdmin):
    list_display = ('city', 'temperature', 'humidity', 'wind_speed', 'description', 'timestamp')
    search_fields = ('city',)
    list_filter = ('city', 'timestamp')
    ordering = ('-timestamp',)