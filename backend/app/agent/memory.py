"""Per-thread session bookkeeping for the LangGraph agent (plan §7.4).

The `InMemorySaver` is owned by the compiled graph (see
`graph.py::build_compiled_graph`). To stop per-thread state from
accumulating across hours of public traffic without a redeploy, every
chat turn calls `register_thread(saver, thread_id)`. The bookkeeping
deque is bounded; once it overflows, the oldest thread's persisted
state is dropped via `saver.delete_thread()`. Active sessions stay
warm because we touch the deque on every turn.

Single-instance only — `InMemorySaver` lives in this process's memory,
so running uvicorn with `--workers > 1` silos thread state per worker.
Upgrade path: swap to `AsyncRedisSaver` from
`langgraph-checkpoint-redis` inside `build_compiled_graph()`.

Per-thread cap caveat: this LRU bounds the *number of threads* the saver
holds, not the *messages per thread*. A single chatty visitor's
checkpoint still grows unbounded. `chat.py` logs a `chat.thread_history_exceeded`
warning when a thread crosses `Settings.max_thread_history` so we get
prod signal; the real fix is `RemoveMessage` + `aupdate_state` (or a
running summary), out of v1 scope.
"""
from collections import deque
from contextlib import suppress
from threading import Lock
from typing import Any

from langgraph.checkpoint.base import BaseCheckpointSaver

from app.core.logging import log

# Cap chosen so a small VPS process never exceeds a few MB of persisted
# message history while still letting a typical visitor's session stay
# warm across multiple turns. Adjustable via env later if needed.
MAX_THREADS = 256

_recent_threads: deque[str] = deque()
_thread_lock = Lock()


def register_thread(saver: BaseCheckpointSaver[Any], thread_id: str) -> None:
    """Mark `thread_id` as the most-recently-used. If we now hold more
    threads than `MAX_THREADS`, evict the oldest via the supplied saver.
    Idempotent on existing thread_ids (touch-to-front)."""
    with _thread_lock:
        with suppress(ValueError):
            _recent_threads.remove(thread_id)
        _recent_threads.append(thread_id)

        while len(_recent_threads) > MAX_THREADS:
            evict = _recent_threads.popleft()
            try:
                saver.delete_thread(evict)
                log.info("checkpointer.evicted", thread_id=evict)
            except Exception:
                # Best-effort eviction. Logging-only — a failure here
                # only means the saver keeps an extra thread until the
                # next overflow, which the deque will catch.
                log.exception("checkpointer.evict_failed", thread_id=evict)
