"""Structure tests for the LangGraph spine. Compiling the graph does not call
the LLM or DB, so these are cheap and offline."""

import pytest

from graph.build import graph, route_after_critic


def test_graph_has_expected_nodes():
    names = set(graph.get_graph().nodes)
    for node in ["parse_jd", "retrieve_evidence", "gap_analysis", "draft", "critic", "revise", "assemble"]:
        assert node in names


def test_graph_has_critic_loop():
    edges = {(e.source, e.target) for e in graph.get_graph().edges}
    assert ("gap_analysis", "draft") in edges
    assert ("draft", "critic") in edges
    assert ("revise", "critic") in edges  # the self-correction loop


@pytest.mark.parametrize(
    "critique, revisions, expected",
    [
        ({"grounded": True, "overall_score": 0.9}, 0, "assemble"),   # converged
        ({"grounded": False, "overall_score": 0.9}, 0, "revise"),    # fabrication -> revise
        ({"grounded": True, "overall_score": 0.5}, 0, "revise"),     # low score -> revise
        ({"grounded": False, "overall_score": 0.1}, 2, "assemble"),  # budget spent (safety valve)
    ],
)
def test_route_after_critic(critique, revisions, expected):
    state = {"critique": critique, "revision_count": revisions}
    assert route_after_critic(state) == expected
