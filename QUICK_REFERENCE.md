# Quick Reference Guide - Weather Dashboard Backend

## 🚀 Quick Start

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env and add your OpenWeatherMap API key

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run server
python manage.py runserver

# 4. Test API
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"London"}'
```

---

## 📁 File Structure

```
dashboard/
├── views.py              # HTTP handlers (2 functions)
├── services.py           # Business logic (WeatherService class)
├── urls.py              # URL routing (2 routes)
├── forms.py             # (Not used by API, can be deprecated)
├── models.py            # (Not used for this feature)
└── migrations/          # Database migrations

weather_dashboard/
├── settings.py          # Django config (updated)
├── urls.py              # Project URLs
├── wsgi.py              # WSGI app
└── asgi.py              # ASGI app

.env.example             # Config template
BACKEND_ARCHITECTURE.md  # Full documentation (detailed)
API_INTEGRATION_GUIDE.md # Frontend integration examples
IMPLEMENTATION_SUMMARY.md # This project summary
```

---

## 🔌 API Endpoints

### Fetch Weather by City
```http
POST /dashboard/api/weather
Content-Type: application/json

{
  "city": "London"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "city": "London",
    "country": "GB",
    "temperature": 8.5,
    "feels_like": 7.2,
    "humidity": 85,
    "pressure": 1010,
    "wind_speed": 4.2,
    "wind_direction": 240,
    "cloudiness": 90,
    "description": "Overcast clouds",
    "icon": "04d",
    "sunrise": 1671907200,
    "sunset": 1671945600
  }
}
```

### Fetch Weather by Coordinates
```http
POST /dashboard/api/weather
Content-Type: application/json

{
  "latitude": 51.5074,
  "longitude": -0.1278
}
```

---

## ❌ Error Responses

| HTTP Status | Message | Cause |
|------------|---------|-------|
| 400 | `"Invalid request format"` | Malformed JSON |
| 400 | `"City name must be between 2 and 100 characters"` | City length wrong |
| 400 | `"Latitude must be between -90 and 90 degrees"` | Invalid latitude |
| 404 | `"City not found..."` | City doesn't exist |
| 429 | `"Service temporarily unavailable..."` | Rate limit (60/min) |
| 500 | `"Service request timed out..."` | API timeout |
| 500 | `"Service is not properly configured"` | Missing API key |

---

## 🔒 Security Features

✅ API key stored in environment variable  
✅ Input validation (ranges, types, length)  
✅ CSRF protection enabled  
✅ Generic error messages (no sensitive info)  
✅ Comprehensive logging (no credentials logged)  
✅ Type checking and sanitization  
✅ HTTPS-ready configuration  

---

## 📊 Implementation Details

### Views (`views.py`)
- **`index(request)`** - Renders dashboard HTML
- **`get_weather(request)`** - API endpoint
  - Accepts POST with JSON
  - Validates input parameters
  - Returns structured JSON
  - Handles 5 exception types

### Services (`services.py`)
- **`WeatherService` class**
  - `__init__()` - Validates API key
  - `get_weather_by_coordinates()` - Fetch by lat/lon
  - `get_weather_by_city()` - Fetch by city name
  
- **Exception types**
  - `ValidationError` - Input validation failed
  - `APIError` - OpenWeatherMap API error
  - `RateLimitError` - Rate limit exceeded
  - `ConfigurationError` - Missing API key

### URLs (`urls.py`)
```python
path('', views.index)                    # GET /
path('api/weather', views.get_weather)   # POST /api/weather
```

---

## 🧪 Testing Examples

```bash
# Success: Get weather for London
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"London"}'

# Success: Get weather by coordinates
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"latitude":40.7128,"longitude":-74.0060}'

# Error: Invalid city (too short)
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"X"}'

# Error: Invalid latitude
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"latitude":91,"longitude":0}'

# Error: City not found
curl -X POST http://localhost:8000/dashboard/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"XYZNOTAREAL"}'
```

---

## 📋 Response Fields Explained

| Field | Example | Notes |
|-------|---------|-------|
| `temperature` | `15.2` | In Celsius |
| `feels_like` | `14.8` | Perceived temperature |
| `humidity` | `72` | Percentage (0-100) |
| `pressure` | `1013` | Hectopascals (hPa) |
| `wind_speed` | `3.5` | Meters per second (m/s) |
| `wind_direction` | `230` | Degrees (0-360), can be null |
| `cloudiness` | `45` | Percentage (0-100) |
| `description` | `"Partly cloudy"` | Human-readable |
| `icon` | `"02d"` | Weather icon code |
| `sunrise` | `1671907200` | Unix timestamp (UTC) |
| `sunset` | `1671945600` | Unix timestamp (UTC) |

---

## 🔧 Configuration

### Django Settings (`settings.py`)
```python
OPENWEATHERMAP_API_KEY = os.getenv('OPENWEATHERMAP_API_KEY')
CSRF_COOKIE_SECURE = False          # True in production
CSRF_COOKIE_HTTPONLY = False        # Must be False for JS
CSRF_COOKIE_SAMESITE = 'Lax'
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']
```

### Environment Variables (`.env`)
```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
OPENWEATHERMAP_API_KEY=your-api-key-here
```

---

## 💡 Frontend Implementation

### JavaScript Fetch
```javascript
// Fetch weather by city
async function getWeather(cityName) {
  const response = await fetch('/dashboard/api/weather', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify({ city: cityName }),
  });
  
  const data = await response.json();
  if (data.success) {
    console.log(data.data);  // Weather data
  } else {
    console.error(data.error);  // Error message
  }
}
```

### Browser Geolocation
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    // Use coordinates API
    fetch('/dashboard/api/weather', {
      method: 'POST',
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    });
  },
  (error) => {
    // Fallback to city input
    console.log('Geolocation denied');
  }
);
```

---

## 🐛 Debugging

### Enable Debug Logging
```python
# In settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
```

### Check API Key
```python
python manage.py shell
>>> from django.conf import settings
>>> settings.OPENWEATHERMAP_API_KEY
'your-api-key'  # Should return the key
```

### Test API Directly
```python
python manage.py shell
>>> from dashboard.services import WeatherService
>>> service = WeatherService()
>>> result = service.get_weather_by_city('London')
>>> print(result)
```

---

## 📈 Performance

- **Typical response time:** 500-1500ms
- **OpenWeatherMap limit:** 60 requests/minute (free tier)
- **Timeout:** 5 seconds
- **Recommended caching:** 10-15 minutes

---

## 🚨 Common Issues

### "API key not configured"
```
Solution: Add OPENWEATHERMAP_API_KEY to .env
```

### "City not found"
```
Solution: Check spelling or try country code: "London, UK"
```

### "Rate limit exceeded"
```
Solution: Wait a minute or implement caching on frontend
```

### "Connection timeout"
```
Solution: Check internet, increase timeout, or try again
```

### "CSRF verification failed"
```
Solution: Include X-CSRFToken header in AJAX requests
```

---

## 📚 Documentation Files

| File | Purpose | Details |
|------|---------|---------|
| `BACKEND_ARCHITECTURE.md` | Complete architecture | Design decisions, error handling, security |
| `API_INTEGRATION_GUIDE.md` | Frontend integration | Examples, code snippets, icons |
| `IMPLEMENTATION_SUMMARY.md` | Project overview | Files, structure, checklist |
| This file | Quick reference | Commands, endpoints, examples |

---

## 🎯 View Type Decision: Why FBV?

**Function-Based Views chosen over Class-Based Views because:**

1. **Simplicity** - Direct request→logic→response flow
2. **Readability** - No inheritance overhead
3. **API Endpoints** - Standard practice for REST APIs
4. **Decorators** - Easy to add `@require_http_methods`, `@csrf_exempt`
5. **Testing** - Simpler to mock and test

```python
# FBV (chosen) - 50 lines, clear and direct
@require_http_methods(["POST"])
def get_weather(request):
    # Parse JSON
    # Validate input
    # Call service
    # Return response

# vs. CBV - More boilerplate, less intuitive for APIs
class WeatherAPIView(APIView):
    def post(self, request):
        # Same logic but with class overhead
```

---

## ✅ Production Checklist

### Before Deploy
- [ ] Set `DEBUG=False`
- [ ] Generate strong `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` correctly
- [ ] Test with real API key
- [ ] Enable HTTPS settings
- [ ] Configure database

### During Deploy
- [ ] Run migrations
- [ ] Collect static files
- [ ] Use Gunicorn/uWSGI
- [ ] Set up Nginx reverse proxy
- [ ] Configure SSL certificate

### After Deploy
- [ ] Verify API works
- [ ] Monitor error logs
- [ ] Check response times
- [ ] Test error handling

---

## 🔗 Useful Links

- **OpenWeatherMap API:** https://openweathermap.org/api
- **Get API Key:** https://openweathermap.org/api
- **Weather Icons:** https://openweathermap.org/weather-conditions
- **Django Docs:** https://docs.djangoproject.com/
- **REST API Best Practices:** https://restfulapi.net/

---

## 📞 Support

**For API Issues:**
1. Check error message - usually explains the problem
2. Review error handling table above
3. Check BACKEND_ARCHITECTURE.md for detailed docs
4. Test with curl first before debugging frontend

**For Configuration Issues:**
1. Verify `.env` file exists and has correct permissions
2. Check API key format (should be alphanumeric)
3. Restart Django after changing `.env`
4. Check environment variables are loaded: `python manage.py shell`

---

**Version:** 1.0  
**Updated:** December 2025  
**Status:** Production Ready ✅
