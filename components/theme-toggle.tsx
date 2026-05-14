"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "pathmate-theme";

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export default function ThemeToggle() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  });

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const toggleMode = () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
    applyTheme(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  };

  const isDark = mode === "dark";
  const label = language === "en" ? `Switch to ${isDark ? "light" : "dark"} mode` : `${isDark ? "라이트" : "다크"} 모드로 전환`;
  const Icon = isDark ? Moon : Sun;

  return (
    <button type="button" onClick={toggleMode} aria-label={label} title={label} className="secondary-btn px-3 py-2 text-xs">
      <Icon size={15} aria-hidden="true" />
      <span className="hidden sm:inline">{language === "en" ? (isDark ? "Dark" : "Light") : isDark ? "다크" : "라이트"}</span>
    </button>
  );
}
