def get_rule_risk(data):
    risk_score = 0.0
    max_score = 4.0

    if data.get('hr', 0) > 100:
        risk_score += 1

    if data.get('spo2', 100) < 95:
        risk_score += 1

    if data.get('temp', 36.5) > 37.5:
        risk_score += 1

    if data.get('ecg', 'normal') == 'abnormal':
        risk_score += 1

    if data.get('emotion', 'normal') == 'stress':
        risk_score += 0.5

    if data.get('voice_sentiment', 'normal') == 'stress':
        risk_score += 0.5

    if risk_score >= 2:
        risk = "High Risk"
    elif risk_score >= 1:
        risk = "Risk"
    else:
        risk = "Normal"

    confidence = min(risk_score / max_score, 1.0) if max_score > 0 else 0.0

    return {"risk": risk, "confidence": confidence}