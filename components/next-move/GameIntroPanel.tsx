import { Play, Route, Sparkles } from "lucide-react";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

type GameIntroPanelProps = {
  language: NextMoveLanguage;
  onStart: () => void;
  onSample: () => void;
};

const introCopy = {
  en: {
    mode: "Appendix Game Mode",
    subtitle: "Play a 5-year career strategy run based on your interests.",
    body: "This is a game-like appendix mode for exploring career decisions. Your main dashboard remains the command center for real profile tracking.",
    start: "Start Run",
    sample: "View Sample Run",
    cards: [
      ["5 Years", "Each year is one turn with future events and choices."],
      ["Career Cards", "Event rarity, actions, and random turns will expand later."],
      ["Strategy Run", "Pick a theme, spend action points, survive tradeoffs."],
    ],
  },
  ko: {
    mode: "부록 게임 모드",
    subtitle: "관심사 기반으로 5년 커리어 전략 런을 플레이하세요.",
    body: "Next Move는 커리어 결정을 게임처럼 실험하는 부록 모드입니다. 실제 프로필 추적과 핵심 관리는 메인 대시보드에서 계속 진행됩니다.",
    start: "런 시작",
    sample: "샘플 런 보기",
    cards: [
      ["5년", "각 해는 하나의 턴이며, 이후 이벤트와 선택지가 붙습니다."],
      ["커리어 카드", "이벤트 희귀도, 행동, 랜덤 턴은 다음 단계에서 확장됩니다."],
      ["전략 런", "테마를 고르고, 행동 포인트를 쓰고, 트레이드오프를 버티세요."],
    ],
  },
};

export function GameIntroPanel({ language, onStart, onSample }: GameIntroPanelProps) {
  const copy = introCopy[language];
  return (
    <section className="next-move-hero p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-2),transparent)]" />
      <div className="grid min-h-[620px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="next-move-kicker">{copy.mode}</p>
          <h1 className="gradient-title mt-6 max-w-4xl text-5xl font-black leading-none sm:text-6xl lg:text-7xl">
            Next Move
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[var(--muted-strong)]">
            {copy.subtitle}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {copy.body}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onStart} className="primary-btn px-5 py-3 text-sm">
              <Play size={16} aria-hidden="true" />
              {copy.start}
            </button>
            <button type="button" onClick={onSample} className="secondary-btn px-5 py-3 text-sm">
              <Route size={16} aria-hidden="true" />
              {copy.sample}
            </button>
          </div>
        </div>
        <div className="grid gap-4">
          {copy.cards.map(([title, body]) => (
            <div key={title} className="next-move-inner-card p-5">
              <Sparkles className="text-[var(--accent-2)]" size={18} aria-hidden="true" />
              <p className="mt-4 text-xl font-black text-[var(--foreground)]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
