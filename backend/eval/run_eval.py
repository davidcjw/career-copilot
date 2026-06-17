"""Run the eval suite against the graph and record results in LangSmith.

Usage:
    python -m eval.run_eval               # full dataset
    python -m eval.run_eval --limit 1     # smoke test (1 example, ~cents)

For each dataset example the target ingests the resume text into pgvector under
a unique resume_id, runs the graph, and returns the tailored bullets + gap
report. The LLM-as-judge evaluators in eval.judges then score each output.
Results upload to LangSmith as an experiment (the portfolio artifact).
"""

from __future__ import annotations

import argparse

from langsmith import Client

from eval.dataset import DATASET_NAME, EXAMPLES
from eval.judges import EVALUATORS
from settings import get_settings


def ensure_dataset(client: Client):
    """Create the LangSmith dataset from EXAMPLES once; reuse it thereafter."""
    if client.has_dataset(dataset_name=DATASET_NAME):
        return client.read_dataset(dataset_name=DATASET_NAME)
    ds = client.create_dataset(dataset_name=DATASET_NAME)
    for ex in EXAMPLES:
        client.create_example(
            dataset_id=ds.id,
            inputs={
                "resume_text": ex["resume_text"],
                "job_description": ex["job_description"],
                "truly_missing": ex["truly_missing"],
            },
            outputs=None,
            metadata={"name": ex["name"]},
        )
    return ds


def target(inputs: dict) -> dict:
    """Ingest the example's resume, run the graph, return its outputs."""
    from graph.build import graph
    from rag.ingest import ingest_text

    # Deterministic per-example resume_id so re-runs overwrite cleanly.
    resume_id = f"eval-{abs(hash(inputs['resume_text'])) % (10**10)}"
    ingest_text(inputs["resume_text"], resume_id=resume_id)

    final = graph.invoke(
        {"job_description": inputs["job_description"], "resume_id": resume_id},
        config={"metadata": {"eval": True, "resume_id": resume_id}},
    )
    return {
        "tailored_bullets": final.get("tailored_bullets", []),
        "gap_report": final.get("gap_report", {}),
        "revisions": final.get("revision_count", 0),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Eval only N examples.")
    args = parser.parse_args()

    get_settings()  # exports keys (ANTHROPIC/VOYAGE/LANGCHAIN) to os.environ
    from langsmith import evaluate

    client = Client()
    ensure_dataset(client)

    data = list(client.list_examples(dataset_name=DATASET_NAME))
    if args.limit:
        data = data[: args.limit]
    print(f"Evaluating {len(data)} example(s) with {len(EVALUATORS)} judges...")

    results = evaluate(
        target,
        data=data,
        evaluators=EVALUATORS,
        experiment_prefix="career-copilot",
        max_concurrency=1,  # serial — keeps embedding/LLM call rate sane
    )

    # Print a quick per-metric summary.
    scores: dict[str, list[float]] = {}
    for r in results:
        for er in r["evaluation_results"]["results"]:
            scores.setdefault(er.key, []).append(er.score or 0.0)
    print("\n=== EVAL SUMMARY ===")
    for key, vals in scores.items():
        print(f" {key:14s} mean={sum(vals) / len(vals):.2f}  (n={len(vals)})")


if __name__ == "__main__":
    main()
