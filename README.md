# Career Co-pilot

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python](https://img.shields.io/badge/python-3.12%2B-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-agent-1c3c3c.svg)

An **agentic resume-tailoring and gap-analysis** tool. Point it at a job
description and your resume, and a self-correcting agent drafts tailored bullets
grounded in your *actual* experience — then critiques and revises its own output
before handing you a gap report. No invented experience.

Built as an AI-engineering showcase: a cyclic **LangGraph** agent, a **RAG**
pipeline over **pgvector**, an **LLM-as-judge** eval suite, and end-to-end
**LangSmith** observability. See [`DESIGN.md`](./DESIGN.md) for the full
architecture and rationale.

<p align="center">
  <img src="docs/demo.gif" alt="Career Co-pilot demo — upload a resume, paste a job description, watch the agent run, review tailored bullets and a gap report" width="760">
</p>

## Table of Contents

- [What it demonstrates](#what-it-demonstrates)
- [How it works](#how-it-works)
- [Stack](#stack)
- [Run it locally](#run-it-locally)
- [API](#api)
- [Eval suite](#eval-suite)
- [Embeddings provider](#embeddings-provider)
- [Tests](#tests)
- [Project layout](#project-layout)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
- [Roadmap](#roadmap)
- [Acknowledgements](#acknowledgements)

## What it demonstrates

- **A real agent, not a chain** — a cyclic LangGraph state machine with a
  bounded `critic → revise → critic` self-correction loop (conditional edges +
  a revision budget), not a one-shot prompt.
- **Grounded RAG** — tailored bullets are drafted only from evidence retrieved
  from your resume; an independent critic rejects any fabricated experience,
  metric, or skill.
- **Evaluation** — an LLM-as-judge suite scores groundedness, JD-relevance, and
  gap-recall over a seed dataset and uploads results as a LangSmith experiment.
- **Observability** — every run is fully traced: per-node spans, token cost, and
  the revision count are visible in LangSmith.
- **Pragmatic engineering** — model tiering (Opus for draft/critic, Haiku for
  cheap nodes), pluggable embeddings (local `bge` / Voyage), batched embedding
  calls to respect rate limits, and provider-aware vector collections.

## How it works

```
resume.pdf ──▶ chunk ──▶ embed ──▶ pgvector
                                      │ (evidence)
job description                       ▼
     │
     ▼
  parse_jd ─▶ retrieve_evidence ─▶ gap_analysis ─▶ draft ─▶ critic
                                                              │
              grounded & score ≥ threshold  ──▶ assemble ─▶ result
                                                              │
              else (and revisions < MAX_REVISIONS) ──▶ revise ┘   ⟲ loop
```

The `critic → revise → critic` cycle is the centerpiece: the critic scores the
draft for groundedness / relevance / impact and lists unsupported claims; the
router either accepts it, sends it back for revision, or stops at the
`MAX_REVISIONS` safety valve. The draft and revise nodes see **only** the
retrieved evidence, so they can't invent experience — and the critic
independently re-checks every bullet against that evidence.

## Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12+, FastAPI |
| Agent | LangGraph (`critic → revise` self-correction loop) |
| RAG | LangChain + pgvector |
| Embeddings | local `bge-small` (default) · Voyage `voyage-3` (`EMBEDDINGS_PROVIDER=voyage`) |
| LLM | Claude Opus 4.8 (draft/critic) + Haiku 4.5 (parse/classify) |
| Observability | LangSmith |
| Frontend | Next.js 16 + Tailwind v4 + framer-motion (light editorial theme) |

## Run it locally

**Prerequisites**

- Python 3.12+ and Node 20+
- A Postgres + pgvector database — **Supabase** (enable the `vector` extension,
  use the *Session pooler* URI on port 5432) or **local** (`docker-compose up -d`)
- `ANTHROPIC_API_KEY` (required). Optional: `LANGCHAIN_API_KEY` (tracing),
  `VOYAGE_API_KEY` (only if `EMBEDDINGS_PROVIDER=voyage`). The default local
  `bge` embeddings need no key.

**1 — Backend** (FastAPI on `:8000`)

```bash
cd backend
cp ../.env.example ../.env        # fill in DATABASE_URL + ANTHROPIC_API_KEY
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev,rag,local]"  # ".[local]" = offline bge embeddings
uvicorn api.main:app --reload --port 8000
# verify: http://localhost:8000/health  ·  docs: http://localhost:8000/docs
```

**2 — Frontend** (Next.js on `:3000`)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

Open **http://localhost:3000**, upload a resume PDF, paste a job description, and
hit *Tailor my resume*.

> **Cost:** ingesting is free (local embeddings). Each *Tailor* run is one agent
> pass (parse → retrieve → gap → draft → critic → maybe revise) — roughly
> **4–12¢** of Anthropic credit, depending on how many revisions the loop runs.

## API

```bash
# Ingest a resume → returns a resume_id
curl -F "file=@/path/to/resume.pdf" http://localhost:8000/ingest
# -> {"resume_id":"...","chunk_count":12}

# Tailor against a job description
curl -X POST http://localhost:8000/tailor \
  -H 'content-type: application/json' \
  -d '{"resume_id":"...","job_description":"We are hiring a Senior Backend Engineer ..."}'
# -> {"tailored_bullets":[...], "gaps":[...], "summary":"...", "revisions":1}
```

Inspect the graph visually with `langgraph dev` (needs `.[dev]`).

## Eval suite

```bash
cd backend && source .venv/bin/activate   # needs ".[dev,rag,local]"
python -m eval.run_eval --limit 1   # smoke test (~cents)
python -m eval.run_eval             # full dataset (~$1–2 of Anthropic credit)
# LLM-as-judge groundedness / jd_relevance / gap_recall -> LangSmith experiment
```

## Embeddings provider

`EMBEDDINGS_PROVIDER=local` (default) uses `bge-small` via `sentence-transformers`
— free, offline, no rate limits; ideal for eval loops. Set
`EMBEDDINGS_PROVIDER=voyage` for `voyage-3` (the "production" path; the Voyage
free tier is 3 req/min, so `retrieve_evidence` batches all requirement queries
into one call). The two providers use different vector dimensions, so each writes
to its own pgvector collection (`resume_chunks_<provider>`); switching providers
re-indexes.

## Tests

```bash
cd backend && source .venv/bin/activate
pytest -q
```

## Project layout

```
career-copilot/
├── backend/        # FastAPI app, LangGraph agent, RAG, evals
│   ├── api/        # routes + schemas (/health, /ingest, /tailor)
│   ├── graph/      # LangGraph state machine + nodes (the agent)
│   ├── rag/        # ingest + retrieval (pgvector)
│   ├── eval/       # LangSmith LLM-as-judge eval suite
│   └── tests/
├── frontend/       # Next.js 16 + Tailwind v4 UI (see frontend/README.md)
├── db/init/        # pgvector bootstrap SQL
├── docker-compose.yml
├── DESIGN.md
└── AGENTS.md
```

## Deployment

Runs locally by design — there's no hosted instance. The backend is a
long-running Python service (and pulls torch for local embeddings), so it
doesn't fit Vercel's serverless model, and a public demo would spend API credits
per click. To deploy it yourself: host the frontend on **Vercel**, the backend
on **Render/Railway/Fly**, set `EMBEDDINGS_PROVIDER=voyage` (drops the torch
dependency for a small image), and make the backend's CORS origin
environment-driven.

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: describe change'`)
4. Push and open a pull request

Please make sure tests pass (`cd backend && pytest -q`) before submitting a PR.

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to uphold a welcoming, harassment-free environment.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

## Roadmap

Full build plan in [`DESIGN.md`](./DESIGN.md) §9.

- [x] **1–2.** Repo skeleton + RAG ingest (PDF → chunk → embed → pgvector)
- [x] **3.** LangGraph spine (`parse_jd → retrieve → gap_analysis → draft → assemble`)
- [x] **4.** Self-correcting `critic → revise` loop (bounded by `MAX_REVISIONS`)
- [x] **5.** LangSmith eval suite (LLM-as-judge groundedness / relevance / gap-recall)
- [x] **6.** Next.js frontend (upload → run → results)
- [x] **7.** Polish + demo GIF (hosting intentionally skipped — see [Deployment](#deployment))

Possible next: streaming the agent's progress (SSE) to the UI, multi-resume
management, and auth.

## Acknowledgements

- [LangChain](https://github.com/langchain-ai/langchain) & [LangGraph](https://github.com/langchain-ai/langgraph)
- [Anthropic Claude](https://www.anthropic.com/) for generation, [Voyage AI](https://www.voyageai.com/) for embeddings
- [pgvector](https://github.com/pgvector/pgvector) on [Supabase](https://supabase.com/)
