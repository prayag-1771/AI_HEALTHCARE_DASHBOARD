"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Activity,
  BarChart3,
  Bell,
  Heart,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  Scan,
  Moon,
  Sun,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "input", label: "Sensor Input", icon: Scan },
  { id: "vitals", label: "Vitals", icon: Heart },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "community", label: "Community", icon: Users },
  { id: "alerts", label: "Alerts", icon: Bell },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { theme, colors, toggleTheme } = useTheme();
  const sidebarRef = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || !sidebarRef.current) return;
    hasAnimated.current = true;

    const tl = gsap.timeline();
    tl.fromTo(sidebarRef.current, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "all" });
    tl.fromTo(sidebarRef.current.querySelectorAll("[data-nav-item]"),
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power2.out", clearProps: "all" },
      "-=0.2"
    );
  }, []);

  return (
    <aside ref={sidebarRef} className={cn(
      "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r transition-colors duration-300",
      colors.border, colors.sidebar
    )}>
      <div className="flex items-center gap-3 px-6 py-6" data-nav-item>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", colors.gradientFrom, colors.gradientTo, colors.accentGlow)}>
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className={cn("text-sm font-semibold", colors.textPrimary)}>AI Health</h1>
          <p className={cn("text-[11px]", colors.textMuted)}>Risk Monitor</p>
        </div>
      </div>

      <div className="mt-2 px-3">
        <p className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider", colors.textFaint)} data-nav-item>
          Menu
        </p>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              data-nav-item
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                activeTab === item.id
                  ? cn(colors.textPrimary, "shadow-sm", theme === "black" ? "bg-white/[0.08]" : "bg-blue-50")
                  : cn(colors.textMuted, colors.surfaceHover, theme === "black" ? "hover:text-zinc-300" : "hover:text-gray-700")
              )}
            >
              <item.icon className={cn("h-4 w-4", activeTab === item.id && colors.accent)} />
              {item.label}
              {item.id === "alerts" && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                  3
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto px-3 pb-4">
        <button
          data-nav-item
          onClick={toggleTheme}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            colors.textMuted, colors.surfaceHover, theme === "black" ? "hover:text-zinc-300" : "hover:text-gray-700"
          )}
        >
          {theme === "black" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "black" ? "Light Theme" : "Dark Theme"}
        </button>

        <button
          data-nav-item
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            activeTab === "settings"
              ? cn(colors.textPrimary, theme === "black" ? "bg-white/[0.08]" : "bg-blue-50")
              : cn(colors.textMuted, colors.surfaceHover, theme === "black" ? "hover:text-zinc-300" : "hover:text-gray-700")
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>

        <div className={cn("mt-4 flex items-center gap-3 rounded-xl border px-3 py-3", colors.cardBorder, colors.surface)} data-nav-item>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", colors.gradientFrom, colors.gradientTo)}>
            P
          </div>
          <div className="flex-1 overflow-hidden">
            <p className={cn("truncate text-xs font-medium", colors.textSecondary)}>Patient</p>
            <p className={cn("truncate text-[10px]", colors.textFaint)}>ID: #4829</p>
          </div>
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>
    </aside>
  );
}
