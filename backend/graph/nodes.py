"""LangGraph node functions for the linear spine (step 3).

Each node takes the state and returns a partial-state update dict. Structured
outputs are produced via `.with_structured_output(...)` and dumped to plain
dicts before going into the state.
"""

from __future__ import annotations

from graph import prompts
from graph.llm import get_draft_llm, get_fast_llm
from graph.state import Critique, DraftBullets, GapReport, JDRequirements


def _format_requirements(reqs: list[dict]) -> str:
    return "\n".join(
        f"- [{'MUST' if r['must_have'] else 'nice'}] {r['text']}" for r in reqs
    )


def _format_bullets(bullets: list[str]) -> str:
    return "\n".join(f"- {b}" for b in bullets)


def _format_reqs_and_evidence(evidence: list[dict]) -> str:
    blocks = []
    for i, item in enumerate(evidence, 1):
        chunks = "\n".join(f"    - {c}" for c in item["chunks"]) or "    (no evidence retrieved)"
        blocks.append(f"{i}. REQUIREMENT: {item['requirement']}\n   EVIDENCE:\n{chunks}")
    return "\n\n".join(blocks)


def parse_jd(state: dict) -> dict:
    llm = get_fast_llm().with_structured_output(JDRequirements)
    result: JDRequirements = llm.invoke(prompts.PARSE_JD.format(jd=state["job_description"]))
    return {"jd_requirements": [r.model_dump() for r in result.requirements]}


def retrieve_evidence(state: dict) -> dict:
    # Lazy import keeps the graph importable without the rag/DB stack present.
    from rag.retriever import retrieve_batch

    reqs = state["jd_requirements"]
    queries = [r["text"] for r in reqs]
    # One batched embedding call for all requirements (rate-limit friendly).
    per_query_docs = retrieve_batch(queries, state["resume_id"], k=4)
    evidence = [
        {"requirement": req["text"], "chunks": [d.page_content for d in docs]}
        for req, docs in zip(reqs, per_query_docs)
    ]
    return {"evidence": evidence}


def gap_analysis(state: dict) -> dict:
    llm = get_fast_llm().with_structured_output(GapReport)
    prompt = prompts.GAP_ANALYSIS.format(
        reqs_and_evidence=_format_reqs_and_evidence(state["evidence"])
    )
    result: GapReport = llm.invoke(prompt)
    return {"gap_report": result.model_dump()}


def draft(state: dict) -> dict:
    llm = get_draft_llm().with_structured_output(DraftBullets)
    prompt = prompts.DRAFT.format(
        requirements=_format_requirements(state["jd_requirements"]),
        evidence=_format_reqs_and_evidence(state["evidence"]),
    )
    result: DraftBullets = llm.invoke(prompt)
    return {"draft_bullets": result.bullets}


def critic(state: dict) -> dict:
    llm = get_draft_llm().with_structured_output(Critique)
    prompt = prompts.CRITIC.format(
        requirements=_format_requirements(state["jd_requirements"]),
        evidence=_format_reqs_and_evidence(state["evidence"]),
        bullets=_format_bullets(state["draft_bullets"]),
    )
    result: Critique = llm.invoke(prompt)
    return {"critique": result.model_dump()}


def revise(state: dict) -> dict:
    llm = get_draft_llm().with_structured_output(DraftBullets)
    critique = state.get("critique") or {}
    prompt = prompts.REVISE.format(
        requirements=_format_requirements(state["jd_requirements"]),
        evidence=_format_reqs_and_evidence(state["evidence"]),
        bullets=_format_bullets(state["draft_bullets"]),
        unsupported=_format_bullets(critique.get("unsupported_claims", [])) or "(none)",
        notes=_format_bullets(critique.get("notes", [])) or "(none)",
    )
    result: DraftBullets = llm.invoke(prompt)
    return {
        "draft_bullets": result.bullets,
        "revision_count": state.get("revision_count", 0) + 1,
    }


def assemble(state: dict) -> dict:
    # Pure packaging — no LLM call. Runs once the critic loop converges or the
    # revision budget is spent.
    return {"tailored_bullets": state.get("draft_bullets", [])}
