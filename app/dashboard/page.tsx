"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type InsightResponse = {
  name: string;
  topPercent: number;
  completeness: number;
  trend: number[];
  signals: string[];
  weeklyReport: string[];
};

type QuickActionIconName = "profile" | "matching" | "coverLetter" | "simulator";

function QuickActionIcon({ name }: { name: QuickActionIconName }) {
  const baseClass = "h-5 w-5 text-blue-700";

  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.31 0-6 2.02-6 4.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1C18 16.02 15.31 14 12 14Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "matching") {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden>
        <path d="M10 4a6 6 0 1 0 3.87 10.58l3.77 3.77a1 1 0 0 0 1.41-1.41l-3.77-3.77A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1-4 4 4 4 0 0 1 4-4Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === "coverLetter") {
    return (
      <svg viewBox="0 0 24 24" className={baseClass} aria-hidden>
        <path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9.5L14.5 3Zm8 1.91L18.09 9H14ZM8 12a1 1 0 1 1 0-2h8a1 1 0 1 1 0 2Zm0 4a1 1 0 1 1 0-2h8a1 1 0 1 1 0 2Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={baseClass} aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h4.5a2 2 0 0 1 1.8 1.12L13.4 6h4.6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm6.5 2H6v11h12V8h-5.2a2 2 0 0 1-1.79-1.11ZM10 11a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 0 1-1-1Z" fill="currentColor" />
    </svg>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [animatedPercent, setAnimatedPercent] = useState(100);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setMessage("Supabase 환경변수가 설정되지 않았습니다. .env.local을 확인해 주세요.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/dashboard-insight", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMessage(json.error ?? "대시보드 인사이트를 불러오지 못했습니다.");
        return;
      }

      setInsight(json);
      setMessage("");
    };

    void load();
  }, []);

  useEffect(() => {
    if (!insight) return;
    const target = insight.topPercent;
    let current = 100;
    const timer = setInterval(() => {
      current -= 2;
      if (current <= target) {
        current = target;
        clearInterval(timer);
      }
      setAnimatedPercent(current);
    }, 24);
    return () => clearInterval(timer);
  }, [insight]);

  const buildTrendChart = (trend: number[]) => {
    const values = trend.slice(0, 5).map((v) => Math.max(0, Math.min(100, v)));
    const width = 320;
    const height = 140;
    const left = 20;
    const right = 20;
    const top = 20;
    const bottom = 96;
    const stepX = values.length > 1 ? (width - left - right) / (values.length - 1) : 0;

    const points = values.map((v, idx) => {
      const x = left + stepX * idx;
      const y = bottom - ((bottom - top) * v) / 100;
      return { x, y, value: v };
    });

    const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${path} L ${left + stepX * (values.length - 1)} ${bottom} L ${left} ${bottom} Z`;
    return { points, path, areaPath, width, height, left, right, bottom };
  };

  return (
    <div className="app-bg px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">커리어 대시보드</h1>
          <p className="mt-2 text-sm text-slate-600">프로필 기반 AI 인사이트와 취업 준비 진행률을 확인하세요.</p>

          {loading && <p className="mt-4 text-sm text-slate-600">인사이트를 계산하는 중입니다...</p>}
          {message && !loading && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

          {!loading && !message && insight && (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">AI Rank Insight</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    현재 {insight.name}님은 취준 상위 <span className="text-blue-700">{animatedPercent}%</span>
                  </h2>
                  <div className="mt-3 h-3 rounded-full bg-blue-100">
                    <div className="h-3 rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${100 - animatedPercent}%` }} />
                  </div>
                  <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                    {insight.signals.map((signal) => (
                      <li key={signal}>{signal}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">프로필 완성도</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{insight.completeness}%</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${insight.completeness}%` }} />
                  </div>
                  <Link href="/profile" className="secondary-btn mt-4 inline-block px-3 py-2 text-xs">
                    프로필 보완하기
                  </Link>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">최근 5주 준비 추이</p>
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  {(() => {
                    const chart = buildTrendChart(insight.trend);
                    return (
                      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-40 w-full" role="img" aria-label="최근 5주 준비 추이 그래프">
                        <defs>
                          <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#f87171" stopOpacity="0.26" />
                            <stop offset="100%" stopColor="#f87171" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={`M ${chart.left} ${chart.bottom} L ${chart.width - chart.right} ${chart.bottom}`} stroke="#cbd5e1" strokeWidth="1" />
                        <path d={chart.areaPath} fill="url(#trendArea)" />
                        <path d={chart.path} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {chart.points.map((point, idx) => (
                          <g key={`${point.value}-${idx}`}>
                            <circle cx={point.x} cy={point.y} r="5" fill="#fee2e2" />
                            <circle cx={point.x} cy={point.y} r="3.2" fill="#dc2626" />
                            <text x={point.x} y="124" textAnchor="middle" fontSize="11" fill="#64748b">
                              W{idx + 1}
                            </text>
                          </g>
                        ))}
                      </svg>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">주간 실행 리포트</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {insight.weeklyReport.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Link href="/profile" className="surface-card p-4 hover:border-blue-300">
                  <div className="flex items-center gap-2">
                    <QuickActionIcon name="profile" />
                    <p className="text-sm font-semibold text-slate-900">프로필 설정</p>
                  </div>
                </Link>
                <Link href="/matching" className="surface-card p-4 hover:border-blue-300">
                  <div className="flex items-center gap-2">
                    <QuickActionIcon name="matching" />
                    <p className="text-sm font-semibold text-slate-900">채용 매칭</p>
                  </div>
                </Link>
                <Link href="/cover-letter" className="surface-card p-4 hover:border-blue-300">
                  <div className="flex items-center gap-2">
                    <QuickActionIcon name="coverLetter" />
                    <p className="text-sm font-semibold text-slate-900">AI 커버레터</p>
                  </div>
                </Link>
                <Link href="/simulator" className="surface-card p-4 hover:border-blue-300">
                  <div className="flex items-center gap-2">
                    <QuickActionIcon name="simulator" />
                    <p className="text-sm font-semibold text-slate-900">시뮬레이터</p>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
