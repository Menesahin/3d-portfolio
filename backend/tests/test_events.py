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


def test_should_parse_content_project_when_given_valid_project() -> None:
    ev = _adapter.validate_python({"kind": "content.project", "project": "thecupxi"})
    assert ev.kind == "content.project"
    assert ev.project == "thecupxi"


def test_should_reject_content_project_when_project_id_is_unknown() -> None:
    with pytest.raises(ValidationError):
        _adapter.validate_python({"kind": "content.project", "project": "not-a-real-project"})
