import { GlbProp } from "../../props/GlbProp";
import { ZONES } from "../../zones";
import { ZoneArea } from "../ZoneArea";

/**
 * Gallery — an outdoor sculpture garden. Each "sculpture" is a
 * distinct Kenney GLB to give the garden variety. Surrounded by
 * trees + flowers + a bench for contemplation.
 */
export function GalleryArea() {
  return (
    <ZoneArea id="gallery" title="Gallery" position={ZONES.gallery.position} radius={5}>
      {/* Four sculptures arranged roughly like a quad plinth set */}
      <GlbProp
        url="/models/props/kenney/tower-hexagon-top.glb"
        position={[-2.2, 0, 0]}
        scale={0.9}
      />
      <GlbProp url="/models/props/kenney/rocks-large.glb" position={[-0.6, 0, -0.8]} scale={0.9} />
      <GlbProp
        url="/models/props/kenney/tower-square-arch.glb"
        position={[1.4, 0, 0]}
        scale={0.8}
      />
      <GlbProp
        url="/models/props/kenney/tower-square-base-border.glb"
        position={[2.8, 0, -0.6]}
        scale={0.9}
      />

      {/* Surrounding trees + flora */}
      <GlbProp url="/models/props/kenney/tree_fat.glb" position={[-3.8, 0, 1.6]} scale={1.1} />
      <GlbProp url="/models/props/kenney/tree_oak.glb" position={[3.8, 0, 1.6]} scale={1.1} />
      <GlbProp
        url="/models/props/kenney/plant_bushDetailed.glb"
        position={[0, 0, 2.0]}
        scale={0.9}
      />
      <GlbProp
        url="/models/props/kenney/flower_yellowA.glb"
        position={[-1.5, 0, 1.6]}
        scale={0.9}
      />
      <GlbProp url="/models/props/kenney/flower_purpleA.glb" position={[1.5, 0, 1.6]} scale={0.9} />

      {/* Visitor bench */}
      <GlbProp
        url="/models/props/kenney/bench.glb"
        position={[0, 0, 2.6]}
        rotation={[0, Math.PI, 0]}
        scale={1.1}
      />
    </ZoneArea>
  );
}
