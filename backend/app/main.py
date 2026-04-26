"""FastAPI application entrypoint.

The compiled LangGraph agent + OpenAI client are built once in `lifespan`
and shared through `app.state`, per plan §8.1. The `/chat` SSE route is
wired in a subsequent step; for now we expose `/health` only so the
Dockerfile + Railway health check can light up before the agent plumbing.
"""
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.agent.graph import build_graph
from app.api import chat, health
from app.core.config import settings
from app.core.logging import configure_logging, log
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.security_headers import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging(settings.log_level)
    log.info(
        "startup",
        provider=settings.llm_provider,
        model=settings.llm_model,
        cors=settings.cors_origins,
    )
    async with build_graph() as graph:
        app.state.graph = graph
        yield
    log.info("shutdown")


app = FastAPI(
    title="enes-portfolio-backend",
    version="0.1.0",
    lifespan=lifespan,
)

# slowapi reads the limiter off `app.state.limiter` inside its decorator;
# the exception handler turns RateLimitExceeded into our JSON contract.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]

# Middleware ordering note: `add_middleware` prepends, so the LAST call
# becomes the OUTERMOST wrapper. Desired outer→inner stack:
#
#   CORSMiddleware            (outermost — preflight 204s must escape
#                              even if inner middleware throws)
#   SecurityHeadersMiddleware (stamps headers on every response, including
#                              CORS preflights and TrustedHost 400s)
#   TrustedHostMiddleware     (innermost gate — rejects bad Host headers
#                              before any route handler runs)
#
# Add order is therefore the reverse: TrustedHost first, then headers,
# then CORS last.
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.trusted_hosts,
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)

app.include_router(health.router)
app.include_router(chat.router)
