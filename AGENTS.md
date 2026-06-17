# AGENTS.md

Guidance for AI agents working in this repo.

## What this is

Career Co-pilot: an agentic resume-tailoring + gap-analysis backend. The
centerpiece is a **LangGraph** state machine with a bounded
`critic → revise → critic` self-correction loop. Read `DESIGN.md` first — it is
the source of truth for architecture and the 7-step build plan.

## Current state

Build **step 2 of 7** is done: RAG ingest. `rag/` has `embeddings.py` (Voyage
default / local bge fallback), `store.py` (pgvector via langchain-postgres),
`ingest.py` (PDF → bullet-aware chunks → upsert), `retriever.py`. `/ingest` is
live. Chunking + the `/ingest` non-PDF guard are unit-tested (DB-free).
**Live ingest is verified** against Supabase pgvector (project
`personalprojects` / `iesakyswjojhxkuticdi`, region ap-northeast-1) using the
Session pooler (port 5432) + Voyage `voyage-3`: a sample resume PDF ingested,
persisted to the `resume_chunks` collection, and retrieval returned correctly
ranked, resume-scoped chunks. `docker-compose.yml` remains as a local
alternative. `graph/` and `eval/` are still empty until their steps.

Known tuning item: PDF text extraction can collapse newlines, so the bullet
separators don't always fire and a 1-page resume may yield few coarse chunks.
Revisit chunking (e.g. layout-aware extraction) if retrieval granularity hurts
the gap-analysis step.

## Conventions

- **Python 3.12+**, FastAPI, `pydantic-settings` for config (see `settings.py`).
  Never read env vars directly — add a field to `Settings`.
- Imports are package-absolute from `backend/` (e.g. `from api.routes import
  router`). `pyproject.toml` sets `pythonpath = ["."]` for pytest.
- Core deps stay light; heavy AI deps live under the `rag` optional-extra and
  are installed only from build step 2 onward.
- **Models:** `claude-opus-4-8` (draft/critic/revise), `claude-haiku-4-5-20251001`
  (parse/classify/assemble). Confirm IDs against the `claude-api` reference
  before wiring LLM calls. Anthropic has **no** embeddings API — embeddings come
  from Voyage (or the local `bge` fallback).

## Workflow

- Add a test for each new endpoint/node in the same pass; `pytest -q` must pass
  before a step is "done".
- Each build step in `DESIGN.md` §9 has its own verification gate — honor it.
- Update `README.md` (status line + steps) and this file when a build step lands.

## Run / test

```bash
cd backend && source .venv/bin/activate
uvicorn api.main:app --reload --port 8000   # serve
pytest -q                                    # test
```

```bash
docker-compose up -d    # local pgvector (:5432); needs a running daemon
```
