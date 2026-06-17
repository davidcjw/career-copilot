"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ingestResume } from "@/lib/api";

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "done"; name: string; chunks: number }
  | { kind: "error"; message: string };

export function ResumeDrop({
  onReady,
  resumeId,
}: {
  onReady: (resumeId: string) => void;
  resumeId: string | null;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setStatus({ kind: "error", message: "Please upload a PDF resume." });
      return;
    }
    setStatus({ kind: "uploading" });
    try {
      const res = await ingestResume(file);
      setStatus({ kind: "done", name: file.name, chunks: res.chunk_count });
      onReady(res.resume_id);
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  }

  const ready = resumeId && status.kind === "done";

  return (
    <div>
      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border px-6 py-10 text-center transition-colors duration-200 ${
          dragging
            ? "border-accent bg-accent-wash"
            : ready
              ? "border-strong/40 bg-strong/[0.05]"
              : "border-line-strong border-dashed bg-paper hover:border-accent/50"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={status.kind === "done" ? "done" : status.kind === "uploading" ? "up" : "idle"}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
          >
            {status.kind === "uploading" ? (
              <Spinner />
            ) : ready ? (
              <FileCheckIcon />
            ) : (
              <UploadIcon dragging={dragging} />
            )}
          </motion.div>
        </AnimatePresence>

        {ready ? (
          <div>
            <p className="font-medium text-strong">{status.name}</p>
            <p className="mono mt-1 text-xs text-faint">
              {status.chunks} chunks indexed · click to replace
            </p>
          </div>
        ) : status.kind === "uploading" ? (
          <p className="mono text-sm text-ink-soft">embedding resume…</p>
        ) : (
          <div>
            <p className="text-[15px] text-ink">
              Drop your resume PDF{" "}
              <span className="text-ink-soft">or click to browse</span>
            </p>
            <p className="mono mt-1.5 text-xs text-faint">parsed · chunked · embedded</p>
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {status.kind === "error" && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mono mt-2 text-xs text-missing"
            role="alert"
          >
            {status.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadIcon({ dragging }: { dragging: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      className={`h-8 w-8 transition-colors ${dragging ? "text-accent" : "text-faint group-hover:text-accent"}`} aria-hidden>
      <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
    </svg>
  );
}

function FileCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-strong" aria-hidden>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" strokeLinejoin="round" />
      <path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="m9 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 animate-spin text-accent" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-20" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
