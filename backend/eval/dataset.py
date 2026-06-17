"""Seed dataset for the eval suite — anonymized resume/JD pairs.

Each example carries the resume text, a target job description, and a small set
of `truly_missing` requirements (things genuinely absent from the resume) used
by the gap_recall evaluator as a reference signal.

Kept intentionally small and synthetic (no real personal data).
"""

from __future__ import annotations

DATASET_NAME = "career-copilot-evals"

EXAMPLES: list[dict] = [
    {
        "name": "backend-staff-eng",
        "resume_text": (
            "JANE DOE — Senior Software Engineer\n"
            "Acme Corp, Staff Engineer (2021-2025)\n"
            "- Led migration of a monolith to event-driven microservices, cutting p99 latency 40%.\n"
            "- Mentored 6 engineers; introduced trunk-based development and CI gates.\n"
            "Globex, Backend Engineer (2018-2021)\n"
            "- Built a billing pipeline processing $2M/day with zero data-loss incidents.\n"
            "- Designed a Kafka ingestion layer handling 50k events/sec.\n"
            "SKILLS: Python, Go, PostgreSQL, Kafka, Kubernetes, AWS"
        ),
        "job_description": (
            "Senior Backend Engineer for our payments platform. Must have 5+ years "
            "in Python or Go building distributed systems, event-driven architectures "
            "and Kafka, strong PostgreSQL, mentoring experience, and production "
            "Kubernetes. React frontend experience is a plus."
        ),
        "truly_missing": ["React frontend experience"],
    },
    {
        "name": "data-engineer",
        "resume_text": (
            "SAM LEE — Data Engineer\n"
            "Initech, Data Engineer (2020-2025)\n"
            "- Built batch and streaming pipelines in Spark and Airflow over 10TB/day.\n"
            "- Modeled a Snowflake warehouse and cut query costs 30%.\n"
            "SKILLS: Python, SQL, Spark, Airflow, Snowflake, dbt"
        ),
        "job_description": (
            "Analytics Engineer. Must have strong SQL and dbt, data-warehouse modeling "
            "(Snowflake or BigQuery), and pipeline orchestration. Experience with "
            "real-time streaming and Looker dashboards preferred."
        ),
        "truly_missing": ["Looker dashboards"],
    },
    {
        "name": "ml-engineer",
        "resume_text": (
            "PRIYA RAO — Machine Learning Engineer\n"
            "DeepData, ML Engineer (2019-2025)\n"
            "- Trained and deployed recommendation models serving 5M users.\n"
            "- Built a feature store and an offline/online eval harness.\n"
            "SKILLS: Python, PyTorch, scikit-learn, MLflow, AWS SageMaker"
        ),
        "job_description": (
            "ML Engineer for ranking systems. Must have deep learning (PyTorch or "
            "TensorFlow), model deployment at scale, and experiment/eval tooling. "
            "LLM/RAG experience and Kubernetes are nice to have."
        ),
        "truly_missing": ["LLM/RAG experience", "Kubernetes"],
    },
]
