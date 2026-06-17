"use client";

import { useRef, useState } from "react";
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
        className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-9 text-center transition-colors duration-200 ${
          dragging
            ? "border-accent bg-accent/5"
            : ready
              ? "border-accent/40 bg-accent/[0.03]"
              : "border-border bg-surface/40 hover:border-faint hover:bg-surface"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {status.kind === "uploading" ? (
          <Spinner />
        ) : ready ? (
          <FileCheckIcon />
        ) : (
          <UploadIcon dragging={dragging} />
        )}

        {ready ? (
          <div>
            <p className="mono text-sm text-accent">{status.name}</p>
            <p className="mt-1 text-xs text-muted">
              {status.chunks} chunks indexed · click to replace
            </p>
          </div>
        ) : status.kind === "uploading" ? (
          <p className="mono text-sm text-muted">embedding resume…</p>
        ) : (
          <div>
            <p className="text-sm text-fg">
              Drop your resume PDF{" "}
              <span className="text-muted">or click to browse</span>
            </p>
            <p className="mono mt-1 text-xs text-faint">parsed · chunked · embedded</p>
          </div>
        )}
      </button>

      {status.kind === "error" && (
        <p className="mono mt-2 text-xs text-missing" role="alert">
          {status.message}
        </p>
      )}
    </div>
  );
}

function UploadIcon({ dragging }: { dragging: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`h-7 w-7 transition-colors ${dragging ? "text-accent" : "text-faint group-hover:text-muted"}`}
      aria-hidden
    >
      <path d="M12 16V4m0 0L7 9m5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
    </svg>
  );
}

function FileCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-accent" aria-hidden>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" strokeLinejoin="round" />
      <path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
      <path d="m9 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 animate-spin text-accent" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-20" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
