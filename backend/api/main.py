"""FastAPI application entrypoint.

Run locally:
    uvicorn api.main:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from settings import get_settings

settings = get_settings()

app = FastAPI(
    title="Career Co-pilot API",
    version=settings.version,
    description="Agentic resume-tailoring and gap-analysis backend.",
)

# Permissive CORS for local dev; tighten before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
