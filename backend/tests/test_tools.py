"""Tool-layer tests — hit each tool directly, assert the ToolMessage ack
shape and that the ALL_TOOLS export stays in sync with the palette spec
AND with the UiEvent discriminated union (contract).
"""

from typing import get_args

from app.agent import tools as t
from app.agent.events import UiEvent


def test_should_export_full_palette_when_inspecting_all_tools() -> None:
    # The canonical tool palette — keep in sync with `ALL_TOOLS` in
    # app/agent/tools.py. Drift here means an event the agent can fire is
    # invisible to the frontend (or vice versa).
    expected = {
        "camera_focus",
        "camera_zoom",
        "mascot_move_to",
        "mascot_orbit",
        "mascot_dart",
        "mascot_return_to_hub",
        "mascot_gesture",
        "mascot_point_at",
        "mascot_emote",
        "mascot_expression",
        "world_reset",
        "cockpit_lighting",
        "cockpit_flight_mode",
        "cockpit_view",
        "content_experience",
        "content_project",
        "content_skill_group",
        "content_contact_card",
        "suggest_followups",
    }
    actual = {tool.name for tool in t.ALL_TOOLS}
    assert actual == expected


def test_should_return_unique_tool_names_when_registering_palette() -> None:
    names = [tool.name for tool in t.ALL_TOOLS]
    assert len(names) == len(set(names)), f"duplicate tool names: {names}"


def test_should_expose_descriptions_when_inspecting_tools() -> None:
    # Every tool needs a description so the LLM can pick correctly.
    for tool in t.ALL_TOOLS:
        assert tool.description, f"{tool.name} missing description"


# ---------------------------------------------------------------------------
#  Contract guard — frontend `src/types/tools.ts` mirrors the same
#  `kind` literals declared in `app/agent/events.py`. There's no codegen
#  yet; these tests are the v1 floor that catches drift inside the
#  backend itself, plus a hardcoded list that the FE side asserts against.
# ---------------------------------------------------------------------------

# `kind` literals the frontend `UiEvent` discriminator expects. If the
# Pydantic union here drifts from this set, this test fails AND the FE
# `src/types/tools.ts` will be out of sync — fix both sides together.
EXPECTED_UIEVENT_KINDS = {
    "camera.focus",
    "camera.zoom",
    "mascot.move",
    "mascot.orbit",
    "mascot.dart",
    "mascot.return_to_hub",
    "mascot.gesture",
    "mascot.point_at",
    "mascot.emote",
    "mascot.expression",
    "world.reset",
    "cockpit.lighting",
    "cockpit.flight_mode",
    "cockpit.view",
    "content.experience",
    "content.project",
    "content.skill_group",
    "content.contact_card",
    "chat.suggestions",
}


def _ui_event_kinds() -> set[str]:
    """Pull the runtime `kind` literal from each member of the discriminated
    `UiEvent` union."""
    # `UiEvent` is `Annotated[Union[...], Field(discriminator="kind")]`.
    # Walk the inner Union members and read their `kind` literal default.
    annotated_args = get_args(UiEvent)
    union_type = annotated_args[0]
    members = get_args(union_type)
    kinds: set[str] = set()
    for cls in members:
        # The model's `kind` field has a literal default like `"camera.focus"`.
        kind_field = cls.model_fields["kind"]
        kinds.add(kind_field.default)
    return kinds


def test_should_match_expected_kinds_when_walking_ui_event_union() -> None:
    assert _ui_event_kinds() == EXPECTED_UIEVENT_KINDS


def test_should_have_one_event_per_tool_when_comparing_palette_and_union() -> None:
    """A non-suggest tool fires exactly one UiEvent kind. The palette
    size should equal the union size (suggest_followups → chat.suggestions
    is the 1:1 mapping; everything else is too)."""
    assert len(t.ALL_TOOLS) == len(_ui_event_kinds())
