import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useActiveTheme } from "@/hooks/useActiveTheme";
import type { ProjectId } from "@/types/tools";

/**
 * Module-scope shared loader. `THREE.TextureLoader` is stateless so a
 * single instance per process avoids re-creating its internal cache
 * keys + simplifies cleanup (we only dispose the textures we get out).
 */
const sharedTextureLoader = new THREE.TextureLoader();
sharedTextureLoader.crossOrigin = "anonymous";

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawVocabuddy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#6f63ff";
  roundedRect(ctx, 72, 48, 816, 504, 40);
  ctx.fill();
  ctx.fillStyle = "#18152e";
  roundedRect(ctx, 108, 82, 744, 436, 28);
  ctx.fill();
  ctx.fillStyle = "#a9ffdc";
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText("VOCABUDDY / DAILY QUEST", 146, 132);
  ctx.fillStyle = "#f4f1ff";
  ctx.font = "800 58px Inter, system-ui, sans-serif";
  ctx.fillText("serendipity", 146, 250);
  ctx.fillStyle = "#aaa5c7";
  ctx.font = "500 25px Inter, system-ui, sans-serif";
  ctx.fillText("noun  ·  an unexpected happy discovery", 146, 292);
  ctx.fillStyle = "#282242";
  roundedRect(ctx, 146, 340, 500, 86, 20);
  ctx.fill();
  ctx.fillStyle = "#d7d2ff";
  ctx.font = "500 22px Inter, system-ui, sans-serif";
  ctx.fillText("I found this song by pure serendipity.", 176, 392);
  ctx.fillStyle = "#a9ffdc";
  roundedRect(ctx, 684, 340, 128, 86, 20);
  ctx.fill();
  ctx.fillStyle = "#18152e";
  ctx.font = "800 24px Inter, system-ui, sans-serif";
  ctx.fillText("NEXT →", 707, 392);
}

function drawShotMock(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#081d2b";
  ctx.fillRect(0, 0, 960, 600);
  ctx.fillStyle = "#0e3345";
  roundedRect(ctx, 52, 52, 856, 496, 28);
  ctx.fill();
  ctx.fillStyle = "#8ae9ff";
  ctx.font = "700 22px ui-monospace, monospace";
  ctx.fillText("SHOTMOCK  /  APP STORE COMPOSER", 86, 98);
  ctx.fillStyle = "#07151e";
  roundedRect(ctx, 86, 132, 236, 374, 36);
  ctx.fill();
  ctx.fillStyle = "#d9f7ff";
  roundedRect(ctx, 102, 154, 204, 330, 24);
  ctx.fill();
  const phoneGradient = ctx.createLinearGradient(118, 190, 290, 450);
  phoneGradient.addColorStop(0, "#2d68ff");
  phoneGradient.addColorStop(1, "#8d50ff");
  ctx.fillStyle = phoneGradient;
  roundedRect(ctx, 118, 190, 172, 246, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 30px Inter, system-ui, sans-serif";
  ctx.fillText("Build.", 142, 270);
  ctx.fillText("Polish.", 142, 310);
  ctx.fillText("Ship.", 142, 350);
  for (let index = 0; index < 3; index += 1) {
    ctx.fillStyle = index === 1 ? "#25d5ba" : "#173f51";
    roundedRect(ctx, 368 + index * 162, 160, 138, 278, 18);
    ctx.fill();
    ctx.fillStyle = index === 1 ? "#06322f" : "#9ccbd8";
    roundedRect(ctx, 388 + index * 162, 184, 98, 150, 12);
    ctx.fill();
    ctx.fillStyle = index === 1 ? "#083632" : "#bde5ed";
    ctx.fillRect(388 + index * 162, 360, 92, 9);
    ctx.fillRect(388 + index * 162, 380, 70, 7);
  }
  ctx.fillStyle = "#8ae9ff";
  ctx.font = "600 18px ui-monospace, monospace";
  ctx.fillText("64 TEMPLATES  ·  EXPORT READY", 368, 486);
}

function drawClaudeVoice(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#171612";
  ctx.fillRect(0, 0, 960, 600);
  ctx.fillStyle = "#24221c";
  roundedRect(ctx, 54, 52, 852, 496, 28);
  ctx.fill();
  ctx.fillStyle = "#e8c39b";
  ctx.font = "700 22px ui-monospace, monospace";
  ctx.fillText("CLAUDE VOICE  /  LOCAL SESSION", 90, 104);
  ctx.fillStyle = "#10100e";
  roundedRect(ctx, 90, 140, 780, 220, 18);
  ctx.fill();
  for (let index = 0; index < 44; index += 1) {
    const height = 18 + Math.abs(Math.sin(index * 0.71) * Math.cos(index * 0.19)) * 112;
    ctx.fillStyle = index < 32 ? "#d8a97a" : "#665344";
    roundedRect(ctx, 112 + index * 16, 250 - height / 2, 8, height, 4);
    ctx.fill();
  }
  ctx.fillStyle = "#8c877c";
  ctx.font = "500 21px ui-monospace, monospace";
  ctx.fillText("> listening locally…", 100, 410);
  ctx.fillStyle = "#f0ece3";
  ctx.font = "600 25px Inter, system-ui, sans-serif";
  ctx.fillText("“Refactor the auth middleware and run tests.”", 100, 458);
  ctx.fillStyle = "#7ed7c4";
  roundedRect(ctx, 100, 490, 208, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#12362f";
  ctx.font = "700 16px ui-monospace, monospace";
  ctx.fillText("WAKE WORD ACTIVE", 124, 513);
}

function drawCupXi(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#071b15";
  ctx.fillRect(0, 0, 960, 600);
  ctx.fillStyle = "#0c4b35";
  roundedRect(ctx, 52, 42, 856, 516, 32);
  ctx.fill();
  ctx.strokeStyle = "rgba(220,255,235,0.58)";
  ctx.lineWidth = 4;
  ctx.strokeRect(102, 88, 756, 424);
  ctx.beginPath();
  ctx.moveTo(480, 88);
  ctx.lineTo(480, 512);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(480, 300, 68, 0, Math.PI * 2);
  ctx.stroke();
  const players: Array<readonly [number, number]> = [
    [174, 300],
    [310, 166],
    [310, 300],
    [310, 434],
    [480, 196],
    [480, 404],
    [635, 148],
    [635, 252],
    [635, 356],
    [635, 460],
    [786, 300],
  ];
  for (let index = 0; index < players.length; index += 1) {
    const [x, y] = players[index]!;
    ctx.fillStyle = index === 10 ? "#f1c453" : "#d8fff0";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#083526";
    ctx.font = "800 15px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), x, y + 5);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#f1c453";
  ctx.font = "800 22px ui-monospace, monospace";
  ctx.fillText("THE CUP XI  /  4–4–2", 78, 75);
}

function procedural(projectId: ProjectId, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    if (projectId === "vocabuddy") drawVocabuddy(ctx);
    if (projectId === "shotmock") drawShotMock(ctx);
    if (projectId === "claude-voice") drawClaudeVoice(ctx);
    if (projectId === "thecupxi") drawCupXi(ctx);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundedRect(ctx, 18, 18, 924, 564, 34);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Thumbnail plane for a project card. Resolution order:
 *
 *   1. `/previews/{id}.webp` — user-authored screenshot. If it loads,
 *      it wins.
 *   2. Project-specific procedural `CanvasTexture` — a polished offline
 *      product visual that communicates what the project actually does.
 *
 * All three render to the same 3D textured plane. Both fallback and
 * remote textures are disposed on unmount + on theme/projectId change
 * so they don't leak GPU memory across long sessions.
 */
export function ProjectThumb({
  projectId,
  width,
  height,
  opacity = 1,
}: {
  projectId: ProjectId;
  title: string;
  width: number;
  height: number;
  opacity?: number;
}) {
  const theme = useActiveTheme();
  const accent = theme.palette.accent;

  // Procedural fallback — always available, used at first paint and
  // as the final fallback. Regenerated per theme + title change; the
  // previous canvas texture is disposed in the cleanup below.
  const canvasTex = useMemo(() => procedural(projectId, accent), [accent, projectId]);
  useEffect(
    () => () => {
      canvasTex.dispose();
    },
    [canvasTex],
  );

  const [remoteTex, setRemoteTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let acquired: THREE.Texture | null = null;

    sharedTextureLoader.load(
      `/previews/${projectId}.webp`,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        acquired = tex;
        setRemoteTex(tex);
      },
      undefined,
      () => {
        // Missing custom screenshot: the project-specific canvas stays active.
      },
    );

    return () => {
      cancelled = true;
      // Dispose any texture we acquired so swapping projects doesn't
      // leak GPU memory.
      if (acquired) acquired.dispose();
      setRemoteTex(null);
    };
  }, [projectId]);

  const active = remoteTex ?? canvasTex;

  return (
    <mesh position={[0, 0, 0.001]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={active} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}
