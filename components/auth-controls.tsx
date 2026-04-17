"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type Variant = "top" | "menu";

export default function AuthControls({ variant = "top" }: { variant?: Variant }) {
  const { language } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;
    const client = supabase;

    let mounted = true;

    const init = async () => {
      const { data } = await client.auth.getSession();
      if (mounted) {
        setIsLoggedIn(Boolean(data.session));
      }
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

  if (variant === "menu") {
    return isLoggedIn ? (
      <>
        <Link className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/my-info">
          {language === "en" ? "My Info" : "내 정보"}
        </Link>
        <button onClick={handleLogout} className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm">
          {language === "en" ? "Log out" : "로그아웃"}
        </button>
      </>
    ) : (
      <>
        <Link className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/login">
          {language === "en" ? "Log in" : "로그인"}
        </Link>
        <Link className="secondary-btn flex w-full items-center justify-start px-3 py-2 text-left text-sm" href="/register">
          {language === "en" ? "Sign up" : "회원가입"}
        </Link>
      </>
    );
  }

  return isLoggedIn ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href="/my-info" className="secondary-btn px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs">
        {language === "en" ? "My Info" : "내 정보"}
      </Link>
      <button onClick={handleLogout} className="secondary-btn px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs">
        {language === "en" ? "Log out" : "로그아웃"}
      </button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href="/login" className="secondary-btn px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs">
        {language === "en" ? "Log in" : "로그인"}
      </Link>
      <Link href="/register" className="primary-btn px-2.5 py-2 text-[11px] sm:px-3 sm:text-xs">
        {language === "en" ? "Sign up" : "회원가입"}
      </Link>
    </div>
  );
}
