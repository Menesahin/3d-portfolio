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
    CompanyId,
    ContentContactCard,
    ContentExperience,
    ContentProject,
    ContentSkillGroup,
    DartDirection,
    EmoteIcon,
    MascotDart,
    MascotEmote,
    MascotExpressionEvent,
    MascotExpression,
    MascotGesture,
    MascotGestureEvent,
    MascotMove,
    MascotOrbit,
    MascotPointAt,
    MascotReturnToHub,
    ProjectId,
    SkillGroup,
    UiEvent,
    WorldActivateTerminal,
    WorldHighlightZone,
    WorldReset,
    WorldShowHologram,
    ZoneId,
)


def _emit(event: UiEvent) -> None:
    """Write a validated UI event to the `custom` stream channel."""
    writer = get_stream_writer()
    # `model_dump` produces the frontend-facing JSON shape (with `kind` field).
    writer(event.model_dump(mode="json"))


def _ack(message: str, tool_call_id: str) -> Command:
    return Command(update={"messages": [ToolMessage(content=message, tool_call_id=tool_call_id)]})


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
    _emit(CameraFocus(target=target, duration=duration))
    return _ack(f"camera focused on {target}", tool_call_id)


@tool
def camera_zoom(
    level: CameraZoom,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Zoom the camera to close / medium / wide around the current target."""
    _emit(CameraZoomEvent(level=level))
    return _ack(f"camera zoom set to {level}", tool_call_id)


# ---------------------------------------------------------------------------
#  Mascot movement
# ---------------------------------------------------------------------------

@tool
def mascot_move_to(
    zone: CameraTarget,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Fly the mascot to the given zone (or back to 'hub')."""
    _emit(MascotMove(zone=zone))
    return _ack(f"mascot moving to {zone}", tool_call_id)


@tool
def mascot_orbit(
    target: ZoneId,
    tool_call_id: Annotated[str, InjectedToolCallId],
    revolutions: int | None = None,
) -> Command:
    """Orbit the mascot around a zone (default: 1 full revolution)."""
    _emit(MascotOrbit(target=target, revolutions=revolutions))
    return _ack(f"mascot orbiting {target}", tool_call_id)


@tool
def mascot_dart(
    direction: DartDirection,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Short, playful dart — up / down / left / right / away. Use for cute reactions."""
    _emit(MascotDart(direction=direction))
    return _ack(f"mascot darted {direction}", tool_call_id)


@tool
def mascot_return_to_hub(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Send the mascot back to the central hub island."""
    _emit(MascotReturnToHub())
    return _ack("mascot returning to hub", tool_call_id)


# ---------------------------------------------------------------------------
#  Mascot body / face
# ---------------------------------------------------------------------------

@tool
def mascot_gesture(
    gesture: MascotGesture,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Trigger a full-body gesture clip (wave, point, bow, dance, ...)."""
    _emit(MascotGestureEvent(gesture=gesture))
    return _ack(f"mascot gestured {gesture}", tool_call_id)


@tool
def mascot_point_at(
    target: ZoneId,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Point the mascot's body/arm at a target zone or at the user."""
    _emit(MascotPointAt(target=target))
    return _ack(f"mascot pointing at {target}", tool_call_id)


@tool
def mascot_emote(
    icon: EmoteIcon,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Pop a glyph above the mascot's head (heart / question / sparkle / ...)."""
    _emit(MascotEmote(icon=icon))
    return _ack(f"mascot emoted {icon}", tool_call_id)


@tool
def mascot_expression(
    face: MascotExpression,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Set the mascot face expression (idle, happy, surprised, thinking, sad, wink)."""
    _emit(MascotExpressionEvent(face=face))
    return _ack(f"mascot expression → {face}", tool_call_id)


# ---------------------------------------------------------------------------
#  World
# ---------------------------------------------------------------------------

@tool
def world_highlight_zone(
    zone: ZoneId,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Soft glow pulse on the given zone to draw attention."""
    _emit(WorldHighlightZone(zone=zone))
    return _ack(f"zone {zone} highlighted", tool_call_id)


@tool
def world_show_hologram(
    zone: ZoneId,
    contentId: str,  # noqa: N803 — camelCase to match frontend event shape
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Activate a hologram panel over a zone with the given contentId
    (e.g. 'formica', 'vocabuddy')."""
    _emit(WorldShowHologram(zone=zone, contentId=contentId))
    return _ack(f"hologram active: {zone}/{contentId}", tool_call_id)


@tool
def world_activate_terminal(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Turn on the Contact terminal so the mascot can reveal contact details."""
    _emit(WorldActivateTerminal())
    return _ack("contact terminal activated", tool_call_id)


@tool
def world_reset(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Clear holograms and highlights; return the world to baseline."""
    _emit(WorldReset())
    return _ack("world reset", tool_call_id)


# ---------------------------------------------------------------------------
#  Content (drive side content panels)
# ---------------------------------------------------------------------------

@tool
def content_experience(
    company: CompanyId,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render an experience detail card for a company."""
    _emit(ContentExperience(company=company))
    return _ack(f"showing experience: {company}", tool_call_id)


@tool
def content_project(
    project: ProjectId,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render a project detail card."""
    _emit(ContentProject(project=project))
    return _ack(f"showing project: {project}", tool_call_id)


@tool
def content_skill_group(
    group: SkillGroup,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render a skill group detail card (ai / backend / frontend / devops)."""
    _emit(ContentSkillGroup(group=group))
    return _ack(f"showing skills: {group}", tool_call_id)


@tool
def content_contact_card(
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Render the contact card (email, LinkedIn, location)."""
    _emit(ContentContactCard())
    return _ack("showing contact card", tool_call_id)


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
    world_highlight_zone,
    world_show_hologram,
    world_activate_terminal,
    world_reset,
    content_experience,
    content_project,
    content_skill_group,
    content_contact_card,
]
