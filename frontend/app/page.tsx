"use client";

import { useState } from "react";
import { ResumeDrop } from "@/components/ResumeDrop";
import { RunConsole } from "@/components/RunConsole";
import { Results } from "@/components/Results";
import { tailorResume, type TailorResponse } from "@/lib/api";

type Phase =
  | { kind: "input" }
  | { kind: "running" }
  | { kind: "done"; data: TailorResponse }
  | { kind: "error"; message: string };

export default function Home() {
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "input" });

  const canRun = !!resumeId && jd.trim().length > 40 && phase.kind !== "running";

  async function run() {
    if (!resumeId) return;
    setPhase({ kind: "running" });
    try {
      const data = await tailorResume(resumeId, jd);
      setPhase({ kind: "done", data });
    } catch (e) {
      setPhase({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:pt-14">
      <Header />

      {/* Input panel */}
      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <Panel step="01" title="resume" hint="PDF · indexed to a vector store">
          <ResumeDrop onReady={setResumeId} resumeId={resumeId} />
        </Panel>

        <Panel step="02" title="job description" hint="paste the role you're targeting">
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here — requirements, must-haves, nice-to-haves…"
            spellCheck={false}
            className="h-[168px] w-full resize-none rounded-xl border border-border bg-surface-2/60 p-4 text-sm leading-relaxed text-fg placeholder:text-faint focus:border-accent/50 focus:outline-none"
          />
          <p className="mono mt-2 text-right text-xs text-faint">
            {jd.trim().length} chars
          </p>
        </Panel>
      </section>

      {/* Run bar */}
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="mono text-xs text-faint">
          {!resumeId
            ? "› upload a resume to begin"
            : jd.trim().length <= 40
              ? "› paste a job description"
              : "› ready to tailor"}
        </p>
        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg transition-all hover:bg-accent-dim disabled:cursor-not-allowed disabled:bg-surface disabled:text-faint sm:w-auto"
        >
          {phase.kind === "running" ? "tailoring…" : "Tailor my resume"}
          {phase.kind !== "running" && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-enabled:group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Output */}
      <div className="mt-8">
        {phase.kind === "running" && <RunConsole done={false} />}
        {phase.kind === "error" && (
          <div className="rounded-xl border border-missing/30 bg-missing/[0.07] p-5 rise" role="alert">
            <p className="mono text-sm text-missing">run failed</p>
            <p className="mt-1 text-sm text-muted">{phase.message}</p>
            <p className="mono mt-2 text-xs text-faint">
              is the backend running on localhost:8000?
            </p>
          </div>
        )}
        {phase.kind === "done" && <Results data={phase.data} />}
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mono flex items-center text-xl font-semibold sm:text-2xl">
          <span className="text-faint">~/</span>
          <span className="text-fg">career-copilot</span>
          <span className="cursor" aria-hidden />
        </div>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          An agentic resume tailor. It parses the job, retrieves evidence from
          your resume, drafts grounded bullets, then{" "}
          <span className="text-fg">critiques and revises its own output</span>{" "}
          before showing you a gap report.
        </p>
        <div className="mono mt-3 flex flex-wrap gap-2 text-[11px]">
          {["LangGraph", "RAG · pgvector", "Claude Opus 4.8", "LangSmith"].map((t) => (
            <span key={t} className="rounded-full border border-border bg-surface/60 px-2.5 py-1 text-muted">
              {t}
            </span>
          ))}
        </div>
      </div>
      <a
        href="https://github.com/davidcjw/career-copilot"
        target="_blank"
        rel="noreferrer"
        className="mono inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted transition-colors hover:border-faint hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49l-.01-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
        </svg>
        source
      </a>
    </header>
  );
}

function Panel({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-5">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="mono text-xs text-accent">{step}</span>
        <span className="mono text-sm text-fg">{title}</span>
        <span className="ml-auto hidden text-xs text-faint sm:block">{hint}</span>
      </div>
      {children}
    </div>
  );
}
