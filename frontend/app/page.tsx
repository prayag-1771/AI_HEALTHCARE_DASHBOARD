"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  SensorData,
  PredictionResponse,
  HistoryPoint,
  InputMode,
  Alert,
  UserLocation,
  VoiceAnalysis,
  CommunityData,
  WeatherData,
} from "@/lib/types";
import {
  fetchPrediction,
  generateMockPrediction,
  DEFAULT_SENSOR_DATA,
  requestUserLocation,
} from "@/lib/api";

import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import RiskStatus from "@/components/dashboard/RiskStatus";
import VitalCards from "@/components/dashboard/VitalCards";
import RiskChart from "@/components/dashboard/RiskChart";
import WeatherAlert from "@/components/dashboard/WeatherAlert";
import CommunitySignals from "@/components/dashboard/CommunitySignals";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import ConditionCards from "@/components/health/ConditionCards";
import ExplanationPanel from "@/components/health/ExplanationPanel";
import TrendAnalysis from "@/components/health/TrendAnalysis";
import DoctorRecommendation from "@/components/health/DoctorRecommendation";
import ModeSwitch from "@/components/input/ModeSwitch";
import CameraInput from "@/components/input/CameraInput";
import VoiceInput from "@/components/input/VoiceInput";
import ManualInput from "@/components/input/ManualInput";

function Dashboard() {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sensorData, setSensorData] = useState<SensorData>({ ...DEFAULT_SENSOR_DATA });
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("finger");
  const [cameraActive, setCameraActive] = useState(false);

  const alertIdRef = useRef(0);

  // Request location on mount
  useEffect(() => {
    requestUserLocation().then(setLocation);
  }, []);

  // Generate initial prediction on mount
  useEffect(() => {
    const mock = generateMockPrediction(sensorData);
    setPrediction(mock);
    pushHistory(sensorData, mock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushHistory(sensor: SensorData, pred: PredictionResponse) {
    const riskMap = { Normal: 0, Risk: 1, "High Risk": 2 };
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          risk: riskMap[pred.risk] ?? 0,
          hr: sensor.hr,
          spo2: sensor.spo2,
          temp: sensor.temp,
        },
      ];
      return next.slice(-20);
    });
  }

  function pushAlert(type: Alert["type"], message: string) {
    alertIdRef.current += 1;
    const alert: Alert = {
      id: String(alertIdRef.current),
      type,
      message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 20));
  }

  const runPrediction = useCallback(
    async (data: SensorData) => {
      setSensorData(data);
      setIsLoading(true);
      try {
        const result = await fetchPrediction(data, location);
        setPrediction(result);
        pushHistory(data, result);
        setLastUpdated(new Date());

        if (result.risk === "High Risk") {
          pushAlert("critical", `High risk detected — confidence ${Math.round(result.confidence * 100)}%`);
        } else if (result.risk === "Risk") {
          pushAlert("warning", `Elevated risk detected — confidence ${Math.round(result.confidence * 100)}%`);
        }
      } catch {
        // Fallback to mock if backend is down
        const mock = generateMockPrediction(data);
        setPrediction(mock);
        pushHistory(data, mock);
        setLastUpdated(new Date());
        pushAlert("info", "Using local analysis — backend unavailable");
      } finally {
        setIsLoading(false);
      }
    },
    [location]
  );

  const handleRefresh = useCallback(() => {
    runPrediction(sensorData);
  }, [runPrediction, sensorData]);

  const handleHRDetected = useCallback(
    (hr: number) => {
      const updated = { ...sensorData, hr };
      runPrediction(updated);
      pushAlert("info", `Heart rate detected: ${hr} bpm`);
    },
    [sensorData, runPrediction]
  );

  const handleVoiceComplete = useCallback(
    (analysis: VoiceAnalysis) => {
      const updated: SensorData = {
        ...sensorData,
        emotion: analysis.emotion,
        voice_sentiment: analysis.voice_sentiment,
      };
      runPrediction(updated);
      pushAlert("info", `Voice analysis complete — mood: ${analysis.mood}, stress: ${analysis.stress_level}/10`);
    },
    [sensorData, runPrediction]
  );

  const handleManualSubmit = useCallback(
    (data: SensorData) => {
      runPrediction(data);
      pushAlert("info", "Manual vitals submitted");
    },
    [runPrediction]
  );

  // Derive weather/community from prediction
  const weather: WeatherData | string | null = prediction?.weather ?? null;
  const community: CommunityData | null = prediction?.community ?? null;
  const conditions = prediction?.conditions ?? [];
  const explanations = prediction?.explanations ?? [];
  const trend = prediction?.trend ?? "Stable";

  return (
    <div className={cn("flex min-h-screen", colors.bg)}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="ml-64 flex flex-1 flex-col">
        <Header onRefresh={handleRefresh} isLoading={isLoading} lastUpdated={lastUpdated} />

        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "dashboard" && (
            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <RiskStatus prediction={prediction} />
                </div>
                <div className="lg:col-span-2">
                  <VitalCards sensorData={sensorData} />
                </div>
              </div>

              <RiskChart history={history} />

              <div className="grid gap-6 lg:grid-cols-2">
                <ConditionCards conditions={conditions} />
                <ExplanationPanel explanations={explanations} />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <WeatherAlert weather={weather} />
                <CommunitySignals community={community} />
                <AlertsFeed alerts={alerts} />
              </div>
            </div>
          )}

          {activeTab === "input" && (
            <div className="grid gap-6">
              <ModeSwitch mode={inputMode} onModeChange={setInputMode} />

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  {(inputMode === "finger" || inputMode === "face") && (
                    <CameraInput
                      mode={inputMode}
                      onHRDetected={handleHRDetected}
                      isActive={cameraActive}
                      onToggle={() => setCameraActive((v) => !v)}
                    />
                  )}
                  {inputMode === "voice" && (
                    <VoiceInput onComplete={handleVoiceComplete} />
                  )}
                  {inputMode === "manual" && (
                    <ManualInput onSubmit={handleManualSubmit} />
                  )}
                </div>
                <div>
                  <RiskStatus prediction={prediction} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "vitals" && (
            <div className="grid gap-6">
              <VitalCards sensorData={sensorData} />
              <TrendAnalysis history={history} trend={trend} />
              <ConditionCards conditions={conditions} />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid gap-6">
              <RiskChart history={history} />
              <TrendAnalysis history={history} trend={trend} />
              <ExplanationPanel explanations={explanations} />
            </div>
          )}

          {activeTab === "community" && (
            <div className="grid gap-6">
              <CommunitySignals community={community} />
              <WeatherAlert weather={weather} />
              <DoctorRecommendation />
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="grid gap-6">
              <AlertsFeed alerts={alerts} />
              <DoctorRecommendation />
              <ConditionCards conditions={conditions} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  );
}
