"""LLM-as-judge evaluators for the eval suite.

Each evaluator has the LangSmith signature (run, example) -> dict with
{key, score, comment}. Judging uses the draft model (Opus) for reliability —
groundedness in particular needs a careful reader.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from graph.llm import get_draft_llm


class Verdict(BaseModel):
    score: float = Field(description="0.0 to 1.0.")
    reasoning: str = Field(description="One or two sentences justifying the score.")


def _judge(prompt: str) -> Verdict:
    return get_draft_llm().with_structured_output(Verdict).invoke(prompt)


def _bullets(run) -> str:
    return "\n".join(f"- {b}" for b in (run.outputs or {}).get("tailored_bullets", []))


def groundedness(run, example) -> dict:
    """Are all tailored bullets supported by the resume? (anti-fabrication)"""
    prompt = (
        "You are auditing tailored resume bullets for fabrication. Score 1.0 if "
        "EVERY bullet is fully supported by the source resume; lower the score for "
        "each claim (experience, employer, metric, skill) not present in the resume. "
        "0.0 means heavy fabrication.\n\n"
        f"SOURCE RESUME:\n{example.inputs['resume_text']}\n\n"
        f"TAILORED BULLETS:\n{_bullets(run)}"
    )
    v = _judge(prompt)
    return {"key": "groundedness", "score": v.score, "comment": v.reasoning}


def jd_relevance(run, example) -> dict:
    """Do the bullets target the job's must-have requirements?"""
    prompt = (
        "Score how well these tailored resume bullets address the job's must-have "
        "requirements. 1.0 = every must-have the candidate can credibly speak to is "
        "surfaced; 0.0 = bullets ignore the job.\n\n"
        f"JOB DESCRIPTION:\n{example.inputs['job_description']}\n\n"
        f"TAILORED BULLETS:\n{_bullets(run)}"
    )
    v = _judge(prompt)
    return {"key": "jd_relevance", "score": v.score, "comment": v.reasoning}


def gap_recall(run, example) -> dict:
    """Did the gap report flag the requirements genuinely missing from the resume?"""
    report = (run.outputs or {}).get("gap_report", {})
    flagged = "\n".join(
        f"- [{g['status']}] {g['requirement']}" for g in report.get("gaps", [])
    )
    truly_missing = "\n".join(f"- {m}" for m in example.inputs.get("truly_missing", []))
    prompt = (
        "A gap report should flag requirements the resume does NOT support as "
        "'missing' or 'weak'. Given the requirements that are genuinely absent from "
        "the resume, score how well the gap report caught them (1.0 = all caught as "
        "missing/weak; 0.0 = none caught / marked strong).\n\n"
        f"GENUINELY ABSENT REQUIREMENTS:\n{truly_missing or '(none)'}\n\n"
        f"GAP REPORT:\n{flagged or '(empty)'}"
    )
    v = _judge(prompt)
    return {"key": "gap_recall", "score": v.score, "comment": v.reasoning}


EVALUATORS = [groundedness, jd_relevance, gap_recall]
