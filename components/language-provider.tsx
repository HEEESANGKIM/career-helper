"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type LanguageMode = "ko" | "en";

type LanguageContextValue = {
  language: LanguageMode;
  setLanguage: (language: LanguageMode) => void;
  languageReady: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "language-mode";

const detectLanguage = (): LanguageMode => {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "ko" || saved === "en") return saved;
  return "en";
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageMode>(detectLanguage);
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    const loadProfileLanguage = async () => {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (saved === "ko" || saved === "en") {
        setLanguageReady(true);
        return;
      }

      if (!supabase || !isSupabaseConfigured) {
        setLanguageReady(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setLanguageReady(true);
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("preferred_language")
        .eq("user_id", userId)
        .maybeSingle();

      if (data?.preferred_language === "ko" || data?.preferred_language === "en") {
        setLanguage(data.preferred_language);
      }
      setLanguageReady(true);
    };

    void loadProfileLanguage();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "ko" ? "ko" : "en";

    const saveProfileLanguage = async () => {
      if (!supabase || !isSupabaseConfigured) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      await supabase.from("user_profiles").upsert(
        {
          user_id: userId,
          preferred_language: language,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    void saveProfileLanguage();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, languageReady }), [language, languageReady]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
