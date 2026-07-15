import { useEffect, useState } from "react";
import { useStore } from "@/stores";
import type { UiEvent } from "@/types/tools";

/**
 * Dev-only overlay that shows the last ~6 UI events as they dispatch.
 * Subscribes to `applyUiEvent` via a middleware-less wrapper.
 *
 * Activated whenever `?debug=1` is on. Useful for confirming the SSE
 * pipeline is actually reaching the store.
 */
export function EventTicker() {
  const [events, setEvents] = useState<Array<{ t: number; ev: UiEvent }>>([]);

  useEffect(() => {
    // Monkey-patch `applyUiEvent` in the root store to also push into our
    // local ticker. We keep the original implementation for the scene to
    // keep reacting.
    const orig = useStore.getState().applyUiEvent;
    useStore.setState({
      applyUiEvent: (ev) => {
        setEvents((list) => [{ t: Date.now(), ev }, ...list].slice(0, 6));
        orig(ev);
      },
    });
    return () => {
      useStore.setState({ applyUiEvent: orig });
    };
  }, []);

  if (events.length === 0) {
    return (
      <div className="holo-chip pointer-events-none fixed bottom-4 left-4 z-30 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-fg)]/55">
        (no ui events — send a prompt)
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-30 flex max-w-[340px] flex-col gap-1 font-mono text-[10px]">
      {events.map(({ t, ev }) => (
        <div
          key={`${t}-${ev.kind}`}
          className="holo-chip rounded-md px-2 py-1 text-[var(--color-fg)]/80"
        >
          <span className="text-[var(--color-accent)]">{ev.kind}</span>{" "}
          <span className="text-[var(--color-fg)]/55">{summarise(ev)}</span>
        </div>
      ))}
    </div>
  );
}

function summarise(ev: UiEvent): string {
  switch (ev.kind) {
    case "camera.focus":
      return `→ ${ev.target}`;
    case "camera.zoom":
      return `→ ${ev.level}`;
    case "mascot.move":
      return `→ ${ev.zone}`;
    case "mascot.gesture":
      return `→ ${ev.gesture}`;
    case "mascot.point_at":
      return `→ ${ev.target}`;
    case "mascot.emote":
      return `→ ${ev.icon}`;
    case "mascot.expression":
      return `→ ${ev.face}`;
    case "mascot.dart":
      return `→ ${ev.direction}`;
    case "mascot.orbit":
      return `→ ${ev.target}`;
    case "content.experience":
      return `→ ${ev.company}`;
    case "content.project":
      return `→ ${ev.project}`;
    case "content.skill_group":
      return `→ ${ev.group}`;
    case "cockpit.lighting":
      return `→ ${ev.preset}`;
    case "cockpit.flight_mode":
      return `→ ${ev.mode}`;
    case "cockpit.view":
      return `→ ${ev.mode}`;
    default:
      return "";
  }
}
