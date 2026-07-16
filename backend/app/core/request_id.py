"""ASGI middleware that stamps every response with `X-Request-Id`.

Generates a UUID hex per HTTP request, exposes it on `request.state.request_id`
for handlers to pick up (so log correlation IDs match the wire header), and
appends it to the response's outgoing header list. Using raw ASGI rather
than `BaseHTTPMiddleware` lets us mutate streaming responses too — the
SSE `/chat` route sends `text/event-stream` which is the exact case where
header injection via BaseHTTP can race the first chunk.

If an upstream proxy already supplied an `X-Request-Id`, we honour it so
log lines from the load balancer and the app share one trace key.
"""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from typing import Any, cast

Scope = dict[str, Any]
Message = dict[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]

_HEADER_NAME = b"x-request-id"


class RequestIdMiddleware:
    """Generate or propagate `X-Request-Id` and attach it to every response."""

    def __init__(self, app: Callable[..., Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        # Honour an inbound X-Request-Id if the proxy injected one — this
        # keeps traces stitched across hops. Otherwise mint a fresh UUID.
        request_id = _inbound_request_id(scope) or uuid.uuid4().hex

        # Stash on the ASGI state mapping so route handlers can read
        # `request.state.request_id`. Starlette materialises `state` from
        # `scope["state"]` lazily, so we just seed the dict here.
        state = scope.setdefault("state", {})
        state["request_id"] = request_id

        async def _send_with_header(message: Message) -> None:
            if message.get("type") == "http.response.start":
                headers: list[tuple[bytes, bytes]] = list(message.get("headers", []))
                # setdefault-style: a route handler may have set its own.
                if not any(name == _HEADER_NAME for name, _ in headers):
                    headers.append((_HEADER_NAME, request_id.encode("latin-1")))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, _send_with_header)


def _inbound_request_id(scope: Scope) -> str | None:
    """Return the inbound X-Request-Id header, sanitised."""
    headers = cast(list[tuple[bytes, bytes]], scope.get("headers", []))
    for name, value in headers:
        if name == _HEADER_NAME:
            try:
                candidate = value.decode("latin-1").strip()
            except UnicodeDecodeError:
                return None
            # Cap at 128 chars to defeat header-pollution attacks; require
            # at least one char to avoid blank trace ids.
            if 1 <= len(candidate) <= 128:
                return candidate
            return None
    return None
