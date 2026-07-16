"""SSE contract test — proves the /chat endpoint shape without touching OpenAI.

The real graph is replaced via `app.dependency_overrides[get_graph]` with a
tiny stub that emits a scripted mix of token + ui events. Per plan §8.12 we
cap the stream with a sentinel `done` event so `httpx.ASGITransport` can't
hang (see httpx#2186).
"""
from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest
from httpx import ASGITransport

from app.agent.events import CameraFocus, MascotMove
from app.deps import get_graph


class StubGraph:
    """Pretends to be a LangGraph `CompiledStateGraph`. Only implements
    `.astream(...)` — the only method `api/chat.py` calls."""

    # `chat.py` reads `graph.checkpointer` to register the thread for
    # LRU eviction. Tests don't exercise that path; `None` makes the
    # call a no-op.
    checkpointer = None

    async def astream(
        self,
        _inputs: dict[str, Any],
        **_kwargs: Any,
    ) -> AsyncIterator[tuple[str, Any]]:
        # Mirror real LangGraph's stream_mode=["messages","custom"] output shape.

        # 1. custom event (UI tool fire)
        yield ("custom", CameraFocus(target="projects").model_dump(mode="json"))
        yield ("custom", MascotMove(zone="projects").model_dump(mode="json"))

        # 2. token chunks from the agent node (narrative reply)
        class _Chunk:
            content = "Hi "

        yield ("messages", (_Chunk(), {"langgraph_node": "agent"}))

        class _Chunk2:
            content = "there."

        yield ("messages", (_Chunk2(), {"langgraph_node": "agent"}))


@pytest.mark.asyncio
async def test_should_stream_ready_token_ui_and_done_when_chat_invoked() -> None:
    from app.main import app

    app.dependency_overrides[get_graph] = lambda: StubGraph()

    transport = ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        ac.stream(
            "POST",
            "/chat",
            json={"messages": [{"role": "user", "content": "hi"}]},
        ) as r,
    ):
        assert r.status_code == 200
        events: list[str] = []
        async for line in r.aiter_lines():
            if line.startswith("event:"):
                events.append(line.split(":", 1)[1].strip())
            if '"type": "done"' in line:
                break

    app.dependency_overrides.clear()

    assert events[0] == "ready"
    assert "ui" in events
    assert "token" in events
    assert events[-1] == "done"


@pytest.mark.asyncio
async def test_should_return_200_on_health() -> None:
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_should_report_deployed_version() -> None:
    from app.core.config import settings
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/version")

    assert r.status_code == 200
    assert r.json() == {"commit": settings.app_version}


class _ReadyStubGraph:
    """Graph stub that mimics a fully-wired agent for the /ready happy path."""

    checkpointer = object()  # truthy sentinel — readiness only checks `is not None`


@pytest.mark.asyncio
async def test_should_return_200_and_ready_shape_when_all_checks_pass() -> None:
    from app.main import app

    app.dependency_overrides[get_graph] = lambda: _ReadyStubGraph()

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/ready")

    app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ready"
    assert body["checks"] == {"graph": True, "checkpointer": True, "llm_key": True}


@pytest.mark.asyncio
async def test_should_return_503_when_checkpointer_missing() -> None:
    from app.main import app

    # StubGraph.checkpointer is None — readiness must flip to 503.
    app.dependency_overrides[get_graph] = lambda: StubGraph()

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/ready")

    app.dependency_overrides.clear()

    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["checkpointer"] is False
    assert body["checks"]["graph"] is True
