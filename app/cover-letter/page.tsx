"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SegmentSelectField } from "@/components/settings-profile-fields";
import { EmptyState, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { coverLetterFieldLabel, validateCoverLetterInput, type CoverLetterField } from "@/lib/cover-letter-validation";
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

const HISTORY_PAGE_SIZE = 3;

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

  const resumePlaceholder = useMemo(
    () =>
      t(
        "예: SUNY Korea CSE 재학. React·Node.js 풀스택 캡스톤(채용 매칭 웹앱). 백엔드 인턴 2회 — REST API, PostgreSQL, 배포. TypeScript, Next.js, Git.",
        "e.g., SUNY Korea CSE student. Full-stack capstone with React and Node.js (job-matching web app). Two backend internships — REST APIs, PostgreSQL, deployment. TypeScript, Next.js, Git.",
      ),
    [t],
  );

  const jobDescriptionPlaceholder = useMemo(
    () =>
      t(
        "예: Kakao Fullstack Developer — React/TypeScript 프론트, Node.js API, DB 설계, 코드 리뷰, CI/CD 배포",
        "e.g., Kakao Fullstack Developer — React/TypeScript frontend, Node.js APIs, database design, code review, CI/CD deployment",
      ),
    [t],
  );

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedText, setGeneratedText] = useState("");
  const [history, setHistory] = useState<CoverLetterItem[]>([]);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CoverLetterField, string>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);
  const [deletingId, setDeletingId] = useState("");

  const totalHistoryPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const showHistoryPagination = history.length > HISTORY_PAGE_SIZE;
  const paginatedHistory = useMemo(() => {
    if (!showHistoryPagination) return history;
    const start = historyPage * HISTORY_PAGE_SIZE;
    return history.slice(start, start + HISTORY_PAGE_SIZE);
  }, [history, historyPage, showHistoryPagination]);

  useEffect(() => {
    if (historyPage > totalHistoryPages - 1) {
      setHistoryPage(Math.max(0, totalHistoryPages - 1));
    }
  }, [historyPage, totalHistoryPages]);

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

  const applyValidationErrors = useCallback(
    (errors: Partial<Record<CoverLetterField, string>>, summary: string) => {
      setFieldErrors(errors);
      setMessage(summary);
      const firstKey = Object.keys(errors)[0] as CoverLetterField | undefined;
      if (!firstKey) return;
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-field="cover-letter-${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [],
  );

  const generateCoverLetter = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const validation = validateCoverLetterInput(resumeText, jobDescription, language);
    if (!validation.valid) {
      applyValidationErrors(
        validation.errors,
        t(
          `입력을 확인해 주세요. ${Object.keys(validation.errors).length}개 항목을 수정해야 합니다.`,
          `Check your input. Fix ${Object.keys(validation.errors).length} field${Object.keys(validation.errors).length === 1 ? "" : "s"}.`,
        ),
      );
      return;
    }

    setFieldErrors({});

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
        language,
      }),
    });
    const json = await res.json();

    setLoading(false);
    if (!res.ok) {
      const apiFieldErrors = json.fieldErrors as Partial<Record<CoverLetterField, string>> | undefined;
      if (apiFieldErrors && Object.keys(apiFieldErrors).length > 0) {
        applyValidationErrors(apiFieldErrors, json.error ?? t("입력 내용을 수정해 주세요.", "Fix the input and try again."));
        return;
      }
      setMessage(json.error ?? t("생성에 실패했습니다.", "Failed to generate."));
      return;
    }

    setSubmitAttempted(false);

    setGeneratedText(json.generatedText ?? "");
    setHistoryPage(0);
    setMessage(t("커버레터 초안 생성 및 저장이 완료되었습니다.", "Cover letter draft generated and saved."));
    void loadHistory();
  };

  const handleReuse = (item: CoverLetterItem) => {
    setResumeText(item.resume_text ?? "");
    setJobDescription(item.job_description ?? "");
    setTone(item.tone ?? "professional");
    setGeneratedText(item.generated_text ?? "");
    setFieldErrors({});
    setSubmitAttempted(false);
    setMessage(t("이전 입력값을 불러왔습니다. 재생성 버튼을 누르면 새 버전이 생성됩니다.", "Previous input loaded. Click generate to create a new version."));
  };

  const handleDelete = async (item: CoverLetterItem) => {
    const confirmed = window.confirm(
      t("이 히스토리를 삭제할까요? 삭제 후에는 복구할 수 없습니다.", "Delete this history item? This cannot be undone."),
    );
    if (!confirmed) return;

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      window.location.href = "/login";
      return;
    }

    setDeletingId(item.id);
    setMessage("");

    const res = await fetch("/api/cover-letter", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ id: item.id }),
    });
    const json = await res.json();
    setDeletingId("");

    if (!res.ok) {
      setMessage(json.error ?? t("삭제에 실패했습니다.", "Failed to delete."));
      return;
    }

    setHistory((prev) => prev.filter((entry) => entry.id !== item.id));
    if (generatedText === item.generated_text) {
      setGeneratedText("");
    }
    setMessage(t("히스토리를 삭제했습니다.", "History item deleted."));
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
                data-field="cover-letter-resumeText"
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.resumeText) return prev;
                    const next = { ...prev };
                    delete next.resumeText;
                    return next;
                  });
                }}
                aria-invalid={Boolean(fieldErrors.resumeText)}
                className={`field mt-1 min-h-36${fieldErrors.resumeText ? " border-[var(--warning)]" : ""}`}
                placeholder={resumePlaceholder}
                required
              />
              {fieldErrors.resumeText ? <span className="mt-1 block text-xs text-[var(--warning)]">{fieldErrors.resumeText}</span> : null}
            </div>
            <div>
              <label className="form-label">{t("지원 직무/공고 설명", "Target Role / Job Description")}</label>
              <textarea
                data-field="cover-letter-jobDescription"
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.jobDescription) return prev;
                    const next = { ...prev };
                    delete next.jobDescription;
                    return next;
                  });
                }}
                aria-invalid={Boolean(fieldErrors.jobDescription)}
                className={`field mt-1 min-h-24${fieldErrors.jobDescription ? " border-[var(--warning)]" : ""}`}
                placeholder={jobDescriptionPlaceholder}
              />
              {fieldErrors.jobDescription ? <span className="mt-1 block text-xs text-[var(--warning)]">{fieldErrors.jobDescription}</span> : null}
            </div>
            <SegmentSelectField
              label={t("작성 톤", "Tone")}
              name="cover-letter-tone"
              value={tone}
              options={toneOptions}
              onChange={setTone}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button disabled={loading} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                {loading ? t("생성 중...", "Generating...") : t("커버레터 생성/재생성", "Generate / Regenerate")}
              </button>
            </div>
          </form>

          {message ? (
            <Notice className="mt-5" tone={submitAttempted && Object.keys(fieldErrors).length > 0 ? "warning" : undefined}>
              <p>{message}</p>
              {submitAttempted && Object.keys(fieldErrors).length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {(Object.entries(fieldErrors) as [CoverLetterField, string][]).map(([field, error]) => (
                    <li key={field}>
                      <span className="font-medium">{coverLetterFieldLabel(field, language)}</span>: {error}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Notice>
          ) : null}
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
            <div className="mt-5">
              <EmptyState>{t("아직 생성된 초안이 없습니다. 왼쪽 컨텍스트를 입력하고 생성해 주세요.", "No draft yet. Add context on the left and generate a draft.")}</EmptyState>
            </div>
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
            <>
              <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {paginatedHistory.map((item) => (
                  <div key={item.id} className="content-card flex min-h-[11rem] flex-col p-4">
                    <p className="text-xs text-[var(--muted)]">{new Date(item.created_at).toLocaleString(isEn ? "en-US" : "ko-KR")}</p>
                    <p className="ko-friendly mt-2 flex-1 text-sm leading-6 text-[var(--muted-strong)] line-clamp-3">{item.generated_text}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <button type="button" onClick={() => handleReuse(item)} className="secondary-btn px-3 py-1.5 text-xs">
                        {t("불러와서 재생성", "Load and regenerate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="danger-btn px-3 py-1.5 text-xs disabled:opacity-60"
                      >
                        {deletingId === item.id ? t("삭제 중...", "Deleting...") : t("삭제", "Delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {showHistoryPagination ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((page) => Math.max(0, page - 1))}
                    disabled={historyPage === 0}
                    className="secondary-btn px-3 py-2 text-sm disabled:opacity-60"
                  >
                    {t("이전", "Previous")}
                  </button>
                  <p className="min-w-[5.5rem] text-center text-sm text-[var(--muted)]">
                    {historyPage + 1} / {totalHistoryPages}
                  </p>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages - 1, page + 1))}
                    disabled={historyPage >= totalHistoryPages - 1}
                    className="secondary-btn px-3 py-2 text-sm disabled:opacity-60"
                  >
                    {t("다음", "Next")}
                  </button>
                </div>
              ) : null}
            </>
          )}
      </PagePanel>
    </PageShell>
  );
}

