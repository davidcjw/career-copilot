"use client";

import { useEffect, useState } from "react";

// Mirrors the real LangGraph node sequence so the progress reflects the pipeline.
const STEPS = [
  { node: "parse_jd", label: "Parsing job description into requirements" },
  { node: "retrieve_evidence", label: "Retrieving evidence from your resume" },
  { node: "gap_analysis", label: "Scoring requirement coverage" },
  { node: "draft", label: "Drafting tailored bullets" },
  { node: "critic", label: "Self-reviewing for groundedness" },
  { node: "revise", label: "Revising to address the critique" },
  { node: "assemble", label: "Finalizing" },
];

/** Drives a staged display while the (untraceable from here) request runs.
 *  `done` flips every step to complete when the real response lands. */
export function RunConsole({ done }: { done: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (done) return;
    // Advance through all but the last step; hold the last as "running"
    // until the real response arrives.
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, STEPS.length - 1));
    }, 3200);
    return () => clearInterval(id);
  }, [done]);

  return (
    <div className="rounded-xl border border-border bg-surface-2/70 p-5 rise">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent pulse-dot" />
        <span className="mono text-xs tracking-wide text-accent">
          agent running
        </span>
        <span className="mono ml-auto text-xs text-faint">langgraph · claude</span>
      </div>

      <ol className="space-y-1.5">
        {STEPS.map((step, i) => {
          const state =
            done || i < active ? "done" : i === active ? "running" : "pending";
          return (
            <li
              key={step.node}
              className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors ${
                state === "running" ? "bg-accent/[0.06]" : ""
              }`}
            >
              <Glyph state={state} />
              <span className="mono text-xs text-faint w-36 shrink-0">
                {step.node}
              </span>
              <span
                className={
                  state === "pending"
                    ? "text-faint"
                    : state === "running"
                      ? "text-fg"
                      : "text-muted"
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Glyph({ state }: { state: "done" | "running" | "pending" }) {
  if (state === "done")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (state === "running")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" fill="none" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    );
  return <span className="h-4 w-4 shrink-0 rounded-full border border-border" />;
}
