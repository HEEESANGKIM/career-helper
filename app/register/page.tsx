"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

export default function RegisterPage() {
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

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      setMessage(envMissingMessage);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setMessage(t("가입과 동시에 로그인되었습니다. 잠시 후 대시보드로 이동합니다.", "Signed up and logged in. Redirecting to dashboard."));
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);
      return;
    }

    setMessage(
      t(
        "가입 성공! 확인 이메일을 클릭한 뒤 로그인하세요. 이메일 인증을 끄면 바로 로그인됩니다.",
        "Sign-up successful. Verify your email, then log in. If email confirmation is disabled, you can log in immediately.",
      ),
    );
  };

  const handleGoogleRegister = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setMessage(envMissingMessage);
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(t("Google 가입/로그인 창이 열렸습니다. 브라우저에서 계속 진행해 주세요.", "Google sign-up window has opened. Continue in your browser."));
  };

  return (
    <div className="app-bg px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="surface-card p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Career Helper</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("회원가입", "Sign Up")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("기본 정보로 빠르게 계정을 만드세요.", "Create your account quickly.")}</p>

          <form className="mt-5 space-y-3" onSubmit={handleRegister}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">{t("이메일", "Email")}</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-900">{t("비밀번호", "Password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="field"
                placeholder={t("6자 이상", "6+ characters")}
              />
            </div>
            <button disabled={loading} className="primary-btn w-full px-3 py-2.5 text-sm disabled:opacity-60">
              {loading ? t("가입 중...", "Signing up...") : t("회원가입", "Sign Up")}
            </button>
          </form>

          <div className="my-4 border-t border-slate-200 pt-4">
            <button
              onClick={handleGoogleRegister}
              disabled={loading}
              className="secondary-btn w-full px-3 py-2.5 text-sm disabled:opacity-60"
            >
              {t("Google로 가입/로그인", "Continue with Google")}
            </button>
          </div>

          {message && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

          <div className="mt-4 text-center text-sm text-slate-600">
            {t("이미 계정이 있나요?", "Already have an account?")} {" "}
            <Link className="font-semibold text-blue-700 hover:text-blue-800" href="/login">
              {t("로그인", "Log in")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
