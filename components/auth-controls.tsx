"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { useProfileGate } from "@/components/profile-gate-provider";
import { isProfileGatedPath, PROFILE_GATE_SETTINGS_PATH, profileGateMessage } from "@/lib/profile-gate-paths";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Variant = "top" | "menu";

const appNav = [
  { href: "/dashboard", labelKo: "대시보드", labelEn: "Dashboard" },
  { href: "/cover-letter", labelKo: "이력서 랩", labelEn: "Resume Lab" },
  { href: "/hiring-simulator", labelKo: "채용 시뮬레이터", labelEn: "Hiring Simulator" },
  { href: "/next-move", labelKo: "넥스트 무브", labelEn: "Next Move" },
  { href: "/matching", labelKo: "채용 매칭", labelEn: "Job Match" },
  { href: "/settings", labelKo: "설정", labelEn: "Settings" },
];

export default function AuthControls({ variant = "top" }: { variant?: Variant }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { loading: gateLoading, isLoggedIn: gateLoggedIn, profileComplete } = useProfileGate();
  const isKo = language === "ko";
  const gateMessage = profileGateMessage(language);
  const gateActive = gateLoggedIn && !gateLoading && !profileComplete;
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;
    const client = supabase;
    let mounted = true;

    const init = async () => {
      const { data } = await client.auth.getSession();
      if (mounted) setIsLoggedIn(Boolean(data.session));
    };

    void init();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const navLinks = appNav.map((item) => ({
    ...item,
    label: isKo ? item.labelKo : item.labelEn,
    active:
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      (item.href === "/settings" && pathname.startsWith("/my-info")) ||
      (item.href === "/next-move" && pathname.startsWith("/career-chess")),
  }));

  if (variant === "menu") {
    return isLoggedIn ? (
      <>
        {navLinks.map((item) => {
          const isBlocked = gateActive && isProfileGatedPath(item.href);
          const href = isBlocked ? PROFILE_GATE_SETTINGS_PATH : item.href;
          return (
          <Link key={item.href} className={`flex w-full items-center justify-start px-3 py-2 text-left text-sm ${item.active ? "accent-pill" : "secondary-btn"}${isBlocked ? " opacity-55" : ""}`} href={href} title={isBlocked ? gateMessage : undefined}>
            {item.label}
          </Link>
          );
        })}
        <button onClick={handleLogout} className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm">
          {isKo ? "로그아웃" : "Log out"}
        </button>
      </>
    ) : (
      <>
        <Link className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/login">
          {isKo ? "로그인" : "Log in"}
        </Link>
        <Link className="primary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/register">
          {isKo ? "회원가입" : "Sign up"}
        </Link>
      </>
    );
  }

  return isLoggedIn ? (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
      <nav
        aria-label="App navigation"
        className="order-last flex w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden"
      >
        {navLinks.map((item) => {
          const isBlocked = gateActive && isProfileGatedPath(item.href);
          const href = isBlocked ? PROFILE_GATE_SETTINGS_PATH : item.href;
          return (
          <Link
            key={item.href}
            href={href}
            title={isBlocked ? gateMessage : undefined}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
              item.active
                ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-[0_10px_26px_rgba(124,58,237,0.28)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            }${isBlocked ? " opacity-55" : ""}`}
          >
            {item.label}
          </Link>
          );
        })}
      </nav>
      <nav
        aria-label="App navigation"
        className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:flex"
      >
        {navLinks.map((item) => {
          const isBlocked = gateActive && isProfileGatedPath(item.href);
          const href = isBlocked ? PROFILE_GATE_SETTINGS_PATH : item.href;
          return (
          <Link
            key={item.href}
            href={href}
            title={isBlocked ? gateMessage : undefined}
            className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
              item.active
                ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-[0_10px_26px_rgba(124,58,237,0.28)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            }${isBlocked ? " opacity-55" : ""}`}
          >
            {item.label}
          </Link>
          );
        })}
      </nav>
      <button onClick={handleLogout} className="secondary-btn px-3 py-2 text-xs">
        {isKo ? "로그아웃" : "Log out"}
      </button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href="/login" className="secondary-btn px-3 py-2 text-xs">
        {isKo ? "로그인" : "Log in"}
      </Link>
      <Link href="/register" className="primary-btn px-3 py-2 text-xs">
        {isKo ? "회원가입" : "Sign up"}
      </Link>
    </div>
  );
}
