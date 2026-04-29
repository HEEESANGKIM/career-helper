"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ScanSearch, Swords } from "lucide-react";
import { PremiumFeatureCard } from "@/components/premium-feature-card";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type InsightResponse = {
  name: string;
  topPercent: number;
  completeness: number;
  trend: number[];
  recommendedRoles: string[];
  recommendedRoleSource: "openai" | "profile_fallback";
  signals: string[];
  weeklyReport: string[];
};

const workflow = [
  { href: "/profile", labelKo: "Profile", labelEn: "Profile", titleKo: "신호 정리", titleEn: "Signal setup" },
  { href: "/matching", labelKo: "Match", labelEn: "Match", titleKo: "경로 선택", titleEn: "Route choice" },
  { href: "/simulator", labelKo: "Practice", labelEn: "Practice", titleKo: "면접 훈련", titleEn: "Interview drill" },
  { href: "/cover-letter", labelKo: "Apply", labelEn: "Apply", titleKo: "지원 문서", titleEn: "Application docs" },
];

const premiumFeatures = [
  {
    href: "/interview/hiring-manager",
    titleKo: "취업 시뮬레이터",
    titleEn: "Hiring Manager Simulator",
    descriptionKo: "회사 스타일별 평가 관점으로 답변을 점검하고 다음 연습 질문을 받아보세요.",
    descriptionEn: "Practice with company-style evaluation lenses and structured answer feedback.",
    badge: "Premium" as const,
    ctaKo: "시뮬레이터 열기",
    ctaEn: "Open simulator",
    icon: BriefcaseBusiness,
  },
  {
    href: "/career-chess",
    titleKo: "Career Chess",
    titleEn: "Career Chess",
    descriptionKo: "빅테크, 스타트업, 대학원 경로를 한 번에 분석하고 선택 경로를 비교하세요.",
    descriptionEn: "Analyze big-tech, startup, and graduate-school paths in one strategic run.",
    badge: "New" as const,
    ctaKo: "경로 분석",
    ctaEn: "Simulate paths",
    icon: Swords,
  },
  {
    href: "/background-check",
    titleKo: "Background Check Preview",
    titleEn: "Background Check Preview",
    descriptionKo: "직접 제공한 공개 프로필 내용에서 위험 신호, 강점, 정리 체크리스트를 확인하세요.",
    descriptionEn: "Review risks, strengths, and cleanup tasks from only the public content you provide.",
    badge: "Premium" as const,
    ctaKo: "리포트 보기",
    ctaEn: "Preview report",
    icon: ScanSearch,
  },
];

export default function DashboardPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [animatedPercent, setAnimatedPercent] = useState(100);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage(isEn ? "Supabase environment variables are not configured. Check .env.local." : "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
        setLoading(false);
        return;
      }

      const session = await getSessionWithRetry();
      const token = session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`/api/dashboard-insight?language=${language}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMessage(json.error ?? (isEn ? "Failed to load dashboard insight." : "대시보드 인사이트를 불러오지 못했습니다."));
        return;
      }

      setInsight(json);
      setMessage("");
    };

    void load();
  }, [isEn, language]);

  useEffect(() => {
    if (!insight) return;
    const target = insight.topPercent;
    let current = 100;
    const timer = setInterval(() => {
      current -= 2;
      if (current <= target) {
        current = target;
        clearInterval(timer);
      }
      setAnimatedPercent(current);
    }, 24);
    return () => clearInterval(timer);
  }, [insight]);

  const readiness = insight ? Math.max(0, Math.min(100, 100 - insight.topPercent)) : 0;
  const routeStatus = useMemo(() => {
    if (!insight) return isEn ? "Awaiting signal" : "신호 대기 중";
    if (readiness >= 78) return isEn ? "Ready to apply" : "지원 준비 양호";
    if (readiness >= 54) return isEn ? "Build proof" : "증거 보강 필요";
    return isEn ? "Profile first" : "프로필 우선";
  }, [insight, isEn, readiness]);

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow="Career Cockpit"
        title={isEn ? "Your PathMate command center" : "PathMate 커리어 콕핏"}
        description={isEn ? "Track readiness, route priority, weekly actions, and next decisions from one focused cockpit." : "준비도, 경로 우선순위, 주간 액션, 다음 결정을 하나의 콕핏에서 확인하세요."}
        actions={
          <>
            <Link href="/matching" className="primary-btn px-5 py-3 text-sm">{isEn ? "Find route" : "지원 경로 찾기"}</Link>
            <Link href="/profile" className="secondary-btn px-5 py-3 text-sm">{isEn ? "Tune profile" : "프로필 조정"}</Link>
          </>
        }
      />

      {loading ? <Notice>{isEn ? "Calculating readiness signal..." : "Readiness Signal 계산 중..."}</Notice> : null}
      {message && !loading ? <Notice tone="warning">{message}</Notice> : null}

      {!loading && !message && insight ? (
        <>
          <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
            <PagePanel className="flex flex-col items-center justify-center text-center">
              <div className="score-ring" style={{ "--score": readiness } as CSSProperties}>
                <div>
                  <p className="text-4xl font-semibold text-[var(--foreground)]">{readiness}%</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Path Score</p>
                </div>
              </div>
              <p className="mt-5 text-lg font-semibold text-[var(--foreground)]">{routeStatus}</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                {isEn ? `${insight.name}, your preparation rank is currently top ${animatedPercent}%.` : `${insight.name}님의 현재 준비 랭크는 상위 ${animatedPercent}%입니다.`}
              </p>
            </PagePanel>

            <PagePanel>
              <SectionTitle title="Readiness Signal Map" description={isEn ? "A compact view of profile signal, route momentum, and weekly proof." : "프로필 신호, 경로 추진력, 주간 증거를 압축해서 보여줍니다."} />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricTile label="Profile" value={`${insight.completeness}%`} helper={isEn ? "Signal completeness" : "신호 완성도"} />
                <MetricTile label="Route" value={`${readiness}%`} helper={isEn ? "Decision confidence" : "결정 신뢰도"} />
                <MetricTile label="Rank" value={`Top ${animatedPercent}%`} helper={isEn ? "Relative readiness" : "상대 준비도"} />
              </div>
              <div className="content-card mt-5 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "AI-Recommended Roles" : "AI 추천 직종"}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {insight.recommendedRoleSource === "openai"
                        ? isEn ? "Generated from your profile and recent application context." : "프로필과 최근 지원서 맥락을 기반으로 생성했습니다."
                        : isEn ? "Estimated from your profile because AI generation was unavailable." : "AI 생성이 불가해 프로필 기반으로 추정했습니다."}
                    </p>
                  </div>
                  <span className="accent-pill w-fit px-3 py-1 text-xs font-semibold">
                    {insight.recommendedRoleSource === "openai" ? "AI" : isEn ? "Profile" : "프로필"}
                  </span>
                </div>
                {insight.recommendedRoles.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {insight.recommendedRoles.map((role) => (
                      <span key={role} className="chip">{role}</span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                    {isEn ? "Add a target role and skills in Profile to receive recommendations." : "프로필에 희망 직무와 기술스택을 입력하면 추천 직종이 표시됩니다."}
                  </p>
                )}
              </div>
              <div className="mt-5 space-y-3">
                {[
                  [isEn ? "Profile completeness" : "프로필 완성도", insight.completeness, "var(--accent-2)"],
                  [isEn ? "Application readiness" : "지원 준비도", readiness, "var(--success)"],
                  [isEn ? "Gap pressure" : "보완 압력", Math.max(8, 100 - readiness), "var(--warning)"],
                ].map(([label, value, color]) => (
                  <div key={String(label)}>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                      <span>{label}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="signal-bar">
                      <div className="h-full rounded-full" style={{ width: `${value}%`, background: String(color) }} />
                    </div>
                  </div>
                ))}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5">
            <PagePanel>
              <SectionTitle title={isEn ? "Route Workflow" : "경로 워크플로우"} description="Profile -> Match -> Practice -> Apply" />
              <div className="path-route mt-5">
                {workflow.map((step, index) => (
                  <Link key={step.href} href={step.href} className="path-step clickable-card">
                    <div className="path-dot">{index + 1}</div>
                    <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{isEn ? step.labelEn : step.labelKo}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{isEn ? step.titleEn : step.titleKo}</p>
                  </Link>
                ))}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5">
            <PagePanel>
              <SectionTitle
                title={isEn ? "Premium Career Labs" : "프리미엄 커리어 랩"}
                description={isEn ? "New evaluation tools for interview, strategy, and recruiter-readiness practice." : "면접, 커리어 전략, 채용 담당자 관점 점검을 위한 새로운 평가 도구입니다."}
              />
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {premiumFeatures.map((feature) => (
                  <PremiumFeatureCard
                    key={feature.href}
                    href={feature.href}
                    title={isEn ? feature.titleEn : feature.titleKo}
                    description={isEn ? feature.descriptionEn : feature.descriptionKo}
                    badge={feature.badge}
                    cta={isEn ? feature.ctaEn : feature.ctaKo}
                    icon={feature.icon}
                  />
                ))}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <PagePanel>
              <SectionTitle title={isEn ? "Weekly Navigation Tasks" : "주간 내비게이션 태스크"} />
              <div className="timeline-list mt-5">
                {insight.weeklyReport.map((line, index) => (
                  <div key={line} className="timeline-row">
                    <span className="timeline-marker" />
                    <p className="text-sm leading-6 text-[var(--muted-strong)]">{line}</p>
                    <span className="text-xs font-semibold text-[var(--muted)]">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </PagePanel>

            <PagePanel>
              <SectionTitle title={isEn ? "Decision Signals" : "결정 지원 신호"} />
              <div className="mt-5 grid gap-3">
                {insight.signals.map((signal) => (
                  <div key={signal} className="content-card p-4">
                    <p className="text-sm leading-6 text-[var(--muted-strong)]">{signal}</p>
                  </div>
                ))}
              </div>
            </PagePanel>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}


