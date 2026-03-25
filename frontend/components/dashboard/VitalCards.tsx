"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { Heart, Wind, Thermometer, Zap, Brain, Mic } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn, getVitalStatus } from "@/lib/utils";
import { SensorData } from "@/lib/types";

interface VitalCardsProps {
  sensorData: SensorData | null;
}

function StatusDot({ status }: { status: "normal" | "warning" | "critical" }) {
  return (
    <span className={cn("h-1.5 w-1.5 rounded-full", {
      "bg-emerald-400": status === "normal",
      "bg-amber-400": status === "warning",
      "bg-red-400 animate-pulse": status === "critical",
    })} />
  );
}

export default function VitalCards({ sensorData }: VitalCardsProps) {
  const { colors } = useTheme();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current || !sensorData) return;
    gsap.fromTo(gridRef.current.querySelectorAll("[data-vital]"),
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.04, ease: "power2.out", clearProps: "all" }
    );
  }, [sensorData]);

  if (!sensorData) return null;

  const vitals = [
    { label: "Heart Rate", value: sensorData.hr, unit: "bpm", icon: Heart, color: "text-rose-400", bgColor: "bg-rose-500/10", status: getVitalStatus("Heart Rate", sensorData.hr) },
    { label: "SpO2", value: sensorData.spo2, unit: "%", icon: Wind, color: "text-blue-400", bgColor: "bg-blue-500/10", status: getVitalStatus("SpO2", sensorData.spo2) },
    { label: "Temperature", value: sensorData.temp, unit: "°C", icon: Thermometer, color: "text-orange-400", bgColor: "bg-orange-500/10", status: getVitalStatus("Temperature", sensorData.temp) },
    { label: "ECG", value: sensorData.ecg === "normal" ? "Normal" : "Abnormal", unit: "", icon: Zap, color: sensorData.ecg === "normal" ? "text-emerald-400" : "text-red-400", bgColor: sensorData.ecg === "normal" ? "bg-emerald-500/10" : "bg-red-500/10", status: (sensorData.ecg === "normal" ? "normal" : "critical") as "normal" | "critical" },
    { label: "Emotion", value: sensorData.emotion === "normal" ? "Calm" : "Stressed", unit: "", icon: Brain, color: sensorData.emotion === "normal" ? "text-violet-400" : "text-amber-400", bgColor: sensorData.emotion === "normal" ? "bg-violet-500/10" : "bg-amber-500/10", status: (sensorData.emotion === "normal" ? "normal" : "warning") as "normal" | "warning" },
    { label: "Voice", value: sensorData.voice_sentiment === "normal" ? "Calm" : "Stressed", unit: "", icon: Mic, color: sensorData.voice_sentiment === "normal" ? "text-cyan-400" : "text-amber-400", bgColor: sensorData.voice_sentiment === "normal" ? "bg-cyan-500/10" : "bg-amber-500/10", status: (sensorData.voice_sentiment === "normal" ? "normal" : "warning") as "normal" | "warning" },
  ];

  return (
    <div ref={gridRef} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {vitals.map((vital) => (
        <div key={vital.label} data-vital className={cn(
          "rounded-2xl border p-4 transition-all duration-300",
          colors.cardBorder, colors.cardBg
        )}>
          <div className="flex items-start justify-between">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", vital.bgColor)}>
              <vital.icon className={cn("h-4 w-4", vital.color)} />
            </div>
            <StatusDot status={vital.status} />
          </div>
          <div className="mt-3">
            <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>{vital.label}</p>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className={cn("text-xl font-bold", colors.textPrimary)}>{vital.value}</span>
              {vital.unit && <span className={cn("text-xs", colors.textMuted)}>{vital.unit}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
