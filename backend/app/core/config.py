"""Env-driven settings (pydantic-settings v2)."""
from typing import Annotated, Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # LLM provider abstraction. The seam where `_make_model()` dispatches
    # in `graph.py`. Adding Anthropic = new branch + `anthropic_api_key`
    # alias; consumers keep reading `settings.llm_*`.
    llm_provider: Literal["openai"] = "openai"

    # `validation_alias=AliasChoices(...)` keeps existing OPENAI_* env
    # vars working while new code reads provider-neutral names. Lets us
    # rename without forcing a Railway / .env redeploy.
    llm_api_key: str = Field(
        validation_alias=AliasChoices("LLM_API_KEY", "OPENAI_API_KEY"),
    )
    llm_model: str = Field(
        default="gpt-4.1",
        validation_alias=AliasChoices("LLM_MODEL", "OPENAI_MODEL"),
    )
    llm_temperature: float = Field(
        default=0.6,
        ge=0.0,
        le=2.0,
        validation_alias=AliasChoices("LLM_TEMPERATURE", "OPENAI_TEMPERATURE"),
    )
    llm_timeout: int = Field(
        default=30,
        ge=5,
        le=300,
        validation_alias=AliasChoices("LLM_TIMEOUT", "OPENAI_TIMEOUT"),
    )
    # Cost + abuse caps. `max_tokens` bounds a single LLM response (a runaway
    # or jailbroken reply otherwise consumes the model's full output budget,
    # 16k+ on gpt-4.1). 1024 fits typical ~150-token portfolio replies with
    # plenty of headroom; raise via env if a tool needs to dump long content.
    llm_max_output_tokens: int = Field(
        default=1024,
        ge=64,
        le=8192,
        validation_alias=AliasChoices("LLM_MAX_OUTPUT_TOKENS", "OPENAI_MAX_TOKENS"),
    )
    # `recursion_limit` caps agent <-> tool steps inside one LangGraph turn.
    # LangGraph's default is 25; our ReAct loop normally fires 3-5 tools per
    # turn so 12 protects against runaway loops while leaving headroom.
    llm_recursion_limit: int = Field(
        default=12,
        ge=4,
        le=50,
        validation_alias=AliasChoices("LLM_RECURSION_LIMIT", "LANGGRAPH_RECURSION_LIMIT"),
    )

    # `NoDecode` skips the dotenv source's automatic JSON decoding so our
    # field_validator can accept the simpler "a,b,c" notation in .env files.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
    )

    # Allowed Host header values (anti host-header-injection). Same
    # "a,b,c" env-var notation as cors_origins. Empty list rejects every
    # request — fail-closed by design (see brief §2). In prod the operator
    # sets TRUSTED_HOSTS=portfolio.example.com,api.example.com.
    trusted_hosts: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "testserver", "test"],
    )

    log_level: str = "INFO"

    # Per-IP rate limiting on /chat. Defaults are operator-tunable via env.
    # Single-worker uvicorn → in-memory store; documented in rate_limit.py.
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = Field(default=10, ge=1)
    rate_limit_per_hour: int = Field(default=60, ge=1)

    # v2 tracing toggles (§7.7) — wired but off by default.
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str | None = None
    langsmith_tracing: bool = False
    langsmith_api_key: str | None = None
    langsmith_project: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                import json

                return json.loads(stripped)
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return v

    @field_validator("cors_origins", mode="after")
    @classmethod
    def _validate_cors_origins(cls, v: list[str]) -> list[str]:
        # Reject empty entries (a `,,localhost,` typo) and the wildcard
        # `*` — Starlette's CORSMiddleware accepts it but combined with
        # `allow_credentials=True` the browser silently rejects every
        # request, which is hard to debug. Force the operator to be
        # explicit.
        cleaned: list[str] = []
        for entry in v:
            stripped = entry.strip()
            if not stripped:
                continue
            if stripped == "*":
                raise ValueError(
                    "cors_origins must list explicit URLs; '*' is not allowed",
                )
            if not (stripped.startswith("http://") or stripped.startswith("https://")):
                raise ValueError(
                    f"cors_origins entry {stripped!r} must start with http(s)://",
                )
            cleaned.append(stripped)
        if not cleaned:
            raise ValueError("cors_origins must list at least one origin")
        return cleaned

    @field_validator("trusted_hosts", mode="before")
    @classmethod
    def _split_trusted_hosts(cls, v: object) -> object:
        # Mirror _split_cors_origins so operators get one consistent
        # "a,b,c" notation across the env-var surface.
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                import json

                return json.loads(stripped)
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return v

    @field_validator("trusted_hosts", mode="after")
    @classmethod
    def _validate_trusted_hosts(cls, v: list[str]) -> list[str]:
        # Fail-closed: an empty/whitespace-only env var must NOT silently
        # become "*". Force the operator to be explicit. Reject "*" too,
        # since the whole point is host-header injection defense.
        cleaned: list[str] = []
        for entry in v:
            stripped = entry.strip()
            if not stripped:
                continue
            if stripped == "*":
                raise ValueError(
                    "trusted_hosts must list explicit hostnames; '*' is not allowed",
                )
            cleaned.append(stripped)
        if not cleaned:
            raise ValueError(
                "trusted_hosts must list at least one hostname (fail-closed)",
            )
        return cleaned


settings = Settings()  # type: ignore[call-arg]
