"""Embedding-provider factory.

Anthropic has no embeddings API, so we use Voyage (Anthropic's recommended
partner) by default, with a local bge fallback for free/offline dev. The choice
is fixed per deployment via EMBEDDINGS_PROVIDER because the vector column
dimension is provider-specific (voyage-3 = 1024, bge-small = 384) and cannot be
mixed in one table without a re-index.
"""

from __future__ import annotations

import os

from langchain_core.embeddings import Embeddings

from settings import get_settings

# Kept here so other modules can reason about column dimensions if needed.
PROVIDER_DIMS = {"voyage": 1024, "local": 384}


def get_embeddings() -> Embeddings:
    s = get_settings()

    if s.embeddings_provider == "voyage":
        if not s.voyage_api_key:
            raise RuntimeError(
                "EMBEDDINGS_PROVIDER=voyage but VOYAGE_API_KEY is not set."
            )
        # langchain-voyageai reads VOYAGE_API_KEY from the environment; set it
        # from our settings so the single source of truth stays .env.
        os.environ.setdefault("VOYAGE_API_KEY", s.voyage_api_key)
        from langchain_voyageai import VoyageAIEmbeddings

        return VoyageAIEmbeddings(model="voyage-3")

    if s.embeddings_provider == "local":
        # Heavy (torch) — only imported when actually selected.
        from langchain_huggingface import HuggingFaceEmbeddings

        return HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    raise ValueError(f"Unknown EMBEDDINGS_PROVIDER: {s.embeddings_provider!r}")
