# Career Co-pilot — Design Document

> An agentic resume-tailoring and gap-analysis tool for job seekers, built to
> showcase production AI-engineering: LangGraph, LangChain, a vector store, a
> grounded RAG pipeline, and end-to-end agent observability with LangSmith.

**Status:** Draft v1 · **Owner:** David Chong · **Last updated:** 2026-06-17

---

## 1. Why this project

Most AI portfolios stop at a single-shot RAG chatbot. This project deliberately
requires a *cyclic, self-correcting agent*, which is what separates real
LangGraph competence from a linear LangChain demo. It also solves a problem the
author has first-hand (mid-career transition), which makes for a far stronger
interview narrative than a toy weather agent — and it can grow into an
audience/income product for other laid-off job seekers.

### Success criteria (how we know it's done)

- A user can upload a resume (PDF) and paste a job description, and receive
  (a) tailored resume bullets grounded in their *actual* experience and
  (b) a structured gap report.
- The tailoring output never fabricates experience the resume doesn't support
  — verified by an eval that flags hallucinated claims.
- Every agent run is fully traced in LangSmith: per-node spans, token cost,
  latency, and the revision loop is visible.
- An eval suite (LLM-as-judge) scores tailoring quality on a fixed dataset and
  runs in CI.
- `langgraph dev` runs the graph locally; the Next.js frontend drives it.

### Explicit non-goals (v1)

- No auth / user accounts / multi-resume management (v2).
- No job-board scraping at scale (single URL fetch is optional, see §6).
- No automated job applications or outreach.
- No fine-tuning — prompt + RAG only.

---

## 2. Architecture overview

```
career-copilot/
├── backend/                      # Python 3.12, FastAPI
│   ├── graph/                    # LangGraph state machine — the showpiece
│   │   ├── state.py              # CopilotState TypedDict
│   │   ├── nodes.py              # node functions (one per step)
│   │   ├── prompts.py            # versioned prompt templates
│   │   └── build.py              # graph wiring + conditional edges
│   ├── rag/
│   │   ├── ingest.py             # load → chunk → embed → upsert (pgvector)
│   │   ├── retriever.py          # similarity search wrapper
│   │   └── embeddings.py         # Voyage (default) | local bge fallback
│   ├── api/
│   │   ├── main.py               # FastAPI app + CORS + LangSmith env
│   │   ├── routes.py             # /ingest, /tailor, /gap-report, /health
│   │   └── schemas.py            # Pydantic request/response models
│   ├── eval/
│   │   ├── dataset.py            # LangSmith dataset seed
│   │   ├── judges.py             # LLM-as-judge evaluators
│   │   └── run_eval.py           # CLI entrypoint for evals
│   ├── settings.py               # pydantic-settings; reads .env
│   ├── pyproject.toml
│   └── tests/
├── frontend/                     # Next.js 16 + Tailwind v4
│   ├── app/                      # upload resume, paste JD, view results
│   └── ...
├── docker-compose.yml            # local pgvector (Supabase Postgres image)
├── .env.example
├── README.md
├── AGENTS.md
└── DESIGN.md                     # this file
```

**Request flow (happy path):**

```
1. POST /ingest   → resume PDF parsed, chunked, embedded, upserted to pgvector
2. POST /tailor   → LangGraph run executes (see §3), returns tailored bullets
                    + gap report + a LangSmith trace URL
3. Frontend renders side-by-side original vs tailored + the gap report
```

---

## 3. The LangGraph agent (core)

This is the part reviewers will scrutinize, so the cyclic, self-correcting
design is intentional.

### 3.1 State

```python
class CopilotState(TypedDict):
    # inputs
    job_description: str
    resume_id: str                      # points to ingested resume in pgvector
    # working memory
    jd_requirements: list[Requirement]  # parsed, structured
    evidence: list[EvidenceChunk]       # retrieved resume bullets per requirement
    gaps: list[Gap]                     # requirements with weak/no evidence
    draft_bullets: list[str]
    critique: Critique | None           # critic node output
    revision_count: int                 # guards the loop
    # outputs
    tailored_bullets: list[str]
    gap_report: GapReport
    trace_url: str | None
```

### 3.2 Nodes

| Node | Job | Model |
|---|---|---|
| `parse_jd` | Extract structured requirements (skills, seniority, must-haves) from raw JD | Haiku 4.5 (cheap, structured) |
| `retrieve_evidence` | For each requirement, similarity-search the resume corpus in pgvector | — (retrieval only) |
| `gap_analysis` | Classify each requirement as *strong / weak / missing* evidence | Haiku 4.5 |
| `draft` | Write tailored bullets grounded **only** in retrieved evidence | Opus 4.8 |
| `critic` | Score the draft for (a) groundedness/no-fabrication, (b) JD relevance, (c) impact phrasing. Emits a score + actionable notes | Opus 4.8 |
| `revise` | Rewrite bullets addressing the critic's notes | Opus 4.8 |
| `assemble` | Build the final `GapReport` + package outputs | Haiku 4.5 |

### 3.3 Topology

```
START
  → parse_jd
  → retrieve_evidence
  → gap_analysis
  → draft
  → critic
  → [conditional edge]
        if critique.score >= THRESHOLD  → assemble → END
        if revision_count >= MAX_REVISIONS (=2) → assemble → END   # safety valve
        else → revise → critic            # the self-correction loop
```

The `critic → revise → critic` cycle with a bounded counter is the
distinguishing feature. The safety valve prevents infinite loops and is itself
a talking point (cost/latency control).

### 3.4 Groundedness guarantee

`draft` and `revise` receive **only** the retrieved evidence chunks, never the
full resume, and the system prompt forbids introducing claims absent from
evidence. The `critic` independently re-checks each bullet against the evidence
set and fails any unsupported claim. This two-layer defense is what we eval
in §5.

---

## 4. RAG pipeline

| Concern | Decision | Rationale |
|---|---|---|
| **Vector store** | pgvector on Supabase (local: Postgres+pgvector via docker-compose) | Already in the author's stack; one fewer service than Qdrant |
| **Embeddings** | Voyage `voyage-3` (default) via `langchain-voyageai`; local `BAAI/bge-small-en-v1.5` fallback | Anthropic has **no** embeddings API; Voyage is Anthropic's recommended partner. Local fallback keeps dev free/offline |
| **Chunking** | Resume: split by bullet/role (semantic units), not fixed tokens. JD: kept whole, parsed by `parse_jd` | Resume bullets are the natural retrieval unit |
| **Indexed corpus** | (1) the user's resume chunks, (2) optional curated "strong-bullet" exemplars to inform phrasing | Exemplars improve `draft` quality without fabricating user facts |
| **Retrieval** | Per-requirement top-k similarity (k=4), metadata-filtered by `resume_id` | Keeps evidence scoped to the right user |

Dimension note: `voyage-3` = 1024 dims, `bge-small` = 384 dims. The pgvector
column dimension is provider-dependent, so the embedding provider is fixed per
deployment via `EMBEDDINGS_PROVIDER` and the table is created to match.

---

## 5. Observability & evaluation (LangSmith)

This is a first-class deliverable, not an afterthought — it's half the reason
the project exists.

**Tracing:** set `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_PROJECT=career-copilot`.
Every node becomes a span automatically. We additionally tag runs with
`resume_id` and log `revision_count` as run metadata so the loop is visible and
filterable in the dashboard.

**What we capture:** per-node latency, token in/out and $ cost, the critic
score per revision, and the final groundedness verdict.

**Eval suite (`backend/eval/`):**

| Evaluator | Type | Checks |
|---|---|---|
| `groundedness` | LLM-as-judge (Opus) | Every tailored bullet is supported by the evidence set — no fabricated experience |
| `jd_relevance` | LLM-as-judge | Bullets actually address the JD's must-have requirements |
| `gap_recall` | Heuristic + judge | Requirements with no resume evidence appear in the gap report |
| `no_regression` | Reference-based | Score on the seed dataset doesn't drop below a baseline |

`run_eval.py` executes against a versioned LangSmith dataset (seeded from
`dataset.py` with 8–12 anonymized resume/JD pairs) and fails CI on regression.
Screenshots of these traces/evals go in the README — they *are* the portfolio
artifact.

---

## 6. API surface

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/health` | GET | — | `{status, version}` |
| `/ingest` | POST | resume PDF (multipart) | `{resume_id, chunk_count}` |
| `/tailor` | POST | `{resume_id, job_description}` | `{tailored_bullets, gap_report, trace_url}` |
| `/gap-report` | POST | `{resume_id, job_description}` | `{gap_report, trace_url}` (gap-only, skips draft loop) |

**Optional (flagged, v1.1):** `/ingest-jd-url` adds a `fetch_jd` tool-node that
pulls a JD from a URL. Behind `ENABLE_URL_FETCH` because it's brittle; including
it strengthens the "agent uses tools" story but isn't required for v1.

---

## 7. Tech stack & key dependencies

- **Backend:** Python 3.12, FastAPI, `langgraph`, `langchain`,
  `langchain-anthropic`, `langchain-voyageai`, `langchain-postgres` (pgvector),
  `pydantic-settings`, `pypdf`.
- **Models:** Claude Opus 4.8 (`claude-opus-4-8`) for draft/critic/revise;
  Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for parse/classify/assemble.
  *(Confirm IDs against the `claude-api` reference at implementation time.)*
- **Embeddings:** Voyage `voyage-3` (prod) / `bge-small-en-v1.5` (local).
- **Vector store:** pgvector (Supabase / local Postgres).
- **Observability:** LangSmith.
- **Frontend:** Next.js 16, Tailwind v4 (per house style; use `/ui-ux-pro-max`
  + `/frontend-design` when building it).

---

## 8. Configuration (`.env.example`)

```
# LLM
ANTHROPIC_API_KEY=
DRAFT_MODEL=claude-opus-4-8
FAST_MODEL=claude-haiku-4-5-20251001

# Embeddings
EMBEDDINGS_PROVIDER=voyage        # voyage | local
VOYAGE_API_KEY=

# Vector store
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/career_copilot

# Observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=
LANGCHAIN_PROJECT=career-copilot

# Agent tuning
CRITIC_SCORE_THRESHOLD=0.8
MAX_REVISIONS=2
ENABLE_URL_FETCH=false
```

---

## 9. Build plan (incremental, each step verifiable)

1. **Skeleton + infra** — repo scaffold, `docker-compose` pgvector, `.env`,
   `/health` endpoint green. *Verify:* `curl /health`.
2. **RAG ingest** — `/ingest` parses a PDF, chunks, embeds, upserts. *Verify:*
   row count in pgvector; retriever returns sane chunks for a query.
3. **Graph v0 (linear)** — `parse_jd → retrieve → gap_analysis → draft →
   assemble`, no loop yet. *Verify:* `langgraph dev`, traces appear in LangSmith.
4. **Critic loop** — add `critic` + conditional edge + `revise` + counter.
   *Verify:* trace shows ≥1 revision on a deliberately weak draft.
5. **Eval suite** — seed dataset, groundedness + relevance judges, `run_eval.py`.
   *Verify:* eval runs, baseline score recorded.
6. **Frontend** — upload + paste + results view. *Verify:* end-to-end in browser.
7. **Polish** — README with trace/eval screenshots, AGENTS.md, deploy notes.

Tests and the eval suite gate "done" at each step.

---

## 10. Open questions / risks

- **JD input:** PDF-only resume confirmed; JD as pasted text for v1, URL fetch
  deferred behind a flag. *(Confirm at build time.)*
- **Embedding provider lock-in:** dimension differs per provider, so switching
  providers requires a re-index. Acceptable for a portfolio project; documented.
- **Cost:** the critic loop runs Opus up to 3× per request. `MAX_REVISIONS` and
  the Haiku-for-cheap-nodes split keep this bounded; surfaced in LangSmith cost
  metrics (which is itself a feature to show off).
- **Exemplar corpus licensing:** "strong-bullet" exemplars must be original or
  permissively licensed to avoid copying real resumes.
```
