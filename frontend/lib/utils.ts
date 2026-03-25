import clsx, { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getRiskColor(risk: string) {
  switch (risk) {
    case "Normal":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" };
    case "Risk":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" };
    case "High Risk":
      return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" };
    default:
      return { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30", dot: "bg-zinc-400" };
  }
}

export function getVitalStatus(label: string, value: number): "normal" | "warning" | "critical" {
  switch (label) {
    case "Heart Rate":
      if (value > 100 || value < 50) return "critical";
      if (value > 90 || value < 60) return "warning";
      return "normal";
    case "SpO2":
      if (value < 90) return "critical";
      if (value < 95) return "warning";
      return "normal";
    case "Temperature":
      if (value > 38.5 || value < 35) return "critical";
      if (value > 37.5 || value < 35.5) return "warning";
      return "normal";
    default:
      return "normal";
  }
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
