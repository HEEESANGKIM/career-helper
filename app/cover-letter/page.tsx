"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type CoverLetterItem = {
  id: string;
  resume_text: string;
  job_description: string | null;
  tone: string | null;
  generated_text: string;
  created_at: string;
};

const toneOptions = [
  { label: "Professional", value: "professional" },
  { label: "Confident", value: "confident" },
  { label: "Concise", value: "concise" },
];

export default function CoverLetterPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedText, setGeneratedText] = useState("");
  const [history, setHistory] = useState<CoverLetterItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const getAuthHeader = async () => {
    if (!supabase || !isSupabaseConfigured) return "";
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    return accessToken ? `Bearer ${accessToken}` : "";
  };

  const loadHistory = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
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
      setMessage(json.error ?? "히스토리를 불러오지 못했습니다.");
      setLoadingHistory(false);
      return;
    }

    setHistory(json.items ?? []);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadHistory]);

  const generateCoverLetter = async (e: FormEvent) => {
    e.preventDefault();

    if (!resumeText.trim()) {
      setMessage("이력서 텍스트를 입력해 주세요.");
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
      setMessage(json.error ?? "생성에 실패했습니다.");
      return;
    }

    setGeneratedText(json.generatedText ?? "");
    setMessage("커버레터 초안 생성 및 저장이 완료되었습니다.");
    void loadHistory();
  };

  const handleReuse = (item: CoverLetterItem) => {
    setResumeText(item.resume_text ?? "");
    setJobDescription(item.job_description ?? "");
    setTone(item.tone ?? "professional");
    setGeneratedText(item.generated_text ?? "");
    setMessage("이전 입력값을 불러왔습니다. 재생성 버튼을 누르면 새 버전이 생성됩니다.");
  };

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">AI Cover Letter</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">AI 커버레터 생성</h1>
          <p className="mt-2 text-sm text-slate-600">이력서 텍스트를 입력하면 GPT 기반으로 커버레터 초안을 생성하고 저장합니다.</p>

          <div className="mt-4 flex gap-2">
            <Link href="/dashboard" className="secondary-btn px-3 py-2 text-sm">
              대시보드
            </Link>
            <Link href="/profile" className="secondary-btn px-3 py-2 text-sm">
              프로필 수정
            </Link>
          </div>

          <form className="mt-5 grid grid-cols-1 gap-3" onSubmit={generateCoverLetter}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">이력서 텍스트</label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="field min-h-36"
                placeholder="학력, 프로젝트, 인턴, 성과를 붙여 넣으세요."
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">지원 직무/공고 설명</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="field min-h-24"
                placeholder="지원 포지션 설명을 넣으면 더 정확해집니다."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-900">작성 톤</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="field">
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button disabled={loading} className="primary-btn px-4 py-2 text-sm disabled:opacity-60">
                {loading ? "생성 중..." : "커버레터 생성/재생성"}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

          {generatedText && (
            <div className="mt-5">
              <p className="mb-1 text-sm font-semibold text-slate-900">생성 결과</p>
              <textarea value={generatedText} readOnly className="field min-h-52" />
            </div>
          )}
        </div>

        <div className="surface-card mt-5 p-6">
          <h2 className="text-lg font-semibold text-slate-900">생성 히스토리</h2>
          {loadingHistory ? (
            <p className="mt-3 text-sm text-slate-600">불러오는 중...</p>
          ) : history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">아직 저장된 결과가 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-700 line-clamp-2">{item.generated_text}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleReuse(item)} className="secondary-btn px-3 py-1.5 text-xs">
                      불러와서 재생성
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
