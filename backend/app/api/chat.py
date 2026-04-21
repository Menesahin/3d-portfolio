"""POST /chat — SSE stream of tokens + UI tool events.

Per plan §8.2: StreamingResponse with `text/event-stream`, disables upstream
buffering, honours `request.is_disconnected()`, and lets `CancelledError`
propagate so LangGraph can tear its task tree down when the browser leaves.
"""
import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agent.events import ChatRequest, DoneEvent, ErrorEvent, TokenEvent
from app.core.logging import log
from app.deps import get_graph

if TYPE_CHECKING:
    from langgraph.pregel import Pregel


router = APIRouter(tags=["chat"])

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",  # defeats Nginx / Railway edge buffering
}


def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _to_lc_messages(req: ChatRequest) -> list:
    """Convert incoming role/content pairs to LangChain messages."""
    out: list = []
    for m in req.messages:
        if m.role == "user":
            out.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            out.append(AIMessage(content=m.content))
        elif m.role == "system":
            out.append(SystemMessage(content=m.content))
    return out


@router.post("/chat")
async def chat(
    body: ChatRequest,
    request: Request,
    graph: "Pregel" = Depends(get_graph),
) -> StreamingResponse:
    request_id = uuid.uuid4().hex
    thread_id = body.thread_id or request_id
    log.info(
        "chat.start",
        request_id=request_id,
        thread_id=thread_id,
        msg_count=len(body.messages),
    )

    config = {
        "configurable": {"thread_id": thread_id},
        "metadata": {"request_id": request_id, "thread_id": thread_id},
        "tags": ["chat"],
    }
    inputs = {"messages": _to_lc_messages(body)}

    async def generator() -> AsyncIterator[str]:
        try:
            # First byte: request_id so the client can correlate with backend logs.
            yield _sse("ready", {"request_id": request_id})

            async for chunk in graph.astream(
                inputs,
                config=config,
                stream_mode=["messages", "custom"],
            ):
                if await request.is_disconnected():
                    log.info("chat.client_disconnect", request_id=request_id)
                    break

                # LangGraph yields (mode, payload) tuples when multiple modes are given.
                if isinstance(chunk, tuple) and len(chunk) == 2:
                    mode, payload = chunk
                else:
                    mode, payload = None, chunk

                if mode == "messages":
                    # payload is (AIMessageChunk, metadata)
                    msg, meta = payload
                    node = meta.get("langgraph_node") if isinstance(meta, dict) else None
                    content = getattr(msg, "content", "") or ""
                    # Skip tool-arg token noise (which shows up under "tools") — we only
                    # want the final LLM narrative that comes from the agent node.
                    if node in {"agent", "tools"} and content and node != "tools":
                        yield _sse(
                            "token",
                            TokenEvent(delta=str(content)).model_dump(),
                        )
                elif mode == "custom":
                    # Already a JSON-serialisable dict from tools.py `_emit`.
                    yield _sse("ui", {"event": payload})

            yield _sse("done", DoneEvent(request_id=request_id).model_dump())
            log.info("chat.done", request_id=request_id)
        except asyncio.CancelledError:
            log.info("chat.cancelled", request_id=request_id)
            raise
        except Exception as exc:  # noqa: BLE001
            log.exception("chat.error", request_id=request_id)
            yield _sse(
                "error",
                ErrorEvent(message=str(exc)).model_dump(),
            )

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
