"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Building2, ClipboardCheck, Play, ShieldAlert, Target } from "lucide-react";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Persona = {
  id: string;
  name: string;
  role: string;
  styleKo: string;
  styleEn: string;
  attitudeKo: string;
  attitudeEn: string;
  focusKo: string[];
  focusEn: string[];
  questionsKo: string[];
  questionsEn: string[];
};

type HiringResult = {
  overallScore: number;
  passProbability: number;
  categoryScores: {
    communication: number;
    problemSolving: number;
    roleFit: number;
    companyFit: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextPracticeQuestion: string;
  source?: "openai" | "demo_fallback";
  evaluationId?: string | null;
};

const personas: Persona[] = [
  {
    id: "google-swe",
    name: "Google SWE Interviewer",
    role: "L4 Software Engineer",
    styleKo: "차분하고 분석적인 시스템 설계 중심",
    styleEn: "Analytical, calm, system-design focused",
    attitudeKo: "모호한 문제를 구조화하고, 확장성 제약과 기술 선택 근거를 침착하게 설명하는지를 봅니다.",
    attitudeEn: "Looks for calm decomposition of ambiguity, scalability awareness, and clear technical rationale.",
    focusKo: ["확장성", "문제 분해", "기술 근거"],
    focusEn: ["Scalability", "Problem decomposition", "Technical rationale"],
    questionsKo: ["글로벌 트래픽 급증을 처리하는 URL 단축기를 설계해 주세요."],
    questionsEn: ["Design a URL shortener that can handle global traffic spikes."],
  },
  {
    id: "amazon-sde",
    name: "Amazon SDE Bar Raiser",
    role: "SDE II",
    styleKo: "직설적이고 오너십과 실행력을 강하게 확인",
    styleEn: "Direct, ownership-heavy, high pressure",
    attitudeKo: "막힌 상황에서 책임을 회피하지 않았는지, 고객/비즈니스 영향과 트레이드오프를 명확히 말하는지를 봅니다.",
    attitudeEn: "Looks for ownership under pressure, customer impact, and explicit tradeoff decisions.",
    focusKo: ["오너십", "고객 영향", "트레이드오프"],
    focusEn: ["Ownership", "Customer impact", "Tradeoffs"],
    questionsKo: ["팀이 막혔을 때 직접 오너십을 가져간 경험을 말해 주세요."],
    questionsEn: ["Tell me about a time you took ownership when the team was blocked."],
  },
  {
    id: "meta-product",
    name: "Meta Product Interviewer",
    role: "Product Manager",
    styleKo: "빠르고 실행 중심이며 지표를 중시",
    styleEn: "Fast-paced, execution-focused, metrics-driven",
    attitudeKo: "문제를 지표로 정의하고, 실험/우선순위/사용자 임팩트로 결정을 설명하는지를 봅니다.",
    attitudeEn: "Looks for metric framing, experimentation judgment, prioritization, and user impact.",
    focusKo: ["제품 감각", "실험 설계", "우선순위"],
    focusEn: ["Product sense", "Experimentation", "Prioritization"],
    questionsKo: ["크리에이터 유지율을 판단할 핵심 지표 하나를 고르고 이유를 설명해 주세요."],
    questionsEn: ["Choose one metric for creator retention and explain why it matters."],
  },
  {
    id: "startup-cto",
    name: "Startup CTO",
    role: "Full-stack Engineer",
    styleKo: "실용적이고 속도와 제품 임팩트를 중시",
    styleEn: "Practical, speed-focused, impact-oriented",
    attitudeKo: "완벽한 조건이 없어도 빠르게 출시하고, 리스크를 관리하며, 고객 문제를 해결할 수 있는지를 봅니다.",
    attitudeEn: "Looks for shipping judgment, risk management, autonomy, and customer-problem focus.",
    focusKo: ["출시 속도", "자율성", "고객 문제"],
    focusEn: ["Shipping speed", "Autonomy", "Customer problem"],
    questionsKo: ["활성화 퍼널 이탈이 크다면 첫 주에 무엇을 출시하겠습니까?"],
    questionsEn: ["What would you ship in week one if activation funnel drop-off was high?"],
  },
];

const copy = {
  ko: {
    eyebrow: "취업 시뮬레이터",
    title: "Hiring Manager Simulator",
    description: "회사 스타일별 평가 관점으로 답변을 점검하고 다음 연습 질문까지 받아보세요.",
    back: "면접으로 돌아가기",
    notice: "페르소나는 회사 스타일을 참고한 시뮬레이션이며 실제 채용 담당자라고 주장하지 않습니다.",
    personaSummary: "평가 관점",
    personaDesc: "각 분야가 답변에서 중요하게 보는 태도와 증거",
    lens: "보는 태도",
    question: "질문",
    questionDesc: "다른 면접 각도를 원하면 질문을 수정해도 됩니다.",
    answer: "내 답변",
    answerPlaceholder: "상황, 내 역할, 행동, 결과, 수치 근거를 포함해 답변하세요.",
    evaluate: "답변 평가",
    evaluating: "평가 중...",
    result: "평가 결과",
    resultDesc: "선택한 언어로 생성된 구조화 평가입니다.",
    strengths: "강점",
    weaknesses: "약점",
    recommendations: "추천 개선",
    nextQuestion: "다음 연습 질문",
    demo: "데모 폴백",
    saved: "저장됨",
    errors: "평가를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    passSignal: "통과 가능성 신호",
    overall: "종합 점수",
    estimated: "연습용 추정 신호",
    cards: [
      ["압박 보정", "각 페르소나는 답변을 보는 태도와 우선순위가 다릅니다."],
      ["위험 신호", "확률은 연습용 추정치이며 실제 회사 결과가 아닙니다."],
      ["반복 루프", "평가 후 더 엄격한 관점으로 반복 연습하세요."],
    ],
  },
  en: {
    eyebrow: "Hiring Simulator",
    title: "Hiring Manager Simulator",
    description: "Review your answer through company-style evaluation lenses and get the next practice prompt.",
    back: "Back to Interview",
    notice: "Personas are simulated from company-style patterns and are not real hiring managers.",
    personaSummary: "Evaluation Lens",
    personaDesc: "What each field tends to value in attitude, evidence, and delivery",
    lens: "What this lens values",
    question: "Question",
    questionDesc: "Edit the prompt if you want a different interview angle.",
    answer: "Your answer",
    answerPlaceholder: "Use situation, role, action, result, and measurable evidence.",
    evaluate: "Evaluate answer",
    evaluating: "Evaluating...",
    result: "Evaluation Result",
    resultDesc: "Structured feedback returned in the selected language.",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    recommendations: "Recommendations",
    nextQuestion: "Next practice question",
    demo: "Demo fallback",
    saved: "Saved",
    errors: "Could not complete evaluation. Please try again.",
    passSignal: "Pass probability signal",
    overall: "Overall score",
    estimated: "Estimated practice signal",
    cards: [
      ["Pressure calibration", "Each lens has a different attitude and priority model."],
      ["Risk signal", "Probabilities are practice estimates, not real company outcomes."],
      ["Ready loop", "Evaluate, review, then repeat with a stricter lens."],
    ],
  },
};

function scoreRows(result: HiringResult, language: "ko" | "en") {
  const names =
    language === "en"
      ? { communication: "Communication", problemSolving: "Problem solving", roleFit: "Role fit", companyFit: "Company fit" }
      : { communication: "커뮤니케이션", problemSolving: "문제 해결", roleFit: "직무 적합도", companyFit: "회사 스타일 적합도" };

  return Object.entries(result.categoryScores).map(([key, value]) => ({
    label: names[key as keyof typeof names],
    value,
  }));
}

export default function HiringManagerSimulatorPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const isEn = language === "en";
  const [selectedId, setSelectedId] = useState(personas[0].id);
  const selectedPersona = useMemo(() => personas.find((persona) => persona.id === selectedId) ?? personas[0], [selectedId]);
  const [question, setQuestion] = useState((isEn ? selectedPersona.questionsEn : selectedPersona.questionsKo)[0]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<HiringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const focusAreas = isEn ? selectedPersona.focusEn : selectedPersona.focusKo;

  const selectPersona = (persona: Persona) => {
    setSelectedId(persona.id);
    setQuestion((isEn ? persona.questionsEn : persona.questionsKo)[0]);
    setResult(null);
    setError("");
  };

  const evaluate = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError("");

    try {
      const session = supabase && isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/evaluate/hiring-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          selectedPersona: selectedPersona.name,
          companyStyle: isEn ? selectedPersona.styleEn : selectedPersona.styleKo,
          role: selectedPersona.role,
          question,
          userAnswer: answer,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || t.errors);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={<Link href="/simulator" className="secondary-btn px-5 py-3 text-sm">{t.back}</Link>}
      />

      <Notice className="mb-5">{t.notice}</Notice>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {personas.map((persona) => (
          <button
            key={persona.id}
            type="button"
            onClick={() => selectPersona(persona)}
            className={`content-card clickable-card h-full p-5 text-left transition ${
              persona.id === selectedId ? "border-[color-mix(in_srgb,var(--accent-2)_58%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" : ""
            }`}
          >
            <Building2 size={20} className="text-[var(--accent-2)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{persona.name}</h2>
            <p className="mt-1 text-sm font-medium text-[var(--accent-2)]">{persona.role}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{isEn ? persona.styleEn : persona.styleKo}</p>
          </button>
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <PagePanel>
          <SectionTitle title={t.personaSummary} description={t.personaDesc} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricTile label="Persona" value={selectedPersona.name} helper={selectedPersona.role} />
            <MetricTile label={t.lens} value={isEn ? "Attitude" : "태도"} helper={isEn ? selectedPersona.attitudeEn : selectedPersona.attitudeKo} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {focusAreas.map((area) => <span key={area} className="accent-pill px-3 py-1 text-xs font-semibold">{area}</span>)}
          </div>
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.question} description={t.questionDesc} />
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="field mt-5 min-h-24" />
          <label className="mt-5 block">
            <span className="form-label">{t.answer}</span>
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="field min-h-48" placeholder={t.answerPlaceholder} />
          </label>
          <button type="button" onClick={evaluate} disabled={loading || !answer.trim()} className="primary-btn mt-4 px-5 py-3 text-sm disabled:opacity-60">
            <Play size={16} aria-hidden="true" />
            {loading ? t.evaluating : t.evaluate}
          </button>
          {error ? <Notice tone="warning" className="mt-4">{error}</Notice> : null}
        </PagePanel>
      </section>

      {result ? (
        <section className="mt-5">
          <PagePanel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle title={t.result} description={t.resultDesc} />
              <span className="accent-pill px-3 py-1 text-xs font-semibold">
                <ClipboardCheck size={14} aria-hidden="true" />
                {result.evaluationId ? t.saved : result.source === "demo_fallback" ? t.demo : t.result}
              </span>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="grid gap-3">
                <Notice tone="success"><strong>{t.strengths}: </strong>{result.strengths.join(", ")}</Notice>
                <Notice tone="warning"><strong>{t.weaknesses}: </strong>{result.weaknesses.join(", ")}</Notice>
                <Notice><strong>{t.recommendations}: </strong>{result.recommendations.join(", ")}</Notice>
                <Notice><strong>{t.nextQuestion}: </strong>{result.nextPracticeQuestion}</Notice>
              </div>
              <div className="content-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricTile label={t.overall} value={`${result.overallScore}/100`} />
                  <MetricTile label={t.passSignal} value={`${result.passProbability}%`} helper={t.estimated} />
                  {scoreRows(result, language).map((score) => (
                    <div key={score.label}>
                      <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--muted)]">
                        <span>{score.label}</span>
                        <span>{score.value}/100</span>
                      </div>
                      <div className="signal-bar"><div className="signal-fill" style={{ width: `${score.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PagePanel>
        </section>
      ) : (
        <section className="mt-5 grid gap-5 md:grid-cols-3">
          {t.cards.map(([title, body], index) => {
            const icons = [Target, ShieldAlert, BarChart3];
            const Icon = icons[index];
            return (
              <div key={title} className="content-card p-4">
                <Icon className="text-[var(--accent-2)]" size={20} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </div>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
