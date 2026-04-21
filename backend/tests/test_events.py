"""Pydantic UiEvent validation tests."""
import pytest
from pydantic import TypeAdapter, ValidationError

from app.agent.events import UiEvent

_adapter: TypeAdapter[UiEvent] = TypeAdapter(UiEvent)


def test_should_parse_camera_focus_when_given_valid_target() -> None:
    ev = _adapter.validate_python({"kind": "camera.focus", "target": "projects"})
    assert ev.kind == "camera.focus"
    assert ev.target == "projects"


def test_should_reject_mascot_emote_when_icon_is_invalid() -> None:
    with pytest.raises(ValidationError):
        _adapter.validate_python({"kind": "mascot.emote", "icon": "not-a-real-emote"})


def test_should_parse_world_show_hologram_when_given_contentId() -> None:
    ev = _adapter.validate_python(
        {"kind": "world.show_hologram", "zone": "experience", "contentId": "formica"},
    )
    assert ev.kind == "world.show_hologram"
    assert ev.contentId == "formica"
