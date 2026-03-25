import time
import random
from db import get_db

CONDITION_TO_SYMPTOM = {
    "Fever": ["fever"],
    "Tachycardia": ["headache"],
    "Bradycardia": ["fatigue"],
    "Hypoxia": ["breathlessness", "cough"],
    "Hypothermia": ["fatigue"],
    "ECG Anomaly": ["headache"],
    "Stress": ["fatigue", "cough"],
}

ZONES = {
    "delhi": {"lat": (28.4, 28.9), "lon": (76.8, 77.4)},
    "mumbai": {"lat": (18.8, 19.3), "lon": (72.7, 73.1)},
    "bangalore": {"lat": (12.8, 13.2), "lon": (77.4, 77.8)},
    "kolkata": {"lat": (22.4, 22.7), "lon": (88.2, 88.5)},
    "chennai": {"lat": (12.9, 13.2), "lon": (80.1, 80.3)},
    "london": {"lat": (51.3, 51.7), "lon": (-0.5, 0.3)},
}

SYMPTOMS = ["cough", "fever", "fatigue", "headache", "breathlessness"]


def _get_zone(lat, lon):
    for name, z in ZONES.items():
        if z["lat"][0] <= lat <= z["lat"][1] and z["lon"][0] <= lon <= z["lon"][1]:
            return name
    return "default"


def record_prediction(conditions, lat=None, lon=None):
    if not conditions:
        return

    if lat is None or lon is None:
        lat, lon = 28.6139, 77.2090

    zone = _get_zone(lat, lon)

    symptoms_found = set()
    for condition in conditions:
        name = condition.get("name", "")
        mapped = CONDITION_TO_SYMPTOM.get(name, [])
        symptoms_found.update(mapped)

    if not symptoms_found:
        return

    doc = {
        "zone": zone,
        "symptoms": list(symptoms_found),
        "conditions": [c.get("name", "") for c in conditions],
        "lat": lat,
        "lon": lon,
        "timestamp": int(time.time()),
    }

    db = get_db()
    if db is not None:
        db.community_reports.insert_one(doc)


def _compute_trend(db, zone, symptom):
    now = int(time.time())
    hour_ago = now - 3600
    two_hours_ago = now - 7200

    recent = db.community_reports.count_documents({
        "zone": zone,
        "symptoms": symptom,
        "timestamp": {"$gt": hour_ago},
    })

    older = db.community_reports.count_documents({
        "zone": zone,
        "symptoms": symptom,
        "timestamp": {"$gt": two_hours_ago, "$lte": hour_ago},
    })

    if older == 0 and recent == 0:
        return "stable", 0
    if older == 0:
        return ("rising", 100) if recent > 2 else ("stable", 0)

    pct = round((recent - older) / older * 100)
    if pct > 20:
        return "rising", pct
    elif pct < -20:
        return "falling", pct
    return "stable", pct


def get_community_signals(lat=None, lon=None):
    if lat is None or lon is None:
        lat, lon = 28.6139, 77.2090

    zone = _get_zone(lat, lon)
    db = get_db()

    base_noise = {
        "cough": random.randint(2, 6),
        "fever": random.randint(1, 4),
        "fatigue": random.randint(2, 5),
        "headache": random.randint(1, 3),
        "breathlessness": random.randint(0, 2),
    }

    if db is None:
        return {
            "zone": zone,
            "reports": base_noise,
            "total_reports": sum(base_noise.values()),
            "user_reports_24h": 0,
            "severity": "low",
            "trends": {s: {"direction": "stable", "change_pct": 0} for s in SYMPTOMS},
            "alert": None,
            "data_points": 0,
        }

    now = int(time.time())
    cutoff = now - 86400

    pipeline = [
        {"$match": {"zone": zone, "timestamp": {"$gt": cutoff}}},
        {"$unwind": "$symptoms"},
        {"$group": {"_id": "$symptoms", "count": {"$sum": 1}}},
    ]
    agg = list(db.community_reports.aggregate(pipeline))

    current = {s: base_noise.get(s, 0) for s in SYMPTOMS}
    for item in agg:
        sym = item["_id"]
        if sym in current:
            current[sym] += item["count"]

    user_reports = db.community_reports.count_documents({
        "zone": zone,
        "timestamp": {"$gt": cutoff},
    })

    trends = {}
    for s in SYMPTOMS:
        direction, pct = _compute_trend(db, zone, s)
        trends[s] = {"direction": direction, "change_pct": pct}

    total = sum(current.values())
    severity = "high" if total > 40 else "moderate" if total > 15 else "low"

    alert = None
    for s, t in trends.items():
        if t["direction"] == "rising" and t["change_pct"] > 30:
            alert = f"{s.capitalize()} reports rising sharply (+{t['change_pct']}%) in your area"
            break

    return {
        "zone": zone,
        "reports": current,
        "total_reports": total,
        "user_reports_24h": user_reports,
        "severity": severity,
        "trends": trends,
        "alert": alert,
        "data_points": user_reports,
    }
