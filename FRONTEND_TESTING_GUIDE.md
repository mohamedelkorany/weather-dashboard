# Frontend Testing & Demo Guide

## 🚀 Quick Start

### **1. Access the Dashboard**
```
http://localhost:8000
```

### **2. Get API Key Working**
```bash
# 1. Visit https://openweathermap.org/api
# 2. Sign up and get free API key
# 3. Update .env file:
OPENWEATHERMAP_API_KEY=your-real-api-key-here

# 4. Restart server:
# Ctrl+C to stop
python3 manage.py runserver 0.0.0.0:8000
```

### **3. Test in Browser**
1. Open http://localhost:8000
2. See "📍 Detecting your location..."
3. Browser asks for location permission
4. **Allow** → See weather for your location
5. **Deny** → See city input form

---

## 📱 What to Expect on Each Screen

### **Desktop (1024px+)**
```
┌─────────────────────────────────────┐
│  🌤️ Weather Dashboard              │
│  Real-time weather at your location │
├─────────────────────────────────────┤
│                                     │
│  ☁️ Temperature       Description   │
│     15°C              Clouds        │
│     Feels like 12°C                │
│                                     │
│  [Weather Detail Cards - 3-6 cols]  │
│  💧 75%  💨 18 km/h  🧭 SW         │
│  🌡️ 1013 👁️ 10.0km  ☁️ 80%        │
│                                     │
│  [Search Another Location --------] │
│                                     │
└─────────────────────────────────────┘
```

### **Mobile (375px)**
```
┌──────────────────┐
│ 🌤️ Weather      │
│ Dashboard        │
├──────────────────┤
│                  │
│ ☁️               │
│ 15°C             │
│ Clouds           │
│ Feels like 12°C  │
│                  │
│ [Detail Cards]   │
│ 💧 75%           │
│ 💨 18 km/h       │
│ [Search Btn]     │
│                  │
└──────────────────┘
```

---

## 🧪 Test Scenarios

### **Scenario 1: Happy Path (Auto-Detection)**
```
1. Open http://localhost:8000
2. See "📍 Detecting your location..."
3. Browser permission popup appears
4. Click "Allow"
5. See "📍 Location detected: 51.51°, -0.13°"
6. Spinner shows "Fetching weather data..."
7. Weather cards display (temperature, humidity, wind, etc.)
8. Footer shows: "Location detected automatically • Weather data for London"
```

**Expected Result:** ✅ Weather displays for auto-detected location

---

### **Scenario 2: Manual City Search**
```
1. Open http://localhost:8000
2. Browser permission popup appears
3. Click "Block" or ignore
4. See input form with placeholder "Enter city name..."
5. Type "Paris"
6. Click "Search" button
7. Spinner shows "Fetching weather data..."
8. Weather for Paris displays
9. Footer shows: "City searched manually • Weather data for Paris"
10. Click "Search Another Location"
11. Input form reappears
```

**Expected Result:** ✅ Manual city search works and can be repeated

---

### **Scenario 3: Error Handling**
```
1. Open city input form
2. Type "XYZNOTREAL" (fake city)
3. Click "Search"
4. Spinner shows
5. Error displays:
   Icon: ❌
   Title: 🔍 City Not Found
   Message: "We couldn't find a city with that name..."
6. Click "Try Again"
7. Retries or shows input form again
```

**Expected Result:** ✅ Friendly error message, can recover

---

### **Scenario 4: Responsive Design**
```
Desktop (1024px+):
- Weather cards in 3-6 column grid
- Lots of spacing
- Large temperatures

Tablet (768px):
- Weather cards in 2 columns
- Comfortable spacing

Mobile (375px):
- Weather cards in 1 column
- Form inputs stack
- Large touch targets
```

**Expected Result:** ✅ Layout adapts smoothly to all sizes

---

### **Scenario 5: Input Validation**
```
1. Open city input form
2. Leave field empty
3. Click "Search"
4. Should show error (not submit)
5. Type "L" (too short)
6. Click "Search"
7. Backend validates and may show error
8. Type "London" (valid)
9. Click "Search"
10. Should work
```

**Expected Result:** ✅ Input validation prevents bad requests

---

## 🔍 Testing with curl

### **Test 1: Valid City**
```bash
curl -X POST http://localhost:8000/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"London"}'
```

**Expected Response:**
```json
{
    "success": true,
    "data": {
        "name": "London",
        "main": { "temp": 15, "humidity": 75 },
        "weather": [{"main": "Clouds"}],
        ...
    }
}
```

### **Test 2: Invalid City**
```bash
curl -X POST http://localhost:8000/api/weather \
  -H "Content-Type: application/json" \
  -d '{"city":"XYZNOTREAL"}'
```

**Expected Response:**
```json
{
    "success": false,
    "error": "City not found"
}
```

### **Test 3: By Coordinates**
```bash
curl -X POST http://localhost:8000/api/weather \
  -H "Content-Type: application/json" \
  -d '{"latitude":51.5074,"longitude":-0.1278}'
```

**Expected Response:**
```json
{
    "success": true,
    "data": { ... }
}
```

### **Test 4: Missing API Key**
```bash
# If .env doesn't have real key:
# Result: {"success": false, "error": "Service is not properly configured"}
```

---

## 🎬 Visual Walkthrough

### **Step 1: Initial Load**
```
Shows: "📍 Detecting your location..."
Browser: Requests location permission
```

### **Step 2: Permission Allowed**
```
Shows: "📍 Location detected: 51.51°, -0.13°"
Action: Automatic API call with coordinates
```

### **Step 3: Loading**
```
Shows: Spinner + "Fetching weather data..."
Status: API call in progress
```

### **Step 4: Success**
```
Shows: 
- Location: "London, GB"
- Time: "Tuesday, December 23, 2025, 7:39 PM"
- Temperature: "15°C" with "☁️" emoji
- Condition: "Clouds"
- Details: 6 cards (humidity, wind, pressure, etc.)
- Footer: "Location detected automatically • Weather data for London"
```

### **Step 5: User Actions**
```
Available:
- "Search Another Location" button → Shows input form
- "Update location" link in footer → Shows input form
```

---

## 🎯 Feature Checklist

### **Geolocation Features**
- [ ] Browser permission request appears
- [ ] Allow → coordinates detected
- [ ] Deny → city input form shown
- [ ] Timeout → fallback to input
- [ ] Browser doesn't support → fallback to input

### **UI States**
- [ ] Detection status message
- [ ] Loading spinner
- [ ] Weather display
- [ ] Error message
- [ ] City input form

### **Weather Display**
- [ ] Location name + country
- [ ] Current date and time
- [ ] Temperature with emoji
- [ ] Weather description
- [ ] "Feels like" temperature
- [ ] Humidity percentage
- [ ] Wind speed (km/h)
- [ ] Wind direction (compass)
- [ ] Pressure (hPa)
- [ ] Visibility (km)
- [ ] Cloud coverage percentage

### **Error Handling**
- [ ] City not found → friendly message
- [ ] Network error → friendly message
- [ ] API error → friendly message
- [ ] Try Again button works
- [ ] Can fallback to manual entry

### **Responsive Design**
- [ ] Mobile (320px) - readable
- [ ] Tablet (768px) - good layout
- [ ] Desktop (1024px+) - full layout
- [ ] No horizontal scrolling
- [ ] Touch-friendly buttons

### **Accessibility**
- [ ] Keyboard navigation works
- [ ] Colors have contrast
- [ ] Focus states visible
- [ ] Form labels present
- [ ] Error messages clear

---

## 🐛 Common Issues & Solutions

### **Issue: "Service is not properly configured"**
```
Cause: API key not set or invalid
Solution: 
1. Get real API key from openweathermap.org
2. Update .env with real key
3. Restart server
```

### **Issue: Geolocation never asks**
```
Cause: Browser blocked it permanently
Solution:
1. Clear browser cache
2. Go to browser settings
3. Reset location permissions
4. Reload page
```

### **Issue: Styles don't load**
```
Cause: Static files not collected
Solution:
1. Run: python3 manage.py collectstatic
2. Restart server
3. Hard refresh browser (Ctrl+Shift+R)
```

### **Issue: Very slow responses**
```
Cause: API rate limit or network issue
Solution:
1. Check internet connection
2. Wait 5-10 minutes (rate limit reset)
3. Verify API key is valid
4. Check OpenWeatherMap status
```

### **Issue: JavaScript errors in console**
```
Cause: Various
Solution:
1. Open DevTools (F12)
2. Check Console tab for errors
3. Verify .env file has API key
4. Restart server
5. Clear browser cache
```

---

## 📊 Performance Testing

### **Load Time**
```bash
# Measure time to first weather display
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Allow location
5. Note time until weather appears
# Expected: 1-2 seconds total (including API call)
```

### **Mobile Performance**
```bash
# Test on mobile device or DevTools mobile mode
1. Open DevTools
2. Click device icon (mobile view)
3. Set throttling to 3G
4. Reload page
5. Monitor Network tab
# Expected: Still responsive, clear loading state
```

### **CSS/JS Size**
```bash
# Check file sizes in Network tab
styles.css: ~25-30 KB
main.js: ~15-20 KB
Total frontend: ~40-50 KB
Gzipped: ~12-15 KB
```

---

## 🎨 Visual Regression Testing

### **Check Color Accuracy**
- Header: Dark gray-blue (#2c3e50)
- Button: Bright blue (#3498db)
- Errors: Red text (#e74c3c)
- Background: Purple gradient
- Text: Dark for readability

### **Check Typography**
- Title: Large, bold, centered
- Description: Medium size, lighter
- Weather data: Readable sizes
- Labels: Small caps, gray
- Temperature: Extra large

### **Check Spacing**
- Generous gaps between sections
- Padding inside cards
- Margins around buttons
- Responsive spacing on mobile

### **Check Animations**
- Header emoji floats
- Cards slide down on load
- Spinner rotates
- Buttons have hover effects

---

## 📝 Test Report Template

```
Date: _______________
Tester: _______________
Browser: _______________
Device: _______________

✅ / ❌ / 🟡 Test Name
  - Expected: ___
  - Actual: ___
  - Notes: ___

Geolocation Tests:
✅ / ❌ Auto-detection works
✅ / ❌ Permission request appears
✅ / ❌ Deny fallback works
✅ / ❌ Manual search works

UI Tests:
✅ / ❌ All states display correctly
✅ / ❌ Transitions smooth
✅ / ❌ Loading spinner shows

Data Tests:
✅ / ❌ Temperature displays
✅ / ❌ All weather cards populate
✅ / ❌ Units correct (°C, km/h, etc.)

Error Tests:
✅ / ❌ Invalid city shows error
✅ / ❌ Error message friendly
✅ / ❌ Try Again works
✅ / ❌ Can recover from error

Responsive Tests:
✅ / ❌ Mobile layout correct
✅ / ❌ Tablet layout correct
✅ / ❌ Desktop layout correct
✅ / ❌ No horizontal scroll

Overall: ✅ / ❌ PASSED / FAILED
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Get real API key from openweathermap.org
- [ ] Update .env with real API key
- [ ] Set DEBUG=False in production
- [ ] Set ALLOWED_HOSTS correctly
- [ ] Run collectstatic: `python3 manage.py collectstatic`
- [ ] Test on all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test with slow internet (3G throttling)
- [ ] Verify HTTPS is enabled
- [ ] Check error logs for any issues
- [ ] Monitor API usage (rate limits)
- [ ] Set up error tracking (Sentry, etc.)

---

**Happy Testing! 🎉**

The frontend is fully functional and ready for production use. Just need a valid API key to unlock the weather data.
