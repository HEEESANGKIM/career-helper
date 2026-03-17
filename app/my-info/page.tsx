"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type MyProfile = {
  full_name: string | null;
  school_name: string | null;
  education_level: string | null;
  major: string | null;
  target_role: string | null;
  preferred_location: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  language_test_name: string | null;
  language_test_score: string | null;
};

export default function MyInfoPage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [provider, setProvider] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        window.location.href = "/login";
        return;
      }

      const user = userData.user;
      const metadata = user.user_metadata ?? {};
      const userEmail = user.email ?? "";
      const fallbackNickname = userEmail.includes("@") ? userEmail.split("@")[0] : "사용자";

      setEmail(userEmail);
      setAvatarUrl((metadata.avatar_url as string) || (metadata.picture as string) || "");
      setNickname(
        (metadata.preferred_username as string) ||
          (metadata.full_name as string) ||
          (metadata.name as string) ||
          fallbackNickname,
      );
      setProvider((user.app_metadata?.provider as string) || "email");
      setJoinedAt(user.created_at ? new Date(user.created_at).toLocaleDateString() : "");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, school_name, education_level, major, target_role, preferred_location, portfolio_url, github_url, language_test_name, language_test_score",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
      } else {
        setProfile(data);
        if (data?.full_name) {
          setNickname(data.full_name);
        }
      }

      setLoading(false);
    };

    void load();
  }, []);

  const initials = useMemo(() => {
    const source = nickname.trim();
    if (!source) return "U";
    return source.slice(0, 1).toUpperCase();
  }, [nickname]);

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">My Info</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">내정보</h1>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">정보를 불러오는 중입니다...</p>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="profile" className="h-16 w-16 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-xl font-semibold text-slate-900">{nickname || "사용자"}</p>
                  <p className="text-sm text-slate-600">{email}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">기본 회원정보</p>
                  <p className="mt-2">로그인 방식: {provider}</p>
                  <p>가입일: {joinedAt || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">학력/희망정보</p>
                  <p className="mt-2">학교: {profile?.school_name || "-"}</p>
                  <p>학력: {profile?.education_level || "-"}</p>
                  <p>전공: {profile?.major || "-"}</p>
                  <p>희망직무: {profile?.target_role || "-"}</p>
                  <p>희망지역: {profile?.preferred_location || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">링크</p>
                  <p className="mt-2 break-all">포트폴리오: {profile?.portfolio_url || "-"}</p>
                  <p className="break-all">GitHub: {profile?.github_url || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">어학 정보</p>
                  <p className="mt-2">시험: {profile?.language_test_name || "-"}</p>
                  <p>점수/등급: {profile?.language_test_score || "-"}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href="/profile" className="primary-btn px-4 py-2 text-sm">
                  프로필 수정
                </Link>
                <Link href="/dashboard" className="secondary-btn px-4 py-2 text-sm">
                  대시보드
                </Link>
              </div>
            </>
          )}

          {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
