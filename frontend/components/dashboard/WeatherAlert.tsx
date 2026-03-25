"use client";

import { CloudSnow, Sun, Droplets, CloudOff, Wind, Thermometer, MapPin } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { WeatherData } from "@/lib/types";

interface WeatherAlertProps {
  weather: WeatherData | string | null;
}

function getWeatherIcon(risk: string) {
  if (risk.includes("Cold") || risk.includes("hypothermia") || risk.includes("Snow")) return { icon: CloudSnow, color: "text-blue-400", bg: "bg-blue-500/10" };
  if (risk.includes("Heat") || risk.includes("heat") || risk.includes("dehydration")) return { icon: Sun, color: "text-orange-400", bg: "bg-orange-500/10" };
  if (risk.includes("Humid") || risk.includes("humid") || risk.includes("Wet")) return { icon: Droplets, color: "text-cyan-400", bg: "bg-cyan-500/10" };
  if (risk.includes("wind") || risk.includes("Wind")) return { icon: Wind, color: "text-violet-400", bg: "bg-violet-500/10" };
  if (risk.includes("air") || risk.includes("Air") || risk.includes("respiratory")) return { icon: CloudOff, color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { icon: CloudOff, color: "text-emerald-400", bg: "bg-emerald-500/10" };
}

export default function WeatherAlert({ weather }: WeatherAlertProps) {
  const { colors } = useTheme();
  if (!weather) return null;

  if (typeof weather === "string") {
    const info = getWeatherIcon(weather);
    return (
      <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${info.bg}`}>
            <info.icon className={`h-4 w-4 ${info.color}`} />
          </div>
          <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>Weather Risk</p>
        </div>
        <p className={cn("text-xs", colors.textMuted)}>{weather}</p>
      </div>
    );
  }

  const w = weather;
  const info = getWeatherIcon(w.risk);
  const hasRisk = !w.risk.includes("No weather");

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${info.bg}`}>
            <info.icon className={`h-4 w-4 ${info.color}`} />
          </div>
          <div>
            <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>Weather Context</p>
            <p className={`text-sm font-semibold ${hasRisk ? info.color : "text-emerald-400"}`}>
              {hasRisk ? w.risk : "No Risk"}
            </p>
          </div>
        </div>
        {w.city && (
          <div className="flex items-center gap-1">
            <MapPin className={cn("h-3 w-3", colors.textFaint)} />
            <span className={cn("text-[10px]", colors.textMuted)}>{w.city}</span>
          </div>
        )}
      </div>

      {w.detail && (
        <p className={cn("text-xs capitalize mb-3", colors.textSecondary)}>{w.detail}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {w.temp !== null && (
          <div className={cn("rounded-lg p-2 text-center", colors.surface)}>
            <Thermometer className={cn("h-3.5 w-3.5 mx-auto mb-1", colors.textFaint)} />
            <p className={cn("text-xs font-semibold", colors.textPrimary)}>{w.temp}°C</p>
            <p className={cn("text-[9px]", colors.textFaint)}>Temp</p>
          </div>
        )}
        {w.humidity !== null && (
          <div className={cn("rounded-lg p-2 text-center", colors.surface)}>
            <Droplets className={cn("h-3.5 w-3.5 mx-auto mb-1", colors.textFaint)} />
            <p className={cn("text-xs font-semibold", colors.textPrimary)}>{w.humidity}%</p>
            <p className={cn("text-[9px]", colors.textFaint)}>Humidity</p>
          </div>
        )}
        {w.wind_speed !== null && w.wind_speed !== undefined && (
          <div className={cn("rounded-lg p-2 text-center", colors.surface)}>
            <Wind className={cn("h-3.5 w-3.5 mx-auto mb-1", colors.textFaint)} />
            <p className={cn("text-xs font-semibold", colors.textPrimary)}>{w.wind_speed} m/s</p>
            <p className={cn("text-[9px]", colors.textFaint)}>Wind</p>
          </div>
        )}
      </div>

      {w.all_risks && w.all_risks.length > 1 && (
        <div className="mt-3 space-y-1">
          {w.all_risks.slice(1).map((r, i) => {
            const rInfo = getWeatherIcon(r);
            return (
              <div key={i} className="flex items-center gap-2">
                <rInfo.icon className={`h-3 w-3 ${rInfo.color}`} />
                <span className={cn("text-[10px]", colors.textMuted)}>{r}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
