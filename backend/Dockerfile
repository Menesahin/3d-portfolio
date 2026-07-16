# syntax=docker/dockerfile:1.7
# Multi-stage build — per plan §8.8.
# Target image ≈ <180 MB. Shell-form CMD required for ${PORT} expansion on Railway.

FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_PROGRESS=1
WORKDIR /app

# Install dependencies first for layer caching.
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

COPY . .

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev


FROM python:3.13-slim
ARG APP_VERSION=dev
RUN useradd -m -u 1001 app
COPY --from=builder --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH" \
    APP_VERSION=${APP_VERSION} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
USER app
WORKDIR /app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:${PORT:-8000}/health').status == 200 else 1)"
# IMPORTANT: --workers 1 is a hard invariant, not a perf default.
# InMemorySaver (LangGraph checkpointer) and slowapi's in-memory rate-limit
# store both live in-process. Multiple workers silo their state silently and
# leak rate-limit + thread/session guarantees. Swap to AsyncRedisSaver +
# Redis-backed slowapi store before scaling out.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
