"""Similarity retrieval over ingested resume chunks, scoped per resume."""

from __future__ import annotations

from langchain_core.documents import Document


def retrieve(query: str, resume_id: str, k: int = 4) -> list[Document]:
    """Top-k resume chunks most similar to `query`, filtered to one resume."""
    from rag.store import get_vector_store

    return get_vector_store().similarity_search(
        query,
        k=k,
        filter={"resume_id": resume_id},
    )
