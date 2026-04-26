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

import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agent.events import ChatRequest, ChatSuggestions, DoneEvent, ErrorEvent, TokenEvent
from app.agent.fallback_suggestions import derive as derive_fallback_suggestions
from app.agent.memory import register_thread
from app.core.config import settings
from app.core.logging import log
from app.core.rate_limit import CHAT_LIMITS, limiter
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
@limiter.limit(";".join(CHAT_LIMITS))
async def chat(
    request: Request,
    body: ChatRequest,
    graph: "Pregel" = Depends(get_graph),
) -> StreamingResponse:
    request_id = uuid.uuid4().hex
    thread_id = body.thread_id or request_id
    # Bind request/thread ids into structlog's context so every log call
    # downstream — even from inside graph nodes / tool functions — picks
    # them up automatically. Cleared inside the generator's `finally`.
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        thread_id=thread_id,
    )
    # Pregel exposes its checkpointer via the `.checkpointer` attribute.
    # We register the thread for LRU bookkeeping so abandoned sessions
    # eventually get evicted instead of growing the saver forever.
    if graph.checkpointer is not None:
        register_thread(graph.checkpointer, thread_id)
    log.info("chat.start", msg_count=len(body.messages))

    config = {
        "configurable": {"thread_id": thread_id},
        "metadata": {"request_id": request_id, "thread_id": thread_id},
        "tags": ["chat"],
        # Cap agent <-> tool steps. LangGraph default is 25; our ReAct loop
        # typically fires 3-5 tools per turn so 12 protects against infinite
        # tool loops if the model misbehaves. Tunable via LLM_RECURSION_LIMIT.
        "recursion_limit": settings.llm_recursion_limit,
    }
    inputs = {"messages": _to_lc_messages(body)}

    async def generator() -> AsyncIterator[str]:
        # Track state across the stream so we can synthesise a safety-net
        # `chat.suggestions` event if the LLM forgets to call the tool.
        saw_suggestions = False
        last_content_event: dict | None = None
        # Token-usage accumulator. With `stream_usage=True` on ChatOpenAI,
        # a final AIMessageChunk arrives carrying `usage_metadata`. Multi-
        # turn tool loops produce one usage chunk per LLM call — sum them
        # so the per-turn log reflects total cost. Stays at zeros for
        # providers/stubs that don't emit usage (e.g. test StubGraph).
        usage_totals = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

        try:
            # First byte: request_id so the client can correlate with backend logs.
            yield _sse("ready", {"request_id": request_id})

            async for chunk in graph.astream(
                inputs,
                config=config,
                stream_mode=["messages", "custom"],
            ):
                # Note: in-stream `request.is_disconnected()` polling was
                # removed — Starlette only flips that flag between chunks
                # anyway, and a long LLM stall would block the poll for
                # the chunk's duration. We rely on the ASGI server to
                # raise `CancelledError` into this task when the client
                # leaves; the `except asyncio.CancelledError` below
                # logs + re-raises so LangGraph tears its task tree down.
                # LangGraph yields (mode, payload) tuples when multiple modes are given.
                if isinstance(chunk, tuple) and len(chunk) == 2:
                    mode, payload = chunk
                else:
                    mode, payload = None, chunk

                if mode == "messages":
                    # payload is (AIMessageChunk, metadata). We forward
                    # only tokens emitted from the agent node — tool-arg
                    # token noise comes from the "tools" node and would
                    # leak JSON into the prose stream.
                    msg, meta = payload
                    node = meta.get("langgraph_node") if isinstance(meta, dict) else None
                    content = getattr(msg, "content", "") or ""
                    if node == "agent" and content:
                        yield _sse(
                            "token",
                            TokenEvent(delta=str(content)).model_dump(),
                        )
                    # Capture usage_metadata from the closing chunk emitted
                    # by `stream_usage=True`. Sum across LLM calls so a
                    # multi-step tool loop reports cumulative tokens. Guard
                    # with getattr/isinstance — chunks from non-OpenAI
                    # providers or test stubs won't carry the field.
                    usage = getattr(msg, "usage_metadata", None)
                    if isinstance(usage, dict):
                        usage_totals["input_tokens"] += int(usage.get("input_tokens", 0) or 0)
                        usage_totals["output_tokens"] += int(usage.get("output_tokens", 0) or 0)
                        usage_totals["total_tokens"] += int(usage.get("total_tokens", 0) or 0)
                elif mode == "custom":
                    # Already a JSON-serialisable dict from tools.py `_emit`.
                    kind = payload.get("kind") if isinstance(payload, dict) else None
                    if kind == "chat.suggestions":
                        saw_suggestions = True
                    elif kind and kind.startswith("content."):
                        last_content_event = payload
                    yield _sse("ui", {"event": payload})

            # Safety net: small models sometimes forget to call the suggest
            # tool despite the persona shouting about it. Emit a context-
            # aware fallback set keyed off whatever content card we showed
            # this turn so the UI always has chips to render.
            if not saw_suggestions:
                fallback = derive_fallback_suggestions(last_content_event)
                # Validate through the same Pydantic model the LLM tool
                # variant uses, so label/prompt length and the 1-5 item
                # count constraints are enforced on the fallback path too.
                # `model_validate` coerces the plain-dict fallback into
                # Suggestion instances during validation.
                suggestions_event = ChatSuggestions.model_validate({"items": fallback})
                yield _sse(
                    "ui",
                    {"event": suggestions_event.model_dump()},
                )
                log.info("chat.suggestions_fallback", count=len(fallback))

            yield _sse("done", DoneEvent(request_id=request_id).model_dump())
            # Token-usage telemetry. Logged only when the provider actually
            # reported usage (totals stay at 0 for the test StubGraph and
            # any non-OpenAI backend without `stream_usage` support), so
            # cost dashboards don't get polluted with phantom zero rows.
            if usage_totals["total_tokens"] > 0:
                log.info(
                    "chat.usage",
                    input_tokens=usage_totals["input_tokens"],
                    output_tokens=usage_totals["output_tokens"],
                    total_tokens=usage_totals["total_tokens"],
                    model=settings.llm_model,
                )
            log.info("chat.done")
        except asyncio.CancelledError:
            log.info("chat.cancelled")
            raise
        except Exception:
            # Log the full traceback server-side, but never let raw exception
            # text reach the browser. OpenAI errors include API-key hint
            # snippets and Python tracebacks leak internal paths/PII.
            log.exception("chat.error")
            yield _sse(
                "error",
                ErrorEvent(message="agent error - please try again").model_dump(),
            )
        finally:
            # Drop the contextvars binding so a follow-up request that
            # doesn't go through this route can't accidentally inherit
            # this turn's request_id/thread_id.
            structlog.contextvars.clear_contextvars()

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
