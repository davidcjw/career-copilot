# Career Co-pilot

An **agentic resume-tailoring and gap-analysis** tool for job seekers — built to
showcase production AI engineering: LangGraph (a self-correcting agent loop),
LangChain, a pgvector RAG pipeline, and end-to-end observability with LangSmith.

See [`DESIGN.md`](./DESIGN.md) for the full architecture and rationale.

> **Status:** Step 2 of 7 — RAG ingest (`/ingest`: PDF → chunk → embed →
> pgvector) + retriever. Build plan lives in `DESIGN.md` §9.

## Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12+, FastAPI |
| Agent | LangGraph (`critic → revise` loop) |
| RAG | LangChain + pgvector |
| Embeddings | Voyage `voyage-3` (local `bge-small` fallback) |
| LLM | Claude Opus 4.8 (draft/critic) + Haiku 4.5 (cheap nodes) |
| Observability | LangSmith |
| Frontend | Next.js 16 + Tailwind v4 *(later step)* |

## Prerequisites

- Python 3.12+
- A Postgres + pgvector database. Two options:
  - **Supabase** (current setup) — enable the `vector` extension, then use the
    **Session pooler** URI (port 5432, *not* the 6543 transaction pooler) as
    `DATABASE_URL`.
  - **Local** — `docker-compose up -d` (see `docker-compose.yml`); needs a
    running Docker daemon (Docker Desktop / Colima / OrbStack).
- API keys (from build step 2+): Anthropic, Voyage, LangSmith.

## Quick start

```bash
# 1. Config — set DATABASE_URL (Supabase session pooler) + VOYAGE_API_KEY
cp .env.example .env        # or put machine-local secrets in .env.local

# 2a. Supabase: enable pgvector once
#     CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
# 2b. ...or run a local pgvector instead:
#     docker-compose up -d

# 3. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev,rag]"     # add ".[local]" for the offline bge embeddings
uvicorn api.main:app --reload --port 8000

# 4. Verify
#   open http://localhost:8000/health  -> {"status":"ok",...}
#   open http://localhost:8000/docs    -> Swagger UI
```

`settings.py` loads `.env` and `.env.local` (later wins), so secrets can live in
either. `DATABASE_URL` is rewritten to the `postgresql+psycopg://` driver
internally.

### Ingest a resume

```bash
# Needs DATABASE_URL reachable + VOYAGE_API_KEY set
curl -F "file=@/path/to/resume.pdf" http://localhost:8000/ingest
# -> {"resume_id":"...","chunk_count":12}
```

## Tests

```bash
cd backend && source .venv/bin/activate
pytest -q
```

## Project layout

```
career-copilot/
├── backend/        # FastAPI app, LangGraph agent, RAG, evals
│   ├── api/        # routes + schemas  (step 1: /health)
│   ├── graph/      # LangGraph state machine  (step 3+)
│   ├── rag/        # ingest + retrieval        (step 2+)
│   ├── eval/       # LangSmith eval suite       (step 5+)
│   └── tests/
├── db/init/        # pgvector bootstrap SQL
├── docker-compose.yml
├── DESIGN.md
└── AGENTS.md
```

## License

TBD.
