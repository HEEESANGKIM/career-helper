"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActionPointPanel } from "@/components/next-move/ActionPointPanel";
import { EventCardPreview } from "@/components/next-move/EventCardPreview";
import { PlayerStatusCard } from "@/components/next-move/PlayerStatusCard";
import { RunSummaryPreview } from "@/components/next-move/RunSummaryPreview";
import { YearTimeline } from "@/components/next-move/YearTimeline";
import {
  applyEffects,
  baseYearNodes,
  startingGameStats,
  yearScenarios,
  type CareerAction,
  type CareerTheme,
  type EventCard,
  type GameStats,
} from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

type Phase = "choose" | "report" | "ending";

type YearReport = {
  year: number;
  event: EventCard;
  actions: CareerAction[];
  before: GameStats;
  after: GameStats;
};

const statLabels = {
  en: { salary: "Salary", skill: "Skill", burnout: "Burnout", network: "Network", reputation: "Reputation" },
  ko: { salary: "연봉", skill: "스킬", burnout: "번아웃", network: "네트워크", reputation: "평판" },
};

function totalScore(stats: GameStats) {
  return stats.salary + stats.skill + stats.network + stats.reputation - stats.burnout;
}

export function CareerRunBoard({
  language,
  selectedTheme,
  onReset,
}: {
  language: NextMoveLanguage;
  selectedTheme: CareerTheme;
  onReset: () => void;
}) {
  const isKo = language === "ko";
  const [currentYear, setCurrentYear] = useState(1);
  const [stats, setStats] = useState<GameStats>(startingGameStats);
  const [phase, setPhase] = useState<Phase>("choose");
  const [selectedEvent, setSelectedEvent] = useState<EventCard | null>(null);
  const [selectedActions, setSelectedActions] = useState<CareerAction[]>([]);
  const [reports, setReports] = useState<YearReport[]>([]);

  const scenario = yearScenarios.find((item) => item.year === currentYear) ?? yearScenarios[0];
  const latestReport = reports[reports.length - 1];
  const canResolve = Boolean(selectedEvent) && selectedActions.length === 2;

  const timeline = useMemo(
    () =>
      baseYearNodes.map((node) => ({
        ...node,
        status: node.year < currentYear ? "completed" as const : node.year === currentYear ? "active" as const : "locked" as const,
      })),
    [currentYear],
  );

  const toggleAction = (action: CareerAction) => {
    setSelectedActions((prev) => {
      if (prev.some((item) => item.id === action.id)) return prev.filter((item) => item.id !== action.id);
      if (prev.length >= 2) return prev;
      return [...prev, action];
    });
  };

  const resolveYear = () => {
    if (!selectedEvent || selectedActions.length !== 2) return;
    const before = stats;
    const after = [selectedEvent.effects, ...selectedActions.map((action) => action.effects)].reduce(applyEffects, before);
    setStats(after);
    setReports((prev) => [...prev, { year: currentYear, event: selectedEvent, actions: selectedActions, before, after }]);
    setPhase("report");
  };

  const continueRun = () => {
    if (currentYear >= 5) {
      setPhase("ending");
      return;
    }
    setCurrentYear((year) => year + 1);
    setSelectedEvent(null);
    setSelectedActions([]);
    setPhase("choose");
  };

  if (phase === "ending") {
    const score = totalScore(stats);
    const win = score >= 190 && stats.burnout < 85;
    return (
      <motion.section initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-4xl py-12 text-center">
        <p className="next-move-eyebrow">{isKo ? "런 종료" : "Run Complete"}</p>
        <h1 className={`mt-4 text-5xl font-black ${win ? "text-[var(--accent-2)]" : "text-[var(--danger)]"}`}>
          {win ? (isKo ? "승리 엔딩" : "Win Ending") : isKo ? "패배 엔딩" : "Lose Ending"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          {win
            ? isKo
              ? "5년 동안 충분한 커리어 모멘텀을 만들었습니다. 다음 런에서는 더 높은 점수를 노려보세요."
              : "You built enough career momentum across five years. Try the next run for a stronger score."
            : isKo
              ? "모멘텀이 부족하거나 번아웃이 너무 높았습니다. 다음 런에서는 회복과 증거 만들기의 균형을 잡아보세요."
              : "Momentum was too low or burnout climbed too high. Balance recovery and proof next run."}
        </p>
        <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
          <ResultTile label={isKo ? "최종 점수" : "Final Score"} value={String(score)} />
          <ResultTile label={isKo ? "해결한 턴" : "Turns"} value="5/5" />
          <ResultTile label={isKo ? "배지" : "Badge"} value={win ? (isKo ? "전략가" : "Strategist") : (isKo ? "재도전" : "Retry")} />
        </div>
        <button onClick={onReset} className="primary-btn mt-8 px-5 py-3 text-sm">
          {isKo ? "테마 선택으로 돌아가기" : "Back to Theme Select"}
        </button>
      </motion.section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="next-move-kicker">Next Move Run</p>
          <h1 className="mt-5 text-5xl font-black leading-none text-[var(--foreground)] sm:text-6xl">{isKo ? selectedTheme.titleKo : selectedTheme.title} Run</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
            {isKo ? "이벤트 1개와 행동 2개를 선택해 5년 커리어 런을 진행하세요." : "Choose 1 event and 2 actions each year to complete a 5-year career run."}
          </p>
        </div>
        <button type="button" onClick={onReset} className="secondary-btn px-4 py-2 text-sm">{isKo ? "테마 선택" : "Theme Select"}</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.46fr]">
        <PlayerStatusCard language={language} theme={selectedTheme} stats={stats} />

        <div className="grid gap-5">
          <section className={`rounded-[32px] border border-[var(--line)] bg-gradient-to-br ${selectedTheme.accentClass} p-5 shadow-[var(--shadow)]`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{isKo ? "현재 선택" : "Current Decision"}</p>
                <h2 className="mt-1 text-3xl font-black text-[var(--foreground)]">{isKo ? scenario.titleKo : scenario.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{isKo ? scenario.promptKo : scenario.prompt}</p>
              </div>
              <span className="next-move-chip px-3 py-1 text-xs font-black">
                {isKo ? `${currentYear} / 5년차` : `Year ${currentYear} / 5`}
              </span>
            </div>
            <div className="mt-5">
              <YearTimeline language={language} years={timeline} />
            </div>
          </section>

          <AnimatePresence mode="wait">
            {phase === "report" && latestReport ? (
              <motion.section
                key="report"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="next-move-panel"
              >
                <p className="next-move-eyebrow">{isKo ? "연말 리포트" : "Year-End Report"}</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">{isKo ? `${latestReport.year}년차 결과` : `Year ${latestReport.year} Results`}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  {(Object.keys(latestReport.after) as Array<keyof GameStats>).map((key) => {
                    const delta = latestReport.after[key] - latestReport.before[key];
                    return (
                      <div key={key} className="next-move-subcard p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">{statLabels[language][key]}</p>
                        <p className="mt-2 text-xl font-black text-[var(--foreground)]">{latestReport.after[key]}</p>
                        <p className={delta >= 0 ? "mt-1 text-xs font-black text-[var(--success)]" : "mt-1 text-xs font-black text-[var(--danger)]"}>
                          {delta >= 0 ? "+" : ""}
                          {delta}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <button onClick={continueRun} className="primary-btn mt-5 px-5 py-3 text-sm">
                  {currentYear >= 5 ? (isKo ? "최종 결과 보기" : "See Final Result") : isKo ? `${currentYear + 1}년차로` : `Continue to Year ${currentYear + 1}`}
                </button>
              </motion.section>
            ) : (
              <motion.div key="choose" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <EventCardPreview
                  language={language}
                  year={currentYear}
                  events={scenario.events}
                  selectedEventId={selectedEvent?.id}
                  onSelectEvent={setSelectedEvent}
                />
                <ActionPointPanel
                  language={language}
                  actions={scenario.actions}
                  selectedActionIds={selectedActions.map((action) => action.id)}
                  onToggleAction={toggleAction}
                  disabled={!selectedEvent}
                />
                <div className="xl:col-span-2">
                  <button disabled={!canResolve} onClick={resolveYear} className="primary-btn w-full justify-center px-5 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                    {canResolve ? (isKo ? `${currentYear}년차 마무리` : `Resolve Year ${currentYear}`) : isKo ? "이벤트 1개와 행동 2개를 선택하세요" : "Select 1 event and 2 actions"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <RunSummaryPreview language={language} currentYear={currentYear} stats={stats} resolvedYears={reports.length} />
        </div>
      </div>
    </section>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="next-move-subcard rounded-3xl p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{value}</p>
    </div>
  );
}
