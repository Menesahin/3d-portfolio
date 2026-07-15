import { describe, expect, it } from "vitest";
import {
  calculateOrbitFrame,
  EARTH_MU_KM3_S2,
  ORBIT_PERIOD_SECONDS,
  ORBIT_RADIUS_KM,
  ORBIT_SPEED_KM_S,
} from "./orbit";

describe("cockpit orbit", () => {
  it("keeps the spacecraft on the configured circular orbit", () => {
    const frame = calculateOrbitFrame(Date.UTC(2026, 6, 15) / 1000);

    expect(frame.positionEciKm.length()).toBeCloseTo(ORBIT_RADIUS_KM, 6);
    expect(frame.velocityEciKmS.length()).toBeCloseTo(ORBIT_SPEED_KM_S, 6);
    expect(frame.positionEciKm.dot(frame.velocityEciKmS)).toBeCloseTo(0, 5);
  });

  it("matches the two-body circular-orbit period", () => {
    const expected = Math.PI * 2 * Math.sqrt(ORBIT_RADIUS_KM ** 3 / EARTH_MU_KM3_S2);

    expect(ORBIT_PERIOD_SECONDS).toBeCloseTo(expected, 8);
  });
});
