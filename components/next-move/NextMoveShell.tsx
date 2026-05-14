"use client";

import { useState } from "react";
import { careerThemes, type CareerTheme, type CareerThemeId } from "@/lib/next-move/mockNextMoveData";
import { GameIntroPanel } from "@/components/next-move/GameIntroPanel";
import { CareerThemeSelector } from "@/components/next-move/CareerThemeSelector";
import { CareerRunBoard } from "@/components/next-move/CareerRunBoard";
import { useLanguage } from "@/components/language-provider";

type ScreenState = "intro" | "theme-select" | "run";
export type NextMoveLanguage = "ko" | "en";

export function NextMoveShell() {
  const { language } = useLanguage();
  const gameLanguage: NextMoveLanguage = language === "en" ? "en" : "ko";
  const [screen, setScreen] = useState<ScreenState>("intro");
  const [selectedTheme, setSelectedTheme] = useState<CareerTheme>(careerThemes[0]);

  const handleSelectTheme = (themeId: CareerThemeId) => {
    const theme = careerThemes.find((item) => item.id === themeId) ?? careerThemes[0];
    setSelectedTheme(theme);
    setScreen("run");
  };

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-7 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        {screen === "intro" ? (
          <GameIntroPanel language={gameLanguage} onStart={() => setScreen("theme-select")} onSample={() => setScreen("run")} />
        ) : null}
        {screen === "theme-select" ? (
          <CareerThemeSelector language={gameLanguage} themes={careerThemes} onSelectTheme={handleSelectTheme} onBack={() => setScreen("intro")} />
        ) : null}
        {screen === "run" ? (
          <CareerRunBoard language={gameLanguage} selectedTheme={selectedTheme} onReset={() => setScreen("theme-select")} />
        ) : null}
      </div>
    </main>
  );
}
