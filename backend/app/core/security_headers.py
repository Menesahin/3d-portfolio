"""HTTP security headers middleware.

Applies a baseline of hardening headers to every response. Picked
`BaseHTTPMiddleware` over a raw ASGI middleware because:

  * the surface area is small (headers, no streaming concerns),
  * Starlette/FastAPI 0.115+ docs still treat it as the idiomatic way
    to add cross-cutting response mutations,
  * the existing CORS / TrustedHost middlewares are also class-based,
    so debugging stays consistent.

HSTS is only set when the request was served over HTTPS (either direct
TLS or the reverse proxy forwarded `X-Forwarded-Proto: https`). This
keeps `curl http://localhost:8000` from accidentally pinning HSTS in
local dev.
"""
from __future__ import annotations

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Module-level constants — cheap to share, easy to assert against in tests.
_STATIC_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

# 2 years, applies to subdomains. No `preload` until the operator
# explicitly opts in via the HSTS preload list submission.
_HSTS_VALUE = "max-age=63072000; includeSubDomains"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add baseline hardening headers to every outgoing response."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        for name, value in _STATIC_HEADERS.items():
            # setdefault-style: don't clobber if a route handler set its own.
            response.headers.setdefault(name, value)

        if _is_https(request):
            response.headers.setdefault("Strict-Transport-Security", _HSTS_VALUE)

        return response


def _is_https(request: Request) -> bool:
    """True if the request was served over TLS, directly or via a proxy.

    Starlette's `ProxyHeadersMiddleware` (and uvicorn's `--proxy-headers`)
    rewrite `request.url.scheme` from `X-Forwarded-Proto`, so checking
    the scheme is enough when uvicorn is launched with `--proxy-headers`
    and `--forwarded-allow-ips`. We also peek the raw header as a
    belt+braces fallback for environments where proxy-headers handling
    isn't enabled.
    """
    if request.url.scheme == "https":
        return True
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    # Header may be a comma-separated chain (`https, http`); the
    # leftmost entry is the original client-facing protocol.
    return forwarded_proto.split(",", 1)[0].strip().lower() == "https"
