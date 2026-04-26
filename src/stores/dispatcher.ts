import type { StateCreator } from "zustand";
import type { UiEvent } from "@/types/tools";
import type { ZoneId } from "@/world/zones";
import type { AppState } from "./index";

export type DispatcherSlice = {
  /** Dispatch a typed LangGraph UiEvent to the right slice action(s). */
  applyUiEvent: (event: UiEvent) => void;
};

/**
 * Cross-slice dispatcher. Lives at the root because it orchestrates
 * actions on world / mascot / chat slices — declaring it inside any one
 * slice forces an unsafe `as` cast on `get()`. Here `StateCreator` is
 * typed against `AppState` so `get()` returns the fully-assembled store
 * with all action signatures intact; renaming any consumed action
 * raises a compile error at the matching switch arm.
 */
export const createDispatcherSlice: StateCreator<AppState, [], [], DispatcherSlice> = (
  _set,
  get,
) => ({
  applyUiEvent: (event) => {
    const s = get();
    switch (event.kind) {
      case "camera.focus":
        s.setCameraTarget(event.target);
        return;
      case "camera.zoom":
        s.setCameraZoom(event.level);
        return;
      case "mascot.move":
        // "overview" is a camera target, not a mascot destination.
        if (event.zone !== "overview") s.moveMascotTo(event.zone as ZoneId);
        return;
      case "mascot.return_to_hub":
        s.moveMascotTo("hub");
        return;
      case "mascot.orbit":
        s.moveMascotTo(event.target);
        return;
      case "mascot.dart":
        // v1: dart has no dedicated animation yet — ignored so the
        // scene stays coherent. Stub for future procedural impulse.
        return;
      case "mascot.gesture":
        s.setGesture(event.gesture);
        return;
      case "mascot.point_at":
        // Point-at maps to a head-tilt gesture in v1 since we don't
        // track per-target orientation on the rigged robot.
        s.setGesture("head_tilt");
        return;
      case "mascot.emote":
        s.setEmote(event.icon);
        return;
      case "mascot.expression":
        s.setExpression(event.face);
        return;
      case "world.reset":
        s.resetWorld();
        return;
      case "content.experience":
        s.showContent({ kind: "experience", company: event.company });
        return;
      case "content.project":
        s.showContent({ kind: "project", project: event.project });
        return;
      case "content.skill_group":
        s.showContent({ kind: "skill_group", group: event.group });
        return;
      case "content.contact_card":
        s.showContent({ kind: "contact_card" });
        return;
      case "chat.suggestions":
        s.setSuggestions(event.items);
        return;
    }
  },
});
