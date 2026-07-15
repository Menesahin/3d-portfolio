/**
 * Tool event types emitted by the LangGraph agent and consumed by the
 * frontend orchestrator. Kept in one file so frontend + backend stay in
 * sync (the Python pydantic models mirror these shapes).
 *
 * See plan §6 for the full palette.
 */
import type { ZoneId } from "@/world/zones";

export type EmoteIcon =
  | "heart"
  | "question"
  | "lightbulb"
  | "sparkle"
  | "zzz"
  | "exclamation"
  | "star"
  | "note"
  | "tear";

export type MascotGesture =
  | "wave"
  | "point"
  | "thumbs_up"
  | "head_tilt"
  | "bow"
  | "dance"
  | "flip"
  | "spin_happy"
  | "shy"
  | "celebrate";

export type MascotExpression =
  | "idle"
  | "happy"
  | "excited"
  | "surprised"
  | "thinking"
  | "sad"
  | "wink";

export type CameraTarget = ZoneId | "hub" | "overview";
export type CameraZoom = "close" | "medium" | "wide";
export type DartDirection = "up" | "down" | "left" | "right" | "away";

export type ProjectId = "vocabuddy" | "shotmock" | "claude-voice" | "thecupxi";
export type CompanyId = "nar-sistem" | "formica" | "ing-bank";
export type SkillGroup = "ai" | "backend" | "frontend" | "devops";
export type CockpitLightingPreset = "standard" | "observation" | "cool" | "warm" | "alert" | "dim";
export type CockpitFlightMode = "park" | "cruise" | "warp";
export type CockpitViewMode = "interior" | "exterior";

/**
 * Chat follow-up suggestion chip. Emitted by the agent's
 * `suggest_followups` tool at the end of every turn so the visitor has
 * a clear next step. Clicking a chip sends `prompt` as a new message.
 */
export type Suggestion = {
  /** Stable React key, e.g. "proj-shotmock" */
  id: string;
  /** Chip caption — keep ≤ 28 chars, same language as the user */
  label: string;
  /** Text sent when the chip is clicked, ≤ 80 chars */
  prompt: string;
};

/**
 * Discriminated union of every possible UI event the agent can emit.
 * Frontend orchestrator switches on `kind`.
 */
export type UiEvent =
  /* Camera */
  | { kind: "camera.focus"; target: CameraTarget; duration?: number }
  | { kind: "camera.zoom"; level: CameraZoom }
  /* Mascot movement */
  | { kind: "mascot.move"; zone: CameraTarget }
  | { kind: "mascot.orbit"; target: ZoneId; revolutions?: number }
  | { kind: "mascot.dart"; direction: DartDirection }
  | { kind: "mascot.return_to_hub" }
  /* Mascot body */
  | { kind: "mascot.gesture"; gesture: MascotGesture }
  | { kind: "mascot.point_at"; target: ZoneId | "user" }
  /* Mascot face + emote */
  | { kind: "mascot.emote"; icon: EmoteIcon }
  | { kind: "mascot.expression"; face: MascotExpression }
  /* World */
  | { kind: "world.reset" }
  | { kind: "cockpit.lighting"; preset: CockpitLightingPreset }
  | { kind: "cockpit.flight_mode"; mode: CockpitFlightMode }
  | { kind: "cockpit.view"; mode: CockpitViewMode }
  /* Content (drives the specialized hologram scenes) */
  | { kind: "content.experience"; company: CompanyId }
  | { kind: "content.project"; project: ProjectId }
  | { kind: "content.skill_group"; group: SkillGroup }
  | { kind: "content.contact_card" }
  /* Chat follow-up chips */
  | { kind: "chat.suggestions"; items: Suggestion[] };

export type UiEventKind = UiEvent["kind"];
