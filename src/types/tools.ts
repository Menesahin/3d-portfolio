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
  | "note";

export type MascotGesture =
  | "wave"
  | "point"
  | "thumbs_up"
  | "head_tilt"
  | "bow"
  | "dance"
  | "flip"
  | "spin_happy"
  | "shy";

export type MascotExpression = "idle" | "happy" | "surprised" | "thinking" | "sad" | "wink";

export type CameraTarget = ZoneId | "hub" | "overview";
export type CameraZoom = "close" | "medium" | "wide";
export type DartDirection = "up" | "down" | "left" | "right" | "away";

export type ProjectId = "vocabuddy" | "shotmock" | "claude-voice";
export type CompanyId = "nar-sistem" | "formica" | "ing-bank";
export type SkillGroup = "ai" | "backend" | "frontend" | "devops";

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
  | { kind: "world.highlight_zone"; zone: ZoneId }
  | { kind: "world.show_hologram"; zone: ZoneId; contentId: string }
  | { kind: "world.activate_terminal" }
  | { kind: "world.reset" }
  /* Content (side panels) */
  | { kind: "content.experience"; company: CompanyId }
  | { kind: "content.project"; project: ProjectId }
  | { kind: "content.skill_group"; group: SkillGroup }
  | { kind: "content.contact_card" };

export type UiEventKind = UiEvent["kind"];
