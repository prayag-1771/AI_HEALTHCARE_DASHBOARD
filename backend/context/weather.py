import os
import urllib.request
import json
API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

_cache = {"data": None, "lat": None, "lon": None}


def _fetch_weather(lat, lon):
    if _cache["data"] and _cache["lat"] == lat and _cache["lon"] == lon:
        return _cache["data"]

    url = f"{BASE_URL}?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AIHealthDashboard/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        _cache.update({"data": data, "lat": lat, "lon": lon})
        return data
    except Exception:
        return None


def _map_to_health_risk(weather_data):
    if not weather_data:
        return {
            "risk": "No weather data",
            "detail": "Could not fetch weather information",
            "temp": None,
            "humidity": None,
            "condition": None,
            "city": None,
        }

    temp_c = weather_data.get("main", {}).get("temp", 25)
    humidity = weather_data.get("main", {}).get("humidity", 50)
    wind_speed = weather_data.get("wind", {}).get("speed", 0)
    condition = weather_data.get("weather", [{}])[0].get("main", "Clear")
    description = weather_data.get("weather", [{}])[0].get("description", "")
    city = weather_data.get("name", "Unknown")

    risks = []

    if temp_c < 5:
        risks.append("Severe cold — hypothermia and respiratory risk")
    elif temp_c < 15:
        risks.append("Cold weather — respiratory risk")

    if temp_c > 40:
        risks.append("Extreme heat — heatstroke danger")
    elif temp_c > 35:
        risks.append("High heat — dehydration risk")

    if humidity > 85:
        risks.append("High humidity — breathing difficulty risk")
    elif humidity > 70 and temp_c > 30:
        risks.append("Humid heat — heat exhaustion risk")

    if wind_speed > 15:
        risks.append("Strong winds — exposure risk")

    if condition in ("Rain", "Drizzle", "Thunderstorm"):
        risks.append("Wet conditions — slip and cold exposure risk")
    elif condition in ("Snow", "Blizzard"):
        risks.append("Snow/ice — hypothermia and injury risk")
    elif condition in ("Dust", "Sand", "Haze", "Smoke"):
        risks.append("Poor air quality — respiratory risk")

    return {
        "risk": risks[0] if risks else "No weather risk",
        "all_risks": risks,
        "detail": description,
        "temp": round(temp_c, 1),
        "humidity": humidity,
        "wind_speed": round(wind_speed, 1),
        "condition": condition,
        "city": city,
    }


def get_weather_risk(lat=None, lon=None):
    if lat is None or lon is None:
        lat, lon = 28.6139, 77.2090

    weather_data = _fetch_weather(lat, lon)
    return _map_to_health_risk(weather_data)
