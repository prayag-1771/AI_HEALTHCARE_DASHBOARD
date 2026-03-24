import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from engine.fusion_engine import get_fused_risk
from context.weather import get_weather_risk
from context.community import get_community_signals, record_prediction
from db import get_db


def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route('/predict', methods=['POST'])
    def predict():
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        required = ['hr', 'spo2', 'temp']
        for field in required:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        try:
            data['hr'] = float(data['hr'])
            data['spo2'] = float(data['spo2'])
            data['temp'] = float(data['temp'])
        except (ValueError, TypeError):
            return jsonify({"error": "hr, spo2, temp must be numbers"}), 400

        if not (20 <= data['hr'] <= 250):
            return jsonify({"error": "hr must be between 20 and 250"}), 400
        if not (50 <= data['spo2'] <= 100):
            return jsonify({"error": "spo2 must be between 50 and 100"}), 400
        if not (30 <= data['temp'] <= 45):
            return jsonify({"error": "temp must be between 30 and 45"}), 400

        if data.get('ecg') not in ('normal', 'abnormal', None):
            data['ecg'] = 'normal'
        if data.get('emotion') not in ('normal', 'stress', None):
            data['emotion'] = 'normal'
        if data.get('voice_sentiment') not in ('normal', 'stress', None):
            data['voice_sentiment'] = 'normal'

        try:
            risk_result = get_fused_risk(data)
        except Exception as e:
            return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

        lat = data.get("lat")
        lon = data.get("lon")

        risk_result["trend"] = _compute_trend_from_db(lat, lon)
        risk_result["weather"] = get_weather_risk(lat=lat, lon=lon)

        conditions = risk_result.get("conditions", [])
        if conditions:
            record_prediction(conditions, lat=lat, lon=lon)

        risk_result["community"] = get_community_signals(lat=lat, lon=lon)

        _store_prediction(data, risk_result, lat, lon)

        return jsonify(risk_result)

    @app.route('/history', methods=['GET'])
    def history():
        db = get_db()
        if db is None:
            return jsonify({"error": "Database not connected"}), 503

        limit = request.args.get("limit", 20, type=int)
        docs = list(db.predictions.find(
            {},
            {"_id": 0, "risk": 1, "confidence": 1, "hr": 1, "spo2": 1, "temp": 1, "timestamp": 1, "zone": 1}
        ).sort("timestamp", -1).limit(limit))

        return jsonify(docs)

    @app.route('/stats', methods=['GET'])
    def stats():
        db = get_db()
        if db is None:
            return jsonify({"error": "Database not connected"}), 503

        total = db.predictions.count_documents({})
        community_total = db.community_reports.count_documents({})

        pipeline = [
            {"$group": {"_id": "$risk", "count": {"$sum": 1}}}
        ]
        risk_counts = {doc["_id"]: doc["count"] for doc in db.predictions.aggregate(pipeline)}

        return jsonify({
            "total_predictions": total,
            "total_community_reports": community_total,
            "risk_breakdown": risk_counts,
        })

    @app.route('/health', methods=['GET'])
    def health():
        db = get_db()
        db_status = "connected" if db is not None else "disconnected"
        return jsonify({"status": "API running", "database": db_status})

    return app


def _store_prediction(data, result, lat, lon):
    db = get_db()
    if db is None:
        return

    doc = {
        "hr": data.get("hr"),
        "spo2": data.get("spo2"),
        "temp": data.get("temp"),
        "ecg": data.get("ecg", "normal"),
        "emotion": data.get("emotion", "normal"),
        "voice_sentiment": data.get("voice_sentiment", "normal"),
        "risk": result.get("risk"),
        "confidence": result.get("confidence"),
        "conditions": [c.get("name", "") for c in result.get("conditions", [])],
        "zone": result.get("community", {}).get("zone", "default"),
        "lat": lat,
        "lon": lon,
        "timestamp": int(time.time()),
    }

    db.predictions.insert_one(doc)


def _compute_trend_from_db(lat, lon):
    db = get_db()
    if db is None:
        return "Stable"

    docs = list(db.predictions.find(
        {},
        {"risk": 1, "_id": 0}
    ).sort("timestamp", -1).limit(5))

    if len(docs) < 3:
        return "Stable"

    risk_map = {"Normal": 0, "Risk": 1, "High Risk": 2}
    scores = [risk_map.get(d.get("risk", "Normal"), 0) for d in docs]

    diff = scores[0] - scores[-1]
    if diff > 0:
        return "Declining"
    elif diff < 0:
        return "Improving"
    return "Stable"


app = create_app()
