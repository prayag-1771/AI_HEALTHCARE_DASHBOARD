"use client";

import { Bell, Search, RefreshCw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export default function Header({ onRefresh, isLoading, lastUpdated }: HeaderProps) {
  const { colors } = useTheme();

  return (
    <header className={cn(
      "flex items-center justify-between border-b px-8 py-4 transition-colors duration-300",
      colors.border, colors.headerBg
    )}>
      <div>
        <h2 className={cn("text-lg font-semibold", colors.textPrimary)}>Health Dashboard</h2>
        <p className={cn("text-xs", colors.textMuted)}>
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString()}`
            : "Waiting for data..."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className={cn("absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2", colors.textFaint)} />
          <input
            type="text"
            placeholder="Search..."
            className={cn(
              "h-9 w-56 rounded-xl border pl-9 pr-4 text-xs outline-none transition-all focus:ring-1",
              colors.inputBg, colors.inputBorder, colors.inputFocus, colors.inputText, "placeholder:" + colors.textFaint
            )}
          />
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:opacity-50",
            colors.cardBorder, colors.surface, colors.surfaceHover, colors.textMuted
          )}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>

        <button className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all",
          colors.cardBorder, colors.surface, colors.surfaceHover, colors.textMuted
        )}>
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            3
          </span>
        </button>

        <Badge variant="emerald" pulse>Live</Badge>
      </div>
    </header>
  );
}
