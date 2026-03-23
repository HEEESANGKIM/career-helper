"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Locale = "ko" | "en";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  tx: (ko: string, en: string) => string;
};

const STORAGE_KEY = "career-helper-locale";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((prev) => (prev === "ko" ? "en" : "ko")),
      tx: (ko, en) => (locale === "ko" ? ko : en),
    }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <LanguageSwitcher />
    </LanguageContext.Provider>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, tx } = useLanguage();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-slate-300 bg-white/95 p-1 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          locale === "en" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
        aria-pressed={locale === "en"}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          locale === "ko" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
        aria-pressed={locale === "ko"}
      >
        한국어
      </button>
      <span className="sr-only">{tx("언어 변경", "Change language")}</span>
    </div>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
