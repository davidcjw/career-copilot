"""Offline sanity checks for the eval suite (no LLM/DB calls)."""

from eval.dataset import EXAMPLES
from eval.judges import EVALUATORS, _bullets


def test_dataset_examples_are_well_formed():
    assert len(EXAMPLES) >= 3
    for ex in EXAMPLES:
        assert ex["resume_text"].strip()
        assert ex["job_description"].strip()
        assert isinstance(ex["truly_missing"], list)


def test_three_evaluators_registered():
    keys = {fn.__name__ for fn in EVALUATORS}
    assert keys == {"groundedness", "jd_relevance", "gap_recall"}


def test_bullets_formatter_handles_missing_outputs():
    class _Run:
        outputs = None

    assert _bullets(_Run()) == ""
