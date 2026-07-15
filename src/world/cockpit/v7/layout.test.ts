import { describe, expect, it } from "vitest";
import { COCKPIT_V7_CONTROLS, COCKPIT_V7_LAYOUT, COCKPIT_V7_SHOTS } from "./layout";

describe("cockpit V7 export contract", () => {
  it("ships semantic controls with unique Blender nodes", () => {
    const controls = Object.values(COCKPIT_V7_CONTROLS);
    const nodes = controls.map((control) => control.node);

    expect(controls.length).toBeGreaterThanOrEqual(30);
    expect(new Set(nodes).size).toBe(nodes.length);
    expect(controls.every((control) => control.action.includes("."))).toBe(true);
  });

  it("defines every portfolio camera shot and embedded screen", () => {
    for (const target of [
      "hub",
      "overview",
      "projects",
      "experience",
      "skills",
      "contact",
    ] as const) {
      expect(COCKPIT_V7_SHOTS[target]).toBeDefined();
    }

    expect(COCKPIT_V7_LAYOUT.screens.projects.size[0]).toBeGreaterThan(8);
    expect(Object.keys(COCKPIT_V7_LAYOUT.screens)).toEqual([
      "projects",
      "experience",
      "skills",
      "contact",
    ]);
  });
});
