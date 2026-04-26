"""Compile the LangGraph ReAct agent.

We use `create_react_agent` from the prebuilt package — it gives us the
tool-call loop, error handling (`handle_tool_errors=True`), and streaming
support without hand-rolling a StateGraph. Plan §7.1 shows a more elaborate
graph shape; if we later need a language router or an off-topic guard as a
dedicated node, swap this factory for an explicit StateGraph without
changing the rest of the codebase.

Provider abstraction lives in `_make_model()` — dispatch on
`settings.llm_provider`. Adding Anthropic = a new branch here + an
`anthropic_api_key` field on `Settings`.
"""
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.prebuilt import create_react_agent

from app.agent.prompts import PERSONA
from app.agent.tools import ALL_TOOLS
from app.core.config import settings

if TYPE_CHECKING:
    from langgraph.pregel import Pregel


def _make_model() -> BaseChatModel:
    """Single seam for LLM provider selection. Reads `settings.llm_*`
    fields so consumers stay provider-neutral."""
    if settings.llm_provider == "openai":
        return ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key,
            temperature=settings.llm_temperature,
            max_retries=3,
            timeout=settings.llm_timeout,
            streaming=True,
        )
    raise ValueError(f"unknown llm_provider: {settings.llm_provider}")


def build_compiled_graph() -> "Pregel":
    """Build and compile the agent graph. Call once at app startup.

    Owns the checkpointer's lifetime: each call constructs a fresh
    `InMemorySaver` so tests can run isolated graph instances. The
    `register_thread()` helper in `app.agent.memory` accepts the saver
    explicitly to avoid module-level globals.
    """
    model = _make_model()
    checkpointer = InMemorySaver()
    return create_react_agent(
        model=model,
        tools=ALL_TOOLS,
        prompt=PERSONA,
        checkpointer=checkpointer,
    )


@asynccontextmanager
async def build_graph() -> AsyncIterator["Pregel"]:
    """Async-CM wrapper so `main.py`'s lifespan stays uniform when we later
    switch to checkpointers that need an async context (Redis/Postgres)."""
    graph = build_compiled_graph()
    yield graph
    # No-op for in-memory; future Redis/Postgres saver disposal goes here.
