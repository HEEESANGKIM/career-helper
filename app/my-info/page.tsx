"use client";

import { FormEvent, memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { JobFavoritesPanel } from "@/components/job-favorites-panel";
import { FormSection, PortfolioLinksField, SegmentSelectField } from "@/components/settings-profile-fields";
import { Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { computeValidatedCompletion, GPA_SCALE_OPTIONS, isRequiredFormFieldKey, normalizeGpaScaleValue, validateProfileForm, type ProfileValidationField } from "@/lib/profile-validation";
import { mergeSkillList, parseSkillList } from "@/lib/skill-list";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";
import { useProfileGate } from "@/components/profile-gate-provider";
import { profileGateMessage } from "@/lib/profile-gate-paths";

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
  experience_summary: "",
};

export default function SettingsPage() {
  const { language } = useLanguage();
  const { profileComplete, refreshProfile, loading: gateLoading } = useProfileGate();
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
  const [showProfileRequired, setShowProfileRequired] = useState(false);
  const [savedSkills, setSavedSkills] = useState({ core_skills: "", tech_stack: "" });
  const [savedCompletion, setSavedCompletion] = useState(0);

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
    setShowProfileRequired(params.get("profile_required") === "1");
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
          portfolio_url, experience_summary
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
          gpa_scale: normalizeGpaScaleValue(data.gpa_scale),
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
          experience_summary: data.experience_summary ?? "",
        };
        setLoadedForm(nextForm);
        setSavedSkills({
          core_skills: nextForm.core_skills,
          tech_stack: nextForm.tech_stack,
        });
        setSavedCompletion(computeValidatedCompletion(nextForm));
      } else {
        setLoadedForm(initialForm);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const handleProfileSaved = useCallback(
    (snapshot: SettingsForm, skills: { core_skills: string; tech_stack: string }) => {
      setSavedSkills(skills);
      setSavedCompletion(computeValidatedCompletion(snapshot));
      setShowWelcome(false);
      setShowProfileRequired(false);
      void refreshProfile();
      if (window.location.search.includes("welcome=1") || window.location.search.includes("profile_required=1")) {
        window.history.replaceState({}, "", "/settings");
      }
    },
    [refreshProfile],
  );

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
      namePlaceholder: "Gildong Hong",
      school: t("학교", "School"),
      schoolPlaceholder: "SUNY Korea",
      schoolType: t("학교 유형", "School Type"),
      schoolTypePlaceholder: t("예: 4년제 대학", "e.g., 4-year university"),
      educationLevel: t("학년 / 학력", "Year / Education Level"),
      educationLevelPlaceholder: t("예: 4학년, 학사", "e.g., Senior, Bachelor's"),
      major: t("전공", "Major"),
      majorPlaceholder: "Computer Science",
      subMajor: t("복수전공 / 부전공", "Double Major / Minor"),
      subMajorPlaceholder: t("예: Applied Mathematics and Statistics (Minor)", "e.g., Applied Mathematics and Statistics (Minor)"),
      graduationStatus: t("졸업 상태", "Graduation Status"),
      graduationStatusPlaceholder: t("예: 재학 중, 졸업", "e.g., In progress, Graduated"),
      graduationDate: t("졸업 예정일", "Graduation Date"),
      gpaScale: t("GPA 만점", "GPA Scale"),
      gpaScorePlaceholder: "3.8",
      gpaScalePlaceholder: "4.5",
      internshipCount: t("인턴 경험 수", "Internship Count"),
      internshipCountPlaceholder: "2",
      projectCount: t("프로젝트 수", "Project Count"),
      projectCountPlaceholder: "3",
      targetRole: t("희망 직무", "Target Roles"),
      targetRolePlaceholder: t("예: Software Engineer, Product Manager", "e.g., Software Engineer, Product Manager"),
      targetIndustry: t("관심 산업", "Career Interests"),
      targetIndustryPlaceholder: t("예: Tech, Fintech, E-commerce", "e.g., Tech, Fintech, E-commerce"),
      preferredLocation: t("희망 지역", "Preferred Location"),
      preferredLocationPlaceholder: "Seoul",
      desiredCompanies: t("희망 기업", "Desired Companies"),
      desiredCompaniesPlaceholder: t("예: Samsung, Kakao (쉼표로 구분)", "e.g. Samsung, Kakao"),
      portfolioUrl: t("포트폴리오 링크", "Portfolio links"),
      portfolioUrlHint: t("Behance, LinkedIn, 개인 사이트 등 URL을 추가하세요.", "Add Behance, LinkedIn, personal sites, and similar URLs."),
      addPortfolioLink: t("링크 추가", "Add link"),
      removePortfolioLink: t("삭제", "Remove"),
      portfolioPlaceholder: t("https://behance.net/yourname", "https://behance.net/yourname"),
      sectionEducation: t("학력 정보", "Education"),
      sectionCareer: t("목표·선호", "Goals & preferences"),
      sectionProof: t("증명 자료", "Proof & links"),
      sectionSkills: t("역량·자격", "Skills & credentials"),
      sectionExperience: t("경험", "Experience"),
      coreSkills: t("핵심 스킬", "Core Skills"),
      coreSkillsPlaceholder: t(
        "예: 문제 해결, 협업, 데이터 분석, 프레젠테이션",
        "e.g., Problem solving, Collaboration, Data analysis, Presentation",
      ),
      techStack: t("기술 스택", "Tech Stack"),
      techStackPlaceholder: "Python, React, TypeScript, PostgreSQL, Figma",
      roleCertifications: t("직무 관련 자격증", "Role Certifications"),
      roleCertificationsPlaceholder: t("예: 정보처리기사, SQLD, AWS SAA", "e.g., AWS SAA, Google UX Design, SQLD"),
      otherCertifications: t("기타 자격증", "Other Certifications"),
      otherCertificationsPlaceholder: t("예: 운전면허, 응급처치", "e.g., Driver's license, First aid"),
      languageTest: t("어학 시험", "Language Test"),
      languageTestPlaceholder: "TOEIC, TOEFL, OPIc",
      languageScore: t("어학 점수", "Language Score"),
      languageScorePlaceholder: t("예: 950, 105", "e.g., 950, 105"),
      experienceSummary: t("경험 요약", "Experience Summary"),
      experienceSummaryPlaceholder: t(
        "예: 백엔드 인턴 2회. React·Node.js로 채용 매칭 웹앱 캡스톤 프로젝트를 진행했습니다.",
        "e.g., 2 backend internships. Led a capstone job-matching web app with React and Node.js.",
      ),
      saving: t("저장 중...", "Saving..."),
      validating: t("프로필 확인 중...", "Checking profile..."),
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
      completionDesc: t("* 필수 항목을 채워야 저장·Job Match 등을 사용할 수 있습니다.", "Fill all * required fields to save and unlock Job Match."),
      completionHint: t("전체 프로필 항목 중 입력·검증된 비율입니다. * 표시는 저장 필수 항목입니다.", "Share of all profile areas filled and validated. * marks required fields to save."),
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

      {!loading && showWelcome && !showProfileRequired ? (
        <Notice className="mb-5" tone="success">
          {t(
            "환영합니다! * 표시 필수 항목을 먼저 입력하면 Dashboard·Resume Lab·시뮬레이터·Job Match를 사용할 수 있습니다.",
            "Welcome! Fill in all required (*) fields first to unlock Dashboard, Resume Lab, Hiring Simulator, and Job Match.",
          )}
        </Notice>
      ) : null}

      {!loading && !gateLoading && !profileComplete && !showWelcome ? (
        <Notice className="mb-5" tone="warning">
          {showProfileRequired
            ? t(
                "다른 메뉴는 아직 이용할 수 없습니다. 아래 * 표시 필수 항목을 모두 입력하고 저장해 주세요.",
                "Other pages are locked until you fill in and save all required (*) fields below.",
              )
            : profileGateMessage(language)}
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

          <SettingsFormPanel
            userId={userId}
            initialForm={loadedForm}
            labels={formLabels}
            language={language}
            onSaved={handleProfileSaved}
          />
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
  namePlaceholder: string;
  school: string;
  schoolPlaceholder: string;
  schoolType: string;
  schoolTypePlaceholder: string;
  educationLevel: string;
  educationLevelPlaceholder: string;
  major: string;
  majorPlaceholder: string;
  subMajor: string;
  subMajorPlaceholder: string;
  graduationStatus: string;
  graduationStatusPlaceholder: string;
  graduationDate: string;
  gpaScale: string;
  gpaScorePlaceholder: string;
  gpaScalePlaceholder: string;
  internshipCount: string;
  internshipCountPlaceholder: string;
  projectCount: string;
  projectCountPlaceholder: string;
  targetRole: string;
  targetRolePlaceholder: string;
  targetIndustry: string;
  targetIndustryPlaceholder: string;
  preferredLocation: string;
  preferredLocationPlaceholder: string;
  desiredCompanies: string;
  desiredCompaniesPlaceholder: string;
  portfolioUrl: string;
  portfolioUrlHint: string;
  addPortfolioLink: string;
  removePortfolioLink: string;
  portfolioPlaceholder: string;
  sectionEducation: string;
  sectionCareer: string;
  sectionProof: string;
  sectionSkills: string;
  sectionExperience: string;
  coreSkills: string;
  coreSkillsPlaceholder: string;
  techStack: string;
  techStackPlaceholder: string;
  roleCertifications: string;
  roleCertificationsPlaceholder: string;
  otherCertifications: string;
  otherCertificationsPlaceholder: string;
  languageTest: string;
  languageTestPlaceholder: string;
  languageScore: string;
  languageScorePlaceholder: string;
  experienceSummary: string;
  experienceSummaryPlaceholder: string;
  saving: string;
  validating: string;
  save: string;
  viewDashboard: string;
  saved: string;
};

const scrollToFirstFieldError = (errors: Partial<Record<ProfileValidationField, string>>) => {
  const firstKey = Object.keys(errors)[0] as ProfileValidationField | undefined;
  if (!firstKey) return;

  window.requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(
      `[name="settings-${firstKey}"], [name^="settings-${firstKey}-"], [data-field="settings-${firstKey}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLButtonElement) {
      el.focus({ preventScroll: true });
    }
  });
};

const SettingsFormPanel = memo(function SettingsFormPanel({
  userId,
  initialForm,
  labels,
  language,
  onSaved,
}: {
  userId: string;
  initialForm: SettingsForm;
  labels: SettingsFormLabels;
  language: "ko" | "en";
  onSaved: (snapshot: SettingsForm, skills: { core_skills: string; tech_stack: string }) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileValidationField, string>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    setForm(initialForm);
    setFieldErrors({});
    setSubmitAttempted(false);
  }, [initialForm]);

  const updateField = useCallback((key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as ProfileValidationField];
      return next;
    });
  }, []);

  const fieldError = (key: ProfileValidationField) => fieldErrors[key];
  const isRequired = (key: keyof SettingsForm) => isRequiredFormFieldKey(key);

  const fieldLabel = useCallback(
    (key: ProfileValidationField) => {
      const map: Record<ProfileValidationField, string> = {
        full_name: labels.name,
        school_name: labels.school,
        school_type: labels.schoolType,
        education_level: labels.educationLevel,
        major: labels.major,
        sub_major: labels.subMajor,
        graduation_status: labels.graduationStatus,
        graduation_date: labels.graduationDate,
        gpa_score: "GPA",
        gpa_scale: labels.gpaScale,
        internship_count: labels.internshipCount,
        project_count: labels.projectCount,
        target_role: labels.targetRole,
        target_industry: labels.targetIndustry,
        preferred_location: labels.preferredLocation,
        desired_companies: labels.desiredCompanies,
        portfolio_url: labels.portfolioUrl,
        core_skills: labels.coreSkills,
        tech_stack: labels.techStack,
        role_certifications: labels.roleCertifications,
        other_certifications: labels.otherCertifications,
        language_test_name: labels.languageTest,
        language_test_score: labels.languageScore,
        experience_summary: labels.experienceSummary,
      };
      return map[key] ?? key;
    },
    [labels],
  );

  const applyValidationErrors = useCallback(
    (errors: Partial<Record<ProfileValidationField, string>>, summaryKo: string, summaryEn: string) => {
      setFieldErrors(errors);
      const errorCount = Object.keys(errors).length;
      setMessage(errorCount > 0 ? (language === "en" ? summaryEn : summaryKo) : "");
      if (errorCount > 0) scrollToFirstFieldError(errors);
    },
    [language],
  );

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !isSupabaseConfigured) return;

    setSubmitAttempted(true);
    const validation = validateProfileForm(form, language);
    if (!validation.valid) {
      applyValidationErrors(
        validation.errors,
        `저장하기 전에 ${Object.keys(validation.errors).length}개 항목을 수정해 주세요.`,
        `Fix ${Object.keys(validation.errors).length} field${Object.keys(validation.errors).length === 1 ? "" : "s"} before saving.`,
      );
      return;
    }

    setSaving(true);
    setMessage(labels.validating);

    try {
      const session = await getSessionWithRetry();
      const token = session?.access_token;
      if (token) {
        const aiResponse = await fetch("/api/profile-validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ form, language }),
        });
        if (aiResponse.ok) {
          const aiResult = (await aiResponse.json()) as {
            valid?: boolean;
            errors?: Partial<Record<ProfileValidationField, string>>;
          };
          if (aiResult.errors && Object.keys(aiResult.errors).length > 0) {
            applyValidationErrors(
              aiResult.errors,
              `${Object.keys(aiResult.errors).length}개 항목을 수정해 주세요. 각 칸에 맞는 내용을 입력해야 합니다.`,
              `Fix ${Object.keys(aiResult.errors).length} field${Object.keys(aiResult.errors).length === 1 ? "" : "s"} — entries must fit each field.`,
            );
            setSaving(false);
            return;
          }
        }
      }
    } catch {
      // Heuristic validation already passed; continue if AI is unavailable.
    }

    setFieldErrors({});
    setMessage("");
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
        <FormSection title={labels.sectionEducation} />
        <Field fieldKey="full_name" label={labels.name} value={form.full_name} onFieldChange={updateField} placeholder={labels.namePlaceholder} error={fieldError("full_name")} autoComplete="off" required={isRequired("full_name")} />
        <Field fieldKey="school_name" label={labels.school} value={form.school_name} onFieldChange={updateField} placeholder={labels.schoolPlaceholder} error={fieldError("school_name")} autoComplete="off" required={isRequired("school_name")} />
        <Field fieldKey="school_type" label={labels.schoolType} value={form.school_type} onFieldChange={updateField} placeholder={labels.schoolTypePlaceholder} error={fieldError("school_type")} autoComplete="off" required={isRequired("school_type")} />
        <Field fieldKey="education_level" label={labels.educationLevel} value={form.education_level} onFieldChange={updateField} placeholder={labels.educationLevelPlaceholder} error={fieldError("education_level")} autoComplete="off" required={isRequired("education_level")} />
        <Field fieldKey="major" label={labels.major} value={form.major} onFieldChange={updateField} placeholder={labels.majorPlaceholder} error={fieldError("major")} autoComplete="off" required={isRequired("major")} />
        <Field fieldKey="sub_major" label={labels.subMajor} value={form.sub_major} onFieldChange={updateField} placeholder={labels.subMajorPlaceholder} error={fieldError("sub_major")} autoComplete="off" required={isRequired("sub_major")} />
        <Field fieldKey="graduation_status" label={labels.graduationStatus} value={form.graduation_status} onFieldChange={updateField} placeholder={labels.graduationStatusPlaceholder} error={fieldError("graduation_status")} autoComplete="off" required={isRequired("graduation_status")} />
        <Field fieldKey="graduation_date" label={labels.graduationDate} type="date" value={form.graduation_date} onFieldChange={updateField} error={fieldError("graduation_date")} autoComplete="off" required={isRequired("graduation_date")} />
        <Field fieldKey="gpa_score" label="GPA" type="number" value={form.gpa_score} onFieldChange={updateField} placeholder={labels.gpaScorePlaceholder} min={0} max={Number(form.gpa_scale) || 4.5} step={0.01} error={fieldError("gpa_score")} autoComplete="off" required={isRequired("gpa_score")} />
        <SegmentSelectField
          label={labels.gpaScale}
          name="settings-gpa_scale"
          value={form.gpa_scale}
          options={GPA_SCALE_OPTIONS}
          onChange={(value) => updateField("gpa_scale", value)}
          error={fieldError("gpa_scale")}
          required={isRequired("gpa_scale")}
        />
        <Field fieldKey="internship_count" label={labels.internshipCount} type="number" value={form.internship_count} onFieldChange={updateField} placeholder={labels.internshipCountPlaceholder} min={0} max={99} step={1} error={fieldError("internship_count")} autoComplete="off" required={isRequired("internship_count")} />
        <Field fieldKey="project_count" label={labels.projectCount} type="number" value={form.project_count} onFieldChange={updateField} placeholder={labels.projectCountPlaceholder} min={0} max={99} step={1} error={fieldError("project_count")} autoComplete="off" required={isRequired("project_count")} />

        <FormSection title={labels.sectionCareer} />
        <Field fieldKey="target_role" label={labels.targetRole} value={form.target_role} onFieldChange={updateField} placeholder={labels.targetRolePlaceholder} error={fieldError("target_role")} required={isRequired("target_role")} />
        <Field fieldKey="target_industry" label={labels.targetIndustry} value={form.target_industry} onFieldChange={updateField} placeholder={labels.targetIndustryPlaceholder} error={fieldError("target_industry")} required={isRequired("target_industry")} />
        <Field fieldKey="preferred_location" label={labels.preferredLocation} value={form.preferred_location} onFieldChange={updateField} placeholder={labels.preferredLocationPlaceholder} error={fieldError("preferred_location")} required={isRequired("preferred_location")} />
        <Field fieldKey="desired_companies" label={labels.desiredCompanies} value={form.desired_companies} onFieldChange={updateField} placeholder={labels.desiredCompaniesPlaceholder} error={fieldError("desired_companies")} required={isRequired("desired_companies")} />

        <FormSection title={labels.sectionProof} />
        <PortfolioLinksField
          label={labels.portfolioUrl}
          hint={labels.portfolioUrlHint}
          addLabel={labels.addPortfolioLink}
          removeLabel={labels.removePortfolioLink}
          placeholder={labels.portfolioPlaceholder}
          value={form.portfolio_url}
          error={fieldError("portfolio_url")}
          onChange={(value) => updateField("portfolio_url", value)}
        />

        <FormSection title={labels.sectionSkills} />
        <Textarea fieldKey="core_skills" label={labels.coreSkills} value={form.core_skills} onFieldChange={updateField} placeholder={labels.coreSkillsPlaceholder} error={fieldError("core_skills")} required={isRequired("core_skills")} />
        <Textarea fieldKey="tech_stack" label={labels.techStack} value={form.tech_stack} onFieldChange={updateField} placeholder={labels.techStackPlaceholder} error={fieldError("tech_stack")} required={isRequired("tech_stack")} />
        <Textarea fieldKey="role_certifications" label={labels.roleCertifications} value={form.role_certifications} onFieldChange={updateField} placeholder={labels.roleCertificationsPlaceholder} error={fieldError("role_certifications")} required={isRequired("role_certifications")} />
        <Textarea fieldKey="other_certifications" label={labels.otherCertifications} value={form.other_certifications} onFieldChange={updateField} placeholder={labels.otherCertificationsPlaceholder} error={fieldError("other_certifications")} required={isRequired("other_certifications")} />
        <Field fieldKey="language_test_name" label={labels.languageTest} value={form.language_test_name} onFieldChange={updateField} placeholder={labels.languageTestPlaceholder} error={fieldError("language_test_name")} required={isRequired("language_test_name")} />
        <Field fieldKey="language_test_score" label={labels.languageScore} value={form.language_test_score} onFieldChange={updateField} placeholder={labels.languageScorePlaceholder} error={fieldError("language_test_score")} required={isRequired("language_test_score")} />

        <FormSection title={labels.sectionExperience} />
        <div className="md:col-span-2">
          <Textarea fieldKey="experience_summary" label={labels.experienceSummary} value={form.experience_summary} onFieldChange={updateField} placeholder={labels.experienceSummaryPlaceholder} error={fieldError("experience_summary")} required={isRequired("experience_summary")} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:col-span-2">
          <button disabled={saving || (submitAttempted && Object.keys(fieldErrors).length > 0)} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
            {saving ? (message === labels.validating ? labels.validating : labels.saving) : labels.save}
          </button>
          <Link href="/dashboard" className="secondary-btn px-4 py-2 text-center text-sm">
            {labels.viewDashboard}
          </Link>
        </div>
      </form>

      {message ? (
        <Notice className="mt-4" tone={submitAttempted && Object.keys(fieldErrors).length > 0 ? "warning" : undefined}>
          <p>{message}</p>
          {submitAttempted && Object.keys(fieldErrors).length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {(Object.entries(fieldErrors) as [ProfileValidationField, string][]).map(([field, error]) => (
                <li key={field}>
                  <span className="font-medium">{fieldLabel(field)}</span>: {error}
                </li>
              ))}
            </ul>
          ) : null}
        </Notice>
      ) : null}
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
  error,
  required,
  min,
  max,
  step,
}: {
  fieldKey: keyof SettingsForm;
  label: string;
  value: string;
  onFieldChange: (key: keyof SettingsForm, value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let next = event.target.value;
    if (type === "number" && next !== "") {
      const num = Number(next);
      if (!Number.isFinite(num)) return;
      if (min != null && num < min) next = String(min);
      if (max != null && num > max) next = String(max);
    }
    onFieldChange(fieldKey, next);
  };

  return (
    <label className="block">
      <span className="form-label">
        {label}
        {required ? <span className="ml-0.5 text-[var(--warning)]" aria-hidden="true">*</span> : null}
      </span>
      <input
        type={type}
        name={`settings-${fieldKey}`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        aria-invalid={Boolean(error)}
        className={`field mt-1${error ? " border-[var(--warning)]" : ""}`}
      />
      {error ? <span className="mt-1 block text-xs text-[var(--warning)]">{error}</span> : null}
    </label>
  );
});

const Textarea = memo(function Textarea({
  fieldKey,
  label,
  value,
  onFieldChange,
  placeholder,
  error,
  required,
}: {
  fieldKey: keyof SettingsForm;
  label: string;
  value: string;
  onFieldChange: (key: keyof SettingsForm, value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="form-label">
        {label}
        {required ? <span className="ml-0.5 text-[var(--warning)]" aria-hidden="true">*</span> : null}
      </span>
      <textarea
        name={`settings-${fieldKey}`}
        value={value}
        onChange={(event) => onFieldChange(fieldKey, event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`field mt-1 min-h-24${error ? " border-[var(--warning)]" : ""}`}
      />
      {error ? <span className="mt-1 block text-xs text-[var(--warning)]">{error}</span> : null}
    </label>
  );
});
