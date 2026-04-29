"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

const slidesKo = [
  {
    title: "취업 준비를 감으로 하지 말고, 숫자로 끝내세요.",
    body: "프로필 데이터와 AI 분석으로 직무 핏과 합격 가능성을 한 화면에서 판단해, 선택의 속도와 정확도를 동시에 끌어올립니다.",
    badge: "Matching",
  },
  {
    title: "이미 지난공고는 끝. 실시간 공고만.",
    body: "열려 있는 채용 공고를 선별하고 내 스펙과의 간극까지 계산해, 액션 가능한 우선순위 리스트로 바로 정리합니다.",
    badge: "Live Signal",
  },
  {
    title: "이젠 자소서도 AI로 스마트하게.",
    body: "초안 생성부터 톤 재작성, 면접 대비 포인트까지 이어지는 플로우로 문서 퀄리티를 빠르게 실전 수준으로 맞춥니다.",
    badge: "Document Engine",
  },
];

const slidesEn = [
  {
    title: "Stop guessing your job prep. Track it with numbers.",
    body: "Use profile data and AI analysis to evaluate role fit and hiring potential in one place, with faster and more accurate decisions.",
    badge: "Matching",
  },
  {
    title: "Past postings are over. Only live jobs.",
    body: "Filter for open roles and calculate your skill gap instantly so you can act on a prioritized list right away.",
    badge: "Live Signal",
  },
  {
    title: "Cover letters are now smarter with AI.",
    body: "From first draft to tone rewrite and interview talking points, improve your documents quickly to a practical quality bar.",
    badge: "Document Engine",
  },
];

export default function HeroRotator({ mode = "card" }: { mode?: "card" | "hero" }) {
  const { language } = useLanguage();
  const [index, setIndex] = useState(0);
  const slides = language === "en" ? slidesEn : slidesKo;
  const slideCount = slides.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slideCount);
    }, 4000);

    return () => clearInterval(timer);
  }, [slideCount]);

  if (mode === "hero") {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] p-4 sm:p-5 md:p-6">
        <p className="inline-block rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-2)]">
          Auto Layer · {slides[index].badge}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-5xl">{slides[index].title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-strong)] md:text-base">{slides[index].body}</p>
        <div className="mt-4 flex gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.title}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-8 rounded-full transition-all ${i === index ? "bg-[var(--accent)]" : "bg-[color-mix(in_srgb,var(--accent)_24%,transparent)]"}`}
              aria-label={`slide-${i + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-2)]">Auto Layer Signal</p>
      <div className="mt-3 min-h-36 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] p-4">
        <p className="inline-block rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-2)]">
          {slides[index].badge}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{slides[index].title}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">{slides[index].body}</p>
      </div>

      <div className="mt-3 flex gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            onClick={() => setIndex(i)}
            className={`h-2 w-6 rounded-full transition-all ${i === index ? "bg-[var(--accent)]" : "bg-[color-mix(in_srgb,var(--accent)_24%,transparent)]"}`}
            aria-label={`slide-${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}


