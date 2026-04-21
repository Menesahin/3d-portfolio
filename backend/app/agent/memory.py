"""In-process session checkpointer (plan §7.4).

Good enough for a single-instance personal portfolio. Upgrade path when real
concurrency appears: swap to `AsyncRedisSaver` from
`langgraph-checkpoint-redis` inside `build_graph()`.
"""
from langgraph.checkpoint.memory import InMemorySaver

_checkpointer: InMemorySaver | None = None


def get_checkpointer() -> InMemorySaver:
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = InMemorySaver()
    return _checkpointer
