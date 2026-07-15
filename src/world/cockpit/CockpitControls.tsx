import { Text } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { useStore } from "@/stores";
import type { CompanyId, ProjectId, SkillGroup, UiEvent } from "@/types/tools";
import { emitCockpitEffect } from "./cockpitEvents";
import { COCKPIT_WALL_SLOTS } from "./layout";

type HotspotProps = {
  name: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  onActivate: () => void;
};

type ConsoleId = "projects" | "experience" | "skills" | "contact";

type ConsoleDefinition = {
  id: ConsoleId;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  labels?: readonly [string, string, string, string];
};

const PROJECTS: readonly ProjectId[] = ["vocabuddy", "shotmock", "claude-voice", "thecupxi"];
const EXPERIENCE: readonly CompanyId[] = ["ing-bank", "formica", "nar-sistem"];
const SKILLS: readonly SkillGroup[] = ["ai", "backend", "frontend", "devops"];

const CONSOLES: readonly ConsoleDefinition[] = [
  {
    id: "projects",
    position: [...COCKPIT_WALL_SLOTS.projects.position],
    rotation: [...COCKPIT_WALL_SLOTS.projects.rotation],
    width: 9.25,
    height: 3.55,
  },
  {
    id: "experience",
    position: [...COCKPIT_WALL_SLOTS.experience.position],
    rotation: [...COCKPIT_WALL_SLOTS.experience.rotation],
    width: 5.8,
    height: 3.65,
  },
  {
    id: "skills",
    position: [...COCKPIT_WALL_SLOTS.skills.position],
    rotation: [...COCKPIT_WALL_SLOTS.skills.rotation],
    width: 5.1,
    height: 3.45,
  },
  {
    id: "contact",
    position: [4.5, 2.25, 5.98],
    rotation: [0, -0.16, 0],
    width: 3.8,
    height: 2.05,
    labels: ["BACK", "EMAIL", "LINK", "COPY"],
  },
] as const;

const TELEMETRY = [
  { x: -4.35, title: "ALT", value: "420 KM", color: "#62d9f4" },
  { x: -2.65, title: "VEL", value: "7.66 KM/S", color: "#f2aa62" },
  { x: 2.65, title: "ORBIT", value: "92.97 MIN", color: "#62d9f4" },
  { x: 4.35, title: "LINK", value: "ONLINE", color: "#f2aa62" },
] as const;

const OVERHEAD_STATUS = [
  { x: -2.05, label: "PWR", value: "NOM" },
  { x: -0.68, label: "NAV", value: "LVLH" },
  { x: 0.68, label: "O₂", value: "21%" },
  { x: 2.05, label: "LINK", value: "UP" },
] as const;

function Hotspot({ name, position, scale, rotation = [0, 0, 0], onActivate }: HotspotProps) {
  const [hovered, setHovered] = useState(false);
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onActivate();
  };

  return (
    <mesh
      name={name}
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={activate}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <boxGeometry />
      <meshBasicMaterial
        color="#65dff7"
        transparent
        opacity={hovered ? 0.18 : 0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Functional physical controls and semantic flight-status readouts. */
export function CockpitControls() {
  const apply = useStore((state) => state.applyUiEvent);
  const hideContent = useStore((state) => state.hideContent);
  const active = useStore((state) => state.world.activeContent);

  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  const sequence = (...events: UiEvent[]) => {
    for (const event of events) apply(event);
  };

  const back = () => {
    hideContent();
    sequence({ kind: "camera.focus", target: "hub" }, { kind: "mascot.return_to_hub" });
  };

  const focus = (id: ConsoleId) => {
    if (id === "projects") {
      sequence(
        { kind: "camera.focus", target: "projects" },
        { kind: "mascot.move", zone: "projects" },
        {
          kind: "content.project",
          project: active?.kind === "project" ? active.project : PROJECTS[0]!,
        },
      );
      return;
    }
    if (id === "experience") {
      sequence(
        { kind: "camera.focus", target: "experience" },
        { kind: "mascot.move", zone: "experience" },
        {
          kind: "content.experience",
          company: active?.kind === "experience" ? active.company : EXPERIENCE[1]!,
        },
      );
      return;
    }
    if (id === "skills") {
      sequence(
        { kind: "camera.focus", target: "skills" },
        { kind: "mascot.move", zone: "skills" },
        {
          kind: "content.skill_group",
          group: active?.kind === "skill_group" ? active.group : SKILLS[0]!,
        },
      );
      return;
    }
    sequence(
      { kind: "camera.focus", target: "contact" },
      { kind: "mascot.move", zone: "contact" },
      { kind: "content.contact_card" },
    );
  };

  const activateContactControl = (index: number) => {
    if (index === 0) {
      back();
      return;
    }
    if (index === 1) window.location.href = "mailto:menesahin99@gmail.com";
    if (index === 2)
      window.open("https://linkedin.com/in/menesahin", "_blank", "noopener,noreferrer");
    if (index === 3) void navigator.clipboard?.writeText("menesahin99@gmail.com");
  };

  return (
    <group>
      {CONSOLES.map((console) => {
        const controlY = -console.height / 2 - 0.41;
        const labelY = controlY + 0.19;
        return (
          <group key={console.id} position={console.position} rotation={console.rotation}>
            <Hotspot
              name={`${console.id}-screen-hotspot`}
              position={[0, 0, -0.12]}
              scale={[console.width, console.height, 0.08]}
              onActivate={() => focus(console.id)}
            />
            {console.labels?.map((label, index) => {
              const x = console.width * ([-0.33, -0.11, 0.11, 0.33][index] ?? 0);
              return (
                <group key={label}>
                  <Hotspot
                    name={`${console.id}-${label.toLowerCase()}-control`}
                    position={[x, controlY, 0.13]}
                    scale={[0.64, 0.35, 0.24]}
                    onActivate={() => activateContactControl(index)}
                  />
                  <Text
                    position={[x, labelY, 0.16]}
                    fontSize={console.id === "contact" ? 0.105 : 0.12}
                    color={index === 0 ? "#ef9b61" : index === 3 ? "#6ee5f7" : "#d8e0dc"}
                    anchorX="center"
                    anchorY="middle"
                    fontWeight={700}
                    letterSpacing={0.08}
                  >
                    {label}
                  </Text>
                </group>
              );
            })}
            <Text
              position={[-console.width / 2 + 0.22, controlY + 0.19, 0.16]}
              fontSize={0.075}
              color="#9bb7b7"
              anchorX="left"
              anchorY="middle"
              letterSpacing={0.06}
            >
              PWR · LINK · ACT
            </Text>
          </group>
        );
      })}

      {TELEMETRY.map((item) => (
        <group key={item.title} position={[item.x, 1.69, -4.84]}>
          <Text
            position={[0, 0.07, 0.13]}
            fontSize={0.09}
            color={item.color}
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
            letterSpacing={0.08}
          >
            {item.title}
          </Text>
          <Text
            position={[0, -0.07, 0.13]}
            fontSize={0.075}
            color="#d9e1dc"
            anchorX="center"
            anchorY="middle"
          >
            {item.value}
          </Text>
        </group>
      ))}

      {OVERHEAD_STATUS.map((status) => (
        <group key={status.label} position={[status.x, 7.23, -1.25]} rotation={[Math.PI / 2, 0, 0]}>
          <Text
            position={[0, 0.3, 0.02]}
            fontSize={0.12}
            color="#dce4df"
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
          >
            {status.label}
          </Text>
          <Text
            position={[0, 0.08, 0.02]}
            fontSize={0.085}
            color="#71d9ea"
            anchorX="center"
            anchorY="middle"
          >
            {status.value}
          </Text>
        </group>
      ))}

      <Text position={[-0.58, 2.05, -4.72]} fontSize={0.1} color="#69dff3" anchorX="center">
        WARP
      </Text>
      <Hotspot
        name="WarpButtonHotspot"
        position={[-0.58, 1.8, -4.73]}
        scale={[0.5, 0.22, 0.25]}
        onActivate={() => {
          emitCockpitEffect("warp");
          sequence(
            { kind: "mascot.gesture", gesture: "spin_happy" },
            { kind: "mascot.emote", icon: "sparkle" },
          );
        }}
      />
      <Text position={[0.58, 2.05, -4.72]} fontSize={0.1} color="#efaa65" anchorX="center">
        KÖFTE
      </Text>
      <Hotspot
        name="KofteButtonHotspot"
        position={[0.58, 1.8, -4.73]}
        scale={[0.5, 0.22, 0.25]}
        onActivate={() => {
          emitCockpitEffect("kofte-dance");
          sequence(
            { kind: "mascot.gesture", gesture: "dance" },
            { kind: "mascot.emote", icon: "note" },
          );
        }}
      />
    </group>
  );
}
