"""pgvector-backed vector store (via langchain-postgres).

The store auto-creates its tables on first use; the `vector` extension itself is
enabled by db/init/01_extensions.sql when the container is first provisioned.
"""

from __future__ import annotations

from langchain_postgres import PGVector

from rag.embeddings import get_embeddings
from settings import get_settings

COLLECTION_NAME = "resume_chunks"


def _psycopg_url(database_url: str) -> str:
    # langchain-postgres requires the psycopg (v3) SQLAlchemy driver.
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    return database_url.replace("postgresql://", "postgresql+psycopg://", 1)


def get_vector_store() -> PGVector:
    s = get_settings()
    return PGVector(
        embeddings=get_embeddings(),
        collection_name=COLLECTION_NAME,
        connection=_psycopg_url(s.database_url),
        use_jsonb=True,
    )
