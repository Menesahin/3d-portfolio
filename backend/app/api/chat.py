"""POST /chat — SSE stream of tokens + UI tool events.

Per plan §8.2: StreamingResponse with `text/event-stream`, disables upstream
buffering, honours `request.is_disconnected()`, and lets `CancelledError`
propagate so LangGraph can tear its task tree down when the browser leaves.
"""
import asyncio
import json
import re
import time
import uuid
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Annotated

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


# ---------------------------------------------------------------------------
#  Input sanitisation — defence-in-depth layer for prompt-injection markers.
#
#  This is NOT a substitute for the persona's instruction-resistance prefix;
#  it strips obvious tokens that mimic role boundaries (chat-template fakes,
#  system-tag bait) before the message reaches the agent. Pydantic already
#  caps total length at 4000 chars; we only care about pattern removal here.
# ---------------------------------------------------------------------------

# Control-character stripper — keep \n (\x0a) and \t (\x09); strip the rest of
# the C0 range plus DEL (\x7f). Modern terminals/JSON shouldn't carry these.
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")

# Role-boundary / chat-template markers that attackers paste to fake a system
# turn. Case-insensitive. We delete the token outright — replacing with a
# space would still let the surrounding text read like an instruction header.
_INJECTION_MARKERS_RE = re.compile(
    r"(?i)("
    r"<\s*/?\s*system[^>]*>"
    r"|<\s*/?\s*assistant[^>]*>"
    r"|<\s*/?\s*user[^>]*>"
    r"|\[/?INST\]"
    r"|<\|im_start\|>"
    r"|<\|im_end\|>"
    r"|<\|endoftext\|>"
    r"|###\s*(?:system|instruction|assistant|user|human)\s*:?"
    r")"
)

# Cap consecutive newlines at 2 so a wall of blanks can't create a fake gap
# that visually re-frames text as a new "section" to the model.
_NEWLINE_RUN_RE = re.compile(r"\n{3,}")


def _sanitise_user_content(content: str) -> tuple[str, bool]:
    """Strip control chars + chat-template-style injection markers.

    Returns the cleaned content and a flag indicating whether any pattern
    matched, so the caller can emit a structured warning log when it does.
    """
    matched = False
    cleaned = _CONTROL_CHARS_RE.sub("", content)
    if cleaned != content:
        matched = True
    after_markers = _INJECTION_MARKERS_RE.sub("", cleaned)
    if after_markers != cleaned:
        matched = True
    collapsed = _NEWLINE_RUN_RE.sub("\n\n", after_markers)
    return collapsed, matched


def _to_lc_messages(req: ChatRequest) -> list:
    """Convert incoming role/content pairs to LangChain messages.

    User content is run through `_sanitise_user_content` first so chat-
    template / role-tag injection markers are stripped before the agent
    sees them. Assistant + system roles in the request are echoes of prior
    server-emitted content (replayed history) and are left untouched.
    """
    out: list = []
    for m in req.messages:
        if m.role == "user":
            cleaned, matched = _sanitise_user_content(m.content)
            if matched:
                log.warning(
                    "chat.input_sanitised",
                    original_length=len(m.content),
                    cleaned_length=len(cleaned),
                )
            out.append(HumanMessage(content=cleaned))
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
    graph: Annotated["Pregel", Depends(get_graph)],
) -> StreamingResponse:
    # Prefer the id minted by `RequestIdMiddleware` so the SSE `ready`
    # frame, the structlog binding, and the wire `X-Request-Id` header
    # all match. Falls back to a fresh UUID for unit tests that exercise
    # the route without the middleware chain.
    request_id = getattr(request.state, "request_id", None) or uuid.uuid4().hex
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
        # Watchdog: warn when a thread's persisted history grows past the
        # configured cap. Pydantic already caps each *inbound* body at 20
        # messages and the 256-thread LRU evicts cold threads, but the
        # checkpointer itself accumulates every turn — so a single chatty
        # visitor can still balloon their thread state. We don't trim here
        # (would need `RemoveMessage` + `aupdate_state`, out of v1 scope);
        # logging gives us prod signal to know if this is real.
        try:
            state = await graph.aget_state(
                {"configurable": {"thread_id": thread_id}},
            )
            history = state.values.get("messages", []) if state and state.values else []
            if len(history) > settings.max_thread_history:
                log.warning(
                    "chat.thread_history_exceeded",
                    thread_id=thread_id,
                    history_len=len(history),
                    cap=settings.max_thread_history,
                )
        except Exception:
            # Don't let an introspection failure block the actual turn.
            log.exception("chat.thread_history_check_failed", thread_id=thread_id)
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
        # SSE max-duration watchdog. We can't wrap an async generator in
        # `asyncio.wait_for` cleanly, so we track wall-clock elapsed inside
        # the loop and break out with a typed `error` SSE event when the
        # cap is exceeded. This bounds total stream time even if OpenAI
        # stalls mid-stream or LangGraph chases its tail in a tool loop.
        deadline = time.monotonic() + settings.sse_max_duration_seconds
        timed_out = False

        try:
            # First byte: request_id so the client can correlate with backend logs.
            yield _sse("ready", {"request_id": request_id})

            async for chunk in graph.astream(
                inputs,
                config=config,
                stream_mode=["messages", "custom"],
            ):
                if time.monotonic() >= deadline:
                    timed_out = True
                    break
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

            if timed_out:
                # Emit a typed error frame so the client UI can swap in a
                # retry affordance. We deliberately skip the suggestions
                # fallback + done frame: the stream is half-finished and
                # any synthesised follow-up chips would be misleading.
                log.warning(
                    "chat.timeout",
                    deadline_seconds=settings.sse_max_duration_seconds,
                )
                yield _sse(
                    "error",
                    ErrorEvent(message="agent timeout - please try again").model_dump(),
                )
                return

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
