# Error Handling & Edge Case Management Guide

**Weather Dashboard** implements comprehensive error handling across both frontend and backend to ensure the application never crashes and always provides helpful user feedback.

**Last Updated:** December 23, 2025  
**Version:** 2.0 (Improved Error Handling)

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Error Handling](#backend-error-handling)
3. [Frontend Error Handling](#frontend-error-handling)
4. [User Scenarios & Recovery Paths](#user-scenarios--recovery-paths)
5. [Testing Error Scenarios](#testing-error-scenarios)
6. [Error Code Reference](#error-code-reference)
7. [Best Practices](#best-practices)

---

## Overview

The application handles errors across three layers:

### Error Handling Layers

```
┌─────────────────────────────────────────────┐
│         User Interface (Frontend)            │
│  • Visual error display with emojis          │
│  • User-friendly messages & suggestions      │
│  • Retry buttons & recovery options          │
│  • Input validation on client-side           │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│         Network & API (Middleware)           │
│  • HTTP status codes (400, 404, 429, 503)    │
│  • Timeout handling (fetch AbortController)  │
│  • Network error detection                   │
│  • Response validation                       │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│    Backend Services (Django & WeatherAPI)    │
│  • Input validation (coordinates, cities)    │
│  • Exception handling (custom exceptions)    │
│  • API error translation                     │
│  • Logging & monitoring                      │
└─────────────────────────────────────────────┘
```

---

## Backend Error Handling

### HTTP Status Codes

The backend returns appropriate HTTP status codes:

| Code | Meaning | When Used | User Action |
|------|---------|-----------|------------|
| 200 | Success | Weather data retrieved | None - data displayed |
| 400 | Bad Request | Invalid input or missing params | Fix input, retry |
| 404 | Not Found | City doesn't exist | Check spelling, retry |
| 429 | Too Many Requests | API rate limit exceeded | Wait, then retry |
| 503 | Service Unavailable | API timeout or down | Wait, then retry |
| 500 | Internal Server Error | Unexpected error | Refresh page, retry |

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "retry": true,
  "retryAfter": 60
}
```

**Fields:**
- `success`: Boolean indicating operation success
- `error`: Human-readable error message for display
- `code`: Machine-readable error code for frontend handling
- `retry`: Whether user should retry this operation
- `retryAfter`: Seconds to wait before retrying (if applicable)

### Error Codes & Messages

```python
'CITY_NOT_FOUND'         → "We couldn't find a city with that name..."
'VALIDATION_ERROR'       → "Please enter a valid city name..."
'MISSING_PARAMETERS'     → "Please provide either location coordinates..."
'INVALID_REQUEST'        → "Invalid request format. Ensure valid JSON..."
'RATE_LIMITED'           → "Service busy due to high demand. Wait..."
'TIMEOUT'                → "Request timed out. Check internet..."
'API_ERROR'              → "Unable to fetch weather data. Try again..."
'CONFIG_ERROR'           → "Service not configured. Contact support..."
'INTERNAL_ERROR'         → "Unexpected error occurred. Try again..."
```

### Backend Exception Hierarchy

```python
ValidationError          → Input validation failed (400)
  └─ Invalid coordinates
  └─ Invalid city name
  └─ Missing parameters

APIError                 → Weather API error (404/503)
  └─ City not found
  └─ Timeout
  └─ Service unavailable

RateLimitError           → API quota exceeded (429)
  └─ Wait and retry

ConfigurationError       → Setup issue (500)
  └─ Missing API key

Exception                → Unexpected error (500)
  └─ Log and respond with generic message
```

### Validation Rules

**Coordinates:**
```python
Latitude:  -90.0 to +90.0 degrees
Longitude: -180.0 to +180.0 degrees
Type:      Must be numeric (int or float)
```

**City Name:**
```python
Length:    2-100 characters
Charset:   Letters, spaces, hyphens, apostrophes
Examples:  ✅ London, New York, San Francisco
           ❌ 12345, #@$%, very very very very long city...
```

---

## Frontend Error Handling

### Error Display UI

When an error occurs, the frontend shows:

```
┌─────────────────────────────────┐
│    ❌ Error Title               │
│  (e.g., "Location Not Found")   │
├─────────────────────────────────┤
│                                 │
│  Error message explanation      │
│  (user-friendly description)    │
│                                 │
│  💡 Suggestion for recovery     │
│  (optional - if applicable)     │
├─────────────────────────────────┤
│  [Try Again] [Search by City]   │
│  (buttons shown based on error) │
└─────────────────────────────────┘
```

### Error Handling Methods

#### 1. handleWeatherError(data, statusCode)

Processes API error responses with status code awareness:

```javascript
// Called when API returns error response
try {
    const response = await fetch('/api/weather', {...});
    const data = await response.json();
    
    if (!data.success) {
        this.handleWeatherError(data, response.status);
        // Maps error.code to user-friendly message
        // Shows appropriate retry button
        return;
    }
} catch (error) {
    // Network error - not API error
}
```

**Handles:**
- City not found (404)
- Validation errors (400)
- Rate limiting (429)
- Service unavailable (503)
- Internal errors (500)

#### 2. handleNetworkError(error)

Processes network-level errors:

```javascript
// Called when fetch fails
try {
    await fetch('/api/weather', {...});
} catch (error) {
    this.handleNetworkError(error);
    // Handles:
    // - Connection refused
    // - Timeout
    // - DNS lookup failed
    // - CORS errors
}
```

#### 3. handleLocationError(error)

Processes geolocation API errors:

```javascript
navigator.geolocation.getCurrentPosition(
    success,
    (error) => this.handleLocationError(error)
);

// Error codes:
// 1: Permission denied by user
// 2: Location unavailable
// 3: Timeout (>10 seconds)
```

### Error Messages with Emojis

The frontend uses emojis for visual recognition:

| Error Type | Emoji | Example |
|-----------|-------|---------|
| Location Not Found | 🔍 | "🔍 Location Not Found" |
| Permission Denied | 🚫 | "🚫 Permission Denied" |
| Network Error | 🌐 | "🌐 Connection Error" |
| Timeout | ⏱️ | "⏱️ Request Timeout" |
| Rate Limited | ⏳ | "⏳ Service Busy" |
| Validation | ⚠️ | "⚠️ Invalid Input" |
| Service Error | 🌐 | "🌐 Service Error" |
| Config Problem | ⚙️ | "⚙️ Configuration Problem" |

---

## User Scenarios & Recovery Paths

### Scenario 1: User Denies Location Permission

**What Happens:**
1. App requests geolocation access
2. User clicks "Deny" or doesn't respond
3. Geolocation API returns error code 1

**Error Flow:**
```
Geolocation → Error code 1 → handleLocationError()
         ↓
    Show message: "🚫 Permission Denied"
    "To use automatic location detection, enable location 
     in your browser settings and reload the page."
    ↓
    Show location input form → User types city name
    ↓
    Success or different error
```

**Recovery Options:**
- User enters city name manually
- User can re-enable location and refresh page

**Error Message:**
```
🚫 Permission Denied
You denied access to your location.
Location services are disabled. To enable them, go to your 
browser settings and grant location permission for this site.

💡 You can search for a city manually instead.

[Try Again] [Search by City]
```

---

### Scenario 2: Browser Doesn't Support Geolocation

**What Happens:**
1. App checks `navigator.geolocation`
2. Property doesn't exist (old browser)
3. Falls back to manual city search

**Error Flow:**
```
Check geolocation support → Not supported
         ↓
    Show message: "🌐 Geolocation Not Supported"
    "Your browser does not support location detection."
    ↓
    Show location input form with help text
```

**Recovery:**
- User enters city name
- Suggest updating browser in tooltip

**Error Message:**
```
🌐 Geolocation Not Supported
Your browser does not support location detection.
Please update to a modern browser like Chrome, Firefox, 
Safari, or Edge for location support.

💡 You can search for a city manually instead.
```

---

### Scenario 3: Invalid City Name

**What Happens:**
1. User types city name (e.g., "XyZ123456")
2. Form submits
3. Backend validates and rejects

**Error Flow:**
```
User input: "XyZ123456"
         ↓
Client validation: Check length, characters
         ↓
Server validation: Check again for security
         ↓
API returns: 404 "City not found"
         ↓
Frontend shows: 🔍 Location Not Found
    "We couldn't find a city with that name.
     Please check the spelling and try again."
         ↓
Show: [Try Again] [Search by City]
```

**User Sees:**
```
🔍 Location Not Found
We couldn't find a city with that name. 
Please check the spelling and try again.

💡 Try searching for: London, New York, Paris, Tokyo

[Try Again] [Search by City]
```

**Recovery:**
- User corrects spelling and retries
- Input validation guides them with suggestions

---

### Scenario 4: Network Timeout

**What Happens:**
1. User has slow/unstable internet
2. Request to API takes >10 seconds
3. Request times out

**Error Flow:**
```
Fetch /api/weather
         ↓
         Wait... (5s)
         Wait... (10s)
         Wait... (timeout)
         ↓
Catch network error: "Failed to fetch"
         ↓
handleNetworkError() detects timeout
         ↓
Show: ⏱️ Request Timeout
    "The request took too long. Please try again."
         ↓
Enable [Try Again] button → Retry with exponential backoff
```

**User Experience:**
```
⏱️ Connection Timeout
The request took too long. Please check your internet 
connection and try again.

💡 Click "Try Again" to retry

[Try Again] [Search by City]
```

**Retry Logic:**
- First retry: immediate
- Second retry: wait 5 seconds
- Third retry: wait 10 seconds
- After that: suggest manual search

---

### Scenario 5: Rate Limiting (Too Many Requests)

**What Happens:**
1. User makes many rapid requests
2. API quota exceeded
3. Server returns 429 status

**Error Flow:**
```
API returns: 429 "Rate limited"
         ↓
Backend returns:
  {
    "error": "Service busy due to high demand",
    "code": "RATE_LIMITED",
    "retry": true,
    "retryAfter": 60
  }
         ↓
Frontend shows: ⏳ Service Busy
    "You've made too many requests. Wait 60 seconds..."
         ↓
Enable [Try Again] button
    Shows countdown timer
         ↓
After 60s: Button becomes clickable again
```

**User Experience:**
```
⏳ Service Busy
You've made too many requests. Please wait 60 seconds 
and try again.

💡 Automatic retry available

[Try Again - 60s] [Search by City]
         ↓ (countdown every second)
[Try Again - 59s]
[Try Again - 58s]
         ...
[Try Again] (now clickable)
```

---

### Scenario 6: API Service Down

**What Happens:**
1. Weather API is temporarily down
2. All requests timeout or return 503
3. Error persists across retries

**Error Flow:**
```
Multiple timeouts detected
         ↓
Show: 🌐 Service Error
    "Unable to fetch weather data. 
     The service may be temporarily unavailable."
         ↓
Enable [Try Again] button
    Note: This will continue to fail until service recovers
    But user has full control over retry timing
         ↓
After 5-10 minutes of service recovery:
    Retry succeeds → Show weather
```

**User Experience:**
```
🌐 Service Error
Unable to fetch weather data. The service may be 
temporarily unavailable. Please try again.

💡 Click "Try Again" to retry (usually available in 5-10 min)

[Try Again] [Search by City]
```

---

### Scenario 7: Empty Input

**What Happens:**
1. User submits form with empty city field
2. Form validation catches it

**Error Flow:**
```
Form submit event
         ↓
Check: city.trim() is empty?
         ↓
Show inline error: "Please enter a city name"
    (don't show full error modal)
         ↓
Focus input field for immediate retry
```

**User Experience:**
```
City input field shows error state (red border)
Inline message: "⚠️ Please enter a city name."
Input field gets focus automatically
Ready for immediate retry
```

---

## Testing Error Scenarios

### 1. Testing Geolocation Permission Denial

**How to trigger:**
1. Open browser DevTools
2. Go to Application/Storage → Cookies
3. Find & clear any location permission records
4. Reload page
5. When prompted for location, click "Deny"

**Expected Result:**
```
✅ Shows: "🚫 Permission Denied"
✅ Shows city input form
✅ User can search by city name
✅ [Try Again] button allows retry with new permission
```

---

### 2. Testing Timeout

**How to trigger:**
1. Open browser DevTools → Network tab
2. Throttle: Very slow 3G (~2G speed)
3. Search for a city (will timeout in ~10s)

**Expected Result:**
```
✅ Shows loading spinner for ~10 seconds
✅ Timeout error appears: "⏱️ Connection Timeout"
✅ [Try Again] button shown
✅ No JavaScript errors in console
✅ App remains responsive
```

---

### 3. Testing Invalid City

**How to trigger:**
1. Type: "XyZ12345InvalidCity"
2. Click Search
3. Server rejects and returns 404

**Expected Result:**
```
✅ Backend validation runs
✅ Returns 404 with code: "CITY_NOT_FOUND"
✅ Frontend shows: "🔍 Location Not Found"
✅ Helpful suggestion: "Try searching for: London..."
✅ [Try Again] and [Search by City] buttons shown
```

---

### 4. Testing Empty Input

**How to trigger:**
1. Leave city input empty
2. Press Enter or click Search

**Expected Result:**
```
✅ Form validation prevents submission
✅ Inline error message appears: "Please enter a city name."
✅ Input field highlighted
✅ Input focus maintained
✅ No server request made
```

---

### 5. Testing Rate Limiting (Simulation)

**How to trigger:**
1. Rapidly click search button 5+ times (within 1 second)
2. Some requests will be rejected by API rate limiter

**Expected Result:**
```
✅ Multiple requests sent (frontend can't prevent)
✅ 4-5 succeed normally
✅ Next requests return 429 status
✅ Shows: "⏳ Service Busy"
✅ Suggests wait time: "Wait 60 seconds"
✅ [Try Again] button disabled until timer expires
```

---

### 6. Testing Network Offline

**How to trigger:**
1. Open DevTools → Network tab
2. Check "Offline" option
3. Try to search for a city

**Expected Result:**
```
✅ Request immediately fails (no network)
✅ Catch in network error handler
✅ Shows: "🌐 Connection Error"
✅ Message: "Please check your internet connection"
✅ [Try Again] button shown
```

---

### 7. Testing Browser without Geolocation

**How to trigger:**
1. If using older browser (IE, very old Firefox)
2. OR use private mode in some browsers
3. Page loads and tries geolocation

**Expected Result:**
```
✅ Check for navigator.geolocation returns false/undefined
✅ Shows: "🌐 Geolocation Not Supported"
✅ Skips permission prompt entirely
✅ Shows location input form
✅ User can search by city
```

---

## Error Code Reference

### Frontend Error Codes

```javascript
const ERROR_CODES = {
    // Geolocation errors
    GEO_PERMISSION_DENIED: 1,     // User denied location access
    GEO_UNAVAILABLE: 2,           // Device location unavailable
    GEO_TIMEOUT: 3,               // Location detection timeout
    GEO_NOT_SUPPORTED: 4,         // Browser doesn't support geolocation
    
    // Network errors
    NETWORK_TIMEOUT: 'TIMEOUT',
    NETWORK_OFFLINE: 'OFFLINE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    
    // API errors
    CITY_NOT_FOUND: 'CITY_NOT_FOUND',      // 404
    VALIDATION_ERROR: 'VALIDATION_ERROR',  // 400
    RATE_LIMITED: 'RATE_LIMITED',          // 429
    API_ERROR: 'API_ERROR',                // 503
    INTERNAL_ERROR: 'INTERNAL_ERROR'       // 500
};
```

### Backend Error Codes

```python
VALIDATION_ERROR       # Input validation failed
CITY_NOT_FOUND         # City doesn't exist
MISSING_PARAMETERS     # Required params missing
INVALID_REQUEST        # Malformed request
RATE_LIMITED           # API quota exceeded
TIMEOUT                # Request took too long
API_ERROR              # Generic API error
CONFIG_ERROR           # Missing configuration
INTERNAL_ERROR         # Unexpected error
```

---

## Best Practices

### For Developers

#### 1. Always Handle Errors Gracefully

❌ **Bad:**
```javascript
fetch('/api/weather', {...}).then(r => r.json()).then(d => use(d));
// If any step fails, user sees blank page or console error
```

✅ **Good:**
```javascript
try {
    const response = await fetch('/api/weather', {...});
    const data = await response.json();
    if (!data.success) {
        this.handleWeatherError(data, response.status);
        return;
    }
    this.showWeatherData(data.data);
} catch (error) {
    this.handleNetworkError(error);
}
```

---

#### 2. Provide Recovery Options

❌ **Bad:**
```javascript
// Show error and do nothing
showError("Error occurred");
```

✅ **Good:**
```javascript
// Show error with recovery options
showError(
    "🔍 Location Not Found",
    "City not found. Try a different spelling.",
    {
        retryable: true,
        suggestion: "Try: London, Paris, Tokyo"
    },
    true  // showRetryButton
);
```

---

#### 3. Use Descriptive Error Messages

❌ **Bad:**
```javascript
// Too vague
showError("Error", "Something went wrong");
```

✅ **Good:**
```javascript
// Specific and actionable
showError(
    "🔍 Location Not Found",
    "We couldn't find a city with that name. " +
    "Please check the spelling and try again."
);
```

---

#### 4. Log Errors for Debugging

```javascript
// Always log for debugging
console.error('API Error:', {
    endpoint: '/api/weather',
    status: response.status,
    error: data.error,
    code: data.code,
    timestamp: new Date().toISOString()
});
```

---

### For Users

#### 1. Read Error Messages Carefully

Error messages contain:
- **Title**: What went wrong (emoji helps identify type)
- **Message**: Why it happened
- **Suggestion**: What to do about it

#### 2. Follow Suggested Actions

- 🔍 City not found? → Check spelling
- 🚫 Permission denied? → Enable location in settings
- 🌐 Connection error? → Check internet
- ⏳ Service busy? → Wait and retry

#### 3. Use Recovery Buttons

- **[Try Again]** - Retry the last action
- **[Search by City]** - Switch to manual search

#### 4. Report Persistent Issues

If errors persist after retrying:
1. Screenshot the error message (includes error code)
2. Note the time and what you were doing
3. Report to support with this information

---

## Summary

The Weather Dashboard provides:

✅ **Comprehensive Error Handling**
- All error paths covered
- User never sees blank page or JavaScript error
- Clear explanations of what went wrong

✅ **Recovery Options**
- Retry buttons for transient errors
- Fallback paths (e.g., geolocation → manual search)
- Actionable suggestions

✅ **User-Friendly Feedback**
- Emojis for quick visual recognition
- Non-technical language
- Helpful recovery suggestions

✅ **Robust Architecture**
- Multiple layers of error catching
- Graceful degradation
- Detailed backend logging

✅ **Testing Support**
- Documented test procedures
- Error simulation examples
- Expected behavior listed

---

**Result:** Users always receive helpful feedback and have a clear path to recovery, while developers can quickly identify and fix issues.

