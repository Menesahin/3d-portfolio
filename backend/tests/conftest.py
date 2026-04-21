"""Shared fixtures — no network dependencies."""
import os

# Supply a placeholder API key so pydantic-settings boots in tests.
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fixture")
os.environ.setdefault("LOG_LEVEL", "WARNING")
