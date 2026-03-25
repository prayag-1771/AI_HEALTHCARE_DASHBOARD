"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ThemeName = "black" | "light";

interface ThemeColors {
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceHover: string;
  border: string;
  sidebar: string;
  headerBg: string;
  accent: string;
  accentGlow: string;
  gradientFrom: string;
  gradientTo: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  inputText: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  black: {
    bg: "bg-[#09090b]",
    bgSecondary: "bg-[#111113]",
    surface: "bg-[#18181b]",
    surfaceHover: "hover:bg-[#1f1f23]",
    border: "border-[#27272a]",
    sidebar: "bg-[#0c0c0e]",
    headerBg: "bg-[#0c0c0e]",
    accent: "text-blue-400",
    accentGlow: "shadow-blue-500/20",
    gradientFrom: "from-blue-500",
    gradientTo: "to-violet-600",
    cardBg: "bg-[#131316]",
    cardBorder: "border-[#27272a]",
    inputBg: "bg-[#18181b]",
    inputBorder: "border-[#3f3f46]",
    inputFocus: "focus:border-blue-500 focus:ring-blue-500/30",
    textPrimary: "text-white",
    textSecondary: "text-zinc-300",
    textMuted: "text-zinc-500",
    textFaint: "text-zinc-600",
    inputText: "text-white",
  },
  light: {
    bg: "bg-[#f5f5f5]",
    bgSecondary: "bg-white",
    surface: "bg-[#f0f0f0]",
    surfaceHover: "hover:bg-[#e5e5e5]",
    border: "border-[#e0e0e0]",
    sidebar: "bg-white",
    headerBg: "bg-white",
    accent: "text-blue-600",
    accentGlow: "shadow-blue-500/10",
    gradientFrom: "from-blue-500",
    gradientTo: "to-violet-600",
    cardBg: "bg-white",
    cardBorder: "border-[#e0e0e0]",
    inputBg: "bg-[#f5f5f5]",
    inputBorder: "border-[#d1d5db]",
    inputFocus: "focus:border-blue-500 focus:ring-blue-500/30",
    textPrimary: "text-gray-900",
    textSecondary: "text-gray-700",
    textMuted: "text-gray-500",
    textFaint: "text-gray-400",
    inputText: "text-gray-900",
  },
};

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "black",
  colors: themes.black,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("black");

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "black" ? "light" : "black"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
