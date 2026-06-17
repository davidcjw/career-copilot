"""Claude chat-model factories (via langchain-anthropic).

Model split per DESIGN.md: Haiku for cheap parse/classify, Opus for drafting.
Keys come from settings (exported to os.environ), so we don't pass them here.
"""

from __future__ import annotations

from langchain_anthropic import ChatAnthropic

from settings import get_settings


def get_fast_llm() -> ChatAnthropic:
    """Haiku 4.5 — structured extraction / classification nodes."""
    s = get_settings()
    return ChatAnthropic(model=s.fast_model, max_tokens=2048, timeout=60, max_retries=2)


def get_draft_llm() -> ChatAnthropic:
    """Opus 4.8 — drafting (and, in step 4, the critic/revise loop)."""
    s = get_settings()
    return ChatAnthropic(model=s.draft_model, max_tokens=4096, timeout=120, max_retries=2)
