// Thin client for the FastAPI backend.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type IngestResponse = { resume_id: string; chunk_count: number };

export type GapStatus = "strong" | "weak" | "missing";
export type GapItem = { requirement: string; status: GapStatus; note?: string };

export type TailorResponse = {
  tailored_bullets: string[];
  gaps: GapItem[];
  summary: string;
  revisions: number;
};

async function asError(res: Response): Promise<never> {
  let detail = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body?.detail) detail = body.detail;
  } catch {
    /* non-JSON error body */
  }
  throw new Error(detail);
}

export async function ingestResume(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/ingest`, { method: "POST", body: form });
  if (!res.ok) await asError(res);
  return res.json();
}

export async function tailorResume(
  resumeId: string,
  jobDescription: string,
): Promise<TailorResponse> {
  const res = await fetch(`${API_BASE}/tailor`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      resume_id: resumeId,
      job_description: jobDescription,
    }),
  });
  if (!res.ok) await asError(res);
  return res.json();
}
