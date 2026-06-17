"""Application configuration, loaded from environment / .env.

Only fields needed by step 1 are required; LLM/embedding/vector settings are
present but optional so the skeleton boots without secrets.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Later files win on overlap. We load root and backend-local .env plus
    # .env.local (the conventional spot for machine-specific secrets like the
    # Voyage key), so a key in any of them is picked up without copying.
    model_config = SettingsConfigDict(
        env_file=("../.env", "../.env.local", ".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "local"
    version: str = "0.1.0"

    # LLM (used from step 3 onward)
    anthropic_api_key: str | None = None
    draft_model: str = "claude-opus-4-8"
    fast_model: str = "claude-haiku-4-5-20251001"

    # Embeddings (used from step 2 onward)
    embeddings_provider: Literal["voyage", "local"] = "voyage"
    voyage_api_key: str | None = None

    # Vector store
    database_url: str = "postgresql://postgres:postgres@localhost:5432/career_copilot"

    # Observability
    langchain_tracing_v2: bool = False
    langchain_api_key: str | None = None
    langchain_project: str = "career-copilot"

    # Agent tuning
    critic_score_threshold: float = 0.8
    max_revisions: int = 2
    enable_url_fetch: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
