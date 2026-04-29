"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
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
  const { language } = useLanguage();
  const isEn = language === "en";

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [provider, setProvider] = useState("");
  const [joinedAtRaw, setJoinedAtRaw] = useState("");
  const [desiredCompanies, setDesiredCompanies] = useState("");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCompanies, setSavingCompanies] = useState(false);

  const loadAlerts = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const session = await getSessionWithRetry();
    const token = session?.access_token;
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
        setMessage(isEn ? "Supabase environment variables are not configured. Check .env.local." : "Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
        setLoading(false);
        return;
      }

      const session = await getSessionWithRetry();
      if (!session) {
        window.location.href = "/login";
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
      const fallbackNickname = userEmail.includes("@") ? userEmail.split("@")[0] : isEn ? "User" : "사용자";

      setEmail(userEmail);
      setAvatarUrl((metadata.avatar_url as string) || (metadata.picture as string) || "");
      setNickname((metadata.preferred_username as string) || (metadata.full_name as string) || (metadata.name as string) || fallbackNickname);
      setProvider((user.app_metadata?.provider as string) || "email");
      setJoinedAtRaw(user.created_at ?? "");

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
  }, [isEn]);

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

    setMessage(isEn ? "Saved desired companies. Refreshing alerts." : "희망기업 저장 완료. 알림 목록을 갱신합니다.");
    await loadAlerts();
  };

  const initials = useMemo(() => {
    const source = nickname.trim();
    if (!source) return "U";
    return source.slice(0, 1).toUpperCase();
  }, [nickname]);

  const joinedAt = useMemo(() => {
    if (!joinedAtRaw) return "-";
    return new Date(joinedAtRaw).toLocaleDateString(isEn ? "en-US" : "ko-KR");
  }, [joinedAtRaw, isEn]);

  return (
    <PageShell maxWidth="max-w-6xl">
      <PageHeader
        eyebrow="Account Cockpit"
        title={isEn ? "My Information" : "내정보"}
        description={isEn ? "Manage your account, profile links, and desired company alerts." : "계정, 프로필 링크, 희망 기업 알림을 한 화면에서 관리하세요."}
      />
      <PagePanel>
          <SectionTitle title={isEn ? "Account signal" : "계정 시그널"} description={isEn ? "Profile identity, links, and company alerts stay in the same cockpit system." : "프로필 정체성, 링크, 희망 기업 알림을 같은 콕핏 안에서 관리합니다."} />

          {loading ? (
            <Notice className="mt-4">{isEn ? "Loading your information..." : "정보를 불러오는 중입니다..."}</Notice>
          ) : (
            <>
              <div className="content-card mt-5 flex items-center gap-4 p-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="profile" className="h-16 w-16 rounded-full border border-[var(--line)] object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold text-[var(--foreground)]">{initials}</div>
                )}
                <div>
                  <p className="text-xl font-medium text-[var(--foreground)]">{nickname || (isEn ? "User" : "사용자")}</p>
                  <p className="text-sm text-[var(--muted)]">{email}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="content-card p-4 text-sm text-[var(--muted-strong)]">
                  <p className="font-medium text-[var(--foreground)]">{isEn ? "Basic Account Info" : "기본 회원정보"}</p>
                  <p className="mt-2">{isEn ? "Login method" : "로그인 방식"}: {provider}</p>
                  <p>{isEn ? "Joined at" : "가입일"}: {joinedAt}</p>
                </div>
                <div className="content-card p-4 text-sm text-[var(--muted-strong)]">
                  <p className="font-medium text-[var(--foreground)]">{isEn ? "Education / Preference" : "학력/희망정보"}</p>
                  <p className="mt-2">{isEn ? "School" : "학교"}: {profile?.school_name || "-"}</p>
                  <p>{isEn ? "Education level" : "학력"}: {profile?.education_level || "-"}</p>
                  <p>{isEn ? "Major" : "전공"}: {profile?.major || "-"}</p>
                  <p>{isEn ? "Target role" : "희망직무"}: {profile?.target_role || "-"}</p>
                  <p>{isEn ? "Preferred location" : "희망지역"}: {profile?.preferred_location || "-"}</p>
                </div>
                <div className="content-card p-4 text-sm text-[var(--muted-strong)]">
                  <p className="font-medium text-[var(--foreground)]">{isEn ? "Links" : "링크"}</p>
                  <p className="mt-2 break-all">{isEn ? "Portfolio" : "포트폴리오"}: {profile?.portfolio_url || "-"}</p>
                  <p className="break-all">GitHub: {profile?.github_url || "-"}</p>
                </div>
                <div className="content-card p-4 text-sm text-[var(--muted-strong)]">
                  <p className="font-medium text-[var(--foreground)]">{isEn ? "Language Test" : "어학 정보"}</p>
                  <p className="mt-2">{isEn ? "Test" : "시험"}: {profile?.language_test_name || "-"}</p>
                  <p>{isEn ? "Score / Grade" : "점수/등급"}: {profile?.language_test_score || "-"}</p>
                </div>
              </div>

              <div className="content-card mt-4 p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">{isEn ? "Desired Company Alerts" : "희망 기업 알림"}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {isEn ? "Use commas to separate names. Example: Samsung Electronics, Google, NAVER" : "쉼표로 구분해서 입력하세요. 예: 삼성전자, Google, 네이버"}
                </p>
                <textarea value={desiredCompanies} onChange={(e) => setDesiredCompanies(e.target.value)} className="field mt-2 min-h-20" />
                <button onClick={saveDesiredCompanies} disabled={savingCompanies} className="primary-btn mt-2 px-4 py-2 text-sm disabled:opacity-60">
                  {savingCompanies ? (isEn ? "Saving..." : "저장 중...") : isEn ? "Save Desired Companies" : "희망기업 저장"}
                </button>
              </div>

              <div className="content-card mt-4 p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">{isEn ? "Recent Job Alerts" : "최근 공고 알림"}</p>
                {alerts.length === 0 ? (
                  <EmptyState>{isEn ? "No alerts yet. Save desired companies first." : "등록된 알림이 없습니다. 희망 기업을 먼저 저장하세요."}</EmptyState>
                ) : (
                  <div className="mt-2 space-y-2">
                    {alerts.map((alert) => (
                      <a
                        key={alert.id}
                        href={alert.url}
                        target="_blank"
                        rel="noreferrer"
                        className="content-card clickable-card block p-3 text-sm"
                      >
                        <p className="font-medium text-[var(--foreground)]">{alert.company}</p>
                        <p className="text-[var(--muted-strong)]">{alert.title}</p>
                        <p className="text-xs text-[var(--muted)]">{isEn ? "Posted at" : "게시일"}: {alert.postedAt}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link href="/profile" className="primary-btn px-4 py-2 text-sm">
                  {isEn ? "Edit Profile" : "프로필 수정"}
                </Link>
                <Link href="/dashboard" className="secondary-btn px-4 py-2 text-sm">
                  {isEn ? "Dashboard" : "대시보드"}
                </Link>
              </div>
            </>
          )}

          {message && <Notice className="mt-4">{message}</Notice>}
      </PagePanel>
    </PageShell>
  );
}



