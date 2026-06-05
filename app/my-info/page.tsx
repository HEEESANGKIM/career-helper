"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { JobFavoritesPanel } from "@/components/job-favorites-panel";
import { Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { mergeSkillList, parseSkillList } from "@/lib/skill-list";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type SettingsForm = {
  full_name: string;
  school_name: string;
  school_type: string;
  education_level: string;
  major: string;
  sub_major: string;
  graduation_status: string;
  graduation_date: string;
  gpa_score: string;
  gpa_scale: string;
  core_skills: string;
  tech_stack: string;
  internship_count: string;
  project_count: string;
  role_certifications: string;
  language_test_name: string;
  language_test_score: string;
  other_certifications: string;
  target_role: string;
  target_industry: string;
  preferred_location: string;
  desired_companies: string;
  portfolio_url: string;
  github_url: string;
  experience_summary: string;
};

const initialForm: SettingsForm = {
  full_name: "",
  school_name: "",
  school_type: "",
  education_level: "",
  major: "",
  sub_major: "",
  graduation_status: "",
  graduation_date: "",
  gpa_score: "",
  gpa_scale: "4.5",
  core_skills: "",
  tech_stack: "",
  internship_count: "0",
  project_count: "0",
  role_certifications: "",
  language_test_name: "",
  language_test_score: "",
  other_certifications: "",
  target_role: "",
  target_industry: "",
  preferred_location: "",
  desired_companies: "",
  portfolio_url: "",
  github_url: "",
  experience_summary: "",
};

export default function SettingsPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = (ko: string, en: string) => (isEn ? en : ko);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState("");
  const [joinedAtRaw, setJoinedAtRaw] = useState("");
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [message, setMessage] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [savedSkills, setSavedSkills] = useState({ core_skills: "", tech_stack: "" });

  const completion = useMemo(() => {
    const fields: Array<keyof SettingsForm> = [
      "full_name",
      "school_name",
      "major",
      "gpa_score",
      "core_skills",
      "tech_stack",
      "target_role",
      "preferred_location",
      "portfolio_url",
      "experience_summary",
    ];
    const filled = fields.filter((field) => form[field].trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const skillChips = useMemo(
    () => parseSkillList(savedSkills.core_skills, savedSkills.tech_stack).slice(0, 10),
    [savedSkills],
  );

  const joinedAt = useMemo(() => {
    if (!joinedAtRaw) return "-";
    return new Date(joinedAtRaw).toLocaleDateString(isEn ? "en-US" : "ko-KR");
  }, [isEn, joinedAtRaw]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowWelcome(params.get("welcome") === "1");
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
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
      setUserId(user.id);
      setEmail(user.email ?? "");
      setProvider((user.app_metadata?.provider as string) || "email");
      setJoinedAtRaw(user.created_at ?? "");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          full_name, school_name, school_type, education_level, major, sub_major,
          graduation_status, graduation_date, gpa_score, gpa_scale, core_skills, tech_stack,
          internship_count, project_count, role_certifications, language_test_name, language_test_score,
          other_certifications, target_role, target_industry, preferred_location, desired_companies,
          portfolio_url, github_url, experience_summary
          `,
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
      } else if (data) {
        setForm({
          full_name: data.full_name ?? "",
          school_name: data.school_name ?? "",
          school_type: data.school_type ?? "",
          education_level: data.education_level ?? "",
          major: data.major ?? "",
          sub_major: data.sub_major ?? "",
          graduation_status: data.graduation_status ?? "",
          graduation_date: data.graduation_date ?? "",
          gpa_score: data.gpa_score?.toString() ?? "",
          gpa_scale: data.gpa_scale?.toString() ?? "4.5",
          core_skills: data.core_skills ?? "",
          tech_stack: data.tech_stack ?? "",
          internship_count: data.internship_count?.toString() ?? "0",
          project_count: data.project_count?.toString() ?? "0",
          role_certifications: data.role_certifications ?? "",
          language_test_name: data.language_test_name ?? "",
          language_test_score: data.language_test_score ?? "",
          other_certifications: data.other_certifications ?? "",
          target_role: data.target_role ?? "",
          target_industry: data.target_industry ?? "",
          preferred_location: data.preferred_location ?? "",
          desired_companies: data.desired_companies ?? "",
          portfolio_url: data.portfolio_url ?? "",
          github_url: data.github_url ?? "",
          experience_summary: data.experience_summary ?? "",
        });
        setSavedSkills({
          core_skills: data.core_skills ?? "",
          tech_stack: data.tech_stack ?? "",
        });
      }

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEn]);

  const updateField = (key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !isSupabaseConfigured || !userId) return;

    const gpaScore = form.gpa_score ? Number(form.gpa_score) : null;
    const gpaScale = form.gpa_scale ? Number(form.gpa_scale) : null;
    const normalizedGpa = gpaScore && gpaScale ? (gpaScore / gpaScale) * 4.5 : null;
    const trimmedCoreSkills = form.core_skills.trim();
    const trimmedTechStack = form.tech_stack.trim();
    const mergedSkills = mergeSkillList(trimmedCoreSkills, trimmedTechStack);
    const mergedCerts = [form.role_certifications, form.other_certifications].filter(Boolean).join(", ");

    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        full_name: form.full_name.trim(),
        school_name: form.school_name.trim(),
        school_type: form.school_type.trim(),
        education_level: form.education_level.trim(),
        major: form.major.trim(),
        sub_major: form.sub_major.trim(),
        graduation_status: form.graduation_status.trim(),
        graduation_date: form.graduation_date || null,
        gpa_score: gpaScore,
        gpa_scale: gpaScale,
        gpa: normalizedGpa,
        core_skills: trimmedCoreSkills || null,
        tech_stack: trimmedTechStack || null,
        skills: mergedSkills || null,
        internship_count: Number(form.internship_count || 0),
        project_count: Number(form.project_count || 0),
        role_certifications: form.role_certifications.trim(),
        language_test_name: form.language_test_name.trim(),
        language_test_score: form.language_test_score.trim(),
        other_certifications: form.other_certifications.trim(),
        certifications: mergedCerts,
        target_role: form.target_role.trim(),
        target_industry: form.target_industry.trim(),
        preferred_location: form.preferred_location.trim(),
        desired_companies: form.desired_companies.trim(),
        portfolio_url: form.portfolio_url.trim(),
        github_url: form.github_url.trim(),
        experience_summary: form.experience_summary.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSavedSkills({
      core_skills: trimmedCoreSkills,
      tech_stack: trimmedTechStack,
    });
    setMessage(t("설정이 저장되었습니다.", "Settings saved."));
    setShowWelcome(false);
    if (window.location.search.includes("welcome=1")) {
      window.history.replaceState({}, "", "/settings");
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      t(
        "계정과 연결된 모든 데이터(프로필, 자소서, 실공고 캐시, 평가·시뮬레이션 기록 등)가 영구 삭제됩니다. 되돌릴 수 없습니다. 계속하시겠습니까?",
        "Your account and all related data (profile, cover letters, job cache, evaluations, simulations, etc.) will be permanently deleted. This cannot be undone. Continue?",
      ),
    );
    if (!confirmed) return;

    setAccountError("");
    setDeletingAccount(true);

    const session = await getSessionWithRetry();
    const token = session?.access_token;
    if (!token) {
      setDeletingAccount(false);
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => null);
    setDeletingAccount(false);

    if (!res.ok) {
      setAccountError(json?.error ?? t("계정 삭제에 실패했습니다.", "Failed to delete account."));
      return;
    }

    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow="Settings"
        title={t("설정", "Settings")}
        description={t("개인 정보, 목표 직무, 기술, 링크를 한 곳에서 관리합니다.", "Manage personal information, goals, skills, and links in one place.")}
        actions={
          <Link href="/dashboard" className="secondary-btn px-4 py-2 text-sm">
            {t("대시보드로 돌아가기", "Back to Dashboard")}
          </Link>
        }
      />

      {loading ? <Notice>{t("설정을 불러오는 중입니다...", "Loading settings...")}</Notice> : null}

      {!loading && showWelcome ? (
        <Notice className="mb-5" tone="success">
          {t(
            "환영합니다! 목표 직무, 스킬, 학력 정보를 먼저 입력하면 매칭·시뮬레이터·대시보드가 훨씬 정확해집니다.",
            "Welcome! Add your target role, skills, and education first so matching, simulators, and your dashboard work much better.",
          )}
        </Notice>
      ) : null}

      {!loading ? (
        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="grid content-start gap-5">
            <PagePanel>
              <SectionTitle title={t("계정", "Account")} description={t("로그인 정보는 인증 시스템에서 관리됩니다.", "Login information is managed by the auth system.")} />
              <div className="mt-5 grid gap-3 text-sm text-[var(--muted-strong)]">
                <InfoRow label={t("이메일", "Email")} value={email || "-"} />
                <InfoRow label={t("로그인 방식", "Login method")} value={provider} />
                <InfoRow label={t("가입일", "Joined")} value={joinedAt} />
              </div>
              <div className="mt-6 border-t border-[var(--line)] pt-5">
                <p className="text-xs leading-5 text-[var(--muted)]">
                  {t(
                    "계정을 삭제하면 프로필, 즐겨찾기 공고, 자소서, 매칭 캐시, 평가·인터뷰·시뮬레이션 기록이 모두 삭제됩니다.",
                    "Deleting your account removes your profile, saved job postings, cover letters, matching cache, and all evaluation, interview, and simulation records.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void deleteAccount()}
                  disabled={deletingAccount}
                  className="danger-btn mt-4 w-full px-4 py-2.5 text-sm disabled:opacity-60 sm:w-auto"
                >
                  {deletingAccount ? t("삭제 중...", "Deleting...") : t("계정 삭제", "Delete account")}
                </button>
                {accountError ? (
                  <Notice className="mt-3" tone="warning">
                    {accountError}
                  </Notice>
                ) : null}
              </div>
            </PagePanel>

            <PagePanel>
              <SectionTitle title={t("프로필 완성도", "Profile Completion")} description={t("대시보드 추천 품질에 직접 반영됩니다.", "Directly improves dashboard recommendations.")} />
              <p className="mt-5 text-5xl font-semibold text-[var(--foreground)]">{completion}%</p>
              <div className="signal-bar mt-4">
                <div className="signal-fill" style={{ width: `${completion}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {skillChips.length ? skillChips.map((skill) => <span key={skill} className="chip">{skill}</span>) : <span className="text-sm text-[var(--muted)]">{t("저장 후 여기에 표시됩니다.", "Skills appear here after you save.")}</span>}
              </div>
            </PagePanel>

            <PagePanel>
              <JobFavoritesPanel language={language} />
            </PagePanel>
          </div>

          <PagePanel>
            <SectionTitle title={t("개인 정보 및 커리어 프로필", "Personal and Career Profile")} description={t("이제 프로필 편집은 Settings에서만 합니다.", "Profile editing now lives only in Settings.")} />
            <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveSettings}>
              <Field label={t("이름", "Name")} value={form.full_name} onChange={(value) => updateField("full_name", value)} />
              <Field label={t("학교", "School")} value={form.school_name} onChange={(value) => updateField("school_name", value)} />
              <Field label={t("학교 유형", "School Type")} value={form.school_type} onChange={(value) => updateField("school_type", value)} placeholder={t("예: 4년제, 대학원", "e.g., 4-year, graduate")} />
              <Field label={t("학년 / 학력", "Year / Education Level")} value={form.education_level} onChange={(value) => updateField("education_level", value)} placeholder={t("예: 3학년, 석사", "e.g., Junior, Master's")} />
              <Field label={t("전공", "Major")} value={form.major} onChange={(value) => updateField("major", value)} />
              <Field label={t("복수전공 / 부전공", "Double Major / Minor")} value={form.sub_major} onChange={(value) => updateField("sub_major", value)} />
              <Field label={t("졸업 상태", "Graduation Status")} value={form.graduation_status} onChange={(value) => updateField("graduation_status", value)} />
              <Field label={t("졸업 예정일", "Graduation Date")} type="date" value={form.graduation_date} onChange={(value) => updateField("graduation_date", value)} />
              <Field label="GPA" type="number" value={form.gpa_score} onChange={(value) => updateField("gpa_score", value)} />
              <Field label={t("GPA 만점", "GPA Scale")} type="number" value={form.gpa_scale} onChange={(value) => updateField("gpa_scale", value)} />
              <Field label={t("인턴 경험 수", "Internship Count")} type="number" value={form.internship_count} onChange={(value) => updateField("internship_count", value)} />
              <Field label={t("프로젝트 수", "Project Count")} type="number" value={form.project_count} onChange={(value) => updateField("project_count", value)} />
              <Field label={t("희망 직무", "Target Roles")} value={form.target_role} onChange={(value) => updateField("target_role", value)} />
              <Field label={t("관심 산업", "Career Interests")} value={form.target_industry} onChange={(value) => updateField("target_industry", value)} />
              <Field label={t("희망 지역", "Preferred Location")} value={form.preferred_location} onChange={(value) => updateField("preferred_location", value)} />
              <Field label={t("희망 기업", "Desired Companies")} value={form.desired_companies} onChange={(value) => updateField("desired_companies", value)} placeholder={t("쉼표로 구분", "Comma-separated")} />
              <Field label={t("포트폴리오 링크", "Portfolio Link")} value={form.portfolio_url} onChange={(value) => updateField("portfolio_url", value)} />
              <Field label="GitHub" value={form.github_url} onChange={(value) => updateField("github_url", value)} />
              <Textarea label={t("핵심 스킬", "Core Skills")} value={form.core_skills} onChange={(value) => updateField("core_skills", value)} />
              <Textarea label={t("기술 스택", "Tech Stack")} value={form.tech_stack} onChange={(value) => updateField("tech_stack", value)} />
              <Textarea label={t("직무 관련 자격증", "Role Certifications")} value={form.role_certifications} onChange={(value) => updateField("role_certifications", value)} />
              <Textarea label={t("기타 자격증", "Other Certifications")} value={form.other_certifications} onChange={(value) => updateField("other_certifications", value)} />
              <Field label={t("어학 시험", "Language Test")} value={form.language_test_name} onChange={(value) => updateField("language_test_name", value)} />
              <Field label={t("어학 점수", "Language Score")} value={form.language_test_score} onChange={(value) => updateField("language_test_score", value)} />
              <div className="md:col-span-2">
                <Textarea label={t("경험 요약", "Experience Summary")} value={form.experience_summary} onChange={(value) => updateField("experience_summary", value)} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
                <button disabled={saving} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                  {saving ? t("저장 중...", "Saving...") : t("설정 저장", "Save Settings")}
                </button>
                <Link href="/dashboard" className="secondary-btn px-4 py-2 text-center text-sm">
                  {t("대시보드 보기", "View Dashboard")}
                </Link>
              </div>
            </form>
            {message ? <Notice className="mt-4">{message}</Notice> : null}
          </PagePanel>
        </div>
      ) : null}
    </PageShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="field mt-1" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="field mt-1 min-h-24" />
    </label>
  );
}
