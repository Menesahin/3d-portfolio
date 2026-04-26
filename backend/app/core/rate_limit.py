"""Per-IP rate limiting for /chat.

Uses slowapi (a Starlette/FastAPI port of flask-limiter). The limiter is
constructed once at import time so the decorator on `chat()` can bind to a
real object before the app boots. Settings drive the actual numbers, and
slowapi's built-in `enabled` flag lets us turn it off in tests / dev.

Storage is in-process memory — fine for the single-worker uvicorn deploy.
If we ever scale to multiple workers/replicas, swap `storage_uri` to a
shared Redis (`redis://...`) and add `redis` to dependencies.
"""
from __future__ import annotations

import os

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings


def _client_ip(request: Request) -> str:
    """Derive the visitor IP, honouring `X-Forwarded-For` from the proxy.

    Behind Railway / Fly / Nginx, `request.client.host` is the proxy's
    address — every visitor hits the same key and the limiter throttles
    the whole world together. The reverse proxy injects the real chain
    in `X-Forwarded-For: <client>, <proxy1>, <proxy2>`; the leftmost
    entry is the original visitor.

    For direct local hits (curl against uvicorn), the header is absent
    and we fall back to slowapi's stock `get_remote_address`.

    Trust note: this is only safe when the deployment terminates HTTPS
    at a known reverse proxy that overwrites/appends XFF. If the app is
    ever exposed directly to the internet, an attacker can spoof XFF
    and bypass rate limiting per-IP. Document this in the deploy guide.
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        leftmost = forwarded_for.split(",", 1)[0].strip()
        if leftmost:
            return leftmost
    return get_remote_address(request)

# Honour PYTEST_CURRENT_TEST so the existing /chat contract test (and any
# future ones) don't get rate-limited just by running pytest. Operators can
# also flip RATE_LIMIT_ENABLED=false in dev.
_running_under_pytest = "PYTEST_CURRENT_TEST" in os.environ
_enabled = settings.rate_limit_enabled and not _running_under_pytest

# `default_limits` are applied to every route the limiter knows about, but
# we only attach the limiter to /chat via decorator — /health and future
# routes stay unrestricted because they aren't decorated.
CHAT_LIMITS = [
    f"{settings.rate_limit_per_minute}/minute",
    f"{settings.rate_limit_per_hour}/hour",
]

limiter = Limiter(
    key_func=_client_ip,
    enabled=_enabled,
    headers_enabled=True,  # adds X-RateLimit-* response headers
)


async def rate_limit_exceeded_handler(
    _request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    """Return the contract shape required by the brief: JSON body with
    `error`/`detail` and a `Retry-After` header. slowapi's stock handler
    returns plain text, which the SPA can't parse uniformly with other
    backend errors."""
    # `exc.detail` is something like "10 per 1 minute"; surface it so the
    # client can show a useful message without us hand-rolling copy.
    retry_after = getattr(exc, "retry_after", None)
    headers: dict[str, str] = {}
    if retry_after is not None:
        headers["Retry-After"] = str(int(retry_after))
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limited",
            "detail": f"Too many requests ({exc.detail}). Please slow down.",
        },
        headers=headers,
    )
