# AGENTS.md

Guidance for AI agents working in this repo.

## What this is

Career Co-pilot: an agentic resume-tailoring + gap-analysis backend. The
centerpiece is a **LangGraph** state machine with a bounded
`critic → revise → critic` self-correction loop. Read `DESIGN.md` first — it is
the source of truth for architecture and the 7-step build plan.

## Current state

Build **step 3 of 7** is done: the LangGraph spine. `graph/` has `state.py`
(CopilotState + structured-output pydantic models), `llm.py` (Claude factories:
Haiku fast / Opus draft), `prompts.py`, `nodes.py`, and `build.py` (compiled
`graph`). Topology: `parse_jd → retrieve_evidence → gap_analysis → draft →
assemble` (linear; the critic→revise loop is step 4). `/tailor` runs it.
`langgraph.json` enables `langgraph dev`. **Verified live end-to-end** against
Claude + Voyage + Supabase: grounded tailored bullets (no fabrication) + a gap
report correctly flagging missing/weak coverage. LangSmith tracing confirmed
(per-node spans upload to project `career-copilot`).

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
