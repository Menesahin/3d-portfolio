import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { playCockpitSound, toggleCockpitSoundPreference } from "@/audio/cockpitAudio";
import { useStore } from "@/stores";
import type { UiEvent } from "@/types/tools";
import { emitCockpitEffect } from "../cockpitEvents";
import { COCKPIT_V7_ASSETS, COCKPIT_V7_CONTROLS } from "./layout";
import { cloneSceneWithMaterials, disposeSceneMaterials, tuneV7Scene } from "./materials";

useGLTF.preload(COCKPIT_V7_ASSETS.controls);

type ControlPose = {
  object: THREE.Object3D;
  scale: THREE.Vector3;
  rotation: THREE.Euler;
};

function controlIdFromObject(object: THREE.Object3D | null): string | null {
  let current = object;
  while (current) {
    if (typeof current.userData.controlId === "string") return current.userData.controlId;
    current = current.parent;
  }
  return null;
}

/** Named, animated physical control layer exported separately from the static shell. */
export function CockpitControlsV7() {
  const { scene } = useGLTF(COCKPIT_V7_ASSETS.controls);
  const controls = useMemo(() => cloneSceneWithMaterials(scene), [scene]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const releaseTimer = useRef<number | null>(null);
  const activeControl = useStore((state) => state.cockpit.activeControl);
  const flightMode = useStore((state) => state.cockpit.flightMode);
  const systemCoverOpen = useStore((state) => state.cockpit.systemCoverOpen);
  const powerCoverOpen = useStore((state) => state.cockpit.powerCoverOpen);
  const setActiveControl = useStore((state) => state.setActiveCockpitControl);

  const poses = useMemo(() => {
    const result = new Map<string, ControlPose>();
    controls.traverse((object) => {
      const id = object.userData.controlId;
      if (typeof id !== "string") return;
      result.set(id, {
        object,
        scale: object.scale.clone(),
        rotation: object.rotation.clone(),
      });
    });
    return result;
  }, [controls]);

  useEffect(() => {
    tuneV7Scene(controls, false);
    return () => disposeSceneMaterials(controls);
  }, [controls]);

  useEffect(
    () => () => {
      document.body.style.cursor = "";
      if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current);
    },
    [],
  );

  useFrame((_, dt) => {
    for (const [id, pose] of poses) {
      const pressed = activeControl === id;
      const hovered = hoveredId === id;
      const targetX = pose.scale.x * (hovered ? 1.04 : 1);
      const targetY = pose.scale.y * (hovered ? 1.04 : 1);
      const targetZ = pose.scale.z * (pressed ? 0.72 : 1);
      pose.object.scale.x = THREE.MathUtils.damp(pose.object.scale.x, targetX, 18, dt);
      pose.object.scale.y = THREE.MathUtils.damp(pose.object.scale.y, targetY, 18, dt);
      pose.object.scale.z = THREE.MathUtils.damp(pose.object.scale.z, targetZ, 22, dt);

      let targetRotationX = pose.rotation.x;
      if (id === "system-cover" && systemCoverOpen) targetRotationX -= 1.05;
      if (id === "power-cover" && powerCoverOpen) targetRotationX -= 1.05;
      if (id === "orbital-lever") {
        targetRotationX = flightMode === "park" ? -0.314 : flightMode === "cruise" ? 0.119 : 0.349;
      }
      pose.object.rotation.x = THREE.MathUtils.damp(
        pose.object.rotation.x,
        targetRotationX,
        id === "orbital-lever" ? 7 : 10,
        dt,
      );
    }
  });

  const executeAction = useCallback((controlId: string) => {
    const definition = COCKPIT_V7_CONTROLS[controlId];
    if (!definition) return;
    const state = useStore.getState();
    const apply = state.applyUiEvent;
    const sequence = (...events: UiEvent[]) => {
      for (const event of events) apply(event);
    };
    const navigate = (target: "projects" | "experience" | "skills" | "contact") => {
      apply({ kind: "cockpit.view", mode: "interior" });
      if (target === "projects") {
        sequence(
          { kind: "camera.focus", target },
          { kind: "mascot.move", zone: target },
          { kind: "content.project", project: "vocabuddy" },
        );
      } else if (target === "experience") {
        sequence(
          { kind: "camera.focus", target },
          { kind: "mascot.move", zone: target },
          { kind: "content.experience", company: "formica" },
        );
      } else if (target === "skills") {
        sequence(
          { kind: "camera.focus", target },
          { kind: "mascot.move", zone: target },
          { kind: "content.skill_group", group: "ai" },
        );
      } else {
        sequence(
          { kind: "camera.focus", target },
          { kind: "mascot.move", zone: target },
          { kind: "content.contact_card" },
        );
      }
    };

    playCockpitSound("console");
    switch (definition.action) {
      case "navigate.projects":
        navigate("projects");
        break;
      case "navigate.experience":
        navigate("experience");
        break;
      case "navigate.skills":
        navigate("skills");
        break;
      case "navigate.contact":
        navigate("contact");
        break;
      case "navigate.overview":
        sequence({ kind: "cockpit.view", mode: "exterior" }, { kind: "mascot.return_to_hub" });
        break;
      case "navigate.home":
        sequence(
          { kind: "cockpit.view", mode: "interior" },
          { kind: "camera.focus", target: "hub" },
          { kind: "mascot.return_to_hub" },
        );
        break;
      case "camera.close":
        apply({ kind: "camera.zoom", level: "close" });
        state.setCockpitStatus("OPTICS · CLOSE");
        break;
      case "camera.wide":
        apply({ kind: "camera.zoom", level: "wide" });
        state.setCockpitStatus("OPTICS · WIDE");
        break;
      case "lighting.cycle":
        state.cycleCockpitLighting();
        break;
      case "lighting.standard":
      case "lighting.neutral":
        state.setCockpitLighting("standard");
        break;
      case "lighting.observation":
        state.setCockpitLighting("observation");
        break;
      case "lighting.cool":
        state.setCockpitLighting("cool");
        break;
      case "lighting.warm":
        state.setCockpitLighting("warm");
        break;
      case "system.cover":
        state.toggleCockpitSystemCover();
        break;
      case "system.reset":
        if (!state.cockpit.systemCoverOpen) {
          state.setCockpitStatus("RESET LOCKED · OPEN RED GUARD");
          break;
        }
        sequence(
          { kind: "world.reset" },
          { kind: "mascot.return_to_hub" },
          { kind: "camera.focus", target: "overview" },
        );
        state.toggleCockpitSystemCover();
        state.setCockpitStatus("NAVIGATION STATE · RESET");
        break;
      case "contact.email":
        window.location.href = "mailto:menesahin99@gmail.com";
        break;
      case "contact.linkedin":
        window.open("https://linkedin.com/in/menesahin", "_blank", "noopener,noreferrer");
        break;
      case "contact.copy":
        void navigator.clipboard?.writeText("menesahin99@gmail.com");
        state.setCockpitStatus("COMMS · EMAIL COPIED");
        break;
      case "language.en":
        state.setLang("en");
        state.setCockpitStatus("LANGUAGE · ENGLISH");
        break;
      case "language.tr":
        state.setLang("tr");
        state.setCockpitStatus("DİL · TÜRKÇE");
        break;
      case "experience.ing-bank":
        sequence(
          { kind: "camera.focus", target: "experience" },
          { kind: "mascot.move", zone: "experience" },
          { kind: "content.experience", company: "ing-bank" },
        );
        break;
      case "experience.formica":
        sequence(
          { kind: "camera.focus", target: "experience" },
          { kind: "mascot.move", zone: "experience" },
          { kind: "content.experience", company: "formica" },
        );
        break;
      case "experience.nar-sistem":
        sequence(
          { kind: "camera.focus", target: "experience" },
          { kind: "mascot.move", zone: "experience" },
          { kind: "content.experience", company: "nar-sistem" },
        );
        break;
      case "skills.ai":
      case "skills.backend":
      case "skills.frontend":
      case "skills.devops": {
        const group = definition.action.slice("skills.".length) as
          | "ai"
          | "backend"
          | "frontend"
          | "devops";
        sequence(
          { kind: "camera.focus", target: "skills" },
          { kind: "mascot.move", zone: "skills" },
          { kind: "content.skill_group", group },
        );
        break;
      }
      case "system.audio":
        void toggleCockpitSoundPreference().then((enabled) => {
          useStore.getState().setCockpitStatus(`COCKPIT AUDIO · ${enabled ? "ONLINE" : "MUTED"}`);
          if (enabled) playCockpitSound("console");
        });
        break;
      case "power.cover":
        state.toggleCockpitPowerCover();
        break;
      case "power.toggle":
        if (!state.cockpit.powerCoverOpen) {
          state.setCockpitStatus("POWER LOCKED · OPEN RED GUARD");
          break;
        }
        state.toggleCockpitMasterPower();
        break;
      case "mode.cycle": {
        const mode = state.cycleCockpitFlightMode();
        if (mode === "warp") {
          emitCockpitEffect("warp");
          sequence(
            { kind: "mascot.gesture", gesture: "spin_happy" },
            { kind: "mascot.emote", icon: "sparkle" },
          );
          state.setCockpitLighting("alert");
        } else if (state.cockpit.lighting === "alert") {
          state.setCockpitLighting("standard");
        }
        break;
      }
      default:
        state.setCockpitStatus(definition.label.toUpperCase());
    }
  }, []);

  const activate = useCallback(
    (controlId: string) => {
      if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current);
      setActiveControl(controlId);
      executeAction(controlId);
      releaseTimer.current = window.setTimeout(() => setActiveControl(null), 180);
    },
    [executeAction, setActiveControl],
  );

  const onPointerOver = (event: ThreeEvent<PointerEvent>) => {
    const id = controlIdFromObject(event.object);
    if (!id) return;
    event.stopPropagation();
    setHoveredId(id);
    document.body.style.cursor = "pointer";
  };

  const onPointerOut = (event: ThreeEvent<PointerEvent>) => {
    const id = controlIdFromObject(event.object);
    if (!id || hoveredId !== id) return;
    setHoveredId(null);
    document.body.style.cursor = "";
  };

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    const id = controlIdFromObject(event.object);
    if (!id) return;
    event.stopPropagation();
    activate(id);
  };

  const hovered = hoveredId ? COCKPIT_V7_CONTROLS[hoveredId] : null;

  return (
    <group>
      <primitive
        object={controls}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      />
      {Object.entries(COCKPIT_V7_CONTROLS).map(([id, definition]) => (
        <mesh
          key={`${id}-touch-target`}
          position={definition.position}
          scale={definition.hitSize}
          userData={{ controlId: id }}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={onClick}
        >
          <boxGeometry />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {hovered && (
        <mesh position={[hovered.position[0], hovered.position[1] + 0.08, hovered.position[2]]}>
          <sphereGeometry args={[0.18, 14, 8]} />
          <meshBasicMaterial
            color="#6eeeff"
            transparent
            opacity={0.24}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
