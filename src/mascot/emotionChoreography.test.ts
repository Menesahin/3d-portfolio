import { describe, expect, it } from "vitest";
import { getEmotionChoreography } from "./emotionChoreography";

describe("Köfte emotion choreography", () => {
  it("coordinates excitement across hands, emote and body lift", () => {
    const cue = getEmotionChoreography("excited");

    expect(cue.gesture).toBe("celebrate");
    expect(cue.emote).toBe("star");
    expect(cue.lift).toBeGreaterThan(0.15);
    expect(cue.scale).toBeGreaterThan(1);
  });

  it("makes sadness physically smaller and lower", () => {
    const cue = getEmotionChoreography("sad");

    expect(cue.gesture).toBe("shy");
    expect(cue.emote).toBeNull();
    expect(cue.lift).toBeLessThan(0);
    expect(cue.scale).toBeLessThan(1);
  });
});
