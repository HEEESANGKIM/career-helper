"use client";

import { motion } from "framer-motion";
import type { CareerAction } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

export function ActionPointPanel({
  language,
  actions,
  selectedActionIds,
  onToggleAction,
  disabled = false,
}: {
  language: NextMoveLanguage;
  actions: CareerAction[];
  selectedActionIds: string[];
  onToggleAction: (action: CareerAction) => void;
  disabled?: boolean;
}) {
  const isKo = language === "ko";

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">{isKo ? "행동 선택" : "Action Choice"}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{isKo ? "행동 2개 선택" : "Choose 2 Actions"}</h2>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
          {selectedActionIds.length}/2 AP
        </span>
      </div>
<<<<<<< HEAD
      <div className="mt-4 grid gap-3">
=======
      <div className="mt-4 grid auto-rows-fr gap-3">
>>>>>>> origin/dohyeon
        {actions.map((action) => {
          const selected = selectedActionIds.includes(action.id);
          return (
            <motion.button
              key={action.id}
              type="button"
              onClick={() => onToggleAction(action)}
              disabled={disabled}
<<<<<<< HEAD
              whileHover={disabled ? undefined : { y: -5, scale: 1.01 }}
              whileTap={disabled ? undefined : { scale: 0.985 }}
              className={`rounded-[22px] border p-4 text-left shadow-xl transition disabled:cursor-not-allowed disabled:opacity-70 ${
=======
              whileHover={disabled ? undefined : { y: -3 }}
              whileTap={disabled ? undefined : { scale: 0.985 }}
              className={`flex min-h-[168px] flex-col rounded-[22px] border p-4 text-left shadow-xl transition disabled:cursor-not-allowed disabled:opacity-70 ${
>>>>>>> origin/dohyeon
                selected
                  ? "border-cyan-200/60 bg-[radial-gradient(circle_at_12%_0%,rgba(6,182,212,0.22),transparent_38%),rgba(255,255,255,0.07)] ring-2 ring-cyan-200/15"
                  : "border-white/10 bg-white/[0.035]"
              }`}
            >
<<<<<<< HEAD
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-black text-white">{isKo ? action.titleKo : action.title}</p>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white">{action.cost} AP</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{isKo ? action.descriptionKo : action.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
=======
              <div className="flex min-h-10 items-start justify-between gap-3">
                <p className="min-w-0 text-base font-black leading-5 text-white">{isKo ? action.titleKo : action.title}</p>
                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white">{action.cost} AP</span>
              </div>
              <p className="mt-2 grow text-xs leading-5 text-slate-400">{isKo ? action.descriptionKo : action.description}</p>
              <div className="mt-4 flex min-h-8 flex-wrap content-start gap-2">
>>>>>>> origin/dohyeon
                {(isKo ? action.consequencesKo : action.consequences).map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/24 px-2.5 py-1 text-[11px] font-black text-white">
                    {item}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
