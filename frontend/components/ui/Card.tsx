"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "emerald" | "amber" | "red" | "blue" | "none";
}

export default function Card({ children, className, glow = "none" }: CardProps) {
  const { colors } = useTheme();

  const glowStyles = {
    emerald: "shadow-emerald-500/5 hover:shadow-emerald-500/10",
    amber: "shadow-amber-500/5 hover:shadow-amber-500/10",
    red: "shadow-red-500/5 hover:shadow-red-500/10",
    blue: "shadow-blue-500/5 hover:shadow-blue-500/10",
    none: "",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-lg transition-all duration-300",
        colors.cardBorder, colors.cardBg,
        glowStyles[glow],
        className
      )}
    >
      {children}
    </div>
  );
}
