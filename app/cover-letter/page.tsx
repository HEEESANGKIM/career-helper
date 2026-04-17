"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/language-provider";

type CoverLetterItem = {
  id: string;
  resume_text: string;
  job_description: string | null;
  tone: string | null;
  generated_text: string;
  created_at: string;
};

export default function CoverLetterPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const t = useCallback((ko: string, en: string) => (isEn ? en : ko), [isEn]);

  const toneOptions = useMemo(
    () => [
      { label: t("전문적", "Professional"), value: "professional" },
      { label: t("자신감 있는", "Confident"), value: "confident" },
      { label: t("간결한", "Concise"), value: "concise" },
      { label: t("현실적인", "Realistic"), value: "realistic" },
    ],
    [t],
  );

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedText, setGeneratedText] = useState("");
  const [history, setHistory] = useState<CoverLetterItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const getAuthHeader = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return "";
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return accessToken ? `Bearer ${accessToken}` : "";
  }, []);

  const loadHistory = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setMessage(t("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.", "Supabase environment variables are not configured. Check .env.local."));
      setLoadingHistory(false);
      return;
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/cover-letter", {
      headers: {
        Authorization: authHeader,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? t("히스토리를 불러오지 못했습니다.", "Failed to load history."));
      setLoadingHistory(false);
      return;
    }

    setHistory(json.items ?? []);
    setLoadingHistory(false);
  }, [getAuthHeader, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadHistory]);

  const generateCoverLetter = async (e: FormEvent) => {
    e.preventDefault();

    if (!resumeText.trim()) {
      setMessage(t("이력서 텍스트를 입력해 주세요.", "Please enter resume text."));
      return;
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setMessage("");

    const res = await fetch("/api/cover-letter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        tone,
      }),
    });
    const json = await res.json();

    setLoading(false);
    if (!res.ok) {
      setMessage(json.error ?? t("생성에 실패했습니다.", "Failed to generate."));
      return;
    }

    setGeneratedText(json.generatedText ?? "");
    setMessage(t("커버레터 초안 생성 및 저장이 완료되었습니다.", "Cover letter draft generated and saved."));
    void loadHistory();
  };

  const handleReuse = (item: CoverLetterItem) => {
    setResumeText(item.resume_text ?? "");
    setJobDescription(item.job_description ?? "");
    setTone(item.tone ?? "professional");
    setGeneratedText(item.generated_text ?? "");
    setMessage(t("이전 입력값을 불러왔습니다. 재생성 버튼을 누르면 새 버전이 생성됩니다.", "Previous input loaded. Click generate to create a new version."));
  };

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">AI Cover Letter</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("AI 커버레터 생성", "AI Cover Letter Generator")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("이력서 텍스트를 입력하면 GPT 기반으로 커버레터 초안을 생성하고 저장합니다.", "Generate and save a GPT-based cover letter draft from your resume text.")}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              {t("대시보드", "Dashboard")}
            </Link>
            <Link href="/profile" className="secondary-btn px-3 py-2 text-sm">
              {t("프로필 수정", "Edit profile")}
            </Link>
          </div>

          <form className="mt-5 grid grid-cols-1 gap-3" onSubmit={generateCoverLetter}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">{t("이력서 텍스트", "Resume Text")}</label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="field min-h-36"
                placeholder={t("학력, 프로젝트, 인턴, 성과를 붙여 넣으세요.", "Paste education, projects, internships, and outcomes.")}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">{t("지원 직무/공고 설명", "Target Role / Job Description")}</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="field min-h-24"
                placeholder={t("지원 포지션 설명을 넣으면 더 정확해집니다.", "Adding job description improves precision.")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">{t("작성 톤", "Tone")}</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="field">
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button disabled={loading} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                {loading ? t("생성 중...", "Generating...") : t("커버레터 생성/재생성", "Generate / Regenerate")}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

          {generatedText && (
            <div className="mt-5">
              <p className="mb-1 text-sm font-semibold text-slate-900">{t("생성 결과", "Generated Result")}</p>
              <textarea value={generatedText} readOnly className="field min-h-52" />
            </div>
          )}
        </div>

        <div className="surface-card mt-5 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("생성 히스토리", "Generation History")}</h2>
          {loadingHistory ? (
            <p className="mt-3 text-sm text-slate-600">{t("불러오는 중...", "Loading...")}</p>
          ) : history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{t("아직 저장된 결과가 없습니다.", "No saved results yet.")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString(isEn ? "en-US" : "ko-KR")}</p>
                  <p className="mt-1 text-sm text-slate-700 line-clamp-2">{item.generated_text}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button onClick={() => handleReuse(item)} className="secondary-btn px-3 py-1.5 text-xs">
                      {t("불러와서 재생성", "Load and regenerate")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
