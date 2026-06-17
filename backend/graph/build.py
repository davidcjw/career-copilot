"""Wire and compile the Career Co-pilot graph.

Step 3 is the linear spine. Step 4 inserts the critic -> revise loop between
`draft` and `assemble`.

    START -> parse_jd -> retrieve_evidence -> gap_analysis -> draft -> assemble -> END

`graph` is the module-level compiled app (referenced by langgraph.json and the
/tailor endpoint).
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from graph import nodes
from graph.state import CopilotState


def build_graph():
    g = StateGraph(CopilotState)

    g.add_node("parse_jd", nodes.parse_jd)
    g.add_node("retrieve_evidence", nodes.retrieve_evidence)
    g.add_node("gap_analysis", nodes.gap_analysis)
    g.add_node("draft", nodes.draft)
    g.add_node("assemble", nodes.assemble)

    g.add_edge(START, "parse_jd")
    g.add_edge("parse_jd", "retrieve_evidence")
    g.add_edge("retrieve_evidence", "gap_analysis")
    g.add_edge("gap_analysis", "draft")
    g.add_edge("draft", "assemble")
    g.add_edge("assemble", END)

    return g.compile()


graph = build_graph()
