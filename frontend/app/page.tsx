"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResumeDrop } from "@/components/ResumeDrop";
import { RunConsole } from "@/components/RunConsole";
import { Results } from "@/components/Results";
import { fadeUp, stagger } from "@/lib/motion";
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
    <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-12 sm:pt-16">
      <Header />

      {/* Input */}
      <motion.section
        variants={stagger(0.09, 0.1)}
        initial="hidden"
        animate="show"
        className="mt-12 grid gap-5 md:grid-cols-2"
      >
        <Panel n="01" title="Your resume" hint="PDF · indexed to a vector store">
          <ResumeDrop onReady={setResumeId} resumeId={resumeId} />
        </Panel>

        <Panel n="02" title="The job" hint="paste the role you're targeting">
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description — requirements, must-haves, nice-to-haves…"
            spellCheck={false}
            className="h-[176px] w-full resize-none rounded-2xl border border-line-strong bg-paper p-4 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent/60 focus:outline-none"
          />
          <p className="mono mt-2 text-right text-xs text-faint">{jd.trim().length} chars</p>
        </Panel>
      </motion.section>

      {/* Run bar */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      >
        <p className="mono text-xs text-faint">
          {!resumeId
            ? "› upload a resume to begin"
            : jd.trim().length <= 40
              ? "› paste a job description"
              : "› ready to tailor"}
        </p>
        <motion.button
          type="button"
          onClick={run}
          disabled={!canRun}
          whileHover={canRun ? { y: -2 } : undefined}
          whileTap={canRun ? { scale: 0.98 } : undefined}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-paper shadow-[0_14px_30px_-10px_rgba(39,66,236,0.6)] transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-faint disabled:shadow-none sm:w-auto"
        >
          {phase.kind === "running" ? "tailoring…" : "Tailor my resume"}
          {phase.kind !== "running" && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-enabled:group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </motion.button>
      </motion.div>

      {/* Output */}
      <div className="mt-9">
        <AnimatePresence mode="wait">
          {phase.kind === "running" && (
            <motion.div key="run" exit={{ opacity: 0, y: -8 }}>
              <RunConsole done={false} />
            </motion.div>
          )}
          {phase.kind === "error" && (
            <motion.div
              key="err"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-missing/30 bg-missing/[0.06] p-6"
              role="alert"
            >
              <p className="mono text-sm font-medium text-missing">run failed</p>
              <p className="mt-1 text-sm text-ink-soft">{phase.message}</p>
              <p className="mono mt-2 text-xs text-faint">is the backend running on localhost:8000?</p>
            </motion.div>
          )}
          {phase.kind === "done" && (
            <motion.div key="done">
              <Results data={phase.data} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function Header() {
  return (
    <motion.header variants={stagger(0.08)} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <span className="mono text-xs font-medium tracking-[0.2em] text-ink-soft uppercase">
          Career Co-pilot
        </span>
        <a
          href="https://github.com/davidcjw/career-copilot"
          target="_blank"
          rel="noreferrer"
          className="mono inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper px-3.5 py-2 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49l-.01-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
          </svg>
          source
        </a>
      </motion.div>

      <motion.h1
        variants={fadeUp}
        className="display mt-8 max-w-3xl text-[44px] font-semibold text-ink sm:text-6xl"
      >
        Tailor your résumé to the job —{" "}
        <span className="text-accent" style={{ fontStyle: "italic" }}>
          then watch it critique itself.
        </span>
      </motion.h1>

      <motion.p variants={fadeUp} className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
        An agentic tailor that retrieves real evidence from your resume, drafts
        grounded bullets, and runs a self-correction loop before handing you a
        gap report — no invented experience.
      </motion.p>

      <motion.div variants={fadeUp} className="mono mt-6 flex flex-wrap gap-2 text-[11px]">
        {["LangGraph", "RAG · pgvector", "Claude Opus 4.8", "LangSmith"].map((t) => (
          <span key={t} className="rounded-full border border-line-strong bg-paper px-3 py-1.5 text-ink-soft">
            {t}
          </span>
        ))}
      </motion.div>
    </motion.header>
  );
}

function Panel({
  n,
  title,
  hint,
  children,
}: {
  n: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} className="rounded-3xl border border-line bg-bg-deep/40 p-5">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="display text-2xl font-semibold text-accent/80">{n}</span>
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <span className="mono ml-auto hidden text-xs text-faint sm:block">{hint}</span>
      </div>
      {children}
    </motion.div>
  );
}
