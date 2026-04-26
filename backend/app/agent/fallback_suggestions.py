"""Server-side safety net for follow-up chips.

`gpt-4o-mini` + ReAct occasionally forgets to call `suggest_followups`
at the end of a turn even after we yell about it in the system prompt.
To guarantee the UI always gets chips, the SSE layer emits a fallback
set based on the last `content.*` tool fired during the turn (or a
generic set if no content event fired at all).

Keep labels ≤ 28 chars and prompts ≤ 80 chars — the
`ChatSuggestions(items=...)` validator at the SSE boundary enforces it.
TR/EN branches will plug in once the persona itself goes multilingual.
"""
from __future__ import annotations

from typing import Any

# Suggestions are kept as plain dicts here (not `events.Suggestion` model
# instances) so the data tables stay compact. They are funnelled through
# `ChatSuggestions(items=...)` at the SSE boundary, which validates the
# label/prompt length constraints + the 1-5 item count enforced on the
# wire.
SuggestionDict = dict[str, str]  # {id, label, prompt}


def _chip(chip_id: str, label: str, prompt: str) -> SuggestionDict:
    """Single chip constructor — keeps the dict shape DRY across the
    fallback table."""
    return {"id": chip_id, "label": label, "prompt": prompt}


# Reusable chips — the same "Skills" / "Projects" / "Contact" / "Experience"
# chip prompt text appears in many fallback variants. Naming them once
# stops the eight-or-more places from drifting independently.
PROJECTS_CHIP = _chip("fb-projects", "Projects", "Show me his projects")
EXPERIENCE_CHIP = _chip("fb-exp", "Experience", "Walk me through his experience")
SKILLS_CHIP = _chip("fb-skills", "Skills", "What is Enes good at?")
CONTACT_CHIP = _chip("fb-contact", "Contact", "How can I reach Enes?")

PROJ_VOC_CHIP = _chip("fb-proj-voc", "Vocabuddy", "Tell me about Vocabuddy")
PROJ_SHOT_CHIP = _chip("fb-proj-shot", "ShotMock", "Tell me about ShotMock")
PROJ_CV_CHIP = _chip("fb-proj-cv", "Claude Voice", "And Claude Voice?")
PROJ_CUP_CHIP = _chip("fb-proj-cup", "The Cup XI", "Tell me about The Cup XI")

EXP_NAR_CHIP = _chip("fb-exp-nar", "Nar Sistem", "What is he doing at Nar Sistem?")
EXP_FORMICA_CHIP = _chip("fb-exp-formica", "Formica AI", "Tell me about Formica AI")
EXP_ING_CHIP = _chip("fb-exp-ing", "ING Bank", "Tell me about ING Bank")

SKILL_AI_CHIP = _chip("fb-skills-ai", "AI / LLM", "His AI/LLM skills?")
SKILL_BE_CHIP = _chip("fb-skills-be", "Backend", "Backend skills?")
SKILL_FE_CHIP = _chip("fb-skills-fe", "Frontend", "Frontend skills?")
SKILL_DEVOPS_CHIP = _chip("fb-skills-devops", "DevOps", "DevOps skills?")


def _en_generic() -> list[SuggestionDict]:
    return [PROJECTS_CHIP, EXPERIENCE_CHIP, SKILLS_CHIP, CONTACT_CHIP]


_EN_BY_PROJECT: dict[str, list[SuggestionDict]] = {
    "vocabuddy": [PROJ_SHOT_CHIP, PROJ_CV_CHIP, PROJ_CUP_CHIP, SKILLS_CHIP],
    "shotmock": [PROJ_VOC_CHIP, PROJ_CV_CHIP, PROJ_CUP_CHIP, SKILLS_CHIP],
    "claude-voice": [PROJ_VOC_CHIP, PROJ_SHOT_CHIP, PROJ_CUP_CHIP, SKILLS_CHIP],
    "thecupxi": [PROJ_VOC_CHIP, PROJ_SHOT_CHIP, PROJ_CV_CHIP, SKILLS_CHIP],
}

_EN_BY_COMPANY: dict[str, list[SuggestionDict]] = {
    "nar-sistem": [EXP_FORMICA_CHIP, EXP_ING_CHIP, PROJECTS_CHIP, SKILLS_CHIP],
    "formica": [EXP_NAR_CHIP, EXP_ING_CHIP, PROJECTS_CHIP, SKILLS_CHIP],
    "ing-bank": [EXP_NAR_CHIP, EXP_FORMICA_CHIP, PROJECTS_CHIP, SKILLS_CHIP],
}

_EN_BY_SKILL: dict[str, list[SuggestionDict]] = {
    "ai": [SKILL_BE_CHIP, SKILL_FE_CHIP, SKILL_DEVOPS_CHIP, PROJECTS_CHIP],
    "backend": [SKILL_AI_CHIP, SKILL_FE_CHIP, SKILL_DEVOPS_CHIP, PROJECTS_CHIP],
    "frontend": [SKILL_AI_CHIP, SKILL_BE_CHIP, SKILL_DEVOPS_CHIP, PROJECTS_CHIP],
    "devops": [SKILL_AI_CHIP, SKILL_BE_CHIP, SKILL_FE_CHIP, PROJECTS_CHIP],
}

_EN_AFTER_CONTACT: list[SuggestionDict] = [PROJECTS_CHIP, EXPERIENCE_CHIP, SKILLS_CHIP]


def derive(last_content_event: dict[str, Any] | None) -> list[SuggestionDict]:
    """Pick the best fallback set given the last `content.*` tool payload."""
    if last_content_event is None:
        return _en_generic()
    kind = last_content_event.get("kind")
    if kind == "content.project":
        return _EN_BY_PROJECT.get(last_content_event.get("project", ""), _en_generic())
    if kind == "content.experience":
        return _EN_BY_COMPANY.get(last_content_event.get("company", ""), _en_generic())
    if kind == "content.skill_group":
        return _EN_BY_SKILL.get(last_content_event.get("group", ""), _en_generic())
    if kind == "content.contact_card":
        return _EN_AFTER_CONTACT
    return _en_generic()
