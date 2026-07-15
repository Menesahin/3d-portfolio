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


def test_should_parse_coordinated_excited_expression() -> None:
    ev = _adapter.validate_python({"kind": "mascot.expression", "face": "excited"})
    assert ev.kind == "mascot.expression"
    assert ev.face == "excited"


def test_should_parse_celebrate_gesture_and_tear_emote() -> None:
    gesture = _adapter.validate_python({"kind": "mascot.gesture", "gesture": "celebrate"})
    emote = _adapter.validate_python({"kind": "mascot.emote", "icon": "tear"})
    assert gesture.gesture == "celebrate"
    assert emote.icon == "tear"


def test_should_parse_content_project_when_given_valid_project() -> None:
    ev = _adapter.validate_python({"kind": "content.project", "project": "thecupxi"})
    assert ev.kind == "content.project"
    assert ev.project == "thecupxi"


def test_should_reject_content_project_when_project_id_is_unknown() -> None:
    with pytest.raises(ValidationError):
        _adapter.validate_python({"kind": "content.project", "project": "not-a-real-project"})


def test_should_parse_cockpit_lighting_when_preset_is_valid() -> None:
    ev = _adapter.validate_python({"kind": "cockpit.lighting", "preset": "observation"})
    assert ev.kind == "cockpit.lighting"
    assert ev.preset == "observation"


def test_should_reject_cockpit_flight_mode_when_mode_is_unknown() -> None:
    with pytest.raises(ValidationError):
        _adapter.validate_python({"kind": "cockpit.flight_mode", "mode": "hyperdrive"})


def test_should_parse_cockpit_exterior_view() -> None:
    ev = _adapter.validate_python({"kind": "cockpit.view", "mode": "exterior"})
    assert ev.kind == "cockpit.view"
    assert ev.mode == "exterior"
