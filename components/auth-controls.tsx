"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type Variant = "top" | "menu";

export default function AuthControls({ variant = "top" }: { variant?: Variant }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { tx } = useLanguage();

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
        <Link className="secondary-btn px-3 py-2 text-sm" href="/my-info">
          {tx("내정보", "My Info")}
        </Link>
        <button onClick={handleLogout} className="secondary-btn px-3 py-2 text-sm">
          {tx("로그아웃", "Log out")}
        </button>
      </>
    ) : (
      <>
        <Link className="secondary-btn px-3 py-2 text-sm" href="/login">
          {tx("로그인", "Log in")}
        </Link>
        <Link className="secondary-btn px-3 py-2 text-sm" href="/register">
          {tx("회원가입", "Sign up")}
        </Link>
      </>
    );
  }

  return isLoggedIn ? (
    <div className="flex items-center gap-2">
      <Link href="/my-info" className="secondary-btn px-3 py-2 text-xs">
        {tx("내정보", "My Info")}
      </Link>
      <button onClick={handleLogout} className="secondary-btn px-3 py-2 text-xs">
        {tx("로그아웃", "Log out")}
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/login" className="secondary-btn px-3 py-2 text-xs">
        {tx("로그인", "Log in")}
      </Link>
      <Link href="/register" className="primary-btn px-3 py-2 text-xs">
        {tx("회원가입", "Sign up")}
      </Link>
    </div>
  );
}
