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
    <section className="next-move-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="next-move-eyebrow">{isKo ? "행동 선택" : "Action Choice"}</p>
          <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">{isKo ? "행동 2개 선택" : "Choose 2 Actions"}</h2>
        </div>
        <span className="next-move-chip px-3 py-1 text-xs font-bold text-[var(--muted-strong)]">
          {selectedActionIds.length}/2 AP
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {actions.map((action) => {
          const selected = selectedActionIds.includes(action.id);
          return (
            <motion.button
              key={action.id}
              type="button"
              onClick={() => onToggleAction(action)}
              disabled={disabled}
              whileHover={disabled ? undefined : { y: -5, scale: 1.01 }}
              whileTap={disabled ? undefined : { scale: 0.985 }}
              className={`rounded-[22px] border p-4 text-left shadow-[var(--card-shadow)] transition disabled:cursor-not-allowed disabled:opacity-70 ${
                selected ? "next-move-selectable--active" : "next-move-selectable"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-black text-[var(--foreground)]">{isKo ? action.titleKo : action.title}</p>
                <span className="next-move-chip px-2.5 py-1 text-[11px] font-black">{action.cost} AP</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{isKo ? action.descriptionKo : action.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(isKo ? action.consequencesKo : action.consequences).map((item) => (
                  <span key={item} className="next-move-chip px-2.5 py-1 text-[11px] font-black">
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
