import * as THREE from "three";

/**
 * Cockpit-local direction from the spacecraft toward the Sun. PlanetVista
 * updates this from the physical orbit frame; CockpitLighting consumes it so
 * the window key light and the Earth shader share one source of truth.
 */
export const cockpitSunDirectionRef = {
  current: new THREE.Vector3(0.35, 0.72, -0.58).normalize(),
};
