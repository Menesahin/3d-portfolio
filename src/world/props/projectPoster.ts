import * as THREE from "three";
import type { ProjectId } from "@/types/tools";

/**
 * Build a CanvasTexture that looks like a curated project poster — big
 * wordmark, a tagline, a coloured accent band, and an icon glyph. Swap
 * these for real screenshot textures (JPEG in `/public/gallery/`) later
 * by adding an `imageUrl` to `POSTERS` and branching in `makePoster`.
 */

export type PosterSpec = {
  title: string;
  tagline: string;
  glyph: string;
  bg: [string, string]; // gradient pair
  accent: string;
};

export const POSTERS: Record<ProjectId, PosterSpec> = {
  vocabuddy: {
    title: "VOCABUDDY",
    tagline: "AI vocabulary · iOS",
    glyph: "A", // bold wordmark-style initial
    bg: ["#16425b", "#2e6f95"],
    accent: "#f5dd90",
  },
  shotmock: {
    title: "SHOTMOCK",
    tagline: "App Store mockups · SaaS",
    glyph: "◇",
    bg: ["#2d3047", "#419d78"],
    accent: "#f6ae2d",
  },
  "claude-voice": {
    title: "CLAUDE VOICE",
    tagline: "OSS · voice for Claude Code",
    glyph: "◎",
    bg: ["#3e1f47", "#824670"],
    accent: "#ff9f68",
  },
};

const TEXTURE_CACHE = new Map<ProjectId, THREE.CanvasTexture>();

export function getPosterTexture(id: ProjectId): THREE.CanvasTexture {
  const cached = TEXTURE_CACHE.get(id);
  if (cached) return cached;

  const spec = POSTERS[id];
  const W = 512;
  const H = 768;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Fallback: 1×1 black texture
    const data = new Uint8Array([0, 0, 0, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex as unknown as THREE.CanvasTexture;
  }

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, spec.bg[0]);
  grad.addColorStop(1, spec.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid texture
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Big glyph (centre)
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 400px system-ui, sans-serif";
  ctx.fillText(spec.glyph, W / 2, H / 2);

  // Accent band near bottom
  ctx.fillStyle = spec.accent;
  ctx.fillRect(48, H - 170, W - 96, 6);

  // Wordmark
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 52px system-ui, sans-serif";
  ctx.fillText(spec.title, 52, H - 100);

  // Tagline
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillText(spec.tagline, 52, H - 60);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  TEXTURE_CACHE.set(id, texture);
  return texture;
}
