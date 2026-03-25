"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { Brain, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Explanation } from "@/lib/types";

interface ExplanationPanelProps {
  explanations: Explanation[];
}

function getImpact(exp: Explanation): string {
  if (exp.impact) return exp.impact;
  if (exp.status === "warning") return "negative";
  return exp.status || "neutral";
}

export default function ExplanationPanel({ explanations }: ExplanationPanelProps) {
  const { colors } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || explanations.length === 0) return;
    gsap.fromTo(ref.current.querySelectorAll("[data-exp]"),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out", clearProps: "all" }
    );
  }, [explanations]);

  return (
    <div className={cn("rounded-2xl border p-5", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className={cn("h-4 w-4", colors.accent)} />
        <span className={cn("text-sm font-medium", colors.textPrimary)}>Why This Prediction</span>
      </div>

      <div ref={ref} className="space-y-2">
        {explanations.map((exp, i) => {
          const impact = getImpact(exp);
          return (
            <div key={i} data-exp className={cn("flex items-center gap-3 rounded-lg p-2.5", colors.surface)}>
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0", {
                "bg-red-500/10": impact === "negative",
                "bg-emerald-500/10": impact === "positive",
                "bg-zinc-500/10": impact === "neutral",
              })}>
                {impact === "negative" && <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />}
                {impact === "positive" && <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />}
                {impact === "neutral" && <Minus className="h-3.5 w-3.5 text-zinc-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium", colors.textSecondary)}>{exp.factor}</p>
                <p className={cn("text-[10px] truncate", colors.textMuted)}>
                  {exp.value ? `${exp.value} — ` : ""}{exp.detail}
                </p>
              </div>
              <span className={cn("text-[9px] font-bold uppercase flex-shrink-0", {
                "text-red-400": impact === "negative",
                "text-emerald-400": impact === "positive",
                "text-zinc-400": impact === "neutral",
              })}>
                {impact}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
