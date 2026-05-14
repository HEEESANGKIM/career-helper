"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, SearchCheck, Swords, Workflow } from "lucide-react";
import { DashboardPreview } from "@/components/dashboard-preview";
import { AnimatedSection, MotionCard, StaggerItem, StaggeredGrid } from "@/components/motion-primitives";
import { useLanguage } from "@/components/language-provider";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";

const featureCards = [
  {
    href: "/cover-letter",
    icon: FileText,
    titleKo: "Resume Lab",
    titleEn: "Resume Lab",
    bodyKo: "AI 피드백과 직무별 제안으로 이력서를 더 선명하게 개선합니다.",
    bodyEn: "Improve your resume with AI-powered feedback and role-specific suggestions.",
    metricKo: "AI 피드백",
    metricEn: "AI feedback",
  },
  {
    href: "/hiring-simulator",
    icon: BriefcaseBusiness,
    titleKo: "Hiring Simulator",
    titleEn: "Hiring Simulator",
    bodyKo: "지원서 스크리닝부터 AI 면접 피드백까지 전체 채용 여정을 연습합니다.",
    bodyEn: "Simulate the full hiring journey, from resume screening to AI interview feedback.",
    metricKo: "통합 연습",
    metricEn: "Full loop",
  },
  {
    href: "/next-move",
    icon: Swords,
    titleKo: "Next Move",
    titleEn: "Next Move",
    bodyKo: "커리어를 전략 보드처럼 비교하고 가장 좋은 다음 행동을 찾습니다.",
    bodyEn: "Plan your career like a strategy game and discover your best next move.",
    metricKo: "전략 보드",
    metricEn: "Strategy board",
  },
  {
    href: "/matching",
    icon: SearchCheck,
    titleKo: "Job Match",
    titleEn: "Job Match",
    bodyKo: "프로필, 스킬, 목표에 맞는 채용 공고를 우선순위화합니다.",
    bodyEn: "Find roles that match your profile, skills, and career goals.",
    metricKo: "채용 매칭",
    metricEn: "Role fit",
  },
];

const storySteps = [
  {
    step: "01",
    titleKo: "신호 만들기",
    titleEn: "Build your signal",
    bodyKo: "프로필, 기술, 프로젝트, 목표 직무를 하나의 준비도 신호로 정리합니다.",
    bodyEn: "Structure your profile, skills, projects, and target role into one readiness signal.",
  },
  {
    step: "02",
    titleKo: "채용 여정 연습",
    titleEn: "Practice the hiring loop",
    bodyKo: "면접 연습과 취업 시뮬레이션을 Hiring Simulator 안에서 한 번에 진행합니다.",
    bodyEn: "Use Hiring Simulator for application fit, interview rounds, answer feedback, and readiness reports.",
  },
  {
    step: "03",
    titleKo: "다음 선택 비교",
    titleEn: "Choose the next move",
    bodyKo: "Next Move에서 선택지의 리스크, 보상, 시간 비용, 장기 결과를 비교합니다.",
    bodyEn: "Compare risk, reward, effort, time cost, and long-term outcomes in Next Move.",
  },
];

const trustSignals = [
  { ko: "Resume Lab", en: "Resume Lab" },
  { ko: "Hiring Simulator", en: "Hiring Simulator" },
  { ko: "Next Move", en: "Next Move" },
];

export default function Home() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;
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
    <div className="app-bg overflow-hidden">
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="landing-hero relative min-h-[calc(100vh-6rem)] overflow-hidden rounded-[34px] border border-[var(--line)] px-5 py-10 shadow-[var(--shadow)] sm:px-8 lg:px-10">
          <div className="landing-aurora" aria-hidden="true" />
          <div className="relative grid min-h-[720px] gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="page-kicker">PathMate.ai</div>
              <h1 className="ko-friendly mt-7 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                {isEn ? "Get hired smarter with AI." : "AI로 더 전략적으로 취업을 준비하세요."}
              </h1>
              <p className="ko-friendly mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-strong)] sm:text-xl">
                {isEn
                  ? "Improve your resume, simulate the hiring journey, compare your next career moves, and find better-matched roles."
                  : "이력서를 개선하고, 채용 여정을 시뮬레이션하고, 다음 커리어 선택지를 비교하고, 더 잘 맞는 공고를 찾으세요."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="primary-btn px-6 py-3 text-sm" href={isLoggedIn ? "/dashboard" : "/register"}>
                  {isEn ? "Start Free" : "무료 시작"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link className="secondary-btn px-6 py-3 text-sm" href="/dashboard">
                  {isEn ? "View Dashboard" : "대시보드 보기"}
                </Link>
              </div>
              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                {trustSignals.map((item) => (
                  <div key={item.en} className="ko-friendly rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] p-3 text-sm font-semibold text-[var(--muted-strong)]">
                    <CheckCircle2 className="mb-2 text-[var(--accent-2)]" size={16} aria-hidden="true" />
                    {isEn ? item.en : item.ko}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:sticky lg:top-28">
              <DashboardPreview />
            </div>
          </div>
        </section>

        <AnimatedSection className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-kicker">{isEn ? "Core Workflow" : "핵심 워크플로우"}</p>
              <h2 className="ko-friendly mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                {isEn ? "Four tools. One hiring system." : "네 가지 도구, 하나의 취업 시스템."}
              </h2>
            </div>
            <Link href="/dashboard" className="secondary-btn px-5 py-3 text-sm">{isEn ? "Open Dashboard" : "대시보드 열기"}</Link>
          </div>
          <StaggeredGrid className="responsive-card-grid mt-8">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <StaggerItem key={feature.titleEn}>
                  <Link href={feature.href} className="feature-glow-card content-card clickable-card block h-full p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="accent-pill px-3 py-1 text-xs font-semibold">{isEn ? feature.metricEn : feature.metricKo}</span>
                    </div>
                    <h3 className="ko-friendly mt-5 text-lg font-semibold text-[var(--foreground)]">{isEn ? feature.titleEn : feature.titleKo}</h3>
                    <p className="ko-friendly mt-2 text-sm leading-6 text-[var(--muted)]">{isEn ? feature.bodyEn : feature.bodyKo}</p>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggeredGrid>
        </AnimatedSection>

        <AnimatedSection className="mt-16 rounded-[30px] border border-[var(--line)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent)_12%,transparent),var(--surface))] p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <p className="page-kicker">{isEn ? "How It Works" : "작동 방식"}</p>
          <div className="responsive-card-grid mt-7">
            {storySteps.map((item) => (
              <MotionCard key={item.step} className="content-card h-full p-6">
                <span className="path-dot h-10 w-10 text-xs">{item.step}</span>
                <h3 className="ko-friendly mt-5 text-lg font-semibold text-[var(--foreground)]">{isEn ? item.titleEn : item.titleKo}</h3>
                <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted)]">{isEn ? item.bodyEn : item.bodyKo}</p>
              </MotionCard>
            ))}
          </div>
        </AnimatedSection>

        <div className="mt-10 rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="ko-friendly inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-strong)]">
              <Workflow size={17} className="text-[var(--accent-2)]" aria-hidden="true" />
              {isEn ? "Quick launch" : "빠른 실행"}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["/dashboard", isEn ? "Dashboard" : "대시보드"],
                ["/cover-letter", isEn ? "Resume Lab" : "Resume Lab"],
                ["/hiring-simulator", isEn ? "Hiring Simulator" : "Hiring Simulator"],
                ["/next-move", isEn ? "Next Move" : "Next Move"],
                ["/matching", isEn ? "Job Match" : "Job Match"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="secondary-btn px-4 py-2 text-sm">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
