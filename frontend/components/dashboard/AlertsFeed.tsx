"use client";

import { AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Alert } from "@/lib/types";

interface AlertsFeedProps {
  alerts: Alert[];
}

const alertConfig = {
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-l-amber-500" },
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-l-red-500" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-l-blue-500" },
  resolved: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-l-emerald-500" },
};

export default function AlertsFeed({ alerts }: AlertsFeedProps) {
  const { colors } = useTheme();

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>Recent Alerts</p>
          <p className={cn("text-xs", colors.textMuted)}>{alerts.filter((a) => a.type === "critical" || a.type === "warning").length} active</p>
        </div>
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {alerts.map((alert) => {
          const config = alertConfig[alert.type];
          return (
            <div key={alert.id} className={cn("flex items-start gap-2.5 rounded-lg border-l-2 px-3 py-2.5", config.border, colors.surface)}>
              <div className={cn("mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded", config.bg)}>
                <config.icon className={cn("h-3 w-3", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs", colors.textSecondary)}>{alert.message}</p>
                <div className={cn("mt-1 flex items-center gap-1 text-[10px]", colors.textFaint)}>
                  <Clock className="h-2.5 w-2.5" />
                  {alert.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
