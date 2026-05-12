import type { YearNode } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

const nodeStyle: Record<YearNode["nodeType"], string> = {
  event: "border-cyan-300/55 bg-cyan-300/14 text-cyan-100",
  skill: "border-emerald-300/55 bg-emerald-300/14 text-emerald-100",
  risk: "border-rose-300/55 bg-rose-300/14 text-rose-100",
  reward: "border-amber-300/55 bg-amber-300/14 text-amber-100",
  boss: "border-purple-300/60 bg-purple-300/16 text-purple-100",
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
    <div className="relative min-h-[440px] overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(6,182,212,0.14),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.55),rgba(2,6,23,0.88))] p-4">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {years.flatMap((node) =>
          node.branchesTo.map((targetId) => {
            const target = years.find((item) => item.id === targetId);
            if (!target) return null;
            return (
              <path
                key={`${node.id}-${target.id}`}
                d={`M ${node.x} ${node.y} C ${(node.x + target.x) / 2} ${node.y - 10}, ${(node.x + target.x) / 2} ${target.y + 10}, ${target.x} ${target.y}`}
                fill="none"
                stroke="rgba(148,163,184,0.38)"
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
          className={`absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-[22px] border p-3 text-center shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur transition hover:-translate-y-[54%] hover:scale-105 ${nodeStyle[node.nodeType]} ${
            node.status === "active"
              ? "ring-2 ring-cyan-200/60 shadow-[0_0_34px_rgba(34,211,238,0.34),0_18px_42px_rgba(0,0,0,0.42)]"
              : node.status === "completed"
                ? "opacity-95"
                : "opacity-55"
          }`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/28 text-lg font-black">
            {nodeGlyph[node.nodeType]}
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] opacity-70">{isKo ? node.labelKo : node.label}</p>
          <p className="mt-1 text-xs font-bold leading-4">{isKo ? node.headlineKo : node.headline}</p>
        </button>
      ))}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white/52">
        {(["event", "skill", "risk", "reward", "boss"] as const).map((type) => (
          <span key={type} className={`rounded-full border px-2.5 py-1 ${nodeStyle[type]}`}>
            {isKo ? ({ event: "이벤트", skill: "스킬", risk: "리스크", reward: "보상", boss: "보스" }[type]) : type}
          </span>
        ))}
      </div>
    </div>
  );
}
