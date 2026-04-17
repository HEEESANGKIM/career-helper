"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type LanguageMode = "ko" | "en";

type LocalizedText = {
  ko: string;
  en: string;
};

type Candidate = {
  id: string;
  name: string;
  kind: "user" | "human" | "ai";
  resumeScore: number;
  essayScore: number;
  interviewScore: number;
  totalScore: number;
};

type InterviewPlan = {
  question: string;
  rubric: string[];
  followUps: string[];
  expectedSignals: string[];
  timeLimitSec: number;
};

type InterviewEval = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  categoryScores: {
    problemSolving: number;
    technicalDepth: number;
    communication: number;
    impact: number;
  };
  hiringSignal: "strong_hire" | "proceed" | "hold" | "reject";
  nextStepAdvice: string[];
};

type VirtualPosting = {
  id: string;
  title: LocalizedText;
  company: string;
  role: LocalizedText;
  location: LocalizedText;
  deadline: string;
  humanApplicants: number;
  description: LocalizedText;
  requirements: LocalizedText[];
  screeningFocus: LocalizedText[];
  source: "ai_generated" | "template_fallback";
};

type ProfileSummary = {
  target_role: string | null;
  preferred_location: string | null;
  core_skills: string | null;
  tech_stack: string | null;
  major: string | null;
  project_count: number | null;
  internship_count: number | null;
};

const MAX_CAPACITY = 10;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const genAiName = (idx: number) => {
  const prefix = ["Mina", "Suhyeon", "Yujin", "Doyun", "Harin", "Junseo", "Chaewon", "Hyunwoo", "Nayeon"];
  return `${prefix[idx % prefix.length]}_AI_${idx + 1}`;
};

const isPostingOpen = (deadline: string) => {
  const time = new Date(deadline).getTime();
  return Number.isFinite(time) && time > Date.now();
};

const openPostingsOnly = (postings: VirtualPosting[]) =>
  postings
    .filter((posting) => isPostingOpen(posting.deadline))
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

const formatDeadline = (deadline: string, language: LanguageMode) =>
  new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadline));

export default function SimulatorPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = useCallback((ko: string, en: string) => (isEn ? en : ko), [isEn]);

  const [userName, setUserName] = useState(t("지원자", "Applicant"));
  const [stage, setStage] = useState<"jobs" | "docs" | "essay" | "interview" | "result">("jobs");
  const [activePosting, setActivePosting] = useState<VirtualPosting | null>(null);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [docPassCandidates, setDocPassCandidates] = useState<Candidate[]>([]);
  const [essayAnswer, setEssayAnswer] = useState("");
  const [essaySubmitted, setEssaySubmitted] = useState(false);
  const [interviewPlan, setInterviewPlan] = useState<InterviewPlan | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [answer, setAnswer] = useState("");
  const [interviewEval, setInterviewEval] = useState<InterviewEval | null>(null);
  const [finalHires, setFinalHires] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [virtualPostings, setVirtualPostings] = useState<VirtualPosting[]>([]);
  const [postingsLoading, setPostingsLoading] = useState(true);
  const [postingsMessage, setPostingsMessage] = useState("");
  const [postingsSource, setPostingsSource] = useState<"ai_generated" | "template_fallback" | "">("");
  const [postingsGeneratedAt, setPostingsGeneratedAt] = useState("");

  useEffect(() => {
    setUserName((prev) => prev || t("지원자", "Applicant"));
  }, [t]);

  const sourceLabel = (source: typeof postingsSource) => {
    if (source === "ai_generated") return t("AI 생성 가상 공고", "AI-generated mock postings");
    if (source === "template_fallback") return t("기본 템플릿 공고", "Template fallback postings");
    return t("생성 중", "Generating");
  };

  const loadProfileSummary = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return { profileSummary: "", targetRole: "" };

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { profileSummary: "", targetRole: "" };

    const { data } = await supabase
      .from("profiles")
      .select("target_role, preferred_location, core_skills, tech_stack, major, project_count, internship_count")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const profile = (data ?? null) as ProfileSummary | null;
    if (!profile) return { profileSummary: "", targetRole: "" };

    const profileSummary = [
      `${t("희망직무", "Target role")}: ${profile.target_role ?? ""}`,
      `${t("희망지역", "Preferred location")}: ${profile.preferred_location ?? ""}`,
      `${t("전공", "Major")}: ${profile.major ?? ""}`,
      `${t("핵심스킬", "Core skills")}: ${profile.core_skills ?? ""}`,
      `${t("기술스택", "Tech stack")}: ${profile.tech_stack ?? ""}`,
      `${t("프로젝트", "Projects")}: ${profile.project_count ?? 0}`,
      `${t("인턴", "Internships")}: ${profile.internship_count ?? 0}`,
    ].join(" | ");

    return { profileSummary, targetRole: profile.target_role ?? "" };
  }, [t]);

  const loadVirtualPostings = useCallback(async () => {
    setPostingsLoading(true);
    setPostingsMessage("");

    const { profileSummary, targetRole } = await loadProfileSummary();
    const res = await fetch(`/api/simulator?ts=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "postings",
        language,
        profileSummary,
        targetRole,
      }),
    });
    const json = await res.json();
    setPostingsLoading(false);

    if (!res.ok) {
      setVirtualPostings([]);
      setPostingsMessage(json.error ?? t("가상 공고 생성에 실패했습니다.", "Failed to generate mock postings."));
      return;
    }

    const items = Array.isArray(json.items) ? openPostingsOnly(json.items as VirtualPosting[]) : [];
    setVirtualPostings(items);
    setPostingsSource(json.source ?? "");
    setPostingsGeneratedAt(json.generatedAt ?? "");
    setPostingsMessage(
      items.length > 0
        ? ""
        : t("현재 열려 있는 가상 공고가 없습니다. 새로 생성해 주세요.", "No open mock postings are available. Generate a new set."),
    );
  }, [language, loadProfileSummary, t]);

  useEffect(() => {
    void loadVirtualPostings();
  }, [loadVirtualPostings]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVirtualPostings((prev) => openPostingsOnly(prev));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const interviewSignalLabel = useMemo(() => {
    return {
      strong_hire: t("강력 추천", "Strong Hire"),
      proceed: t("다음 라운드 진행", "Proceed"),
      hold: t("보류", "Hold"),
      reject: t("불합격 권고", "Reject"),
    } as const;
  }, [t]);

  const fetchUserName = async () => {
    if (!supabase || !isSupabaseConfigured) return userName;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return userName;
    const profileName = user.user_metadata?.full_name as string | undefined;
    const emailName = user.email?.split("@")[0];
    const nextName = profileName || emailName || t("지원자", "Applicant");
    setUserName(nextName);
    return nextName;
  };

  const applyToPosting = async (posting: VirtualPosting) => {
    if (!isPostingOpen(posting.deadline)) {
      setVirtualPostings((prev) => openPostingsOnly(prev));
      void loadVirtualPostings();
      setMessage(t("마감된 공고입니다. 다른 공고를 선택해 주세요.", "This posting is closed. Please choose another one."));
      return;
    }

    const currentUserName = await fetchUserName();
    setMessage("");

    const humanApplicants = Math.max(0, Math.min(MAX_CAPACITY - 1, posting.humanApplicants));
    const aiCount = MAX_CAPACITY - (humanApplicants + 1);

    const candidates: Candidate[] = [
      {
        id: "user-0",
        name: currentUserName || userName || t("지원자", "Applicant"),
        kind: "user",
        resumeScore: randomInt(65, 88),
        essayScore: 0,
        interviewScore: 0,
        totalScore: 0,
      },
    ];

    for (let i = 0; i < humanApplicants; i++) {
      candidates.push({
        id: `human-${i + 1}`,
        name: isEn ? `Applicant_${i + 1}` : `지원자_${i + 1}`,
        kind: "human",
        resumeScore: randomInt(55, 90),
        essayScore: randomInt(48, 90),
        interviewScore: randomInt(45, 90),
        totalScore: 0,
      });
    }

    for (let i = 0; i < aiCount; i++) {
      candidates.push({
        id: `ai-${i + 1}`,
        name: genAiName(i),
        kind: "ai",
        resumeScore: randomInt(50, 86),
        essayScore: randomInt(45, 85),
        interviewScore: randomInt(40, 85),
        totalScore: 0,
      });
    }

    const sorted = [...candidates].sort((a, b) => b.resumeScore - a.resumeScore);
    const docPass = sorted.slice(0, 5);

    setActivePosting(posting);
    setAllCandidates(candidates);
    setDocPassCandidates(docPass);
    setEssayAnswer("");
    setEssaySubmitted(false);
    setInterviewPlan(null);
    setInterviewEval(null);
    setStage("docs");
    setMessage(
      t(
        `${posting.title.ko} 참여 신청 완료. 전형을 시작합니다. (서류 합격: ${docPass.length}/${MAX_CAPACITY})`,
        `${posting.title.en} application submitted. Process started. (Document pass: ${docPass.length}/${MAX_CAPACITY})`,
      ),
    );
  };

  const startInterview = async () => {
    if (!activePosting) return;
    setLoading(true);
    setMessage("");
    setTimeLeft(120);
    setAnswer("");
    setInterviewEval(null);
    setSubmitted(false);

    const res = await fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "question",
        targetRole: isEn ? activePosting.role.en : activePosting.role.ko,
        level: isEn ? "junior" : "주니어",
        language,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error ?? t("면접 질문 생성에 실패했습니다.", "Failed to generate interview question."));
      return;
    }

    setInterviewPlan({
      question: String(json.question ?? ""),
      rubric: Array.isArray(json.rubric) ? json.rubric.map(String) : [],
      followUps: Array.isArray(json.followUps) ? json.followUps.map(String) : [],
      expectedSignals: Array.isArray(json.expectedSignals) ? json.expectedSignals.map(String) : [],
      timeLimitSec: typeof json.timeLimitSec === "number" ? json.timeLimitSec : 120,
    });
    setTimeLeft(typeof json.timeLimitSec === "number" ? json.timeLimitSec : 120);
    setStage("interview");
  };

  const submitEssayAndMoveToInterview = async () => {
    if (!activePosting) return;
    const trimmed = essayAnswer.trim();
    if (trimmed.length < 120) {
      setMessage(t("자소서는 120자 이상 작성해 주세요.", "Please write at least 120 characters."));
      return;
    }

    const estimatedScore = Math.max(40, Math.min(95, Math.round(55 + Math.min(40, trimmed.length / 20))));
    const updated = docPassCandidates.map((candidate) => {
      if (candidate.kind !== "user") return candidate;
      return { ...candidate, essayScore: estimatedScore };
    });
    setDocPassCandidates(updated);
    setEssaySubmitted(true);
    setMessage(
      t(
        `자소서 제출 완료 (평가 점수: ${estimatedScore}점). 면접을 시작합니다.`,
        `Essay submitted (score: ${estimatedScore}). Starting interview stage.`,
      ),
    );

    await startInterview();
  };

  const evaluateInterview = async (autoSubmit = false) => {
    if (!activePosting || submitted || !interviewPlan) return;

    if (!answer.trim()) {
      if (autoSubmit) {
        setMessage(t("시간 종료로 빈 답변이 자동 제출되었습니다.", "Time is up. Empty answer was auto-submitted."));
      } else {
        setMessage(t("면접 답변을 입력해 주세요.", "Please enter your interview answer."));
        return;
      }
    }

    if (loading) return;

    setSubmitted(true);
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "evaluate",
        targetRole: isEn ? activePosting.role.en : activePosting.role.ko,
        question: interviewPlan.question,
        rubric: interviewPlan.rubric,
        answer,
        language,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error ?? t("면접 평가에 실패했습니다.", "Failed to evaluate interview answer."));
      return;
    }

    setInterviewEval(json as InterviewEval);

    const updatedFinalists = docPassCandidates.map((candidate) => {
      if (candidate.kind === "user") {
        const total = Math.round(candidate.resumeScore * 0.4 + candidate.essayScore * 0.2 + (json.score as number) * 0.4);
        return { ...candidate, interviewScore: json.score as number, totalScore: total };
      }
      const total = Math.round(candidate.resumeScore * 0.4 + candidate.essayScore * 0.2 + candidate.interviewScore * 0.4);
      return { ...candidate, totalScore: total };
    });

    const ranked = [...updatedFinalists].sort((a, b) => b.totalScore - a.totalScore);
    const hireCount = ranked.length > 1 && ranked[0].totalScore - ranked[1].totalScore < 4 ? 2 : 1;

    setFinalHires(ranked.slice(0, hireCount));
    setDocPassCandidates(updatedFinalists);
    setStage("result");
  };

  useEffect(() => {
    if (stage !== "interview" || submitted || !interviewPlan) return;
    let autoSubmitted = false;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!autoSubmitted) {
            autoSubmitted = true;
            setTimeout(() => {
              void evaluateInterview(true);
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, submitted, interviewPlan]);

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">AI Process Simulator</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("가상 채용 도전", "Mock Hiring Challenge")}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {t(
              "공고와 마감일은 플랫폼이 설정합니다. 원하는 공고를 선택해 실전처럼 전형을 진행해 보세요.",
              "Postings and deadlines are platform-defined. Choose one and run through a realistic hiring flow.",
            )}
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/" className="secondary-btn px-3 py-2 text-sm">
              {t("홈", "Home")}
            </Link>
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              {t("대시보드", "Dashboard")}
            </Link>
          </div>

          {stage === "jobs" && (
            <div className="mt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t("AI 가상 공고 목록", "AI Mock Posting List")}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {sourceLabel(postingsSource)} · {t("마감된 공고는 자동 제외됩니다.", "Closed postings are removed automatically.")}
                    {postingsGeneratedAt ? ` · ${new Date(postingsGeneratedAt).toLocaleString(isEn ? "en-US" : "ko-KR")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadVirtualPostings()}
                  disabled={postingsLoading}
                  className="secondary-btn px-3 py-2 text-sm disabled:opacity-60"
                >
                  {postingsLoading ? t("생성 중...", "Generating...") : t("새 가상 공고 생성", "Generate new postings")}
                </button>
              </div>

              {postingsLoading && (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {t("실전형 가상 공고를 생성하는 중입니다...", "Generating realistic mock postings...")}
                </p>
              )}

              {!postingsLoading && postingsMessage && (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{postingsMessage}</p>
              )}

              {!postingsLoading && virtualPostings.length > 0 && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {virtualPostings.map((posting) => {
                    const aiFill = Math.max(0, MAX_CAPACITY - Math.min(MAX_CAPACITY, posting.humanApplicants + 1));
                    return (
                      <div key={posting.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{isEn ? posting.title.en : posting.title.ko}</p>
                            <p className="text-xs text-slate-600">
                              {posting.company} · {isEn ? posting.location.en : posting.location.ko}
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            {t("모집중", "Open")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{isEn ? posting.description.en : posting.description.ko}</p>
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          <div className="rounded-md bg-slate-50 p-2 text-slate-700">
                            {t("마감일", "Deadline")}: {formatDeadline(posting.deadline, language)}
                          </div>
                          <div className="rounded-md bg-slate-50 p-2 text-slate-700">
                            {t("경쟁 풀", "Candidate pool")}: {MAX_CAPACITY}
                            {t("명", " applicants")} ({t("현재 지원자", "Current applicants")} {posting.humanApplicants}
                            {t("명, AI 보정", ", AI fillers")} {aiFill}
                            {t("명", "")})
                          </div>
                        </div>
                        {posting.requirements.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-slate-900">{t("요구사항", "Requirements")}</p>
                            <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                              {posting.requirements.map((item) => (
                                <li key={`${posting.id}-req-${item.ko}-${item.en}`}>{isEn ? item.en : item.ko}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {posting.screeningFocus.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {posting.screeningFocus.map((item) => (
                              <span key={`${posting.id}-focus-${item.ko}-${item.en}`} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                                {isEn ? item.en : item.ko}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => void applyToPosting(posting)}
                          className="primary-btn mt-3 px-4 py-2 text-sm"
                        >
                          {t("참여 신청", "Apply")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {stage === "docs" && activePosting && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{t("1단계. 서류 전형", "Stage 1. Document Screening")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("공고", "Posting")}: {isEn ? activePosting.title.en : activePosting.title.ko} | {t("마감일", "Deadline")}: {formatDeadline(activePosting.deadline, language)} | {t("모집 풀", "Candidate pool")}: {MAX_CAPACITY}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {allCandidates
                  .slice()
                  .sort((a, b) => b.resumeScore - a.resumeScore)
                  .map((candidate) => (
                    <div key={candidate.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-900">
                        {candidate.name} {candidate.kind === "user" ? `(${t("나", "Me")})` : candidate.kind === "ai" ? "(AI)" : ""}
                      </p>
                      <p className="text-slate-600">
                        {t("서류 점수", "Document score")}: {candidate.resumeScore}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                {t("면접 진출자", "Interview finalists")}: {docPassCandidates.map((c) => c.name).join(", ")}
              </div>
              <button
                onClick={() => {
                  setStage("essay");
                  setMessage("");
                }}
                className="primary-btn mt-3 px-4 py-2 text-sm"
              >
                {t("2단계 자소서 작성", "Proceed to Stage 2: Essay")}
              </button>
            </div>
          )}

          {stage === "essay" && activePosting && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{t("2단계. 자소서 제출", "Stage 2. Essay Submission")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  `문항: ${activePosting.company} ${activePosting.role.ko} 직무에 지원한 이유와 본인의 강점을 작성해 주세요. (최소 120자)`,
                  `Prompt: Why are you applying to the ${activePosting.role.en} role at ${activePosting.company}, and what are your key strengths? (minimum 120 chars)`,
                )}
              </p>
              <textarea
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                className="field mt-3 min-h-36"
                placeholder={t("지원 동기, 직무 역량, 프로젝트 경험을 중심으로 작성해 주세요.", "Focus on motivation, role fit, and project evidence.")}
                disabled={loading || essaySubmitted}
              />
              <p className="mt-1 text-xs text-slate-500">
                {t("현재 글자 수", "Current length")}: {essayAnswer.trim().length}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={submitEssayAndMoveToInterview}
                  disabled={loading || essaySubmitted}
                  className="primary-btn px-4 py-2 text-sm disabled:opacity-60"
                >
                  {loading ? t("다음 단계 준비 중...", "Preparing next stage...") : t("자소서 제출 후 면접 시작", "Submit essay and start interview")}
                </button>
                <button type="button" onClick={() => setStage("docs")} className="secondary-btn px-4 py-2 text-sm">
                  {t("이전 단계", "Back")}
                </button>
              </div>
            </div>
          )}

          {stage === "interview" && activePosting && interviewPlan && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{t("3단계. AI 면접", "Stage 3. AI Interview")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {t("직무", "Role")}: {isEn ? activePosting.role.en : activePosting.role.ko} | {t("남은 시간", "Time left")}: {timeLeft}
                {t("초 (0초 시 자동 제출)", " sec (auto-submit at 0)")}
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{t("핵심 질문", "Primary Question")}</p>
                <p className="mt-1 text-sm text-slate-700">{interviewPlan.question}</p>

                {interviewPlan.followUps.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("후속 질문", "Follow-ups")}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                      {interviewPlan.followUps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}

                {interviewPlan.rubric.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("평가 루브릭", "Rubric")}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                      {interviewPlan.rubric.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </>
                )}

                {interviewPlan.expectedSignals.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t("면접관 기대 시그널", "Expected Signals")}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {interviewPlan.expectedSignals.map((s) => (
                        <span key={s} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="field mt-3 min-h-32"
                placeholder={t("면접 답변을 입력해 주세요.", "Write your interview answer here.")}
                disabled={loading || submitted}
              />
              <button
                onClick={() => void evaluateInterview(false)}
                disabled={loading || submitted}
                className="primary-btn mt-3 px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? t("평가 중...", "Evaluating...") : t("답변 제출", "Submit Answer")}
              </button>
            </div>
          )}

          {stage === "result" && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{t("4단계. 최종 결과", "Stage 4. Final Result")}</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {docPassCandidates
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((candidate, idx) => (
                    <div key={candidate.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-900">
                        {idx + 1}. {candidate.name} {candidate.kind === "user" ? `(${t("나", "Me")})` : candidate.kind === "ai" ? "(AI)" : ""}
                      </p>
                      <p className="text-slate-600">
                        {t("서류", "Docs")} {candidate.resumeScore} / {t("자소서", "Essay")} {candidate.essayScore} / {t("면접", "Interview")} {candidate.interviewScore} / {t("종합", "Total")} {candidate.totalScore}
                      </p>
                    </div>
                  ))}
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {t("최종 합격(1~2명)", "Final selected (1-2)")}: {finalHires.map((c) => c.name).join(", ")}
              </div>

              {interviewEval && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-900">
                    {t("내 면접 점수", "Interview score")}: {interviewEval.score}
                  </p>
                  <p className="mt-1 text-slate-700">{interviewEval.summary}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {t("채용 시그널", "Hiring Signal")}: {interviewSignalLabel[interviewEval.hiringSignal]}
                  </p>

                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-2 text-slate-700">{t("문제 해결", "Problem Solving")}: {interviewEval.categoryScores.problemSolving}</div>
                    <div className="rounded-md bg-slate-50 p-2 text-slate-700">{t("기술 깊이", "Technical Depth")}: {interviewEval.categoryScores.technicalDepth}</div>
                    <div className="rounded-md bg-slate-50 p-2 text-slate-700">{t("커뮤니케이션", "Communication")}: {interviewEval.categoryScores.communication}</div>
                    <div className="rounded-md bg-slate-50 p-2 text-slate-700">{t("성과 임팩트", "Impact")}: {interviewEval.categoryScores.impact}</div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t("강점", "Strengths")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {interviewEval.strengths.map((s) => (
                          <li key={`s-${s}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t("보완점", "Improvements")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {interviewEval.improvements.map((i) => (
                          <li key={`i-${i}`}>{i}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{t("다음 액션", "Next Actions")}</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                        {interviewEval.nextStepAdvice.map((a) => (
                          <li key={`a-${a}`}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setStage("jobs");
                  setActivePosting(null);
                }}
                className="secondary-btn mt-3 px-4 py-2 text-sm"
                type="button"
              >
                {t("공고 목록으로 돌아가기", "Back to posting list")}
              </button>
            </div>
          )}

          {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
