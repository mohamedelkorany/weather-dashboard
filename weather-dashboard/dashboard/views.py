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
    
    Error Responses with proper HTTP status codes:
    {
        "success": false,
        "error": string (user-friendly message),
        "code": string (error code for frontend handling),
        "retry": boolean (whether user should retry)
    }
    
    Status Codes:
    - 200: Success
    - 400: Bad Request (validation error, missing params)
    - 401: Authentication error (invalid API key - shouldn't happen)
    - 404: Not Found (city doesn't exist)
    - 429: Too Many Requests (API rate limit)
    - 503: Service Unavailable (API is down)
    - 500: Internal Server Error
    
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
                {
                    'success': False, 
                    'error': 'Invalid request format. Please ensure your request is valid JSON.',
                    'code': 'INVALID_REQUEST',
                    'retry': False
                },
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
                {
                    'success': False, 
                    'error': 'Please provide either location coordinates or a city name.',
                    'code': 'MISSING_PARAMETERS',
                    'retry': False
                },
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
            {
                'success': False, 
                'error': str(e),
                'code': 'VALIDATION_ERROR',
                'retry': False
            },
            status=400
        )
    
    except RateLimitError as e:
        # API rate limit exceeded - user should wait and retry
        logger.warning(f"Rate limit exceeded: {str(e)}")
        return JsonResponse(
            {
                'success': False, 
                'error': 'Service temporarily unavailable due to high demand. Please try again in a moment.',
                'code': 'RATE_LIMITED',
                'retry': True,
                'retryAfter': 60  # Suggest retry after 60 seconds
            },
            status=429
        )
    
    except APIError as e:
        # API error (city not found, API down, etc.)
        logger.warning(f"API error: {str(e)}")
        error_msg = str(e)
        
        # Determine if it's a "not found" error or a service error
        if 'not found' in error_msg.lower():
            return JsonResponse(
                {
                    'success': False, 
                    'error': error_msg,
                    'code': 'CITY_NOT_FOUND',
                    'retry': False
                },
                status=404
            )
        elif 'timed out' in error_msg.lower() or 'timeout' in error_msg.lower():
            # Network timeout - user should retry
            return JsonResponse(
                {
                    'success': False, 
                    'error': 'Request timed out. Please try again.',
                    'code': 'TIMEOUT',
                    'retry': True
                },
                status=503
            )
        else:
            # Generic API error - could be transient
            return JsonResponse(
                {
                    'success': False, 
                    'error': 'Unable to fetch weather data. Please try again.',
                    'code': 'API_ERROR',
                    'retry': True
                },
                status=503
            )
    
    except ConfigurationError as e:
        # Configuration error (missing API key, etc.) - should not happen in production
        logger.error(f"Configuration error: {str(e)}")
        return JsonResponse(
            {
                'success': False, 
                'error': 'Service is not properly configured. Please contact support.',
                'code': 'CONFIG_ERROR',
                'retry': False
            },
            status=500
        )
    
    except Exception as e:
        # Unexpected error - log it but don't expose details to client
        logger.error(f"Unexpected error in get_weather: {str(e)}", exc_info=True)
        return JsonResponse(
            {
                'success': False, 
                'error': 'An unexpected error occurred. Please try again later.',
                'code': 'INTERNAL_ERROR',
                'retry': True
            },
            status=500
        )