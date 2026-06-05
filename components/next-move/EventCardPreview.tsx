"use client";

import { motion } from "framer-motion";
import type { EventCard, Rarity } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

const rarityClass: Record<Rarity, string> = {
  common: "border-[var(--line)] text-[var(--muted-strong)]",
  rare: "border-[color-mix(in_srgb,var(--accent-2)_50%,var(--line))] text-[var(--accent-2)]",
  epic: "border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] text-[var(--accent)]",
  legendary: "border-[color-mix(in_srgb,var(--warning)_50%,var(--line))] text-[var(--warning)]",
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
    <section className="next-move-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="next-move-eyebrow">{isKo ? "현재 턴" : "Current Turn"}</p>
          <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">{isKo ? "이벤트 1개 선택" : "Choose 1 Event"}</h2>
        </div>
        <span className="next-move-chip px-3 py-1 text-xs font-bold text-[var(--muted-strong)]">
          {isKo ? `${year}년차` : `Year ${year}`}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {events.map((event, index) => {
          const selected = selectedEventId === event.id;
          return (
            <motion.button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event)}
              disabled={disabled}
              initial={{ opacity: 0, y: 16, rotate: index % 2 === 0 ? -1.2 : 1.2 }}
              animate={{ opacity: 1, y: 0, rotate: selected ? 0 : index % 2 === 0 ? -0.6 : 0.6 }}
              whileHover={disabled ? undefined : { y: -6, scale: 1.015 }}
              className={`next-move-inner-card relative overflow-hidden rounded-[22px] border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${rarityClass[event.rarity]} ${
                selected ? "next-move-selectable--active scale-[1.015]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-black text-[var(--foreground)]">{isKo ? event.titleKo : event.title}</p>
                <span className="next-move-chip border-current/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]">{event.rarity}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{isKo ? event.descriptionKo : event.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(isKo ? event.statChangesKo : event.statChanges).map((change) => (
                  <span key={change} className="next-move-chip px-2.5 py-1 text-[11px] font-black">
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
