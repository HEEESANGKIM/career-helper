"use client";

import { motion } from "framer-motion";
import type { EventCard, Rarity } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

const rarityClass: Record<Rarity, string> = {
  common: "border-slate-300/40 text-slate-100 shadow-slate-950/40",
  rare: "border-cyan-300/60 text-cyan-100 shadow-cyan-950/40",
  epic: "border-purple-300/70 text-purple-100 shadow-purple-950/40",
  legendary: "border-amber-300/80 text-amber-100 shadow-amber-950/40",
};

export function EventCardPreview({
  language,
  year,
  events,
  selectedEventId,
  onSelectEvent,
  disabled = false,
}: {
  language: NextMoveLanguage;
  year: number;
  events: EventCard[];
  selectedEventId?: string;
  onSelectEvent: (event: EventCard) => void;
  disabled?: boolean;
}) {
  const isKo = language === "ko";

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">{isKo ? "현재 턴" : "Current Turn"}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{isKo ? "이벤트 1개 선택" : "Choose 1 Event"}</h2>
        </div>
        <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
          {isKo ? `${year}년차` : `Year ${year}`}
        </span>
      </div>
<<<<<<< HEAD
      <div className="mt-4 grid gap-3">
        {events.map((event, index) => {
=======
      <div className="mt-4 grid grid-cols-1 gap-3">
        {events.map((event) => {
>>>>>>> origin/dohyeon
          const selected = selectedEventId === event.id;
          return (
            <motion.button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event)}
              disabled={disabled}
<<<<<<< HEAD
              initial={{ opacity: 0, y: 16, rotate: index % 2 === 0 ? -1.2 : 1.2 }}
              animate={{ opacity: 1, y: 0, rotate: selected ? 0 : index % 2 === 0 ? -0.6 : 0.6 }}
              whileHover={disabled ? undefined : { y: -6, scale: 1.015 }}
              className={`relative overflow-hidden rounded-[22px] border-2 bg-[linear-gradient(145deg,rgba(255,255,255,0.11),rgba(255,255,255,0.025)_48%,rgba(0,0,0,0.22))] p-4 text-left shadow-xl transition disabled:cursor-not-allowed disabled:opacity-70 ${rarityClass[event.rarity]} ${selected ? "scale-[1.015] ring-2 ring-white/18" : ""}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-black text-white">{isKo ? event.titleKo : event.title}</p>
                <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]">{event.rarity}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{isKo ? event.descriptionKo : event.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
=======
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={disabled ? undefined : { scale: 0.995 }}
              className={`relative grid h-[178px] w-full grid-rows-[40px_1fr_40px] overflow-hidden rounded-[22px] border-2 bg-[linear-gradient(145deg,rgba(255,255,255,0.11),rgba(255,255,255,0.025)_48%,rgba(0,0,0,0.22))] p-4 text-left shadow-xl transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-70 ${rarityClass[event.rarity]} ${selected ? "ring-2 ring-white/18" : ""}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/50" />
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 overflow-hidden text-base font-black leading-5 text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{isKo ? event.titleKo : event.title}</p>
                <span className="shrink-0 rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]">{event.rarity}</span>
              </div>
              <p className="mt-2 overflow-hidden text-xs leading-5 text-slate-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">{isKo ? event.descriptionKo : event.description}</p>
              <div className="mt-3 flex flex-wrap content-start gap-2 overflow-hidden">
>>>>>>> origin/dohyeon
                {(isKo ? event.statChangesKo : event.statChanges).map((change) => (
                  <span key={change} className="rounded-full border border-white/12 bg-black/24 px-2.5 py-1 text-[11px] font-black text-white">
                    {change}
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
