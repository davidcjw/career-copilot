"""Graph state + the structured-output schemas the nodes produce.

Working memory is stored as plain dicts/lists (not pydantic instances) so the
state serializes cleanly through LangGraph checkpointers / `langgraph dev`.
The pydantic models here are used only as LLM structured-output targets, then
`.model_dump()`-ed into the state.
"""

from __future__ import annotations

from typing import Literal, TypedDict

from pydantic import BaseModel, Field


# ---- structured-output schemas (LLM targets) ----

class Requirement(BaseModel):
    text: str = Field(description="A single, concrete requirement from the job description.")
    category: Literal["skill", "experience", "seniority", "responsibility", "other"]
    must_have: bool = Field(description="True if this is an explicit must-have / hard requirement.")


class JDRequirements(BaseModel):
    requirements: list[Requirement]


class Gap(BaseModel):
    requirement: str
    status: Literal["strong", "weak", "missing"] = Field(
        description="strong = clear resume evidence; weak = tangential; missing = none."
    )
    note: str = Field(description="One sentence: what evidence exists, or what's absent.")


class GapReport(BaseModel):
    gaps: list[Gap]
    summary: str = Field(description="2-3 sentence overall fit assessment, grounded in the gaps.")


class DraftBullets(BaseModel):
    bullets: list[str] = Field(
        description="Tailored resume bullets, each grounded ONLY in the provided evidence."
    )


# ---- graph state ----

class CopilotState(TypedDict, total=False):
    # inputs
    job_description: str
    resume_id: str
    # working memory (plain dicts for serialization)
    jd_requirements: list[dict]            # [{text, category, must_have}]
    evidence: list[dict]                   # [{requirement, chunks: [str]}]
    gap_report: dict                       # {gaps: [...], summary: str}
    draft_bullets: list[str]
    # step 4 will use these; present now so the schema is stable
    critique: dict | None
    revision_count: int
    # outputs
    tailored_bullets: list[str]
