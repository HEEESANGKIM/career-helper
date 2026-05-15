"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type ProfileData = {
  school_name: string | null;
  major: string | null;
  gpa_score: number | null;
  gpa_scale: number | null;
  core_skills: string | null;
  tech_stack: string | null;
  role_certifications: string | null;
  other_certifications: string | null;
  internship_count: number | null;
  project_count: number | null;
  target_role: string | null;
};

type CompetitionLevel = "low" | "moderate" | "high" | "unknown";

type EvidenceSource = {
  label: string;
  url: string;
  sourceType: "official_api" | "job_posting" | "search_result";
  verifiedAt: string;
};

type MarketInsights = {
  source: "verified_web_search" | "cache";
  searchedAt: string;
  postingPoolSize: number | null;
  postingsChecked: number;
  averageApplicantsPerPosting: number | null;
  averageViewsPerPosting: number | null;
  competitionLevel: CompetitionLevel;
  summary: string;
  caveat: string;
  evidence: EvidenceSource[];
};

type RealJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  summary: string;
  publishedAt: string;
  deadline: string;
  hiringStatus: "open" | "unknown";
  source: "verified_web_search";
  sourceLabel: string;
  fitScore: number;
  priorityScore: number;
  applicantCount: number | null;
  viewCount: number | null;
  competitionLevel: CompetitionLevel;
  competitionText: string;
  fitReasons: string[];
  evidence: EvidenceSource[];
};

type JobDetailAnalysis = {
  fitSummary: string;
  strengths: string[];
  gaps: string[];
  actionItems: string[];
};

export default function MatchingPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = useCallback((ko: string, en: string) => (isEn ? en : ko), [isEn]);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [jobPool, setJobPool] = useState<RealJob[]>([]);
  const [poolIndex, setPoolIndex] = useState(0);
  const [realJobs, setRealJobs] = useState<RealJob[]>([]);
  const [recommendedRoles, setRecommendedRoles] = useState<string[]>([]);
  const [realJobsSource, setRealJobsSource] = useState("");
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [realJobsLoading, setRealJobsLoading] = useState(false);
  const [realJobsRefreshing, setRealJobsRefreshing] = useState(false);
  const [realJobsMessage, setRealJobsMessage] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [poolNote, setPoolNote] = useState("");
  const [detailLoadingKey, setDetailLoadingKey] = useState("");
  const [detailAnalysis, setDetailAnalysis] = useState<JobDetailAnalysis | null>(null);
  const [detailJob, setDetailJob] = useState<RealJob | null>(null);
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, string>>({});
  const jobsFetchInFlightRef = useRef(false);

  const formatNumber = (value: number | null | undefined) => {
    if (typeof value !== "number") return t("미공개", "Not public");
    return value.toLocaleString(isEn ? "en-US" : "ko-KR");
  };

  const competitionLabel = (level: CompetitionLevel) => {
    if (level === "high") return t("높음", "High");
    if (level === "moderate") return t("보통", "Moderate");
    if (level === "low") return t("낮음", "Low");
    return t("미공개", "Unknown");
  };

  const sourceLabel = (source: string) => {
    if (source === "verified_web_search") return t("검증된 웹 검색", "Verified web search");
    if (source === "cache") return t("저장된 검증 결과", "Cached verified result");
    return t("검색 중", "Searching");
  };

  const hiddenOpportunities = useMemo(() => {
    const skills = `${profile?.core_skills ?? ""} ${profile?.tech_stack ?? ""}`.toLowerCase();
    const pool = recommendedRoles.length
      ? recommendedRoles
      : skills.includes("sql")
        ? [isEn ? "Business Analyst" : "비즈니스 분석가", isEn ? "Operations Associate" : "운영 어소시에이트", isEn ? "Customer Success Associate" : "고객 성공 어소시에이트"]
        : [isEn ? "Operations Associate" : "운영 어소시에이트", isEn ? "Business Analyst" : "비즈니스 분석가", isEn ? "Sales Development Representative" : "세일즈 개발 담당자"];
    return pool.slice(0, 3).map((role, index) => ({
      role,
      fit: index === 0 ? t("높음", "High") : index === 1 ? t("보통", "Medium") : t("탐색", "Emerging"),
      salary: index === 0 ? "$55k-$85k" : index === 1 ? "$48k-$72k" : "$45k-$68k",
      why: index === 0
        ? t("현재 기술과 목표 직무의 중간 지점이라 지원 경쟁력이 더 높을 수 있습니다.", "This sits between your current skills and target role, so competitiveness may be higher.")
        : t("핵심 역량을 재사용하면서 진입 장벽을 낮출 수 있는 인접 경로입니다.", "An adjacent path that reuses core strengths with a lower entry barrier."),
    }));
  }, [isEn, profile, recommendedRoles, t]);

  const cultureFit = useMemo(() => {
    if (!detailJob) return null;
    const text = `${detailJob.company} ${detailJob.title} ${detailJob.summary}`.toLowerCase();
    const startup = text.includes("startup") || text.includes("스타트업");
    const enterprise = text.includes("global") || text.includes("대기업") || text.includes("enterprise");
    return {
      pace: startup ? t("빠른 속도", "Fast pace") : enterprise ? t("중간-느림", "Moderate") : t("보통", "Moderate"),
      structure: enterprise ? t("높음", "High") : startup ? t("낮음", "Low") : t("보통", "Medium"),
      autonomy: startup ? t("높음", "High") : enterprise ? t("보통", "Medium") : t("보통", "Medium"),
      workLife: startup ? t("변동 가능", "Variable") : enterprise ? t("상대적으로 안정", "Relatively stable") : t("확인 필요", "Needs review"),
      summary: t("일반적인 회사 유형 패턴과 공고 내용에 기반한 추정 적합도입니다. 사실로 단정하지 말고 면접에서 확인하세요.", "Estimated fit based on common company patterns and the posting text. Treat it as a prompt to verify in interviews, not a fact."),
    };
  }, [detailJob, t]);

  const applyJobPoolResponse = useCallback((json: Record<string, unknown>) => {
    const pool = (Array.isArray(json.pool) ? json.pool : json.items) as RealJob[];
    const index =
      typeof json.poolIndex === "number"
        ? json.poolIndex
        : pool.length > 0
          ? 0
          : 0;
    const safeIndex = pool.length > 0 ? Math.min(Math.max(0, index), pool.length - 1) : 0;
    setJobPool(pool);
    setPoolIndex(safeIndex);
    setRealJobs(pool[safeIndex] ? [pool[safeIndex]] : []);
    setRecommendedRoles((json.recommendedRoles as string[]) ?? []);
    setRealJobsSource(String(json.source ?? ""));
    setMarketInsights((json.marketInsights as MarketInsights) ?? null);
    setPoolNote(typeof json.poolNote === "string" ? json.poolNote : "");
  }, []);

  const fetchRealJobs = useCallback(
    async (options?: {
      refresh?: boolean;
      poolIndex?: number;
      accessToken?: string;
      excludeUrls?: string[];
    }) => {
      const refresh = Boolean(options?.refresh);
      if (jobsFetchInFlightRef.current) return;
      jobsFetchInFlightRef.current = true;

      const token =
        options?.accessToken ??
        (await getSessionWithRetry())?.access_token;
      if (!token) {
        jobsFetchInFlightRef.current = false;
        return;
      }

      if (refresh) {
        setRealJobsRefreshing(true);
        setRefreshError("");
        setDetailAnalysis(null);
        setDetailJob(null);
      } else {
        setRealJobsLoading(true);
        setRealJobsMessage("");
      }

      const params = new URLSearchParams({ language });
      if (refresh) {
        params.set("refresh", "1");
        const seen = (options?.excludeUrls ?? []).filter(Boolean);
        if (seen.length > 0) {
          params.set("exclude", seen.join(","));
        }
      } else if (typeof options?.poolIndex === "number") {
        params.set("poolIndex", String(options.poolIndex));
      }

      try {
        const res = await fetch(`/api/matching-real-jobs?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();

        if (!res.ok) {
          const errText = json.error ?? t("실공고 검색에 실패했습니다.", "Failed to fetch live job postings.");
          if (refresh) {
            setRefreshError(errText);
          } else {
            setRealJobsMessage(errText);
          }
          return;
        }

        applyJobPoolResponse(json);
        setRealJobsMessage("");
        setRefreshError("");
      } finally {
        jobsFetchInFlightRef.current = false;
        if (refresh) {
          setRealJobsRefreshing(false);
        } else {
          setRealJobsLoading(false);
        }
      }
    },
    [applyJobPoolResponse, language, t],
  );

  const showNextJobInPool = useCallback(() => {
    if (jobPool.length === 0) return;
    const nextIndex = poolIndex + 1;
    if (nextIndex < jobPool.length) {
      setPoolIndex(nextIndex);
      setRealJobs([jobPool[nextIndex]]);
      setRefreshError("");
      setDetailAnalysis(null);
      setDetailJob(null);
      return;
    }
    void fetchRealJobs({
      refresh: true,
      excludeUrls: jobPool.map((job) => job.url).filter(Boolean),
    });
  }, [fetchRealJobs, jobPool, poolIndex]);

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

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "school_name, major, gpa_score, gpa_scale, core_skills, tech_stack, role_certifications, other_certifications, internship_count, project_count, target_role",
        )
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
      } else if (!data) {
        setMessage(t("프로필이 없습니다. 먼저 프로필을 작성해 주세요.", "No profile found. Please create your profile first."));
      } else {
        setProfile(data);
      }

      setLoading(false);

      if (!session.access_token) return;
      await fetchRealJobs({ accessToken: session.access_token });
    };

    void load();
  }, [language, fetchRealJobs]);

  const loadJobDetailAnalysis = async (job: RealJob, idx: number) => {
    if (!profile) return;
    setDetailLoadingKey(`${job.url}-${idx}`);
    setDetailJob(job);
    const profileSummary = [
      `${t("학력", "Education")}:${profile.school_name ?? ""}`,
      `${t("전공", "Major")}:${profile.major ?? ""}`,
      `GPA:${profile.gpa_score ?? 0}/${profile.gpa_scale ?? 4.5}`,
      `${t("핵심스킬", "Core skills")}:${profile.core_skills ?? ""}`,
      `${t("기술스택", "Tech stack")}:${profile.tech_stack ?? ""}`,
      `${t("자격증", "Certifications")}:${profile.role_certifications ?? ""} ${profile.other_certifications ?? ""}`,
      `${t("프로젝트", "Projects")}:${profile.project_count ?? 0}`,
      `${t("인턴", "Internships")}:${profile.internship_count ?? 0}`,
      `${t("희망직무", "Target role")}:${profile.target_role ?? ""}`,
    ].join(" | ");

    const res = await fetch("/api/job-detail-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTitle: job.title,
        company: job.company,
        summary: `${job.summary} | ${t("공개 경쟁 지표", "Public competition signal")}: ${job.competitionText}`,
        profileSummary,
        language,
      }),
    });
    const json = await res.json();
    setDetailLoadingKey("");

    if (!res.ok) {
      setRealJobsMessage(json.error ?? t("공고 상세 분석에 실패했습니다.", "Failed to analyze job details."));
      return;
    }

    setDetailAnalysis(json);
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow="Matching Cockpit"
        title={t("상세 프로필 기반 채용 매칭", "Profile-Based Job Matching")}
        description={t("실공고, 경쟁 신호, 프로필 적합도를 하나의 대시보드에서 우선순위화합니다.", "Prioritize live postings, competition signals, and profile fit in one dashboard.")}
        actions={
          <>
            <Link href="/settings" className="secondary-btn px-3 py-2 text-sm">
              {t("설정에서 프로필 수정", "Edit profile in Settings")}
            </Link>
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              {t("대시보드", "Dashboard")}
            </Link>
          </>
        }
      />

      <PagePanel>
        <SectionTitle title={t("Route intelligence", "Route intelligence")} description={t("내 프로필과 실공고 신호를 연결해 지원 우선순위를 계산합니다.", "Connect your profile with live market signals to prioritize applications.")} />
          {loading && (
            <Notice className="mt-4">{t("매칭 데이터를 계산하는 중입니다...", "Calculating matching data...")}</Notice>
          )}

          {!loading && message && (
            <Notice className="mt-4">{message}</Notice>
          )}

          {!loading && !message && profile && (
            <>
              <div className="content-card responsive-card-grid mt-5 p-5 text-sm text-[var(--muted-strong)]">
                <div className="content-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{t("학교", "School")}</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{profile.school_name || t("미입력", "Missing")}</p>
                </div>
                <div className="content-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{t("전공", "Major")}</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{profile.major || t("미입력", "Missing")}</p>
                </div>
                <div className="content-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">GPA</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{profile.gpa_score ?? 0} / {profile.gpa_scale ?? 4.5}</p>
                </div>
                <div className="content-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{t("목표", "Target")}</p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">{profile.target_role || t("미입력", "Missing")}</p>
                </div>
              </div>

              <div className="mt-6">
                <SectionTitle title={t("AI 추천 직종", "AI-Recommended Roles")} description={t("자소서/이력 기반 역할 신호입니다.", "Role signals based on resume and writing context.")} />
              </div>
              {recommendedRoles.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {recommendedRoles.map((role) => (
                    <span key={role} className="chip">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState>{t("자소서/이력 기반 추천 직종을 계산 중이거나 결과가 없습니다.", "No recommended roles yet.")}</EmptyState>
              )}

              <div className="mt-6">
                <SectionTitle
                  title={t("숨은 기회 레이더", "Hidden Opportunity Radar")}
                  description={t("목표 직무가 막힐 때 더 경쟁력 있을 수 있는 인접 역할입니다.", "Adjacent roles where you may be more competitive if the first-choice path stalls.")}
                />
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {hiddenOpportunities.map((item) => (
                    <article key={item.role} className="content-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{item.role}</p>
                        <span className="accent-pill px-2.5 py-1 text-[11px] font-semibold">{item.fit}</span>
                      </div>
                      <p className="ko-friendly mt-3 text-xs leading-5 text-[var(--muted)]">{item.why}</p>
                      <p className="mt-3 text-xs font-semibold text-[var(--accent-2)]">{t("예상 연봉대", "Salary band")}: {item.salary}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <SectionTitle title={t("현재 모집중 실공고 추천", "Live Job Recommendations")} description={sourceLabel(realJobsSource)} />
                {jobPool.length > 0 && (
                  <p className="text-xs font-medium text-[var(--muted)]">
                    {t("추천", "Pick")} {poolIndex + 1} / {jobPool.length}
                  </p>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {sourceLabel(realJobsSource)}
                {jobPool.length > 1
                  ? t(" · 대기 중인 추천이 있으면 버튼 한 번으로 다음 공고를 바로 볼 수 있습니다.", " · Queued picks load instantly; a new web search runs when the queue is empty.")
                  : ""}
              </p>

              {(realJobsLoading || realJobsRefreshing) && (
                <Notice className="mt-2">
                  {realJobsRefreshing
                    ? t("다른 업무를 새로 찾는 중입니다. 10~15초 정도 걸릴 수 있습니다.", "Searching for other roles. This may take 10–15 seconds.")
                    : t("실제 공고를 찾는 중입니다...", "Searching live postings...")}
                </Notice>
              )}
              {!realJobsLoading && !realJobsRefreshing && realJobsMessage && (
                <Notice className="mt-2" tone="warning">{realJobsMessage}</Notice>
              )}
              {!realJobsLoading && !realJobsRefreshing && refreshError && (
                <Notice className="mt-2" tone="warning">{refreshError}</Notice>
              )}
              {!realJobsLoading && !realJobsRefreshing && poolNote && (
                <Notice className="mt-2">{poolNote}</Notice>
              )}
              {!realJobsLoading && !realJobsRefreshing && !realJobsMessage && marketInsights && (
                <div className="content-card mt-3 p-4">
                  <div className="responsive-card-grid text-sm">
                    <div className="content-card p-3 text-[var(--muted-strong)]">
                      <p className="text-xs font-medium text-[var(--muted)]">{t("평균 지원자수/공고", "Avg. applicants/posting")}</p>
                      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{formatNumber(marketInsights.averageApplicantsPerPosting)}</p>
                    </div>
                    <div className="content-card p-3 text-[var(--muted-strong)]">
                      <p className="text-xs font-medium text-[var(--muted)]">{t("평균 조회수/공고", "Avg. views/posting")}</p>
                      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{formatNumber(marketInsights.averageViewsPerPosting)}</p>
                    </div>
                    <div className="content-card p-3 text-[var(--muted-strong)]">
                      <p className="text-xs font-medium text-[var(--muted)]">{t("경쟁 강도", "Competition level")}</p>
                      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{competitionLabel(marketInsights.competitionLevel)}</p>
                    </div>
                  </div>
                  <p className="ko-friendly mt-3 text-xs leading-5 text-[var(--muted)]">{marketInsights.summary}</p>
                  <p className="ko-friendly mt-1 text-xs leading-5 text-[var(--muted)]">{marketInsights.caveat}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {t("검증 공고", "Checked postings")}: {marketInsights.postingsChecked}
                    {marketInsights.postingPoolSize ? ` / ${t("검색 풀", "Search pool")}: ${formatNumber(marketInsights.postingPoolSize)}` : ""}
                  </p>
                </div>
              )}
              {!realJobsLoading && !realJobsRefreshing && !realJobsMessage && realJobs.length > 0 && (
                <div className="mt-3 space-y-3">
                  {realJobs.map((job, idx) => {
                    const jobKey = `${job.url}-${idx}`;
                    const status = applicationStatuses[jobKey] ?? "not_applied";
                    return (
                    <div key={jobKey} className="content-card p-4">
                      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-start">
                        <div className="score-ring h-28 w-28" style={{ "--score": job.fitScore } as CSSProperties}>
                          <div>
                            <p className="text-2xl font-semibold text-[var(--foreground)]">{job.fitScore}%</p>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Match</p>
                          </div>
                        </div>
                        <div>
                          <h3 className="ko-friendly text-base font-medium text-[var(--foreground)]">{job.title}</h3>
                          <p className="text-sm text-[var(--muted)]">
                            {job.company} · {job.location}
                          </p>
                          <p className="mt-1 text-xs text-[var(--success)]">
                            {t("모집상태", "Hiring status")}: {job.hiringStatus === "open" ? t("모집중", "Open") : t("확인필요", "Unknown")}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {t("출처", "Source")}: {job.sourceLabel}
                          </p>
                          <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted-strong)]">{job.summary}</p>
                        </div>
                        <div className="flex flex-col items-stretch gap-2 sm:items-end">
                          <button
                            type="button"
                            onClick={() => void showNextJobInPool()}
                            disabled={realJobsLoading || realJobsRefreshing}
                            className="primary-btn px-2 py-1 text-xs disabled:opacity-60"
                          >
                            {realJobsRefreshing
                              ? t("검색 중...", "Searching...")
                              : poolIndex + 1 < jobPool.length
                                ? t("다음 추천 보기", "Next pick")
                                : t("새 목록 검색", "Search new picks")}
                          </button>
                          <a href={job.url} target="_blank" rel="noreferrer" className="secondary-btn px-2 py-1 text-xs text-center">
                            {t("공고 보기", "View posting")}
                          </a>
                        </div>
                      </div>
                      <div className="responsive-card-grid mt-4 text-xs">
                        <div className="content-card p-3">
                          <p className="font-semibold text-[var(--foreground)]">{t("지원 우선순위", "Application priority")}</p>
                          <div className="signal-bar mt-2">
                            <div className="signal-fill" style={{ width: `${job.priorityScore}%` }} />
                          </div>
                          <p className="mt-2 text-[var(--muted)]">{job.priorityScore}%</p>
                        </div>
                        <div className="content-card p-3">
                          <p className="font-semibold text-[var(--foreground)]">{t("경쟁 강도", "Competition level")}</p>
                          <p className="mt-2 text-[var(--warning)]">{competitionLabel(job.competitionLevel)}</p>
                          <p className="mt-1 text-[var(--muted)]">{job.competitionText}</p>
                        </div>
                        <div className="content-card p-3">
                          <p className="font-semibold text-[var(--foreground)]">{t("스킬 갭 맵", "Skill Gap Map")}</p>
                          <div className="signal-bar mt-2">
                            <div className="h-full rounded-full bg-[var(--warning)]" style={{ width: `${Math.max(12, 100 - job.fitScore)}%` }} />
                          </div>
                          <p className="mt-2 text-[var(--muted)]">{t("낮을수록 보완 적음", "Lower means fewer gaps")}</p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {t("게시일", "Posted")}: {job.publishedAt || "unknown"} / {t("마감", "Deadline")}: {job.deadline || "unknown"}
                      </p>
                      {job.evidence?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {job.evidence.slice(0, 2).map((source) => (
                            <a key={`${job.url}-${source.url}-${source.label}`} href={source.url} target="_blank" rel="noreferrer" className="font-medium text-[var(--accent-2)] hover:text-[var(--accent-2)]">
                              {source.label}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="content-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--success)]">{t("Matched strengths", "Matched strengths")}</p>
                          {job.fitReasons?.length > 0 ? (
                            <ul className="mt-2 list-disc pl-5 text-xs text-[var(--muted)]">
                              {job.fitReasons.slice(0, 3).map((reason) => (
                                <li className="ko-friendly" key={`${job.url}-${reason}`}>{reason}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-[var(--muted)]">{t("직접 일치 신호가 아직 부족합니다.", "Direct match signal is still limited.")}</p>
                          )}
                        </div>
                        <div className="content-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--warning)]">{t("Risk areas", "Risk areas")}</p>
                      <p className="ko-friendly mt-2 text-xs leading-5 text-[var(--muted)]">{job.competitionLevel === "high" ? t("경쟁 강도가 높아 정량 성과와 포트폴리오 증거가 필요합니다.", "High competition: add measurable proof and portfolio evidence.") : t("공고 요구사항과 내 경험의 연결 문장을 보강하세요.", "Tighten the bridge between requirements and your evidence.")}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadJobDetailAnalysis(job, idx)}
                        disabled={detailLoadingKey === jobKey}
                        className="secondary-btn mt-3 px-3 py-2 text-xs disabled:opacity-60"
                      >
                        {detailLoadingKey === jobKey ? t("분석 중...", "Analyzing...") : t("AI 상세 분석", "AI Detail Analysis")}
                      </button>
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <label className="block">
                          <span className="form-label">{t("지원 상태", "Application status")}</span>
                          <select
                            value={status}
                            onChange={(e) => setApplicationStatuses((prev) => ({ ...prev, [jobKey]: e.target.value }))}
                            className="field mt-1"
                          >
                            <option value="not_applied">{t("미지원", "Not applied")}</option>
                            <option value="applied">{t("지원 완료", "Applied")}</option>
                            <option value="interviewing">{t("면접 진행 중", "Interviewing")}</option>
                            <option value="offer_received">{t("오퍼 수령", "Offer Received")}</option>
                          </select>
                        </label>
                        {status === "offer_received" ? (
                          <div className="content-card border-[color-mix(in_srgb,var(--success)_42%,var(--line))] p-3">
                            <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{t("답장 전 협상 연습", "Practice negotiation before replying.")}</p>
                            <p className="ko-friendly mt-1 text-xs leading-5 text-[var(--muted)]">
                              {t("협상 가능 영역: 연봉, 입사일, 직함, 사이닝 보너스, 근무 방식", "Likely negotiable areas: salary, start date, title, signing bonus, work setup")}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {detailAnalysis && (
                <div className="content-card mt-4 p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">{t("공고 상세 분석", "Detailed Analysis")}</p>
                  <p className="ko-friendly mt-1 text-sm leading-6 text-[var(--muted-strong)]">{detailAnalysis.fitSummary}</p>
                  <div className="responsive-card-grid mt-2">
                    <div className="content-card p-3">
                      <p className="text-xs font-medium text-[var(--foreground)]">{t("강점", "Strengths")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-[var(--muted)]">
                        {detailAnalysis.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="content-card p-3">
                      <p className="text-xs font-medium text-[var(--foreground)]">{t("갭", "Gaps")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-[var(--muted)]">
                        {detailAnalysis.gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="content-card p-3">
                      <p className="text-xs font-medium text-[var(--foreground)]">{t("실행 과제", "Action Items")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-[var(--muted)]">
                        {detailAnalysis.actionItems.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {cultureFit ? (
                    <div className="content-card mt-3 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{t("컬처 핏 인사이트", "Culture Fit Insight")}</p>
                          <p className="ko-friendly mt-1 text-xs leading-5 text-[var(--muted)]">{cultureFit.summary}</p>
                        </div>
                        <span className="accent-pill w-fit px-3 py-1 text-[11px] font-semibold">{t("추정", "Estimated")}</span>
                      </div>
                      <div className="responsive-card-grid mt-3 text-xs">
                        {[
                          [t("속도", "Pace"), cultureFit.pace],
                          [t("구조화", "Structure"), cultureFit.structure],
                          [t("자율성", "Autonomy"), cultureFit.autonomy],
                          [t("워라밸", "Work-life"), cultureFit.workLife],
                        ].map(([label, value]) => (
                          <div key={label} className="content-card p-3">
                            <p className="font-semibold text-[var(--foreground)]">{label}</p>
                            <p className="ko-friendly mt-1 text-[var(--muted)]">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
      </PagePanel>
    </PageShell>
  );
}



