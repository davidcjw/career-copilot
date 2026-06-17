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
