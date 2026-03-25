"use client";

import { Fingerprint, ScanFace, Mic, Keyboard } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { InputMode } from "@/lib/types";

interface ModeSwitchProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

const modes = [
  { id: "finger" as InputMode, label: "Finger PPG", sublabel: "Accurate", icon: Fingerprint, color: "text-rose-400", activeBg: "bg-rose-500/10 border-rose-500/20" },
  { id: "face" as InputMode, label: "Face Scan", sublabel: "Quick", icon: ScanFace, color: "text-violet-400", activeBg: "bg-violet-500/10 border-violet-500/20" },
  { id: "voice" as InputMode, label: "Voice", sublabel: "Talk + Face", icon: Mic, color: "text-amber-400", activeBg: "bg-amber-500/10 border-amber-500/20" },
  { id: "manual" as InputMode, label: "Manual", sublabel: "Input", icon: Keyboard, color: "text-cyan-400", activeBg: "bg-cyan-500/10 border-cyan-500/20" },
];

export default function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  const { colors } = useTheme();

  return (
    <div className={cn("rounded-2xl border p-4", colors.cardBorder, colors.cardBg)}>
      <p className={cn("text-[10px] font-medium uppercase tracking-wider mb-3", colors.textMuted)}>Input Mode</p>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 transition-all duration-200",
              mode === m.id ? m.activeBg : cn(colors.cardBorder, "bg-transparent", colors.surfaceHover)
            )}
          >
            <m.icon className={cn("h-5 w-5", mode === m.id ? m.color : colors.textFaint)} />
            <span className={cn("text-[11px] font-medium", mode === m.id ? colors.textPrimary : colors.textMuted)}>{m.label}</span>
            <span className={cn("text-[9px]", colors.textFaint)}>{m.sublabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
