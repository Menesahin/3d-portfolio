import * as THREE from "three";

/**
 * Circular low-Earth-orbit model used by the cockpit vista.
 *
 * Distances are kilometres and time is seconds. The default orbit mirrors
 * a 24,000 km upper-MEO observation orbit and 51.6° inclination. This keeps
 * the complete Earth disk visible while retaining a deterministic two-body
 * orbit instead of faking the planet's apparent scale.
 */
export const EARTH_RADIUS_KM = 6378;
export const EARTH_MU_KM3_S2 = 398600.4418;
export const EARTH_ROTATION_SECONDS = 23.9 * 60 * 60;
export const ORBIT_ALTITUDE_KM = 24_000;
export const ORBIT_INCLINATION_RAD = THREE.MathUtils.degToRad(51.6);
export const ORBIT_RADIUS_KM = EARTH_RADIUS_KM + ORBIT_ALTITUDE_KM;
export const ORBIT_ANGULAR_RATE_RAD_S = Math.sqrt(EARTH_MU_KM3_S2 / ORBIT_RADIUS_KM ** 3);
export const ORBIT_PERIOD_SECONDS = (Math.PI * 2) / ORBIT_ANGULAR_RATE_RAD_S;
export const ORBIT_SPEED_KM_S = Math.sqrt(EARTH_MU_KM3_S2 / ORBIT_RADIUS_KM);

export const EARTH_SCENE_RADIUS = 82;
export const ORBIT_SCENE_RADIUS = EARTH_SCENE_RADIUS * (ORBIT_RADIUS_KM / EARTH_RADIUS_KM);

// The observation deck is near-nadir-facing. Four degrees of overshoot place
// the full Earth disk above the low forward console while all orbital vectors
// remain in the physical LVLH frame.
export const COCKPIT_NADIR_PITCH_RAD = THREE.MathUtils.degToRad(94);

const TWO_PI = Math.PI * 2;
const ORBIT_PHASE_AT_EPOCH = THREE.MathUtils.degToRad(28);
// The propagator is deterministic rather than a live ISS ephemeris. This
// arbitrary Greenwich phase picks a useful initial longitude while retaining
// the physical 23.9-hour terrestrial rotation rate.
const earthPhaseValue = new URLSearchParams(globalThis.location?.search ?? "").get("earthPhase");
const earthPhaseParam = earthPhaseValue === null ? Number.NaN : Number(earthPhaseValue);
const EARTH_ROTATION_PHASE_AT_EPOCH = THREE.MathUtils.degToRad(
  Number.isFinite(earthPhaseParam) ? THREE.MathUtils.clamp(earthPhaseParam, -360, 360) : 90,
);
const EPOCH_UNIX_SECONDS = Date.UTC(2026, 0, 1, 0, 0, 0) / 1000;

export type OrbitFrame = {
  /** Spacecraft position in Earth-centred inertial coordinates, km. */
  positionEciKm: THREE.Vector3;
  /** Spacecraft velocity in Earth-centred inertial coordinates, km/s. */
  velocityEciKmS: THREE.Vector3;
  /** ECI → cockpit-local rotation, including the fixed nadir pitch. */
  eciToCockpit: THREE.Matrix4;
  /** Earth-fixed object coordinates → cockpit-local rotation. */
  earthToCockpit: THREE.Matrix4;
  /** Earth centre in cockpit-local scene units. */
  earthCenter: THREE.Vector3;
  /** Fixed inertial sunlight transformed into cockpit-local coordinates. */
  sunDirection: THREE.Vector3;
};

const sunDirectionEci = new THREE.Vector3(-0.82, 0.31, 0.48).normalize();

function normalizedAngle(value: number) {
  return ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Allow accelerated inspection only when explicitly requested in the URL. */
export function readOrbitTimeScale() {
  if (typeof window === "undefined") return 1;
  const value = Number(new URLSearchParams(window.location.search).get("orbitScale"));
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 600) : 1;
}

export function calculateOrbitFrame(unixSeconds: number, timeScale = 1): OrbitFrame {
  const elapsed = (unixSeconds - EPOCH_UNIX_SECONDS) * timeScale;
  const anomaly = normalizedAngle(ORBIT_PHASE_AT_EPOCH + elapsed * ORBIT_ANGULAR_RATE_RAD_S);
  const cosTheta = Math.cos(anomaly);
  const sinTheta = Math.sin(anomaly);
  const cosI = Math.cos(ORBIT_INCLINATION_RAD);
  const sinI = Math.sin(ORBIT_INCLINATION_RAD);

  const radial = new THREE.Vector3(cosTheta, sinTheta * cosI, sinTheta * sinI);
  const alongTrack = new THREE.Vector3(-sinTheta, cosTheta * cosI, cosTheta * sinI);
  const positionEciKm = radial.clone().multiplyScalar(ORBIT_RADIUS_KM);
  const velocityEciKmS = alongTrack.clone().multiplyScalar(ORBIT_SPEED_KM_S);

  // Cockpit local axes expressed in ECI: X=right, Y=up, Z=back. Forward
  // is -Z and down is -Y, matching Three.js and the Blender export.
  const right = radial.clone().negate().cross(alongTrack).normalize();
  const localToEci = new THREE.Matrix4().makeBasis(right, radial, alongTrack.clone().negate());
  const eciToLvlh = localToEci.clone().transpose();
  const cockpitPitch = new THREE.Matrix4().makeRotationX(COCKPIT_NADIR_PITCH_RAD);
  const eciToCockpit = cockpitPitch.clone().multiply(eciToLvlh);

  // Three's SphereGeometry uses +Y as its polar axis. Rotate it so +Y
  // maps to Earth's inertial +Z axis, then apply terrestrial rotation.
  const sphereToEciAxes = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const earthRotation = new THREE.Matrix4().makeRotationZ(
    normalizedAngle(EARTH_ROTATION_PHASE_AT_EPOCH + elapsed * (TWO_PI / EARTH_ROTATION_SECONDS)),
  );
  const earthToCockpit = eciToCockpit.clone().multiply(earthRotation).multiply(sphereToEciAxes);

  const earthCenter = new THREE.Vector3(0, -ORBIT_SCENE_RADIUS, 0).applyMatrix4(cockpitPitch);
  const sunDirection = sunDirectionEci.clone().transformDirection(eciToCockpit);

  return {
    positionEciKm,
    velocityEciKmS,
    eciToCockpit,
    earthToCockpit,
    earthCenter,
    sunDirection,
  };
}
