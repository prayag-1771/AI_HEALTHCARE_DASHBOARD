import { SensorData, PredictionResponse, Condition, Explanation, Doctor, UserLocation } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function fetchPrediction(
  data: SensorData,
  location?: UserLocation | null
): Promise<PredictionResponse> {
  const payload: Record<string, unknown> = { ...data };
  if (location && location.status === "granted") {
    payload.lat = location.lat;
    payload.lon = location.lon;
  }
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return {
    ...json,
    conditions: json.conditions || generateConditions(data),
    explanations: json.explanations || generateExplanations(data),
  };
}

export function requestUserLocation(): Promise<UserLocation> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 0, lon: 0, status: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, status: "granted" }),
      () => resolve({ lat: 0, lon: 0, status: "denied" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// Static default sensor data — no randomness. Updated only by real user input.
export const DEFAULT_SENSOR_DATA: SensorData = {
  hr: 72,
  spo2: 97,
  temp: 36.6,
  ecg: "normal",
  emotion: "normal",
  voice_sentiment: "normal",
};

export function generateMockSensorData(): SensorData {
  return { ...DEFAULT_SENSOR_DATA };
}

function generateConditions(sensor: SensorData): Condition[] {
  const conditions: Condition[] = [];
  if (sensor.spo2 < 94) {
    conditions.push({ name: "Hypoxia", severity: sensor.spo2 < 90 ? "high" : "moderate", description: `SpO2 at ${sensor.spo2}% — below safe threshold` });
  }
  if (sensor.hr > 100) {
    conditions.push({ name: "Tachycardia", severity: sensor.hr > 120 ? "high" : "moderate", description: `Heart rate at ${sensor.hr} bpm — elevated` });
  }
  if (sensor.hr < 55) {
    conditions.push({ name: "Bradycardia", severity: sensor.hr < 45 ? "high" : "moderate", description: `Heart rate at ${sensor.hr} bpm — below normal` });
  }
  if (sensor.temp > 37.5) {
    conditions.push({ name: "Fever", severity: sensor.temp > 38.5 ? "high" : "moderate", description: `Temperature at ${sensor.temp}°C — elevated` });
  }
  if (sensor.emotion === "stress" || sensor.voice_sentiment === "stress") {
    conditions.push({ name: "Stress", severity: sensor.emotion === "stress" && sensor.voice_sentiment === "stress" ? "high" : "low", description: "Stress detected via multimodal analysis" });
  }
  if (sensor.ecg === "abnormal") {
    conditions.push({ name: "ECG Anomaly", severity: "high", description: "Abnormal ECG pattern detected" });
  }
  if (conditions.length === 0) {
    conditions.push({ name: "All Clear", severity: "low", description: "All vitals within normal range" });
  }
  return conditions;
}

function generateExplanations(sensor: SensorData): Explanation[] {
  const explanations: Explanation[] = [];
  explanations.push({
    factor: "Heart Rate",
    impact: sensor.hr > 100 || sensor.hr < 55 ? "negative" : "positive",
    detail: `${sensor.hr} bpm — ${sensor.hr > 100 ? "elevated, contributing to higher risk" : sensor.hr < 55 ? "low, flagged for review" : "within normal range"}`,
  });
  explanations.push({
    factor: "SpO2",
    impact: sensor.spo2 < 95 ? "negative" : "positive",
    detail: `${sensor.spo2}% — ${sensor.spo2 < 95 ? "below safe level, major risk factor" : "healthy oxygen saturation"}`,
  });
  explanations.push({
    factor: "Temperature",
    impact: sensor.temp > 37.5 ? "negative" : "positive",
    detail: `${sensor.temp}°C — ${sensor.temp > 37.5 ? "fever detected" : "normal body temperature"}`,
  });
  explanations.push({
    factor: "ECG",
    impact: sensor.ecg === "abnormal" ? "negative" : "positive",
    detail: sensor.ecg === "abnormal" ? "Abnormal pattern — significant risk factor" : "Normal sinus rhythm",
  });
  if (sensor.emotion === "stress") {
    explanations.push({ factor: "Emotion", impact: "negative", detail: "Facial stress detected — minor risk contributor" });
  }
  if (sensor.voice_sentiment === "stress") {
    explanations.push({ factor: "Voice", impact: "negative", detail: "Voice stress detected — minor risk contributor" });
  }
  return explanations;
}

export function generateMockPrediction(sensor: SensorData): PredictionResponse {
  let riskScore = 0;
  if (sensor.hr > 100) riskScore += 1;
  if (sensor.spo2 < 95) riskScore += 1;
  if (sensor.temp > 37.5) riskScore += 1;
  if (sensor.ecg === "abnormal") riskScore += 1;
  if (sensor.emotion === "stress") riskScore += 0.5;
  if (sensor.voice_sentiment === "stress") riskScore += 0.5;

  const risk: PredictionResponse["risk"] =
    riskScore < 1 ? "Normal" : riskScore < 2 ? "Risk" : "High Risk";

  const confidence = riskScore < 1 ? 0.92 : riskScore < 2 ? 0.78 : 0.85;

  const trend = riskScore < 1 ? "Stable" : riskScore < 2 ? "Monitoring" : "Declining";

  return {
    risk,
    confidence,
    trend,
    weather: {
      risk: "Low weather risk",
      all_risks: ["UV index moderate"],
      detail: "Conditions are mild with no significant health risks",
      temp: 28,
      humidity: 62,
      wind_speed: 8.5,
      condition: "Partly Cloudy",
      city: "Your Area",
    },
    community: {
      cough: 12,
      fever: 5,
      fatigue: 18,
      zone: "Local",
      total_reports: 35,
      severity: "low",
      trends: {
        cough: { direction: "stable", change_pct: 2 },
        fever: { direction: "falling", change_pct: -8 },
        fatigue: { direction: "rising", change_pct: 5 },
      },
      alert: null,
      data_points: 142,
    },
    conditions: generateConditions(sensor),
    explanations: generateExplanations(sensor),
  };
}

export function getMockDoctors(): Doctor[] {
  return [
    { name: "Dr. Sharma", specialty: "Cardiologist", distance: "1.2 km", rating: 4.8, available: true },
    { name: "Dr. Patel", specialty: "General Physician", distance: "0.8 km", rating: 4.5, available: true },
    { name: "Dr. Reddy", specialty: "Pulmonologist", distance: "2.5 km", rating: 4.9, available: false },
    { name: "Dr. Khan", specialty: "Internal Medicine", distance: "1.8 km", rating: 4.6, available: true },
  ];
}
