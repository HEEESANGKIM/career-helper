"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { demoJobs } from "@/lib/jobs";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

type ScoredJob = {
  id: string;
  title: string;
  company: string;
  score: number;
  reasons: string[];
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
  fitScore: number;
  hireProbability: number;
  fitReasons: string[];
};

type JobDetailAnalysis = {
  fitSummary: string;
  strengths: string[];
  gaps: string[];
  actionItems: string[];
};

const toTokenSet = (value: string | null) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );

export default function MatchingPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [realJobs, setRealJobs] = useState<RealJob[]>([]);
  const [recommendedRoles, setRecommendedRoles] = useState<string[]>([]);
  const [realJobsSource, setRealJobsSource] = useState("");
  const [realJobsLoading, setRealJobsLoading] = useState(false);
  const [realJobsMessage, setRealJobsMessage] = useState("");
  const [detailLoadingKey, setDetailLoadingKey] = useState("");
  const [detailAnalysis, setDetailAnalysis] = useState<JobDetailAnalysis | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
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
        setMessage("프로필이 없습니다. 먼저 프로필을 작성해 주세요.");
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
        setRealJobsMessage(json.error ?? "실공고 검색에 실패했습니다.");
        return;
      }

      setRealJobs(json.items ?? []);
      setRecommendedRoles(json.recommendedRoles ?? []);
      setRealJobsSource(json.source ?? "");
      setRealJobsMessage("");
    };

    void load();
  }, []);

  const scoredJobs = useMemo<ScoredJob[]>(() => {
    if (!profile) return [];

    const skillSet = toTokenSet([profile.core_skills, profile.tech_stack].filter(Boolean).join(", "));
    const certSet = toTokenSet([profile.role_certifications, profile.other_certifications].filter(Boolean).join(", "));
    const gpaScore = profile.gpa_score ?? 0;
    const gpaScale = profile.gpa_scale ?? 4.5;
    const normalizedGpa = gpaScale > 0 ? (gpaScore / gpaScale) * 4.5 : 0;
    const internshipCount = profile.internship_count ?? 0;
    const projectCount = profile.project_count ?? 0;
    const targetRole = (profile.target_role ?? "").toLowerCase();

    return demoJobs
      .map((job) => {
        const reasons: string[] = [];
        let score = 0;

        if (normalizedGpa >= job.minGpa) {
          score += 30;
          reasons.push(`GPA 기준 충족 (${gpaScore.toFixed(2)} / ${gpaScale.toFixed(1)} 환산 ${normalizedGpa.toFixed(2)})`);
        } else {
          const partial = Math.max(0, Math.round((normalizedGpa / job.minGpa) * 20));
          score += partial;
          reasons.push(`GPA 부분 점수 (${gpaScore.toFixed(2)} / ${gpaScale.toFixed(1)} 환산 ${normalizedGpa.toFixed(2)})`);
        }

        const skillMatches = job.requiredSkills.filter((skill) => skillSet.has(skill)).length;
        const skillScore = Math.round((skillMatches / job.requiredSkills.length) * 40);
        score += skillScore;
        reasons.push(`핵심 스킬 일치 ${skillMatches}/${job.requiredSkills.length}`);

        const certMatches = job.preferredCerts.filter((cert) => certSet.has(cert.toLowerCase())).length;
        if (job.preferredCerts.length > 0) {
          const certScore = Math.round((certMatches / job.preferredCerts.length) * 12);
          score += certScore;
          reasons.push(`자격증 일치 ${certMatches}/${job.preferredCerts.length}`);
        }

        if (job.internshipPreferred && internshipCount > 0) {
          score += 8;
          reasons.push("인턴 경험 반영");
        }

        if (projectCount > 0) {
          score += Math.min(8, projectCount * 2);
          reasons.push(`프로젝트 경험 ${projectCount}건 반영`);
        }

        if (targetRole && job.title.toLowerCase().includes(targetRole)) {
          score += 5;
          reasons.push("희망 직무 키워드 일치");
        }

        return { id: job.id, title: job.title, company: job.company, score: Math.min(100, score), reasons };
      })
      .sort((a, b) => b.score - a.score);
  }, [profile]);

  const loadJobDetailAnalysis = async (job: RealJob, idx: number) => {
    if (!profile) return;
    setDetailLoadingKey(`${job.url}-${idx}`);
    const profileSummary = [
      `학력:${profile.school_name ?? ""}`,
      `전공:${profile.major ?? ""}`,
      `GPA:${profile.gpa_score ?? 0}/${profile.gpa_scale ?? 4.5}`,
      `핵심스킬:${profile.core_skills ?? ""}`,
      `기술스택:${profile.tech_stack ?? ""}`,
      `자격증:${profile.role_certifications ?? ""} ${profile.other_certifications ?? ""}`,
      `프로젝트:${profile.project_count ?? 0}`,
      `인턴:${profile.internship_count ?? 0}`,
      `희망직무:${profile.target_role ?? ""}`,
    ].join(" | ");

    const res = await fetch("/api/job-detail-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTitle: job.title,
        company: job.company,
        summary: job.summary,
        profileSummary,
      }),
    });
    const json = await res.json();
    setDetailLoadingKey("");

    if (!res.ok) {
      setRealJobsMessage(json.error ?? "공고 상세 분석에 실패했습니다.");
      return;
    }

    setDetailAnalysis(json);
  };

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Matching</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">상세 프로필 기반 채용 매칭</h1>
          <p className="mt-2 text-sm text-slate-600">현재 모집중 실공고 + AI 추천 직종 + 적합도/취업확률을 제공합니다.</p>

          <div className="mt-4 flex gap-2">
            <Link href="/profile" className="secondary-btn px-3 py-2 text-sm">
              프로필 수정
            </Link>
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              대시보드
            </Link>
          </div>

          {loading && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">매칭 데이터를 계산하는 중입니다...</p>
          )}

          {!loading && message && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>
          )}

          {!loading && !message && profile && (
            <>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                프로필 요약: {profile.school_name || "학교 미입력"} / {profile.major || "전공 미입력"} / GPA{" "}
                {profile.gpa_score ?? 0} / {profile.gpa_scale ?? 4.5}
              </div>

              <h2 className="mt-6 text-lg font-semibold text-slate-900">AI 추천 직종</h2>
              {recommendedRoles.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {recommendedRoles.map((role) => (
                    <span key={role} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">추천 직종을 계산하는 중이거나 결과가 없습니다.</p>
              )}

              <h2 className="mt-6 text-lg font-semibold text-slate-900">현재 모집중 AI 실공고 추천</h2>
              <p className="mt-1 text-xs text-slate-500">
                {realJobsSource === "cache" ? "캐시된 결과" : realJobsSource === "ai_search" ? "최초 AI 검색 결과" : "로딩 중"}
              </p>

              {realJobsLoading && <p className="mt-2 text-sm text-slate-600">실제 공고를 찾는 중입니다...</p>}
              {!realJobsLoading && realJobsMessage && (
                <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{realJobsMessage}</p>
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
                          <p className="mt-1 text-xs text-emerald-700">모집상태: {job.hiringStatus === "open" ? "모집중" : "확인필요"}</p>
                        </div>
                        <a href={job.url} target="_blank" rel="noreferrer" className="secondary-btn px-2 py-1 text-xs">
                          공고 보기
                        </a>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{job.summary}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-blue-50 p-2 text-blue-800">적합도: {job.fitScore}%</div>
                        <div className="rounded-md bg-emerald-50 p-2 text-emerald-800">취업 확률: {job.hireProbability}%</div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        게시일: {job.publishedAt || "unknown"} / 마감: {job.deadline || "unknown"}
                      </p>
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
                        {detailLoadingKey === `${job.url}-${idx}` ? "분석 중..." : "AI 상세 분석"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {detailAnalysis && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">공고 상세 분석</p>
                  <p className="mt-1 text-sm text-slate-700">{detailAnalysis.fitSummary}</p>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">강점</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {detailAnalysis.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">갭</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {detailAnalysis.gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">실행 과제</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {detailAnalysis.actionItems.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <h2 className="mt-7 text-lg font-semibold text-slate-900">규칙 기반 스코어 매칭</h2>
              <div className="mt-3 space-y-3">
                {scoredJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">{job.title}</h2>
                        <p className="text-sm text-slate-600">{job.company}</p>
                      </div>
                      <div className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white">{job.score}점</div>
                    </div>
                    <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                      {job.reasons.map((reason) => (
                        <li key={`${job.id}-${reason}`}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
