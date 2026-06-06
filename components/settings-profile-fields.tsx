"use client";

import { memo } from "react";
import { parsePortfolioLinks, serializePortfolioLinks } from "@/lib/portfolio-links";

const MAX_PORTFOLIO_LINKS = 6;

export function FormSection({ title }: { title: string }) {
  return (
    <div className="md:col-span-2 border-t border-[var(--line)] pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{title}</p>
    </div>
  );
}

export const SegmentSelectField = memo(function SegmentSelectField({
  label,
  name,
  value,
  options,
  onChange,
  error,
  required,
}: {
  label: string;
  name: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="block">
      <span className="form-label">
        {label}
        {required ? <span className="ml-0.5 text-[var(--warning)]" aria-hidden="true">*</span> : null}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        aria-invalid={Boolean(error)}
        data-field={name}
        className={`segment-select mt-1${error ? " segment-select--error" : ""}`}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              name={name}
              aria-checked={active}
              className={`segment-select__option${active ? " segment-select__option--active" : ""}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <span className="mt-1 block text-xs text-[var(--warning)]">{error}</span> : null}
    </div>
  );
});

export const PortfolioLinksField = memo(function PortfolioLinksField({
  label,
  hint,
  addLabel,
  removeLabel,
  placeholder,
  value,
  error,
  onChange,
}: {
  label: string;
  hint: string;
  addLabel: string;
  removeLabel: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const links = parsePortfolioLinks(value);
  const rows = links.length > 0 ? links : [""];

  const syncLinks = (next: string[]) => {
    onChange(serializePortfolioLinks(next));
  };

  const updateLink = (index: number, nextValue: string) => {
    const next = [...rows];
    next[index] = nextValue;
    syncLinks(next);
  };

  const addLink = () => {
    if (rows.length >= MAX_PORTFOLIO_LINKS) return;
    syncLinks([...rows, ""]);
  };

  const removeLink = (index: number) => {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    syncLinks(next.length ? next : [""]);
  };

  return (
    <div className="md:col-span-2">
      <span className="form-label">{label}</span>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      <div className="mt-3 grid gap-2">
        {rows.map((link, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="url"
              name={`settings-portfolio_url-${index}`}
              value={link}
              onChange={(event) => updateLink(index, event.target.value)}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              className={`field flex-1${error ? " border-[var(--warning)]" : ""}`}
            />
            {rows.length > 1 ? (
              <button type="button" onClick={() => removeLink(index)} className="secondary-btn shrink-0 px-3 py-2 text-sm">
                {removeLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {rows.length < MAX_PORTFOLIO_LINKS ? (
        <button type="button" onClick={addLink} className="secondary-btn mt-3 px-3 py-2 text-sm">
          {addLabel}
        </button>
      ) : null}
      {error ? <span className="mt-1 block text-xs text-[var(--warning)]">{error}</span> : null}
    </div>
  );
});
