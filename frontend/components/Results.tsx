"use client";

import { useState } from "react";
import type { GapStatus, TailorResponse } from "@/lib/api";

const STATUS_META: Record<
  GapStatus,
  { label: string; dot: string; text: string; ring: string }
> = {
  strong: { label: "strong", dot: "bg-strong", text: "text-strong", ring: "border-strong/30 bg-strong/[0.07]" },
  weak: { label: "weak", dot: "bg-weak", text: "text-weak", ring: "border-weak/30 bg-weak/[0.07]" },
  missing: { label: "missing", dot: "bg-missing", text: "text-missing", ring: "border-missing/30 bg-missing/[0.07]" },
};

export function Results({ data }: { data: TailorResponse }) {
  const counts = data.gaps.reduce(
    (acc, g) => ({ ...acc, [g.status]: (acc[g.status] ?? 0) + 1 }),
    {} as Record<GapStatus, number>,
  );

  return (
    <div className="space-y-6">
      {/* Fit summary */}
      <section className="rounded-xl border border-border bg-surface p-6 rise">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="mono text-sm tracking-wide text-accent">fit summary</h2>
          <span className="mono inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.08] px-2.5 py-1 text-xs text-accent">
            <SparkIcon />
            self-corrected {data.revisions}×
          </span>
          <div className="mono ml-auto flex items-center gap-3 text-xs">
            <Count n={counts.strong ?? 0} className="text-strong" label="strong" />
            <Count n={counts.weak ?? 0} className="text-weak" label="weak" />
            <Count n={counts.missing ?? 0} className="text-missing" label="missing" />
          </div>
        </div>
        <p className="text-[15px] leading-relaxed text-fg/90">{data.summary}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tailored bullets */}
        <section className="rounded-xl border border-border bg-surface p-6 lg:col-span-3 rise" style={{ animationDelay: "60ms" }}>
          <h2 className="mono mb-4 text-sm tracking-wide text-accent">
            tailored bullets
          </h2>
          <ul className="space-y-2.5">
            {data.tailored_bullets.map((b, i) => (
              <Bullet key={i} text={b} />
            ))}
          </ul>
        </section>

        {/* Gap report */}
        <section className="rounded-xl border border-border bg-surface p-6 lg:col-span-2 rise" style={{ animationDelay: "120ms" }}>
          <h2 className="mono mb-4 text-sm tracking-wide text-accent">
            gap report
          </h2>
          <ul className="space-y-2">
            {data.gaps.map((g, i) => {
              const meta = STATUS_META[g.status];
              return (
                <li key={i} className={`rounded-lg border px-3 py-2.5 ${meta.ring}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-fg">{g.requirement}</p>
                      {g.note && (
                        <p className="mt-0.5 text-xs leading-snug text-muted">{g.note}</p>
                      )}
                    </div>
                    <span className={`mono ml-auto shrink-0 text-[11px] ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-surface-2/60">
      <span className="mono mt-0.5 select-none text-accent">›</span>
      <p className="flex-1 text-[15px] leading-relaxed text-fg/90">{text}</p>
      <button
        type="button"
        aria-label="Copy bullet"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="shrink-0 cursor-pointer rounded-md p-1.5 text-faint opacity-0 transition-all hover:bg-surface-2 hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
        )}
      </button>
    </li>
  );
}

function Count({ n, className, label }: { n: number; className: string; label: string }) {
  return (
    <span className={className} title={`${n} ${label}`}>
      {n}
      <span className="ml-1 text-faint">{label}</span>
    </span>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8m-5.4 5.4-2.8 2.8m11 0-2.8-2.8M8.3 8.3 5.5 5.5" strokeLinecap="round" />
    </svg>
  );
}
