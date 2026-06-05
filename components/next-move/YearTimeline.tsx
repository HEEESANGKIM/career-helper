import type { YearNode } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

const nodeStyle: Record<YearNode["nodeType"], string> = {
  event: "next-move-node next-move-node-event",
  skill: "next-move-node next-move-node-skill",
  risk: "next-move-node next-move-node-risk",
  reward: "next-move-node next-move-node-reward",
  boss: "next-move-node next-move-node-boss",
};

const nodeGlyph: Record<YearNode["nodeType"], string> = {
  event: "?",
  skill: "+",
  risk: "!",
  reward: "$",
  boss: "★",
};

export function YearTimeline({ language, years }: { language: NextMoveLanguage; years: YearNode[] }) {
  const isKo = language === "ko";
  return (
    <div className="next-move-timeline">
      <svg className="absolute inset-0 h-full w-full text-[var(--muted)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {years.flatMap((node) =>
          node.branchesTo.map((targetId) => {
            const target = years.find((item) => item.id === targetId);
            if (!target) return null;
            return (
              <path
                key={`${node.id}-${target.id}`}
                d={`M ${node.x} ${node.y} C ${(node.x + target.x) / 2} ${node.y - 10}, ${(node.x + target.x) / 2} ${target.y + 10}, ${target.x} ${target.y}`}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="0.7"
                strokeDasharray={target.status === "locked" ? "2 2" : "0"}
              />
            );
          }),
        )}
      </svg>
      {years.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-[22px] border p-3 text-center shadow-[var(--card-shadow)] transition hover:-translate-y-[54%] hover:scale-105 ${nodeStyle[node.nodeType]} ${
            node.status === "active"
              ? "ring-2 ring-[color-mix(in_srgb,var(--accent-2)_45%,transparent)] shadow-[var(--shadow-soft)]"
              : node.status === "completed"
                ? "opacity-95"
                : "opacity-55"
          }`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div className="next-move-node-glyph mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-black">
            {nodeGlyph[node.nodeType]}
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">{isKo ? node.labelKo : node.label}</p>
          <p className="mt-1 text-xs font-bold leading-4 text-[var(--foreground)]">{isKo ? node.headlineKo : node.headline}</p>
        </button>
      ))}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
        {(["event", "skill", "risk", "reward", "boss"] as const).map((type) => (
          <span key={type} className={`rounded-full border px-2.5 py-1 ${nodeStyle[type]}`}>
            {isKo ? ({ event: "이벤트", skill: "스킬", risk: "리스크", reward: "보상", boss: "보스" }[type]) : type}
          </span>
        ))}
      </div>
    </div>
  );
}
