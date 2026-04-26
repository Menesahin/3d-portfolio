/**
 * SSE client for the LangGraph chat backend.
 *
 * The backend emits named events (`ready`, `token`, `ui`, `done`, `error`)
 * with JSON payloads. We can't use `EventSource` because we need to POST
 * the chat history; instead we run a plain `fetch`, read the body as a
 * stream, and parse `event:` + `data:` lines ourselves.
 *
 * Yields one strongly-typed event per SSE frame. Cancel via AbortSignal.
 */
import type { UiEvent } from "@/types/tools";

// Source-of-truth list of valid `kind` discriminators on UiEvent. Mirrors
// `EXPECTED_UIEVENT_KINDS` in `backend/tests/test_tools.py` — both sides
// fail loudly if either drifts.
const UI_EVENT_KINDS = new Set<UiEvent["kind"]>([
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
  "content.experience",
  "content.project",
  "content.skill_group",
  "content.contact_card",
  "chat.suggestions",
]);

function asUiEvent(payload: unknown): UiEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const kind = (payload as { kind?: unknown }).kind;
  if (typeof kind !== "string") return null;
  if (!UI_EVENT_KINDS.has(kind as UiEvent["kind"])) {
    if (import.meta.env.DEV) {
      console.warn(`[stream] unknown UiEvent kind: ${kind}`);
    }
    return null;
  }
  // Discriminated-union narrowing happens at the dispatcher (`switch (event.kind)`).
  return payload as UiEvent;
}

export type ServerEvent =
  | { type: "ready"; request_id: string }
  | { type: "token"; delta: string }
  | { type: "ui"; event: UiEvent }
  | { type: "done"; request_id?: string }
  | { type: "error"; message: string };

export type ChatMessagePayload = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatBody = {
  messages: ChatMessagePayload[];
  thread_id?: string;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function* streamChat(
  body: ChatBody,
  signal: AbortSignal,
): AsyncGenerator<ServerEvent, void, void> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;

      // SSE frames are separated by blank lines (\n\n).
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        sep = buffer.indexOf("\n\n");
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): ServerEvent | null {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");

  try {
    const data = JSON.parse(raw);
    switch (eventName) {
      case "ready":
        return { type: "ready", request_id: String(data.request_id ?? "") };
      case "token":
        return { type: "token", delta: String(data.delta ?? "") };
      case "ui": {
        const event = asUiEvent(data.event);
        return event ? { type: "ui", event } : null;
      }
      case "done":
        return { type: "done", request_id: data.request_id };
      case "error":
        return { type: "error", message: String(data.message ?? "unknown") };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
