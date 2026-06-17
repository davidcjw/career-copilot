"""Versioned prompt templates for the graph nodes.

Kept as plain strings (not f-strings) so they're cache-friendly and easy to
diff. Format with .format(...) at call time.
"""

PARSE_JD = """\
You are an expert technical recruiter. Extract the concrete, individually \
checkable requirements from the job description below.

Rules:
- One requirement per item. Split compound sentences.
- Classify each as skill / experience / seniority / responsibility / other.
- Mark must_have=true only for explicit hard requirements.

JOB DESCRIPTION:
{jd}
"""

GAP_ANALYSIS = """\
You are assessing how well a candidate's resume evidence covers each job \
requirement. For each requirement you are given the resume chunks retrieved \
as the most relevant evidence.

For each requirement, classify coverage as:
- strong: the evidence clearly demonstrates this requirement.
- weak: the evidence is tangential or only partially supports it.
- missing: no evidence supports it.

Base every judgement ONLY on the provided evidence. Do not assume experience \
that isn't shown. Then write a short overall fit summary.

REQUIREMENTS AND EVIDENCE:
{reqs_and_evidence}
"""

DRAFT = """\
You are an expert resume writer. Write tailored resume bullets that position \
the candidate for this job, using ONLY the evidence provided.

Hard rules:
- Never invent experience, employers, metrics, or skills not in the evidence.
- Each bullet must be supported by the evidence below.
- Prefer strong action verbs and concrete impact already present in the evidence.
- Emphasise evidence that maps to the job's must-have requirements.

JOB REQUIREMENTS:
{requirements}

RESUME EVIDENCE (the only facts you may use):
{evidence}
"""

CRITIC = """\
You are a rigorous resume reviewer. Critique the tailored bullets below against \
the evidence and the job requirements.

Judge three things:
1. Groundedness (most important): is every bullet fully supported by the \
   evidence? Flag ANY claim — experience, employer, metric, skill — that is not \
   in the evidence as an unsupported_claim. If any exist, set grounded=false.
2. Relevance: do the bullets target the job's must-have requirements?
3. Impact: strong action verbs and concrete, evidence-backed results?

Give an overall_score from 0.0 to 1.0 and specific, actionable notes. Be strict: \
fabrication is disqualifying regardless of how good the writing is.

JOB REQUIREMENTS:
{requirements}

RESUME EVIDENCE (the only facts allowed):
{evidence}

TAILORED BULLETS TO REVIEW:
{bullets}
"""

REVISE = """\
You are revising tailored resume bullets to address a reviewer's critique. \
Rewrite the bullets so they fix every issue raised, while staying grounded \
ONLY in the evidence.

Hard rules:
- Remove or rewrite every unsupported claim — never invent facts to satisfy a note.
- Address each reviewer note.
- Keep bullets that were already strong.

JOB REQUIREMENTS:
{requirements}

RESUME EVIDENCE (the only facts you may use):
{evidence}

CURRENT BULLETS:
{bullets}

REVIEWER — UNSUPPORTED CLAIMS TO FIX:
{unsupported}

REVIEWER — NOTES TO ADDRESS:
{notes}
"""
