import { afterEach, describe, expect, it } from "vitest";
import { useStore } from "./index";

describe("cockpit UI event dispatch", () => {
  afterEach(() => {
    useStore.getState().setCockpitLighting("standard");
    useStore.getState().setCockpitFlightMode("park");
    useStore.getState().setCockpitViewMode("interior");
  });

  it("applies agent-driven lighting presets", () => {
    useStore.getState().applyUiEvent({ kind: "cockpit.lighting", preset: "observation" });

    expect(useStore.getState().cockpit.lighting).toBe("observation");
  });

  it("applies agent-driven flight modes", () => {
    useStore.getState().applyUiEvent({ kind: "cockpit.flight_mode", mode: "cruise" });

    expect(useStore.getState().cockpit.flightMode).toBe("cruise");
  });

  it("switches to the spacecraft exterior and clears interior content", () => {
    useStore.getState().showContent({ kind: "project", project: "vocabuddy" });
    useStore.getState().applyUiEvent({ kind: "cockpit.view", mode: "exterior" });

    expect(useStore.getState().cockpit.viewMode).toBe("exterior");
    expect(useStore.getState().world.activeContent).toBeNull();
  });
});
