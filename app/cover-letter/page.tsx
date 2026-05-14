"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";
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
    const session = await getSessionWithRetry();
    const accessToken = session?.access_token;
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
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        eyebrow="AI Writing Workspace"
        title={t("AI 커버레터 생성", "AI Cover Letter Generator")}
        description={t("이력서와 공고 맥락을 넣고 지원 문서를 빠르게 생성, 비교, 재사용하세요.", "Generate, compare, and reuse application drafts from resume and job context.")}
        actions={
          <>
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              {t("대시보드", "Dashboard")}
            </Link>
            <Link href="/settings" className="secondary-btn px-3 py-2 text-sm">
              {t("설정에서 프로필 수정", "Edit profile in Settings")}
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <PagePanel>
          <SectionTitle title={t("입력 컨텍스트", "Input context")} description={t("지원자의 증거와 공고 요구사항을 분리해서 정리하세요.", "Separate candidate evidence from job requirements for a cleaner draft.")} />
          <form className="mt-6 grid grid-cols-1 gap-4" onSubmit={generateCoverLetter}>
            <div>
              <label className="form-label">{t("이력서 텍스트", "Resume Text")}</label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="field min-h-36"
                placeholder={t("학력, 프로젝트, 인턴, 성과를 붙여 넣으세요.", "Paste education, projects, internships, and outcomes.")}
                required
              />
            </div>
            <div>
              <label className="form-label">{t("지원 직무/공고 설명", "Target Role / Job Description")}</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="field min-h-24"
                placeholder={t("지원 포지션 설명을 넣으면 더 정확해집니다.", "Adding job description improves precision.")}
              />
            </div>
            <div>
              <label className="form-label">{t("작성 톤", "Tone")}</label>
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

          {message && <Notice className="mt-5">{message}</Notice>}
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t("생성 결과", "Generated Result")} description={t("편집 가능한 에디터 형태로 초안을 검토하세요.", "Review the draft in an editor-style output panel.")} />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="content-card p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Tone</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{toneOptions.find((option) => option.value === tone)?.label}</p>
            </div>
            <div className="content-card p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Evidence</p>
              <div className="signal-bar mt-3"><div className="signal-fill" style={{ width: `${Math.min(100, Math.max(12, resumeText.length / 8))}%` }} /></div>
            </div>
            <div className="content-card p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">JD Align</p>
              <div className="signal-bar mt-3"><div className="signal-fill" style={{ width: `${jobDescription.trim() ? 78 : 18}%` }} /></div>
            </div>
          </div>
          {generatedText ? (
            <div className="mt-5">
              <textarea value={generatedText} readOnly className="field min-h-52" />
            </div>
          ) : (
            <EmptyState>{t("아직 생성된 초안이 없습니다. 왼쪽 컨텍스트를 입력하고 생성해 주세요.", "No draft yet. Add context on the left and generate a draft.")}</EmptyState>
          )}
          <div className="content-card mt-5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--warning)]">{t("Missing evidence hints", "Missing evidence hints")}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
              {!/\d/.test(resumeText) ? <li>{t("정량 성과 숫자를 추가하면 설득력이 좋아집니다.", "Add measurable numbers to strengthen credibility.")}</li> : null}
              {!jobDescription.trim() ? <li>{t("공고 설명을 넣으면 JD alignment가 올라갑니다.", "Add the job description to improve JD alignment.")}</li> : null}
              {resumeText.length < 300 ? <li>{t("프로젝트 역할과 결과를 더 구체화하세요.", "Add more detail about project role and outcomes.")}</li> : null}
            </ul>
          </div>
        </PagePanel>
      </div>

      <PagePanel className="mt-5">
          <SectionTitle title={t("생성 히스토리", "Generation History")} />
          {loadingHistory ? (
            <Notice className="mt-3">{t("불러오는 중...", "Loading...")}</Notice>
          ) : history.length === 0 ? (
            <EmptyState>{t("아직 저장된 결과가 없습니다.", "No saved results yet.")}</EmptyState>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {history.map((item) => (
                <div key={item.id} className="content-card p-4">
                  <p className="text-xs text-[var(--muted)]">{new Date(item.created_at).toLocaleString(isEn ? "en-US" : "ko-KR")}</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)] line-clamp-2">{item.generated_text}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button onClick={() => handleReuse(item)} className="secondary-btn px-3 py-1.5 text-xs">
                      {t("불러와서 재생성", "Load and regenerate")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </PagePanel>
    </PageShell>
  );
}

