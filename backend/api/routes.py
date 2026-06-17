"""HTTP routes.

Step 1 ships /health only. /ingest, /tailor, /gap-report arrive in later
build-plan steps (see DESIGN.md §9).
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from api.schemas import HealthResponse, IngestResponse
from settings import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        version=settings.version,
        app_env=settings.app_env,
    )


@router.post("/ingest", response_model=IngestResponse, tags=["rag"])
async def ingest(
    file: UploadFile = File(...),
    resume_id: str | None = Form(default=None),
) -> IngestResponse:
    """Parse a resume PDF, chunk it, embed and upsert to pgvector."""
    is_pdf = file.content_type == "application/pdf" or (
        file.filename or ""
    ).lower().endswith(".pdf")
    if not is_pdf:
        raise HTTPException(status_code=415, detail="Expected a PDF upload.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Lazy import keeps the app bootable without the rag extra installed.
    from rag.ingest import ingest_pdf

    try:
        rid, count = ingest_pdf(data, resume_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return IngestResponse(resume_id=rid, chunk_count=count)
