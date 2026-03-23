"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type Candidate = {
  id: string;
  name: string;
  kind: "user" | "human" | "ai";
  resumeScore: number;
  essayScore: number;
  interviewScore: number;
  totalScore: number;
};

type InterviewEval = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
};

type VirtualPosting = {
  id: string;
  title: string;
  company: string;
  role: string;
  location: string;
  deadline: string;
  humanApplicants: number;
  description: string;
};

const MAX_CAPACITY = 10;

const VIRTUAL_POSTINGS: VirtualPosting[] = [
  {
    id: "vh-samsung-01",
    title: "소프트웨어 엔지니어 (DX 부문)",
    company: "삼성전자",
    role: "소프트웨어 엔지니어",
    location: "서울",
    deadline: "2026-03-28T23:59:59+09:00",
    humanApplicants: 7,
    description: "대규모 소비자 서비스 및 내부 시스템을 위한 플랫폼 소프트웨어 개발 포지션입니다.",
  },
  {
    id: "vh-google-01",
    title: "어소시에이트 소프트웨어 엔지니어",
    company: "Google",
    role: "백엔드 엔지니어",
    location: "서울 / 원격 하이브리드",
    deadline: "2026-03-24T23:59:59+09:00",
    humanApplicants: 5,
    description: "확장 가능한 백엔드 개발, 데이터 기반 제품 개선, 크로스팀 협업 중심 역할입니다.",
  },
  {
    id: "vh-startup-01",
    title: "초기 프론트엔드 엔지니어",
    company: "국내 IT 스타트업 (Stealth)",
    role: "프론트엔드 개발자",
    location: "서울",
    deadline: "2026-03-20T23:59:59+09:00",
    humanApplicants: 6,
    description: "MVP부터 운영까지 프론트엔드 아키텍처를 주도하며 빠르게 기능을 출시하는 포지션입니다.",
  },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const genAiName = (idx: number) => {
  const prefix = ["Mina", "Jiwon", "Suhyeon", "Yujin", "Doyun", "Harin", "Junseo", "Chaewon", "Hyunwoo", "Nayeon"];
  return `${prefix[idx % prefix.length]}_AI_${idx + 1}`;
};

const isPostingClosed = (deadline: string) => new Date(deadline).getTime() < Date.now();

const formatDeadline = (deadline: string) =>
  new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(deadline),
  );

export default function SimulatorPage() {
  const { tx } = useLanguage();
  const [userName, setUserName] = useState("지원자");
  const [stage, setStage] = useState<"jobs" | "docs" | "essay" | "interview" | "result">("jobs");
  const [activePosting, setActivePosting] = useState<VirtualPosting | null>(null);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [docPassCandidates, setDocPassCandidates] = useState<Candidate[]>([]);
  const [essayAnswer, setEssayAnswer] = useState("");
  const [essaySubmitted, setEssaySubmitted] = useState(false);
  const [question, setQuestion] = useState("");
  const [rubric, setRubric] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [answer, setAnswer] = useState("");
  const [interviewEval, setInterviewEval] = useState<InterviewEval | null>(null);
  const [finalHires, setFinalHires] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const fetchUserName = async () => {
    if (!supabase || !isSupabaseConfigured) return userName;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return userName;
    const profileName = user.user_metadata?.full_name as string | undefined;
    const emailName = user.email?.split("@")[0];
    const nextName = profileName || emailName || tx("지원자", "Applicant");
    setUserName(nextName);
    return nextName;
  };

  const applyToPosting = async (posting: VirtualPosting) => {
    if (isPostingClosed(posting.deadline)) {
      setMessage(tx("마감된 공고입니다. 다른 공고를 선택해 주세요.", "This posting is closed. Please choose another one."));
      return;
    }

    const currentUserName = await fetchUserName();
    setMessage("");

    const humanApplicants = Math.max(0, Math.min(MAX_CAPACITY - 1, posting.humanApplicants));
    const aiCount = MAX_CAPACITY - (humanApplicants + 1);

    const candidates: Candidate[] = [
      {
        id: "user-0",
        name: currentUserName || userName || tx("지원자", "Applicant"),
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
        name: `${tx("지원자", "Applicant")}_${i + 1}`,
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
    setStage("docs");
    setMessage(
      tx(
        `${posting.title} 참여 신청 완료. 이제 전형이 시작됩니다. (서류 합격: ${docPass.length}/${MAX_CAPACITY})`,
        `Application submitted for ${posting.title}. The process starts now. (Document pass: ${docPass.length}/${MAX_CAPACITY})`,
      ),
    );
  };

  const startInterview = async () => {
    if (!activePosting) return;
    setLoading(true);
    setMessage("");
    setTimeLeft(90);
    setAnswer("");
    setInterviewEval(null);
    setSubmitted(false);

    const res = await fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "question",
        targetRole: activePosting.role,
        level: "junior",
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error ?? tx("면접 질문 생성에 실패했습니다.", "Failed to generate interview question."));
      return;
    }

    setQuestion(json.question);
    setRubric(json.rubric ?? []);
    setTimeLeft(json.timeLimitSec ?? 90);
    setStage("interview");
  };

  const submitEssayAndMoveToInterview = async () => {
    if (!activePosting) return;
    const trimmed = essayAnswer.trim();
    if (trimmed.length < 120) {
      setMessage(tx("자소서는 120자 이상 작성해 주세요.", "Please write at least 120 characters for the essay."));
      return;
    }

    const estimatedScore = Math.max(40, Math.min(95, Math.round(55 + Math.min(40, trimmed.length / 20))));
    const updated = docPassCandidates.map((candidate) => {
      if (candidate.kind !== "user") return candidate;
      return { ...candidate, essayScore: estimatedScore };
    });
    setDocPassCandidates(updated);
    setEssaySubmitted(true);
    setMessage(tx(`자소서 제출 완료 (평가 점수: ${estimatedScore}점). 면접을 시작합니다.`, `Essay submitted (score: ${estimatedScore}). Starting interview.`));

    await startInterview();
  };

  const evaluateInterview = async (autoSubmit = false) => {
    if (!activePosting || submitted) return;

    if (!question || !answer.trim()) {
      if (autoSubmit) {
        setMessage(tx("시간이 종료되어 빈 답변으로 자동 제출되었습니다.", "Time is up. Auto-submitted with an empty answer."));
      } else {
        setMessage(tx("면접 답변을 입력해 주세요.", "Please enter an interview answer."));
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
        targetRole: activePosting.role,
        question,
        answer,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.error ?? tx("면접 평가에 실패했습니다.", "Interview evaluation failed."));
      return;
    }

    setInterviewEval(json);

    const updatedFinalists = docPassCandidates.map((candidate) => {
      if (candidate.kind === "user") {
        const total = Math.round(candidate.resumeScore * 0.45 + candidate.essayScore * 0.2 + json.score * 0.35);
        return { ...candidate, interviewScore: json.score, totalScore: total };
      }
      const total = Math.round(candidate.resumeScore * 0.45 + candidate.essayScore * 0.2 + candidate.interviewScore * 0.35);
      return { ...candidate, totalScore: total };
    });

    const ranked = [...updatedFinalists].sort((a, b) => b.totalScore - a.totalScore);
    const hireCount = ranked.length > 1 && ranked[0].totalScore - ranked[1].totalScore < 4 ? 2 : 1;

    setFinalHires(ranked.slice(0, hireCount));
    setDocPassCandidates(updatedFinalists);
    setStage("result");
  };

  useEffect(() => {
    if (stage !== "interview" || submitted) return;
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
  }, [stage, submitted]);

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">AI Process Simulator</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{tx("가상 채용 도전", "Virtual hiring challenge")}</h1>
          <p className="mt-2 text-sm text-slate-600">{tx("공고와 마감일은 플랫폼이 설정합니다. 사용자는 원하는 공고를 선택해 지원만 진행합니다.", "Postings and deadlines are configured by the platform. You choose and apply to the posting you want.")}</p>

          <div className="mt-4 flex gap-2">
            <Link href="/" className="secondary-btn px-3 py-2 text-sm">
              {tx("홈", "Home")}
            </Link>
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              {tx("대시보드", "Dashboard")}
            </Link>
          </div>

          {stage === "jobs" && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{tx("가상 공고 목록", "Virtual posting list")}</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {VIRTUAL_POSTINGS.map((posting) => {
                  const closed = isPostingClosed(posting.deadline);
                  const aiFill = Math.max(0, MAX_CAPACITY - Math.min(MAX_CAPACITY, posting.humanApplicants));
                  return (
                    <div key={posting.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{posting.title}</p>
                          <p className="text-xs text-slate-600">
                            {posting.company} · {posting.location}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            closed ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {closed ? tx("마감", "Closed") : tx("모집중", "Open")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{posting.description}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {tx("마감일", "Deadline")}: {formatDeadline(posting.deadline)} | {tx("전체", "Total")}: {MAX_CAPACITY}{tx("명", "")} ({tx("현재 신청자", "Current applicants")} {posting.humanApplicants}{tx("명", "")}, AI {tx("보정", "adjusted")} {aiFill}{tx("명", "")})
                      </p>
                      <button
                        type="button"
                        onClick={() => void applyToPosting(posting)}
                        disabled={closed}
                        className="primary-btn mt-3 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {closed ? tx("마감됨", "Closed") : tx("참여 신청", "Apply")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stage === "docs" && activePosting && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{tx("1단계. 서류 전형", "Step 1. Document screening")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                공고: {activePosting.title} | 마감일: {formatDeadline(activePosting.deadline)} | 모집 풀: {MAX_CAPACITY}명
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {allCandidates
                  .slice()
                  .sort((a, b) => b.resumeScore - a.resumeScore)
                  .map((candidate) => (
                    <div key={candidate.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-900">
                        {candidate.name} {candidate.kind === "user" ? "(나)" : candidate.kind === "ai" ? "(AI)" : ""}
                      </p>
                      <p className="text-slate-600">{tx("서류 점수", "Document score")}: {candidate.resumeScore}</p>
                    </div>
                  ))}
              </div>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                {tx("면접 진출자", "Interview finalists")}: {docPassCandidates.map((c) => c.name).join(", ")}
              </div>
              <button
                onClick={() => {
                  setStage("essay");
                  setMessage("");
                }}
                className="primary-btn mt-3 px-4 py-2 text-sm"
              >
                {tx("2단계 자소서 작성", "Step 2 Essay writing")}
              </button>
            </div>
          )}

          {stage === "essay" && activePosting && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{tx("2단계. 자소서 제출", "Step 2. Essay submission")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {tx("문항", "Prompt")}: {tx(`${activePosting.company} ${activePosting.role} 직무에 지원한 이유와 본인의 강점을 작성해 주세요. (최소 120자)`, `Explain why you applied for the ${activePosting.role} role at ${activePosting.company} and your strengths. (Minimum 120 characters)`)}
              </p>
              <textarea
                value={essayAnswer}
                onChange={(e) => setEssayAnswer(e.target.value)}
                className="field mt-3 min-h-36"
                placeholder={tx("지원 동기, 직무 역량, 프로젝트 경험을 중심으로 작성해 주세요.", "Focus on motivation, role competency, and project experience.")}
                disabled={loading || essaySubmitted}
              />
              <p className="mt-1 text-xs text-slate-500">{tx("현재 글자 수", "Current character count")}: {essayAnswer.trim().length}{tx("자", "")}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={submitEssayAndMoveToInterview} disabled={loading || essaySubmitted} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                  {loading ? tx("다음 단계 준비 중...", "Preparing next step...") : tx("자소서 제출 후 면접 시작", "Submit essay and start interview")}
                </button>
                <button type="button" onClick={() => setStage("docs")} className="secondary-btn px-4 py-2 text-sm">
                  {tx("이전 단계", "Previous step")}
                </button>
              </div>
            </div>
          )}

          {stage === "interview" && activePosting && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{tx("3단계. 면접", "Step 3. Interview")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {tx("직무", "Role")}: {activePosting.role} | {tx("남은 시간", "Time left")}: {timeLeft}{tx("초", " sec")} ({tx("0초 시 자동 제출", "Auto-submit at 0 sec")})
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{tx("AI 면접 질문", "AI interview question")}</p>
                <p className="mt-1 text-sm text-slate-700">{question}</p>
                {rubric.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                    {rubric.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="field mt-3 min-h-32"
                placeholder={tx("면접 답변을 입력해 주세요.", "Enter your interview answer.")}
                disabled={loading || submitted}
              />
              <button
                onClick={() => void evaluateInterview(false)}
                disabled={loading || submitted}
                className="primary-btn mt-3 px-4 py-2 text-sm disabled:opacity-60"
              >
                {loading ? tx("평가 중...", "Evaluating...") : tx("답변 제출", "Submit answer")}
              </button>
            </div>
          )}

          {stage === "result" && (
            <div className="mt-5">
              <h2 className="text-lg font-semibold text-slate-900">{tx("4단계. 최종 결과", "Step 4. Final result")}</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {docPassCandidates
                  .slice()
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((candidate, idx) => (
                    <div key={candidate.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-900">
                        {idx + 1}. {candidate.name} {candidate.kind === "user" ? "(나)" : candidate.kind === "ai" ? "(AI)" : ""}
                      </p>
                      <p className="text-slate-600">
                        {tx("서류", "Doc")} {candidate.resumeScore} / {tx("자소서", "Essay")} {candidate.essayScore} / {tx("면접", "Interview")} {candidate.interviewScore} / {tx("종합", "Total")} {candidate.totalScore}
                      </p>
                    </div>
                  ))}
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {tx("최종 합격(1~2명)", "Final hires (1-2)")}: {finalHires.map((c) => c.name).join(", ")}
              </div>

              {interviewEval && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-semibold text-slate-900">{tx("내 면접 점수", "My interview score")}: {interviewEval.score}{tx("점", "")}</p>
                  <p className="mt-1 text-slate-700">{interviewEval.summary}</p>
                  <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                    {interviewEval.strengths.map((s) => (
                      <li key={`s-${s}`}>{tx("강점", "Strength")}: {s}</li>
                    ))}
                    {interviewEval.improvements.map((i) => (
                      <li key={`i-${i}`}>{tx("보완점", "Improvement")}: {i}</li>
                    ))}
                  </ul>
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
                {tx("공고 목록으로 돌아가기", "Back to posting list")}
              </button>
            </div>
          )}

          {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
