"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Layers3,
  ScanSearch,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Swords,
  Workflow,
} from "lucide-react";
import { DashboardPreview } from "@/components/dashboard-preview";
import { AnimatedSection, MotionCard, StaggerItem, StaggeredGrid } from "@/components/motion-primitives";
import { useLanguage } from "@/components/language-provider";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";

const productMetrics = [
  {
    labelKo: "이력서",
    labelEn: "Resume",
    value: "86/100",
    helperKo: "핵심 근거 강화",
    helperEn: "Evidence density improved",
  },
  {
    labelKo: "면접",
    labelEn: "Interview",
    value: "72%",
    helperKo: "연습 기반 신호",
    helperEn: "Estimated practice signal",
  },
  {
    labelKo: "커리어 경로",
    labelEn: "Career Path",
    value: "Path A",
    helperKo: "빅테크 직접 경로",
    helperEn: "Big Tech direct",
  },
  {
    labelKo: "평판",
    labelEn: "Background",
    value: "91/100",
    helperKo: "채용 관점 정리",
    helperEn: "Clean recruiter view",
  },
];

const featureCards = [
  {
    href: "/interview/hiring-manager",
    icon: BriefcaseBusiness,
    titleKo: "채용 시뮬레이터",
    titleEn: "Hiring Simulator",
    bodyKo: "회사별 평가 태도로 답변 구조와 직무 적합도를 점검합니다.",
    bodyEn: "Practice against company-style evaluation lenses before the real loop.",
    metricKo: "엄격 평가",
    metricEn: "Strict mode",
  },
  {
    href: "/career-chess",
    icon: Swords,
    titleKo: "커리어 체스",
    titleEn: "Career Chess",
    bodyKo: "장기 경로의 리스크, 마일스톤, 스킬 갭을 비교합니다.",
    bodyEn: "Compare long-term paths and see milestones, gaps, and risk signals.",
    metricKo: "A/B/C 경로",
    metricEn: "A/B/C paths",
  },
  {
    href: "/background-check",
    icon: ScanSearch,
    titleKo: "평판 체크",
    titleEn: "Background Check",
    bodyKo: "직접 제공한 공개 콘텐츠에서 채용자가 볼 수 있는 신호를 정리합니다.",
    bodyEn: "Review what recruiters may notice from only the public content you provide.",
    metricKo: "정리 플랜",
    metricEn: "Cleanup plan",
  },
  {
    href: "/profile",
    icon: FileText,
    titleKo: "이력서 분석",
    titleEn: "Resume Analyzer",
    bodyKo: "프로필과 경험을 더 명확한 직무 준비도 신호로 바꿉니다.",
    bodyEn: "Turn raw profile details into a clearer role-readiness signal.",
    metricKo: "점수 맵",
    metricEn: "Score map",
  },
  {
    href: "/cover-letter",
    icon: Sparkles,
    titleKo: "자소서 생성",
    titleEn: "Cover Letter",
    bodyKo: "프로필과 공고 맥락을 반영한 지원 문서 초안을 만듭니다.",
    bodyEn: "Generate role-aware drafts grounded in your profile and job context.",
    metricKo: "AI 초안",
    metricEn: "AI draft",
  },
  {
    href: "/matching",
    icon: SearchCheck,
    titleKo: "매칭",
    titleEn: "Job Matching",
    bodyKo: "적합도, 경쟁도, 보완점 기준으로 공고 우선순위를 잡습니다.",
    bodyEn: "Prioritize live postings with fit, competition, and gap signals.",
    metricKo: "시장 적합도",
    metricEn: "Market fit",
  },
];

const storySteps = [
  {
    step: "01",
    titleKo: "신호 만들기",
    titleEn: "Build your signal",
    bodyKo: "프로필, 기술, 프로젝트, 목표 직무를 하나의 커리어 그래프로 정리합니다.",
    bodyEn: "Structure your profile, skills, projects, and target role into one career graph.",
  },
  {
    step: "02",
    titleKo: "압박 속 연습",
    titleEn: "Practice under pressure",
    bodyKo: "현실적인 면접과 채용 시뮬레이션으로 구조화된 피드백을 받습니다.",
    bodyEn: "Run realistic interview and hiring simulations with structured feedback.",
  },
  {
    step: "03",
    titleKo: "다음 수 선택",
    titleEn: "Choose the next move",
    bodyKo: "경로와 리스크를 비교하고 부족한 점을 주간 액션으로 바꿉니다.",
    bodyEn: "Simulate paths, compare risk levels, and turn gaps into weekly actions.",
  },
];

const trustSignals = [
  { ko: "면접 AI", en: "Interview AI" },
  { ko: "커리어 전략", en: "Career Strategy" },
  { ko: "채용 신호", en: "Recruiter Signal" },
];

const problemCards = [
  {
    titleKo: "신호가 흐림",
    titleEn: "No clear signal",
    bodyKo: "열심히 준비해도 채용자에게는 조각난 정보로 보일 수 있습니다.",
    bodyEn: "You do work, but recruiters see fragments.",
  },
  {
    titleKo: "연습이 가벼움",
    titleEn: "Practice feels fake",
    bodyKo: "일반 질문만으로는 실제 약점과 직무 적합도가 잘 드러나지 않습니다.",
    bodyEn: "Generic questions do not expose real weaknesses.",
  },
  {
    titleKo: "경로가 불안함",
    titleEn: "Paths are risky",
    bodyKo: "중요한 선택을 구조화된 비교 없이 결정하기 쉽습니다.",
    bodyEn: "Big decisions happen without structured tradeoffs.",
  },
];

const highlights = [
  {
    icon: BriefcaseBusiness,
    titleKo: "채용 시뮬레이터",
    titleEn: "Hiring Simulator",
    bodyKo: "실제 면접 전에 답변이 구조적이고 구체적이며 직무에 맞는지 확인합니다.",
    bodyEn: "Know whether your answer sounds structured, specific, and role-fit before the real interview.",
    href: "/interview/hiring-manager",
  },
  {
    icon: Swords,
    titleKo: "커리어 체스",
    titleEn: "Career Chess",
    bodyKo: "시간, 비용, 기회비용을 쓰기 전에 커리어 경로를 비교합니다.",
    bodyEn: "Compare career paths before you commit years of time, tuition, or opportunity cost.",
    href: "/career-chess",
  },
  {
    icon: ShieldCheck,
    titleKo: "평판 체크",
    titleEn: "Background Check",
    bodyKo: "첫인상을 만들기 전에 채용자가 볼 수 있는 리스크를 정리합니다.",
    bodyEn: "Clean up recruiter-visible risks before they shape the first impression.",
    href: "/background-check",
  },
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
                {isEn ? "Get hired smarter with AI." : "AI로 더 똑똑하게 취업하세요."}
              </h1>
              <p className="ko-friendly mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-strong)] sm:text-xl">
                {isEn
                  ? "Practice interviews, improve your resume, simulate career paths, and see what recruiters notice before they do."
                  : "면접을 연습하고, 이력서를 개선하고, 커리어 경로와 채용자가 볼 신호를 미리 확인하세요."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="primary-btn px-6 py-3 text-sm" href={isLoggedIn ? "/dashboard" : "/register"}>
                  {isEn ? "Start Free" : "무료 시작"}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link className="secondary-btn px-6 py-3 text-sm" href="/dashboard">
                  {isEn ? "View Demo" : "데모 보기"}
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

        <AnimatedSection className="mt-16 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="page-kicker">{isEn ? "The problem" : "문제"}</p>
            <h2 className="ko-friendly mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
              {isEn ? "Career prep is scattered, vague, and too late." : "취업 준비는 흩어져 있고, 모호하고, 피드백은 늦게 옵니다."}
            </h2>
          </div>
          <div className="responsive-card-grid">
            {problemCards.map((card, index) => (
              <MotionCard key={card.titleEn} delay={index * 0.05} className="content-card h-full p-6">
                <h3 className="ko-friendly text-base font-semibold text-[var(--foreground)]">{isEn ? card.titleEn : card.titleKo}</h3>
                <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted)]">{isEn ? card.bodyEn : card.bodyKo}</p>
              </MotionCard>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-16 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="page-kicker">{isEn ? "Product Preview" : "제품 미리보기"}</p>
            <h2 className="ko-friendly mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
              {isEn ? "One cockpit for every signal that gets you hired." : "합격에 필요한 모든 신호를 하나의 콕핏에서."}
            </h2>
            <p className="ko-friendly mt-5 text-base leading-7 text-[var(--muted)]">
              {isEn
                ? "PathMate turns profile data, interview answers, application drafts, career paths, and recruiter-view risks into a focused workflow."
                : "PathMate는 프로필, 면접 답변, 지원 문서, 커리어 경로, 채용 관점 리스크를 하나의 흐름으로 정리합니다."}
            </p>
          </div>
          <div className="grid gap-4">
            {productMetrics.map((metric, index) => (
              <MotionCard key={metric.labelEn} delay={index * 0.06} className="content-card p-5">
                <div className="flex items-center justify-between gap-5">
                  <div className="min-w-0">
                    <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{isEn ? metric.labelEn : metric.labelKo}</p>
                    <p className="ko-friendly mt-1 text-sm text-[var(--muted)]">{isEn ? metric.helperEn : metric.helperKo}</p>
                  </div>
                  <p className="shrink-0 text-3xl font-semibold text-[var(--foreground)]">{metric.value}</p>
                </div>
                <div className="signal-bar mt-4">
                  <div className="signal-fill" style={{ width: `${[86, 72, 64, 91][index]}%` }} />
                </div>
              </MotionCard>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="page-kicker">{isEn ? "Feature Showcase" : "기능 소개"}</p>
              <h2 className="ko-friendly mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                {isEn ? "Six tools. One hiring system." : "여섯 가지 도구, 하나의 취업 시스템."}
              </h2>
            </div>
            <Link href="/dashboard" className="secondary-btn px-5 py-3 text-sm">{isEn ? "Open Cockpit" : "콕핏 열기"}</Link>
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
              <div key={item.step} className="content-card p-6">
                <span className="path-dot h-10 w-10 text-xs">{item.step}</span>
                <h3 className="ko-friendly mt-5 text-lg font-semibold text-[var(--foreground)]">{isEn ? item.titleEn : item.titleKo}</h3>
                <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted)]">{isEn ? item.bodyEn : item.bodyKo}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <section className="responsive-card-grid mt-16">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <MotionCard key={item.titleEn} delay={index * 0.07} className="highlight-card content-card h-full p-6">
                <Link href={item.href} className="block">
                  <Icon className="text-[var(--accent-2)]" size={24} aria-hidden="true" />
                  <h3 className="ko-friendly mt-5 text-2xl font-semibold text-[var(--foreground)]">{isEn ? item.titleEn : item.titleKo}</h3>
                  <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted)]">{isEn ? item.bodyEn : item.bodyKo}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-2)]">
                    {isEn ? "Explore" : "살펴보기"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              </MotionCard>
            );
          })}
        </section>

        <AnimatedSection className="mt-16 overflow-hidden rounded-[34px] border border-[var(--line)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_24%,transparent),color-mix(in_srgb,var(--accent-2)_12%,transparent),var(--surface))] p-8 text-center shadow-[var(--shadow)] sm:p-12">
          <Layers3 className="mx-auto text-[var(--accent-2)]" size={30} aria-hidden="true" />
          <h2 className="ko-friendly mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            {isEn ? "Start with the free cockpit. Upgrade when the stakes get real." : "무료 콕핏으로 시작하고, 중요한 순간에는 더 깊게 분석하세요."}
          </h2>
          <p className="ko-friendly mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--muted-strong)]">
            {isEn
              ? "Build your profile, run practice loops, and launch the premium career labs when you need sharper decisions."
              : "프로필을 만들고 연습 루프를 돌린 뒤, 더 날카로운 결정이 필요할 때 프리미엄 커리어 랩을 실행하세요."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={isLoggedIn ? "/dashboard" : "/register"} className="primary-btn px-6 py-3 text-sm">{isEn ? "Start Free" : "무료 시작"}</Link>
            <Link href="/matching" className="secondary-btn px-6 py-3 text-sm">{isEn ? "View Demo" : "데모 보기"}</Link>
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
                ["/matching", isEn ? "Matching" : "매칭"],
                ["/simulator", isEn ? "Interview" : "면접 연습"],
                ["/cover-letter", isEn ? "Cover Letter" : "자소서"],
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
