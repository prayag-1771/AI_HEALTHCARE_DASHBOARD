"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { HistoryPoint } from "@/lib/types";

interface TrendAnalysisProps {
  history: HistoryPoint[];
  trend: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#131316] px-3 py-2 shadow-xl">
      <p className="mb-1 text-[10px] text-zinc-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.dataKey === "hr" ? "HR" : entry.dataKey === "spo2" ? "SpO2" : "Temp"}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function TrendAnalysis({ history, trend }: TrendAnalysisProps) {
  const { colors, theme } = useTheme();
  const gridColor = theme === "black" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const tickColor = theme === "black" ? "#71717a" : "#9ca3af";

  const hrTrend = history.length >= 2
    ? history[history.length - 1].hr - history[history.length - 2].hr
    : 0;
  const spo2Trend = history.length >= 2
    ? history[history.length - 1].spo2 - history[history.length - 2].spo2
    : 0;

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {trend === "Improving" ? <TrendingUp className="h-4 w-4 text-emerald-400" /> :
           trend === "Declining" ? <TrendingDown className="h-4 w-4 text-red-400" /> :
           <Minus className={cn("h-4 w-4", colors.textMuted)} />}
          <span className={cn("text-sm font-medium", colors.textPrimary)}>Trend Analysis</span>
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", {
          "bg-emerald-500/10 text-emerald-400": trend === "Improving",
          "bg-red-500/10 text-red-400": trend === "Declining",
          "bg-zinc-500/10 text-zinc-400": trend === "Stable",
        })}>
          {trend}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={cn("rounded-lg p-2.5 text-center", colors.surface)}>
          <p className={cn("text-[10px]", colors.textMuted)}>HR Trend</p>
          <p className={cn("text-sm font-bold", hrTrend > 0 ? "text-red-400" : hrTrend < 0 ? "text-emerald-400" : colors.textMuted)}>
            {hrTrend > 0 ? "+" : ""}{hrTrend} bpm
          </p>
        </div>
        <div className={cn("rounded-lg p-2.5 text-center", colors.surface)}>
          <p className={cn("text-[10px]", colors.textMuted)}>SpO2 Trend</p>
          <p className={cn("text-sm font-bold", spo2Trend < 0 ? "text-red-400" : spo2Trend > 0 ? "text-emerald-400" : colors.textMuted)}>
            {spo2Trend > 0 ? "+" : ""}{spo2Trend}%
          </p>
        </div>
        <div className={cn("rounded-lg p-2.5 text-center", colors.surface)}>
          <p className={cn("text-[10px]", colors.textMuted)}>Samples</p>
          <p className={cn("text-sm font-bold", colors.textSecondary)}>{history.length}</p>
        </div>
      </div>

      <div className="h-48" style={{ minWidth: 0, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: tickColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={100} stroke="rgba(239,68,68,0.2)" strokeDasharray="3 3" />
            <ReferenceLine y={95} stroke="rgba(16,185,129,0.2)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="hr" stroke="#F43F5E" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="spo2" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
