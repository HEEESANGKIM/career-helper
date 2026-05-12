"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, FileText, SearchCheck, Settings, Swords } from "lucide-react";
import { EmptyState, Notice, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type DashboardProfile = {
  full_name: string | null;
  school_name: string | null;
  major: string | null;
  gpa_score: number | null;
  gpa_scale: number | null;
  core_skills: string | null;
  tech_stack: string | null;
  internship_count: number | null;
  project_count: number | null;
  target_role: string | null;
  target_industry: string | null;
  preferred_location: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  experience_summary: string | null;
};

type ScoreKey = "profileCompleteness" | "marketReadiness" | "interviewReadiness" | "portfolioStrength";

type DashboardInsight = {
  name: string;
  topPercent: number;
  completeness: number;
  trend: number[];
  recommendedRoles: string[];
  weeklyReport: string[];
  benchmarkSize?: number;
  benchmarkScore?: number;
  benchmarkMedianScore?: number;
  confidenceLabel: string;
  explanation: string;
  scores: Record<ScoreKey, number>;
  penalties: Array<{ id: string; label: string; points: number }>;
};

const quickLaunch = [
  {
    href: "/hiring-simulator",
    titleKo: "채용 시뮬레이터",
    titleEn: "Hiring Simulator",
    descriptionKo: "지원서 스크리닝부터 AI 면접 피드백까지 한 번에 연습합니다.",
    descriptionEn: "Practice screening, interview, and feedback in one loop.",
    ctaKo: "시뮬레이션 시작",
    ctaEn: "Start Simulation",
    icon: BriefcaseBusiness,
  },
  {
    href: "/next-move",
    titleKo: "넥스트 무브",
    titleEn: "Next Move",
    descriptionKo: "커리어 선택지를 전략 게임처럼 비교합니다.",
    descriptionEn: "Compare career options like a strategy game.",
    ctaKo: "전략 보드 열기",
    ctaEn: "Open Board",
    icon: Swords,
  },
  {
    href: "/cover-letter",
    titleKo: "이력서 랩",
    titleEn: "Resume Lab",
    descriptionKo: "이력서와 자기소개서 신호를 AI 피드백으로 개선합니다.",
    descriptionEn: "Improve resume signal with AI feedback.",
    ctaKo: "이력서 검토",
    ctaEn: "Review Resume",
    icon: FileText,
  },
  {
    href: "/matching",
    titleKo: "채용 매칭",
    titleEn: "Job Match",
    descriptionKo: "프로필, 스킬, 목표에 맞는 역할을 탐색합니다.",
    descriptionEn: "Explore roles matched to your profile and goals.",
    ctaKo: "공고 탐색",
    ctaEn: "Explore Jobs",
    icon: SearchCheck,
  },
];

export default function DashboardPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = (ko: string, en: string) => (isEn ? en : ko);

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [insight, setInsight] = useState<DashboardInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
        setLoading(false);
        return;
      }

      const session = await getSessionWithRetry();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        window.location.href = "/login";
        return;
      }

      const [profileResult, insightResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, school_name, major, gpa_score, gpa_scale, core_skills, tech_stack, internship_count, project_count, target_role, target_industry, preferred_location, portfolio_url, github_url, experience_summary",
          )
          .eq("user_id", userData.user.id)
          .maybeSingle(),
        fetch(`/api/dashboard-insight?language=${language}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (profileResult.error) {
        setMessage(profileResult.error.message);
        setLoading(false);
        return;
      }

      const insightJson = await insightResult.json().catch(() => null);
      if (!insightResult.ok) {
        setMessage(insightJson?.error ?? t("대시보드 평가를 불러오지 못했습니다.", "Failed to load dashboard evaluation."));
        setLoading(false);
        return;
      }

      setProfile(profileResult.data);
      setInsight(insightJson);
      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEn, language]);

  const skills = useMemo(
    () =>
      [profile?.core_skills, profile?.tech_stack]
        .filter(Boolean)
        .join(",")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
    [profile],
  );

  const scoreItems = insight
    ? [
        { key: "profileCompleteness" as const, label: t("프로필 완성도", "Profile Completeness"), value: insight.scores.profileCompleteness },
        { key: "marketReadiness" as const, label: t("시장 준비도", "Market Readiness"), value: insight.scores.marketReadiness },
        { key: "interviewReadiness" as const, label: t("면접 준비도", "Interview Readiness"), value: insight.scores.interviewReadiness },
        { key: "portfolioStrength" as const, label: t("포트폴리오 강도", "Portfolio Strength"), value: insight.scores.portfolioStrength },
      ]
    : [];

  const benchmarkScore = insight?.benchmarkScore ?? 0;
  const benchmarkSize = insight?.benchmarkSize ?? 0;
  const medianScore = insight?.benchmarkMedianScore ?? 0;
  const topPercent = insight?.topPercent ?? 100;
  const weeklyTasks = insight?.weeklyReport?.length
    ? insight.weeklyReport
    : [
        t("숫자가 들어간 정량 성과를 하나 추가하세요.", "Add one measurable achievement with numbers."),
        t("포트폴리오 증거 하나를 공개하거나 링크하세요.", "Publish or link one portfolio proof item."),
        t("목표 직무를 더 구체적으로 적으세요.", "Make your target role more specific."),
      ];

  return (
    <PageShell maxWidth="max-w-7xl">
      {loading ? <Notice>{t("대시보드를 불러오는 중입니다...", "Loading dashboard...")}</Notice> : null}
      {message && !loading ? <Notice tone="warning">{message}</Notice> : null}

      {!loading && !message && insight ? (
        <div className="grid gap-5">
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <PagePanel className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="page-kicker">{t("현실 기반 준비도 평가", "Realistic Readiness Review")}</p>
                  <h1 className="ko-friendly mt-4 text-3xl font-semibold leading-tight text-[var(--foreground)] sm:text-4xl">
                    {insight.confidenceLabel}
                  </h1>
                  <p className="ko-friendly mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{insight.explanation}</p>
                  <p className="ko-friendly mt-2 text-xs leading-5 text-[var(--muted)]">
                    {t(
                      `더미 프로필 ${benchmarkSize || "전체"}개 기준 평균 ${benchmarkScore}점, 중앙값 ${medianScore}점, 상위 ${topPercent}%입니다.`,
                      `Average score ${benchmarkScore}, median ${medianScore}, top ${topPercent}% against ${benchmarkSize || "all"} dummy profiles.`,
                    )}
                  </p>
                </div>
                <div className="grid min-w-[220px] grid-cols-2 gap-2">
                  <MiniMetric label={t("평균", "Average")} value={String(benchmarkScore)} />
                  <MiniMetric label={t("상위", "Top")} value={`${topPercent}%`} />
                  <MiniMetric label={t("중앙값", "Median")} value={String(medianScore)} />
                  <MiniMetric label={t("페널티", "Penalties")} value={String(insight.penalties.length)} />
                </div>
              </div>
            </PagePanel>

            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("신뢰도 라벨", "Confidence Label")} description={t("점수는 보수적으로 정규화되어 대부분 45-75 범위에 머물도록 설계했습니다.", "Scores are conservatively normalized so most users land between 45 and 75.")} />
              <div className="mt-5">
                <RadarLite items={scoreItems} />
              </div>
            </PagePanel>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("준비도 세부 점수", "Readiness Breakdown")} description={t("단일 점수 대신 네 가지 신호를 분리해 보여줍니다.", "Four separate signals replace one misleading score.")} />
              <div className="mt-5 grid gap-4">
                {scoreItems.map((item) => (
                  <ScoreBar key={item.key} label={item.label} value={item.value} />
                ))}
              </div>
            </PagePanel>

            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("감점 요인", "Penalty Logic")} description={t("입력 여부만 보지 않고 깊이와 증거 부족을 감점합니다.", "The model penalizes weak depth and missing proof, not just empty fields.")} />
              <div className="mt-4 grid gap-2">
                {insight.penalties.length ? (
                  insight.penalties.map((penalty) => (
                    <div key={penalty.id} className="content-card flex items-center justify-between gap-3 p-3">
                      <span className="ko-friendly text-sm text-[var(--muted-strong)]">{penalty.label}</span>
                      <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-semibold text-[var(--warning)]">-{penalty.points}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState>{t("큰 감점 요인이 없습니다.", "No major penalty factors found.")}</EmptyState>
                )}
              </div>
            </PagePanel>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("주간 체크리스트", "Weekly Tasks")} description={t("가장 낮은 신호를 올리는 실행 항목입니다.", "Actions focused on improving the weakest signals.")} />
              <div className="mt-4 grid gap-2">
                {weeklyTasks.slice(0, 5).map((task, index) => (
                  <label key={`${task}-${index}`} className="content-card clickable-card flex items-start gap-3 p-3">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent-2)]" />
                    <span className="ko-friendly text-sm leading-6 text-[var(--muted-strong)]">{task}</span>
                  </label>
                ))}
              </div>
            </PagePanel>

            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("빠른 실행", "Quick Launch")} description={t("다음 결정을 바꾸는 도구로 바로 이동합니다.", "Jump into the tool that changes the next decision.")} />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {quickLaunch.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Link key={feature.href} href={feature.href} className="feature-glow-card content-card clickable-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="text-xs font-semibold text-[var(--accent-2)]">{isEn ? feature.ctaEn : feature.ctaKo}</span>
                      </div>
                      <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{isEn ? feature.titleEn : feature.titleKo}</p>
                      <p className="ko-friendly mt-1 text-xs leading-5 text-[var(--muted)]">{isEn ? feature.descriptionEn : feature.descriptionKo}</p>
                    </Link>
                  );
                })}
              </div>
            </PagePanel>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("프로필 요약", "Profile Summary")} description={t("편집은 Settings에서만 가능합니다.", "Editing is available only in Settings.")} />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SummaryCard label={t("커리어 목표", "Career Goal")} value={profile?.target_role || t("미입력", "Missing")} />
                <SummaryCard label={t("학교 / 전공", "School / Major")} value={[profile?.school_name, profile?.major].filter(Boolean).join(" · ") || t("미입력", "Missing")} />
                <SummaryCard label={t("추천 역할", "Recommended Roles")} value={insight.recommendedRoles?.slice(0, 2).join(", ") || t("계산 중", "Pending")} />
                <SummaryCard label="GPA" value={profile?.gpa_score ? `${profile.gpa_score} / ${profile.gpa_scale ?? 4.5}` : t("미입력", "Missing")} />
              </div>
              <Link href="/settings" className="secondary-btn mt-4 inline-flex px-4 py-2 text-sm">
                <Settings size={16} aria-hidden="true" />
                {t("Settings에서 수정", "Edit in Settings")}
              </Link>
            </PagePanel>

            <PagePanel className="p-5 sm:p-6">
              <SectionTitle title={t("스킬 스냅샷", "Skills Snapshot")} description={t("채용 매칭과 시뮬레이터에 사용되는 신호입니다.", "Signals used by Job Match and simulators.")} />
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.length ? skills.map((skill) => <span key={skill} className="chip">{skill}</span>) : <EmptyState>{t("Settings에서 스킬을 입력하세요.", "Add skills in Settings.")}</EmptyState>}
              </div>
              <Notice className="mt-4">{insight.explanation}</Notice>
            </PagePanel>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="content-card p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--muted-strong)]">{value}/100</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-strong)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function RadarLite({ items }: { items: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="content-card p-4">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[var(--line)] bg-[conic-gradient(var(--accent-2)_0deg,var(--accent)_var(--angle),var(--surface-strong)_var(--angle))]" style={{ "--angle": `${item.value * 3.6}deg` } as CSSProperties}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] text-lg font-semibold text-[var(--foreground)]">{item.value}</div>
          </div>
          <p className="ko-friendly mt-3 text-center text-xs font-semibold text-[var(--muted-strong)]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="content-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{label}</p>
      <p className="ko-friendly mt-2 text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}
