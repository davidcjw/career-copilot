# AGENTS.md

Guidance for AI agents working in this repo.

## What this is

Career Co-pilot: an agentic resume-tailoring + gap-analysis backend. The
centerpiece is a **LangGraph** state machine with a bounded
`critic → revise → critic` self-correction loop. Read `DESIGN.md` first — it is
the source of truth for architecture and the 7-step build plan.

## Current state

Build **step 5 of 7** is done: the eval suite. `eval/` has `dataset.py` (3+
seed resume/JD pairs with `truly_missing` reference), `judges.py` (LLM-as-judge
`groundedness` / `jd_relevance` / `gap_recall`, Opus), and `run_eval.py`
(`python -m eval.run_eval [--limit N]` → LangSmith experiment). Smoke-tested on
1 example: groundedness 0.95, jd_relevance 0.95, gap_recall 1.00.

**Embeddings now default to local** (`EMBEDDINGS_PROVIDER=local` in `.env`):
`rag/embeddings.py:LocalEmbeddings` wraps `sentence-transformers` bge-small
directly (NOT langchain-huggingface — its latest pins langchain-core>=1.0 and
breaks the 0.3.x langchain-anthropic/voyageai stack). Provider-aware collections
(`resume_chunks_<provider>`) keep 384d/1024d data separate. `ingest_text()` is
the DB-free-of-PDF ingest path used by evals.

Build **step 4** (still current): the self-correcting agent. `graph/` has `state.py`
(CopilotState + structured-output models incl. `Critique`), `llm.py` (Haiku fast
/ Opus draft), `prompts.py`, `nodes.py` (`parse_jd`, `retrieve_evidence`,
`gap_analysis`, `draft`, `critic`, `revise`, `assemble`), and `build.py`
(compiled `graph` + `route_after_critic`). Topology: `... → draft → critic →`
conditional → `revise → critic` (loop) or `assemble`. The loop is bounded by
`MAX_REVISIONS` (settings; default 2) — the safety valve. `/tailor` runs it and
returns `revisions`. `langgraph.json` enables `langgraph dev`.

**Verified live**: the critic catches fabricated bullets (sets `grounded=false`,
lists `unsupported_claims`) and `revise` removes them; the bounded loop runs to
the safety valve when forced. LangSmith trace captured the full looping run
(per-node spans, project `career-copilot`). `Critique` has a `field_validator`
coercing Claude's occasional `""`/`"none"` for the list fields into `[]`.

Step 2 (RAG ingest) remains: `rag/` = `embeddings.py` (Voyage default / local
bge fallback), `store.py` (pgvector via langchain-postgres), `ingest.py`,
`retriever.py` (`retrieve` + `retrieve_batch`). DB = Supabase `personalprojects`
/ `iesakyswjojhxkuticdi`, Session pooler 5432, collection `resume_chunks`.
`eval/` is still empty until step 5.

**Voyage free tier = 3 RPM.** `retrieve_evidence` uses `retrieve_batch` (one
embedding call for all requirement queries) to stay under it. Keys are exported
from `settings.py` into `os.environ` (`export_to_env`) so langchain-anthropic
and LangSmith pick them up.

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
