"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

type ThemeMode = "light" | "dark";

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export default function ThemeToggle() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("theme-mode");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    applyTheme(mode);
    window.localStorage.setItem("theme-mode", mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      onClick={toggleMode}
      role="switch"
      aria-checked={mode === "dark"}
      aria-label={language === "en" ? "Toggle dark mode" : "다크모드 토글"}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 sm:gap-2"
    >
      <span className="hidden text-[11px] sm:inline">{language === "en" ? "Dark mode" : "다크모드"}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          mode === "dark" ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            mode === "dark" ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
