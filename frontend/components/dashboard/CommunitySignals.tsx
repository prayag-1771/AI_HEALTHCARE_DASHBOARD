"use client";

import { Users, ThermometerSun, Stethoscope, Battery, Brain, Wind, TrendingUp, TrendingDown, Minus, MapPin, AlertTriangle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { CommunityData } from "@/lib/types";

interface CommunitySignalsProps {
  community: CommunityData | null;
}

const SYMPTOM_CONFIG: Record<string, { icon: typeof Stethoscope; color: string; barColor: string }> = {
  cough: { icon: Stethoscope, color: "text-amber-400", barColor: "bg-amber-500" },
  fever: { icon: ThermometerSun, color: "text-red-400", barColor: "bg-red-500" },
  fatigue: { icon: Battery, color: "text-violet-400", barColor: "bg-violet-500" },
  headache: { icon: Brain, color: "text-pink-400", barColor: "bg-pink-500" },
  breathlessness: { icon: Wind, color: "text-cyan-400", barColor: "bg-cyan-500" },
};

const FALLBACK = { icon: Stethoscope, color: "text-zinc-400", barColor: "bg-zinc-500" };

function TrendIcon({ direction }: { direction: string }) {
  if (direction === "rising") return <TrendingUp className="h-3 w-3 text-red-400" />;
  if (direction === "falling") return <TrendingDown className="h-3 w-3 text-emerald-400" />;
  return <Minus className="h-3 w-3 text-zinc-500" />;
}

export default function CommunitySignals({ community }: CommunitySignalsProps) {
  const { colors } = useTheme();
  if (!community) return null;

  const reports = community.reports || { cough: community.cough || 0, fever: community.fever || 0, fatigue: community.fatigue || 0 };
  const trends = community.trends || {};
  const maxVal = Math.max(...Object.values(reports), 1);

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>Community Signals</p>
            <p className={cn("text-xs", colors.textMuted)}>Nearby symptom reports</p>
          </div>
        </div>
        {community.zone && community.zone !== "default" && (
          <div className="flex items-center gap-1">
            <MapPin className={cn("h-3 w-3", colors.textFaint)} />
            <span className={cn("text-[10px] capitalize", colors.textMuted)}>{community.zone}</span>
          </div>
        )}
      </div>

      {community.alert && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-300">{community.alert}</p>
        </div>
      )}

      {community.total_reports !== undefined && (
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("rounded-lg px-3 py-1.5", colors.surface)}>
            <p className={cn("text-lg font-bold", colors.textPrimary)}>{community.total_reports}</p>
            <p className={cn("text-[9px]", colors.textFaint)}>Total Reports</p>
          </div>
          {community.severity && (
            <div className={cn("rounded-lg px-3 py-1.5", colors.surface)}>
              <p className={cn("text-sm font-semibold capitalize", {
                "text-red-400": community.severity === "high",
                "text-amber-400": community.severity === "moderate",
                "text-emerald-400": community.severity === "low",
              })}>{community.severity}</p>
              <p className={cn("text-[9px]", colors.textFaint)}>Severity</p>
            </div>
          )}
          {community.data_points !== undefined && (
            <div className={cn("rounded-lg px-3 py-1.5", colors.surface)}>
              <p className={cn("text-sm font-semibold", colors.textPrimary)}>{community.data_points}</p>
              <p className={cn("text-[9px]", colors.textFaint)}>Samples</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(reports).map(([symptom, value]) => {
          const config = SYMPTOM_CONFIG[symptom] || FALLBACK;
          const trend = trends[symptom];
          return (
            <div key={symptom}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <config.icon className={`h-3 w-3 ${config.color}`} />
                  <span className={cn("text-xs capitalize", colors.textMuted)}>{symptom}</span>
                </div>
                <div className="flex items-center gap-2">
                  {trend && (
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={trend.direction} />
                      {trend.change_pct !== 0 && (
                        <span className={cn("text-[9px]", {
                          "text-red-400": trend.direction === "rising",
                          "text-emerald-400": trend.direction === "falling",
                          "text-zinc-500": trend.direction === "stable",
                        })}>
                          {trend.change_pct > 0 ? "+" : ""}{trend.change_pct}%
                        </span>
                      )}
                    </div>
                  )}
                  <span className={cn("text-xs font-semibold", colors.textSecondary)}>{value}</span>
                </div>
              </div>
              <div className={cn("h-1.5 w-full overflow-hidden rounded-full", colors.surface)}>
                <div
                  className={`h-full rounded-full ${config.barColor} transition-all duration-700`}
                  style={{ width: `${(value / maxVal) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
