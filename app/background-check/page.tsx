"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, ShieldCheck, Wrench } from "lucide-react";
import { MetricTile, Notice, PageHeader, PagePanel, PageShell, SectionTitle } from "@/components/ui-shell";
import { useLanguage } from "@/components/language-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Issue = {
  title: string;
  risk: string;
  suggestedFix: string;
};

type BackgroundResult = {
  overallScore: number;
  status: string;
  criticalIssues: Issue[];
  warnings: Issue[];
  strengths: string[];
  recruiterViewSimulation: {
    summary: string;
    estimatedImpression: string;
    afterCleanup: string;
  };
  cleanupChecklist: string[];
  source?: "openai" | "demo_fallback";
  evaluationId?: string | null;
};

const copy = {
  ko: {
    eyebrow: "채용 담당자 신호",
    title: "Background Check Preview",
    description: "직접 제공한 공개 프로필 콘텐츠만 GPT로 점검합니다.",
    notice: "이 기능은 Google, LinkedIn, GitHub, Reddit, Twitter/X, Blind 또는 웹을 실제로 스크래핑하지 않습니다. 사용자가 붙여넣은 링크와 텍스트만 평가합니다.",
    links: "공개 프로필 링크",
    linksHelp: "한 줄에 하나씩 입력하세요. 링크 자체는 라벨로만 사용되며 실제 접속하지 않습니다.",
    content: "붙여넣은 공개 콘텐츠 / 요약",
    contentPlaceholder: "LinkedIn 소개, GitHub README 요약, 포트폴리오 문구, 공개 게시글 등 직접 제공 가능한 내용을 붙여넣으세요.",
    evaluate: "GPT 점검 실행",
    evaluating: "점검 중...",
    overall: "전체 점수",
    status: "상태",
    recruiterView: "채용 담당자 시뮬레이션",
    critical: "중요 이슈",
    warnings: "경고",
    strengths: "강점",
    checklist: "정리 체크리스트",
    risk: "위험",
    fix: "수정 제안",
    error: "평가를 완료하지 못했습니다.",
    saved: "저장됨",
    demo: "데모 폴백",
    emptyCritical: "중요 이슈가 감지되지 않았습니다.",
    emptyWarnings: "경고가 감지되지 않았습니다.",
  },
  en: {
    eyebrow: "Recruiter Signal",
    title: "Background Check Preview",
    description: "Evaluate only the public-profile content you provide.",
    notice: "This feature does not scrape Google, LinkedIn, GitHub, Reddit, Twitter/X, Blind, or the web. It only evaluates links and text you submit.",
    links: "Public profile links",
    linksHelp: "Enter one per line. Links are treated as labels only; the server does not visit them.",
    content: "Pasted public content / summary",
    contentPlaceholder: "Paste LinkedIn bio text, GitHub README summary, portfolio copy, public posts, or any manually provided content.",
    evaluate: "Run GPT Preview",
    evaluating: "Evaluating...",
    overall: "Overall Score",
    status: "Status",
    recruiterView: "Recruiter View Simulation",
    critical: "Critical Issues",
    warnings: "Warnings",
    strengths: "Strengths",
    checklist: "Cleanup Checklist",
    risk: "Risk",
    fix: "Suggested fix",
    error: "Could not complete evaluation.",
    saved: "Saved",
    demo: "Demo fallback",
    emptyCritical: "No critical issues detected.",
    emptyWarnings: "No warnings detected.",
  },
};

function IssueCard({ issue, tone, labels }: { issue: Issue; tone: "critical" | "warning"; labels: { risk: string; fix: string } }) {
  const isCritical = tone === "critical";

  return (
    <article className="content-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${
            isCritical
              ? "border-[color-mix(in_srgb,var(--danger)_40%,var(--line))] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
              : "border-[color-mix(in_srgb,var(--warning)_42%,var(--line))] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]"
          }`}
        >
          <AlertTriangle size={17} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-6 text-[var(--foreground)]">{issue.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><strong className="text-[var(--muted-strong)]">{labels.risk}:</strong> {issue.risk}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]"><strong className="text-[var(--muted-strong)]">{labels.fix}:</strong> {issue.suggestedFix}</p>
        </div>
      </div>
    </article>
  );
}

export default function BackgroundCheckPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [links, setLinks] = useState("https://github.com/example\nhttps://linkedin.com/in/example");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<BackgroundResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const evaluate = async () => {
    setLoading(true);
    setError("");
    try {
      const session = supabase && isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
      const response = await fetch("/api/evaluate/background-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          submittedLinks: links.split(/\n+/).map((item) => item.trim()).filter(Boolean),
          submittedContent: content,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || t.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <Notice className="mb-5">{t.notice}</Notice>

      <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <PagePanel>
          <SectionTitle title={t.links} description={t.linksHelp} />
          <textarea value={links} onChange={(event) => setLinks(event.target.value)} className="field mt-5 min-h-28" />
          <label className="mt-5 block">
            <span className="form-label">{t.content}</span>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} className="field min-h-56" placeholder={t.contentPlaceholder} />
          </label>
          <button type="button" onClick={evaluate} disabled={loading || (!links.trim() && !content.trim())} className="primary-btn mt-4 px-5 py-3 text-sm disabled:opacity-60">
            <Eye size={16} aria-hidden="true" />
            {loading ? t.evaluating : t.evaluate}
          </button>
          {error ? <Notice tone="warning" className="mt-4">{error}</Notice> : null}
        </PagePanel>

        <PagePanel>
          <SectionTitle title={t.recruiterView} description={result?.evaluationId ? t.saved : result?.source === "demo_fallback" ? t.demo : "OpenAI"} />
          {result ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile label={t.overall} value={`${result.overallScore}/100`} />
                <MetricTile label={t.status} value={result.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Summary", result.recruiterViewSimulation.summary],
                  ["Impression", result.recruiterViewSimulation.estimatedImpression],
                  ["After cleanup", result.recruiterViewSimulation.afterCleanup],
                ].map(([label, value]) => (
                  <div key={label} className="content-card p-4">
                    <div className="flex items-center gap-3">
                      <Eye size={17} className="text-[var(--accent-2)]" aria-hidden="true" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricTile label={t.overall} value="--" helper={language === "en" ? "Run preview to calculate" : "점검 실행 후 계산됩니다"} />
              <MetricTile label={t.status} value="--" helper={language === "en" ? "Provided content only" : "제공 콘텐츠만 사용"} />
            </div>
          )}
        </PagePanel>
      </section>

      {result ? (
        <>
          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <PagePanel>
              <SectionTitle title={t.critical} description={language === "en" ? "High-priority issues in submitted content." : "제출 콘텐츠에서 확인된 고우선순위 이슈"} />
              <div className="mt-5 grid gap-3">
                {result.criticalIssues.length ? result.criticalIssues.map((issue) => <IssueCard key={issue.title} issue={issue} tone="critical" labels={t} />) : <Notice>{t.emptyCritical}</Notice>}
              </div>
            </PagePanel>

            <PagePanel>
              <SectionTitle title={t.warnings} description={language === "en" ? "Medium-priority cleanup items." : "중간 우선순위 정리 항목"} />
              <div className="mt-5 grid gap-3">
                {result.warnings.length ? result.warnings.map((issue) => <IssueCard key={issue.title} issue={issue} tone="warning" labels={t} />) : <Notice>{t.emptyWarnings}</Notice>}
              </div>
            </PagePanel>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <PagePanel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle title={t.strengths} description={language === "en" ? "Positive signals in submitted material." : "제출 자료에서 보이는 긍정 신호"} />
                <span className="accent-pill px-3 py-1 text-xs font-semibold"><ShieldCheck size={14} aria-hidden="true" />Visible upside</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.strengths.map((strength) => (
                  <div key={strength} className="content-card p-4">
                    <CheckCircle2 size={18} className="text-[var(--success)]" aria-hidden="true" />
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">{strength}</p>
                  </div>
                ))}
              </div>
            </PagePanel>

            <PagePanel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle title={t.checklist} description={language === "en" ? "Recommended actions before recruiter review." : "채용 담당자 검토 전 추천 조치"} />
                <span className="accent-pill px-3 py-1 text-xs font-semibold"><Wrench size={14} aria-hidden="true" />Action plan</span>
              </div>
              <div className="timeline-list mt-5">
                {result.cleanupChecklist.map((item) => (
                  <div key={item} className="timeline-row">
                    <span className="timeline-marker" />
                    <p className="text-sm leading-6 text-[var(--muted-strong)]">{item}</p>
                    <ClipboardList size={16} className="text-[var(--accent-2)]" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </PagePanel>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
