"""Upgrade Köfte inside the connected V7 Blender workspace.

This operator is intentionally run through the live Blender MCP connection.
It keeps the cockpit scene untouched, stores the mascot in its own
``KOFTE_MK2`` scene, preserves the imported rig/actions, and exports the web
GLB from that scene.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE_GLB = ROOT / "public" / "models" / "cockpit" / "kofte.glb"
OUTPUT_GLB = SOURCE_GLB
PREVIEW_PATH = ROOT / "art" / "blender" / "previews" / "kofte-v7.png"
SCENE_NAME = "KOFTE_MK2"
RIG_NAME = "KofteRig"
DETAIL_PREFIX = "Kofte_V7Detail_"
STUDIO_PREFIX = "KofteV7_Studio_"


def principled_material(
    old_name: str,
    new_name: str,
    *,
    base: tuple[float, float, float, float],
    metallic: float,
    roughness: float,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    coat_weight: float = 0.0,
    coat_roughness: float = 0.2,
) -> bpy.types.Material:
    """Rename and retune one imported Köfte material, idempotently."""

    material = bpy.data.materials.get(new_name) or bpy.data.materials.get(old_name)
    if material is None:
        material = bpy.data.materials.new(new_name)
    material.name = new_name
    material.diffuse_color = base
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError(f"{new_name} has no Principled BSDF")
    bsdf.inputs["Base Color"].default_value = base
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat_weight
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = emission or (0.0, 0.0, 0.0, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return material


def ensure_mascot_scene() -> tuple[bpy.types.Scene, bpy.types.Object]:
    scene = bpy.data.scenes.get(SCENE_NAME)
    if scene is None:
        scene = bpy.data.scenes.new(SCENE_NAME)
        bpy.context.window.scene = scene
        bpy.ops.import_scene.gltf(filepath=str(SOURCE_GLB))
    else:
        bpy.context.window.scene = scene

    rig = scene.objects.get(RIG_NAME)
    if rig is None or rig.type != "ARMATURE":
        raise RuntimeError(f"{SCENE_NAME} does not contain {RIG_NAME}")
    return scene, rig


def parent_to_bone(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def rounded_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    modifier = obj.modifiers.new("KofteV7_SoftEdge", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def soft_diamond(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    """Small low-poly sparkle/tear primitive with baked dimensions."""

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def mark_expression_effect(obj: bpy.types.Object) -> None:
    """Export an effect node invisibly; Three.js animates it back to scale 1."""

    obj["expressionEffect"] = True
    obj["restScale"] = 1.0
    obj.scale = (0.001, 0.001, 0.001)


def build_materials() -> dict[str, bpy.types.Material]:
    # Directly samples the V7 cabin's graphite / inner-panel / frame values,
    # then lifts the mascot mid-tones so its silhouette remains readable at
    # the wall stations.
    return {
        "armor": principled_material(
            "Kofte_CreamComposite",
            "Kofte_V7SlateArmor",
            base=(0.16, 0.30, 0.33, 1.0),
            metallic=0.56,
            roughness=0.30,
            coat_weight=0.26,
            coat_roughness=0.18,
        ),
        "titanium": principled_material(
            "Kofte_PearlFace",
            "Kofte_V7Titanium",
            base=(0.46, 0.54, 0.54, 1.0),
            metallic=0.62,
            roughness=0.24,
            coat_weight=0.22,
            coat_roughness=0.16,
        ),
        "graphite": principled_material(
            "Kofte_AnodizedGraphite",
            "Kofte_V7Graphite",
            base=(0.025, 0.060, 0.075, 1.0),
            metallic=0.78,
            roughness=0.31,
        ),
        "joint": principled_material(
            "Kofte_JointRubber",
            "Kofte_V7JointRubber",
            base=(0.012, 0.020, 0.024, 1.0),
            metallic=0.10,
            roughness=0.76,
        ),
        "bronze": principled_material(
            "Kofte_BronzeTrim",
            "Kofte_V7Bronze",
            base=(0.48, 0.29, 0.16, 1.0),
            metallic=0.72,
            roughness=0.28,
            coat_weight=0.12,
            coat_roughness=0.18,
        ),
        "visor": principled_material(
            "Kofte_VisorGlass",
            "Kofte_V7VisorGlass",
            base=(0.004, 0.018, 0.026, 1.0),
            metallic=0.22,
            roughness=0.055,
            coat_weight=0.82,
            coat_roughness=0.06,
        ),
        "cyan": principled_material(
            "Kofte_CyanDisplay",
            "Kofte_V7CyanDisplay",
            base=(0.015, 0.28, 0.34, 1.0),
            metallic=0.18,
            roughness=0.22,
            emission=(0.12, 0.95, 1.0, 1.0),
            emission_strength=2.35,
        ),
        "amber": principled_material(
            "Kofte_AmberStatus",
            "Kofte_V7AmberStatus",
            base=(0.42, 0.17, 0.04, 1.0),
            metallic=0.12,
            roughness=0.25,
            emission=(1.0, 0.46, 0.12, 1.0),
            emission_strength=1.65,
        ),
    }


def rebuild_details(scene: bpy.types.Scene, rig: bpy.types.Object, mats: dict[str, bpy.types.Material]) -> None:
    for obj in list(scene.objects):
        # The old bronze trim and dark outer gasket made the face read like a
        # cheap circular bezel. Remove every suffixed copy so the visor becomes
        # one flush, frameless surface in the helmet shell.
        if (
            obj.name.startswith(DETAIL_PREFIX)
            or obj.name.startswith("Kofte_VisorTrim")
            or obj.name.startswith("Kofte_FaceGasket")
        ):
            bpy.data.objects.remove(obj, do_unlink=True)

    # A restrained three-light flight-status module replaces decorative
    # clutter: cyan = navigation/COMMS, amber = propulsion standby.
    chest = rounded_cube(
        f"{DETAIL_PREFIX}ChestModule",
        (0.0, -0.486, 0.80),
        (0.34, 0.045, 0.17),
        mats["graphite"],
        bevel=0.032,
    )
    parent_to_bone(chest, rig, "body")
    for index, (x, material) in enumerate(
        ((-0.09, mats["cyan"]), (0.0, mats["cyan"]), (0.09, mats["amber"]))
    ):
        status = rounded_cube(
            f"{DETAIL_PREFIX}ChestStatus_{index + 1}",
            (x, -0.513, 0.80),
            (0.052, 0.014, 0.034),
            material,
            bevel=0.010,
        )
        parent_to_bone(status, rig, "body")

    # One navigation strip per shoulder keeps the silhouette readable from
    # wide cockpit shots without turning Köfte into a Christmas tree.
    for side, material in ((-1, mats["cyan"]), (1, mats["amber"])):
        strip = rounded_cube(
            f"{DETAIL_PREFIX}ShoulderNav_{'L' if side < 0 else 'R'}",
            (side * 0.70, -0.202, 1.22),
            (0.082, 0.025, 0.15),
            material,
            bevel=0.018,
        )
        parent_to_bone(strip, rig, "body")

    # Three-piece mouth: the original central capsule stays neutral while two
    # hidden corner segments curve upward for joy or downward for sadness.
    for side in (-1, 1):
        corner = rounded_cube(
            f"{DETAIL_PREFIX}MouthCorner_{'L' if side < 0 else 'R'}",
            (side * 0.115, -0.825, 1.205),
            (0.13, 0.018, 0.028),
            mats["cyan"],
            bevel=0.013,
        )
        parent_to_bone(corner, rig, "head")
        mark_expression_effect(corner)

    # Paired amber diamonds replace the neutral pupils during excitement. A
    # crisp four-point silhouette reads as "star eyes" in wide cockpit shots.
    for side in (-1, 1):
        spark = rounded_cube(
            f"{DETAIL_PREFIX}EyeSpark_{'L' if side < 0 else 'R'}",
            (side * 0.22, -0.827, 1.46),
            (0.078, 0.018, 0.078),
            mats["amber"],
            bevel=0.007,
        )
        spark.rotation_euler[1] = math.radians(45)
        parent_to_bone(spark, rig, "head")
        mark_expression_effect(spark)

    tear = soft_diamond(
        f"{DETAIL_PREFIX}Tear_R",
        (0.29, -0.827, 1.30),
        (0.055, 0.018, 0.11),
        mats["cyan"],
    )
    parent_to_bone(tear, rig, "head")
    mark_expression_effect(tear)

    rig["mascot"] = "kofte"
    rig["version"] = 4
    rig["designLanguage"] = "KEX_V7_COPILOT"
    rig["expressionNodes"] = [
        "Kofte_Eye_L",
        "Kofte_Eye_R",
        "Kofte_Brow_L",
        "Kofte_Brow_R",
        "Kofte_Mouth",
        f"{DETAIL_PREFIX}MouthCorner_L",
        f"{DETAIL_PREFIX}MouthCorner_R",
        f"{DETAIL_PREFIX}EyeSpark_L",
        f"{DETAIL_PREFIX}EyeSpark_R",
        f"{DETAIL_PREFIX}Tear_R",
    ]


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_area_light(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    color: tuple[float, float, float],
    energy: float,
    size: float,
) -> bpy.types.Object:
    data = bpy.data.lights.new(name, "AREA")
    data.color = color
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def build_preview_stage(scene: bpy.types.Scene, rig: bpy.types.Object, mats: dict[str, bpy.types.Material]) -> None:
    for obj in list(scene.objects):
        if obj.name.startswith(STUDIO_PREFIX):
            bpy.data.objects.remove(obj, do_unlink=True)

    world = scene.world or bpy.data.worlds.new("KofteV7World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.003, 0.008, 0.012, 1.0)
    background.inputs["Strength"].default_value = 0.18

    camera_data = bpy.data.cameras.new(f"{STUDIO_PREFIX}CameraData")
    camera = bpy.data.objects.new(f"{STUDIO_PREFIX}Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (3.6, -6.6, 2.75)
    camera_data.lens = 64
    look_at(camera, (0.0, 0.0, 1.08))
    scene.camera = camera

    add_area_light(
        f"{STUDIO_PREFIX}Key",
        (-3.4, -4.2, 5.5),
        (0.0, 0.0, 1.0),
        (0.72, 0.92, 1.0),
        820,
        4.0,
    )
    add_area_light(
        f"{STUDIO_PREFIX}Fill",
        (4.4, -1.8, 3.2),
        (0.0, 0.0, 1.0),
        (0.28, 0.82, 1.0),
        620,
        3.0,
    )
    add_area_light(
        f"{STUDIO_PREFIX}Rim",
        (-1.0, 3.2, 4.8),
        (0.0, 0.0, 1.1),
        (1.0, 0.44, 0.16),
        900,
        2.8,
    )

    bpy.ops.mesh.primitive_plane_add(size=14, location=(0.0, 0.0, 0.02))
    floor = bpy.context.object
    floor.name = f"{STUDIO_PREFIX}Floor"
    floor.data.materials.append(mats["graphite"])

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.frame_start = 1
    scene.frame_end = 120
    if rig.animation_data is None:
        rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions.get("Idle")
    scene.frame_set(30)


def select_rig_hierarchy(scene: bpy.types.Scene, rig: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        parent = obj
        while parent is not None:
            if parent == rig:
                obj.select_set(True)
                break
            parent = parent.parent
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig


def export_web_glb(scene: bpy.types.Scene, rig: bpy.types.Object) -> None:
    select_rig_hierarchy(scene, rig)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_extras=True,
        export_materials="EXPORT",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
        export_morph=True,
        export_lights=False,
        export_cameras=False,
    )


def main() -> None:
    scene, rig = ensure_mascot_scene()
    # glTF imports may leave BootUp (whose first key scales the root to 5%)
    # as the active action. Bone-parenting details in that pose would bake a
    # 20x inverse transform and make them explode when Idle becomes active.
    if rig.animation_data is None:
        rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions.get("Idle")
    scene.frame_set(1)
    bpy.context.view_layer.update()
    mats = build_materials()
    rebuild_details(scene, rig, mats)
    build_preview_stage(scene, rig, mats)
    export_web_glb(scene, rig)
    bpy.ops.render.render(write_still=True)
    # Saving the open V7 workspace also gives Blender a normal .blend1
    # rollback point containing the previous cockpit-only version.
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)

    globals()["result"] = {
        "scene": scene.name,
        "rig": rig.name,
        "version": rig.get("version"),
        "output": str(OUTPUT_GLB),
        "preview": str(PREVIEW_PATH),
        "materials": sorted(material.name for material in mats.values()),
        "details": sorted(obj.name for obj in scene.objects if obj.name.startswith(DETAIL_PREFIX)),
        "actions": sorted(action.name for action in bpy.data.actions if action.name in {
            "Idle", "HoverMove", "Talk", "Wave", "Point", "ThumbsUp", "HeadTilt",
            "Bow", "Dance", "Flip", "SpinHappy", "Shy", "BootUp", "Scan", "Celebrate", "Sleep",
        }),
    }


if __name__ == "__main__":
    main()
