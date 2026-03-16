"use client";

import { FormEvent, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user) {
      setMessage("가입 성공! 확인 이메일을 확인하고 로그인하세요.");
      return;
    }

    setMessage("회원가입 요청을 받았습니다. 이메일을 확인하세요.");
  };

  const handleGoogleRegister = async () => {
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

    setMessage("Google 가입/로그인 창을 열었습니다. 브라우저에서 계속 진행해 주세요.");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mt-2 text-sm text-slate-600">이메일과 비밀번호로 간단히 가입하세요.</p>

        <form className="mt-5 space-y-3" onSubmit={handleRegister}>
          <div>
            <label className="mb-1 block text-sm font-medium">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="my-3 border-t border-slate-200 pt-3">
          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Google로 가입/로그인
          </button>
        </div>

        {message && <p className="mt-2 rounded-md bg-slate-100 p-2 text-sm text-slate-700">{message}</p>}

        <div className="mt-4 text-center text-sm text-slate-600">
          이미 계정이 있나요? <Link className="font-medium text-indigo-600 hover:text-indigo-700" href="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}
