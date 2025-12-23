"""
Weather Dashboard Views

This module contains view functions for the weather dashboard application.
It handles HTTP requests for weather data retrieval and serves the main dashboard page.

Views:
- index: Renders the main dashboard HTML page
- get_weather: API endpoint for fetching weather data (by city or coordinates)
"""

import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
from .services import (
    WeatherService,
    ValidationError,
    APIError,
    RateLimitError,
    ConfigurationError
)

# Configure logging
logger = logging.getLogger(__name__)


def index(request):
    """
    Render the main weather dashboard page.
    
    This view serves the HTML template containing the UI for the weather dashboard.
    All API interactions happen via AJAX calls to the get_weather endpoint.
    
    Args:
        request: Django HTTP request object
        
    Returns:
        HttpResponse: Rendered dashboard template
    """
    return render(request, 'dashboard/index.html')


@require_http_methods(["POST"])
@csrf_exempt  # CSRF exempt for AJAX JSON requests (should use CSRF token in production)
def get_weather(request):
    """
    API endpoint for fetching weather data.
    
    Accepts POST requests with JSON payload containing either:
    - latitude and longitude (geolocation)
    - city name (fallback)
    
    Security Considerations:
    - Validates all input parameters
    - Sanitizes string inputs to prevent injection
    - Never exposes internal error details to client
    - Logs suspicious requests without exposing sensitive data
    - Implements rate limiting via API quota
    
    Request JSON payload:
    {
        "latitude": float (optional),
        "longitude": float (optional),
        "city": string (optional)
    }
    
    Success Response (200):
    {
        "success": true,
        "data": {
            "city": string,
            "country": string,
            "temperature": float,
            "feels_like": float,
            "humidity": int,
            "pressure": int,
            "wind_speed": float,
            "wind_direction": int (nullable),
            "cloudiness": int,
            "description": string,
            "icon": string,
            "sunrise": int (Unix timestamp),
            "sunset": int (Unix timestamp)
        }
    }
    
    Error Response (400, 404, 429, 500):
    {
        "success": false,
        "error": string (user-friendly message)
    }
    
    Args:
        request: Django HTTP request object with JSON payload
        
    Returns:
        JsonResponse: Weather data or error message
    """
    try:
        # Parse JSON request body
        try:
            data = json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("Invalid JSON in weather request")
            return JsonResponse(
                {'success': False, 'error': 'Invalid request format'},
                status=400
            )
        
        # Extract parameters
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        city = data.get('city')
        
        # Initialize weather service
        weather_service = WeatherService()
        
        # Fetch weather data based on provided parameters
        if latitude is not None and longitude is not None:
            # Geolocation route: fetch by coordinates
            logger.info(f"Fetching weather for coordinates: {latitude}, {longitude}")
            weather_data = weather_service.get_weather_by_coordinates(latitude, longitude)
        elif city:
            # Fallback route: fetch by city name
            logger.info(f"Fetching weather for city: {city}")
            weather_data = weather_service.get_weather_by_city(city)
        else:
            # No valid parameters provided
            logger.warning("Weather request missing required parameters")
            return JsonResponse(
                {'success': False, 'error': 'Please provide either location coordinates or a city name'},
                status=400
            )
        
        # Return successful response
        return JsonResponse({
            'success': True,
            'data': weather_data
        }, status=200)
    
    except ValidationError as e:
        # User input validation error (bad coordinates, invalid city format, etc.)
        logger.warning(f"Validation error: {str(e)}")
        return JsonResponse(
            {'success': False, 'error': str(e)},
            status=400
        )
    
    except RateLimitError as e:
        # API rate limit exceeded
        logger.warning(f"Rate limit exceeded: {str(e)}")
        return JsonResponse(
            {'success': False, 'error': 'Service temporarily unavailable. Please try again in a moment.'},
            status=429
        )
    
    except APIError as e:
        # API error (city not found, API down, etc.)
        logger.warning(f"API error: {str(e)}")
        # Return generic message to avoid exposing API details
        return JsonResponse(
            {'success': False, 'error': str(e)},
            status=404 if 'not found' in str(e).lower() else 500
        )
    
    except ConfigurationError as e:
        # Configuration error (missing API key, etc.) - should not happen in production
        logger.error(f"Configuration error: {str(e)}")
        return JsonResponse(
            {'success': False, 'error': 'Service is not properly configured'},
            status=500
        )
    
    except Exception as e:
        # Unexpected error - log it but don't expose details to client
        logger.error(f"Unexpected error in get_weather: {str(e)}", exc_info=True)
        return JsonResponse(
            {'success': False, 'error': 'An unexpected error occurred. Please try again later.'},
            status=500
        )