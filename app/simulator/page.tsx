"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";

import { useLanguage } from "@/components/language-provider";

type InterviewPhase = "intro" | "behavioral" | "technical" | "followup" | "summary";

type InterviewQuestion = {
  phase: Extract<InterviewPhase, "behavioral" | "technical">;
  questionKo: string;
  questionEn: string;
  rubricKo: string[];
  rubricEn: string[];
};

type EvaluationResult = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  categoryScores?: {
    problemSolving?: number;
    technicalDepth?: number;
    communication?: number;
    impact?: number;
  };
  hiringSignal?: string;
  nextStepAdvice?: string[];
};

type HistoryItem = {
  question: string;
  answer: string;
  result: EvaluationResult;
  timestamp: string;
};

const interviewQuestions: InterviewQuestion[] = [
  {
    phase: "behavioral",
    questionKo: "제한된 가이드만 있는 모호한 문제를 해결했던 프로젝트를 설명해 주세요.",
    questionEn: "Tell me about a project where you had to solve an ambiguous problem with limited guidance.",
    rubricKo: ["상황", "오너십", "행동", "결과"],
    rubricEn: ["Situation", "Ownership", "Action", "Result"],
  },
  {
    phase: "technical",
    questionKo: "최근 내린 기술적 결정을 설명해 주세요. 어떤 트레이드오프를 고려했나요?",
    questionEn: "Describe a technical decision you made recently. What trade-offs did you consider?",
    rubricKo: ["기술 깊이", "트레이드오프", "추론", "임팩트"],
    rubricEn: ["Technical depth", "Trade-offs", "Reasoning", "Impact"],
  },
  {
    phase: "behavioral",
    questionKo: "어려운 피드백을 받았을 때 어떻게 대응했는지 말해 주세요.",
    questionEn: "Tell me about a time you received difficult feedback and how you responded.",
    rubricKo: ["자기 인식", "학습", "커뮤니케이션", "결과"],
    rubricEn: ["Self-awareness", "Learning", "Communication", "Outcome"],
  },
  {
    phase: "technical",
    questionKo: "사용자가 간헐적으로 보고하는 프로덕션 이슈를 어떻게 디버깅할지 설명해 주세요.",
    questionEn: "Walk me through how you would debug a production issue that users are reporting intermittently.",
    rubricKo: ["디버깅 과정", "우선순위", "관측 가능성", "재발 방지"],
    rubricEn: ["Debugging process", "Prioritization", "Observability", "Prevention"],
  },
];

const copy = {
  ko: {
    eyebrow: "면접 시뮬레이터",
    title: "실전 면접 세션을 연습하세요",
    description: "질문, 답변, API 기반 평가, 후속 질문, 세션 요약으로 이어지는 구조화된 면접 루프입니다.",
    dashboard: "대시보드",
    reset: "세션 초기화",
    livePractice: "실시간 연습",
    notStarted: "미시작",
    ready: "면접 준비 양호",
    nearly: "거의 준비됨",
    needs: "연습 필요",
    heroTitle: "압박감을 시뮬레이션하고 답변의 신호를 선명하게 만드세요.",
    heroBody: "평가는 서버 API를 통해 진행되며, 답변의 구조, 근거, 기술 깊이, 임팩트를 현실적으로 점검합니다.",
    sessionScore: "세션 점수",
    answered: "답변 수",
    currentQuestion: "현재 질문",
    rubric: "평가 기준",
    phase: "단계",
    questionBank: "질문 은행",
    mode: "평가 방식",
    modeValue: "API 기반 평가",
    differentQuestion: "다른 질문",
    answerWorkspace: "답변 작성",
    answerWorkspaceDesc: "답변을 작성하고 평가한 뒤 후속 질문으로 이어가세요.",
    yourAnswer: "내 답변",
    placeholder: "상황, 내 역할, 행동, 결과, 정량적 임팩트를 포함해 작성하세요.",
    evaluate: "답변 평가",
    evaluating: "평가 중...",
    answerFollowup: "후속 질문 답하기",
    evaluation: "평가 결과",
    evaluationDesc: "답변 내용 기반의 구조화 평가입니다.",
    emptyEval: "답변을 작성하고 평가하면 점수, 강점, 개선점이 표시됩니다.",
    score: "점수",
    strengths: "강점: ",
    improve: "개선: ",
    followup: "후속 질문",
    nextStep: "다음 단계",
    analytics: "세션 분석",
    analyticsDesc: "현재 면접 세션의 요약 신호입니다.",
    history: "최근 답변 히스토리",
    historyDesc: "이번 세션에서 평가한 최근 3개 답변입니다.",
    noHistory: "아직 평가된 답변이 없습니다. 첫 질문으로 세션을 시작하세요.",
    previous: "평가 후 이전 질문과 점수가 여기에 표시됩니다.",
    latest: "최근",
    average: "평균",
    evaluatedResponses: "평가된 답변",
    strongestHigh: "근거와 구조가 강합니다",
    strongestMid: "기본기는 좋고 임팩트 보강이 필요합니다",
    strongestLow: "더 많은 연습이 필요합니다",
    error: "평가를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    phases: {
      intro: "소개",
      behavioral: "행동",
      technical: "기술",
      followup: "후속",
      summary: "요약",
    },
    phaseDesc: {
      intro: "넓은 질문으로 시작해 맥락을 잡습니다.",
      behavioral: "오너십, 판단력, 커뮤니케이션을 보여주세요.",
      technical: "트레이드오프, 시스템 사고, 디버깅 깊이를 설명하세요.",
      followup: "근거, 제약, 회고를 더 깊게 확인합니다.",
      summary: "세션 신호를 검토하고 다음 개선점을 정합니다.",
    },
    statuses: {
      live: "진행 중",
      completed: "완료",
      queued: "대기",
    },
  },
  en: {
    eyebrow: "Interview Simulator",
    title: "Practice a realistic interview session flow.",
    description: "Move from question to answer, API-based evaluation, follow-up, and session summary.",
    dashboard: "Dashboard",
    reset: "Reset session",
    livePractice: "Live practice",
    notStarted: "Not started",
    ready: "Interview-ready",
    nearly: "Nearly ready",
    needs: "Needs practice",
    heroTitle: "Simulate the pressure, sharpen the signal.",
    heroBody: "Evaluation runs through the server API and reviews structure, evidence, technical depth, and impact realistically.",
    sessionScore: "Session score",
    answered: "Answered",
    currentQuestion: "Current question",
    rubric: "Rubric",
    phase: "Phase",
    questionBank: "Question bank",
    mode: "Mode",
    modeValue: "API evaluation",
    differentQuestion: "Different question",
    answerWorkspace: "Answer workspace",
    answerWorkspaceDesc: "Draft your response, evaluate it, then continue into the follow-up.",
    yourAnswer: "Your answer",
    placeholder: "Use situation, role, action, result, and measurable impact.",
    evaluate: "Evaluate answer",
    evaluating: "Evaluating...",
    answerFollowup: "Answer follow-up",
    evaluation: "Evaluation",
    evaluationDesc: "Structured feedback based on your actual answer.",
    emptyEval: "Write an answer and evaluate it to see score, strengths, and improvement points.",
    score: "Score",
    strengths: "Strengths: ",
    improve: "Improve: ",
    followup: "Follow-up question",
    nextStep: "Next step",
    analytics: "Session analytics",
    analyticsDesc: "Compact signals for the current interview run.",
    history: "Recent answer history",
    historyDesc: "Latest 3 evaluated answers in this session.",
    noHistory: "No answers evaluated yet. Start with the first question to build a session summary.",
    previous: "Previous questions and scores will appear here after evaluation.",
    latest: "Latest",
    average: "Average",
    evaluatedResponses: "Evaluated responses",
    strongestHigh: "Strong evidence and structured delivery",
    strongestMid: "Good baseline, keep sharpening impact",
    strongestLow: "Needs more practice",
    error: "Could not complete evaluation. Please try again.",
    phases: {
      intro: "Intro",
      behavioral: "Behavioral",
      technical: "Technical",
      followup: "Follow-up",
      summary: "Summary",
    },
    phaseDesc: {
      intro: "Start with a broad question and establish context.",
      behavioral: "Show ownership, judgment, and communication.",
      technical: "Explain trade-offs, systems thinking, and debugging depth.",
      followup: "Go deeper on evidence, constraints, and reflection.",
      summary: "Review the session signal and decide what to improve next.",
    },
    statuses: {
      live: "Live phase",
      completed: "Completed",
      queued: "Queued",
    },
  },
};

function shorten(text: string, maxLength = 96) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function answerDimensions(result: EvaluationResult | null, isEn: boolean) {
  const category = result?.categoryScores ?? {};
  return [
    { label: isEn ? "Problem solving" : "문제 해결", value: category.problemSolving ?? result?.score ?? 0 },
    { label: isEn ? "Technical depth" : "기술 깊이", value: category.technicalDepth ?? result?.score ?? 0 },
    { label: isEn ? "Communication" : "커뮤니케이션", value: category.communication ?? result?.score ?? 0 },
    { label: isEn ? "Impact" : "임팩트", value: category.impact ?? result?.score ?? 0 },
  ];
}

function getReadinessStatus(score: number, answered: number, text: typeof copy.ko | typeof copy.en) {
  if (answered === 0) return { label: text.notStarted, className: "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-strong)]" };
  if (score >= 82) return { label: text.ready, className: "border-[color-mix(in_srgb,var(--success)_42%,var(--line))] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--foreground)]" };
  if (score >= 68) return { label: text.nearly, className: "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] text-[var(--foreground)]" };
  return { label: text.needs, className: "border-[color-mix(in_srgb,var(--warning)_42%,var(--line))] bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--foreground)]" };
}

export default function SimulatorPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = copy[language];
  const phaseFlow: InterviewPhase[] = ["intro", "behavioral", "technical", "followup", "summary"];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<InterviewPhase>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(isEn ? interviewQuestions[0].questionEn : interviewQuestions[0].questionKo);
  const [currentRubric, setCurrentRubric] = useState(isEn ? interviewQuestions[0].rubricEn : interviewQuestions[0].rubricKo);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sessionStats = useMemo(() => {
    const totalAnswered = history.length;
    const latestScore = history[0]?.result.score ?? 0;
    const averageScore = totalAnswered
      ? Math.round(history.reduce((sum, item) => sum + item.result.score, 0) / totalAnswered)
      : 0;

    const readiness = getReadinessStatus(averageScore, totalAnswered, t);
    const strongestArea =
      averageScore >= 80 ? t.strongestHigh : averageScore >= 65 ? t.strongestMid : t.strongestLow;

    return { totalAnswered, latestScore, averageScore, strongestArea, readiness };
  }, [history, t]);

  const progressWidth = history.length > 0 ? Math.max(8, Math.min(100, sessionStats.averageScore)) : 0;

  const evaluate = async () => {
    const trimmed = answer.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    const evaluationKey = `${currentQuestion}::${trimmed}`;

    try {
      const response = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "evaluate",
          question: currentQuestion,
          answer: trimmed,
          targetRole: isEn ? "Software Engineer" : "소프트웨어 엔지니어",
          rubric: currentRubric,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || t.error);

      const nextResult: EvaluationResult = {
        score: data.score,
        summary: data.summary,
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        categoryScores: data.categoryScores,
        hiringSignal: data.hiringSignal,
        nextStepAdvice: Array.isArray(data.nextStepAdvice) ? data.nextStepAdvice : [],
      };
      const nextFollowUp =
        nextResult.nextStepAdvice?.[0] ??
        (isEn
          ? "What measurable outcome can you add to make this answer more credible?"
          : "이 답변을 더 신뢰감 있게 만들기 위해 어떤 정량 결과를 추가할 수 있나요?");

      setResult(nextResult);
      setFollowUpQuestion(nextFollowUp);
      setPhase((prev) => {
        if (prev === "followup") return "summary";
        if (prev === "intro") return interviewQuestions[questionIndex].phase;
        if (prev === "summary") return "behavioral";
        return prev;
      });

      if (evaluationKey !== lastEvaluatedKey) {
        setHistory((prev) => [
          { question: currentQuestion, answer: trimmed, result: nextResult, timestamp: new Date().toISOString() },
          ...prev,
        ]);
        setLastEvaluatedKey(evaluationKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  const moveToDifferentQuestion = () => {
    const nextPhase: Extract<InterviewPhase, "behavioral" | "technical"> =
      phase === "behavioral" ? "technical" : phase === "technical" ? "behavioral" : "behavioral";
    const candidates = interviewQuestions.filter((q) => q.phase === nextPhase);
    const nextQuestion = candidates[(questionIndex + 1) % candidates.length];
    const globalIndex = interviewQuestions.findIndex((q) => q.questionEn === nextQuestion.questionEn);

    setQuestionIndex(globalIndex >= 0 ? globalIndex : 0);
    setPhase(nextPhase);
    setCurrentQuestion(isEn ? nextQuestion.questionEn : nextQuestion.questionKo);
    setCurrentRubric(isEn ? nextQuestion.rubricEn : nextQuestion.rubricKo);
    setAnswer("");
    setResult(null);
    setFollowUpQuestion("");
    setLastEvaluatedKey("");
    setError("");
  };

  const answerFollowUp = () => {
    if (!followUpQuestion) return;
    setCurrentQuestion(followUpQuestion);
    setCurrentRubric(isEn ? ["Specificity", "Evidence", "Reflection", "Next action"] : ["구체성", "근거", "회고", "다음 행동"]);
    setPhase("followup");
    setAnswer("");
    setResult(null);
    setFollowUpQuestion("");
    setLastEvaluatedKey("");
    setError("");
  };

  const resetSession = () => {
    setQuestionIndex(0);
    setPhase("intro");
    setCurrentQuestion(isEn ? interviewQuestions[0].questionEn : interviewQuestions[0].questionKo);
    setCurrentRubric(isEn ? interviewQuestions[0].rubricEn : interviewQuestions[0].rubricKo);
    setAnswer("");
    setResult(null);
    setHistory([]);
    setFollowUpQuestion("");
    setLastEvaluatedKey("");
    setError("");
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <>
            <Link href="/dashboard" className="secondary-btn px-4 py-2 text-sm">{t.dashboard}</Link>
            <button type="button" onClick={resetSession} className="secondary-btn px-4 py-2 text-sm">{t.reset}</button>
          </>
        }
      />

      <section className="mb-5">
        <div className="path-route">
          {phaseFlow.map((item, index) => {
            const activeIndex = phaseFlow.indexOf(phase);
            const isActive = item === phase;
            const isComplete = index < activeIndex;
            return (
              <div key={item} className={`path-step ${isActive ? "border-[color-mix(in_srgb,var(--accent-2)_46%,var(--line))]" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="path-dot">{isComplete ? "✓" : index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{t.phases[item]}</p>
                    <p className="text-xs text-[var(--muted)]">{isActive ? t.statuses.live : isComplete ? t.statuses.completed : t.statuses.queued}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--background)_92%,black),color-mix(in_srgb,var(--accent)_34%,var(--background))_54%,color-mix(in_srgb,var(--accent-2)_34%,var(--background)))] p-5 text-[var(--foreground)] shadow-[var(--shadow)] sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="accent-pill px-3 py-1 text-xs font-medium backdrop-blur">{t.livePractice}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${sessionStats.readiness.className}`}>{sessionStats.readiness.label}</span>
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{t.heroTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">{t.heroBody}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{t.sessionScore}</p>
                <p className="mt-2 text-4xl font-semibold">{history.length > 0 ? `${sessionStats.averageScore}%` : "--"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted)]">{t.answered}</p>
                <p className="mt-1 text-2xl font-semibold">{sessionStats.totalAnswered}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-all duration-300" style={{ width: `${progressWidth}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{sessionStats.strongestArea}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <PagePanel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t.currentQuestion} description={t.phaseDesc[phase]} />
            <span className="inline-flex w-fit rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 text-xs font-medium text-[var(--accent-2)]">
              {t.phases[phase]}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] to-[var(--surface)] p-5">
            <p className="text-xl font-medium leading-8 text-[var(--foreground)]">{currentQuestion}</p>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{t.rubric}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentRubric.map((item) => (
                <span key={item} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)]">{item}</span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-strong)] sm:grid-cols-3">
            <div><p className="font-medium text-[var(--foreground)]">{t.phase}</p><p className="mt-1">{t.phases[phase]}</p></div>
            <div><p className="font-medium text-[var(--foreground)]">{t.questionBank}</p><p className="mt-1">{interviewQuestions.length} prompts</p></div>
            <div><p className="font-medium text-[var(--foreground)]">{t.mode}</p><p className="mt-1">{t.modeValue}</p></div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={moveToDifferentQuestion} className="secondary-btn px-4 py-2 text-sm">{t.differentQuestion}</button>
            <button type="button" onClick={resetSession} className="secondary-btn px-4 py-2 text-sm">{t.reset}</button>
          </div>
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.answerWorkspace} description={t.answerWorkspaceDesc} />

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">{t.yourAnswer}</span>
            <textarea
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                if (result) {
                  setResult(null);
                  setFollowUpQuestion("");
                }
              }}
              className="field min-h-64 resize-y"
              placeholder={t.placeholder}
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={evaluate} className="primary-btn px-4 py-2 text-sm disabled:opacity-60" disabled={!answer.trim() || loading}>
              {loading ? t.evaluating : t.evaluate}
            </button>
            {followUpQuestion ? <button type="button" onClick={answerFollowUp} className="secondary-btn px-4 py-2 text-sm">{t.answerFollowup}</button> : null}
          </div>
          {error ? <Notice tone="warning" className="mt-4">{error}</Notice> : null}

          <div className="mt-6">
            <SectionTitle title={t.evaluation} description={t.evaluationDesc} />
            {result ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-[0.36fr_0.64fr]">
                <MetricTile label={t.score} value={`${result.score}%`} helper={result.summary} />
                <div className="space-y-3">
                  <Notice tone="success"><strong>{t.strengths}</strong>{result.strengths.join(" ")}</Notice>
                  <Notice tone="warning"><strong>{t.improve}</strong>{result.improvements.join(" ")}</Notice>
                </div>
                <div className="xl:col-span-2">
                  <div className="content-card grid gap-3 p-4 sm:grid-cols-2">
                    {answerDimensions(result, isEn).map((dimension) => (
                      <div key={dimension.label}>
                        <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--muted)]">
                          <span>{dimension.label}</span>
                          <span>{dimension.value}%</span>
                        </div>
                        <div className="signal-bar"><div className="signal-fill" style={{ width: `${dimension.value}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState>{t.emptyEval}</EmptyState>
            )}
          </div>

          {followUpQuestion ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_14%,transparent)] to-[var(--surface)] p-4 shadow-[0_12px_30px_rgba(10,102,194,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--accent-2)]">{t.followup}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{followUpQuestion}</p>
                </div>
                <span className="w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--accent-2)]">{t.nextStep}</span>
              </div>
            </div>
          ) : null}
        </PagePanel>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <PagePanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t.analytics} description={t.analyticsDesc} />
            <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${sessionStats.readiness.className}`}>{sessionStats.readiness.label}</span>
          </div>

          {history.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <MetricTile label={t.answered} value={sessionStats.totalAnswered} helper={t.evaluatedResponses} />
              <MetricTile label={t.average} value={`${sessionStats.averageScore}%`} helper={sessionStats.strongestArea} />
              <MetricTile label={t.latest} value={`${sessionStats.latestScore}%`} helper={t.latest} />
            </div>
          ) : (
            <EmptyState>{t.noHistory}</EmptyState>
          )}
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.history} description={t.historyDesc} />
          {history.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {history.slice(0, 3).map((item, index) => (
                <article key={`${item.timestamp}-${item.result.score}`} className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] to-[var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--muted)]">#{history.length - index}</span>
                    <span className="shrink-0 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2 py-1 text-xs font-medium text-[var(--accent-2)]">{item.result.score}%</span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--foreground)]">{shorten(item.question, 84)}</p>
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{new Date(item.timestamp).toLocaleString(isEn ? "en-US" : "ko-KR")}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>{t.previous}</EmptyState>
          )}
        </PagePanel>
      </section>
    </PageShell>
  );
}
