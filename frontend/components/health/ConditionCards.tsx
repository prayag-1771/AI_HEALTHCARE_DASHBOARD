"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Condition } from "@/lib/types";

interface ConditionCardsProps {
  conditions: Condition[];
}

const severityConfig: Record<string, { icon: typeof AlertOctagon; color: string; bg: string; border: string }> = {
  high: { icon: AlertOctagon, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  severe: { icon: AlertOctagon, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  moderate: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  mild: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  low: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

const fallbackConfig = { icon: Info, color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20" };

export default function ConditionCards({ conditions }: ConditionCardsProps) {
  const { colors } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || conditions.length === 0) return;
    gsap.fromTo(listRef.current.querySelectorAll("[data-condition]"),
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.3, stagger: 0.06, ease: "power2.out", clearProps: "all" }
    );
  }, [conditions]);

  if (conditions.length === 0) {
    return (
      <div className={cn("rounded-2xl border p-6 text-center", colors.cardBorder, colors.cardBg)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mx-auto mb-3">
          <Info className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-400">No Conditions Detected</p>
        <p className={cn("text-xs mt-1", colors.textMuted)}>All vitals within normal range</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className={cn("text-sm font-medium", colors.textPrimary)}>Detected Conditions</span>
        <span className={cn("ml-auto text-[10px] font-medium", colors.textMuted)}>{conditions.length} found</span>
      </div>

      <div ref={listRef} className="space-y-2">
        {conditions.map((condition, i) => {
          const config = severityConfig[condition.severity] || fallbackConfig;
          return (
            <div key={i} data-condition className={cn("flex items-start gap-3 rounded-xl border p-3", config.border, config.bg)}>
              <config.icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
              <div>
                <p className={cn("text-sm font-semibold", config.color)}>{condition.name}</p>
                <p className={cn("text-xs mt-0.5", colors.textMuted)}>{condition.description || condition.detail}</p>
              </div>
              <span className={cn("ml-auto flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", config.bg, config.color)}>
                {condition.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
