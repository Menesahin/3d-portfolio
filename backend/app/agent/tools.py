"""The mascot's tool palette — one tool per UiEvent variant (plan §6).

Each tool is sync (so `get_stream_writer()` works reliably; see plan §7.3
known gotcha). Tools emit a structured UI event through the stream and
return a ToolMessage so the LLM sees a clean confirmation.
"""
from typing import Annotated

from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.config import get_stream_writer
from langgraph.types import Command

from app.agent.events import (
    CameraFocus,
    CameraTarget,
    CameraZoom,
    CameraZoomEvent,
    ChatSuggestions,
    CompanyId,
    ContentContactCard,
    ContentExperience,
    ContentProject,
    ContentSkillGroup,
    DartDirection,
    EmoteIcon,
    MascotDart,
    MascotEmote,
    MascotExpression,
    MascotExpressionEvent,
    MascotGesture,
    MascotGestureEvent,
    MascotMove,
    MascotOrbit,
    MascotPointAt,
    MascotReturnToHub,
    PointAtTarget,
    ProjectId,
    SkillGroup,
    Suggestion,
    UiEvent,
    WorldReset,
    ZoneId,
)


def _emit(event: UiEvent) -> None:
    """Write a validated UI event to the `custom` stream channel."""
    writer = get_stream_writer()
    # `model_dump` produces the frontend-facing JSON shape (with `kind` field).
    writer(event.model_dump(mode="json"))


def _ack(message: str, tool_call_id: str) -> Command:
    return Command(update={"messages": [ToolMessage(content=message, tool_call_id=tool_call_id)]})


def _emit_ack(event: UiEvent, ack: str, tool_call_id: str) -> Command:
    """Common pattern for the 14 simple "fire UI event + ack" tools.
    Kept as a thin helper rather than a @tool factory — LangChain's
    `@tool` decorator inspects the function signature + name + docstring,
    so the explicit-function-per-tool shape stays. This collapses the
    inside of each tool from two statements to one."""
    _emit(event)
    return _ack(ack, tool_call_id)


# ---------------------------------------------------------------------------
#  Camera
# ---------------------------------------------------------------------------

@tool
def camera_focus(
    target: CameraTarget,
    tool_call_id: Annotated[str, InjectedToolCallId],
    duration: float | None = None,
) -> Command:
    """Dolly the camera to a named zone or "overview". Smooth cinematic transition."""
    return _emit_ack(CameraFocus(target=target, duration=duration), f"camera focused on {target}", tool_call_id)


@tool
def camera_zoom(
    level: CameraZoom,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Zoom the camera to close / medium / wide around the current target."""
    return _emit_ack(CameraZoomEvent(level=level), f"camera zoom set to {level}", tool_call_id)


# ---------------------------------------------------------------------------
#  Mascot movement
# ---------------------------------------------------------------------------

@tool
def mascot_move_to(
    zone: CameraTarget,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Fly the mascot to the given zone (or back to 'hub')."""
    return _emit_ack(MascotMove(zone=zone), f"mascot moving to {zone}", tool_call_id)


@tool
def mascot_orbit(
    target: ZoneId,
    tool_call_id: Annotated[str, InjectedToolCallId],
    revolutions: int | None = None,
) -> Command:
    """Orbit the mascot around a zone (default: 1 full revolution)."""
    return _emit_ack(MascotOrbit(target=target, revolutions=revolutions), f"mascot orbiting {target}", tool_call_id)


@tool
def mascot_dart(
    direction: DartDirection,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Short, playful dart — up / down / left / right / away. Use for cute reactions."""
    return _emit_ack(MascotDart(direction=direction), f"mascot darted {direction}", tool_call_id)


@tool
def mascot_return_to_hub(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Send the mascot back to the central hub island."""
    return _emit_ack(MascotReturnToHub(), "mascot returning to hub", tool_call_id)


# ---------------------------------------------------------------------------
#  Mascot body / face
# ---------------------------------------------------------------------------

@tool
def mascot_gesture(
    gesture: MascotGesture,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Trigger a full-body gesture clip (wave, point, bow, dance, ...)."""
    return _emit_ack(MascotGestureEvent(gesture=gesture), f"mascot gestured {gesture}", tool_call_id)


@tool
def mascot_point_at(
    target: PointAtTarget,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Point the mascot's body/arm at a target zone or at the user."""
    return _emit_ack(MascotPointAt(target=target), f"mascot pointing at {target}", tool_call_id)


@tool
def mascot_emote(
    icon: EmoteIcon,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Pop a glyph above the mascot's head (heart / question / sparkle / ...)."""
    return _emit_ack(MascotEmote(icon=icon), f"mascot emoted {icon}", tool_call_id)


@tool
def mascot_expression(
    face: MascotExpression,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Set the mascot face expression (idle, happy, surprised, thinking, sad, wink)."""
    return _emit_ack(MascotExpressionEvent(face=face), f"mascot expression -> {face}", tool_call_id)


# ---------------------------------------------------------------------------
#  World
# ---------------------------------------------------------------------------

@tool
def world_reset(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Clear any active hologram and return the world to baseline."""
    return _emit_ack(WorldReset(), "world reset", tool_call_id)


# ---------------------------------------------------------------------------
#  Content (drive side content panels)
# ---------------------------------------------------------------------------

@tool
def content_experience(
    company: CompanyId,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render an experience detail card for a company."""
    return _emit_ack(ContentExperience(company=company), f"showing experience: {company}", tool_call_id)


@tool
def content_project(
    project: ProjectId,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render a project detail card."""
    return _emit_ack(ContentProject(project=project), f"showing project: {project}", tool_call_id)


@tool
def content_skill_group(
    group: SkillGroup,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render a skill group detail card (ai / backend / frontend / devops)."""
    return _emit_ack(ContentSkillGroup(group=group), f"showing skills: {group}", tool_call_id)


@tool
def content_contact_card(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render the contact card (email, LinkedIn, location)."""
    return _emit_ack(ContentContactCard(), "showing contact card", tool_call_id)


# ---------------------------------------------------------------------------
#  Chat hint chips
# ---------------------------------------------------------------------------

@tool
def suggest_followups(
    items: list[Suggestion],
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Offer the user 3–5 short follow-up chips that guide what to ask next.

    Call this ONCE at the end of every substantive turn. `items` is a list
    of {id, label, prompt}:
      - `id`:     stable key, snake_case (e.g. "proj-shotmock")
      - `label`:  chip caption, ≤ 28 chars, in the user's language
      - `prompt`: what gets sent when the chip is clicked, ≤ 80 chars

    Keep labels tight and complementary — don't repeat the topic you just
    covered. Examples after showing Vocabuddy:
      {id:"proj-shot", label:"ShotMock", prompt:"Tell me about ShotMock"},
      {id:"proj-cv", label:"Claude Voice", prompt:"And Claude Voice?"},
      {id:"exp", label:"Experience", prompt:"What's Enes's work experience?"},
      {id:"contact", label:"Contact", prompt:"How can I reach Enes?"},
    """
    return _emit_ack(ChatSuggestions(items=items), f"{len(items)} follow-up chips shown", tool_call_id)


# ---------------------------------------------------------------------------
#  Export
# ---------------------------------------------------------------------------

ALL_TOOLS = [
    camera_focus,
    camera_zoom,
    mascot_move_to,
    mascot_orbit,
    mascot_dart,
    mascot_return_to_hub,
    mascot_gesture,
    mascot_point_at,
    mascot_emote,
    mascot_expression,
    world_reset,
    content_experience,
    content_project,
    content_skill_group,
    content_contact_card,
    suggest_followups,
]
