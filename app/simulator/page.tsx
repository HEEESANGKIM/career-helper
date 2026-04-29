"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { EmptyState, MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";

type InterviewPhase = "intro" | "behavioral" | "technical" | "followup" | "summary";

type InterviewQuestion = {
  phase: Extract<InterviewPhase, "behavioral" | "technical">;
  question: string;
  rubric: string[];
};

type EvaluationResult = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
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
    question: "Tell me about a project where you had to solve an ambiguous problem with limited guidance.",
    rubric: ["Situation", "Ownership", "Action", "Result"],
  },
  {
    phase: "technical",
    question: "Describe a technical decision you made recently. What trade-offs did you consider?",
    rubric: ["Technical depth", "Trade-offs", "Reasoning", "Impact"],
  },
  {
    phase: "behavioral",
    question: "Tell me about a time you received difficult feedback and how you responded.",
    rubric: ["Self-awareness", "Learning", "Communication", "Outcome"],
  },
  {
    phase: "technical",
    question: "Walk me through how you would debug a production issue that users are reporting intermittently.",
    rubric: ["Debugging process", "Prioritization", "Observability", "Prevention"],
  },
];

function evaluateAnswer(answer: string): EvaluationResult {
  const trimmed = answer.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d|percent|%|users|requests|seconds|minutes|hours|revenue|cost|latency|명|개|%|건|시간|분|초|원|억|만/i.test(trimmed);
  const hasStructure = /situation|task|action|result|because|therefore|first|then|finally|상황|역할|행동|결과|먼저|그래서|마지막으로|왜냐하면/i.test(trimmed);
  const hasChallenge = /challenge|difficult|hard|blocked|issue|risk|conflict|trade-?off|problem|어려움|문제|도전|갈등|리스크|힘들었|막혔/i.test(trimmed);

  const score = Math.max(
    35,
    Math.min(95, 42 + Math.min(25, wordCount) + (hasNumbers ? 12 : 0) + (hasStructure ? 9 : 0) + (hasChallenge ? 7 : 0)),
  );

  return {
    score,
    summary:
      score >= 80
        ? "Strong answer with clear evidence and a credible decision path."
        : score >= 65
          ? "Solid foundation, but the answer needs sharper evidence and more specific outcomes."
          : "The answer is understandable, but it needs more context, action detail, and measurable impact.",
    strengths: [
      hasStructure ? "The response has a clear narrative structure." : "The response identifies the main topic directly.",
      hasChallenge ? "It includes some complexity or challenge." : "It stays focused on the question.",
    ],
    improvements: [
      hasNumbers ? "Connect the metric more explicitly to your personal contribution." : "Add a measurable result or quantitative impact.",
      wordCount >= 80 ? "Tighten the ending into a concise takeaway." : "Expand the situation, your role, action, and result.",
    ],
  };
}

function generateFollowUpQuestion(answer: string) {
  const trimmed = answer.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d|percent|%|users|requests|seconds|minutes|hours|revenue|cost|latency|명|개|%|건|시간|분|초|원/i.test(trimmed);
  const hasChallenge = /challenge|difficult|hard|blocked|issue|risk|conflict|trade-?off|problem|어려움|문제|도전|갈등|힘들었|막혔/i.test(trimmed);

  if (wordCount < 45) {
    return "Can you explain the situation, your specific role, the actions you took, and the final result in more detail?";
  }
  if (!hasNumbers) {
    return "What measurable outcome or quantitative impact can you add to prove the result of your work?";
  }
  if (!hasChallenge) {
    return "What was the hardest part of this experience, and how did you work through it?";
  }
  return "If you had to make the same technical or product decision again, what would you change and why?";
}

function shorten(text: string, maxLength = 96) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function answerDimensions(result: EvaluationResult | null) {
  const score = result?.score ?? 0;
  return [
    { label: "Structure", value: Math.min(96, score + 6) },
    { label: "Evidence", value: Math.max(24, score - 8) },
    { label: "Impact", value: Math.max(18, score - 14) },
    { label: "Clarity", value: Math.min(92, score + 2) },
  ];
}

function getReadinessStatus(score: number, answered: number, isEn: boolean) {
  if (answered === 0) return { label: isEn ? "Not started" : "미시작", className: "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-strong)]" };
  if (score >= 82) return { label: isEn ? "Interview-ready" : "면접 준비 완료", className: "border-[color-mix(in_srgb,var(--success)_42%,var(--line))] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--foreground)]" };
  if (score >= 68) return { label: isEn ? "Nearly ready" : "거의 준비됨", className: "border-[color-mix(in_srgb,var(--accent-2)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent-2)_14%,transparent)] text-[var(--foreground)]" };
  return { label: isEn ? "Needs practice" : "연습 필요", className: "border-[color-mix(in_srgb,var(--warning)_42%,var(--line))] bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--foreground)]" };
}

export default function SimulatorPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = useCallback((ko: string, en: string) => (isEn ? en : ko), [isEn]);

  const phaseLabel: Record<InterviewPhase, string> = useMemo(() => ({
    intro: t("소개", "Intro"),
    behavioral: t("행동", "Behavioral"),
    technical: t("기술", "Technical"),
    followup: t("심화", "Follow-up"),
    summary: t("요약", "Summary"),
  }), [t]);

  const phaseDescription: Record<InterviewPhase, string> = useMemo(() => ({
    intro: t("큰 질문으로 시작해 맥락을 잡습니다.", "Start with a broad question and establish context."),
    behavioral: t("오너십, 판단력, 커뮤니케이션을 보여주세요.", "Show ownership, judgment, and communication."),
    technical: t("트레이드오프, 시스템 사고, 디버깅 깊이를 설명하세요.", "Explain trade-offs, systems thinking, and debugging depth."),
    followup: t("증거, 제약, 회고를 심화합니다.", "Go deeper on evidence, constraints, and reflection."),
    summary: t("세션 신호를 검토하고 다음 개선점을 결정하세요.", "Review the session signal and decide what to improve next."),
  }), [t]);

  const phaseFlow: InterviewPhase[] = ["intro", "behavioral", "technical", "followup", "summary"];

  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<InterviewPhase>("intro");
  const [currentQuestion, setCurrentQuestion] = useState(interviewQuestions[0].question);
  const [currentRubric, setCurrentRubric] = useState(interviewQuestions[0].rubric);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState("");

  const sessionStats = useMemo(() => {
    const totalAnswered = history.length;
    const latestScore = history[0]?.result.score ?? 0;
    const averageScore = totalAnswered
      ? Math.round(history.reduce((sum, item) => sum + item.result.score, 0) / totalAnswered)
      : 0;

    const readiness = getReadinessStatus(averageScore, totalAnswered, isEn);
    const strongestArea =
      averageScore >= 80
        ? t("강한 증거와 구조적 전달", "Strong evidence and structured delivery")
        : averageScore >= 65
          ? t("기본기 양호, 임팩트 보강 중", "Good baseline, keep sharpening impact")
          : t("연습이 더 필요합니다", "Needs more practice");

    return { totalAnswered, latestScore, averageScore, strongestArea, readiness };
  }, [history, isEn, t]);

  const progressWidth = history.length > 0 ? Math.max(8, Math.min(100, sessionStats.averageScore)) : 0;

  const evaluate = () => {
    const trimmed = answer.trim();
    if (!trimmed) return;

    const nextResult = evaluateAnswer(trimmed);
    const nextFollowUp = generateFollowUpQuestion(trimmed);
    const evaluationKey = `${currentQuestion}::${trimmed}`;

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
  };

  const moveToDifferentQuestion = () => {
    const nextPhase: Extract<InterviewPhase, "behavioral" | "technical"> =
      phase === "behavioral" ? "technical" : phase === "technical" ? "behavioral" : "behavioral";
    const candidates = interviewQuestions.filter((q) => q.phase === nextPhase);
    const nextQuestion = candidates[(questionIndex + 1) % candidates.length];
    const globalIndex = interviewQuestions.findIndex((q) => q.question === nextQuestion.question);

    setQuestionIndex(globalIndex >= 0 ? globalIndex : 0);
    setPhase(nextPhase);
    setCurrentQuestion(nextQuestion.question);
    setCurrentRubric(nextQuestion.rubric);
    setAnswer("");
    setResult(null);
    setFollowUpQuestion("");
    setLastEvaluatedKey("");
  };

  const answerFollowUp = () => {
    if (!followUpQuestion) return;
    setCurrentQuestion(followUpQuestion);
    setCurrentRubric([t("구체성", "Specificity"), t("증거", "Evidence"), t("회고", "Reflection"), t("다음 행동", "Next action")]);
    setPhase("followup");
    setAnswer("");
    setResult(null);
    setFollowUpQuestion("");
    setLastEvaluatedKey("");
  };

  const resetSession = () => {
    setQuestionIndex(0);
    setPhase("intro");
    setCurrentQuestion(interviewQuestions[0].question);
    setCurrentRubric(interviewQuestions[0].rubric);
    setAnswer("");
    setResult(null);
    setHistory([]);
    setFollowUpQuestion("");
    setLastEvaluatedKey("");
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow={t("면접 시뮬레이터", "Interview Simulator")}
        title={t("실전 면접 세션을 연습하세요.", "Practice a realistic interview session flow.")}
        description={t(
          "질문 → 답변 → 평가 → 심화 → 세션 요약으로 이어지는 구조화된 면접 루프를 경험합니다.",
          "Move from question to answer, evaluation, follow-up, and session summary using local scoring for now.",
        )}
        actions={
          <>
            <Link href="/dashboard" className="secondary-btn px-4 py-2 text-sm">
              {t("대시보드", "Dashboard")}
            </Link>
            <button type="button" onClick={resetSession} className="secondary-btn px-4 py-2 text-sm">
              {t("세션 초기화", "Reset session")}
            </button>
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
                    <p className="text-sm font-semibold text-[var(--foreground)]">{phaseLabel[item]}</p>
                    <p className="text-xs text-[var(--muted)]">{isActive ? t("진행 중", "Live phase") : isComplete ? t("완료", "Completed") : t("대기", "Queued")}</p>
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
              <span className="accent-pill px-3 py-1 text-xs font-medium backdrop-blur">
                {t("라이브 연습", "Live practice")}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${sessionStats.readiness.className}`}>
                {sessionStats.readiness.label}
              </span>
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              {t("압박을 시뮬레이션하고, 신호를 날카롭게 만드세요.", "Simulate the pressure, sharpen the signal.")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">
              {t(
                "페이즈 추적, 규칙 기반 심화 질문, 세션 분석을 통해 답변이 얼마나 구체화되고 있는지 확인하세요.",
                "Work through a structured interview loop with phase tracking, rule-based follow-ups, and session analytics that show whether your answers are becoming more concrete.",
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{t("세션 점수", "Session score")}</p>
                <p className="mt-2 text-4xl font-semibold">{history.length > 0 ? `${sessionStats.averageScore}%` : "--"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted)]">{t("답변 수", "Answered")}</p>
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
        <PagePanel className="overflow-hidden border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t("현재 질문", "Current question")} description={phaseDescription[phase]} />
            <span className="inline-flex w-fit rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 text-xs font-medium text-[var(--accent-2)]">
              {phaseLabel[phase]}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] to-[var(--surface)] p-5">
            <p className="text-xl font-medium leading-8 text-[var(--foreground)]">{currentQuestion}</p>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{t("평가 기준", "Rubric")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentRubric.map((item) => (
                <span key={item} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-strong)] sm:grid-cols-3">
            <div>
              <p className="font-medium text-[var(--foreground)]">{t("페이즈", "Phase")}</p>
              <p className="mt-1">{phaseLabel[phase]}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{t("질문 수", "Question bank")}</p>
              <p className="mt-1">{interviewQuestions.length} {t("개", "prompts")}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{t("모드", "Mode")}</p>
              <p className="mt-1">{t("로컬 채점", "Local scoring")}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={moveToDifferentQuestion} className="secondary-btn px-4 py-2 text-sm">
              {t("다른 질문", "Different question")}
            </button>
            <button type="button" onClick={resetSession} className="secondary-btn px-4 py-2 text-sm">
              {t("세션 초기화", "Reset session")}
            </button>
          </div>
        </PagePanel>

        <PagePanel className="border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <SectionTitle title={t("답변 작성", "Answer workspace")} description={t("답변을 작성하고 평가한 후 심화 질문으로 이어가세요.", "Draft your response, evaluate it, then continue into the follow-up.")} />

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">{t("내 답변", "Your answer")}</span>
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
              placeholder={t("상황, 역할, 행동, 결과, 정량적 임팩트를 포함해 작성하세요.", "Use situation, role, action, result, and measurable impact.")}
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={evaluate} className="primary-btn px-4 py-2 text-sm" disabled={!answer.trim()}>
              {t("답변 평가", "Evaluate answer")}
            </button>
            {followUpQuestion ? (
              <button type="button" onClick={answerFollowUp} className="secondary-btn px-4 py-2 text-sm">
                {t("심화 질문 답하기", "Answer follow-up")}
              </button>
            ) : null}
          </div>

          <div className="mt-6">
            <SectionTitle title={t("평가 결과", "Evaluation")} description={t("구조, 구체성, 임팩트 기반 로컬 신호입니다.", "A quick local signal based on structure, specificity, and impact.")} />
            {result ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-[0.36fr_0.64fr]">
                <MetricTile label={t("점수", "Score")} value={`${result.score}%`} helper={result.summary} />
                <div className="space-y-3">
                  <Notice tone="success">
                    <strong>{t("강점: ", "Strengths: ")}</strong>
                    {result.strengths.join(" ")}
                  </Notice>
                  <Notice tone="warning">
                    <strong>{t("개선: ", "Improve: ")}</strong>
                    {result.improvements.join(" ")}
                  </Notice>
                </div>
                <div className="xl:col-span-2">
                  <div className="content-card grid gap-3 p-4 sm:grid-cols-2">
                    {answerDimensions(result).map((dimension) => (
                      <div key={dimension.label}>
                        <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--muted)]">
                          <span>{dimension.label}</span>
                          <span>{dimension.value}%</span>
                        </div>
                        <div className="signal-bar">
                          <div className="signal-fill" style={{ width: `${dimension.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState>{t("답변을 작성하고 평가하면 점수, 강점, 개선점이 표시됩니다.", "Write an answer and evaluate it to see score, strengths, and improvement points.")}</EmptyState>
            )}
          </div>

          {followUpQuestion ? (
            <div className="mt-5 rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_14%,transparent)] to-[var(--surface)] p-4 shadow-[0_12px_30px_rgba(10,102,194,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--accent-2)]">{t("심화 질문", "Follow-up question")}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{followUpQuestion}</p>
                </div>
                <span className="w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--accent-2)]">
                  {t("다음 단계", "Next step")}
                </span>
              </div>
            </div>
          ) : null}
        </PagePanel>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <PagePanel className="border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t("세션 분석", "Session analytics")} description={t("현재 면접 세션의 요약 신호입니다.", "Compact signals for the current interview run.")} />
            <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${sessionStats.readiness.className}`}>
              {sessionStats.readiness.label}
            </span>
          </div>

          {history.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <MetricTile label={t("답변 수", "Answered")} value={sessionStats.totalAnswered} helper={t("평가된 답변", "Evaluated responses")} />
              <MetricTile label={t("평균", "Average")} value={`${sessionStats.averageScore}%`} helper={sessionStats.strongestArea} />
              <MetricTile label={t("최근", "Latest")} value={`${sessionStats.latestScore}%`} helper={t("가장 최근 점수", "Most recent score")} />
            </div>
          ) : (
            <EmptyState>{t("아직 평가된 답변이 없습니다. 첫 번째 질문으로 세션을 시작하세요.", "No answers evaluated yet. Start with the first question to build a session summary.")}</EmptyState>
          )}
        </PagePanel>

        <PagePanel className="border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <SectionTitle title={t("최근 답변 히스토리", "Recent answer history")} description={t("이번 세션에서 평가된 최근 3개 답변입니다.", "Latest 3 evaluated answers in this session.")} />
          {history.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {history.slice(0, 3).map((item, index) => (
                <article key={`${item.timestamp}-${item.result.score}`} className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] to-[var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--muted)]">
                      #{history.length - index}
                    </span>
                    <span className="shrink-0 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2 py-1 text-xs font-medium text-[var(--accent-2)]">
                      {item.result.score}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--foreground)]">{shorten(item.question, 84)}</p>
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{new Date(item.timestamp).toLocaleString(isEn ? "en-US" : "ko-KR")}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>{t("평가 후 이전 질문과 점수가 여기 표시됩니다.", "Previous questions and scores will appear here after evaluation.")}</EmptyState>
          )}
        </PagePanel>
      </section>
    </PageShell>
  );
}
