import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { onCockpitEffect } from "./cockpitEvents";
import { cockpitSunDirectionRef } from "./lightingState";
import { calculateOrbitFrame, EARTH_SCENE_RADIUS, readOrbitTimeScale } from "./orbit";

const DAY_MAP = "/textures/earth/blue-marble-surface-4096.jpg";
const NIGHT_MAP = "/textures/earth/black-marble-4096.jpg";
const CLOUD_MAP = "/textures/earth/clouds-2048.jpg";

function readEarthMapOffset() {
  if (typeof window === "undefined") return 0.375;
  const rawValue = new URLSearchParams(window.location.search).get("earthMapOffset");
  if (rawValue === null) return 0.375;
  const value = Number(rawValue);
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, -1, 1) : 0.375;
}

function readCloudOpacity() {
  if (typeof window === "undefined") return 1;
  const rawValue = new URLSearchParams(window.location.search).get("earthClouds");
  if (rawValue === null) return 1;
  const value = Number(rawValue);
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 1;
}

const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const earthFragmentShader = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform float mapOffset;
  uniform vec3 sunDirection;
  uniform vec3 cameraPositionWorld;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    float sunlight = dot(normal, normalize(sunDirection));
    float dayWeight = smoothstep(-0.07, 0.15, sunlight);
    vec2 mapUv = vec2(fract(vUv.x + mapOffset), vUv.y);
    vec3 day = texture2D(dayMap, mapUv).rgb;
    vec3 night = texture2D(nightMap, mapUv).rgb;

    float dayLuma = dot(day, vec3(0.2126, 0.7152, 0.0722));
    day = mix(vec3(dayLuma), day, 0.78);
    day = pow(day, vec3(1.01));
    day *= vec3(0.88, 0.92, 0.98);

    vec3 viewDirection = normalize(cameraPositionWorld - vWorldPosition);
    float diffuseLight = max(sunlight, 0.0);
    float oceanGlint = pow(max(dot(reflect(-normalize(sunDirection), normal), viewDirection), 0.0), 72.0);
    float oceanMask = smoothstep(0.015, 0.17, day.b - max(day.r, day.g));
    vec3 litDay = day * mix(0.09, 0.98, pow(diffuseLight, 0.48));
    litDay += vec3(0.08, 0.22, 0.34) * oceanGlint * oceanMask * 0.24;

    vec3 nightFloor = day * 0.012 + vec3(0.0015, 0.003, 0.008);
    vec3 cityLights = pow(max(night - vec3(0.018), vec3(0.0)), vec3(1.24));
    cityLights *= vec3(0.64, 0.46, 0.28);
    float terminatorWarmth = (1.0 - abs(dayWeight * 2.0 - 1.0)) * 0.045;
    vec3 color = mix(nightFloor + cityLights, litDay, dayWeight);
    color += vec3(0.23, 0.09, 0.025) * terminatorWarmth;

    float limb = pow(max(dot(normal, viewDirection), 0.0), 0.24);
    color *= mix(0.78, 1.0, limb);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = /* glsl */ `
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;
  uniform float mapOffset;
  uniform float globalOpacity;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float source = texture2D(cloudMap, vec2(fract(vUv.x + mapOffset), vUv.y)).r;
    float cloud = smoothstep(0.10, 0.74, source);
    if (cloud < 0.012) discard;

    float sunlight = dot(normalize(vWorldNormal), normalize(sunDirection));
    float dayLight = smoothstep(-0.12, 0.32, sunlight);
    vec3 nightCloud = vec3(0.035, 0.052, 0.070);
    vec3 dayCloud = vec3(0.88, 0.92, 0.96) * (0.48 + max(sunlight, 0.0) * 0.54);
    vec3 color = mix(nightCloud, dayCloud, dayLight);
    float alpha = cloud * mix(0.10, 0.54, dayLight) * globalOpacity;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereVertexShader = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 sunDirection;
  uniform vec3 cameraPositionWorld;
  uniform float pulse;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPositionWorld - vWorldPosition);
    float rim = pow(1.0 - abs(dot(normal, viewDirection)), 4.2);
    float sunEdge = smoothstep(-0.22, 0.38, dot(normal, normalize(sunDirection)));
    vec3 color = mix(vec3(0.018, 0.07, 0.18), vec3(0.065, 0.34, 0.60), sunEdge);
    gl_FragColor = vec4(color, rim * mix(0.055, 0.19, sunEdge) * pulse);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createStarField(count: number) {
  const positions = new Float32Array(count * 3);
  let seed = 9173;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < count; index += 1) {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = 455 + random() * 28;
    const planar = Math.sqrt(1 - z * z);
    positions[index * 3] = Math.cos(angle) * planar * radius;
    positions[index * 3 + 1] = z * radius;
    positions[index * 3 + 2] = Math.sin(angle) * planar * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

/** Real-scale, real-time LEO vista rendered in the spacecraft's LVLH frame. */
export function PlanetVista() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const reduceMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const warpTime = useRef(0);
  const timeScale = useMemo(readOrbitTimeScale, []);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const maps = useTexture([DAY_MAP, NIGHT_MAP, CLOUD_MAP]);
  const dayMap = maps[0]!;
  const nightMap = maps[1]!;
  const cloudMap = maps[2]!;
  const mapOffset = useMemo(readEarthMapOffset, []);
  const cloudOpacity = useMemo(readCloudOpacity, []);
  const cloudDrift = useRef(0);

  useEffect(() => {
    for (const texture of [dayMap, nightMap]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = isMobile ? Math.min(4, maxAnisotropy) : Math.min(16, maxAnisotropy);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
    }
    cloudMap.colorSpace = THREE.NoColorSpace;
    cloudMap.wrapS = THREE.RepeatWrapping;
    cloudMap.anisotropy = isMobile ? Math.min(2, maxAnisotropy) : Math.min(8, maxAnisotropy);
    cloudMap.minFilter = THREE.LinearMipmapLinearFilter;
  }, [dayMap, nightMap, cloudMap, isMobile, maxAnisotropy]);

  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayMap },
          nightMap: { value: nightMap },
          mapOffset: { value: mapOffset },
          sunDirection: { value: new THREE.Vector3(1, 0, 0) },
          cameraPositionWorld: { value: new THREE.Vector3() },
        },
        vertexShader: earthVertexShader,
        fragmentShader: earthFragmentShader,
      }),
    [dayMap, nightMap, mapOffset],
  );

  const cloudMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          cloudMap: { value: cloudMap },
          sunDirection: { value: new THREE.Vector3(1, 0, 0) },
          mapOffset: { value: mapOffset },
          globalOpacity: { value: cloudOpacity },
        },
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
        transparent: true,
        depthWrite: false,
      }),
    [cloudMap, cloudOpacity, mapOffset],
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: new THREE.Vector3(1, 0, 0) },
          cameraPositionWorld: { value: new THREE.Vector3() },
          pulse: { value: 1 },
        },
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const stars = useMemo(() => createStarField(isMobile ? 700 : 1300), [isMobile]);
  const starMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#dce8f4",
        size: isMobile ? 0.34 : 0.25,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        toneMapped: false,
      }),
    [isMobile],
  );

  useEffect(
    () =>
      onCockpitEffect((effect) => {
        if (effect === "warp") warpTime.current = 1.6;
      }),
    [],
  );

  useEffect(
    () => () => {
      stars.dispose();
      starMaterial.dispose();
      earthMaterial.dispose();
      cloudMaterial.dispose();
      atmosphereMaterial.dispose();
    },
    [stars, starMaterial, earthMaterial, cloudMaterial, atmosphereMaterial],
  );

  useFrame(({ camera }, dt) => {
    const earth = earthRef.current;
    const clouds = cloudRef.current;
    const atmosphere = atmosphereRef.current;
    const starField = starsRef.current;
    if (!earth || !clouds || !atmosphere || !starField) return;

    const unixSeconds = Date.now() / 1000;
    const frame = calculateOrbitFrame(unixSeconds, reduceMotion ? 0 : timeScale);
    const earthQuaternion = new THREE.Quaternion().setFromRotationMatrix(frame.earthToCockpit);
    const starsQuaternion = new THREE.Quaternion().setFromRotationMatrix(frame.eciToCockpit);
    earth.position.copy(frame.earthCenter);
    earth.quaternion.copy(earthQuaternion);
    clouds.position.copy(frame.earthCenter);
    clouds.quaternion.copy(earthQuaternion);
    atmosphere.position.copy(frame.earthCenter);
    atmosphere.quaternion.copy(earthQuaternion);
    starField.quaternion.copy(starsQuaternion);

    earthMaterial.uniforms.sunDirection?.value.copy(frame.sunDirection);
    earthMaterial.uniforms.cameraPositionWorld?.value.copy(camera.position);
    cloudMaterial.uniforms.sunDirection?.value.copy(frame.sunDirection);
    if (!reduceMotion) cloudDrift.current = (cloudDrift.current + dt * 0.0000011) % 1;
    const cloudOffset = cloudMaterial.uniforms.mapOffset;
    if (cloudOffset) cloudOffset.value = mapOffset + cloudDrift.current;
    atmosphereMaterial.uniforms.sunDirection?.value.copy(frame.sunDirection);
    atmosphereMaterial.uniforms.cameraPositionWorld?.value.copy(camera.position);
    cockpitSunDirectionRef.current.copy(frame.sunDirection);

    warpTime.current = Math.max(0, warpTime.current - dt);
    const warpPulse = warpTime.current > 0 ? 1 + Math.sin(warpTime.current * 18) * 0.18 : 1;
    const atmospherePulse = atmosphereMaterial.uniforms.pulse;
    if (atmospherePulse) atmospherePulse.value = warpPulse;
  });

  const segments = isMobile ? [64, 40] : [112, 72];
  return (
    <group>
      <points ref={starsRef} geometry={stars} material={starMaterial} frustumCulled={false} />
      <mesh ref={earthRef} material={earthMaterial} frustumCulled={false}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS, segments[0], segments[1]]} />
      </mesh>
      <mesh ref={cloudRef} material={cloudMaterial} scale={1.0024} frustumCulled={false}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS, segments[0], segments[1]]} />
      </mesh>
      <mesh ref={atmosphereRef} material={atmosphereMaterial} scale={1.012} frustumCulled={false}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS, segments[0], segments[1]]} />
      </mesh>
    </group>
  );
}

useTexture.preload(DAY_MAP);
useTexture.preload(NIGHT_MAP);
useTexture.preload(CLOUD_MAP);
