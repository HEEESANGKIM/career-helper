"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Notice, PageHeader, PagePanel, PageShell } from "@/components/ui-shell";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type ProfileForm = {
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
  portfolio_url: string;
  github_url: string;
  experience_summary: string;
};

const initialForm: ProfileForm = {
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
  portfolio_url: "",
  github_url: "",
  experience_summary: "",
};

export default function ProfilePage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = (ko: string, en: string) => (isEn ? en : ko);

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const profileCompleteness = useMemo(() => {
    const trackedFields: Array<keyof ProfileForm> = [
      "full_name",
      "school_name",
      "major",
      "gpa_score",
      "core_skills",
      "tech_stack",
      "target_role",
      "preferred_location",
      "experience_summary",
      "portfolio_url",
    ];
    const filled = trackedFields.filter((field) => form[field].trim().length > 0).length;
    return Math.round((filled / trackedFields.length) * 100);
  }, [form]);

  const skillChips = useMemo(
    () =>
      [form.core_skills, form.tech_stack]
        .join(",")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
    [form.core_skills, form.tech_stack],
  );

  useEffect(() => {
    const init = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
        setInitializing(false);
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

      setUserId(userData.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          full_name, school_name, school_type, education_level, major, sub_major,
          graduation_status, graduation_date, gpa_score, gpa_scale, core_skills, tech_stack,
          internship_count, project_count, role_certifications, language_test_name, language_test_score,
          other_certifications, target_role, target_industry, preferred_location,
          portfolio_url, github_url, experience_summary
          `,
        )
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setInitializing(false);
        return;
      }

      if (data) {
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
          portfolio_url: data.portfolio_url ?? "",
          github_url: data.github_url ?? "",
          experience_summary: data.experience_summary ?? "",
        });
      }

      setInitializing(false);
    };

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      setMessage(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
      return;
    }
    if (!userId) {
      setMessage(t("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.", "Could not verify login. Please sign in again."));
      return;
    }

    const gpaScore = form.gpa_score ? Number(form.gpa_score) : null;
    const gpaScale = form.gpa_scale ? Number(form.gpa_scale) : null;
    const normalizedGpa = gpaScore && gpaScale ? (gpaScore / gpaScale) * 4.5 : null;
    const mergedSkills = [form.core_skills, form.tech_stack].filter(Boolean).join(", ");
    const mergedCerts = [form.role_certifications, form.other_certifications].filter(Boolean).join(", ");

    setLoading(true);
    setMessage("");

    const payload = {
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
      core_skills: form.core_skills.trim(),
      tech_stack: form.tech_stack.trim(),
      internship_count: Number(form.internship_count || 0),
      project_count: Number(form.project_count || 0),
      role_certifications: form.role_certifications.trim(),
      language_test_name: form.language_test_name.trim(),
      language_test_score: form.language_test_score.trim(),
      other_certifications: form.other_certifications.trim(),
      target_role: form.target_role.trim(),
      target_industry: form.target_industry.trim(),
      preferred_location: form.preferred_location.trim(),
      portfolio_url: form.portfolio_url.trim(),
      github_url: form.github_url.trim(),
      experience_summary: form.experience_summary.trim(),
      gpa: normalizedGpa,
      skills: mergedSkills,
      certifications: mergedCerts,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(t("상세 프로필 저장이 완료되었습니다.", "Profile saved successfully."));
  };

  return (
    <PageShell maxWidth="max-w-6xl">
      <PageHeader
        eyebrow="Profile Signal"
        title={t("상세 프로필 설정", "Profile Settings")}
        description={t(
          "학력, GPA, 자격증, 스킬, 목표 직무를 Pathmate.ai 매칭 엔진이 읽을 수 있는 구조로 정리하세요.",
          "Structure your education, GPA, certifications, skills, and target role for the Pathmate.ai matching engine.",
        )}
        actions={
          <>
            <Link href="/matching" className="primary-btn px-4 py-2 text-center text-sm">
              {t("매칭 보러가기", "View Matching")}
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <PagePanel>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Profile completeness</p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <p className="text-5xl font-semibold text-[var(--foreground)]">{profileCompleteness}%</p>
            <span className="accent-pill px-3 py-1 text-xs font-semibold">{profileCompleteness >= 75 ? t("준비 완료", "Ready") : t("신호 구축 중", "Build signal")}</span>
          </div>
          <div className="signal-bar mt-5">
            <div className="signal-fill" style={{ width: `${profileCompleteness}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {t(
              "증거, 스킬, 프로젝트 맥락이 구체화될수록 목표 직무 준비도가 올라갑니다.",
              "Target role readiness improves as evidence, skills, and project context become more concrete.",
            )}
          </p>
        </PagePanel>
        <PagePanel>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Skill Signal Chips</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {skillChips.length > 0
              ? skillChips.map((skill) => <span key={skill} className="chip">{skill}</span>)
              : <span className="text-sm text-[var(--muted)]">{t("핵심 스킬과 기술 스택을 입력하면 Skill Gap Map이 만들어집니다.", "Add core skills and tech stack to build your Skill Gap Map.")}</span>}
          </div>
        </PagePanel>
      </div>

      <PagePanel>
        {initializing ? (
          <Notice className="mt-4">{t("프로필을 불러오는 중입니다...", "Loading profile...")}</Notice>
        ) : (
          <form className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="md:col-span-2">
              <label className="form-label">{t("이름", "Name")}</label>
              <input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="field" />
            </div>

            <div>
              <label className="form-label">{t("학교명", "School Name")}</label>
              <input value={form.school_name} onChange={(e) => updateField("school_name", e.target.value)} className="field" />
            </div>
            <div>
              <label className="form-label">{t("학교 구분", "School Type")}</label>
              <input
                value={form.school_type}
                onChange={(e) => updateField("school_type", e.target.value)}
                placeholder={t("예: 4년제/전문대/대학원", "e.g., 4-year/2-year/Graduate")}
                className="field"
              />
            </div>

            <div>
              <label className="form-label">{t("학력 상태", "Education Status")}</label>
              <input
                value={form.education_level}
                onChange={(e) => updateField("education_level", e.target.value)}
                placeholder={t("예: 학사 4학년", "e.g., 4th year undergraduate")}
                className="field"
              />
            </div>
            <div>
              <label className="form-label">{t("졸업 상태", "Graduation Status")}</label>
              <input
                value={form.graduation_status}
                onChange={(e) => updateField("graduation_status", e.target.value)}
                placeholder={t("예: 졸업예정/졸업/휴학", "e.g., Expected/Graduated/On Leave")}
                className="field"
              />
            </div>

            <div>
              <label className="form-label">{t("전공", "Major")}</label>
              <input value={form.major} onChange={(e) => updateField("major", e.target.value)} className="field" />
            </div>
            <div>
              <label className="form-label">{t("복수/부전공", "Double/Minor")}</label>
              <input value={form.sub_major} onChange={(e) => updateField("sub_major", e.target.value)} className="field" />
            </div>

            <div>
              <label className="form-label">{t("졸업(예정)일", "Graduation Date (Expected)")}</label>
              <input type="date" value={form.graduation_date} onChange={(e) => updateField("graduation_date", e.target.value)} className="field" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="form-label">{t("GPA 점수", "GPA Score")}</label>
                <input type="number" min="0" step="0.01" value={form.gpa_score} onChange={(e) => updateField("gpa_score", e.target.value)} className="field" />
              </div>
              <div>
                <label className="form-label">{t("GPA 만점", "GPA Max")}</label>
                <input type="number" min="1" step="0.01" value={form.gpa_scale} onChange={(e) => updateField("gpa_scale", e.target.value)} className="field" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="form-label">{t("핵심 직무 스킬", "Core Job Skills")}</label>
              <textarea
                value={form.core_skills}
                onChange={(e) => updateField("core_skills", e.target.value)}
                placeholder={t("쉼표로 구분: 예) 문제해결, 커뮤니케이션, 데이터분석", "Comma-separated: e.g., Problem-solving, Communication, Data analysis")}
                className="field min-h-20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">{t("기술 스택", "Tech Stack")}</label>
              <textarea
                value={form.tech_stack}
                onChange={(e) => updateField("tech_stack", e.target.value)}
                placeholder={t("쉼표로 구분: 예) React, TypeScript, SQL, Python", "Comma-separated: e.g., React, TypeScript, SQL, Python")}
                className="field min-h-20"
              />
            </div>

            <div>
              <label className="form-label">{t("인턴 경험 횟수", "Internship Count")}</label>
              <input type="number" min="0" value={form.internship_count} onChange={(e) => updateField("internship_count", e.target.value)} className="field" />
            </div>
            <div>
              <label className="form-label">{t("프로젝트 수", "Project Count")}</label>
              <input type="number" min="0" value={form.project_count} onChange={(e) => updateField("project_count", e.target.value)} className="field" />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">{t("희망직무 관련 자격증", "Job-related Certifications")}</label>
              <textarea
                value={form.role_certifications}
                onChange={(e) => updateField("role_certifications", e.target.value)}
                placeholder={t("쉼표로 구분: 예) SQLD, ADsP", "Comma-separated: e.g., SQLD, ADsP")}
                className="field min-h-20"
              />
            </div>

            <div>
              <label className="form-label">{t("어학시험 종류", "Language Test Type")}</label>
              <input
                value={form.language_test_name}
                onChange={(e) => updateField("language_test_name", e.target.value)}
                placeholder="e.g., TOEIC, TOEFL, OPIc"
                className="field"
              />
            </div>
            <div>
              <label className="form-label">{t("어학시험 점수/등급", "Language Test Score/Grade")}</label>
              <input
                value={form.language_test_score}
                onChange={(e) => updateField("language_test_score", e.target.value)}
                placeholder="e.g., TOEIC 900, OPIc IH"
                className="field"
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">{t("기타 자격증", "Other Certifications")}</label>
              <textarea
                value={form.other_certifications}
                onChange={(e) => updateField("other_certifications", e.target.value)}
                placeholder={t("쉼표로 구분: 예) 정보처리기사, 컴활 1급", "Comma-separated: e.g., Engineer Information Processing, Computer Use Level 1")}
                className="field min-h-20"
              />
            </div>

            <div>
              <label className="form-label">{t("희망 직무", "Target Role")}</label>
              <input value={form.target_role} onChange={(e) => updateField("target_role", e.target.value)} className="field" />
            </div>
            <div>
              <label className="form-label">{t("희망 산업군", "Target Industry")}</label>
              <input
                value={form.target_industry}
                onChange={(e) => updateField("target_industry", e.target.value)}
                placeholder={t("예: IT 서비스, 핀테크", "e.g., IT Services, Fintech")}
                className="field"
              />
            </div>

            <div>
              <label className="form-label">{t("근무 희망 지역", "Preferred Work Location")}</label>
              <input
                value={form.preferred_location}
                onChange={(e) => updateField("preferred_location", e.target.value)}
                placeholder={t("예: 서울/경기", "e.g., Seoul/Gyeonggi")}
                className="field"
              />
            </div>
            <div>
              <label className="form-label">{t("포트폴리오 URL", "Portfolio URL")}</label>
              <input value={form.portfolio_url} onChange={(e) => updateField("portfolio_url", e.target.value)} className="field" />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">GitHub URL</label>
              <input value={form.github_url} onChange={(e) => updateField("github_url", e.target.value)} className="field" />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">{t("경험 요약", "Experience Summary")}</label>
              <textarea
                value={form.experience_summary}
                onChange={(e) => updateField("experience_summary", e.target.value)}
                placeholder={t(
                  "인턴/프로젝트에서 맡은 역할과 성과를 간단히 작성",
                  "Briefly describe your role and achievements in internships/projects",
                )}
                className="field min-h-24"
              />
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row md:col-span-2">
              <button disabled={loading} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                {loading ? t("저장 중...", "Saving...") : t("상세 프로필 저장", "Save Profile")}
              </button>
              <Link href="/matching" className="secondary-btn px-4 py-2 text-center text-sm">
                {t("매칭 보러가기", "View Matching")}
              </Link>
            </div>
          </form>
        )}

        {message && <Notice className="mt-4">{message}</Notice>}
      </PagePanel>
    </PageShell>
  );
}
