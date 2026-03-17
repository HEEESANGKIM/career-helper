"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Variant = "top" | "menu";

export default function AuthControls({ variant = "top" }: { variant?: Variant }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setIsLoggedIn(Boolean(data.session));
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
          내정보
        </Link>
        <button onClick={handleLogout} className="secondary-btn px-3 py-2 text-sm">
          로그아웃
        </button>
      </>
    ) : (
      <>
        <Link className="secondary-btn px-3 py-2 text-sm" href="/login">
          로그인
        </Link>
        <Link className="secondary-btn px-3 py-2 text-sm" href="/register">
          회원가입
        </Link>
      </>
    );
  }

  return isLoggedIn ? (
    <div className="flex items-center gap-2">
      <Link href="/my-info" className="secondary-btn px-3 py-2 text-xs">
        내정보
      </Link>
      <button onClick={handleLogout} className="secondary-btn px-3 py-2 text-xs">
        로그아웃
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link href="/login" className="secondary-btn px-3 py-2 text-xs">
        로그인
      </Link>
      <Link href="/register" className="primary-btn px-3 py-2 text-xs">
        회원가입
      </Link>
    </div>
  );
}
