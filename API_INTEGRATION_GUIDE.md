# Weather Dashboard API Contract & Frontend Integration Guide

## API Endpoint Specification

### Base URL
```
http://localhost:8000/dashboard/api/weather
```

### HTTP Method
```
POST
```

### Content-Type
```
application/json
```

---

## Request Format

### Option 1: Geolocation (Preferred)

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Parameters:**
- `latitude` (number, required): Decimal degrees from -90 to 90
- `longitude` (number, required): Decimal degrees from -180 to 180

**Example with curl:**
```bash
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

### Option 2: City Name (Fallback)

**Request Body:**
```json
{
  "city": "New York"
}
```

**Parameters:**
- `city` (string, required): City name, 2-100 characters

**Supported Formats:**
- Simple: `"London"`
- With country: `"London, UK"` or `"London, United Kingdom"`
- Special characters: Apostrophes allowed (`"Saint-Tropez"`)

**Example with curl:**
```bash
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"London"}'
```

---

## Response Format

### Success Response (HTTP 200)

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "success": true,
  "data": {
    "city": "New York",
    "country": "US",
    "temperature": 15.2,
    "feels_like": 14.8,
    "humidity": 72,
    "pressure": 1013,
    "wind_speed": 3.5,
    "wind_direction": 230,
    "cloudiness": 45,
    "description": "Partly cloudy",
    "icon": "02d",
    "sunrise": 1671907200,
    "sunset": 1671945600
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` on success |
| `data` | object | Weather data object |
| `data.city` | string | City name |
| `data.country` | string | ISO 3166-1 alpha-2 country code (e.g., "US") |
| `data.temperature` | number | Current temperature in Celsius |
| `data.feels_like` | number | "Feels like" temperature in Celsius |
| `data.humidity` | number | Humidity percentage (0-100) |
| `data.pressure` | number | Atmospheric pressure in hPa |
| `data.wind_speed` | number | Wind speed in m/s |
| `data.wind_direction` | number \| null | Wind direction in degrees (0-360), null if unavailable |
| `data.cloudiness` | number | Cloudiness percentage (0-100) |
| `data.description` | string | Weather condition (e.g., "Partly cloudy") |
| `data.icon` | string | OpenWeatherMap icon code (see table below) |
| `data.sunrise` | number | Sunrise time (Unix timestamp, UTC) |
| `data.sunset` | number | Sunset time (Unix timestamp, UTC) |

---

### Error Responses

#### 400 Bad Request - Invalid Input

**Status Code:** `400`

**Response Body:**
```json
{
  "success": false,
  "error": "City name must be between 2 and 100 characters"
}
```

**Common Messages:**
- `"Invalid request format"` - Malformed JSON
- `"Coordinates must be numbers"` - Non-numeric values
- `"Latitude must be between -90 and 90 degrees"` - Out of range
- `"Longitude must be between -180 and 180 degrees"` - Out of range
- `"City name must be between 2 and 100 characters"` - Wrong length
- `"City name contains invalid characters"` - Special characters
- `"Please provide either location coordinates or a city name"` - Missing both params

---

#### 404 Not Found - City Not Found

**Status Code:** `404`

**Response Body:**
```json
{
  "success": false,
  "error": "City not found. Please check the spelling and try again."
}
```

---

#### 429 Too Many Requests - Rate Limit Exceeded

**Status Code:** `429`

**Response Body:**
```json
{
  "success": false,
  "error": "Service temporarily unavailable. Please try again in a moment."
}
```

**Note:** OpenWeatherMap free tier: 60 requests/minute

---

#### 500 Internal Server Error

**Status Code:** `500`

**Response Body:**
```json
{
  "success": false,
  "error": "An unexpected error occurred. Please try again later."
}
```

**Possible Causes:**
- `"Service request timed out. Please try again."` - API timeout
- `"Unable to connect to weather service. Please try again."` - Network error
- `"Weather service authentication failed."` - Invalid API key
- `"Service is not properly configured"` - Missing API key

---

## Frontend Integration Examples

### JavaScript/Fetch API

```javascript
/**
 * Fetch weather by coordinates (Geolocation)
 */
async function getWeatherByCoordinates(latitude, longitude) {
  try {
    const response = await fetch('/dashboard/api/weather', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),  // Include CSRF token
      },
      body: JSON.stringify({
        latitude: latitude,
        longitude: longitude,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Handle success
      displayWeather(data.data);
    } else {
      // Handle error
      showError(data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    showError('Unable to fetch weather data');
  }
}

/**
 * Fetch weather by city name
 */
async function getWeatherByCity(cityName) {
  try {
    const response = await fetch('/dashboard/api/weather', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({
        city: cityName.trim(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      displayWeather(data.data);
    } else {
      showError(data.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    showError('Unable to fetch weather data');
  }
}

/**
 * Display weather data in UI
 */
function displayWeather(weatherData) {
  // Example: Update DOM with weather info
  document.getElementById('city').textContent = 
    `${weatherData.city}, ${weatherData.country}`;
  
  document.getElementById('temperature').textContent = 
    `${Math.round(weatherData.temperature)}°C`;
  
  document.getElementById('feels-like').textContent = 
    `Feels like ${Math.round(weatherData.feels_like)}°C`;
  
  document.getElementById('description').textContent = 
    weatherData.description;
  
  document.getElementById('humidity').textContent = 
    `Humidity: ${weatherData.humidity}%`;
  
  document.getElementById('wind-speed').textContent = 
    `Wind: ${weatherData.wind_speed} m/s`;
  
  // Display weather icon
  const iconUrl = getWeatherIconUrl(weatherData.icon);
  document.getElementById('weather-icon').src = iconUrl;
}

/**
 * Get CSRF token from cookie
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Error handling
 */
function showError(errorMessage) {
  // Example: Display error in UI
  const errorElement = document.getElementById('error');
  errorElement.textContent = errorMessage;
  errorElement.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

/**
 * Browser Geolocation
 */
function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success - fetch weather by coordinates
        getWeatherByCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      (error) => {
        // Error - show fallback input
        console.warn('Geolocation error:', error);
        showCityInput();
      }
    );
  } else {
    // Geolocation not supported - show input
    showCityInput();
  }
}
```

---

### jQuery Alternative

```javascript
/**
 * Using jQuery
 */
function getWeatherByCity(cityName) {
  $.ajax({
    type: 'POST',
    url: '/dashboard/api/weather',
    headers: {
      'X-CSRFToken': $('[name=csrfmiddlewaretoken]').val(),
    },
    contentType: 'application/json',
    data: JSON.stringify({
      city: cityName.trim(),
    }),
    success: function(response) {
      if (response.success) {
        displayWeather(response.data);
      } else {
        showError(response.error);
      }
    },
    error: function(xhr, status, error) {
      showError('Unable to fetch weather data');
    },
  });
}
```

---

## Weather Icon Codes

**Reference:** https://openweathermap.org/weather-conditions

The `icon` field contains a code like `"02d"` or `"03n"`:
- First 2 characters = weather condition
- Last character = `d` (day) or `n` (night)

**Common Codes:**

| Code | Description | Icon |
|------|-------------|------|
| 01d/01n | Clear sky | ☀️ / 🌙 |
| 02d/02n | Few clouds | ⛅ |
| 03d/03n | Scattered clouds | ☁️ |
| 04d/04n | Broken clouds | ☁️☁️ |
| 09d/09n | Shower rain | 🌧️ |
| 10d/10n | Rain | 🌧️☔ |
| 11d/11n | Thunderstorm | ⛈️ |
| 13d/13n | Snow | ❄️ |
| 50d/50n | Mist | 🌫️ |

**Get Icon URL:**
```javascript
function getWeatherIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}
```

---

## Rate Limiting

**Free Tier Limits:**
- 60 requests per minute
- 1,000,000 calls per month

**Client-Side Best Practices:**
```javascript
// Debounce city input to avoid rapid requests
let debounceTimer = null;

document.getElementById('city-input').addEventListener('input', (event) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    getWeatherByCity(event.target.value);
  }, 500);  // Wait 500ms after user stops typing
});
```

---

## CSRF Token Configuration

**Django provides CSRF token in two ways:**

### Method 1: Template Tag (Recommended)
```html
<!DOCTYPE html>
<html>
<head>
    {% csrf_token %}
</head>
<body>
    <!-- Your content -->
</body>
</html>
```

Then JavaScript can access it:
```javascript
const token = document.querySelector('[name=csrfmiddlewaretoken]').value;
```

### Method 2: Cookie
```javascript
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Then include in headers
headers: {
  'X-CSRFToken': getCookie('csrftoken'),
}
```

---

## Response Time & Performance

**Typical Response Times:**
- Fast API: 200-500ms
- Normal API: 500-1500ms
- Slow API/Network: 1500-5000ms
- Timeout (after 5 seconds)

**User Experience Tips:**
1. Show loading spinner while fetching
2. Implement 5-second timeout
3. Allow user to cancel request
4. Cache results for 10-15 minutes
5. Implement offline fallback

---

## Testing with cURL

```bash
# Test with city name
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"London"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test with coordinates
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"latitude":51.5074,"longitude":-0.1278}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test error handling (invalid city)
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"XYZABC123"}' \
  -w "\nHTTP Status: %{http_code}\n"

# Test error handling (invalid latitude)
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"latitude":91,"longitude":0}' \
  -w "\nHTTP Status: %{http_code}\n"
```

---

## Frontend Checklist

- [ ] Include CSRF token in all POST requests
- [ ] Handle both success and error responses
- [ ] Display user-friendly error messages
- [ ] Implement geolocation with fallback
- [ ] Debounce city input to prevent spam
- [ ] Show loading state while fetching
- [ ] Cache results for 10-15 minutes
- [ ] Implement timeout (5 seconds)
- [ ] Display weather icon
- [ ] Format timestamp to readable date/time
- [ ] Make responsive for mobile devices

---

## Browser Compatibility

**Geolocation API:**
- Chrome 5+
- Firefox 3.5+
- Safari 5+
- IE 9+
- Edge (all versions)

**Fallback for unsupported browsers:**
```javascript
if ('geolocation' in navigator) {
  // Use geolocation
} else {
  // Show city input form
}
```

---

## Security Notes

1. **CSRF Protection:** Always include CSRF token in POST requests
2. **API Key:** Never embed in frontend - kept on backend
3. **HTTPS:** Use in production for secure data transmission
4. **Validation:** Validate input on both frontend and backend
5. **Error Messages:** Don't expose sensitive info to user

---

## Example Complete HTML Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
        .weather-container {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            display: none;
        }
        .weather-container.show {
            display: block;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: none;
        }
        .error.show {
            display: block;
        }
        .loading {
            text-align: center;
            display: none;
        }
        .loading.show {
            display: block;
        }
    </style>
</head>
<body>
    {% csrf_token %}
    
    <h1>Weather Dashboard</h1>
    
    <div class="loading" id="loading">
        <p>Loading weather data...</p>
    </div>
    
    <div class="error" id="error"></div>
    
    <div class="weather-container" id="weather">
        <h2 id="city"></h2>
        <div id="temperature" style="font-size: 24px; font-weight: bold;"></div>
        <div id="feels-like"></div>
        <img id="weather-icon" style="width: 64px; height: 64px;">
        <div id="description" style="font-style: italic;"></div>
        <hr>
        <div id="humidity"></div>
        <div id="wind-speed"></div>
        <div id="pressure"></div>
    </div>
    
    <input type="text" id="city-input" placeholder="Enter city name...">
    <button onclick="searchCity()">Search</button>
    
    <script>
        // Get CSRF token
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        
        // Fetch weather
        async function getWeatherByCity(cityName) {
            showLoading(true);
            try {
                const response = await fetch('/dashboard/api/weather', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({ city: cityName.trim() }),
                });
                
                const data = await response.json();
                
                if (data.success) {
                    displayWeather(data.data);
                    showError(null);
                } else {
                    showError(data.error);
                }
            } catch (error) {
                showError('Failed to fetch weather data');
            } finally {
                showLoading(false);
            }
        }
        
        // Display weather
        function displayWeather(weatherData) {
            document.getElementById('city').textContent = 
                `${weatherData.city}, ${weatherData.country}`;
            document.getElementById('temperature').textContent = 
                `${Math.round(weatherData.temperature)}°C`;
            document.getElementById('feels-like').textContent = 
                `Feels like ${Math.round(weatherData.feels_like)}°C`;
            document.getElementById('description').textContent = 
                weatherData.description;
            document.getElementById('humidity').textContent = 
                `Humidity: ${weatherData.humidity}%`;
            document.getElementById('wind-speed').textContent = 
                `Wind: ${weatherData.wind_speed} m/s`;
            document.getElementById('weather-icon').src = 
                `https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`;
            document.getElementById('weather').classList.add('show');
        }
        
        // Show/hide loading
        function showLoading(show) {
            document.getElementById('loading').classList.toggle('show', show);
        }
        
        // Show error
        function showError(message) {
            const errorEl = document.getElementById('error');
            if (message) {
                errorEl.textContent = message;
                errorEl.classList.add('show');
            } else {
                errorEl.classList.remove('show');
            }
        }
        
        // Search city
        function searchCity() {
            const cityName = document.getElementById('city-input').value;
            if (cityName.trim()) {
                getWeatherByCity(cityName);
            }
        }
        
        // Auto-fetch on load
        window.addEventListener('load', () => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        // Note: Your API also supports coordinates
                        // For now, just show the input
                        console.log('Location:', position.coords.latitude, position.coords.longitude);
                    },
                    () => {
                        console.log('Geolocation denied');
                    }
                );
            }
        });
    </script>
</body>
</html>
```

---

## Support

For issues or questions about the API:
1. Check the error message - it usually explains what went wrong
2. Review `BACKEND_ARCHITECTURE.md` for detailed documentation
3. Check OpenWeatherMap API docs: https://openweathermap.org/api
4. View logs on the server for debugging

---

**Version:** 1.0  
**Last Updated:** December 2025  
**API Status:** Production Ready
