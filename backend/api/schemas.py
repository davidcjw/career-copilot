"""Pydantic response models. Expands as endpoints land in later steps."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    app_env: str


class IngestResponse(BaseModel):
    resume_id: str
    chunk_count: int


class TailorRequest(BaseModel):
    resume_id: str
    job_description: str


class GapItem(BaseModel):
    requirement: str
    status: str
    note: str


class TailorResponse(BaseModel):
    tailored_bullets: list[str]
    gaps: list[GapItem]
    summary: str
    revisions: int  # how many critic -> revise passes the loop ran
