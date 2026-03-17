"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const envMissingMessage = "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.";

const mapAuthError = (message: string) => {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 인증을 끄려면 Supabase Authentication 설정에서 Confirm email을 비활성화하세요.";
  }
  return message;
};

export default function LoginPage() {
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
      setMessage(mapAuthError(error.message));
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage("로그인 세션을 만들지 못했습니다. 다시 시도해 주세요.");
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
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Google 로그인 창이 열렸습니다. 브라우저에서 계속 진행해 주세요.");
  };

  return (
    <div className="app-bg px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="surface-card p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Career Helper</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">로그인</h1>
          <p className="mt-1 text-sm text-slate-600">이메일 또는 Google 계정으로 로그인하세요.</p>

          <form className="mt-5 space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">이메일</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-900">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field"
                placeholder="비밀번호"
              />
            </div>
            <button disabled={loading} className="primary-btn w-full px-3 py-2.5 text-sm disabled:opacity-60">
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="my-4 border-t border-slate-200 pt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="secondary-btn w-full px-3 py-2.5 text-sm disabled:opacity-60"
            >
              Google로 로그인
            </button>
          </div>

          {message && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

          <div className="mt-4 text-center text-sm text-slate-600">
            아직 계정이 없나요?{" "}
            <Link className="font-semibold text-blue-700 hover:text-blue-800" href="/register">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
