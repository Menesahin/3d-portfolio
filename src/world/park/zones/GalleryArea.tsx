import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

/**
 * Gallery — outdoor sculpture garden with four distinct Kenney
 * sculptures on plinth stones, ringed by flora and backed by a
 * viewing bench. Everything scaled up so silhouettes read at
 * overview distance.
 */
export function GalleryArea() {
  return (
    <ZoneArea id="gallery" title="Gallery" position={ZONES.gallery.position} radius={4.4}>
      {/* Four sculptures in a quad arrangement, each on a small plinth. */}
      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[-2.4, 0, -0.5]} scale={0.9} />
      <GlbProp
        url="/models/props/kenney/tower-hexagon-top.glb"
        position={[-2.4, 0.3, -0.5]}
        scale={1.3}
      />

      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[-0.7, 0, -0.5]} scale={0.9} />
      <GlbProp
        url="/models/props/kenney/rocks-large.glb"
        position={[-0.7, 0.3, -0.5]}
        scale={1.1}
      />

      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[1.0, 0, -0.5]} scale={0.9} />
      <GlbProp
        url="/models/props/kenney/tower-square-arch.glb"
        position={[1.0, 0.3, -0.5]}
        scale={1.2}
      />

      <GlbProp url="/models/props/kenney/rocks-small.glb" position={[2.7, 0, -0.5]} scale={0.9} />
      <GlbProp
        url="/models/props/kenney/tower-square-base-border.glb"
        position={[2.7, 0.3, -0.5]}
        scale={1.3}
      />

      {/* Viewing bench in front */}
      <GlbProp
        url="/models/props/kenney/bench.glb"
        position={[0, 0, 2.2]}
        rotation={[0, Math.PI, 0]}
        scale={1.4}
      />

      {/* Flora accents */}
      <GlbProp
        url="/models/props/kenney/flower_yellowA.glb"
        position={[-3.4, 0, 1.2]}
        scale={1.1}
      />
      <GlbProp url="/models/props/kenney/flower_purpleA.glb" position={[3.4, 0, 1.2]} scale={1.1} />

      {/* Floor lamps for evening reads */}
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[-3.6, 0, -0.3]}
        scale={1.2}
      />
      <GlbProp
        url="/models/props/kenney/lampRoundFloor.glb"
        position={[3.6, 0, -0.3]}
        scale={1.2}
      />
    </ZoneArea>
  );
}
