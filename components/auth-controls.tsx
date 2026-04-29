"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Variant = "top" | "menu";

const appNav = [
  { href: "/dashboard", labelKo: "대시보드", labelEn: "Dashboard" },
  { href: "/matching", labelKo: "매칭", labelEn: "Match" },
  { href: "/simulator", labelKo: "면접 연습", labelEn: "Drill" },
  { href: "/cover-letter", labelKo: "지원서", labelEn: "Write" },
  { href: "/interview/hiring-manager", labelKo: "취업 시뮬레이터", labelEn: "Hiring Simulator" },
  { href: "/career-chess", labelKo: "체스", labelEn: "Chess" },
  { href: "/background-check", labelKo: "체크", labelEn: "Check" },
  { href: "/profile", labelKo: "프로필", labelEn: "Profile" },
];

export default function AuthControls({ variant = "top" }: { variant?: Variant }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isKo = language === "ko";
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
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));

  if (variant === "menu") {
    return isLoggedIn ? (
      <>
        {navLinks.map((item) => (
          <Link key={item.href} className={`flex w-full items-center justify-start px-3 py-2 text-left text-sm ${item.active ? "accent-pill" : "secondary-btn"}`} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/my-info">
          Account
        </Link>
        <button onClick={handleLogout} className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm">
          Log out
        </button>
      </>
    ) : (
      <>
        <Link className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/login">
          Log in
        </Link>
        <Link className="primary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/register">
          Sign up
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
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
              item.active
                ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-[0_10px_26px_rgba(124,58,237,0.28)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="App navigation"
        className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:flex"
      >
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
              item.active
                ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-[0_10px_26px_rgba(124,58,237,0.28)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/my-info" className="secondary-btn px-3 py-2 text-xs">
        {isKo ? "계정" : "Account"}
      </Link>
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
        {isKo ? "가입" : "Sign up"}
      </Link>
    </div>
  );
}
