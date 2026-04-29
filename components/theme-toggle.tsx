"use client";

import { useEffect, useState } from "react";
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

  return (
    <button type="button" onClick={toggleMode} aria-label={label} title={label} className="secondary-btn px-3 py-2 text-xs">
      <span aria-hidden>{isDark ? "Moon" : "Sun"}</span>
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
