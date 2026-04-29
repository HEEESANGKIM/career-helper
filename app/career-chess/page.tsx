"use client";

import { useState } from "react";
import { ArrowRight, BadgeCheck, BrainCircuit, GraduationCap, Landmark, Rocket } from "lucide-react";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CareerPath = {
  id: string;
  titleKo: string;
  titleEn: string;
  icon: typeof Landmark;
  likelihoodKo: string;
  likelihoodEn: string;
  movesKo: string[];
  movesEn: string[];
  prosKo: string[];
  prosEn: string[];
  risksKo: string[];
  risksEn: string[];
};

type ChessResult = {
  recommendedPath: string;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
  milestones: string[];
  skillGaps: string[];
  actions: string[];
  alternativePath: string;
  source?: "openai" | "demo_fallback";
  evaluationId?: string | null;
};

const careerPaths: CareerPath[] = [
  {
    id: "big-tech",
    titleKo: "경로 A: 빅테크 직접 지원",
    titleEn: "Path A: Big Tech Direct",
    icon: Landmark,
    likelihoodKo: "중간-높음",
    likelihoodEn: "Medium-High",
    movesKo: ["0년차: 주니어 SWE 입사", "1-2년차: 대규모 시스템 학습", "3년차: E4 수준 성장 목표", "5년차: 시니어 트랙 준비"],
    movesEn: ["Year 0: Join as junior SWE", "Year 1-2: Learn large-scale systems", "Year 3: Build toward E4 scope", "Year 5: Senior track readiness"],
    prosKo: ["안정성", "강한 브랜드", "학습 밀도"],
    prosEn: ["Stable", "Strong brand", "Dense learning"],
    risksKo: ["승진 병목", "내부 경쟁"],
    risksEn: ["Promotion bottleneck", "Internal competition"],
  },
  {
    id: "startup",
    titleKo: "경로 B: 스타트업에서 빅테크",
    titleEn: "Path B: Startup to Big Tech",
    icon: Rocket,
    likelihoodKo: "중간",
    likelihoodEn: "Medium",
    movesKo: ["0년차: 스타트업 SWE", "1-2년차: 넓은 오너십 확보", "3년차: 빅테크 이동 시도", "5년차: 시니어 성장 기반"],
    movesEn: ["Year 0: Join startup as SWE", "Year 1-2: Broad ownership", "Year 3: Attempt big-tech move", "Year 5: Senior growth base"],
    prosKo: ["빠른 학습", "큰 프로젝트 오너십"],
    prosEn: ["Fast learning", "Large project ownership"],
    risksKo: ["브랜드 신호 약함", "높은 불확실성"],
    risksEn: ["Weaker brand signal", "Higher uncertainty"],
  },
  {
    id: "grad-school",
    titleKo: "경로 C: 대학원 경로",
    titleEn: "Path C: Graduate School Route",
    icon: GraduationCap,
    likelihoodKo: "높음",
    likelihoodEn: "High",
    movesKo: ["0-2년차: 석사 과정", "2년차: 강화된 후보자로 진입", "5년차: 전문성 기반 시니어 트랙"],
    movesEn: ["Year 0-2: MS program", "Year 2: Enter as stronger candidate", "Year 5: Specialist senior track"],
    prosKo: ["더 강한 자격", "연구 기회"],
    prosEn: ["Better credentials", "Research opportunities"],
    risksKo: ["비용", "소득 지연", "시장 불확실성"],
    risksEn: ["Cost", "Delayed income", "Market uncertainty"],
  },
];

const copy = {
  ko: {
    eyebrow: "전략 시뮬레이터",
    title: "Career Chess",
    description: "경로 A, B, C를 한 번에 분석하고 선택한 경로의 상세 결과를 바로 확인하세요.",
    input: "입력 요약",
    inputDesc: "세 경로 분석에 사용할 현재 상황",
    currentRole: "현재 직무",
    targetRole: "목표 직무",
    timeline: "타임라인",
    riskTolerance: "위험 감수",
    evaluate: "전체 경로 분석",
    evaluating: "A/B/C 분석 중...",
    moveTree: "수 읽기",
    moveDesc: "정밀 확률 대신 Low / Medium / High 신호로 판단합니다.",
    notice: "결과는 방향성 평가입니다. 실제 합격 확률처럼 해석하지 마세요.",
    selected: "선택 경로 분석",
    pros: "장점",
    risks: "위험",
    result: "경로 분석 결과",
    milestones: "마일스톤",
    skillGaps: "스킬 갭",
    actions: "실행",
    alternative: "대안 경로",
    error: "평가를 완료하지 못했습니다.",
    saved: "저장됨",
    demo: "데모 폴백",
    empty: "전체 경로 분석을 누르면 A, B, C 결과가 저장되고, 카드를 클릭할 때마다 해당 경로 결과가 바로 표시됩니다.",
  },
  en: {
    eyebrow: "Strategy Simulator",
    title: "Career Chess",
    description: "Analyze paths A, B, and C in one run, then click a path to inspect its result immediately.",
    input: "Input Summary",
    inputDesc: "Current assumptions for all three path evaluations",
    currentRole: "Current role",
    targetRole: "Target role",
    timeline: "Timeline",
    riskTolerance: "Risk tolerance",
    evaluate: "Analyze all paths",
    evaluating: "Analyzing A/B/C...",
    moveTree: "Move Tree",
    moveDesc: "Uses Low / Medium / High signals instead of fake precise probabilities.",
    notice: "Results are directional. Do not treat them as real hiring probabilities.",
    selected: "Selected Path Analysis",
    pros: "Pros",
    risks: "Risks",
    result: "Path Analysis Result",
    milestones: "Milestones",
    skillGaps: "Skill gaps",
    actions: "Actions",
    alternative: "Alternative path",
    error: "Could not complete evaluation.",
    saved: "Saved",
    demo: "Demo fallback",
    empty: "Click analyze all paths to generate A, B, and C results. After that, selecting a card shows that path instantly.",
  },
};

function RiskBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[color-mix(in_srgb,var(--warning)_36%,var(--line))] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--muted-strong)]">
      {children}
    </span>
  );
}

export default function CareerChessPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = copy[language];
  const [selectedId, setSelectedId] = useState(careerPaths[0].id);
  const [currentRole, setCurrentRole] = useState(isEn ? "New Grad SWE" : "신입 소프트웨어 엔지니어");
  const [targetRole, setTargetRole] = useState(isEn ? "Staff Engineer at Meta" : "Meta Staff Engineer");
  const [timeline, setTimeline] = useState("5");
  const [riskTolerance, setRiskTolerance] = useState("Medium");
  const [results, setResults] = useState<Record<string, ChessResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedPath = careerPaths.find((path) => path.id === selectedId) ?? careerPaths[0];
  const selectedResult = results[selectedId] ?? null;

  const evaluateAll = async () => {
    setLoading(true);
    setError("");
    try {
      const session = supabase && isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
      const entries = await Promise.all(
        careerPaths.map(async (path) => {
          const response = await fetch("/api/evaluate/career-chess", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({
              currentRole,
              targetRole,
              timeline,
              riskTolerance,
              selectedPath: isEn ? path.titleEn : path.titleKo,
              language,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || t.error);
          return [path.id, data] as const;
        }),
      );

      setResults(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <PagePanel>
          <SectionTitle title={t.input} description={t.inputDesc} />
          <div className="mt-5 grid gap-3">
            <label><span className="form-label">{t.currentRole}</span><input value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className="field" /></label>
            <label><span className="form-label">{t.targetRole}</span><input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="field" /></label>
            <label><span className="form-label">{t.timeline}</span><input value={timeline} onChange={(e) => setTimeline(e.target.value)} className="field" /></label>
            <label>
              <span className="form-label">{t.riskTolerance}</span>
              <select value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value)} className="field">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <button type="button" onClick={evaluateAll} disabled={loading} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
              <BrainCircuit size={16} aria-hidden="true" />
              {loading ? t.evaluating : t.evaluate}
            </button>
            {error ? <Notice tone="warning">{error}</Notice> : null}
          </div>
        </PagePanel>

        <PagePanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle title={t.moveTree} description={t.moveDesc} />
            <span className="accent-pill px-3 py-1 text-xs font-semibold">
              <BrainCircuit size={14} aria-hidden="true" />
              A/B/C
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Now", "Year 3", "Year 5"].map((node, index) => (
              <div key={node} className="content-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{node}</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <span>{isEn ? ["Choose route", "Compound signal", "Senior track"][index] : ["경로 선택", "신호 축적", "시니어 트랙"][index]}</span>
                  {index < 2 ? <ArrowRight size={16} className="text-[var(--accent-2)]" aria-hidden="true" /> : null}
                </div>
              </div>
            ))}
          </div>
          <Notice className="mt-5">{t.notice}</Notice>
        </PagePanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        {careerPaths.map((path) => {
          const Icon = path.icon;
          const title = isEn ? path.titleEn : path.titleKo;
          const moves = isEn ? path.movesEn : path.movesKo;
          const pathResult = results[path.id];
          return (
            <button
              key={path.id}
              type="button"
              onClick={() => setSelectedId(path.id)}
              className={`content-card clickable-card h-full p-5 text-left ${path.id === selectedId ? "border-[color-mix(in_srgb,var(--accent-2)_56%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--accent-2)]">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="accent-pill px-3 py-1 text-xs font-semibold">{pathResult ? pathResult.riskLevel.toUpperCase() : isEn ? path.likelihoodEn : path.likelihoodKo}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{title}</h2>
              <div className="mt-5 grid gap-3">
                {moves.map((move, index) => (
                  <div key={move} className="grid grid-cols-[auto_1fr] gap-3">
                    <span className="path-dot h-8 w-8 text-[0.7rem]">{index + 1}</span>
                    <p className="text-sm leading-6 text-[var(--muted-strong)]">{move}</p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <PagePanel>
          <SectionTitle title={t.selected} description={isEn ? selectedPath.titleEn : selectedPath.titleKo} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="content-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <BadgeCheck size={18} className="text-[var(--success)]" aria-hidden="true" />
                {t.pros}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{(isEn ? selectedPath.prosEn : selectedPath.prosKo).map((pro) => <span key={pro} className="chip">{pro}</span>)}</div>
            </div>
            <div className="content-card p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t.risks}</p>
              <div className="mt-4 flex flex-wrap gap-2">{(isEn ? selectedPath.risksEn : selectedPath.risksKo).map((risk) => <RiskBadge key={risk}>{risk}</RiskBadge>)}</div>
            </div>
          </div>
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.result} description={selectedResult?.evaluationId ? t.saved : selectedResult?.source === "demo_fallback" ? t.demo : undefined} />
          {selectedResult ? (
            <div className="mt-5 grid gap-4">
              <MetricTile label="Risk" value={selectedResult.riskLevel.toUpperCase()} helper={selectedResult.recommendedPath} />
              <Notice>{selectedResult.reasoning}</Notice>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  [t.milestones, selectedResult.milestones],
                  [t.skillGaps, selectedResult.skillGaps],
                  [t.actions, selectedResult.actions],
                ].map(([title, items]) => (
                  <div key={title as string} className="content-card p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{title as string}</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
                      {(items as string[]).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <Notice><strong>{t.alternative}: </strong>{selectedResult.alternativePath}</Notice>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent-2)_38%,var(--line))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_16%,transparent),color-mix(in_srgb,var(--accent-2)_10%,transparent))] p-5">
              <p className="text-lg font-semibold leading-8 text-[var(--foreground)]">{t.empty}</p>
            </div>
          )}
        </PagePanel>
      </section>
    </PageShell>
  );
}
