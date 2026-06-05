"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Star, Trash2 } from "lucide-react";
import { Notice, SectionTitle } from "@/components/ui-shell";
import { getSessionWithRetry } from "@/lib/supabase";

export type JobFavoriteItem = {
  id: string;
  job_url: string;
  job_title: string;
  company: string;
  location: string | null;
  summary: string | null;
  fit_score: number | null;
  saved_at: string;
};

type JobFavoritesPanelProps = {
  language: "ko" | "en";
  compact?: boolean;
  showManageLink?: boolean;
};

const isJobFavoritesTableMissing = (message: string) =>
  /job_favorites/i.test(message) &&
  (/schema cache/i.test(message) || /does not exist/i.test(message) || /PGRST205/i.test(message));

export function JobFavoritesPanel({ language, compact = false, showManageLink = false }: JobFavoritesPanelProps) {
  const isEn = language === "en";
  const t = (ko: string, en: string) => (isEn ? en : ko);

  const [items, setItems] = useState<JobFavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const loadFavorites = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    const session = await getSessionWithRetry();
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/job-favorites", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      const errMsg = String(json?.error ?? "");
      if (isJobFavoritesTableMissing(errMsg)) {
        setItems([]);
        return;
      }
      setError(errMsg || t("즐겨찾기를 불러오지 못했습니다.", "Failed to load favorites."));
      return;
    }

    setItems((json?.items as JobFavoriteItem[]) ?? []);
    setPage(0);
  }, [isEn]);

  useEffect(() => {
    void loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const removeFavorite = async (id: string) => {
    const confirmed = window.confirm(t("이 공고를 즐겨찾기에서 삭제할까요?", "Remove this posting from favorites?"));
    if (!confirmed) return;

    const session = await getSessionWithRetry();
    const token = session?.access_token;
    if (!token) return;

    setDeletingId(id);
    const res = await fetch("/api/job-favorites", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    setDeletingId("");

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? t("삭제에 실패했습니다.", "Failed to delete."));
      return;
    }

    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setPage((current) => Math.min(current, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const usePagination = !compact && items.length >= 3;
  const visibleItems = compact ? items.slice(0, 4) : usePagination ? items.slice(page, page + 1) : items;

  useEffect(() => {
    if (page >= items.length && items.length > 0) {
      setPage(Math.max(0, items.length - 1));
    }
  }, [items.length, page]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          title={t("즐겨찾기 공고", "Saved Job Postings")}
          description={
            compact
              ? t("Job Matching에서 저장한 공고입니다.", "Postings you saved from Job Matching.")
              : t("저장한 공고를 열거나 삭제할 수 있습니다.", "Open saved postings or remove ones you no longer need.")
          }
        />
        {showManageLink && items.length > 0 ? (
          <Link href="/settings" className="secondary-btn w-fit px-3 py-1.5 text-xs">
            {t("설정에서 관리", "Manage in Settings")}
          </Link>
        ) : null}
      </div>

      {loading ? <Notice className="mt-4">{t("불러오는 중...", "Loading...")}</Notice> : null}
      {!loading && error ? <Notice className="mt-4" tone="warning">{error}</Notice> : null}
      {!loading && !error && visibleItems.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          {t("아직 등록된 공고가 없습니다.", "No saved postings yet.")}
        </p>
      ) : null}

      {!loading && !error && visibleItems.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {visibleItems.map((item) => (
            <div key={item.id} className="content-card p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="ko-friendly text-sm font-semibold text-[var(--foreground)]">{item.job_title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.company}
                    {item.location ? ` · ${item.location}` : ""}
                    {typeof item.fit_score === "number" ? ` · ${item.fit_score}% match` : ""}
                  </p>
                  {item.summary ? <p className="ko-friendly mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted-strong)]">{item.summary}</p> : null}
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    {new Date(item.saved_at).toLocaleString(isEn ? "en-US" : "ko-KR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => window.open(item.job_url, "_blank", "noopener,noreferrer")}
                    className="secondary-btn px-2.5 py-1.5 text-xs"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    {t("공고 보기", "View posting")}
                  </button>
                  {!compact ? (
                    <button
                      type="button"
                      onClick={() => void removeFavorite(item.id)}
                      disabled={deletingId === item.id}
                      className="danger-btn px-2.5 py-1.5 text-xs disabled:opacity-60"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {deletingId === item.id ? t("삭제 중...", "Deleting...") : t("삭제", "Delete")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {usePagination ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="secondary-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            {t("이전", "Prev")}
          </button>
          <span className="text-xs text-[var(--muted)]">
            {page + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(items.length - 1, current + 1))}
            disabled={page >= items.length - 1}
            className="secondary-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {t("다음", "Next")}
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {compact && items.length > 4 ? (
        <Link href="/settings" className="secondary-btn mt-3 inline-flex px-3 py-1.5 text-xs">
          <Star size={14} aria-hidden="true" />
          {t(`즐겨찾기 ${items.length}건 전체 보기`, `View all ${items.length} favorites`)}
        </Link>
      ) : null}
    </div>
  );
}
