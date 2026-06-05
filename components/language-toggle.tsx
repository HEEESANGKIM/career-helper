"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const isEn = language === "en";

  const toggleLanguage = () => {
    setLanguage(isEn ? "ko" : "en");
  };

  const label = isEn ? "Switch to Korean" : "한국어에서 영어로 전환";
  const currentLabel = isEn ? "English" : "한국어";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={label}
      title={label}
      className="secondary-btn px-3 py-2 text-xs"
    >
      <Languages size={15} aria-hidden="true" />
      <span className="hidden sm:inline">{currentLabel}</span>
    </button>
  );
}
