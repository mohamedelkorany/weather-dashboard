/**
 * Weather Dashboard - Main Application Logic
 * 
 * Features:
 * - Browser geolocation detection with fallback
 * - Real-time weather data fetching
 * - Responsive error handling with user-friendly messages
 * - Loading states and transitions
 * - Mobile-friendly responsive design
 */

class WeatherDashboard {
    constructor() {
        // DOM Elements
        this.locationStatus = document.getElementById('location-status');
        this.locationText = document.getElementById('location-text');
        this.locationInputSection = document.getElementById('location-input-section');
        this.locationForm = document.getElementById('location-form');
        this.cityInput = document.getElementById('city-input');
        this.loadingState = document.getElementById('loading-state');
        this.errorState = document.getElementById('error-state');
        this.errorTitle = document.getElementById('error-title');
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');
        this.searchByBtn = document.getElementById('search-btn');
        this.weatherContent = document.getElementById('weather-content');
        this.searchAgainBtn = document.getElementById('search-again-btn');
        this.footerMessage = document.getElementById('footer-message');
        this.updateLocationLink = document.getElementById('update-location-link');

        // State management
        this.currentLocation = null;
        this.isLoadingWeather = false;

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Attach event listeners
        this.locationForm.addEventListener('submit', (e) => this.handleCitySearch(e));
        this.retryBtn.addEventListener('click', () => this.retryWeatherFetch());
        if (this.searchByBtn) {
            this.searchByBtn.addEventListener('click', () => this.showLocationInput());
        }
        this.searchAgainBtn.addEventListener('click', () => this.showLocationInput());
        this.updateLocationLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLocationInput();
        });

        // Start location detection
        this.detectUserLocation();
    }

    /**
     * Detect user's location using browser Geolocation API with comprehensive error handling
     */
    detectUserLocation() {
        this.showStatus('📍 Detecting your location...');

        // Check if geolocation is supported
        if (!navigator.geolocation) {
            this.handleGeolocationNotSupported();
            return;
        }

        // Use timeout and high accuracy options
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,  // 10 second timeout
            maximumAge: 0    // Don't use cached location
        };

        navigator.geolocation.getCurrentPosition(
            (position) => this.handleLocationSuccess(position),
            (error) => this.handleLocationError(error),
            options
        );
    }

    /**
     * Handle successful geolocation
     */
    handleLocationSuccess(position) {
        const { latitude, longitude, accuracy } = position.coords;
        this.currentLocation = { latitude, longitude, isGeolocation: true };

        this.showStatus(`📍 Location detected (accuracy: ±${Math.round(accuracy)}m)`);
        this.fetchWeatherByCoordinates(latitude, longitude);
    }

    /**
     * Handle geolocation errors with detailed messages
     */
    handleLocationError(error) {
        const errorMessages = {
            1: {
                icon: '🚫',
                title: 'Permission Denied',
                message: 'You denied access to your location.',
                details: 'Location services are disabled. To enable them, go to your browser settings and grant location permission for this site.',
                suggestion: 'You can search for a city manually instead.'
            },
            2: {
                icon: '📡',
                title: 'Location Unavailable',
                message: 'Unable to retrieve your location data.',
                details: 'Your device\'s location service may be turned off or unavailable.',
                suggestion: 'Please check that location services are enabled on your device.'
            },
            3: {
                icon: '⏱️',
                title: 'Location Timeout',
                message: 'Location detection took too long.',
                details: 'Your browser took more than 10 seconds to determine your location.',
                suggestion: 'Please try again or search for a city manually.'
            }
        };

        const errorData = errorMessages[error.code] || {
            icon: '❓',
            title: 'Location Error',
            message: 'Unable to detect location.',
            suggestion: 'Please search for a city manually.'
        };

        console.warn(`Geolocation error [${error.code}]: ${error.message}`);
        
        this.showStatus(`${errorData.icon} ${errorData.title}`);
        
        // Log for debugging but don't show to user
        if (error.message) {
            console.debug(`Error details: ${error.message}`);
        }
        
        // Show location input form with helpful message
        this.showLocationInputWithMessage(errorData);
    }

    /**
     * Handle browser without geolocation support
     */
    handleGeolocationNotSupported() {
        const errorData = {
            icon: '🌐',
            title: 'Geolocation Not Supported',
            message: 'Your browser does not support location detection.',
            details: 'Please update to a modern browser like Chrome, Firefox, Safari, or Edge for location support.',
            suggestion: 'You can search for a city manually instead.'
        };
        
        this.showStatus(`${errorData.icon} ${errorData.title}`);
        this.showLocationInputWithMessage(errorData);
    }

    /**
     * Show location input form with additional help message
     */
    showLocationInputWithMessage(errorData) {
        this.locationStatus.style.display = 'none';
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'none';
        this.weatherContent.style.display = 'none';
        this.locationInputSection.style.display = 'block';
        
        // Add error details if section exists
        const errorDetails = document.querySelector('.location-error-details');
        if (errorDetails && errorData.details) {
            errorDetails.textContent = errorData.details;
            errorDetails.style.display = 'block';
        }
        
        this.cityInput.focus();
    }

    /**
     * Show status message
     */
    showStatus(message) {
        this.locationText.textContent = message;
        this.locationStatus.style.display = 'flex';
    }

    /**
     * Hide all sections and show loading state
     */
    showLoading() {
        this.locationStatus.style.display = 'none';
        this.locationInputSection.style.display = 'none';
        this.errorState.style.display = 'none';
        this.weatherContent.style.display = 'none';
        this.loadingState.style.display = 'flex';
        this.isLoadingWeather = true;
    }

    /**
     * Show location input form
     */
    showLocationInput() {
        this.locationStatus.style.display = 'none';
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'none';
        this.weatherContent.style.display = 'none';
        this.locationInputSection.style.display = 'block';
        this.cityInput.focus();
    }

    /**
     * Show error state with user-friendly message
     */
    /**
     * Show error state with enhanced display and retry options
     */
    showError(title, message, errorInfo = {}, showRetryButton = false) {
        this.locationStatus.style.display = 'none';
        this.locationInputSection.style.display = 'none';
        this.loadingState.style.display = 'none';
        this.weatherContent.style.display = 'none';
        this.errorState.style.display = 'block';

        // Set title and message
        this.errorTitle.textContent = title;
        this.errorMessage.textContent = message;
        
        // Add suggestion if available
        let errorContent = message;
        if (errorInfo.suggestion) {
            errorContent += `\n\n💡 ${errorInfo.suggestion}`;
        }
        this.errorMessage.textContent = errorContent;

        // Handle retry button based on error type
        const tryAgainButton = document.querySelector('.error-btn-try-again');
        const searchButton = document.querySelector('.error-btn-search');
        
        if (showRetryButton && errorInfo.retryable !== false) {
            if (tryAgainButton) {
                tryAgainButton.style.display = 'inline-block';
                tryAgainButton.textContent = 'Try Again';
            }
        } else {
            if (tryAgainButton) {
                tryAgainButton.style.display = 'none';
            }
        }
        
        // Always show search button as fallback
        if (searchButton) {
            searchButton.style.display = 'inline-block';
            searchButton.textContent = 'Search Instead';
        }

        this.isLoadingWeather = false;
    }

    /**
     * Show weather data
     */
    showWeatherData(data) {
        this.locationStatus.style.display = 'none';
        this.locationInputSection.style.display = 'none';
        this.loadingState.style.display = 'none';
        this.errorState.style.display = 'none';
        this.weatherContent.style.display = 'block';
        this.updateLocationLink.style.display = 'inline';

        this.populateWeatherData(data);
        this.isLoadingWeather = false;
    }

    /**
     * Fetch weather by city name (form submission)
     */
    handleCitySearch(e) {
        e.preventDefault();
        const city = this.cityInput.value.trim();

        if (!city) {
            this.showError('Invalid Input', 'Please enter a city name.');
            return;
        }

        this.currentLocation = { city, isGeolocation: false };
        this.fetchWeatherByCity(city);
    }

    /**
     * Fetch weather data by coordinates
     */
    async fetchWeatherByCoordinates(latitude, longitude) {
        this.showLoading();

        try {
            const response = await fetch('/api/weather', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ latitude, longitude })
            });

            const data = await response.json();

            if (!data.success) {
                this.handleWeatherError(data, response.status);
                return;
            }

            this.showWeatherData(data.data);
            this.updateFooter(`${data.data.city}, ${data.data.country}`, 'Location detected automatically');
        } catch (error) {
            this.handleNetworkError(error);
        }
    }

    /**
     * Fetch weather data by city name
     */
    async fetchWeatherByCity(city) {
        this.showLoading();

        try {
            const response = await fetch('/api/weather', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ city })
            });

            const data = await response.json();

            if (!data.success) {
                this.handleWeatherError(data, response.status);
                return;
            }

            this.showWeatherData(data.data);
            this.updateFooter(`${data.data.city}, ${data.data.country}`, 'City searched manually');
        } catch (error) {
            this.handleNetworkError(error);
        }
    }

    /**
     * Handle weather API errors with status code-aware messages and retry logic
     */
    handleWeatherError(data, statusCode) {
        const errorCode = data.code || 'UNKNOWN';
        const shouldRetry = data.retry || false;
        const retryAfter = data.retryAfter || 30;

        // Comprehensive error mapping with user-friendly messages
        const errorMap = {
            'CITY_NOT_FOUND': {
                title: '🔍 Location Not Found',
                message: 'We couldn\'t find a city with that name. Please check the spelling and try again.',
                emoji: '🔍',
                icon: '❌',
                suggestion: 'Try searching for: London, New York, Paris, Tokyo'
            },
            'VALIDATION_ERROR': {
                title: '⚠️ Invalid Input',
                message: 'Please enter a valid city name. City names should be 2-100 characters long.',
                emoji: '⚠️',
                icon: '❌',
                suggestion: 'Example: London, Paris, New York'
            },
            'MISSING_PARAMETERS': {
                title: '📝 Missing Information',
                message: 'Please provide a location (either your coordinates or a city name).',
                emoji: '📝',
                icon: '❌',
                suggestion: 'Allow location access or type a city name'
            },
            'INVALID_REQUEST': {
                title: '🔧 Invalid Request Format',
                message: 'There was a problem with your request format. Please try again.',
                emoji: '🔧',
                icon: '❌',
                suggestion: 'Try refreshing the page'
            },
            'RATE_LIMITED': {
                title: '⏳ Service Busy',
                message: `You've made too many requests. Please wait ${retryAfter} seconds and try again.`,
                emoji: '⏳',
                icon: '⚠️',
                suggestion: 'Automatic retry available',
                retryable: true,
                retryAfter: retryAfter
            },
            'TIMEOUT': {
                title: '⏱️ Connection Timeout',
                message: 'The request took too long. Please check your internet connection and try again.',
                emoji: '⏱️',
                icon: '⚠️',
                suggestion: 'Click "Try Again" to retry',
                retryable: true,
                retryAfter: 5
            },
            'API_ERROR': {
                title: '🌐 Service Error',
                message: 'Unable to fetch weather data. The service may be temporarily unavailable. Please try again.',
                emoji: '🌐',
                icon: '⚠️',
                suggestion: 'Click "Try Again" to retry',
                retryable: true,
                retryAfter: 10
            },
            'CONFIG_ERROR': {
                title: '⚙️ Configuration Problem',
                message: 'The weather service is not properly configured. Please contact support.',
                emoji: '⚙️',
                icon: '❌',
                suggestion: 'Please refresh and try again'
            },
            'INTERNAL_ERROR': {
                title: '❌ Unexpected Error',
                message: 'An unexpected error occurred. Please try again later.',
                emoji: '❌',
                icon: '❌',
                suggestion: 'Click "Try Again" to retry',
                retryable: true,
                retryAfter: 10
            },
            'UNKNOWN': {
                title: '❌ Error Loading Weather',
                message: data.error || 'Unable to fetch weather data. Please try again.',
                emoji: '❌',
                icon: '❌',
                suggestion: 'Click "Try Again" to retry',
                retryable: shouldRetry,
                retryAfter: retryAfter
            }
        };

        const errorInfo = errorMap[errorCode] || errorMap['UNKNOWN'];
        this.showError(errorInfo.title, errorInfo.message, errorInfo, shouldRetry);
    }

    /**
     * Handle network errors with retry capability
     */
    handleNetworkError(error) {
        console.error('Network error:', error);
        
        // Determine error type
        let errorInfo = {
            title: '🌐 Connection Error',
            message: 'Unable to connect to the weather service. Please check your internet connection and try again.',
            emoji: '🌐',
            icon: '⚠️',
            suggestion: 'Check your internet connection and retry',
            retryable: true,
            retryAfter: 5
        };

        // Handle specific error types
        if (error.name === 'AbortError') {
            errorInfo = {
                ...errorInfo,
                title: '⏱️ Request Timeout',
                message: 'The request took too long. Please try again.',
            };
        } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            errorInfo = {
                ...errorInfo,
                title: '🌐 Network Unavailable',
                message: 'Unable to reach the weather service. Please check your internet connection.',
            };
        }

        this.showError(errorInfo.title, errorInfo.message, errorInfo, true);
    }

    /**
     * Retry fetching weather data
     */
    retryWeatherFetch() {
        if (!this.currentLocation) {
            this.detectUserLocation();
            return;
        }

        if (this.currentLocation.isGeolocation) {
            this.fetchWeatherByCoordinates(
                this.currentLocation.latitude,
                this.currentLocation.longitude
            );
        } else {
            this.fetchWeatherByCity(this.currentLocation.city);
        }
    }

    /**
     * Populate weather data in the UI
     */
    populateWeatherData(data) {
        const {
            city,
            country,
            temperature,
            feels_like,
            humidity,
            pressure,
            wind_speed,
            wind_direction,
            cloudiness,
            description,
            icon
        } = data;

        // Location and time
        document.getElementById('location-name').textContent = `${city}, ${country}`;
        document.getElementById('current-time').textContent = this.formatDate(new Date());

        // Temperature and conditions
        document.getElementById('temperature').textContent = Math.round(temperature);
        document.getElementById('weather-icon').textContent = this.getWeatherEmoji(description);
        document.getElementById('weather-description').textContent = description;
        document.getElementById('feels-like').textContent = `Feels like ${Math.round(feels_like)}°C`;

        // Weather details
        document.getElementById('humidity').textContent = `${humidity}%`;
        document.getElementById('wind-speed').textContent = `${Math.round(wind_speed)} km/h`;
        document.getElementById('wind-direction').textContent = wind_direction ? this.getWindDirection(wind_direction) : 'N/A';
        document.getElementById('pressure').textContent = `${pressure} hPa`;
        document.getElementById('visibility').textContent = 'N/A';
        document.getElementById('cloudiness').textContent = `${cloudiness}%`;
    }

    /**
     * Get weather emoji based on condition
     */
    getWeatherEmoji(condition) {
        const emojiMap = {
            // OpenWeatherMap conditions
            'Clear': '☀️',
            'Sunny': '☀️',
            'Clouds': '☁️',
            'Cloudy': '☁️',
            'Overcast': '☁️',
            'Drizzle': '🌧️',
            'Rain': '🌧️',
            'Light rain': '🌧️',
            'Moderate rain': '🌧️',
            'Heavy rain': '⛈️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Smoke': '💨',
            'Haze': '🌫️',
            'Dust': '🌪️',
            'Fog': '🌫️',
            'Sand': '🌪️',
            'Ash': '💨',
            'Squall': '💨',
            'Tornado': '🌪️',
            // WeatherAPI.com conditions
            'Partly cloudy': '⛅',
            'Patchy light rain': '🌧️',
            'Patchy light snow': '❄️',
            'Light rain shower': '🌧️',
            'Partly Cloudy': '⛅'
        };

        return emojiMap[condition] || '🌡️';
    }

    /**
     * Convert wind degree to direction
     */
    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                           'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Update footer message
     */
    updateFooter(location, message) {
        this.footerMessage.textContent = `${message} • Weather data for ${location}`;
    }

    /**
     * Get CSRF token for POST requests
     */
    getCSRFToken() {
        const name = 'csrftoken';
        let cookieValue = null;

        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }

        return cookieValue;
    }
}

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});