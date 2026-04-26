"""Shared fixtures — no network dependencies."""
import os

# Supply a placeholder API key so pydantic-settings boots in tests.
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fixture")
os.environ.setdefault("LOG_LEVEL", "WARNING")
# Disable per-IP rate limiting in the test suite. The rate_limit module
# also auto-disables when PYTEST_CURRENT_TEST is set; this is belt+braces
# in case anything imports settings before pytest sets that var.
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
