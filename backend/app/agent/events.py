"""SSE event models + `UiEvent` discriminated union.

The union mirrors the frontend's `src/types/tools.ts`. Keeping one authoritative
shape here lets Pydantic validate tool outputs before they reach the wire and
lets the TypeScript side parse them via `kind` without runtime guards.
"""
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
#  Zone / value literals — must stay in sync with src/world/zones.ts
# ---------------------------------------------------------------------------

ZoneId = Literal["hub", "experience", "projects", "skills", "gallery", "contact"]
CameraTarget = Literal["hub", "experience", "projects", "skills", "gallery", "contact", "overview"]
CameraZoom = Literal["close", "medium", "wide"]
DartDirection = Literal["up", "down", "left", "right", "away"]

EmoteIcon = Literal[
    "heart", "question", "lightbulb", "sparkle", "zzz", "exclamation", "star", "note",
]
MascotGesture = Literal[
    "wave", "point", "thumbs_up", "head_tilt", "bow", "dance", "flip", "spin_happy", "shy",
]
MascotExpression = Literal["idle", "happy", "surprised", "thinking", "sad", "wink"]

ProjectId = Literal["vocabuddy", "shotmock", "claude-voice"]
CompanyId = Literal["nar-sistem", "formica", "ing-bank"]
SkillGroup = Literal["ai", "backend", "frontend", "devops"]


# ---------------------------------------------------------------------------
#  UiEvent — one variant per tool effect the frontend knows how to handle.
# ---------------------------------------------------------------------------

class CameraFocus(BaseModel):
    kind: Literal["camera.focus"] = "camera.focus"
    target: CameraTarget
    duration: float | None = None


class CameraZoomEvent(BaseModel):
    kind: Literal["camera.zoom"] = "camera.zoom"
    level: CameraZoom


class MascotMove(BaseModel):
    kind: Literal["mascot.move"] = "mascot.move"
    zone: CameraTarget


class MascotOrbit(BaseModel):
    kind: Literal["mascot.orbit"] = "mascot.orbit"
    target: ZoneId
    revolutions: int | None = None


class MascotDart(BaseModel):
    kind: Literal["mascot.dart"] = "mascot.dart"
    direction: DartDirection


class MascotReturnToHub(BaseModel):
    kind: Literal["mascot.return_to_hub"] = "mascot.return_to_hub"


class MascotGestureEvent(BaseModel):
    kind: Literal["mascot.gesture"] = "mascot.gesture"
    gesture: MascotGesture


class MascotPointAt(BaseModel):
    kind: Literal["mascot.point_at"] = "mascot.point_at"
    target: Literal["hub", "experience", "projects", "skills", "gallery", "contact", "user"]


class MascotEmote(BaseModel):
    kind: Literal["mascot.emote"] = "mascot.emote"
    icon: EmoteIcon


class MascotExpressionEvent(BaseModel):
    kind: Literal["mascot.expression"] = "mascot.expression"
    face: MascotExpression


class WorldHighlightZone(BaseModel):
    kind: Literal["world.highlight_zone"] = "world.highlight_zone"
    zone: ZoneId


class WorldShowHologram(BaseModel):
    kind: Literal["world.show_hologram"] = "world.show_hologram"
    zone: ZoneId
    contentId: str  # noqa: N815 — camelCase intentional (matches frontend)


class WorldActivateTerminal(BaseModel):
    kind: Literal["world.activate_terminal"] = "world.activate_terminal"


class WorldReset(BaseModel):
    kind: Literal["world.reset"] = "world.reset"


class ContentExperience(BaseModel):
    kind: Literal["content.experience"] = "content.experience"
    company: CompanyId


class ContentProject(BaseModel):
    kind: Literal["content.project"] = "content.project"
    project: ProjectId


class ContentSkillGroup(BaseModel):
    kind: Literal["content.skill_group"] = "content.skill_group"
    group: SkillGroup


class ContentContactCard(BaseModel):
    kind: Literal["content.contact_card"] = "content.contact_card"


UiEvent = Annotated[
    Union[  # noqa: UP007 — Pydantic discriminator needs `Union`
        CameraFocus,
        CameraZoomEvent,
        MascotMove,
        MascotOrbit,
        MascotDart,
        MascotReturnToHub,
        MascotGestureEvent,
        MascotPointAt,
        MascotEmote,
        MascotExpressionEvent,
        WorldHighlightZone,
        WorldShowHologram,
        WorldActivateTerminal,
        WorldReset,
        ContentExperience,
        ContentProject,
        ContentSkillGroup,
        ContentContactCard,
    ],
    Field(discriminator="kind"),
]


# ---------------------------------------------------------------------------
#  SSE envelope events
# ---------------------------------------------------------------------------

class TokenEvent(BaseModel):
    type: Literal["token"] = "token"
    delta: str


class UiEventEnvelope(BaseModel):
    type: Literal["ui"] = "ui"
    event: UiEvent


class DoneEvent(BaseModel):
    type: Literal["done"] = "done"
    request_id: str | None = None


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    message: str


# ---------------------------------------------------------------------------
#  Request model
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    thread_id: str | None = None
