"""Wire and compile the Career Co-pilot graph.

The showpiece is the bounded self-correction loop:

    START -> parse_jd -> retrieve_evidence -> gap_analysis -> draft -> critic
                                                                         |
                          (grounded & score>=threshold) OR budget spent  |  else
                                            assemble -> END   <-----------+----> revise -> critic

`route_after_critic` is the conditional edge; `revision_count` (bounded by
MAX_REVISIONS) is the safety valve that prevents an infinite loop.

`graph` is the module-level compiled app (referenced by langgraph.json and the
/tailor endpoint).
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from graph import nodes
from graph.state import CopilotState
from settings import get_settings


def route_after_critic(state: dict) -> str:
    """Decide whether the draft passes, needs another revision, or is out of budget."""
    s = get_settings()
    critique = state.get("critique") or {}
    grounded = critique.get("grounded", False)
    score = critique.get("overall_score", 0.0)
    revisions = state.get("revision_count", 0)

    if grounded and score >= s.critic_score_threshold:
        return "assemble"  # converged
    if revisions >= s.max_revisions:
        return "assemble"  # safety valve — stop looping
    return "revise"


def build_graph():
    g = StateGraph(CopilotState)

    g.add_node("parse_jd", nodes.parse_jd)
    g.add_node("retrieve_evidence", nodes.retrieve_evidence)
    g.add_node("gap_analysis", nodes.gap_analysis)
    g.add_node("draft", nodes.draft)
    g.add_node("critic", nodes.critic)
    g.add_node("revise", nodes.revise)
    g.add_node("assemble", nodes.assemble)

    g.add_edge(START, "parse_jd")
    g.add_edge("parse_jd", "retrieve_evidence")
    g.add_edge("retrieve_evidence", "gap_analysis")
    g.add_edge("gap_analysis", "draft")
    g.add_edge("draft", "critic")
    g.add_conditional_edges(
        "critic",
        route_after_critic,
        {"revise": "revise", "assemble": "assemble"},
    )
    g.add_edge("revise", "critic")  # the self-correction loop
    g.add_edge("assemble", END)

    return g.compile()


graph = build_graph()
