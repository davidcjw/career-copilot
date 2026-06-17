"""Structure tests for the LangGraph spine. Compiling the graph does not call
the LLM or DB, so these are cheap and offline."""

from graph.build import graph


def test_graph_has_expected_nodes():
    names = set(graph.get_graph().nodes)
    for node in ["parse_jd", "retrieve_evidence", "gap_analysis", "draft", "assemble"]:
        assert node in names


def test_graph_is_linear_spine():
    # Each step feeds the next; no branching yet (the critic loop arrives in step 4).
    edges = {(e.source, e.target) for e in graph.get_graph().edges}
    assert ("parse_jd", "retrieve_evidence") in edges
    assert ("retrieve_evidence", "gap_analysis") in edges
    assert ("gap_analysis", "draft") in edges
    assert ("draft", "assemble") in edges
