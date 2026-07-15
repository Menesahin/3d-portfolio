import { describe, expect, it } from "vitest";
import { readWorldVariant } from "./worldVariant";

describe("world variant routing", () => {
  it("loads cockpit V7 by default", () => {
    expect(readWorldVariant("")).toBe("cockpit-v7");
  });

  it("keeps explicit rollback variants available", () => {
    expect(readWorldVariant("?world=legacy")).toBe("legacy");
    expect(readWorldVariant("?world=cockpit")).toBe("cockpit");
  });
});
