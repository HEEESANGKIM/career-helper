"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
        setInitializing(false);
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
  }, []);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
      return;
    }
    if (!userId) {
      setMessage("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
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

    setMessage("상세 프로필 저장이 완료되었습니다.");
  };

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Profile</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">상세 프로필 설정</h1>
          <p className="mt-2 text-sm text-slate-600">학력, GPA 기준, 자격증, 어학 성적까지 세분화해서 입력하세요.</p>

          {initializing ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">프로필을 불러오는 중입니다...</p>
          ) : (
            <form className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">이름</label>
                <input value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="field" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">학교명</label>
                <input value={form.school_name} onChange={(e) => updateField("school_name", e.target.value)} className="field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">학교 구분</label>
                <input
                  value={form.school_type}
                  onChange={(e) => updateField("school_type", e.target.value)}
                  placeholder="예: 4년제/전문대/대학원"
                  className="field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">학력 상태</label>
                <input
                  value={form.education_level}
                  onChange={(e) => updateField("education_level", e.target.value)}
                  placeholder="예: 학사 4학년"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">졸업 상태</label>
                <input
                  value={form.graduation_status}
                  onChange={(e) => updateField("graduation_status", e.target.value)}
                  placeholder="예: 졸업예정/졸업/휴학"
                  className="field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">전공</label>
                <input value={form.major} onChange={(e) => updateField("major", e.target.value)} className="field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">복수/부전공</label>
                <input value={form.sub_major} onChange={(e) => updateField("sub_major", e.target.value)} className="field" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">졸업(예정)일</label>
                <input type="date" value={form.graduation_date} onChange={(e) => updateField("graduation_date", e.target.value)} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">GPA 점수</label>
                  <input type="number" min="0" step="0.01" value={form.gpa_score} onChange={(e) => updateField("gpa_score", e.target.value)} className="field" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">GPA 만점</label>
                  <input type="number" min="1" step="0.01" value={form.gpa_scale} onChange={(e) => updateField("gpa_scale", e.target.value)} className="field" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">핵심 직무 스킬</label>
                <textarea
                  value={form.core_skills}
                  onChange={(e) => updateField("core_skills", e.target.value)}
                  placeholder="쉼표로 구분: 예) 문제해결, 커뮤니케이션, 데이터분석"
                  className="field min-h-20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">기술 스택</label>
                <textarea
                  value={form.tech_stack}
                  onChange={(e) => updateField("tech_stack", e.target.value)}
                  placeholder="쉼표로 구분: 예) React, TypeScript, SQL, Python"
                  className="field min-h-20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">인턴 경험 횟수</label>
                <input type="number" min="0" value={form.internship_count} onChange={(e) => updateField("internship_count", e.target.value)} className="field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">프로젝트 수</label>
                <input type="number" min="0" value={form.project_count} onChange={(e) => updateField("project_count", e.target.value)} className="field" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">희망직무 관련 자격증</label>
                <textarea
                  value={form.role_certifications}
                  onChange={(e) => updateField("role_certifications", e.target.value)}
                  placeholder="쉼표로 구분: 예) SQLD, ADsP"
                  className="field min-h-20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">어학시험 종류</label>
                <input
                  value={form.language_test_name}
                  onChange={(e) => updateField("language_test_name", e.target.value)}
                  placeholder="예: TOEIC, TOEFL, OPIc"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">어학시험 점수/등급</label>
                <input
                  value={form.language_test_score}
                  onChange={(e) => updateField("language_test_score", e.target.value)}
                  placeholder="예: TOEIC 900, OPIc IH"
                  className="field"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">기타 자격증</label>
                <textarea
                  value={form.other_certifications}
                  onChange={(e) => updateField("other_certifications", e.target.value)}
                  placeholder="쉼표로 구분: 예) 정보처리기사, 컴활 1급"
                  className="field min-h-20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">희망 직무</label>
                <input value={form.target_role} onChange={(e) => updateField("target_role", e.target.value)} className="field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">희망 산업군</label>
                <input
                  value={form.target_industry}
                  onChange={(e) => updateField("target_industry", e.target.value)}
                  placeholder="예: IT 서비스, 핀테크"
                  className="field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">근무 희망 지역</label>
                <input
                  value={form.preferred_location}
                  onChange={(e) => updateField("preferred_location", e.target.value)}
                  placeholder="예: 서울/경기"
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">포트폴리오 URL</label>
                <input value={form.portfolio_url} onChange={(e) => updateField("portfolio_url", e.target.value)} className="field" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">GitHub URL</label>
                <input value={form.github_url} onChange={(e) => updateField("github_url", e.target.value)} className="field" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-900">경험 요약</label>
                <textarea
                  value={form.experience_summary}
                  onChange={(e) => updateField("experience_summary", e.target.value)}
                  placeholder="인턴/프로젝트에서 맡은 역할과 성과를 간단히 작성"
                  className="field min-h-24"
                />
              </div>

              <div className="mt-2 flex gap-2 md:col-span-2">
                <button disabled={loading} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                  {loading ? "저장 중..." : "상세 프로필 저장"}
                </button>
                <Link href="/matching" className="secondary-btn px-4 py-2 text-sm">
                  매칭 보러가기
                </Link>
              </div>
            </form>
          )}

          {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>
    </div>
  );
}
