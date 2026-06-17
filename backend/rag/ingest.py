"""Resume ingestion: PDF -> text -> bullet/role-aware chunks -> pgvector.

Chunking is the only DB-free part and is unit-tested directly (see
tests/test_chunking.py).
"""

from __future__ import annotations

import io
import uuid

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Resume bullets/roles are the natural retrieval unit, so we bias the splitter
# toward paragraph and bullet boundaries before falling back to lines/words.
_SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=50,
    separators=["\n\n", "\n• ", "\n- ", "\n– ", "\n* ", "\n", " ", ""],
)


def extract_text(pdf_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def chunk_resume(text: str) -> list[str]:
    return [c.strip() for c in _SPLITTER.split_text(text) if c.strip()]


def ingest_pdf(pdf_bytes: bytes, resume_id: str | None = None) -> tuple[str, int]:
    """Parse, chunk, embed and upsert a resume. Returns (resume_id, chunk_count)."""
    resume_id = resume_id or str(uuid.uuid4())
    chunks = chunk_resume(extract_text(pdf_bytes))
    if not chunks:
        raise ValueError("No extractable text found in the PDF.")

    docs = [
        Document(
            page_content=chunk,
            metadata={"resume_id": resume_id, "chunk_index": i},
        )
        for i, chunk in enumerate(chunks)
    ]

    # Imported here so the FastAPI app boots without DB/embedding deps present.
    from rag.store import get_vector_store

    get_vector_store().add_documents(docs)
    return resume_id, len(chunks)
