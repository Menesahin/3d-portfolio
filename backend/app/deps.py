"""Dependency providers for FastAPI routes."""
from typing import TYPE_CHECKING

from fastapi import Request

if TYPE_CHECKING:
    from langgraph.pregel import Pregel


def get_graph(request: Request) -> "Pregel":
    """Return the compiled LangGraph shared via app.state.graph."""
    graph = getattr(request.app.state, "graph", None)
    if graph is None:
        raise RuntimeError("graph not initialised — check lifespan wiring")
    return graph
