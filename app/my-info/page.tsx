"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

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
  desired_companies: string | null;
};

type AlertItem = {
  id: string;
  company: string;
  title: string;
  postedAt: string;
  url: string;
};

export default function MyInfoPage() {
  const { tx } = useLanguage();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [provider, setProvider] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [desiredCompanies, setDesiredCompanies] = useState("");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCompanies, setSavingCompanies] = useState(false);

  const loadAlerts = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const res = await fetch("/api/job-alerts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (res.ok) setAlerts(json.items ?? []);
  };

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage(tx("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are missing. Please check .env.local."));
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
      const fallbackNickname = userEmail.includes("@") ? userEmail.split("@")[0] : tx("사용자", "User");

      setEmail(userEmail);
      setAvatarUrl((metadata.avatar_url as string) || (metadata.picture as string) || "");
      setNickname((metadata.preferred_username as string) || (metadata.full_name as string) || (metadata.name as string) || fallbackNickname);
      setProvider((user.app_metadata?.provider as string) || "email");
      setJoinedAt(user.created_at ? new Date(user.created_at).toLocaleDateString() : "");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, school_name, education_level, major, target_role, preferred_location, portfolio_url, github_url, language_test_name, language_test_score, desired_companies",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
      } else {
        setProfile(data);
        setDesiredCompanies(data?.desired_companies ?? "");
        if (data?.full_name) setNickname(data.full_name);
      }

      await loadAlerts();
      setLoading(false);
    };

    void load();
  }, []);

  const saveDesiredCompanies = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    setSavingCompanies(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, desired_companies: desiredCompanies.trim(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSavingCompanies(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(tx("희망기업 저장 완료. 알림 목록을 갱신합니다.", "Target companies saved. Refreshing alerts."));
    await loadAlerts();
  };

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
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{tx("내정보", "My Info")}</h1>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">{tx("정보를 불러오는 중입니다...", "Loading your information...")}</p>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="profile" className="h-16 w-16 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">{initials}</div>
                )}
                <div>
                  <p className="text-xl font-semibold text-slate-900">{nickname || tx("사용자", "User")}</p>
                  <p className="text-sm text-slate-600">{email}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{tx("기본 회원정보", "Account basics")}</p>
                  <p className="mt-2">{tx("로그인 방식", "Login method")}: {provider}</p>
                  <p>{tx("가입일", "Joined")}: {joinedAt || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{tx("학력/희망정보", "Education & preferences")}</p>
                  <p className="mt-2">{tx("학교", "School")}: {profile?.school_name || "-"}</p>
                  <p>{tx("학력", "Education level")}: {profile?.education_level || "-"}</p>
                  <p>{tx("전공", "Major")}: {profile?.major || "-"}</p>
                  <p>{tx("희망직무", "Target role")}: {profile?.target_role || "-"}</p>
                  <p>{tx("희망지역", "Preferred location")}: {profile?.preferred_location || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{tx("링크", "Links")}</p>
                  <p className="mt-2 break-all">{tx("포트폴리오", "Portfolio")}: {profile?.portfolio_url || "-"}</p>
                  <p className="break-all">GitHub: {profile?.github_url || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{tx("어학 정보", "Language test info")}</p>
                  <p className="mt-2">{tx("시험", "Test")}: {profile?.language_test_name || "-"}</p>
                  <p>{tx("점수/등급", "Score/Grade")}: {profile?.language_test_score || "-"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{tx("희망 기업 알림", "Target company alerts")}</p>
                <p className="mt-1 text-xs text-slate-500">{tx("쉼표로 구분해서 입력하세요. 예: 삼성전자, Google, 네이버", "Separate with commas. Ex: Samsung Electronics, Google, Naver")}</p>
                <textarea value={desiredCompanies} onChange={(e) => setDesiredCompanies(e.target.value)} className="field mt-2 min-h-20" />
                <button onClick={saveDesiredCompanies} disabled={savingCompanies} className="primary-btn mt-2 px-4 py-2 text-sm disabled:opacity-60">
                  {savingCompanies ? tx("저장 중...", "Saving...") : tx("희망기업 저장", "Save target companies")}
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{tx("최근 공고 알림", "Recent job alerts")}</p>
                {alerts.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">{tx("등록된 알림이 없습니다. 희망 기업을 먼저 저장하세요.", "No alerts yet. Save target companies first.")}</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {alerts.map((alert) => (
                      <a
                        key={alert.id}
                        href={alert.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-semibold text-slate-900">{alert.company}</p>
                        <p className="text-slate-700">{alert.title}</p>
                        <p className="text-xs text-slate-500">{tx("게시일", "Posted")}: {alert.postedAt}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Link href="/profile" className="primary-btn px-4 py-2 text-sm">
                  {tx("프로필 수정", "Edit profile")}
                </Link>
                <Link href="/dashboard" className="secondary-btn px-4 py-2 text-sm">
                  {tx("대시보드", "Dashboard")}
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
