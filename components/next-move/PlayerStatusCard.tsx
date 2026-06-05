"use client";

import { motion } from "framer-motion";
import { mockRelationshipResources, playerStartingProfiles, type CareerTheme, type GameStats } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

const statLabels = {
  en: { salary: "Salary", skill: "Skill", burnout: "Burnout", network: "Network", reputation: "Reputation" },
  ko: { salary: "연봉", skill: "스킬", burnout: "번아웃", network: "네트워크", reputation: "평판" },
};

export function PlayerStatusCard({ language, theme, stats }: { language: NextMoveLanguage; theme: CareerTheme; stats: GameStats }) {
  const isKo = language === "ko";
  const labels = statLabels[language];
  const profile = playerStartingProfiles.find((item) => item.themeId === theme.id) ?? playerStartingProfiles[0];
  const Icon = theme.visualIcon;
  const xp = (stats.skill + stats.reputation + stats.network + stats.salary - stats.burnout) * 5;

  return (
    <aside className="next-move-panel">
      <div className={`rounded-3xl bg-gradient-to-br ${theme.accentClass} p-4`}>
        <Icon className="text-[var(--foreground)]" size={24} aria-hidden="true" />
        <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{isKo ? "플레이어 클래스" : "Player Class"}</p>
        <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">{isKo ? profile.titleKo : profile.title}</h2>
        <p className="mt-2 text-sm text-[var(--muted-strong)]">{isKo ? profile.focusKo : profile.focus}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <StatPill label={isKo ? "레벨" : "Level"} value={String(profile.level)} />
        <StatPill label="XP" value={String(Math.max(0, xp))} />
        <StatPill label="AP" value="2" />
      </div>

      <div className="mt-5 grid gap-3">
        {(Object.keys(stats) as Array<keyof GameStats>).map((key) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              <span>{labels[key]}</span>
              <motion.span
                key={`${key}-${stats[key]}`}
                initial={{ y: -4, opacity: 0.3 }}
                animate={{ y: 0, opacity: 1 }}
                className={key === "burnout" && stats[key] >= 75 ? "text-[var(--danger)]" : "text-[var(--foreground)]"}
              >
                {stats[key]}
              </motion.span>
            </div>
            <div className="h-2 rounded-full bg-[var(--line)]">
              <motion.div
                className={`h-full rounded-full ${key === "burnout" ? "bg-[linear-gradient(90deg,var(--warning),var(--danger))]" : "bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"}`}
                initial={false}
                animate={{ width: `${stats[key]}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="next-move-eyebrow">{isKo ? "소셜 리소스" : "Social Resources"}</p>
        <div className="mt-3 grid gap-3">
          {mockRelationshipResources.map((resource) => {
            const value = stats[resource.statKey];
            return (
              <div key={resource.id} className="next-move-subcard p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-[var(--foreground)]">{isKo ? resource.labelKo : resource.label}</p>
                  <p className="text-sm font-black text-[var(--foreground)]">{value}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--line)]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--warning),var(--accent-2))]" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-4 text-[var(--muted)]">{isKo ? resource.noteKo : resource.note}</p>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="next-move-subcard p-3 text-center">
      <p className="text-[10px] font-black uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-black text-[var(--foreground)]">{value}</p>
    </div>
  );
}
