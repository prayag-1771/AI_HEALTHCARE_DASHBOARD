"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Keyboard, Send } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { SensorData } from "@/lib/types";

interface ManualInputProps {
  onSubmit: (data: SensorData) => void;
}

export default function ManualInput({ onSubmit }: ManualInputProps) {
  const { colors } = useTheme();
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    hr: "75",
    spo2: "98",
    temp: "36.5",
    ecg: "normal" as "normal" | "abnormal",
    emotion: "normal" as "normal" | "stress",
  });

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current.querySelectorAll("[data-field]"),
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out", clearProps: "all" }
    );
  }, []);

  const handleSubmit = () => {
    onSubmit({
      hr: Number(form.hr),
      spo2: Number(form.spo2),
      temp: Number(form.temp),
      ecg: form.ecg,
      emotion: form.emotion,
      voice_sentiment: "normal",
    });
  };

  const inputClass = cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all focus:ring-1",
    colors.inputBg, colors.inputBorder, colors.inputFocus, colors.inputText
  );

  const selectClass = cn(
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all appearance-none cursor-pointer focus:ring-1",
    colors.inputBg, colors.inputBorder, colors.inputFocus, colors.inputText
  );

  return (
    <div ref={formRef} className={cn("rounded-2xl border p-6", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center gap-2 mb-4">
        <Keyboard className={cn("h-4 w-4", colors.accent)} />
        <span className={cn("text-sm font-medium", colors.textPrimary)}>Manual Input</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div data-field>
          <label className={cn("block text-[10px] font-medium uppercase tracking-wider mb-1", colors.textMuted)}>Heart Rate (bpm)</label>
          <input type="number" value={form.hr} onChange={(e) => setForm({ ...form, hr: e.target.value })} className={inputClass} />
        </div>
        <div data-field>
          <label className={cn("block text-[10px] font-medium uppercase tracking-wider mb-1", colors.textMuted)}>SpO2 (%)</label>
          <input type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} className={inputClass} />
        </div>
        <div data-field>
          <label className={cn("block text-[10px] font-medium uppercase tracking-wider mb-1", colors.textMuted)}>Temperature (°C)</label>
          <input type="number" step="0.1" value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} className={inputClass} />
        </div>
        <div data-field>
          <label className={cn("block text-[10px] font-medium uppercase tracking-wider mb-1", colors.textMuted)}>ECG</label>
          <select value={form.ecg} onChange={(e) => setForm({ ...form, ecg: e.target.value as "normal" | "abnormal" })} className={selectClass}>
            <option value="normal">Normal</option>
            <option value="abnormal">Abnormal</option>
          </select>
        </div>
        <div data-field>
          <label className={cn("block text-[10px] font-medium uppercase tracking-wider mb-1", colors.textMuted)}>Emotion</label>
          <select value={form.emotion} onChange={(e) => setForm({ ...form, emotion: e.target.value as "normal" | "stress" })} className={selectClass}>
            <option value="normal">Normal</option>
            <option value="stress">Stress</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className={cn("mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all bg-gradient-to-r hover:opacity-90", colors.gradientFrom, colors.gradientTo)}
      >
        <Send className="h-3.5 w-3.5" />
        Analyze
      </button>
    </div>
  );
}
