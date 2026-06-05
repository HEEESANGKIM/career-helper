"use client";

import { FormEvent, memo, useCallback, useEffect, useMemo, useState } from "react";
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
  const [loadError, setLoadError] = useState("");
  const [loadedForm, setLoadedForm] = useState<SettingsForm | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [savedSkills, setSavedSkills] = useState({ core_skills: "", tech_stack: "" });
  const [savedCompletion, setSavedCompletion] = useState(0);

  const computeCompletion = (snapshot: SettingsForm) => {
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
    const filled = fields.filter((field) => snapshot[field].trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

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
        setLoadError(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
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
        setLoadError(error.message);
      } else if (data) {
        const nextForm: SettingsForm = {
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
        };
        setLoadedForm(nextForm);
        setSavedSkills({
          core_skills: nextForm.core_skills,
          tech_stack: nextForm.tech_stack,
        });
        setSavedCompletion(computeCompletion(nextForm));
      } else {
        setLoadedForm(initialForm);
      }

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEn]);

  const handleProfileSaved = useCallback((snapshot: SettingsForm, skills: { core_skills: string; tech_stack: string }) => {
    setSavedSkills(skills);
    setSavedCompletion(computeCompletion(snapshot));
    setShowWelcome(false);
    if (window.location.search.includes("welcome=1")) {
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const headerLabels = useMemo(
    () => ({
      title: t("설정", "Settings"),
      description: t("개인 정보, 목표 직무, 기술, 링크를 한 곳에서 관리합니다.", "Manage personal information, goals, skills, and links in one place."),
    }),
    [isEn],
  );

  const formLabels = useMemo(
    () => ({
      panelTitle: t("개인 정보 및 커리어 프로필", "Personal and Career Profile"),
      panelDesc: t("이제 프로필 편집은 Settings에서만 합니다.", "Profile editing now lives only in Settings."),
      name: t("이름", "Name"),
      school: t("학교", "School"),
      schoolType: t("학교 유형", "School Type"),
      schoolTypePlaceholder: t("예: 4년제, 대학원", "e.g., 4-year, graduate"),
      educationLevel: t("학년 / 학력", "Year / Education Level"),
      educationLevelPlaceholder: t("예: 3학년, 석사", "e.g., Junior, Master's"),
      major: t("전공", "Major"),
      subMajor: t("복수전공 / 부전공", "Double Major / Minor"),
      graduationStatus: t("졸업 상태", "Graduation Status"),
      graduationDate: t("졸업 예정일", "Graduation Date"),
      gpaScale: t("GPA 만점", "GPA Scale"),
      internshipCount: t("인턴 경험 수", "Internship Count"),
      projectCount: t("프로젝트 수", "Project Count"),
      targetRole: t("희망 직무", "Target Roles"),
      targetIndustry: t("관심 산업", "Career Interests"),
      preferredLocation: t("희망 지역", "Preferred Location"),
      desiredCompanies: t("희망 기업", "Desired Companies"),
      desiredCompaniesPlaceholder: t("쉼표로 구분", "Comma-separated"),
      portfolioUrl: t("포트폴리오 링크", "Portfolio Link"),
      coreSkills: t("핵심 스킬", "Core Skills"),
      techStack: t("기술 스택", "Tech Stack"),
      roleCertifications: t("직무 관련 자격증", "Role Certifications"),
      otherCertifications: t("기타 자격증", "Other Certifications"),
      languageTest: t("어학 시험", "Language Test"),
      languageScore: t("어학 점수", "Language Score"),
      experienceSummary: t("경험 요약", "Experience Summary"),
      saving: t("저장 중...", "Saving..."),
      save: t("설정 저장", "Save Settings"),
      viewDashboard: t("대시보드 보기", "View Dashboard"),
      saved: t("설정이 저장되었습니다.", "Settings saved."),
    }),
    [isEn],
  );

  const sidebarLabels = useMemo(
    () => ({
      account: t("계정", "Account"),
      accountDesc: t("로그인 정보는 인증 시스템에서 관리됩니다.", "Login information is managed by the auth system."),
      email: t("이메일", "Email"),
      loginMethod: t("로그인 방식", "Login method"),
      joined: t("가입일", "Joined"),
      deleteWarning: t(
        "계정을 삭제하면 프로필, 즐겨찾기 공고, 자소서, 매칭 캐시, 평가·인터뷰·시뮬레이션 기록이 모두 삭제됩니다.",
        "Deleting your account removes your profile, saved job postings, cover letters, matching cache, and all evaluation, interview, and simulation records.",
      ),
      deleting: t("삭제 중...", "Deleting..."),
      deleteAccount: t("계정 삭제", "Delete account"),
      completion: t("프로필 완성도", "Profile Completion"),
      completionDesc: t("대시보드 추천 품질에 직접 반영됩니다.", "Directly improves dashboard recommendations."),
      completionHint: t("입력 중에는 바뀌지 않고, 저장 후에 갱신됩니다.", "Won't change while typing; updates after you save."),
      skillsEmpty: t("저장 후 여기에 표시됩니다.", "Skills appear here after you save."),
    }),
    [isEn],
  );

  const deleteAccount = useCallback(async () => {
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
  }, [isEn]);

  return (
    <PageShell maxWidth="max-w-7xl">
      <SettingsPageHeader labels={headerLabels} />

      {loading ? <Notice>{t("설정을 불러오는 중입니다...", "Loading settings...")}</Notice> : null}
      {!loading && loadError ? <Notice tone="warning">{loadError}</Notice> : null}

      {!loading && showWelcome ? (
        <Notice className="mb-5" tone="success">
          {t(
            "환영합니다! 목표 직무, 스킬, 학력 정보를 먼저 입력하면 매칭·시뮬레이터·대시보드가 훨씬 정확해집니다.",
            "Welcome! Add your target role, skills, and education first so matching, simulators, and your dashboard work much better.",
          )}
        </Notice>
      ) : null}

      {!loading && loadedForm && userId ? (
        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <SettingsSidebar
            language={language}
            email={email}
            provider={provider}
            joinedAt={joinedAt}
            savedCompletion={savedCompletion}
            skillChips={skillChips}
            deletingAccount={deletingAccount}
            accountError={accountError}
            onDeleteAccount={deleteAccount}
            labels={sidebarLabels}
          />

          <SettingsFormPanel userId={userId} initialForm={loadedForm} labels={formLabels} onSaved={handleProfileSaved} />
        </div>
      ) : null}
    </PageShell>
  );
}

const SettingsPageHeader = memo(function SettingsPageHeader({
  labels,
}: {
  labels: { title: string; description: string };
}) {
  return <PageHeader eyebrow="Settings" title={labels.title} description={labels.description} />;
});

type SettingsFormLabels = {
  panelTitle: string;
  panelDesc: string;
  name: string;
  school: string;
  schoolType: string;
  schoolTypePlaceholder: string;
  educationLevel: string;
  educationLevelPlaceholder: string;
  major: string;
  subMajor: string;
  graduationStatus: string;
  graduationDate: string;
  gpaScale: string;
  internshipCount: string;
  projectCount: string;
  targetRole: string;
  targetIndustry: string;
  preferredLocation: string;
  desiredCompanies: string;
  desiredCompaniesPlaceholder: string;
  portfolioUrl: string;
  coreSkills: string;
  techStack: string;
  roleCertifications: string;
  otherCertifications: string;
  languageTest: string;
  languageScore: string;
  experienceSummary: string;
  saving: string;
  save: string;
  viewDashboard: string;
  saved: string;
};

const SettingsFormPanel = memo(function SettingsFormPanel({
  userId,
  initialForm,
  labels,
  onSaved,
}: {
  userId: string;
  initialForm: SettingsForm;
  labels: SettingsFormLabels;
  onSaved: (snapshot: SettingsForm, skills: { core_skills: string; tech_stack: string }) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const updateField = useCallback((key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !isSupabaseConfigured) return;

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

    onSaved(form, { core_skills: trimmedCoreSkills, tech_stack: trimmedTechStack });
    setMessage(labels.saved);
  };

  return (
    <PagePanel>
      <SectionTitle title={labels.panelTitle} description={labels.panelDesc} />
      <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveSettings} autoComplete="off">
        <Field fieldKey="full_name" label={labels.name} value={form.full_name} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="school_name" label={labels.school} value={form.school_name} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="school_type" label={labels.schoolType} value={form.school_type} onFieldChange={updateField} placeholder={labels.schoolTypePlaceholder} autoComplete="off" />
        <Field fieldKey="education_level" label={labels.educationLevel} value={form.education_level} onFieldChange={updateField} placeholder={labels.educationLevelPlaceholder} autoComplete="off" />
        <Field fieldKey="major" label={labels.major} value={form.major} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="sub_major" label={labels.subMajor} value={form.sub_major} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="graduation_status" label={labels.graduationStatus} value={form.graduation_status} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="graduation_date" label={labels.graduationDate} type="date" value={form.graduation_date} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="gpa_score" label="GPA" type="number" value={form.gpa_score} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="gpa_scale" label={labels.gpaScale} type="number" value={form.gpa_scale} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="internship_count" label={labels.internshipCount} type="number" value={form.internship_count} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="project_count" label={labels.projectCount} type="number" value={form.project_count} onFieldChange={updateField} autoComplete="off" />
        <Field fieldKey="target_role" label={labels.targetRole} value={form.target_role} onFieldChange={updateField} />
        <Field fieldKey="target_industry" label={labels.targetIndustry} value={form.target_industry} onFieldChange={updateField} />
        <Field fieldKey="preferred_location" label={labels.preferredLocation} value={form.preferred_location} onFieldChange={updateField} />
        <Field fieldKey="desired_companies" label={labels.desiredCompanies} value={form.desired_companies} onFieldChange={updateField} placeholder={labels.desiredCompaniesPlaceholder} />
        <Field fieldKey="portfolio_url" label={labels.portfolioUrl} value={form.portfolio_url} onFieldChange={updateField} />
        <Field fieldKey="github_url" label="GitHub" value={form.github_url} onFieldChange={updateField} />
        <Textarea fieldKey="core_skills" label={labels.coreSkills} value={form.core_skills} onFieldChange={updateField} />
        <Textarea fieldKey="tech_stack" label={labels.techStack} value={form.tech_stack} onFieldChange={updateField} />
        <Textarea fieldKey="role_certifications" label={labels.roleCertifications} value={form.role_certifications} onFieldChange={updateField} />
        <Textarea fieldKey="other_certifications" label={labels.otherCertifications} value={form.other_certifications} onFieldChange={updateField} />
        <Field fieldKey="language_test_name" label={labels.languageTest} value={form.language_test_name} onFieldChange={updateField} />
        <Field fieldKey="language_test_score" label={labels.languageScore} value={form.language_test_score} onFieldChange={updateField} />
        <div className="md:col-span-2">
          <Textarea fieldKey="experience_summary" label={labels.experienceSummary} value={form.experience_summary} onFieldChange={updateField} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
          <button disabled={saving} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
            {saving ? labels.saving : labels.save}
          </button>
          <Link href="/dashboard" className="secondary-btn px-4 py-2 text-center text-sm">
            {labels.viewDashboard}
          </Link>
        </div>
      </form>
      {message ? <Notice className="mt-4">{message}</Notice> : null}
    </PagePanel>
  );
});

type SettingsSidebarLabels = {
  account: string;
  accountDesc: string;
  email: string;
  loginMethod: string;
  joined: string;
  deleteWarning: string;
  deleting: string;
  deleteAccount: string;
  completion: string;
  completionDesc: string;
  completionHint: string;
  skillsEmpty: string;
};

const SettingsSidebar = memo(function SettingsSidebar({
  language,
  email,
  provider,
  joinedAt,
  savedCompletion,
  skillChips,
  deletingAccount,
  accountError,
  onDeleteAccount,
  labels,
}: {
  language: "ko" | "en";
  email: string;
  provider: string;
  joinedAt: string;
  savedCompletion: number;
  skillChips: string[];
  deletingAccount: boolean;
  accountError: string;
  onDeleteAccount: () => void;
  labels: SettingsSidebarLabels;
}) {
  return (
    <div className="grid content-start gap-5">
      <PagePanel>
        <SectionTitle title={labels.account} description={labels.accountDesc} />
        <div className="mt-5 grid gap-3 text-sm text-[var(--muted-strong)]">
          <InfoRow label={labels.email} value={email || "-"} />
          <InfoRow label={labels.loginMethod} value={provider} />
          <InfoRow label={labels.joined} value={joinedAt} />
        </div>
        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <p className="text-xs leading-5 text-[var(--muted)]">{labels.deleteWarning}</p>
          <button
            type="button"
            onClick={() => void onDeleteAccount()}
            disabled={deletingAccount}
            className="danger-btn mt-4 w-full px-4 py-2.5 text-sm disabled:opacity-60 sm:w-auto"
          >
            {deletingAccount ? labels.deleting : labels.deleteAccount}
          </button>
          {accountError ? (
            <Notice className="mt-3" tone="warning">
              {accountError}
            </Notice>
          ) : null}
        </div>
      </PagePanel>

      <PagePanel>
        <SectionTitle title={labels.completion} description={labels.completionDesc} />
        <p className="mt-5 text-5xl font-semibold text-[var(--foreground)]">{savedCompletion}%</p>
        <div className="signal-bar mt-4">
          <div className="signal-fill" style={{ width: `${savedCompletion}%` }} />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">{labels.completionHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {skillChips.length ? (
            skillChips.map((skill) => (
              <span key={skill} className="chip">
                {skill}
              </span>
            ))
          ) : (
            <span className="text-sm text-[var(--muted)]">{labels.skillsEmpty}</span>
          )}
        </div>
      </PagePanel>

      <PagePanel>
        <JobFavoritesPanel language={language} />
      </PagePanel>
    </div>
  );
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

const Field = memo(function Field({
  fieldKey,
  label,
  value,
  onFieldChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  fieldKey: keyof SettingsForm;
  label: string;
  value: string;
  onFieldChange: (key: keyof SettingsForm, value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      <input
        type={type}
        name={`settings-${fieldKey}`}
        value={value}
        onChange={(event) => onFieldChange(fieldKey, event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="field mt-1"
      />
    </label>
  );
});

const Textarea = memo(function Textarea({
  fieldKey,
  label,
  value,
  onFieldChange,
}: {
  fieldKey: keyof SettingsForm;
  label: string;
  value: string;
  onFieldChange: (key: keyof SettingsForm, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      <textarea
        name={`settings-${fieldKey}`}
        value={value}
        onChange={(event) => onFieldChange(fieldKey, event.target.value)}
        className="field mt-1 min-h-24"
      />
    </label>
  );
});
