"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import { EmptyState, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";

const emptyInterviewQuestions = {
  behavioral: [] as string[],
  technical: [] as string[],
  companyFit: [] as string[],
  followUp: [] as string[],
};

const emptyAnswerFeedback = {
  clarity: 0,
  specificity: 0,
  relevance: 0,
  structure: 0,
  confidence: 0,
};

const emptySimulationData = {
  resumeMatchScore: 0,
  interviewScore: 0,
  readinessScore: 0,
  missingSkills: [] as string[],
  strongSignals: [] as string[],
  weakSignals: [] as string[],
  interviewQuestions: emptyInterviewQuestions,
  answerFeedback: emptyAnswerFeedback,
  recommendedActions: [] as string[],
};

type FeedbackKey = keyof typeof emptyAnswerFeedback;
type HiringSimulatorData = typeof emptySimulationData & {
  source?: "openai" | "profile_fallback";
};

type AnalysisResult = {
  overallScore: number;
  passProbability: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextPracticeQuestion: string;
  source?: "openai" | "demo_fallback";
  evaluationId?: string | null;
};

const feedbackLabels: FeedbackKey[] = ["clarity", "specificity", "relevance", "structure", "confidence"];

function copy(isEn: boolean) {
  return {
    eyebrow: isEn ? "Hiring Simulator" : "채용 시뮬레이터",
    title: isEn ? "Practice the full hiring journey." : "전체 채용 여정을 한 번에 연습하세요.",
    description: isEn ? "Set your target, run the simulation, then practice interview answers with AI feedback." : "타깃을 설정하고 시뮬레이션을 실행한 뒤, 면접 답변을 AI 피드백과 함께 연습하세요.",
    targetSetup: isEn ? "Target Setup" : "타깃 설정",
    targetDesc: isEn ? "Fill in the target role, company, and job description, then start the simulation." : "목표 직무, 회사, 공고 내용을 입력한 뒤 시뮬레이션을 시작하세요.",
    startSimulation: isEn ? "Start Simulation" : "시뮬레이션 시작",
    rerun: isEn ? "Re-run Simulation" : "시뮬레이션 다시 실행",
    running: isEn ? "Running..." : "실행 중...",
    targetRole: isEn ? "Target Role" : "목표 직무",
    targetCompany: isEn ? "Target Company" : "목표 회사",
    experienceLevel: isEn ? "Experience Level" : "경력 수준",
    jobDescription: isEn ? "Job Description Input" : "공고 내용 입력",
    rolePlaceholder: isEn ? "EX) Software Engineering Intern" : "EX) 소프트웨어 엔지니어링 인턴",
    companyPlaceholder: isEn ? "EX) Nvidia" : "EX) 토스",
    jdPlaceholder: isEn ? "EX) Frontend internship focused on React, Python, and performance-minded engineering." : "EX) React·Python 기반 프론트엔드 인턴, 성능 개선 경험 우대",
    applicationFit: isEn ? "Application Fit" : "지원 적합도",
    applicationDesc: isEn ? "Resume and profile screening signals appear after you start the simulation." : "시뮬레이션을 시작하면 이력서·프로필 스크리닝 신호가 표시됩니다.",
    applicationPending: isEn ? "No application fit data yet. Start the simulation to generate screening signals." : "아직 지원 적합도 데이터가 없습니다. 시뮬레이션을 시작하면 스크리닝 신호가 생성됩니다.",
    matchScore: isEn ? "Resume/Profile Match Score" : "이력서/프로필 매칭 점수",
    missingSkills: isEn ? "Missing Skills" : "부족한 스킬",
    strongSignals: isEn ? "Strong Signals" : "강한 신호",
    weakSignals: isEn ? "Weak Signals" : "약한 신호",
    aiRound: isEn ? "AI Interview Round" : "AI 면접 라운드",
    aiRoundDesc: isEn ? "Two questions per category are generated when you run the simulation." : "시뮬레이션을 실행하면 카테고리별 질문 2개가 생성됩니다.",
    aiRoundPending: isEn ? "No interview questions yet. Start or re-run the simulation to generate a fresh question set." : "아직 면접 질문이 없습니다. 시뮬레이션을 시작하거나 다시 실행하면 새 질문이 생성됩니다.",
    selectQuestion: isEn ? "Select a practice question" : "연습 질문 선택",
    selectedQuestion: isEn ? "Selected question" : "선택한 질문",
    behavioral: isEn ? "Behavioral Questions" : "행동 면접 질문",
    technical: isEn ? "Technical Questions" : "기술 면접 질문",
    companyFit: isEn ? "Company-fit Questions" : "회사 적합도 질문",
    followUp: isEn ? "Follow-up Questions" : "꼬리 질문",
    answerWorkspace: isEn ? "Answer Workspace" : "답변 작성 공간",
    answerPlaceholder: isEn ? "Draft one answer here. Use situation, task, action, result, and measurable evidence." : "답변 하나를 작성하세요. 상황, 과제, 행동, 결과, 정량 근거를 포함해 보세요.",
    analyzeAnswer: isEn ? "Analyze Answer" : "답변 분석",
    analyzing: isEn ? "Analyzing..." : "분석 중...",
    analyzeHint: isEn ? "Choose a question and write at least 40 characters before analyzing." : "질문을 선택하고 40자 이상 답변을 작성한 뒤 분석하세요.",
    answerFeedback: isEn ? "Answer Feedback" : "답변 피드백",
    feedbackDesc: isEn ? "Updated after you submit an answer for AI evaluation." : "답변을 제출해 AI 평가를 실행하면 갱신됩니다.",
    feedbackPending: isEn ? "Run answer analysis to see scored feedback." : "답변 분석을 실행하면 점수 피드백이 표시됩니다.",
    strengths: isEn ? "Strengths" : "강점",
    weaknesses: isEn ? "Areas to improve" : "보완할 점",
    recommendations: isEn ? "Recommendations" : "추천 액션",
    nextQuestion: isEn ? "Next practice question" : "다음 연습 질문",
    saved: isEn ? "Evaluation saved" : "평가 저장됨",
    analyzeError: isEn ? "Could not analyze the answer." : "답변 분석에 실패했습니다.",
    personalizeError: isEn ? "Could not run the simulation." : "시뮬레이션을 실행하지 못했습니다.",
    setupRequired: isEn ? "Enter target role, company, and job description before starting." : "시뮬레이션 시작 전에 목표 직무, 회사, 공고 내용을 입력하세요.",
    simulationReady: isEn ? "Simulation generated from your target and profile." : "입력한 타깃과 프로필 기준으로 시뮬레이션이 생성되었습니다.",
    feedbackLabels: isEn ? { clarity: "Clarity", specificity: "Specificity", relevance: "Relevance", structure: "Structure", confidence: "Confidence" } : { clarity: "명확성", specificity: "구체성", relevance: "관련성", structure: "구조", confidence: "자신감" },
  };
}

function mapCategoryToFeedback(categoryScores: {
  communication: number;
  problemSolving: number;
  roleFit: number;
  companyFit: number;
}) {
  return {
    clarity: categoryScores.communication,
    specificity: categoryScores.problemSolving,
    relevance: categoryScores.roleFit,
    structure: Math.round((categoryScores.communication + categoryScores.problemSolving) / 2),
    confidence: categoryScores.companyFit,
  };
}

function limitQuestions(questions: HiringSimulatorData["interviewQuestions"]) {
  return {
    behavioral: questions.behavioral.slice(0, 2),
    technical: questions.technical.slice(0, 2),
    companyFit: questions.companyFit.slice(0, 2),
    followUp: questions.followUp.slice(0, 2),
  };
}

async function getAuthHeaders() {
  const session = supabase && isSupabaseConfigured ? await getSessionWithRetry() : null;
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export default function HiringSimulatorPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = copy(isEn);

  const [data, setData] = useState<HiringSimulatorData>(emptySimulationData);
  const [answerFeedback, setAnswerFeedback] = useState(emptyAnswerFeedback);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Internship / New Grad");
  const [jobDescription, setJobDescription] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [simulationError, setSimulationError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const canStartSimulation = Boolean(targetRole.trim() && targetCompany.trim() && jobDescription.trim());

  const runSimulation = useCallback(async () => {
    if (!canStartSimulation) {
      setSimulationError(t.setupRequired);
      return;
    }

    setPersonalizing(true);
    setSimulationError("");
    try {
      const response = await fetch("/api/personalized-hiring-simulator", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          language,
          targetRole: targetRole.trim(),
          targetCompany: targetCompany.trim(),
          experienceLevel,
          jobDescription: jobDescription.trim(),
        }),
      });
      const personalized = await response.json();
      if (!response.ok) throw new Error(personalized?.error ?? t.personalizeError);

      const next: HiringSimulatorData = {
        ...emptySimulationData,
        resumeMatchScore: personalized.resumeMatchScore ?? 0,
        interviewScore: personalized.interviewScore ?? 0,
        readinessScore: personalized.readinessScore ?? 0,
        missingSkills: personalized.missingSkills ?? [],
        strongSignals: personalized.strongSignals ?? [],
        weakSignals: personalized.weakSignals ?? [],
        interviewQuestions: limitQuestions(personalized.interviewQuestions ?? emptyInterviewQuestions),
        answerFeedback: personalized.answerFeedback ?? emptyAnswerFeedback,
        recommendedActions: personalized.recommendedActions ?? [],
        source: personalized.source,
      };

      setData(next);
      setAnswerFeedback(emptyAnswerFeedback);
      setSimulationStarted(true);
      setAnalysisResult(null);
      setHasAnalyzed(false);
      setAnswer("");
      setSelectedQuestion("");
      setSelectedCategory("");
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : t.personalizeError);
    } finally {
      setPersonalizing(false);
    }
  }, [canStartSimulation, experienceLevel, jobDescription, language, t.personalizeError, t.setupRequired, targetCompany, targetRole]);

  const analyzeAnswer = async () => {
    if (!selectedQuestion || answer.trim().length < 40) return;

    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const response = await fetch("/api/evaluate/hiring-manager", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          language,
          selectedPersona: `${targetCompany.trim()} Hiring Manager`,
          companyStyle: `${targetCompany.trim()} · ${experienceLevel}`,
          evaluationFocus: jobDescription.trim(),
          role: targetRole.trim(),
          question: selectedQuestion,
          userAnswer: answer,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error ?? t.analyzeError);

      const mappedFeedback = mapCategoryToFeedback(result.categoryScores);
      setAnswerFeedback(mappedFeedback);
      setAnalysisResult({
        overallScore: result.overallScore,
        passProbability: result.passProbability,
        strengths: result.strengths ?? [],
        weaknesses: result.weaknesses ?? [],
        recommendations: result.recommendations ?? [],
        nextPracticeQuestion: result.nextPracticeQuestion ?? "",
        source: result.source,
        evaluationId: result.evaluationId,
      });
      setHasAnalyzed(true);
      setData((prev) => ({
        ...prev,
        interviewScore: result.overallScore,
      }));
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : t.analyzeError);
    } finally {
      setAnalyzing(false);
    }
  };

  const questionBlocks = [
    { title: t.behavioral, items: data.interviewQuestions.behavioral },
    { title: t.technical, items: data.interviewQuestions.technical },
    { title: t.companyFit, items: data.interviewQuestions.companyFit },
    { title: t.followUp, items: data.interviewQuestions.followUp },
  ];

  const canAnalyze = simulationStarted && Boolean(selectedQuestion) && answer.trim().length >= 40;
  const hasQuestions = questionBlocks.some((block) => block.items.length > 0);

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <PagePanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t.targetSetup} description={t.targetDesc} />
            <button
              type="button"
              onClick={() => void runSimulation()}
              disabled={personalizing || !canStartSimulation}
              className="primary-btn inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
            >
              <RefreshCw size={16} aria-hidden="true" />
              {personalizing ? t.running : simulationStarted ? t.rerun : t.startSimulation}
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">{t.targetRole}</span>
              <input className="field" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder={t.rolePlaceholder} />
            </label>
            <label>
              <span className="form-label">{t.targetCompany}</span>
              <input className="field" value={targetCompany} onChange={(event) => setTargetCompany(event.target.value)} placeholder={t.companyPlaceholder} />
            </label>
            <label className="sm:col-span-2">
              <span className="form-label">{t.experienceLevel}</span>
              <select className="field" value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)}>
                <option>Internship / New Grad</option>
                <option>Entry Level</option>
                <option>Career Switcher</option>
                <option>Mid Level</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="form-label">{t.jobDescription}</span>
              <textarea className="field min-h-36" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder={t.jdPlaceholder} />
            </label>
          </div>
          {simulationError ? <Notice tone="warning" className="mt-4">{simulationError}</Notice> : null}
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.applicationFit} description={t.applicationDesc} />
          {simulationStarted ? (
            <>
              {data.source ? (
                <Notice className="mt-5" tone={data.source === "openai" ? "success" : "neutral"}>
                  {t.simulationReady}
                </Notice>
              ) : null}
              <div className="mt-5 responsive-card-grid">
                <MetricPlaceholder label={t.matchScore} value={`${data.resumeMatchScore}/100`} helper={`${targetRole.trim()} at ${targetCompany.trim()}`} />
                <MetricPlaceholder label={t.missingSkills} value={String(data.missingSkills.length)} helper={isEn ? "Gaps to close before applying" : "지원 전 보완할 항목"} />
                <MetricPlaceholder label={t.strongSignals} value={String(data.strongSignals.length)} helper={isEn ? "Evidence worth highlighting" : "강조할 만한 근거"} />
              </div>
              <div className="mt-5 readable-grid-2">
                <SignalList title={t.strongSignals} items={data.strongSignals} tone="success" />
                <SignalList title={t.weakSignals} items={data.weakSignals} tone="warning" />
              </div>
            </>
          ) : (
            <div className="mt-5"><EmptyState>{t.applicationPending}</EmptyState></div>
          )}
        </PagePanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.82fr]">
        <PagePanel>
          <SectionTitle title={t.aiRound} description={t.aiRoundDesc} />
          {simulationStarted && hasQuestions ? (
            <>
              <p className="mt-4 text-sm text-[var(--muted)]">{t.selectQuestion}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {questionBlocks.map((block, index) => (
                  <motion.article key={block.title} className="content-card p-5" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
                    <div className="flex items-center gap-3">
                      <span className="path-dot h-9 w-9">{index + 1}</span>
                      <h2 className="text-sm font-semibold text-[var(--foreground)]">{block.title}</h2>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {block.items.map((item) => {
                        const isSelected = selectedQuestion === item;
                        return (
                          <li key={item}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQuestion(item);
                                setSelectedCategory(block.title);
                              }}
                              className={`w-full rounded-2xl border px-3 py-2.5 text-left text-sm leading-6 transition ${
                                isSelected
                                  ? "border-[color-mix(in_srgb,var(--accent-2)_45%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--foreground)]"
                                  : "border-[var(--line)] text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--accent-2)_25%,var(--line))]"
                              }`}
                            >
                              {item}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.article>
                ))}
              </div>

              {selectedQuestion ? (
                <Notice className="mt-5" tone="neutral">
                  <strong>{t.selectedQuestion}</strong>
                  <span className="ko-friendly mt-1 block text-sm leading-6">{selectedCategory ? `${selectedCategory} · ` : ""}{selectedQuestion}</span>
                </Notice>
              ) : null}

              <label className="mt-5 block">
                <span className="form-label">{t.answerWorkspace}</span>
                <textarea className="field min-h-44" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t.answerPlaceholder} />
              </label>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void analyzeAnswer()} disabled={analyzing || !canAnalyze} className="primary-btn inline-flex items-center gap-2 px-5 py-3 text-sm disabled:opacity-60">
                  <Sparkles size={16} aria-hidden="true" />
                  {analyzing ? t.analyzing : t.analyzeAnswer}
                </button>
                {!canAnalyze ? <span className="text-sm text-[var(--muted)]">{t.analyzeHint}</span> : null}
              </div>
              {analyzeError ? <Notice tone="warning" className="mt-4">{analyzeError}</Notice> : null}
            </>
          ) : (
            <div className="mt-5"><EmptyState>{t.aiRoundPending}</EmptyState></div>
          )}
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.answerFeedback} description={hasAnalyzed ? t.feedbackDesc : t.feedbackPending} />
          {hasAnalyzed ? (
            <>
              <div className="mt-5 grid gap-4">
                {feedbackLabels.map((key) => (
                  <div key={key} className="content-card p-4">
                    <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--muted)]">
                      <span>{t.feedbackLabels[key]}</span>
                      <span>{answerFeedback[key]}/100</span>
                    </div>
                    <div className="signal-bar"><div className="signal-fill" style={{ width: `${answerFeedback[key]}%` }} /></div>
                  </div>
                ))}
              </div>

              {analysisResult ? (
                <div className="mt-5 grid gap-3">
                  <Notice tone={analysisResult.source === "openai" ? "success" : "neutral"}>
                    {analysisResult.evaluationId ? `${t.saved} ` : ""}
                    {isEn ? `Interview signal: ${analysisResult.overallScore}/100 · Pass practice signal: ${analysisResult.passProbability}%` : `면접 신호: ${analysisResult.overallScore}/100 · 통과 연습 신호: ${analysisResult.passProbability}%`}
                  </Notice>
                  <FeedbackList title={t.strengths} items={analysisResult.strengths} />
                  <FeedbackList title={t.weaknesses} items={analysisResult.weaknesses} />
                  <FeedbackList title={t.recommendations} items={analysisResult.recommendations} />
                  {analysisResult.nextPracticeQuestion ? (
                    <div className="content-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{t.nextQuestion}</p>
                      <p className="ko-friendly mt-2 text-sm leading-6 text-[var(--foreground)]">{analysisResult.nextPracticeQuestion}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-5"><EmptyState>{t.feedbackPending}</EmptyState></div>
          )}
        </PagePanel>
      </section>
    </PageShell>
  );
}

function MetricPlaceholder({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="content-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      {helper ? <p className="ko-friendly mt-1 text-xs leading-5 text-[var(--muted)]">{helper}</p> : null}
    </div>
  );
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) {
  if (!items.length) return null;
  return (
    <Notice tone={tone}>
      <strong>{title}: </strong>
      {items.join(", ")}
    </Notice>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="content-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">{title}</p>
      <ul className="ko-friendly mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted-strong)]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
