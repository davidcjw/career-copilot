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


def retrieve_batch(queries: list[str], resume_id: str, k: int = 4) -> list[list[Document]]:
    """Retrieve evidence for many queries with a SINGLE embedding API call.

    Embeds all queries in one batch (one Voyage request — matters on the free
    tier's 3 RPM limit), then runs cheap per-query vector searches in pgvector.
    Returns one result list per query, in order.
    """
    from rag.store import get_vector_store

    store = get_vector_store()
    vectors = store.embeddings.embed_documents(queries)  # one API call
    return [
        store.similarity_search_by_vector(vec, k=k, filter={"resume_id": resume_id})
        for vec in vectors
    ]
