"""
Weather Service Module

This module provides the WeatherService class which encapsulates all weather data
retrieval and processing logic. It handles API communication, error handling, and
data validation.

Custom Exceptions:
- ValidationError: Raised when input validation fails
- APIError: Raised when WeatherAPI.com API returns an error
- RateLimitError: Raised when API rate limit is exceeded
- ConfigurationError: Raised when service is not properly configured
"""

import logging
import requests
from django.conf import settings
from typing import Dict, Optional, Tuple

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# Custom Exceptions
# ============================================================================

class ValidationError(Exception):
    """Raised when user input validation fails."""
    pass


class APIError(Exception):
    """Raised when OpenWeatherMap API returns an error."""
    pass


class RateLimitError(Exception):
    """Raised when API rate limit is exceeded."""
    pass


class ConfigurationError(Exception):
    """Raised when service is not properly configured."""
    pass


# ============================================================================
# Constants
# ============================================================================

WEATHERAPI_URL = "http://api.weatherapi.com/v1/current.json"
API_TIMEOUT = 5  # seconds
MIN_LATITUDE = -90.0
MAX_LATITUDE = 90.0
MIN_LONGITUDE = -180.0
MAX_LONGITUDE = 180.0
MAX_CITY_LENGTH = 100
MIN_CITY_LENGTH = 2


# ============================================================================
# WeatherService Class
# ============================================================================

class WeatherService:
    """
    Service class for fetching and processing weather data from OpenWeatherMap API.
    
    This class handles:
    - Input validation (coordinates, city names)
    - API communication with error handling
    - Data transformation and enrichment
    - Logging and security considerations
    
    Attributes:
        api_key (str): OpenWeatherMap API key from Django settings
    """
    
    def __init__(self):
        """
        Initialize the WeatherService.
        
        Retrieves the API key from Django settings. Raises ConfigurationError
        if the API key is not configured.
        """
        self.api_key = getattr(settings, 'WEATHERAPI_KEY', None)
        
        if not self.api_key or self.api_key == 'your-default-api-key':
            raise ConfigurationError(
                "WeatherAPI.com API key is not configured. "
                "Please set WEATHERAPI_KEY in your .env file."
            )
    
    def get_weather_by_coordinates(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, any]:
        """
        Fetch weather data by geographic coordinates.
        
        Security:
        - Validates coordinate ranges
        - Type checks input parameters
        - Sanitizes before API request
        
        Args:
            latitude (float): Latitude coordinate (-90 to 90)
            longitude (float): Longitude coordinate (-180 to 180)
            
        Returns:
            Dict: Structured weather data
            
        Raises:
            ValidationError: If coordinates are invalid
            APIError: If WeatherAPI.com API returns an error
            RateLimitError: If API rate limit is exceeded
        """
        # Validate input types and ranges
        self._validate_coordinates(latitude, longitude)
        
        # Construct API request
        params = {
            'key': self.api_key,
            'q': f"{latitude},{longitude}",
            'aqi': 'no'  # Don't need air quality data
        }
        
        logger.info(f"Requesting weather for coordinates: lat={latitude}, lon={longitude}")
        
        # Fetch and process data
        response_data = self._fetch_from_api(params)
        weather_data = self._process_api_response(response_data)
        
        return weather_data
    
    def get_weather_by_city(self, city: str) -> Dict[str, any]:
        """
        Fetch weather data by city name.
        
        Security:
        - Validates city name format and length
        - Sanitizes string input
        - Handles special characters gracefully
        
        Args:
            city (str): City name (2-100 characters)
            
        Returns:
            Dict: Structured weather data
            
        Raises:
            ValidationError: If city name is invalid
            APIError: If city is not found or API error occurs
            RateLimitError: If API rate limit is exceeded
        """
        # Validate and sanitize input
        city = self._validate_and_sanitize_city(city)
        
        # Construct API request
        params = {
            'key': self.api_key,
            'q': city,
            'aqi': 'no'  # Don't need air quality data
        }
        
        logger.info(f"Requesting weather for city: {city}")
        
        # Fetch and process data
        response_data = self._fetch_from_api(params)
        weather_data = self._process_api_response(response_data)
        
        return weather_data
    
    # ========================================================================
    # Private Validation Methods
    # ========================================================================
    
    @staticmethod
    def _validate_coordinates(latitude: float, longitude: float) -> None:
        """
        Validate geographic coordinates.
        
        Args:
            latitude (float): Latitude value
            longitude (float): Longitude value
            
        Raises:
            ValidationError: If coordinates are invalid
        """
        # Type validation
        if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
            raise ValidationError("Coordinates must be numbers")
        
        # Check for special float values
        if not (-90 <= latitude <= 90):
            raise ValidationError("Latitude must be between -90 and 90 degrees")
        
        if not (-180 <= longitude <= 180):
            raise ValidationError("Longitude must be between -180 and 180 degrees")
    
    @staticmethod
    def _validate_and_sanitize_city(city: str) -> str:
        """
        Validate and sanitize city name input.
        
        Args:
            city (str): City name
            
        Returns:
            str: Sanitized city name
            
        Raises:
            ValidationError: If city name is invalid
        """
        # Type validation
        if not isinstance(city, str):
            raise ValidationError("City name must be a string")
        
        # Strip whitespace
        city = city.strip()
        
        # Length validation
        if len(city) < MIN_CITY_LENGTH or len(city) > MAX_CITY_LENGTH:
            raise ValidationError(
                f"City name must be between {MIN_CITY_LENGTH} and {MAX_CITY_LENGTH} characters"
            )
        
        # Character validation: allow letters, spaces, hyphens, apostrophes
        # This prevents special characters that could cause issues
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -\'')
        if not all(c in allowed_chars for c in city):
            raise ValidationError("City name contains invalid characters")
        
        return city
    
    # ========================================================================
    # Private API Communication Methods
    # ========================================================================
    
    def _fetch_from_api(self, params: Dict[str, any]) -> Dict[str, any]:
        """
        Make HTTP request to WeatherAPI.com API.
        
        Error Handling:
        - HTTP errors (4xx, 5xx)
        - Network errors (timeout, connection)
        - Rate limiting (429 status)
        - Invalid JSON responses
        
        Args:
            params (Dict): Query parameters for API request
            
        Returns:
            Dict: Parsed JSON response from API
            
        Raises:
            APIError: If API returns an error
            RateLimitError: If rate limited (429)
        """
        try:
            response = requests.get(
                WEATHERAPI_URL,
                params=params,
                timeout=API_TIMEOUT
            )
            
            # Check for rate limiting (429 Too Many Requests)
            if response.status_code == 429:
                logger.warning("WeatherAPI.com API rate limit exceeded")
                raise RateLimitError("API rate limit exceeded")
            
            # Raise exception for 4xx and 5xx status codes
            response.raise_for_status()
            
            # Parse and return JSON response
            return response.json()
        
        except requests.exceptions.Timeout:
            logger.error("API request timeout")
            raise APIError("Service request timed out. Please try again.")
        
        except requests.exceptions.ConnectionError:
            logger.error("Connection error to WeatherAPI.com API")
            raise APIError("Unable to connect to weather service. Please try again.")
        
        except requests.exceptions.HTTPError as e:
            # Handle specific HTTP errors
            if e.response.status_code == 404:
                logger.warning(f"City not found in API")
                raise APIError("City not found. Please check the spelling and try again.")
            elif e.response.status_code == 401:
                logger.error("Invalid API key")
                raise APIError("Weather service authentication failed.")
            else:
                logger.error(f"HTTP error {e.response.status_code}: {str(e)}")
                raise APIError(f"Weather service error. Please try again.")
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {str(e)}")
            raise APIError("Unable to fetch weather data. Please try again.")
        
        except ValueError as e:
            logger.error(f"Invalid JSON in API response: {str(e)}")
            raise APIError("Invalid response from weather service.")
    
    # ========================================================================
    # Private Data Processing Methods
    # ========================================================================
    
    @staticmethod
    def _process_api_response(api_response: Dict[str, any]) -> Dict[str, any]:
        """
        Transform raw WeatherAPI.com API response into structured format.
        
        This method extracts and reorganizes the API response to provide
        a clean, predictable interface for the frontend.
        
        Args:
            api_response (Dict): Raw response from WeatherAPI.com API
            
        Returns:
            Dict: Processed weather data with consistent structure
            
        Raises:
            APIError: If response data is malformed
        """
        try:
            # Extract location and current weather data
            location = api_response.get('location', {})
            current = api_response.get('current', {})
            condition = current.get('condition', {})
            
            # Build structured response
            processed = {
                'city': location.get('name', 'Unknown'),
                'country': location.get('country', 'Unknown'),
                'temperature': current.get('temp_c'),
                'feels_like': current.get('feelslike_c'),
                'humidity': current.get('humidity'),
                'pressure': current.get('pressure_mb'),
                'wind_speed': current.get('wind_kph'),  # Speed in km/h
                'wind_direction': current.get('wind_degree'),  # Can be None
                'cloudiness': current.get('cloud', 0),
                'description': condition.get('text', 'Unknown'),
                'icon': condition.get('code', 1000),  # WeatherAPI uses condition codes
                'sunrise': None,  # WeatherAPI doesn't provide sunrise in current endpoint
                'sunset': None,   # WeatherAPI doesn't provide sunset in current endpoint
            }
            
            return processed
        
        except (KeyError, TypeError) as e:
            logger.error(f"Error processing API response: {str(e)}")
            raise APIError("Invalid response structure from weather service.")