"""Asserts security headers + TrustedHost behaviour on the live ASGI stack.

These tests boot the real `app` (with CORS, SecurityHeaders, TrustedHost
all wired in) and hit `/health` to keep the surface tiny and avoid the
LangGraph stub plumbing that `test_chat_endpoint.py` needs.
"""
from __future__ import annotations

import httpx
import pytest
from httpx import ASGITransport


@pytest.mark.asyncio
async def test_should_set_baseline_security_headers_when_request_succeeds() -> None:
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/health")

    assert r.status_code == 200
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in r.headers["permissions-policy"]


@pytest.mark.asyncio
async def test_should_omit_hsts_when_request_is_plain_http() -> None:
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/health")

    assert "strict-transport-security" not in r.headers


@pytest.mark.asyncio
async def test_should_set_hsts_when_x_forwarded_proto_is_https() -> None:
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/health", headers={"X-Forwarded-Proto": "https"})

    assert r.headers["strict-transport-security"].startswith("max-age=63072000")
    assert "includeSubDomains" in r.headers["strict-transport-security"]


@pytest.mark.asyncio
async def test_should_reject_request_when_host_header_not_trusted() -> None:
    from app.main import app

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://evil.example.com",
    ) as ac:
        r = await ac.get("/health")

    assert r.status_code == 400
