import type { GameStats } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

export function RunSummaryPreview({
  language,
  currentYear,
  stats,
  resolvedYears,
}: {
  language: NextMoveLanguage;
  currentYear: number;
  stats: GameStats;
  resolvedYears: number;
}) {
  const isKo = language === "ko";
  const momentum = stats.salary + stats.skill + stats.network + stats.reputation - stats.burnout;
  const projection =
    momentum >= 230
      ? isKo
        ? "강한 승리권"
        : "Strong win path"
      : momentum >= 190
        ? isKo
          ? "접전"
          : "Close run"
        : isKo
          ? "위험 구간"
          : "Danger zone";

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">{isKo ? "런 상태" : "Run Status"}</p>
      <h2 className="mt-1 text-2xl font-black text-white">{isKo ? "5년 커리어 런" : "Five-Year Career Run"}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryCell label={isKo ? "현재 연도" : "Current Year"} value={isKo ? `${currentYear}년차` : `Year ${currentYear}`} />
        <SummaryCell label={isKo ? "해결한 턴" : "Resolved Turns"} value={`${resolvedYears}/5`} />
        <SummaryCell label={isKo ? "예상 엔딩" : "Projection"} value={projection} />
      </div>
      <p className="mt-4 rounded-2xl border border-rose-300/24 bg-rose-400/[0.06] p-4 text-sm font-semibold leading-6 text-slate-300">
        <strong className="text-white">{isKo ? "핵심 리스크" : "Key Risk"}:</strong>{" "}
        {isKo ? "번아웃이 85 이상이면 마지막에 패배 엔딩으로 굴러갈 수 있습니다." : "If burnout reaches 85 or higher, the final outcome can collapse into a loss."}
      </p>
    </section>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-white">{value}</p>
    </div>
  );
}
