"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

const mapAuthError = (message: string, isEn: boolean) => {
  if (message.toLowerCase().includes("email not confirmed")) {
    return isEn
      ? "Email confirmation is not complete. Disable Confirm email in Supabase Authentication if needed."
      : "이메일 인증이 완료되지 않았습니다. 인증을 끄려면 Supabase Authentication 설정에서 Confirm email을 비활성화하세요.";
  }
  return message;
};

export default function LoginPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = (ko: string, en: string) => (isEn ? en : ko);

  const envMissingMessage = t(
    "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.",
    "Supabase environment variables are not configured. Check .env.local.",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      setMessage(envMissingMessage);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setMessage(mapAuthError(error.message, isEn));
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage(t("로그인 세션을 만들지 못했습니다. 다시 시도해 주세요.", "Could not create login session. Please try again."));
  };

  const handleGoogleLogin = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setMessage(envMissingMessage);
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      t(
        "Google 로그인 창이 열렸습니다. 브라우저에서 계속 진행해 주세요.",
        "Google login window has opened. Continue in your browser.",
      ),
    );
  };

  return (
    <div className="app-bg px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="surface-card p-7">
          <p className="page-kicker">Pathmate.ai</p>
          <h1 className="gradient-title mt-4 text-3xl font-semibold">{t("로그인", "Log In")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("이메일 또는 Google 계정으로 로그인하세요.", "Sign in with email or Google account.")}</p>

          <form className="mt-5 space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="form-label">{t("이메일", "Email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="form-label">{t("비밀번호", "Password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field"
                placeholder={t("비밀번호", "Password")}
              />
            </div>
            <button disabled={loading} className="primary-btn w-full px-3 py-2.5 text-sm disabled:opacity-60">
              {loading ? t("로그인 중...", "Signing in...") : t("로그인", "Log In")}
            </button>
          </form>

          <div className="my-4 border-t border-[var(--line)] pt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="secondary-btn w-full px-3 py-2.5 text-sm disabled:opacity-60"
            >
              {t("Google로 로그인", "Continue with Google")}
            </button>
          </div>

          {message && <p className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--muted-strong)]">{message}</p>}

          <div className="mt-4 text-center text-sm text-[var(--muted)]">
            {t("아직 계정이 없나요?", "No account yet?")} {" "}
            <Link className="font-medium text-[var(--accent-2)] hover:text-[var(--accent-2)]" href="/register">
              {t("회원가입", "Sign up")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



