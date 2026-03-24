import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'model.pkl')

def _train_dummy_model():
    np.random.seed(42)
    n_samples = 1000
    features = ['hr', 'spo2', 'temp', 'ecg', 'emotion', 'voice_sentiment']
    X = []
    y = []

    for _ in range(n_samples):
        hr = np.random.normal(75, 15)
        spo2 = np.random.normal(98, 2)
        temp = np.random.normal(36.5, 0.5)
        ecg = np.random.choice([0, 1], p=[0.9, 0.1])
        emotion = np.random.choice([0, 1], p=[0.8, 0.2])
        voice = np.random.choice([0, 1], p=[0.8, 0.2])

        risk_score = 0
        if hr > 100: risk_score += 1
        if spo2 < 95: risk_score += 1
        if temp > 37.5: risk_score += 1
        if ecg == 1: risk_score += 1
        if emotion == 1: risk_score += 0.5
        if voice == 1: risk_score += 0.5

        if risk_score >= 2:
            risk = 2
        elif risk_score >= 1:
            risk = 1
        else:
            risk = 0

        X.append([hr, spo2, temp, ecg, emotion, voice])
        y.append(risk)

    X = np.array(X)
    y = np.array(y)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    return model

def get_ml_risk(data):
    if not os.path.exists(MODEL_PATH):
        model = _train_dummy_model()
    else:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)

    features = [
        data.get('hr', 75),
        data.get('spo2', 98),
        data.get('temp', 36.5),
        1 if data.get('ecg', 'normal') == 'abnormal' else 0,
        1 if data.get('emotion', 'normal') == 'stress' else 0,
        1 if data.get('voice_sentiment', 'normal') == 'stress' else 0
    ]

    proba = model.predict_proba([features])[0]

    risk_levels = ["Normal", "Risk", "High Risk"]
    predicted_class = np.argmax(proba)
    risk = risk_levels[predicted_class]
    confidence = proba[predicted_class]

    return {"risk": risk, "confidence": confidence}