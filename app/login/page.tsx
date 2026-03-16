"use client";

import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      setMessage("로그인 성공! 대시보드로 이동합니다...");
      window.location.href = "/dashboard";
      return;
    }

    setMessage("인증 메일을 확인해 주세요.");
  };

  const handleGoogleLogin = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
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
    setMessage("Google 로그인 시도 중입니다... 새 창에서 진행해 주세요.");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
        <p className="mt-2 text-sm text-slate-600">이메일/비밀번호 또는 Google로 로그인</p>

        <form className="mt-5 space-y-3" onSubmit={handleLogin}>
          <div>
            <label className="mb-1 block text-sm font-medium">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="my-3 border-t border-slate-200 pt-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Google로 로그인
          </button>
        </div>

        {message && <p className="mt-2 rounded-md bg-slate-100 p-2 text-sm text-slate-700">{message}</p>}

        <div className="mt-4 text-center text-sm text-slate-600">
          아직 계정이 없나요? <Link className="font-medium text-indigo-600 hover:text-indigo-700" href="/register">회원가입</Link>
        </div>
      </div>
    </div>
  );
}
