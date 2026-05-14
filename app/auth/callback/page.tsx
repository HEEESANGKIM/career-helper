"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function AuthCallbackContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = (ko: string, en: string) => (isEn ? en : ko);
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(
    supabase && isSupabaseConfigured
      ? t("로그인을 마무리하는 중입니다...", "Finalizing secure sign-in...")
      : t("Supabase가 설정되지 않았습니다. 환경변수를 확인해 주세요.", "Supabase is not configured. Check your environment variables."),
  );
  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    const client = supabase;
    let mounted = true;

    const completeAuth = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          if (mounted) setMessage(error.message);
          return;
        }

      }

      const session = await getSessionWithRetry(25, 120);

      if (!mounted) return;

      if (session) {
        window.location.href = nextPath;
        return;
      }

      setMessage(t("활성 세션을 만들지 못했습니다. 다시 로그인해 주세요.", "No active session was created. Please try signing in again."));
    };

    void completeAuth();

    return () => {
      mounted = false;
    };
  }, [nextPath, searchParams]);

  return (
    <main className="app-bg grid min-h-screen place-items-center px-4">
      <section className="surface-card w-full max-w-md p-6 text-center">
        <p className="page-kicker">PathMate Auth</p>
        <h1 className="gradient-title mt-4 text-3xl font-semibold">{t("커리어 콕핏 열기", "Opening Career Cockpit")}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard" className="primary-btn px-4 py-2 text-sm">
            {t("대시보드로", "Go to dashboard")}
          </Link>
          <Link href="/login" className="secondary-btn px-4 py-2 text-sm">
            {t("로그인으로 돌아가기", "Back to login")}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="app-bg grid min-h-screen place-items-center px-4">
          <section className="surface-card w-full max-w-md p-6 text-center">
            <p className="page-kicker">PathMate Auth</p>
            <h1 className="gradient-title mt-4 text-3xl font-semibold">Opening Career Cockpit</h1>
          </section>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
