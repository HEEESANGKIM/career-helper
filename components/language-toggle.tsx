"use client";

import { useLanguage } from "@/components/language-provider";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <label className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
      <span className="hidden text-[11px] sm:inline">Language</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as "ko" | "en")}
        className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 outline-none sm:text-[11px]"
        aria-label="Language"
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
