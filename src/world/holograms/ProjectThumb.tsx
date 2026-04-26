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

/**
 * Seeded placeholder image URLs via picsum.photos — deterministic per
 * project so the same visitor sees the same shot every time. These are
 * thematic-but-generic stand-ins until real product screenshots are
 * dropped into `public/previews/{id}.webp` (which takes priority).
 */
const REMOTE_PLACEHOLDER: Record<ProjectId, string> = {
  vocabuddy: "https://picsum.photos/seed/vocabuddy-portfolio-v2/640/400",
  shotmock: "https://picsum.photos/seed/shotmock-portfolio-v2/640/400",
  "claude-voice": "https://picsum.photos/seed/claude-voice-portfolio-v2/640/400",
  thecupxi: "https://picsum.photos/seed/thecupxi-portfolio-v2/640/400",
};

function procedural(title: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 640, 400);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, "#060a16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 400);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 58px Inter, system-ui, sans-serif";
    ctx.fillText(title, 36, 360);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 22px JetBrains Mono, ui-monospace, monospace";
    ctx.fillText("// preview placeholder", 36, 316);
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
 *   2. Seeded picsum.photos URL — thematic placeholder so the panel
 *      doesn't look empty until real art is dropped in.
 *   3. Procedural `CanvasTexture` — last-ditch fallback if the network
 *      is unreachable (offline dev, CSP block, etc).
 *
 * All three render to the same 3D textured plane. Both fallback and
 * remote textures are disposed on unmount + on theme/projectId change
 * so they don't leak GPU memory across long sessions.
 */
export function ProjectThumb({
  projectId,
  title,
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
  const canvasTex = useMemo(() => procedural(title, accent), [accent, title]);
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

    const tryUrl = (url: string, onFail: () => void) => {
      sharedTextureLoader.load(
        url,
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
        onFail,
      );
    };

    tryUrl(`/previews/${projectId}.webp`, () => {
      if (cancelled) return;
      tryUrl(REMOTE_PLACEHOLDER[projectId], () => {
        // Both failed — procedural canvas carries it.
      });
    });

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
