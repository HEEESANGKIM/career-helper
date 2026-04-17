"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
  source: "saramin_api" | "verified_web_search" | "cache";
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
  source: "saramin_api" | "verified_web_search";
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
  const [realJobs, setRealJobs] = useState<RealJob[]>([]);
  const [recommendedRoles, setRecommendedRoles] = useState<string[]>([]);
  const [realJobsSource, setRealJobsSource] = useState("");
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [realJobsLoading, setRealJobsLoading] = useState(false);
  const [realJobsMessage, setRealJobsMessage] = useState("");
  const [detailLoadingKey, setDetailLoadingKey] = useState("");
  const [detailAnalysis, setDetailAnalysis] = useState<JobDetailAnalysis | null>(null);

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
    if (source === "saramin_api") return t("사람인 공식 API", "Saramin official API");
    if (source === "verified_web_search") return t("검증된 웹 검색", "Verified web search");
    if (source === "cache") return t("저장된 검증 결과", "Cached verified result");
    return t("검색 중", "Searching");
  };

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
        setLoading(false);
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

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      setRealJobsLoading(true);
      const res = await fetch("/api/matching-real-jobs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      setRealJobsLoading(false);

      if (!res.ok) {
        setRealJobsMessage(json.error ?? t("실공고 검색에 실패했습니다.", "Failed to fetch live job postings."));
        return;
      }

      setRealJobs(json.items ?? []);
      setRecommendedRoles(json.recommendedRoles ?? []);
      setRealJobsSource(json.source ?? "");
      setMarketInsights(json.marketInsights ?? null);
      setRealJobsMessage("");
    };

    void load();
  }, [t]);

  const loadJobDetailAnalysis = async (job: RealJob, idx: number) => {
    if (!profile) return;
    setDetailLoadingKey(`${job.url}-${idx}`);
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
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Matching</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("상세 프로필 기반 채용 매칭", "Profile-Based Job Matching")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("현재 모집중 실공고를 검증하고 공개 지원자수 기반 경쟁 강도와 지원 우선순위를 함께 봅니다.", "Review verified live postings with public applicant signals and application priority.")}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/profile" className="secondary-btn px-3 py-2 text-sm">
              {t("프로필 수정", "Edit profile")}
            </Link>
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              {t("대시보드", "Dashboard")}
            </Link>
          </div>

          {loading && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{t("매칭 데이터를 계산하는 중입니다...", "Calculating matching data...")}</p>
          )}

          {!loading && message && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>
          )}

          {!loading && !message && profile && (
            <>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {t("프로필 요약", "Profile summary")}: {profile.school_name || t("학교 미입력", "School missing")} / {profile.major || t("전공 미입력", "Major missing")} / GPA {profile.gpa_score ?? 0} / {profile.gpa_scale ?? 4.5}
              </div>

              <h2 className="mt-6 text-lg font-semibold text-slate-900">{t("AI 추천 직종 (자소서/이력 기반)", "AI-Recommended Roles")}</h2>
              {recommendedRoles.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {recommendedRoles.map((role) => (
                    <span key={role} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">{t("자소서/이력 기반 추천 직종을 계산 중이거나 결과가 없습니다.", "No recommended roles yet.")}</p>
              )}

              <h2 className="mt-6 text-lg font-semibold text-slate-900">{t("현재 모집중 실공고 추천", "Live Job Recommendations")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {sourceLabel(realJobsSource)}
              </p>

              {realJobsLoading && <p className="mt-2 text-sm text-slate-600">{t("실제 공고를 찾는 중입니다...", "Searching live postings...")}</p>}
              {!realJobsLoading && realJobsMessage && (
                <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{realJobsMessage}</p>
              )}
              {!realJobsLoading && !realJobsMessage && marketInsights && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-md bg-slate-50 p-3 text-slate-800">
                      <p className="text-xs font-semibold text-slate-500">{t("평균 지원자수/공고", "Avg. applicants/posting")}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{formatNumber(marketInsights.averageApplicantsPerPosting)}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3 text-slate-800">
                      <p className="text-xs font-semibold text-slate-500">{t("평균 조회수/공고", "Avg. views/posting")}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{formatNumber(marketInsights.averageViewsPerPosting)}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3 text-slate-800">
                      <p className="text-xs font-semibold text-slate-500">{t("경쟁 강도", "Competition level")}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{competitionLabel(marketInsights.competitionLevel)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">{marketInsights.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">{marketInsights.caveat}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("검증 공고", "Checked postings")}: {marketInsights.postingsChecked}
                    {marketInsights.postingPoolSize ? ` / ${t("검색 풀", "Search pool")}: ${formatNumber(marketInsights.postingPoolSize)}` : ""}
                  </p>
                </div>
              )}
              {!realJobsLoading && !realJobsMessage && realJobs.length > 0 && (
                <div className="mt-3 space-y-3">
                  {realJobs.map((job, idx) => (
                    <div key={`${job.url}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
                          <p className="text-sm text-slate-600">
                            {job.company} · {job.location}
                          </p>
                          <p className="mt-1 text-xs text-emerald-700">
                            {t("모집상태", "Hiring status")}: {job.hiringStatus === "open" ? t("모집중", "Open") : t("확인필요", "Unknown")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t("출처", "Source")}: {job.sourceLabel}
                          </p>
                        </div>
                        <a href={job.url} target="_blank" rel="noreferrer" className="secondary-btn px-2 py-1 text-xs">
                          {t("공고 보기", "View posting")}
                        </a>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{job.summary}</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-md bg-blue-50 p-2 text-blue-800">
                          {t("적합도", "Fit score")}: {job.fitScore}%
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 text-emerald-800">
                          {t("지원 우선순위", "Application priority")}: {job.priorityScore}%
                        </div>
                        <div className="rounded-md bg-slate-50 p-2 text-slate-800">
                          {t("경쟁 강도", "Competition level")}: {competitionLabel(job.competitionLevel)}
                        </div>
                        <div className="rounded-md bg-slate-50 p-2 text-slate-800">
                          {job.competitionText}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("게시일", "Posted")}: {job.publishedAt || "unknown"} / {t("마감", "Deadline")}: {job.deadline || "unknown"}
                      </p>
                      {job.evidence?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {job.evidence.slice(0, 2).map((source) => (
                            <a key={`${job.url}-${source.url}-${source.label}`} href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:text-blue-800">
                              {source.label}
                            </a>
                          ))}
                        </div>
                      )}
                      {job.fitReasons?.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                          {job.fitReasons.map((reason) => (
                            <li key={`${job.url}-${reason}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => void loadJobDetailAnalysis(job, idx)}
                        disabled={detailLoadingKey === `${job.url}-${idx}`}
                        className="secondary-btn mt-3 px-3 py-2 text-xs disabled:opacity-60"
                      >
                        {detailLoadingKey === `${job.url}-${idx}` ? t("분석 중...", "Analyzing...") : t("AI 상세 분석", "AI Detail Analysis")}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {detailAnalysis && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{t("공고 상세 분석", "Detailed Analysis")}</p>
                  <p className="mt-1 text-sm text-slate-700">{detailAnalysis.fitSummary}</p>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t("강점", "Strengths")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {detailAnalysis.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t("갭", "Gaps")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {detailAnalysis.gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t("실행 과제", "Action Items")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {detailAnalysis.actionItems.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
