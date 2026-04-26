"""ASGI middleware that rejects oversized request bodies at the edge.

Pydantic's per-field `max_length` only fires AFTER Starlette has read the
full body into memory, so a hostile client can still force the server to
allocate hundreds of MB for a body we'd reject. This middleware peeks the
`Content-Length` header on every HTTP request and short-circuits with a
413 Payload Too Large response when it exceeds the configured cap.

Picked raw ASGI over `BaseHTTPMiddleware` so:
  * the rejection happens BEFORE the request body is consumed (BaseHTTP
    pre-buffers in some versions of Starlette),
  * we don't need to plumb structlog / async context just to write four
    bytes of JSON.

For chunked transfer encoding (no Content-Length header), we let the
request through and rely on the Pydantic-level caps. Browser clients
always set Content-Length on POST bodies, so this is a deliberate edge
case for hand-crafted curl/programmatic clients.
"""
from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

Scope = dict[str, Any]
Message = dict[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]


class BodySizeLimitMiddleware:
    """Reject HTTP requests whose declared Content-Length exceeds `max_bytes`."""

    def __init__(self, app: Callable[..., Awaitable[None]], max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Only HTTP requests have bodies; lifespan + websocket pass through.
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        # Headers in ASGI are list[tuple[bytes, bytes]] — case-insensitive
        # but conventionally lowercased.
        content_length: int | None = None
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    content_length = int(value.decode("latin-1"))
                except (UnicodeDecodeError, ValueError):
                    content_length = None
                break

        if content_length is not None and content_length > self.max_bytes:
            await _reject_413(send, self.max_bytes)
            return

        await self.app(scope, receive, send)


async def _reject_413(send: Send, max_bytes: int) -> None:
    """Emit a minimal 413 Payload Too Large JSON response."""
    body = json.dumps(
        {
            "error": "payload_too_large",
            "detail": f"Request body exceeds {max_bytes} bytes.",
        },
    ).encode("utf-8")
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("latin-1")),
            ],
        },
    )
    await send({"type": "http.response.body", "body": body, "more_body": False})
