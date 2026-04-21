import { ParkGround } from "./ParkGround";
import { ContactArea } from "./zones/ContactArea";
import { ExperienceArea } from "./zones/ExperienceArea";
import { GalleryArea } from "./zones/GalleryArea";
import { HubArea } from "./zones/HubArea";
import { ProjectsArea } from "./zones/ProjectsArea";
import { SkillsArea } from "./zones/SkillsArea";

/**
 * The outdoor exposition park — ground-level scene that replaced the
 * old "floating islands with tables" layout. Every prop is a Kenney
 * CC0 GLB; zero procedural geometry aside from the flat shadow-catcher
 * ground plane underneath the tiled paths.
 */
export function Park() {
  return (
    <>
      <ParkGround />
      <HubArea />
      <ExperienceArea />
      <ProjectsArea />
      <SkillsArea />
      <GalleryArea />
      <ContactArea />
    </>
  );
}
