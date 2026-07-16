"""Liveness + readiness probes.

`/health` (liveness) stays dependency-free so Railway's health check stays
green even when downstream config is broken — a failing liveness probe
triggers a *restart*, which won't fix a missing API key.

`/ready` (readiness) checks the things that must be true for the process
to serve real `/chat` traffic: the LangGraph dependency exists, its
checkpointer is reachable, and an LLM API key is configured. A failing
readiness probe takes the pod out of the load balancer rotation but
doesn't restart it. The probe itself stays cheap — no upstream LLM
ping (would be slow + cost money on every probe; a startup-time smoke
test in `lifespan` is the better place for that).
"""
from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.config import settings
from app.deps import get_graph

if TYPE_CHECKING:
    from langgraph.pregel import Pregel


router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/version")
async def version() -> dict[str, str]:
    """Expose the immutable release identifier for deployment verification."""
    return {"commit": settings.app_version}


@router.get("/ready")
async def ready(
    response: Response,
    graph: Annotated["Pregel", Depends(get_graph)],
) -> dict[str, object]:
    """Readiness probe — green only if the agent can serve a real turn."""
    checks = {
        "graph": graph is not None,
        "checkpointer": getattr(graph, "checkpointer", None) is not None,
        "llm_key": bool(settings.llm_api_key),
    }
    all_ready = all(checks.values())
    response.status_code = (
        status.HTTP_200_OK if all_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    )
    return {"status": "ready" if all_ready else "not_ready", "checks": checks}
