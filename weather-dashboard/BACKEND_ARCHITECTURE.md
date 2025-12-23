# Weather Dashboard Backend Architecture

## Overview

This document explains the Django backend architecture for the Weather Dashboard application, including the design decisions, error handling strategy, security considerations, and API specifications.

---

## Architecture & Design Decisions

### 1. View Type Selection: Function-Based Views (FBV)

**Decision:** We use **function-based views** instead of class-based views (CBVs).

**Justification:**
- **Simplicity**: The endpoint logic is straightforward - parse JSON, call service, return response
- **Readability**: Code is linear and easy to follow for maintenance
- **Decorator Support**: Easy to add decorators like `@require_http_methods`, `@csrf_exempt`, etc.
- **Lightweight**: No need for class inheritance overhead for simple operations
- **API Endpoints**: Standard practice for REST API endpoints

**Comparison:**
```python
# FBV (chosen) - Clear, explicit, easy to reason about
@require_http_methods(["POST"])
def get_weather(request):
    data = json.loads(request.body)
    weather_service = WeatherService()
    return JsonResponse(weather_service.get_weather_by_city(data['city']))

# CBV - More boilerplate, less intuitive for API endpoints
class WeatherAPIView(APIView):
    def post(self, request):
        # ... same logic but more code
```

### 2. Separation of Concerns

**Views** (`views.py`):
- Handle HTTP request/response
- Parse JSON input
- Catch exceptions and return appropriate HTTP status codes
- Logging for debugging/monitoring

**Services** (`services.py`):
- Business logic for weather data retrieval
- API communication with OpenWeatherMap
- Data validation and transformation
- Custom exception definitions
- No Django dependencies (reusable)

**Benefits:**
- Easy to test services independently
- Reusable business logic (could be used by CLI, async tasks, etc.)
- Clear responsibility boundaries
- Easier to maintain and extend

### 3. API Design

**Endpoint:** `POST /api/weather`

**Request:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```
OR
```json
{
  "city": "New York"
}
```

**Response (Success):**
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

**Response (Error):**
```json
{
  "success": false,
  "error": "City not found. Please check the spelling and try again."
}
```

---

## Error Handling Strategy

### 1. Custom Exception Hierarchy

We define custom exceptions to clearly communicate error types:

```python
class ValidationError(Exception)      # User input is invalid
class APIError(Exception)             # OpenWeatherMap API error
class RateLimitError(Exception)       # Rate limit exceeded
class ConfigurationError(Exception)   # Service not configured
```

**Benefits:**
- Specific error handling for different scenarios
- Clear error messages that don't expose sensitive info
- Easy to test different error conditions

### 2. Error Handling Flow

```
User Request
    ↓
[View Layer]
  - Parse JSON
  - Extract parameters
  - Try/Except blocks
    ↓
[Service Layer]
  - Validate input
  - Call OpenWeatherMap API
  - Process response
    ↓
[Custom Exceptions]
  - ValidationError → 400 Bad Request
  - APIError → 404 Not Found (city missing) or 500 (API down)
  - RateLimitError → 429 Too Many Requests
  - ConfigurationError → 500 Internal Server Error
    ↓
[Response to Client]
  - User-friendly error message
  - Appropriate HTTP status code
  - Logged for debugging
```

### 3. Specific Error Cases & Handling

| Error Case | Exception | HTTP Status | Client Message |
|-----------|-----------|------------|-----------------|
| Missing API key | ConfigurationError | 500 | "Service is not properly configured" |
| Invalid latitude | ValidationError | 400 | "Latitude must be between -90 and 90 degrees" |
| Invalid longitude | ValidationError | 400 | "Longitude must be between -180 and 180 degrees" |
| Invalid city format | ValidationError | 400 | "City name must be between 2 and 100 characters" |
| City not found | APIError | 404 | "City not found. Please check the spelling and try again." |
| API timeout | APIError | 500 | "Service request timed out. Please try again." |
| Network error | APIError | 500 | "Unable to connect to weather service. Please try again." |
| API rate limit | RateLimitError | 429 | "Service temporarily unavailable. Please try again in a moment." |
| API authentication | APIError | 500 | "Weather service authentication failed." |
| Invalid JSON | JSONDecodeError | 400 | "Invalid request format" |
| Missing parameters | ValidationError | 400 | "Please provide either location coordinates or a city name" |

### 4. Security-First Error Messages

**DO NOT expose:**
- Internal API keys or endpoints
- Stack traces or technical details
- API quota information
- Internal server paths

**Example:**
```python
# ❌ BAD: Exposes too much info
raise APIError(f"Failed to fetch from {OPENWEATHERMAP_API_URL}: {e}")

# ✅ GOOD: User-friendly, generic
raise APIError("Unable to fetch weather data. Please try again.")
```

### 5. Logging Strategy

**What we log:**
- User requests (without sensitive data)
- Input validation warnings
- API error messages
- Exceptions with stack traces

**What we DON'T log:**
- API keys or credentials
- User location data (privacy)
- Full error details sent to client

**Example:**
```python
logger.info(f"Fetching weather for coordinates: {latitude}, {longitude}")
logger.warning("Rate limit exceeded")  # Generic, no details
logger.error(f"API error: {str(e)}", exc_info=True)  # Full traceback in logs only
```

---

## Security Considerations

### 1. API Key Management

**Storage:**
- Environment variable only (`OPENWEATHERMAP_API_KEY` in `.env`)
- Never hardcoded in source files
- Never logged or sent to client
- Never exposed in error messages

**Access:**
- Retrieved at service initialization
- Configuration error if missing
- Validate existence before making API calls

### 2. Input Validation

**Coordinates:**
- Type checking (int/float)
- Range validation (-90 to 90 for latitude, -180 to 180 for longitude)
- Special value checking (NaN, Infinity)

**City Names:**
- Type checking (str)
- Length validation (2-100 characters)
- Character validation (alphanumeric, spaces, hyphens, apostrophes only)
- Whitespace stripping

**Benefits:**
- Prevents injection attacks
- Validates client-side errors
- Clean API communication

### 3. HTTP Security Headers

**Current Configuration:**
```python
CSRF_COOKIE_SECURE = False  # HTTP in dev, set to True in production
CSRF_COOKIE_HTTPONLY = False  # Required for JavaScript to read token
CSRF_COOKIE_SAMESITE = 'Lax'  # Prevents cross-site attacks
```

**Frontend requirement:** Include CSRF token in AJAX headers
```javascript
// In frontend JavaScript
headers: {
    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
    'Content-Type': 'application/json'
}
```

### 4. API Rate Limiting

**Current:** Relies on OpenWeatherMap free tier rate limit (60 calls/minute)

**Future improvements:**
- Implement Django Rate Limiting middleware
- Cache results for 10-15 minutes per location
- Implement client-side cooldown (debounce user requests)

---

## Testing Strategy

### Unit Tests for Services

```python
# Test input validation
def test_invalid_latitude():
    service = WeatherService()
    with pytest.raises(ValidationError):
        service.get_weather_by_coordinates(91, 0)  # Invalid latitude

# Test API error handling
def test_city_not_found():
    with patch('requests.get') as mock_get:
        mock_get.return_value.status_code = 404
        service = WeatherService()
        with pytest.raises(APIError, match="not found"):
            service.get_weather_by_city("XYZ12345")

# Test successful response
def test_successful_city_lookup():
    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = {
            'main': {...},
            'weather': [{...}],
            # ... full API response
        }
        service = WeatherService()
        result = service.get_weather_by_city("London")
        assert result['city'] == 'London'
```

### Integration Tests for Views

```python
def test_get_weather_endpoint(client):
    response = client.post('/api/weather', {
        'city': 'London'
    }, content_type='application/json')
    
    assert response.status_code == 200
    assert response.json()['success'] is True
    assert 'temperature' in response.json()['data']
```

---

## Production Deployment Checklist

### Security
- [ ] Set `DEBUG=False`
- [ ] Use strong `SECRET_KEY` (50+ characters)
- [ ] Set `ALLOWED_HOSTS` to actual domain
- [ ] Enable `SECURE_SSL_REDIRECT = True`
- [ ] Enable `CSRF_COOKIE_SECURE = True`
- [ ] Use HTTPS certificate
- [ ] Set secure database password

### Performance
- [ ] Configure database connection pooling
- [ ] Enable caching (Redis recommended)
- [ ] Add response caching for weather data
- [ ] Use a production WSGI server (Gunicorn, uWSGI)
- [ ] Configure static file serving (CDN recommended)

### Monitoring
- [ ] Set up logging to external service
- [ ] Monitor API rate limit usage
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor response times
- [ ] Set up alerts for high error rates

### Infrastructure
- [ ] Use separate database server
- [ ] Use environment-specific configuration files
- [ ] Set up automated backups
- [ ] Use process manager (Supervisor, SystemD)
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure firewall rules

---

## Future Improvements

### Short Term
1. Add result caching with Redis (avoid duplicate API calls)
2. Implement rate limiting per IP address
3. Add comprehensive unit tests
4. Add API documentation (OpenAPI/Swagger)

### Medium Term
1. Add user accounts for favorite locations
2. Implement historical weather data storage
3. Add weather alerts system
4. Multi-language support

### Long Term
1. Machine learning for weather predictions
2. Integration with additional weather providers
3. Mobile app backend optimization
4. GraphQL API alternative

---

## API Key Setup Guide

1. **Sign up at OpenWeatherMap:**
   - Visit: https://openweathermap.org/api
   - Create free account
   - Verify email

2. **Get API key:**
   - Go to "API keys" section
   - Copy the default API key

3. **Configure locally:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   OPENWEATHERMAP_API_KEY=your-actual-key-here
   ```

4. **Test the setup:**
   ```bash
   python manage.py shell
   >>> from django.conf import settings
   >>> settings.OPENWEATHERMAP_API_KEY
   'your-key-here'  # Should return your key
   ```

---

## Resources

- [OpenWeatherMap API Docs](https://openweathermap.org/weather-data)
- [OpenWeatherMap API Codes](https://openweathermap.org/api/error-codes)
- [Django Error Handling](https://docs.djangoproject.com/en/latest/topics/http/views/#error-handling)
- [REST API Best Practices](https://restfulapi.net/)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
