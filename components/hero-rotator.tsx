"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    title: "프로필 기반 적합도 분석",
    body: "학교, GPA, 스킬, 자격증, 어학 점수를 조합해 직무 적합도를 계산합니다.",
    badge: "Matching",
  },
  {
    title: "현재 모집중 실공고 추천",
    body: "최초 1회 AI 웹 서칭으로 실공고를 찾고, 이후에는 캐시를 재사용합니다.",
    badge: "Live Jobs",
  },
  {
    title: "AI 커버레터 자동 생성",
    body: "이력서 텍스트와 직무 설명을 넣으면 지원서 초안을 생성하고 저장합니다.",
    badge: "Cover Letter",
  },
];

export default function HeroRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bento-card">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Auto Layer</p>

      <div className="mt-3 min-h-36 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="inline-block rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700">
          {slides[index].badge}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{slides[index].title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-700">{slides[index].body}</p>
      </div>

      <div className="mt-3 flex gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            onClick={() => setIndex(i)}
            className={`h-2 w-6 rounded-full transition-all ${i === index ? "bg-blue-600" : "bg-blue-200"}`}
            aria-label={`slide-${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
