"""Compile the LangGraph ReAct agent.

We use `create_react_agent` from the prebuilt package — it gives us the
tool-call loop, error handling (`handle_tool_errors=True`), and streaming
support without hand-rolling a StateGraph. Plan §7.1 shows a more elaborate
graph shape; if we later need a language router or an off-topic guard as a
dedicated node, swap this factory for an explicit StateGraph without
changing the rest of the codebase.
"""
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.agent.memory import get_checkpointer
from app.agent.prompts import PERSONA
from app.agent.tools import ALL_TOOLS
from app.core.config import settings

if TYPE_CHECKING:
    from langgraph.pregel import Pregel


def _make_model() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=0.6,
        max_retries=3,
        timeout=30,
        streaming=True,
    )


def build_compiled_graph() -> "Pregel":
    """Build and compile the agent graph. Call once at app startup."""
    model = _make_model()
    return create_react_agent(
        model=model,
        tools=ALL_TOOLS,
        prompt=PERSONA,
        checkpointer=get_checkpointer(),
    )


@asynccontextmanager
async def build_graph() -> AsyncIterator["Pregel"]:
    """Async-CM wrapper so `main.py`'s lifespan stays uniform when we later
    switch to checkpointers that need an async context (Redis/Postgres)."""
    graph = build_compiled_graph()
    try:
        yield graph
    finally:
        # No-op for in-memory; Redis/Postgres checkpointers would dispose here.
        pass
