"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/motion";

// Mirrors the real LangGraph node sequence.
const STEPS = [
  { node: "parse_jd", label: "Parsing the job into requirements" },
  { node: "retrieve_evidence", label: "Retrieving evidence from your resume" },
  { node: "gap_analysis", label: "Scoring requirement coverage" },
  { node: "draft", label: "Drafting tailored bullets" },
  { node: "critic", label: "Self-reviewing for groundedness" },
  { node: "revise", label: "Revising to address the critique" },
  { node: "assemble", label: "Finalizing" },
];

export function RunConsole({ done }: { done: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (done) return;
    const id = setInterval(
      () => setActive((a) => Math.min(a + 1, STEPS.length - 1)),
      3200,
    );
    return () => clearInterval(id);
  }, [done]);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-3xl border border-line bg-paper p-7 shadow-[0_24px_60px_-30px_rgba(39,66,236,0.35)]"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-accent"
            animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <span className="mono text-xs font-medium tracking-wide text-accent">
          agent running
        </span>
        <span className="mono ml-auto text-xs text-faint">langgraph · claude</span>
      </div>

      <motion.ol variants={stagger(0.09)} initial="hidden" animate="show" className="relative space-y-1">
        {/* connective spine */}
        <span className="absolute left-[14px] top-3 bottom-3 w-px bg-line" aria-hidden />
        {STEPS.map((step, i) => {
          const state = done || i < active ? "done" : i === active ? "running" : "pending";
          return (
            <motion.li
              key={step.node}
              variants={fadeUp}
              className={`relative flex items-center gap-4 rounded-xl px-2 py-2 ${
                state === "running" ? "bg-accent-wash/60" : ""
              }`}
            >
              <Glyph state={state} />
              <span className="mono w-36 shrink-0 text-xs text-faint">{step.node}</span>
              <span
                className={
                  state === "pending"
                    ? "text-faint"
                    : state === "running"
                      ? "font-medium text-ink"
                      : "text-ink-soft"
                }
              >
                {step.label}
              </span>
            </motion.li>
          );
        })}
      </motion.ol>
    </motion.div>
  );
}

function Glyph({ state }: { state: "done" | "running" | "pending" }) {
  return (
    <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-paper"
      style={{
        borderColor:
          state === "pending" ? "var(--color-line-strong)" : "var(--color-accent)",
      }}>
      {state === "done" ? (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      ) : state === "running" ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" fill="none" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
      )}
    </span>
  );
}
