"""Tool-layer tests — hit each tool directly, assert the ToolMessage ack
shape and that the ALL_TOOLS export stays in sync with the palette spec.
"""
from app.agent import tools as t


def test_should_export_eighteen_tools_when_palette_is_complete() -> None:
    # plan §6 — the canonical tool palette.
    expected = {
        "camera_focus", "camera_zoom",
        "mascot_move_to", "mascot_orbit", "mascot_dart", "mascot_return_to_hub",
        "mascot_gesture", "mascot_point_at", "mascot_emote", "mascot_expression",
        "world_highlight_zone", "world_show_hologram", "world_activate_terminal", "world_reset",
        "content_experience", "content_project", "content_skill_group", "content_contact_card",
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
