"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "amber" | "red" | "blue" | "zinc";
  pulse?: boolean;
  className?: string;
}

export default function Badge({ children, variant = "zinc", pulse = false, className }: BadgeProps) {
  const variants = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", {
            "bg-emerald-400": variant === "emerald",
            "bg-amber-400": variant === "amber",
            "bg-red-400": variant === "red",
            "bg-blue-400": variant === "blue",
            "bg-zinc-400": variant === "zinc",
          })} />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", {
            "bg-emerald-400": variant === "emerald",
            "bg-amber-400": variant === "amber",
            "bg-red-400": variant === "red",
            "bg-blue-400": variant === "blue",
            "bg-zinc-400": variant === "zinc",
          })} />
        </span>
      )}
      {children}
    </span>
  );
}
