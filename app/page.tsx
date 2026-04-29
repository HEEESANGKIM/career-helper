"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthControls from "@/components/auth-controls";
import HeroRotator from "@/components/hero-rotator";
import { useLanguage } from "@/components/language-provider";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";

const featureLinks = [
  { href: "/matching", labelKo: "채용 매칭", labelEn: "Matching", metric: "94%", detailKo: "공고 적합도", detailEn: "Fit signal" },
  { href: "/simulator", labelKo: "면접 시뮬레이터", labelEn: "Interview", metric: "Live", detailKo: "세션 연습", detailEn: "Session console" },
  { href: "/cover-letter", labelKo: "AI 커버레터", labelEn: "Cover Letter", metric: "Draft", detailKo: "문서 생성", detailEn: "Writing workspace" },
  { href: "/dashboard", labelKo: "대시보드", labelEn: "Dashboard", metric: "Top", detailKo: "준비 현황", detailEn: "Career cockpit" },
];

export default function Home() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }
    const client = supabase;

    let mounted = true;

    const checkSession = async () => {
      const session = await getSessionWithRetry(20, 120);
      if (!mounted) return;
      setIsLoggedIn(Boolean(session));
    };

    void checkSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="app-bg">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="surface-card reveal-up relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--accent)_24%,transparent)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--accent-2)_16%,transparent)] blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="page-kicker">Pathmate.ai Career Cockpit</p>
              <div className="mt-6">
                <HeroRotator mode="hero" />
              </div>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
                {isEn
                  ? "Plan your profile, job matching, AI documents, and interview practice from one premium workspace built for focused career preparation."
                  : "프로필, 채용 매칭, AI 문서 작성, 면접 연습을 하나의 프리미엄 커리어 워크스페이스에서 정리하세요."}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link className="primary-btn w-full px-5 py-3 text-center text-sm sm:w-auto" href={isLoggedIn ? "/dashboard" : "/profile"}>
                  {isEn ? (isLoggedIn ? "Open Dashboard" : "Build Career Profile") : (isLoggedIn ? "대시보드 열기" : "커리어 프로필 만들기")}
                </Link>
                <Link className="secondary-btn w-full px-5 py-3 text-center text-sm sm:w-auto" href="/matching">
                  {isEn ? "Open Matching Cockpit" : "매칭 콕핏 열기"}
                </Link>
                <Link className="secondary-btn w-full px-5 py-3 text-center text-sm sm:w-auto" href="/simulator">
                  {isEn ? "Start Interview Console" : "면접 콘솔 시작"}
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="chip">{isEn ? "Live posting intelligence" : "실공고 인텔리전스"}</span>
                <span className="chip">{isEn ? "AI writing workspace" : "AI 문서 워크스페이스"}</span>
                <span className="chip">{isEn ? "Session-based interview prep" : "세션형 면접 대비"}</span>
              </div>
            </div>

            <div className="content-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Readiness Index</p>
                  <p className="mt-2 text-5xl font-semibold tracking-tight text-[var(--foreground)]">82%</p>
                </div>
                <span className="accent-pill px-3 py-1 text-xs font-semibold">AI scored</span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                <div className="h-full w-[82%] rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {featureLinks.map((feature) => (
                  <Link key={feature.href} href={feature.href} className="content-card clickable-card p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? feature.labelEn : feature.labelKo}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <p className="text-2xl font-semibold text-[var(--foreground)]">{feature.metric}</p>
                      <p className="text-xs font-semibold text-[var(--muted)]">{isEn ? feature.detailEn : feature.detailKo}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.68fr_0.32fr]">
          <article className="bento-card p-6">
            <p className="page-kicker">{isEn ? "Execution System" : "실행 시스템"}</p>
            <h2 className="gradient-title mt-4 text-2xl font-semibold sm:text-3xl">
              {isEn ? "A focused workflow from profile signal to interview proof." : "프로필 신호부터 면접 증거까지 이어지는 집중 워크플로우"}
            </h2>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                [isEn ? "Profile Signal" : "프로필 신호", isEn ? "Structure education, skills, projects, and target roles." : "학력, 기술, 프로젝트, 목표 직무를 구조화합니다."],
                [isEn ? "Market Fit" : "시장 적합도", isEn ? "Prioritize live postings with fit and competition signals." : "적합도와 경쟁 신호로 실공고 우선순위를 잡습니다."],
                [isEn ? "Proof Loop" : "증거 루프", isEn ? "Turn drafts and interview answers into measurable proof." : "문서와 면접 답변을 측정 가능한 증거로 다듬습니다."],
              ].map(([title, body]) => (
                <div key={title} className="content-card p-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="bento-card p-6">
            <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Quick Launch" : "빠른 실행"}</p>
            <div className="mt-4 grid gap-2">
              <AuthControls variant="menu" />
              {featureLinks.map((feature) => (
                <Link key={feature.href} className="secondary-btn px-4 py-2.5 text-sm" href={feature.href}>
                  {isEn ? feature.labelEn : feature.labelKo}
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

