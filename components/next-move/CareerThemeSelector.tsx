import type { CareerTheme, CareerThemeId } from "@/lib/next-move/mockNextMoveData";
import type { NextMoveLanguage } from "@/components/next-move/NextMoveShell";

type CareerThemeSelectorProps = {
  language: NextMoveLanguage;
  themes: CareerTheme[];
  onSelectTheme: (themeId: CareerThemeId) => void;
  onBack: () => void;
};

export function CareerThemeSelector({ language, themes, onSelectTheme, onBack }: CareerThemeSelectorProps) {
  const isKo = language === "ko";
  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="next-move-kicker">{isKo ? "장르 선택" : "Choose Your Genre"}</p>
          <h1 className="mt-5 text-4xl font-black text-[var(--foreground)] sm:text-5xl">{isKo ? "커리어 테마를 선택하세요" : "Pick a career theme"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{isKo ? "테마는 시작 스탯, 분위기, 첫 5년 런의 방향을 정합니다." : "Your theme sets starting stats, flavor, and the first 5-year run direction."}</p>
        </div>
        <button type="button" onClick={onBack} className="secondary-btn px-4 py-2 text-sm">{isKo ? "뒤로" : "Back"}</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {themes.map((theme) => {
          const Icon = theme.visualIcon;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              className={`group min-h-[420px] rounded-[26px] border border-[var(--line)] bg-gradient-to-br ${theme.accentClass} p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent-2)_50%,var(--line))] hover:shadow-[var(--shadow)]`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--foreground)]">
                <Icon size={22} aria-hidden="true" />
              </div>
              <p className="mt-5 text-2xl font-black text-[var(--foreground)]">{isKo ? theme.titleKo : theme.title}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--muted-strong)]">{isKo ? theme.subtitleKo : theme.subtitle}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{isKo ? theme.descriptionKo : theme.description}</p>
              <div className="mt-5 grid gap-2">
                {Object.entries(theme.startingStats).slice(0, 3).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase text-[var(--muted)]">
                      <span>{key}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--line)]">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="next-move-subcard mt-6 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">{isKo ? "추천 목표" : "Recommended Goal"}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{isKo ? theme.recommendedGoalKo : theme.recommendedGoal}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
