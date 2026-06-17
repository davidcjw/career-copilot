"""DB-free tests for resume chunking. Live ingest is covered separately once a
pgvector daemon is available."""

from rag.ingest import chunk_resume

SAMPLE_RESUME = """\
JANE DOE
Senior Software Engineer

EXPERIENCE

Acme Corp — Staff Engineer (2021–2025)
• Led migration of a monolith to event-driven microservices, cutting p99 latency 40%.
• Mentored 6 engineers; introduced trunk-based development and CI gates.

Globex — Backend Engineer (2018–2021)
• Built a billing pipeline processing $2M/day with zero data-loss incidents.

SKILLS
Python, Go, PostgreSQL, Kafka, Kubernetes
"""


def test_chunk_resume_returns_nonempty_trimmed_chunks():
    chunks = chunk_resume(SAMPLE_RESUME)
    assert len(chunks) >= 2
    assert all(c == c.strip() and c for c in chunks)


def test_chunk_resume_preserves_bullet_content():
    joined = "\n".join(chunk_resume(SAMPLE_RESUME))
    assert "event-driven microservices" in joined
    assert "billing pipeline" in joined


def test_chunk_resume_empty_input():
    assert chunk_resume("   \n  ") == []
