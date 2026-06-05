"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

type PageShellProps = {
  children: ReactNode;
  maxWidth?: string;
  center?: boolean;
};

export function PageShell({ children, maxWidth = "max-w-7xl", center = false }: PageShellProps) {
  if (center) {
    return (
      <main className="app-bg px-4 py-8 sm:px-6 lg:px-8">
        <div className={`mx-auto w-full ${maxWidth} flex min-h-[calc(100vh-9rem)] items-center justify-center`}>
          {children}
        </div>
      </main>
    );
  }

  return (
    <main className="app-bg px-4 py-7 sm:px-6 lg:px-8">
      <div className="cockpit-shell mx-auto w-full max-w-[1560px]">
        <div className="cockpit-rail-slot">
          <CockpitRail />
        </div>
        <div className={`min-w-0 ${maxWidth}`}>
          {children}
        </div>
      </div>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_22%,transparent),var(--surface)_42%,color-mix(in_srgb,var(--accent-2)_12%,transparent))] p-6 shadow-[var(--shadow)] backdrop-blur-2xl sm:p-7 lg:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--accent)_26%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--accent-2)_18%,transparent)] blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="page-kicker">
            {eyebrow}
          </p>
          <h1 className="gradient-title ko-friendly mt-5 max-w-5xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
          {description ? <p className="ko-friendly mt-4 max-w-4xl text-base leading-7 text-[var(--muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

export function PagePanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`surface-card border border-[var(--line)] p-5 shadow-[var(--shadow-soft)] sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-strong)] shadow-[0_0_18px_rgba(159,242,229,0.65)]" />
        <h2 className="ko-friendly text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">{title}</h2>
      </div>
      {description ? <p className="ko-friendly mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent)_14%,transparent),var(--surface))] p-5 shadow-[0_18px_46px_rgba(0,0,0,0.20)]">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted)]">{label}</p>
      <div className="ko-friendly mt-3 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl">{value}</div>
      {helper ? <p className="ko-friendly mt-3 text-sm leading-6 text-[var(--muted)]">{helper}</p> : null}
    </div>
  );
}

export function Notice({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-[color-mix(in_srgb,var(--success)_38%,var(--line))] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--foreground)]"
      : tone === "warning"
        ? "border-[color-mix(in_srgb,var(--warning)_42%,var(--line))] bg-[color-mix(in_srgb,var(--warning)_13%,transparent)] text-[var(--foreground)]"
        : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-strong)]";

  return <div className={`rounded-2xl border p-4 text-sm leading-6 backdrop-blur ${toneClass} ${className}`}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(124,156,255,0.35)] bg-[rgba(124,156,255,0.075)] p-5 text-sm leading-6 text-[var(--muted)]">
      <div className="mb-3 h-10 w-10 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.07)] shadow-inner" />
      {children}
    </div>
  );
}

const navSteps = [
  { labelKo: "대시보드", labelEn: "Dashboard", href: "/dashboard", icon: "00" },
  { labelKo: "이력서 랩", labelEn: "Resume Lab", href: "/cover-letter", icon: "01" },
  { labelKo: "채용 시뮬레이터", labelEn: "Hiring Simulator", href: "/hiring-simulator", icon: "02" },
  { labelKo: "넥스트 무브", labelEn: "Next Move", href: "/next-move", icon: "03" },
  { labelKo: "채용 매칭", labelEn: "Job Match", href: "/matching", icon: "04" },
  { labelKo: "설정", labelEn: "Settings", href: "/settings", icon: "05" },
];

function CockpitRail() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isKo = language === "ko";

  return (
    <aside className="cockpit-rail" aria-label="PathMate cockpit status">
      <div className="cockpit-rail-header">
        <p className="cockpit-rail-kicker">PathMate</p>
        <p className="cockpit-rail-title">
          {isKo ? (
            <>
              커리어
              <br />
              콕핏
            </>
          ) : (
            <>
              Career
              <br />
              Cockpit
            </>
          )}
        </p>
      </div>

      <nav className="cockpit-rail-nav" aria-label="Career workflow">
        {navSteps.map((step) => {
          const isActive =
            pathname === step.href ||
            pathname.startsWith(`${step.href}/`) ||
            (step.href === "/settings" && pathname.startsWith("/my-info")) ||
            (step.href === "/next-move" && pathname.startsWith("/career-chess"));
          return (
            <Link key={step.href} href={step.href} className={`cockpit-nav-item${isActive ? " cockpit-nav-item--active" : ""}`}>
              <span className="cockpit-nav-icon">{step.icon}</span>
              <span className="cockpit-nav-label">{isKo ? step.labelKo : step.labelEn}</span>
              {isActive && <span className="cockpit-nav-dot" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      <div className="cockpit-rail-signal">
        <span />
        <p>{isKo ? "준비도 신호 활성화" : "Readiness signal online"}</p>
      </div>
    </aside>
  );
}
