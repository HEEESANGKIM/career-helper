"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BriefcaseBusiness, FileText, GitBranch, SearchCheck } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const previewMetrics = [
  {
    icon: FileText,
    labelKo: "Resume Lab",
    labelEn: "Resume Lab",
    value: "86",
    bar: 86,
    href: "/cover-letter",
  },
  {
    icon: BriefcaseBusiness,
    labelKo: "Hiring Simulator",
    labelEn: "Hiring Simulator",
    value: "76",
    bar: 76,
    href: "/hiring-simulator",
  },
  {
    icon: GitBranch,
    labelKo: "Next Move",
    labelEn: "Next Move",
    value: "A",
    bar: 84,
    href: "/next-move",
  },
  {
    icon: SearchCheck,
    labelKo: "Job Match",
    labelEn: "Job Match",
    value: "12",
    bar: 72,
    href: "/matching",
  },
];

export function DashboardPreview() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <motion.div
      className="premium-preview relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--surface-strong)_92%,transparent),color-mix(in_srgb,var(--surface)_84%,transparent))] p-4 shadow-[var(--shadow)] backdrop-blur-2xl sm:p-5"
      initial={{ opacity: 0, y: 26, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-2),transparent)]" />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="page-kicker">PathMate Cockpit</p>
          <h3 className="ko-friendly mt-2 text-xl font-semibold text-[var(--foreground)]">
            {isEn ? "AI readiness" : "AI 준비도"}
          </h3>
        </div>
        <motion.span
          className="accent-pill shrink-0 px-3 py-1 text-xs font-semibold"
          animate={{ opacity: [0.72, 1, 0.72] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {isEn ? "Live AI" : "실시간 AI"}
        </motion.span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {previewMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.labelEn}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 + index * 0.08 }}
            >
              <Link href={metric.href} className="content-card clickable-card block min-h-[142px] p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="text-2xl font-semibold leading-none text-[var(--foreground)]">{metric.value}</span>
                </div>
                <p className="ko-friendly mt-4 text-sm font-semibold text-[var(--foreground)]">{isEn ? metric.labelEn : metric.labelKo}</p>
                <div className="signal-bar mt-3">
                  <motion.div
                    className="signal-fill"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${metric.bar}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.85, delay: 0.25 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] p-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
          <span>{isEn ? "Next action" : "다음 액션"}</span>
          <span>{isEn ? "3 min" : "3분"}</span>
        </div>
        <p className="ko-friendly mt-2 text-sm leading-6 text-[var(--muted-strong)]">
          {isEn ? "Run Hiring Simulator, then compare your Next Move." : "Hiring Simulator를 실행한 뒤 Next Move에서 다음 선택지를 비교하세요."}
        </p>
      </div>
    </motion.div>
  );
}
