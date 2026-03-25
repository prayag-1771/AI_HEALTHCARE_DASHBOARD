"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressRing from "@/components/ui/ProgressRing";
import { PredictionResponse } from "@/lib/types";
import { getRiskColor, formatConfidence, cn } from "@/lib/utils";

interface RiskStatusProps {
  prediction: PredictionResponse | null;
}

function TrendIcon({ trend }: { trend: string }) {
  switch (trend) {
    case "Improving": return <TrendingUp className="h-3.5 w-3.5" />;
    case "Declining": return <TrendingDown className="h-3.5 w-3.5" />;
    default: return <Minus className="h-3.5 w-3.5" />;
  }
}

function riskGlow(risk: string): "emerald" | "amber" | "red" | "none" {
  switch (risk) {
    case "Normal": return "emerald";
    case "Risk": return "amber";
    case "High Risk": return "red";
    default: return "none";
  }
}

function ringColor(risk: string): string {
  switch (risk) {
    case "Normal": return "stroke-emerald-500";
    case "Risk": return "stroke-amber-500";
    case "High Risk": return "stroke-red-500";
    default: return "stroke-zinc-500";
  }
}

function badgeVariant(risk: string): "emerald" | "amber" | "red" | "zinc" {
  switch (risk) {
    case "Normal": return "emerald";
    case "Risk": return "amber";
    case "High Risk": return "red";
    default: return "zinc";
  }
}

export default function RiskStatus({ prediction }: RiskStatusProps) {
  const { colors } = useTheme();
  const ringRef = useRef<HTMLDivElement>(null);
  const prevRisk = useRef<string | null>(null);

  useEffect(() => {
    if (!prediction || !ringRef.current || prediction.risk === prevRisk.current) return;
    prevRisk.current = prediction.risk;
    gsap.fromTo(ringRef.current, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: "back.out(1.7)", clearProps: "all" });
  }, [prediction]);

  if (!prediction) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="text-center">
          <Shield className={cn("mx-auto h-8 w-8", colors.textFaint)} />
          <p className={cn("mt-2 text-sm", colors.textMuted)}>Awaiting analysis...</p>
        </div>
      </Card>
    );
  }

  const riskColors = getRiskColor(prediction.risk);

  return (
    <Card glow={riskGlow(prediction.risk)} className="relative overflow-hidden h-full">
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={cn("h-4 w-4", riskColors.text)} />
            <span className={cn("text-xs font-medium", colors.textMuted)}>Risk Assessment</span>
          </div>
          <Badge variant={badgeVariant(prediction.risk)} pulse={prediction.risk === "High Risk"}>
            {prediction.risk}
          </Badge>
        </div>

        <div className="flex items-center gap-6">
          <div ref={ringRef}>
            <ProgressRing
              value={prediction.confidence * 100}
              size={100}
              strokeWidth={6}
              color={ringColor(prediction.risk)}
            >
              <div className="text-center">
                <p className={cn("text-xl font-bold", colors.textPrimary)}>
                  {formatConfidence(prediction.confidence)}
                </p>
                <p className={cn("text-[10px]", colors.textMuted)}>Confidence</p>
              </div>
            </ProgressRing>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>
                AI Fusion Result
              </p>
              <p className={`text-2xl font-bold ${riskColors.text}`}>
                {prediction.risk}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs", {
                "bg-emerald-500/10 text-emerald-400": prediction.trend === "Improving",
                "bg-red-500/10 text-red-400": prediction.trend === "Declining",
                "bg-zinc-500/10 text-zinc-400": prediction.trend === "Stable",
              })}>
                <TrendIcon trend={prediction.trend} />
                {prediction.trend}
              </div>
            </div>

            {prediction.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {prediction.conditions.slice(0, 3).map((c, i) => (
                  <span key={i} className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", {
                    "bg-red-500/10 text-red-400": c.severity === "high",
                    "bg-amber-500/10 text-amber-400": c.severity === "moderate",
                    "bg-blue-500/10 text-blue-400": c.severity === "low",
                  })}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
