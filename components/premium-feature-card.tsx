"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type PremiumFeatureCardProps = {
  href: string;
  title: string;
  description: string;
  badge: "New" | "Premium";
  cta: string;
  icon: LucideIcon;
};

export function PremiumFeatureCard({ href, title, description, badge, cta, icon: Icon }: PremiumFeatureCardProps) {
  return (
    <article className="content-card clickable-card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_28%,transparent),color-mix(in_srgb,var(--accent-2)_16%,transparent))] text-[var(--foreground)]">
          <Icon size={20} aria-hidden="true" />
        </span>
        <span className="accent-pill px-3 py-1 text-xs font-semibold">{badge}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
      <Link href={href} className="primary-btn mt-5 px-4 py-2 text-sm">
        {cta}
      </Link>
    </article>
  );
}
