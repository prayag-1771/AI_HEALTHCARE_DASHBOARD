"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { HistoryPoint } from "@/lib/types";

interface RiskChartProps {
  history: HistoryPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[#27272a] bg-[#131316] px-3 py-2 shadow-xl">
      <p className="mb-1 text-[10px] text-zinc-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.dataKey === "risk" ? "Risk Score" : entry.dataKey === "hr" ? "HR" : "SpO2"}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function RiskChart({ history }: RiskChartProps) {
  const { colors, theme } = useTheme();
  const gridColor = theme === "black" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const tickColor = theme === "black" ? "#71717a" : "#9ca3af";

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
          <Activity className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>Live Monitoring</p>
          <p className={cn("text-xs", colors.textMuted)}>Real-time risk and vitals</p>
        </div>
        <div className="ml-auto flex gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className={cn("text-[10px]", colors.textMuted)}>Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className={cn("text-[10px]", colors.textMuted)}>HR</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className={cn("text-[10px]", colors.textMuted)}>SpO2</span>
          </div>
        </div>
      </div>

      <div className="h-64" style={{ minWidth: 0, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: tickColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="risk" stroke="#3B82F6" strokeWidth={2} fill="url(#riskGrad)" />
            <Area type="monotone" dataKey="hr" stroke="#F43F5E" strokeWidth={1.5} fill="url(#hrGrad)" />
            <Area type="monotone" dataKey="spo2" stroke="#10B981" strokeWidth={1.5} fill="url(#spo2Grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
