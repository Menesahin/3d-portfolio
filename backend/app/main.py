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

from app.agent.graph import build_graph
from app.api import chat, health
from app.core.config import settings
from app.core.logging import configure_logging, log


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging(settings.log_level)
    log.info("startup", model=settings.openai_model, cors=settings.cors_origins)
    async with build_graph() as graph:
        app.state.graph = graph
        yield
    log.info("shutdown")


app = FastAPI(
    title="enes-portfolio-backend",
    version="0.1.0",
    lifespan=lifespan,
)

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
