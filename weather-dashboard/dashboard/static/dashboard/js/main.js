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
        this.searchAgainBtn.addEventListener('click', () => this.showLocationInput());
        this.updateLocationLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLocationInput();
        });

        // Start location detection
        this.detectUserLocation();
    }

    /**
     * Detect user's location using browser Geolocation API
     */
    detectUserLocation() {
        this.showStatus('📍 Detecting your location...');

        if (!navigator.geolocation) {
            this.handleGeolocationNotSupported();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => this.handleLocationSuccess(position),
            (error) => this.handleLocationError(error)
        );
    }

    /**
     * Handle successful geolocation
     */
    handleLocationSuccess(position) {
        const { latitude, longitude } = position.coords;
        this.currentLocation = { latitude, longitude, isGeolocation: true };

        this.showStatus(`📍 Location detected: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
        this.fetchWeatherByCoordinates(latitude, longitude);
    }

    /**
     * Handle geolocation errors
     */
    handleLocationError(error) {
        const messages = {
            1: 'You denied access to your location. Please enter a city name to continue.',
            2: 'Unable to determine your location. Please check your internet connection.',
            3: 'Location detection timed out. Please try entering a city name manually.'
        };

        const message = messages[error.code] || 'Unable to detect location. Please enter a city name.';
        this.showStatus(`📍 ${message}`);
        this.showLocationInput();
    }

    /**
     * Handle browser without geolocation support
     */
    handleGeolocationNotSupported() {
        this.showStatus('📍 Location detection is not available in your browser.');
        this.showLocationInput();
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
    showError(title, message) {
        this.locationStatus.style.display = 'none';
        this.locationInputSection.style.display = 'none';
        this.loadingState.style.display = 'none';
        this.weatherContent.style.display = 'none';
        this.errorState.style.display = 'block';

        this.errorTitle.textContent = title;
        this.errorMessage.textContent = message;
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
                this.handleWeatherError(data.error);
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
                this.handleWeatherError(data.error);
                return;
            }

            this.showWeatherData(data.data);
            this.updateFooter(`${data.data.city}, ${data.data.country}`, 'City searched manually');
        } catch (error) {
            this.handleNetworkError(error);
        }
    }

    /**
     * Handle weather API errors with user-friendly messages
     */
    handleWeatherError(error) {
        const errorMap = {
            'Service is not properly configured': {
                title: '⚠️ Service Configuration Issue',
                message: 'The weather service is not properly configured. Please try again later.'
            },
            'City not found': {
                title: '🔍 City Not Found',
                message: 'We couldn\'t find a city with that name. Please check the spelling and try again.'
            },
            'Invalid input': {
                title: '⚠️ Invalid Input',
                message: 'Please enter a valid city name or coordinates.'
            },
            'API rate limit exceeded': {
                title: '⏳ Too Many Requests',
                message: 'You\'ve made too many requests. Please wait a moment and try again.'
            },
            'Invalid coordinates': {
                title: '📍 Invalid Location',
                message: 'The location data is invalid. Please try entering a city name instead.'
            }
        };

        const errorInfo = errorMap[error] || {
            title: '❌ Error Loading Weather',
            message: `Unable to fetch weather: ${error}. Please try again.`
        };

        this.showError(errorInfo.title, errorInfo.message);
    }

    /**
     * Handle network errors
     */
    handleNetworkError(error) {
        console.error('Network error:', error);
        this.showError(
            '🌐 Connection Error',
            'Unable to connect to the weather service. Please check your internet connection and try again.'
        );
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