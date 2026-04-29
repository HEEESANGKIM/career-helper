"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, FileText, ScanSearch, SearchCheck, Sparkles, Swords } from "lucide-react";
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

type ReadinessResponse = {
  sourceNote: string;
  targetRole: string;
  overallScore: number;
  components: {
    skillMatch: number;
    resumeScore: number;
    interviewScore: number;
    portfolioScore: number;
    marketAlignment: number;
    backgroundScore: number;
  };
  strengths: string[];
  gaps: string[];
  recommendedNextAction: string;
  missingDataHints: string[];
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
    titleKo: "채용 시뮬레이터",
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
    titleKo: "커리어 체스",
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
    titleKo: "평판 체크",
    titleEn: "Background Check Preview",
    descriptionKo: "직접 제공한 공개 프로필 내용에서 위험 신호, 강점, 정리 체크리스트를 확인하세요.",
    descriptionEn: "Review risks, strengths, and cleanup tasks from only the public content you provide.",
    badge: "Premium" as const,
    ctaKo: "리포트 보기",
    ctaEn: "Preview report",
    icon: ScanSearch,
  },
];

const launcherFeatures = [
  { href: "/matching", titleKo: "매칭", titleEn: "Job Matching", icon: SearchCheck, badgeKo: "실공고", badgeEn: "Live jobs" },
  { href: "/simulator", titleKo: "면접 연습", titleEn: "Interview Drill", icon: BadgeCheck, badgeKo: "평가", badgeEn: "Evaluate" },
  { href: "/cover-letter", titleKo: "자소서 생성", titleEn: "Cover Letter", icon: Sparkles, badgeKo: "생성", badgeEn: "Generate" },
  { href: "/profile", titleKo: "프로필", titleEn: "Profile", icon: FileText, badgeKo: "신호", badgeEn: "Signal" },
  { href: "/interview/hiring-manager", titleKo: "채용 시뮬레이터", titleEn: "Hiring Simulator", icon: BriefcaseBusiness, badgeKo: "Premium", badgeEn: "Premium" },
  { href: "/career-chess", titleKo: "커리어 체스", titleEn: "Career Chess", icon: Swords, badgeKo: "전략", badgeEn: "Strategy" },
];

export default function DashboardPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [readinessInsight, setReadinessInsight] = useState<ReadinessResponse | null>(null);
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
      const readinessRes = await fetch("/api/evaluate/career-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language }),
      });
      const readinessJson = await readinessRes.json().catch(() => null);
      setLoading(false);

      if (!res.ok) {
        setMessage(json.error ?? (isEn ? "Failed to load dashboard insight." : "대시보드 인사이트를 불러오지 못했습니다."));
        return;
      }

      setInsight(json);
      if (readinessRes.ok) setReadinessInsight(readinessJson);
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

  const careerInsurance = useMemo(() => {
    if (!readinessInsight || !insight) return null;
    const components = readinessInsight.components;
    const targetDiversity = Math.min(100, 42 + insight.recommendedRoles.length * 14);
    const score = Math.round(
      components.skillMatch * 0.22 +
        components.interviewScore * 0.18 +
        components.portfolioScore * 0.18 +
        components.resumeScore * 0.14 +
        components.marketAlignment * 0.14 +
        components.backgroundScore * 0.08 +
        targetDiversity * 0.06,
    );
    const weak = [
      [isEn ? "Only one target path" : "목표 경로 다양성 부족", targetDiversity],
      [isEn ? "Interview readiness" : "면접 준비도", components.interviewScore],
      [isEn ? "Portfolio quality" : "포트폴리오 품질", components.portfolioScore],
      [isEn ? "Resume quality" : "이력서 품질", components.resumeScore],
      [isEn ? "Market alignment" : "시장 정렬도", components.marketAlignment],
    ]
      .filter(([, value]) => Number(value) < 68)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .slice(0, 3)
      .map(([label]) => String(label));
    const backupRoles = (insight.recommendedRoles.length ? insight.recommendedRoles : [isEn ? "Business Analyst" : "비즈니스 분석가", isEn ? "Operations Associate" : "운영 어소시에이트"])
      .filter((role) => role !== readinessInsight.targetRole)
      .slice(0, 3);
    return {
      score,
      label: score >= 76 ? (isEn ? "High resilience" : "높은 회복력") : score >= 55 ? (isEn ? "Medium resilience" : "보통 회복력") : (isEn ? "Low resilience" : "낮은 회복력"),
      weak: weak.length ? weak : [isEn ? "No major weak component" : "큰 약점 없음"],
      backupRoles,
    };
  }, [insight, isEn, readinessInsight]);

  const momentumScore = useMemo(() => {
    if (!readinessInsight || !insight) return null;
    const recentTrend = insight.trend.length >= 2 ? insight.trend[insight.trend.length - 1] - insight.trend[0] : 0;
    const delta = Math.max(-18, Math.min(24, Math.round((readinessInsight.overallScore - 60) / 4 + recentTrend / 8 + insight.weeklyReport.length)));
    const components = readinessInsight.components;
    const strongest = Object.entries(components).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "resumeScore";
    const weakest = Object.entries(components).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "interviewScore";
    const labelMap: Record<string, string> = {
      skillMatch: isEn ? "target-role skill match" : "목표 직무 스킬 매칭",
      resumeScore: isEn ? "resume quality" : "이력서 품질",
      interviewScore: isEn ? "interview practice" : "면접 연습",
      portfolioScore: isEn ? "portfolio evidence" : "포트폴리오 증거",
      marketAlignment: isEn ? "market alignment" : "시장 정렬도",
      backgroundScore: isEn ? "background readiness" : "평판 준비도",
    };
    return {
      delta,
      arrow: delta >= 0 ? "↑" : "↓",
      positive: labelMap[strongest],
      negative: labelMap[weakest],
    };
  }, [insight, isEn, readinessInsight]);

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
          <section className="mb-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <PagePanel className="overflow-hidden">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="page-kicker">{isEn ? "Welcome back" : "다시 시작하기"}</p>
                  <h2 className="ko-friendly mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                    {isEn ? `${insight.name}, your next move is ready.` : `${insight.name}님, 다음 액션이 준비됐습니다.`}
                  </h2>
                  <p className="ko-friendly mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    {isEn
                      ? "Review your readiness, launch the right AI lab, and turn weak signals into interview-ready proof."
                      : "준비도를 확인하고 필요한 AI 랩을 실행해서 약한 신호를 면접 가능한 증거로 바꾸세요."}
                  </p>
                </div>
                <Link href="/matching" className="primary-btn w-full px-5 py-3 text-sm sm:w-auto">
                  {isEn ? "Continue workflow" : "워크플로우 계속"}
                </Link>
              </div>
            </PagePanel>

            <PagePanel>
              <SectionTitle title={isEn ? "Recent Evaluations" : "최근 평가"} description={isEn ? "Quick status from your active practice loops." : "현재 연습 루프의 빠른 상태입니다."} />
              <div className="mt-5 grid gap-3">
                {[
                  [isEn ? "Interview answer" : "면접 답변", `${readiness}%`, isEn ? "Readiness signal" : "준비도 신호"],
                  [isEn ? "Recommended roles" : "추천 직종", `${insight.recommendedRoles.length}`, isEn ? "Active targets" : "활성 타깃"],
                  [isEn ? "Weekly tasks" : "주간 태스크", `${insight.weeklyReport.length}`, isEn ? "Open actions" : "대기 액션"],
                ].map(([label, value, helper]) => (
                  <div key={label} className="content-card flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{label}</p>
                      <p className="ko-friendly mt-1 text-xs leading-5 text-[var(--muted)]">{helper}</p>
                    </div>
                    <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
                  </div>
                ))}
              </div>
            </PagePanel>
          </section>

          {readinessInsight ? (
            <section className="mb-5">
              <PagePanel>
                <div className="grid gap-5 lg:grid-cols-[0.45fr_0.55fr]">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="score-ring" style={{ "--score": readinessInsight.overallScore } as CSSProperties}>
                      <div>
                        <p className="text-4xl font-semibold text-[var(--foreground)]">{readinessInsight.overallScore}</p>
                        <p className="ko-friendly mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{isEn ? "Career Readiness" : "커리어 준비도"}</p>
                      </div>
                    </div>
                    <p className="ko-friendly mt-4 text-sm leading-6 text-[var(--muted)]">{readinessInsight.sourceNote}</p>
                  </div>
                  <div>
                    <SectionTitle
                      title={isEn ? "Overall Career Readiness" : "종합 커리어 준비도"}
                      description={`${isEn ? "Target role" : "목표 직무"}: ${readinessInsight.targetRole}`}
                    />
                    <div className="responsive-card-grid mt-5">
                      {[
                        [isEn ? "Target Role Fit" : "직무 적합도", readinessInsight.components.skillMatch],
                        [isEn ? "Resume Readiness" : "이력서 준비도", readinessInsight.components.resumeScore],
                        [isEn ? "Interview Readiness" : "면접 준비도", readinessInsight.components.interviewScore],
                        [isEn ? "Portfolio Readiness" : "포트폴리오", readinessInsight.components.portfolioScore],
                        [isEn ? "Market Alignment" : "시장 정렬도", readinessInsight.components.marketAlignment],
                        [isEn ? "Background Score" : "평판 점수", readinessInsight.components.backgroundScore],
                      ].map(([label, value]) => (
                        <MetricTile key={String(label)} label={String(label)} value={`${value}/100`} />
                      ))}
                    </div>
                    <div className="readable-grid-2 mt-5">
                      <div className="content-card p-5">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Strengths" : "강점"}</p>
                        <ul className="ko-friendly mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
                          {readinessInsight.strengths.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="content-card p-5">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Gaps" : "보완점"}</p>
                        <ul className="ko-friendly mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
                          {readinessInsight.gaps.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                    <Notice className="ko-friendly mt-5"><strong>{isEn ? "Recommended Next Action" : "추천 다음 액션"}: </strong>{readinessInsight.recommendedNextAction}</Notice>
                    {readinessInsight.missingDataHints.length ? <Notice className="ko-friendly mt-3" tone="warning">{readinessInsight.missingDataHints.join(" ")}</Notice> : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href="/profile" className="secondary-btn px-4 py-2 text-sm">{isEn ? "Analyze Resume" : "이력서 분석"}</Link>
                      <Link href="/simulator" className="secondary-btn px-4 py-2 text-sm">{isEn ? "Practice Interview" : "면접 연습"}</Link>
                      <Link href="/career-chess" className="secondary-btn px-4 py-2 text-sm">{isEn ? "Run Career Chess" : "커리어 체스"}</Link>
                      <Link href="/background-check" className="secondary-btn px-4 py-2 text-sm">{isEn ? "Improve Background Check" : "평판 체크"}</Link>
                    </div>
                    {careerInsurance && momentumScore ? (
                      <div className="readable-grid-2 mt-5">
                        <div className="content-card p-5">
                          <div className="flex items-center gap-4">
                            <div className="score-ring h-24 w-24 shrink-0" style={{ "--score": careerInsurance.score } as CSSProperties}>
                              <div>
                                <p className="text-2xl font-semibold text-[var(--foreground)]">{careerInsurance.score}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{isEn ? "Insurance" : "보험"}</p>
                              </div>
                            </div>
                            <div>
                              <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{isEn ? "Career Insurance Score" : "커리어 보험 점수"}</p>
                              <p className="ko-friendly mt-1 text-sm leading-6 text-[var(--muted)]">{careerInsurance.label}</p>
                            </div>
                          </div>
                          <details className="mt-4">
                            <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-2)]">{isEn ? "View resilience detail" : "회복력 상세 보기"}</summary>
                            <div className="ko-friendly mt-3 grid gap-3 text-sm leading-6 text-[var(--muted)]">
                              <p><strong className="text-[var(--foreground)]">{isEn ? "Weakest components" : "약한 구성요소"}:</strong> {careerInsurance.weak.join(", ")}</p>
                              <p><strong className="text-[var(--foreground)]">{isEn ? "Backup roles" : "백업 직무"}:</strong> {careerInsurance.backupRoles.join(", ") || (isEn ? "Add more target roles" : "목표 직무를 더 추가하세요")}</p>
                            </div>
                          </details>
                        </div>
                        <div className="content-card p-5">
                          <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{isEn ? "Momentum Score" : "모멘텀 점수"}</p>
                          <div className="mt-4 flex items-end gap-3">
                            <p className={`text-5xl font-semibold ${momentumScore.delta >= 0 ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                              {momentumScore.arrow}{Math.abs(momentumScore.delta)}
                            </p>
                            <span className="mb-2 accent-pill px-3 py-1 text-xs font-semibold">{isEn ? "This month" : "이번 달"}</span>
                          </div>
                          <p className="ko-friendly mt-4 text-sm leading-6 text-[var(--muted)]">
                            {isEn ? `Driven by ${momentumScore.positive}. Watch ${momentumScore.negative}.` : `${momentumScore.positive}이 상승 요인입니다. ${momentumScore.negative}을 보완하세요.`}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </PagePanel>
            </section>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
            <PagePanel className="flex flex-col items-center justify-center text-center">
              <div className="score-ring" style={{ "--score": readiness } as CSSProperties}>
                <div>
                  <p className="text-4xl font-semibold text-[var(--foreground)]">{readiness}%</p>
                  <p className="ko-friendly mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{isEn ? "Path Score" : "경로 점수"}</p>
                </div>
              </div>
              <p className="ko-friendly mt-5 text-lg font-semibold text-[var(--foreground)]">{routeStatus}</p>
              <p className="ko-friendly mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                {isEn ? `${insight.name}, your preparation rank is currently top ${animatedPercent}%.` : `${insight.name}님의 현재 준비 랭크는 상위 ${animatedPercent}%입니다.`}
              </p>
            </PagePanel>

            <PagePanel>
              <SectionTitle title={isEn ? "Readiness Signal Map" : "준비도 신호 맵"} description={isEn ? "A compact view of profile signal, route momentum, and weekly proof." : "프로필 신호, 경로 추진력, 주간 증거를 압축해서 보여줍니다."} />
              <div className="responsive-card-grid mt-5">
                <MetricTile label={isEn ? "Profile" : "프로필"} value={`${insight.completeness}%`} helper={isEn ? "Signal completeness" : "신호 완성도"} />
                <MetricTile label={isEn ? "Route" : "경로"} value={`${readiness}%`} helper={isEn ? "Decision confidence" : "결정 신뢰도"} />
                <MetricTile label={isEn ? "Rank" : "순위"} value={`Top ${animatedPercent}%`} helper={isEn ? "Relative readiness" : "상대 준비도"} />
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
                    <p className="ko-friendly mt-4 text-sm font-semibold text-[var(--foreground)]">{isEn ? step.labelEn : step.labelKo}</p>
                    <p className="ko-friendly mt-1 text-xs font-semibold text-[var(--muted)]">{isEn ? step.titleEn : step.titleKo}</p>
                  </Link>
                ))}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5">
            <PagePanel>
              <SectionTitle title={isEn ? "Feature Launcher" : "기능 런처"} description={isEn ? "Jump into the next tool without losing context." : "현재 맥락을 유지한 채 다음 도구로 바로 이동하세요."} />
              <div className="responsive-card-grid mt-5">
                {launcherFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Link key={feature.href} href={feature.href} className="feature-glow-card content-card clickable-card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="accent-pill px-2.5 py-1 text-[11px] font-semibold">{isEn ? feature.badgeEn : feature.badgeKo}</span>
                      </div>
                      <p className="ko-friendly mt-4 text-sm font-semibold text-[var(--foreground)]">{isEn ? feature.titleEn : feature.titleKo}</p>
                    </Link>
                  );
                })}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5">
            <PagePanel>
              <SectionTitle
                title={isEn ? "Premium Career Labs" : "프리미엄 커리어 랩"}
                description={isEn ? "New evaluation tools for interview, strategy, and recruiter-readiness practice." : "면접, 커리어 전략, 채용 담당자 관점 점검을 위한 새로운 평가 도구입니다."}
              />
              <div className="responsive-card-grid mt-5">
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
                    <p className="ko-friendly text-sm leading-6 text-[var(--muted-strong)]">{line}</p>
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
                    <p className="ko-friendly text-sm leading-6 text-[var(--muted-strong)]">{signal}</p>
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


