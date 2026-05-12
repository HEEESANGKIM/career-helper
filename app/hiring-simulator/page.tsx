"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, ClipboardCheck, MessageSquareText, Radar, TrendingUp } from "lucide-react";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const mockData = {
  targetRole: "Software Engineering Intern",
  targetCompany: "Nvidia",
  resumeMatchScore: 78,
  interviewScore: 72,
  readinessScore: 76,
  missingSkills: ["CUDA or GPU basics", "System design vocabulary", "More measurable project impact"],
  strongSignals: ["React dashboard project", "Python automation experience", "Clear internship target"],
  weakSignals: ["Limited production teamwork evidence", "Resume bullets need stronger metrics"],
  interviewQuestions: {
    behavioral: ["Tell me about a project where you handled ambiguity.", "Describe a time you improved after feedback."],
    technical: ["Walk through a technical trade-off in your portfolio.", "How would you debug a slow API response?"],
    companyFit: ["Why this company and this role now?", "Which product or technical area interests you most?"],
    followUp: ["What measurable result can you add?", "What would you do differently next time?"],
  },
  answerFeedback: {
    clarity: 82,
    specificity: 68,
    relevance: 78,
    structure: 74,
    confidence: 70,
  },
  recommendedActions: [
    "Rewrite two resume bullets with action verb + measurable impact.",
    "Add one GPU, graphics, or performance-related portfolio detail.",
    "Practice one behavioral and one technical answer using STAR.",
  ],
};

type FeedbackKey = keyof typeof mockData.answerFeedback;
type HiringSimulatorData = typeof mockData & {
  experienceLevel?: string;
  jobDescription?: string;
  source?: "openai" | "profile_fallback";
};

const feedbackLabels: FeedbackKey[] = ["clarity", "specificity", "relevance", "structure", "confidence"];

function copy(isEn: boolean) {
  return {
    eyebrow: isEn ? "Hiring Simulator" : "채용 시뮬레이터",
    title: isEn ? "Practice the full hiring journey." : "전체 채용 여정을 한 번에 연습하세요.",
    description: isEn ? "Practice the full hiring journey from application screening to AI interview feedback." : "지원서 스크리닝부터 AI 면접 피드백까지 전체 채용 과정을 연습합니다.",
    targetSetup: isEn ? "Target Setup" : "타깃 설정",
    targetDesc: isEn ? "Define the role, company, seniority, and job description before the simulation starts." : "시뮬레이션 전에 직무, 회사, 경력 수준, 공고 내용을 설정합니다.",
    targetRole: isEn ? "Target Role" : "목표 직무",
    targetCompany: isEn ? "Target Company" : "목표 회사",
    experienceLevel: isEn ? "Experience Level" : "경력 수준",
    jobDescription: isEn ? "Job Description Input" : "공고 내용 입력",
    applicationFit: isEn ? "Application Fit" : "지원 적합도",
    applicationDesc: isEn ? "Resume and profile screening signals for the selected target." : "선택한 목표에 대한 이력서와 프로필 스크리닝 신호입니다.",
    matchScore: isEn ? "Resume/Profile Match Score" : "이력서/프로필 매칭 점수",
    missingSkills: isEn ? "Missing Skills" : "부족한 스킬",
    strongSignals: isEn ? "Strong Signals" : "강한 신호",
    weakSignals: isEn ? "Weak Signals" : "약한 신호",
    aiRound: isEn ? "AI Interview Round" : "AI 면접 라운드",
    aiRoundDesc: isEn ? "Interview practice now lives inside the full hiring simulation." : "면접 연습은 이제 전체 채용 시뮬레이션 안에서 진행됩니다.",
    behavioral: isEn ? "Behavioral Questions" : "행동 면접 질문",
    technical: isEn ? "Technical Questions" : "기술 면접 질문",
    companyFit: isEn ? "Company-fit Questions" : "회사 적합도 질문",
    followUp: isEn ? "Follow-up Questions" : "꼬리 질문",
    answerWorkspace: isEn ? "Answer Workspace" : "답변 작성 공간",
    answerPlaceholder: isEn ? "Draft one answer here. Use situation, task, action, result, and measurable evidence." : "답변 하나를 작성하세요. 상황, 과제, 행동, 결과, 정량 근거를 포함해 보세요.",
    answerFeedback: isEn ? "Answer Feedback" : "답변 피드백",
    feedbackDesc: isEn ? "Scored across clarity, specificity, relevance, structure, and confidence." : "명확성, 구체성, 관련성, 구조, 자신감 기준으로 평가합니다.",
    readinessReport: isEn ? "Hiring Readiness Report" : "채용 준비도 리포트",
    readinessDesc: isEn ? "A single report that combines application fit, interview signal, and communication quality." : "지원 적합도, 면접 신호, 커뮤니케이션 품질을 통합한 리포트입니다.",
    overall: isEn ? "Overall Readiness Score" : "종합 준비도 점수",
    applicationScore: isEn ? "Application Score" : "지원서 점수",
    interviewScore: isEn ? "Interview Score" : "면접 점수",
    communicationScore: isEn ? "Communication Score" : "커뮤니케이션 점수",
    recommendedNextActions: isEn ? "Recommended Next Actions" : "추천 다음 액션",
    closing: isEn ? "Use this single workspace for screening fit, interview rounds, answer coaching, and readiness planning." : "스크리닝 적합도, 면접 라운드, 답변 코칭, 준비도 계획을 이 하나의 화면에서 진행합니다.",
    cards: isEn ? ["Application Fit", "Interview Round", "Answer Feedback", "Hiring Readiness", "Improvement Plan"] : ["지원 적합도", "면접 라운드", "답변 피드백", "채용 준비도", "개선 계획"],
    feedbackLabels: isEn ? { clarity: "Clarity", specificity: "Specificity", relevance: "Relevance", structure: "Structure", confidence: "Confidence" } : { clarity: "명확성", specificity: "구체성", relevance: "관련성", structure: "구조", confidence: "자신감" },
  };
}

export default function HiringSimulatorPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = copy(isEn);
  const [data, setData] = useState<HiringSimulatorData>(mockData);
  const [personalizing, setPersonalizing] = useState(true);
  const [targetRole, setTargetRole] = useState(data.targetRole);
  const [targetCompany, setTargetCompany] = useState(data.targetCompany);
  const [experienceLevel, setExperienceLevel] = useState("Internship / New Grad");
  const [jobDescription, setJobDescription] = useState("Frontend-heavy software internship with Python, React, and performance-minded engineering.");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const loadPersonalized = async () => {
      setPersonalizing(true);
      try {
        const session = supabase && isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
        const response = await fetch("/api/personalized-hiring-simulator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ language }),
        });
        const personalized = await response.json();
        if (response.ok) {
          const next = { ...mockData, ...personalized } as HiringSimulatorData;
          setData(next);
          setTargetRole(next.targetRole);
          setTargetCompany(next.targetCompany);
          setExperienceLevel(next.experienceLevel ?? "Internship / New Grad");
          setJobDescription(next.jobDescription ?? "");
        }
      } finally {
        setPersonalizing(false);
      }
    };

    void loadPersonalized();
  }, [language]);

  const adjustedReadiness = useMemo(() => {
    const jdSignal = jobDescription.trim().length > 80 ? 4 : 0;
    const answerSignal = answer.trim().length > 220 ? 5 : answer.trim().length > 80 ? 2 : 0;
    return Math.min(94, data.readinessScore + jdSignal + answerSignal);
  }, [answer, data.readinessScore, jobDescription]);

  const questionBlocks = [
    { title: t.behavioral, items: data.interviewQuestions.behavioral },
    { title: t.technical, items: data.interviewQuestions.technical },
    { title: t.companyFit, items: data.interviewQuestions.companyFit },
    { title: t.followUp, items: data.interviewQuestions.followUp },
  ];

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      {personalizing ? <Notice className="mb-5">{isEn ? "Personalizing from your profile with OpenAI..." : "OpenAI로 내 프로필에 맞게 개인화하는 중..."}</Notice> : null}
      {!personalizing && data.source ? (
        <Notice className="mb-5" tone={data.source === "openai" ? "success" : "neutral"}>
          {data.source === "openai"
            ? isEn ? "Personalized from your profile and recent documents." : "내 프로필과 최근 문서 기반으로 개인화되었습니다."
            : isEn ? "Personalized with profile fallback because OpenAI is unavailable." : "OpenAI를 사용할 수 없어 프로필 기반 규칙으로 개인화했습니다."}
        </Notice>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <PagePanel>
          <SectionTitle title={t.targetSetup} description={t.targetDesc} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="form-label">{t.targetRole}</span>
              <input className="field" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} />
            </label>
            <label>
              <span className="form-label">{t.targetCompany}</span>
              <input className="field" value={targetCompany} onChange={(event) => setTargetCompany(event.target.value)} />
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
              <textarea className="field min-h-36" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} />
            </label>
          </div>
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.applicationFit} description={t.applicationDesc} />
          <div className="mt-5 responsive-card-grid">
            <MetricTile label={t.matchScore} value={`${data.resumeMatchScore}/100`} helper={`${targetRole} at ${targetCompany}`} />
            <MetricTile label={t.missingSkills} value={data.missingSkills.length} helper={isEn ? "Gaps to close before applying" : "지원 전 보완할 항목"} />
            <MetricTile label={t.strongSignals} value={data.strongSignals.length} helper={isEn ? "Evidence worth highlighting" : "강조할 만한 근거"} />
          </div>
          <div className="mt-5 readable-grid-2">
            <SignalList title={t.strongSignals} items={data.strongSignals} tone="success" />
            <SignalList title={t.weakSignals} items={data.weakSignals} tone="warning" />
          </div>
        </PagePanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.82fr]">
        <PagePanel>
          <SectionTitle title={t.aiRound} description={t.aiRoundDesc} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {questionBlocks.map((block, index) => (
              <motion.article key={block.title} className="content-card clickable-card p-5" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
                <div className="flex items-center gap-3">
                  <span className="path-dot h-9 w-9">{index + 1}</span>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">{block.title}</h2>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
                  {block.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </motion.article>
            ))}
          </div>
          <label className="mt-5 block">
            <span className="form-label">{t.answerWorkspace}</span>
            <textarea className="field min-h-44" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t.answerPlaceholder} />
          </label>
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.answerFeedback} description={t.feedbackDesc} />
          <div className="mt-5 grid gap-4">
            {feedbackLabels.map((key) => (
              <div key={key} className="content-card p-4">
                <div className="mb-2 flex justify-between text-xs font-semibold text-[var(--muted)]">
                  <span>{t.feedbackLabels[key]}</span>
                  <span>{data.answerFeedback[key]}/100</span>
                </div>
                <div className="signal-bar"><div className="signal-fill" style={{ width: `${data.answerFeedback[key]}%` }} /></div>
              </div>
            ))}
          </div>
        </PagePanel>
      </section>

      <section className="mt-5">
        <PagePanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t.readinessReport} description={t.readinessDesc} />
            <span className="accent-pill w-fit px-3 py-1 text-xs font-semibold">{experienceLevel}</span>
          </div>
          <div className="mt-5 responsive-card-grid">
            <MetricTile label={t.overall} value={`${adjustedReadiness}/100`} helper={isEn ? "Mock readiness signal" : "모의 준비도 신호"} />
            <MetricTile label={t.applicationScore} value={`${data.resumeMatchScore}/100`} helper={isEn ? "Screening strength" : "서류 통과 신호"} />
            <MetricTile label={t.interviewScore} value={`${data.interviewScore}/100`} helper={isEn ? "Practice answer quality" : "답변 연습 품질"} />
            <MetricTile label={t.communicationScore} value={`${data.answerFeedback.clarity}/100`} helper={isEn ? "Clarity and confidence" : "명확성과 자신감"} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            {([
              [t.cards[0], BriefcaseBusiness],
              [t.cards[1], MessageSquareText],
              [t.cards[2], ClipboardCheck],
              [t.cards[3], Radar],
              [t.cards[4], TrendingUp],
            ] as Array<[string, LucideIcon]>).map(([label, Icon]) => (
              <div key={label} className="content-card p-4">
                <Icon className="text-[var(--accent-2)]" size={18} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{label}</p>
              </div>
            ))}
          </div>
          <Notice className="mt-5">
            <strong>{t.recommendedNextActions}: </strong>
            {data.recommendedActions.join(" ")}
          </Notice>
          <p className="ko-friendly mt-4 text-sm text-[var(--muted)]">{t.closing}</p>
        </PagePanel>
      </section>
    </PageShell>
  );
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) {
  return (
    <Notice tone={tone}>
      <strong>{title}: </strong>
      {items.join(", ")}
    </Notice>
  );
}
