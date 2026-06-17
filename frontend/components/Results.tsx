"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion } from "framer-motion";
import { fadeUp, springCard, stagger } from "@/lib/motion";
import type { GapStatus, TailorResponse } from "@/lib/api";

const STATUS_META: Record<GapStatus, { label: string; dot: string; text: string; ring: string }> = {
  strong: { label: "strong", dot: "bg-strong", text: "text-strong", ring: "border-strong/25 bg-strong/[0.06]" },
  weak: { label: "weak", dot: "bg-weak", text: "text-weak", ring: "border-weak/30 bg-weak/[0.07]" },
  missing: { label: "missing", dot: "bg-missing", text: "text-missing", ring: "border-missing/30 bg-missing/[0.06]" },
};

export function Results({ data }: { data: TailorResponse }) {
  const counts = data.gaps.reduce(
    (acc, g) => ({ ...acc, [g.status]: (acc[g.status] ?? 0) + 1 }),
    {} as Record<GapStatus, number>,
  );

  return (
    <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="space-y-6">
      {/* Fit summary */}
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl border border-line bg-paper p-7 shadow-[0_30px_70px_-40px_rgba(29,27,22,0.4)]"
      >
        <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent-wash blur-2xl" aria-hidden />
        <div className="relative mb-4 flex flex-wrap items-center gap-3">
          <h2 className="mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Fit summary
          </h2>
          <RevisionBadge revisions={data.revisions} />
          <div className="mono ml-auto flex items-center gap-3 text-xs">
            <Count n={counts.strong ?? 0} className="text-strong" label="strong" />
            <Count n={counts.weak ?? 0} className="text-weak" label="weak" />
            <Count n={counts.missing ?? 0} className="text-missing" label="missing" />
          </div>
        </div>
        <p className="display relative max-w-3xl text-2xl text-ink sm:text-[28px]">
          {data.summary}
        </p>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tailored bullets */}
        <motion.section variants={fadeUp} className="rounded-3xl border border-line bg-paper p-7 lg:col-span-3">
          <h2 className="mono mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Tailored bullets
          </h2>
          <motion.ul variants={stagger(0.06)} className="space-y-1">
            {data.tailored_bullets.map((b, i) => (
              <Bullet key={i} text={b} index={i} />
            ))}
          </motion.ul>
        </motion.section>

        {/* Gap report */}
        <motion.section variants={fadeUp} className="rounded-3xl border border-line bg-paper p-7 lg:col-span-2">
          <h2 className="mono mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Gap report
          </h2>
          <motion.ul variants={stagger(0.05)} className="space-y-2">
            {data.gaps.map((g, i) => {
              const meta = STATUS_META[g.status];
              return (
                <motion.li
                  key={i}
                  variants={fadeUp}
                  whileHover={{ x: 2 }}
                  className={`rounded-2xl border px-4 py-3 ${meta.ring}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{g.requirement}</p>
                      {g.note && <p className="mt-0.5 text-xs leading-snug text-ink-soft">{g.note}</p>}
                    </div>
                    <span className={`mono ml-auto shrink-0 text-[11px] font-medium ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.section>
      </div>
    </motion.div>
  );
}

function RevisionBadge({ revisions }: { revisions: number }) {
  const clean = revisions === 0;
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springCard}
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-wash px-3 py-1 text-xs font-medium text-accent-deep"
    >
      <SparkIcon />
      {clean ? "clean first pass" : <>self-corrected <CountUp to={revisions} />×</>}
    </motion.span>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 0.7,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [to]);
  return <span className="mono tabular-nums">{n}</span>;
}

function Bullet({ text, index }: { text: string; index: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.li
      variants={fadeUp}
      className="group flex items-start gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-colors hover:border-line hover:bg-bg-deep/40"
    >
      <span className="display mt-0.5 select-none text-lg leading-none text-accent/70">
        {String(index + 1).padStart(2, "0")}
      </span>
      <p className="flex-1 text-[15px] leading-relaxed text-ink">{text}</p>
      <button
        type="button"
        aria-label="Copy bullet"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-faint opacity-0 transition-all hover:bg-accent-wash hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-strong" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
        )}
      </button>
    </motion.li>
  );
}

function Count({ n, className, label }: { n: number; className: string; label: string }) {
  return (
    <span className={className} title={`${n} ${label}`}>
      <span className="tabular-nums">{n}</span>
      <span className="ml-1 text-faint">{label}</span>
    </span>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8m-5.4 5.4-2.8 2.8m11 0-2.8-2.8M8.3 8.3 5.5 5.5" strokeLinecap="round" />
    </svg>
  );
}
