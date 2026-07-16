"""Dependency providers for FastAPI routes."""
from typing import Any, cast

from fastapi import Request
from langgraph.pregel import Pregel

type CompiledGraph = Pregel[Any, Any, Any, Any]


def get_graph(request: Request) -> CompiledGraph:
    """Return the compiled LangGraph shared via app.state.graph."""
    graph = getattr(request.app.state, "graph", None)
    if graph is None:
        raise RuntimeError("graph not initialised — check lifespan wiring")
    return cast(CompiledGraph, graph)
