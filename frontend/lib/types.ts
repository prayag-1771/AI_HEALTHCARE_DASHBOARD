export interface SensorData {
  hr: number;
  spo2: number;
  temp: number;
  ecg: "normal" | "abnormal";
  emotion: "normal" | "stress";
  voice_sentiment: "normal" | "stress";
}

export interface CommunityData {
  cough?: number;
  fever?: number;
  fatigue?: number;
  zone?: string;
  reports?: Record<string, number>;
  total_reports?: number;
  severity?: "low" | "moderate" | "high";
  trends?: Record<string, { direction: "rising" | "falling" | "stable"; change_pct: number }>;
  alert?: string | null;
  data_points?: number;
}

export interface Condition {
  name: string;
  severity: "low" | "mild" | "moderate" | "high" | "severe" | string;
  description?: string;
  detail?: string;
}

export interface Explanation {
  factor: string;
  impact?: "positive" | "negative" | "neutral";
  status?: "positive" | "negative" | "warning" | "neutral";
  value?: string;
  detail: string;
}

export interface Doctor {
  name: string;
  specialty: string;
  distance: string;
  rating: number;
  available: boolean;
}

export interface WeatherData {
  risk: string;
  all_risks?: string[];
  detail: string;
  temp: number | null;
  humidity: number | null;
  wind_speed?: number | null;
  condition: string | null;
  city: string | null;
}

export interface UserLocation {
  lat: number;
  lon: number;
  status: "granted" | "denied" | "pending" | "unavailable";
}

export interface PredictionResponse {
  risk: "Normal" | "Risk" | "High Risk";
  confidence: number;
  trend: string;
  weather: WeatherData | string;
  community: CommunityData;
  conditions: Condition[];
  explanations: Explanation[];
}

export interface HistoryPoint {
  time: string;
  risk: number;
  hr: number;
  spo2: number;
  temp: number;
}

export type InputMode = "finger" | "face" | "voice" | "manual";

export interface VoiceAnalysis {
  answers: { question: string; transcript: string; keywords: string[] }[];
  mood: "positive" | "neutral" | "negative";
  stress_level: number;
  pain_detected: boolean;
  symptoms: string[];
  expression: {
    movement_score: number;
    avg_brightness: number;
    stress_indicator: number;
    dominant: "calm" | "tense" | "distressed" | "neutral";
  };
  voice_sentiment: "normal" | "stress";
  emotion: "normal" | "stress";
}

export interface Alert {
  id: string;
  type: "warning" | "critical" | "info" | "resolved";
  message: string;
  time: string;
}
