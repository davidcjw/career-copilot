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


class LocalEmbeddings(Embeddings):
    """sentence-transformers bge-small wrapper (free, offline, no rate limits).

    Wrapped directly instead of via langchain-huggingface to avoid that
    package's langchain-core>=1.0 pin clashing with the 0.3.x stack.
    """

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._model.encode(texts, normalize_embeddings=True).tolist()

    def embed_query(self, text: str) -> list[float]:
        return self._model.encode([text], normalize_embeddings=True)[0].tolist()


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
        return LocalEmbeddings()

    raise ValueError(f"Unknown EMBEDDINGS_PROVIDER: {s.embeddings_provider!r}")
