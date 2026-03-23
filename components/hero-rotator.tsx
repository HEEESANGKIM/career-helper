"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

const slides = {
  ko: [
    {
      title: "취업 준비를 감으로 하지 말고, 숫자로 끝내세요.",
      body: "프로필 데이터와 AI 분석으로 직무 핏과 합격 가능성을 한 화면에서 판단해, 선택의 속도와 정확도를 동시에 끌어올립니다.",
      badge: "Matching",
    },
    {
      title: "실시간 공고만 골라서, 지금 지원할 것만 보여줍니다.",
      body: "열려 있는 채용 공고를 선별하고 내 스펙과의 간극까지 계산해, 액션 가능한 우선순위 리스트로 바로 정리합니다.",
      badge: "Live Signal",
    },
    {
      title: "이력서 한 번으로 자소서 품질을 끝까지 밀어 올립니다.",
      body: "초안 생성부터 톤 재작성, 면접 대비 포인트까지 이어지는 플로우로 문서 퀄리티를 빠르게 실전 수준으로 맞춥니다.",
      badge: "Document Engine",
    },
  ],
  en: [
    {
      title: "Stop guessing your job search, drive it with numbers.",
      body: "Use profile data and AI analysis to evaluate role fit and hiring potential in one place, so you can move faster with better decisions.",
      badge: "Matching",
    },
    {
      title: "See only live openings that matter right now.",
      body: "We filter active postings and calculate the gap against your profile, then turn them into an actionable priority list.",
      badge: "Live Signal",
    },
    {
      title: "Turn one resume into stronger cover letters.",
      body: "From first draft to tone rewrites and interview-focused points, refine documents quickly to a production-ready level.",
      badge: "Document Engine",
    },
  ],
} as const;

export default function HeroRotator({ mode = "card" }: { mode?: "card" | "hero" }) {
  const { locale, tx } = useLanguage();
  const localizedSlides = slides[locale];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % localizedSlides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [localizedSlides.length]);

  if (mode === "hero") {
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 md:p-6">
        <p className="inline-block rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">
          Auto Layer · {localizedSlides[index].badge}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">{localizedSlides[index].title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 md:text-base">{localizedSlides[index].body}</p>
        <div className="mt-4 flex gap-1.5">
          {localizedSlides.map((slide, i) => (
            <button
              key={slide.title}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-8 rounded-full transition-all ${i === index ? "bg-blue-600" : "bg-blue-200"}`}
              aria-label={tx(`슬라이드 ${i + 1}`, `Slide ${i + 1}`)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{tx("Auto Layer Signal", "Auto Layer Signal")}</p>
      <div className="mt-3 min-h-36 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="inline-block rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          {localizedSlides[index].badge}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{localizedSlides[index].title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-700">{localizedSlides[index].body}</p>
      </div>

      <div className="mt-3 flex gap-1.5">
        {localizedSlides.map((slide, i) => (
          <button
            key={slide.title}
            onClick={() => setIndex(i)}
            className={`h-2 w-6 rounded-full transition-all ${i === index ? "bg-blue-600" : "bg-blue-200"}`}
            aria-label={tx(`슬라이드 ${i + 1}`, `Slide ${i + 1}`)}
          />
        ))}
      </div>
    </div>
  );
}
