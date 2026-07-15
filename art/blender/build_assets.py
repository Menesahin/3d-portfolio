"""Build the Köfte mascot and cozy cockpit production GLBs.

Run with Blender, not the system Python:

    blender --background --python art/blender/build_assets.py -- --asset all

The script is deliberately deterministic and uses only Blender primitives,
materials, bones and keyframes. No .blend source or external textures are
required to reproduce the web assets.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import bpy
from mathutils import Euler, Vector


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "public" / "models" / "cockpit"
PREVIEW_DIR = ROOT / "art" / "blender" / "previews"
FPS = 30


PALETTE = {
    "graphite": "#111820",
    "graphite_soft": "#202A35",
    "cream": "#D8C7A6",
    "orange": "#C96F3B",
    "cyan": "#58E6F2",
    "amber": "#FFB45A",
    "visor": "#05090F",
    "screen": "#07141B",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", choices=("all", "kofte", "cockpit"), default="all")
    parser.add_argument("--preview", action="store_true")
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.fps = FPS
    if scene.world is None:
        scene.world = bpy.data.worlds.new("KofteWorld")
    scene.world.color = (0.004, 0.006, 0.012)
    scene.view_settings.look = "AgX - Medium High Contrast"


def rgba(hex_color: str) -> tuple[float, float, float, float]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def material(
    name: str,
    color: str,
    *,
    metallic: float = 0.0,
    roughness: float = 0.45,
    emission: str | None = None,
    emission_strength: float = 0.0,
    coat_weight: float = 0.0,
    coat_roughness: float = 0.2,
    specular_ior: float = 0.5,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba(color)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba(color)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = coat_weight
        if "Coat Roughness" in bsdf.inputs:
            bsdf.inputs["Coat Roughness"].default_value = coat_roughness
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = specular_ior
        if emission:
            bsdf.inputs["Emission Color"].default_value = rgba(emission)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> bpy.types.Object:
    if getattr(obj.data, "materials", None) is not None:
        obj.data.materials.append(mat)
    return obj


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def apply_bevel(obj: bpy.types.Object, width: float = 0.06, segments: int = 2) -> None:
    if obj.type != "MESH" or width <= 0:
        return
    modifier = obj.modifiers.new("ProductionBevel", "BEVEL")
    # Blender 5.1 can abort inside the bevel operator when a requested
    # width is larger than half of a very thin control/screen dimension.
    # Clamp procedurally so every primitive remains export-safe.
    safe_width = min(width, min(abs(value) for value in obj.dimensions) * 0.45)
    modifier.width = safe_width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.06,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    apply_bevel(obj, bevel)
    return obj


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    segments: int = 24,
    rings: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    smooth(obj)
    return obj


def cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 16,
    bevel: float = 0.025,
) -> bpy.types.Object:
    a = Vector(start)
    b = Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(a + b) / 2,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.rotation_mode = "XYZ"
    assign(obj, mat)
    apply_bevel(obj, bevel)
    smooth(obj)
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    major_segments: int = 40,
    minor_segments: int = 10,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def oval_ring(
    name: str,
    location: tuple[float, float, float],
    radius_x: float,
    radius_z: float,
    tube_radius: float,
    mat: bpy.types.Material,
    *,
    points: int = 48,
    bevel_resolution: int = 3,
) -> bpy.types.Object:
    """Create a continuous X/Z oval frame without intersecting shell layers."""

    curve = bpy.data.curves.new(f"{name}Curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = tube_radius
    curve.bevel_resolution = bevel_resolution
    spline = curve.splines.new(type="NURBS")
    spline.points.add(points - 1)
    for index, point in enumerate(spline.points):
        angle = (index / points) * math.pi * 2
        point.co = (radius_x * math.cos(angle), 0, radius_z * math.sin(angle), 1)
    spline.use_cyclic_u = True
    spline.order_u = min(3, points)
    spline.use_endpoint_u = False

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    smooth(obj)
    return obj


def ellipse_arc(
    name: str,
    location: tuple[float, float, float],
    radius_x: float,
    radius_z: float,
    tube_radius: float,
    mat: bpy.types.Material,
    *,
    start_angle: float = 0,
    end_angle: float = math.pi,
    points: int = 40,
    bevel_resolution: int = 2,
) -> bpy.types.Object:
    """Create an open X/Z structural arc.

    Cockpit pressure members must never continue below their deck mounts: a
    full ellipse reads as a loose ring and its lower half cuts through desks,
    the mascot and the floor. This helper keeps only the engineered span.
    """

    curve = bpy.data.curves.new(f"{name}Curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = tube_radius
    curve.bevel_resolution = bevel_resolution
    curve.resolution_u = 2
    spline = curve.splines.new(type="POLY")
    spline.points.add(points - 1)
    for index, point in enumerate(spline.points):
        ratio = index / max(1, points - 1)
        angle = start_angle + (end_angle - start_angle) * ratio
        point.co = (radius_x * math.cos(angle), 0, radius_z * math.sin(angle), 1)
    spline.use_cyclic_u = False

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    assign(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    smooth(obj)
    return obj


def tapered_box(
    name: str,
    location: tuple[float, float, float],
    bottom_dimensions: tuple[float, float],
    top_dimensions: tuple[float, float],
    height: float,
    mat: bpy.types.Material,
    *,
    top_shift_y: float = 0,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.08,
) -> bpy.types.Object:
    """Create a compact hard-surface shell with a tapered plan profile."""

    bottom_width, bottom_depth = bottom_dimensions
    top_width, top_depth = top_dimensions
    z_bottom = -height / 2
    z_top = height / 2
    vertices = (
        (-bottom_width / 2, -bottom_depth / 2, z_bottom),
        (bottom_width / 2, -bottom_depth / 2, z_bottom),
        (bottom_width / 2, bottom_depth / 2, z_bottom),
        (-bottom_width / 2, bottom_depth / 2, z_bottom),
        (-top_width / 2, -top_depth / 2 + top_shift_y, z_top),
        (top_width / 2, -top_depth / 2 + top_shift_y, z_top),
        (top_width / 2, top_depth / 2 + top_shift_y, z_top),
        (-top_width / 2, top_depth / 2 + top_shift_y, z_top),
    )
    faces = (
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    )
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    assign(obj, mat)
    apply_bevel(obj, bevel)
    return obj


def bone_parent(obj: bpy.types.Object, armature: bpy.types.Object, bone: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    obj.matrix_world = world


def select_hierarchy(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in bpy.context.scene.objects:
        parent = obj.parent
        while parent:
            if parent == root:
                obj.select_set(True)
                break
            parent = parent.parent
    bpy.context.view_layer.objects.active = root


def export_glb(path: Path, root: bpy.types.Object, *, animations: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    select_hierarchy(root)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_extras=True,
        export_materials="EXPORT",
        export_animations=animations,
        export_animation_mode="ACTIONS" if animations else "ACTIVE_ACTIONS",
        export_force_sampling=animations,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
        export_morph=True,
        export_lights=False,
        export_cameras=False,
    )


FINGER_NAMES = ("index", "middle", "ring")


def hand_layout(
    side: str,
) -> tuple[
    tuple[float, float, float],
    dict[str, tuple[tuple[float, float, float], tuple[float, float, float], tuple[float, float, float]]],
]:
    """Return the shared rest-pose contract for a palm and four digits.

    The web mascot uses rigid bone parenting rather than a deforming skin.
    Keeping these points in one helper guarantees that the edit bones and the
    visible phalange shells cannot drift apart when the hand proportions move.
    """

    sign = -1 if side == "L" else 1
    palm = (sign * 0.84, -0.20, 0.62)
    digits: dict[
        str,
        tuple[tuple[float, float, float], tuple[float, float, float], tuple[float, float, float]],
    ] = {}
    offsets = {
        "index": -sign * 0.095,
        "middle": 0.0,
        "ring": sign * 0.095,
    }
    for name, x_offset in offsets.items():
        base = (palm[0] + x_offset, -0.285, 0.565)
        middle = (palm[0] + x_offset, -0.325, 0.475)
        tip = (palm[0] + x_offset, -0.345, 0.385)
        digits[name] = (base, middle, tip)

    thumb_base = (palm[0] - sign * 0.145, -0.225, 0.625)
    thumb_middle = (palm[0] - sign * 0.225, -0.275, 0.565)
    thumb_tip = (palm[0] - sign * 0.305, -0.300, 0.515)
    digits["thumb"] = (thumb_base, thumb_middle, thumb_tip)
    return palm, digits


def build_armature() -> bpy.types.Object:
    data = bpy.data.armatures.new("KofteRig")
    armature = bpy.data.objects.new("KofteRig", data)
    bpy.context.collection.objects.link(armature)
    armature.show_in_front = True
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    bones = {
        "root": ((0, 0, 0.16), (0, 0, 0.46), None),
        "body": ((0, 0, 0.52), (0, 0, 1.62), "root"),
        "head": ((0, 0, 1.04), (0, 0, 1.74), "body"),
        "antenna": ((0, 0, 1.72), (0.07, -0.015, 2.11), "head"),
        "upper.L": ((-0.66, 0, 1.20), (-0.83, -0.03, 1.00), "body"),
        "fore.L": ((-0.83, -0.03, 1.00), (-0.87, -0.10, 0.76), "upper.L"),
        "hand.L": ((-0.87, -0.10, 0.76), (-0.84, -0.20, 0.62), "fore.L"),
        "upper.R": ((0.66, 0, 1.20), (0.83, -0.03, 1.00), "body"),
        "fore.R": ((0.83, -0.03, 1.00), (0.87, -0.10, 0.76), "upper.R"),
        "hand.R": ((0.87, -0.10, 0.76), (0.84, -0.20, 0.62), "fore.R"),
    }
    for side in ("L", "R"):
        _, digits = hand_layout(side)
        for digit_name, (base, middle, tip) in digits.items():
            bones[f"finger.{digit_name}.{side}"] = (base, middle, f"hand.{side}")
            bones[f"finger.{digit_name}_tip.{side}"] = (
                middle,
                tip,
                f"finger.{digit_name}.{side}",
            )
    created: dict[str, bpy.types.EditBone] = {}
    for name, (head, tail, parent_name) in bones.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent_name:
            bone.parent = created[parent_name]
            bone.use_connect = (
                name.startswith("fore")
                or name.startswith("hand")
                or "_tip." in name
            )
        created[name] = bone

    bpy.ops.object.mode_set(mode="POSE")
    for pose_bone in armature.pose.bones:
        pose_bone.rotation_mode = "XYZ"
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature


def create_action(
    armature: bpy.types.Object,
    name: str,
    end_frame: int,
    keys: list[tuple[int, dict[str, dict[str, tuple[float, float, float]]]]],
    *,
    linear: bool = False,
) -> None:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data_create()
    armature.animation_data.action = action

    for frame, pose in keys:
        for bone in armature.pose.bones:
            bone.location = (0, 0, 0)
            bone.rotation_euler = (0, 0, 0)
            bone.scale = (1, 1, 1)
        for bone_name, values in pose.items():
            bone = armature.pose.bones[bone_name]
            if "loc" in values:
                bone.location = values["loc"]
            if "rot" in values:
                bone.rotation_euler = values["rot"]
            if "scale" in values:
                bone.scale = values["scale"]
        for bone in armature.pose.bones:
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)

    # Blender 5 stores keyed channels in layered action channel-bags instead
    # of exposing the legacy Action.fcurves collection. The exporter samples
    # every frame, so interpolation remains deterministic for the web GLB.
    action.frame_start = 1
    action.frame_end = end_frame
    armature.animation_data.action = None


def combined_pose(*parts: dict[str, dict[str, tuple[float, float, float]]]) -> dict[str, dict[str, tuple[float, float, float]]]:
    pose: dict[str, dict[str, tuple[float, float, float]]] = {}
    for part in parts:
        pose.update(part)
    return pose


def finger_pose(
    side: str,
    *,
    curl: float = 0.16,
    spread: float = 0.0,
    thumb_curl: float = 0.12,
    thumb_lift: float = 0.0,
    point: bool = False,
) -> dict[str, dict[str, tuple[float, float, float]]]:
    """Pose Köfte's rigid phalanges as one expressive robot hand."""

    sign = -1 if side == "L" else 1
    pose: dict[str, dict[str, tuple[float, float, float]]] = {}
    for index, digit_name in enumerate(FINGER_NAMES):
        digit_curl = 0.03 if point and digit_name == "index" else curl * (1 + index * 0.07)
        digit_spread = spread * (index - 1) * sign
        pose[f"finger.{digit_name}.{side}"] = {
            "rot": (digit_curl, 0.0, digit_spread),
        }
        pose[f"finger.{digit_name}_tip.{side}"] = {
            "rot": (digit_curl * 0.82, 0.0, 0.0),
        }
    pose[f"finger.thumb.{side}"] = {
        "rot": (thumb_curl * 0.72, 0.0, -sign * (thumb_lift + spread * 0.25)),
    }
    pose[f"finger.thumb_tip.{side}"] = {
        "rot": (thumb_curl * 0.68, 0.0, -sign * thumb_lift * 0.18),
    }
    return pose


def animate_kofte(armature: bpy.types.Object) -> None:
    pi = math.pi
    create_action(
        armature,
        "Idle",
        120,
        [
            (
                1,
                combined_pose(
                    {"upper.L": {"rot": (0.02, 0, 0.08)}, "upper.R": {"rot": (0.02, 0, -0.08)}},
                    finger_pose("L"),
                    finger_pose("R"),
                ),
            ),
            (
                30,
                combined_pose(
                    {
                        "body": {"loc": (0, 0, 0.045), "rot": (0.008, 0, 0.012)},
                        "head": {"rot": (-0.012, 0.025, 0.02)},
                        "antenna": {"rot": (0.055, 0, -0.075)},
                        "hand.L": {"rot": (0.02, 0, 0.035)},
                    },
                    finger_pose("L", curl=0.20, thumb_curl=0.16),
                    finger_pose("R", curl=0.14),
                ),
            ),
            (
                60,
                combined_pose(
                    {"head": {"rot": (0.008, -0.018, -0.015)}, "upper.L": {"rot": (0, 0, 0.04)}, "upper.R": {"rot": (0, 0, -0.04)}},
                    finger_pose("L", curl=0.13),
                    finger_pose("R", curl=0.18, thumb_curl=0.16),
                ),
            ),
            (
                90,
                combined_pose(
                    {
                        "body": {"loc": (0, 0, -0.035), "rot": (-0.008, 0, -0.012)},
                        "head": {"rot": (0.012, -0.025, -0.02)},
                        "antenna": {"rot": (-0.055, 0, 0.075)},
                        "hand.R": {"rot": (-0.02, 0, -0.035)},
                    },
                    finger_pose("L", curl=0.14),
                    finger_pose("R", curl=0.21, thumb_curl=0.17),
                ),
            ),
            (
                120,
                combined_pose(
                    {"upper.L": {"rot": (0.02, 0, 0.08)}, "upper.R": {"rot": (0.02, 0, -0.08)}},
                    finger_pose("L"),
                    finger_pose("R"),
                ),
            ),
        ],
    )
    create_action(
        armature,
        "HoverMove",
        48,
        [
            (1, combined_pose({"body": {"rot": (0.10, 0, 0)}, "head": {"rot": (-0.035, 0, 0)}, "upper.L": {"rot": (0.08, 0, 0.12)}, "upper.R": {"rot": (0.08, 0, -0.12)}}, finger_pose("L", curl=0.22), finger_pose("R", curl=0.22))),
            (12, combined_pose({"body": {"loc": (0, 0, 0.04), "rot": (0.14, 0, 0.035)}, "antenna": {"rot": (0.075, 0, -0.05)}}, finger_pose("L", curl=0.27), finger_pose("R", curl=0.18))),
            (24, combined_pose({"body": {"rot": (0.10, 0, 0)}, "head": {"rot": (-0.02, 0, 0.02)}, "upper.L": {"rot": (0.08, 0, -0.08)}, "upper.R": {"rot": (0.08, 0, 0.08)}}, finger_pose("L", curl=0.18), finger_pose("R", curl=0.27))),
            (36, combined_pose({"body": {"loc": (0, 0, -0.03), "rot": (0.14, 0, -0.035)}, "antenna": {"rot": (-0.075, 0, 0.05)}}, finger_pose("L", curl=0.22), finger_pose("R", curl=0.22))),
            (48, combined_pose({"body": {"rot": (0.10, 0, 0)}, "head": {"rot": (-0.035, 0, 0)}, "upper.L": {"rot": (0.08, 0, 0.12)}, "upper.R": {"rot": (0.08, 0, -0.12)}}, finger_pose("L", curl=0.22), finger_pose("R", curl=0.22))),
        ],
    )
    create_action(
        armature,
        "Talk",
        72,
        [
            (1, combined_pose(finger_pose("L", curl=0.18), finger_pose("R", curl=0.18))),
            (14, combined_pose({"upper.L": {"rot": (-0.22, -0.18, -0.55)}, "fore.L": {"rot": (0.12, 0, 0.36)}, "hand.L": {"rot": (0, -0.08, 0.12)}, "body": {"rot": (0, 0, 0.055)}, "head": {"rot": (0.01, -0.04, -0.03)}}, finger_pose("L", curl=0.08, spread=0.14), finger_pose("R", curl=0.22))),
            (28, combined_pose({"upper.R": {"rot": (-0.18, 0.22, 0.52)}, "fore.R": {"rot": (0.10, 0, -0.32)}, "hand.R": {"rot": (0, 0.08, -0.10)}, "body": {"rot": (0, 0, -0.05)}, "head": {"rot": (-0.015, 0.04, 0.03)}}, finger_pose("L", curl=0.24), finger_pose("R", curl=0.07, spread=0.16))),
            (42, combined_pose({"upper.L": {"rot": (-0.10, 0.18, -0.34)}, "upper.R": {"rot": (-0.10, -0.18, 0.34)}, "fore.L": {"rot": (0.08, 0, 0.20)}, "fore.R": {"rot": (0.08, 0, -0.20)}, "head": {"rot": (0.015, 0, 0)}}, finger_pose("L", curl=0.10, spread=0.10), finger_pose("R", curl=0.10, spread=0.10))),
            (56, combined_pose({"upper.L": {"rot": (-0.12, -0.08, -0.30)}, "fore.L": {"rot": (0.05, 0, 0.16)}, "head": {"rot": (-0.02, -0.03, -0.018)}}, finger_pose("L", curl=0.12, spread=0.08), finger_pose("R", curl=0.21))),
            (72, combined_pose(finger_pose("L", curl=0.18), finger_pose("R", curl=0.18))),
        ],
    )
    create_action(
        armature,
        "Wave",
        64,
        [
            (1, combined_pose(finger_pose("L"), finger_pose("R"))),
            (12, combined_pose({"upper.L": {"rot": (-0.28, -0.14, 1.82)}, "fore.L": {"rot": (0.18, 0, -0.34)}, "hand.L": {"rot": (-0.55, -0.08, 1.25)}, "head": {"rot": (0, 0.04, -0.08)}}, finger_pose("L", curl=0.04, spread=0.18, thumb_curl=0.05), finger_pose("R"))),
            (24, combined_pose({"upper.L": {"rot": (-0.28, -0.14, 1.82)}, "fore.L": {"rot": (0.18, 0, 0.32)}, "hand.L": {"rot": (-0.55, 0.08, 1.55)}, "head": {"rot": (0, 0.04, -0.08)}}, finger_pose("L", curl=0.16, spread=0.12), finger_pose("R"))),
            (36, combined_pose({"upper.L": {"rot": (-0.28, -0.14, 1.82)}, "fore.L": {"rot": (0.18, 0, -0.32)}, "hand.L": {"rot": (-0.55, -0.08, 1.25)}, "head": {"rot": (0, 0.04, -0.08)}}, finger_pose("L", curl=0.04, spread=0.20, thumb_curl=0.04), finger_pose("R"))),
            (48, combined_pose({"upper.L": {"rot": (-0.28, -0.14, 1.82)}, "fore.L": {"rot": (0.18, 0, 0.30)}, "hand.L": {"rot": (-0.55, 0.08, 1.55)}, "head": {"rot": (0, 0.04, -0.08)}}, finger_pose("L", curl=0.13, spread=0.14), finger_pose("R"))),
            (64, combined_pose(finger_pose("L"), finger_pose("R"))),
        ],
    )
    create_action(
        armature,
        "Point",
        58,
        [
            (1, combined_pose(finger_pose("L"), finger_pose("R"))),
            (
                14,
                combined_pose(
                    {
                        "upper.R": {"rot": (-0.18, 0.14, -1.18)},
                        "fore.R": {"rot": (0.02, 0, 0.10)},
                        "hand.R": {"rot": (0, -0.04, -1.20)},
                        "body": {"rot": (0, 0, -0.08)},
                        "head": {"rot": (0, -0.06, -0.08)},
                    },
                    finger_pose("L", curl=0.18),
                    finger_pose("R", curl=1.02, thumb_curl=0.55, point=True),
                ),
            ),
            (
                40,
                combined_pose(
                    {
                        "upper.R": {"rot": (-0.18, 0.14, -1.18)},
                        "fore.R": {"rot": (0.02, 0, 0.10)},
                        "hand.R": {"rot": (0, -0.04, -1.20)},
                        "body": {"rot": (0, 0, -0.08)},
                        "head": {"rot": (0, -0.06, -0.08)},
                    },
                    finger_pose("L", curl=0.18),
                    finger_pose("R", curl=1.10, thumb_curl=0.62, point=True),
                ),
            ),
            (58, combined_pose(finger_pose("L"), finger_pose("R"))),
        ],
    )
    create_action(
        armature,
        "ThumbsUp",
        58,
        [
            (1, combined_pose(finger_pose("L"), finger_pose("R"))),
            (
                14,
                combined_pose(
                    {
                        "upper.R": {"rot": (-0.30, 0, -1.02)},
                        "fore.R": {"rot": (0.16, 0, -0.94)},
                        "hand.R": {"rot": (-1.50, -0.04, -0.90)},
                        "body": {"rot": (0, 0, -0.055)},
                        "head": {"rot": (0, -0.03, -0.06)},
                    },
                    finger_pose("L"),
                    finger_pose("R", curl=2.02, thumb_curl=0.02, thumb_lift=0.84),
                ),
            ),
            (
                40,
                combined_pose(
                    {
                        "upper.R": {"rot": (-0.30, 0, -1.02)},
                        "fore.R": {"rot": (0.16, 0, -0.94)},
                        "hand.R": {"rot": (-1.50, -0.04, -0.86)},
                        "body": {"rot": (0, 0, -0.055)},
                        "head": {"rot": (-0.02, -0.03, -0.06)},
                    },
                    finger_pose("L"),
                    finger_pose("R", curl=2.10, thumb_curl=0.02, thumb_lift=0.90),
                ),
            ),
            (58, combined_pose(finger_pose("L"), finger_pose("R"))),
        ],
    )
    create_action(
        armature,
        "HeadTilt",
        60,
        [
            (1, combined_pose(finger_pose("L"), finger_pose("R"))),
            (18, combined_pose({"body": {"rot": (0.01, 0.04, 0.07)}, "head": {"rot": (0.025, 0.10, 0.28)}, "antenna": {"rot": (0, 0, -0.24)}, "hand.L": {"rot": (0, 0, 0.05)}}, finger_pose("L", curl=0.24), finger_pose("R", curl=0.14))),
            (42, combined_pose({"body": {"rot": (0.01, 0.04, 0.07)}, "head": {"rot": (0.025, 0.10, 0.28)}, "antenna": {"rot": (0, 0, -0.24)}, "hand.L": {"rot": (0, 0, 0.05)}}, finger_pose("L", curl=0.24), finger_pose("R", curl=0.14))),
            (60, combined_pose(finger_pose("L"), finger_pose("R"))),
        ],
    )
    create_action(
        armature,
        "Bow",
        60,
        [
            (1, combined_pose(finger_pose("L"), finger_pose("R"))),
            (20, combined_pose({"root": {"rot": (0.52, 0, 0)}, "head": {"rot": (0.12, 0, 0)}, "upper.L": {"rot": (0, 0, -0.22)}, "upper.R": {"rot": (0, 0, 0.22)}, "hand.L": {"rot": (0.08, 0, 0)}, "hand.R": {"rot": (0.08, 0, 0)}}, finger_pose("L", curl=0.10), finger_pose("R", curl=0.10))),
            (40, combined_pose({"root": {"rot": (0.52, 0, 0)}, "head": {"rot": (0.12, 0, 0)}, "upper.L": {"rot": (0, 0, -0.22)}, "upper.R": {"rot": (0, 0, 0.22)}}, finger_pose("L", curl=0.10), finger_pose("R", curl=0.10))),
            (60, combined_pose(finger_pose("L"), finger_pose("R"))),
        ],
    )
    create_action(armature, "Dance", 84, [
        (1, combined_pose(finger_pose("L"), finger_pose("R"))),
        (14, combined_pose({"root": {"rot": (0, 0, 0.55), "loc": (0, 0, 0.08)}, "head": {"rot": (0, 0, -0.12)}, "upper.L": {"rot": (0, 0, -1.2)}, "upper.R": {"rot": (0, 0, 0.35)}}, finger_pose("L", curl=0.05, spread=0.18), finger_pose("R", curl=0.34))),
        (28, combined_pose({"root": {"rot": (0, 0, -0.55)}, "head": {"rot": (0, 0, 0.12)}, "upper.L": {"rot": (0, 0, -0.35)}, "upper.R": {"rot": (0, 0, 1.2)}}, finger_pose("L", curl=0.34), finger_pose("R", curl=0.05, spread=0.18))),
        (42, combined_pose({"root": {"rot": (0, 0, 0.7), "loc": (0, 0, 0.12)}, "upper.L": {"rot": (0, 0, -1.1)}, "upper.R": {"rot": (0, 0, 1.1)}}, finger_pose("L", curl=0.07, spread=0.15), finger_pose("R", curl=0.07, spread=0.15))),
        (56, combined_pose({"root": {"rot": (0, 0, -0.55)}, "head": {"rot": (0, 0, 0.10)}}, finger_pose("L", curl=0.28), finger_pose("R", curl=0.14))),
        (70, combined_pose({"root": {"rot": (0, 0, 0.45), "loc": (0, 0, 0.06)}, "head": {"rot": (0, 0, -0.10)}}, finger_pose("L", curl=0.12), finger_pose("R", curl=0.28))),
        (84, combined_pose(finger_pose("L"), finger_pose("R"))),
    ])
    create_action(armature, "Flip", 54, [
        (1, combined_pose(finger_pose("L", curl=0.40), finger_pose("R", curl=0.40))),
        (14, combined_pose({"root": {"rot": (pi / 2, 0, 0), "loc": (0, 0, 0.28)}}, finger_pose("L", curl=0.75), finger_pose("R", curl=0.75))),
        (27, combined_pose({"root": {"rot": (pi, 0, 0), "loc": (0, 0, 0.5)}}, finger_pose("L", curl=0.82), finger_pose("R", curl=0.82))),
        (40, combined_pose({"root": {"rot": (3 * pi / 2, 0, 0), "loc": (0, 0, 0.28)}}, finger_pose("L", curl=0.65), finger_pose("R", curl=0.65))),
        (54, combined_pose({"root": {"rot": (2 * pi, 0, 0)}}, finger_pose("L", curl=0.30), finger_pose("R", curl=0.30))),
    ], linear=True)
    create_action(armature, "SpinHappy", 60, [
        (1, combined_pose(finger_pose("L", curl=0.05, spread=0.18), finger_pose("R", curl=0.05, spread=0.18))),
        (20, combined_pose({"root": {"rot": (0, 0, 2 * pi / 3), "loc": (0, 0, 0.12)}, "upper.L": {"rot": (0, 0, -1.0)}, "upper.R": {"rot": (0, 0, 1.0)}}, finger_pose("L", curl=0.05, spread=0.18), finger_pose("R", curl=0.05, spread=0.18))),
        (40, combined_pose({"root": {"rot": (0, 0, 4 * pi / 3), "loc": (0, 0, 0.12)}, "upper.L": {"rot": (0, 0, -1.0)}, "upper.R": {"rot": (0, 0, 1.0)}}, finger_pose("L", curl=0.05, spread=0.18), finger_pose("R", curl=0.05, spread=0.18))),
        (60, combined_pose({"root": {"rot": (0, 0, 2 * pi)}}, finger_pose("L", curl=0.05, spread=0.18), finger_pose("R", curl=0.05, spread=0.18))),
    ], linear=True)
    create_action(armature, "Shy", 72, [
        (1, combined_pose(finger_pose("L"), finger_pose("R"))),
        (22, combined_pose({"body": {"rot": (0.08, 0.10, 0.10), "scale": (0.94, 0.94, 0.94)}, "head": {"rot": (0.09, 0.10, 0.16)}, "upper.L": {"rot": (-0.22, 0, -0.70)}, "upper.R": {"rot": (-0.22, 0, 0.70)}, "fore.L": {"rot": (0, 0, -0.78)}, "fore.R": {"rot": (0, 0, 0.78)}, "hand.L": {"rot": (-0.10, 0, -0.08)}, "hand.R": {"rot": (-0.10, 0, 0.08)}}, finger_pose("L", curl=0.72, thumb_curl=0.48), finger_pose("R", curl=0.72, thumb_curl=0.48))),
        (50, combined_pose({"body": {"rot": (0.08, 0.10, 0.10), "scale": (0.94, 0.94, 0.94)}, "head": {"rot": (0.09, 0.10, 0.16)}, "upper.L": {"rot": (-0.22, 0, -0.70)}, "upper.R": {"rot": (-0.22, 0, 0.70)}, "fore.L": {"rot": (0, 0, -0.78)}, "fore.R": {"rot": (0, 0, 0.78)}}, finger_pose("L", curl=0.78, thumb_curl=0.52), finger_pose("R", curl=0.78, thumb_curl=0.52))),
        (72, combined_pose(finger_pose("L"), finger_pose("R"))),
    ])
    create_action(armature, "BootUp", 80, [
        (1, combined_pose({"root": {"scale": (0.05, 0.05, 0.05), "loc": (0, 0, -0.3)}}, finger_pose("L", curl=1.0), finger_pose("R", curl=1.0))),
        (38, combined_pose({"root": {"scale": (1.08, 1.08, 1.08), "loc": (0, 0, 0.08)}, "head": {"rot": (-0.05, 0, 0)}, "upper.L": {"rot": (0, 0, -0.7)}, "upper.R": {"rot": (0, 0, 0.7)}}, finger_pose("L", curl=0.02, spread=0.20), finger_pose("R", curl=0.02, spread=0.20))),
        (56, combined_pose({"root": {"scale": (0.97, 0.97, 0.97)}}, finger_pose("L", curl=0.12), finger_pose("R", curl=0.12))),
        (80, combined_pose(finger_pose("L"), finger_pose("R"))),
    ])
    create_action(armature, "Scan", 72, [
        (1, combined_pose(finger_pose("L"), finger_pose("R"))),
        (18, combined_pose({"head": {"rot": (0, 0.34, 0)}, "antenna": {"rot": (0.10, 0, -0.18)}, "hand.L": {"rot": (0, 0, 0.04)}}, finger_pose("L", curl=0.24), finger_pose("R", curl=0.13))),
        (36, combined_pose({"head": {"rot": (0, -0.34, 0)}, "antenna": {"rot": (-0.10, 0, 0.18)}, "hand.R": {"rot": (0, 0, -0.04)}}, finger_pose("L", curl=0.13), finger_pose("R", curl=0.24))),
        (54, combined_pose({"head": {"rot": (0, 0.18, 0)}}, finger_pose("L", curl=0.20), finger_pose("R", curl=0.15))),
        (72, combined_pose(finger_pose("L"), finger_pose("R"))),
    ])
    create_action(armature, "Celebrate", 72, [
        (1, combined_pose(finger_pose("L"), finger_pose("R"))),
        (20, combined_pose({"root": {"loc": (0, 0, 0.35)}, "head": {"rot": (-0.05, 0, 0)}, "upper.L": {"rot": (0, 0, -1.5)}, "upper.R": {"rot": (0, 0, 1.5)}}, finger_pose("L", curl=0.02, spread=0.22), finger_pose("R", curl=0.02, spread=0.22))),
        (38, combined_pose({"root": {"loc": (0, 0, 0.08), "scale": (1.08, 1.08, 1.08)}, "upper.L": {"rot": (0, 0, -1.25)}, "upper.R": {"rot": (0, 0, 1.25)}}, finger_pose("L", curl=0.18, spread=0.15), finger_pose("R", curl=0.18, spread=0.15))),
        (56, combined_pose({"root": {"loc": (0, 0, 0.25)}, "upper.L": {"rot": (0, 0, -1.38)}, "upper.R": {"rot": (0, 0, 1.38)}}, finger_pose("L", curl=0.03, spread=0.20), finger_pose("R", curl=0.03, spread=0.20))),
        (72, combined_pose(finger_pose("L"), finger_pose("R"))),
    ])
    create_action(armature, "Sleep", 120, [
        (1, combined_pose({"body": {"rot": (0.06, 0, 0.08)}, "head": {"rot": (0.06, 0, 0.08)}, "upper.L": {"rot": (0, 0, -0.25)}, "upper.R": {"rot": (0, 0, 0.25)}}, finger_pose("L", curl=0.52, thumb_curl=0.4), finger_pose("R", curl=0.52, thumb_curl=0.4))),
        (60, combined_pose({"body": {"rot": (0.09, 0, 0.11), "loc": (0, 0, -0.055)}, "head": {"rot": (0.08, 0, 0.10)}, "antenna": {"rot": (0, 0, 0.14)}}, finger_pose("L", curl=0.60, thumb_curl=0.45), finger_pose("R", curl=0.60, thumb_curl=0.45))),
        (120, combined_pose({"body": {"rot": (0.06, 0, 0.08)}, "head": {"rot": (0.06, 0, 0.08)}, "upper.L": {"rot": (0, 0, -0.25)}, "upper.R": {"rot": (0, 0, 0.25)}}, finger_pose("L", curl=0.52, thumb_curl=0.4), finger_pose("R", curl=0.52, thumb_curl=0.4))),
    ])


def build_kofte(preview: bool) -> Path:
    reset_scene()
    mats = {
        "cream": material("Kofte_CreamComposite", "#C7C0B3", metallic=0.08, roughness=0.38, coat_weight=0.28, coat_roughness=0.18, specular_ior=0.40),
        "pearl": material("Kofte_PearlFace", "#E2DDD3", metallic=0.04, roughness=0.31, coat_weight=0.34, coat_roughness=0.15, specular_ior=0.45),
        "graphite": material("Kofte_AnodizedGraphite", "#10171D", metallic=0.68, roughness=0.39, coat_weight=0.10, coat_roughness=0.28),
        "joint": material("Kofte_JointRubber", "#171A1C", metallic=0.08, roughness=0.78, specular_ior=0.30),
        "orange": material("Kofte_BronzeTrim", "#9B6A4D", metallic=0.66, roughness=0.36, coat_weight=0.14, coat_roughness=0.22),
        "visor": material("Kofte_VisorGlass", "#02070B", metallic=0.12, roughness=0.075, coat_weight=0.72, coat_roughness=0.08, specular_ior=0.52),
        "cyan": material("Kofte_CyanDisplay", "#0A6974", roughness=0.30, emission="#8CF7F4", emission_strength=0.82),
        "amber": material("Kofte_AmberStatus", "#8A542A", roughness=0.32, emission="#F0B570", emission_strength=0.72),
    }
    rig = build_armature()

    head_objects = [
        sphere("Kofte_Shell", (0, 0.015, 1.41), (0.82, 0.66, 0.63), mats["cream"], segments=30, rings=18),
        sphere("Kofte_CrownPanel", (0, 0.095, 1.50), (0.71, 0.57, 0.53), mats["pearl"], segments=22, rings=14),
        torus("Kofte_CrownSeam", (0, 0.02, 1.12), 0.61, 0.018, mats["orange"], major_segments=28, minor_segments=6),
        oval_ring("Kofte_VisorTrim", (0, -0.812, 1.41), 0.625, 0.405, 0.052, mats["orange"], points=56),
        oval_ring("Kofte_FaceGasket", (0, -0.818, 1.41), 0.585, 0.365, 0.024, mats["joint"], points=56, bevel_resolution=2),
        sphere("Kofte_Visor", (0, -0.550, 1.41), (0.64, 0.250, 0.395), mats["visor"], segments=28, rings=18),
        sphere("Kofte_Eye_L", (-0.22, -0.796, 1.45), (0.105, 0.021, 0.152), mats["cyan"], segments=16, rings=10),
        sphere("Kofte_Eye_R", (0.22, -0.796, 1.45), (0.105, 0.021, 0.152), mats["cyan"], segments=16, rings=10),
        cube("Kofte_Brow_L", (-0.22, -0.806, 1.645), (0.18, 0.022, 0.032), mats["cyan"], rotation=(0, 0, -0.07), bevel=0.016),
        cube("Kofte_Brow_R", (0.22, -0.806, 1.645), (0.18, 0.022, 0.032), mats["cyan"], rotation=(0, 0, 0.07), bevel=0.016),
        sphere("Kofte_Mouth", (0, -0.801, 1.205), (0.135, 0.016, 0.032), mats["cyan"], segments=20, rings=10),
        sphere("Kofte_Cheek_L", (-0.435, -0.782, 1.24), (0.068, 0.014, 0.020), mats["amber"], segments=14, rings=8),
        sphere("Kofte_Cheek_R", (0.435, -0.782, 1.24), (0.068, 0.014, 0.020), mats["amber"], segments=14, rings=8),
    ]
    for side in (-1, 1):
        head_objects.extend(
            [
                sphere(f"Kofte_TempleCap_{side}", (side * 0.76, -0.005, 1.42), (0.17, 0.18, 0.18), mats["pearl"], segments=14, rings=9),
                sphere(f"Kofte_VisorFastener_{side}", (side * 0.635, -0.565, 1.18), (0.046, 0.025, 0.046), mats["orange"], segments=10, rings=6),
            ]
        )
    for obj in head_objects:
        bone_parent(obj, rig, "head")

    torso_objects = [
        sphere("Kofte_Lower", (0, 0.03, 0.78), (0.58, 0.49, 0.46), mats["cream"], segments=24, rings=16),
        sphere("Kofte_BellyInset", (0, -0.445, 0.80), (0.31, 0.035, 0.19), mats["graphite"], segments=18, rings=10),
        torus("Kofte_NeckGasket", (0, 0.01, 1.04), 0.45, 0.042, mats["joint"], major_segments=28, minor_segments=7),
    ]
    for side in (-1, 1):
        torso_objects.extend(
            [
                sphere(f"Kofte_ShoulderPod_{side}", (side * 0.70, -0.005, 1.20), (0.20, 0.21, 0.21), mats["cream"], segments=16, rings=10),
            ]
        )
    for obj in torso_objects:
        bone_parent(obj, rig, "body")

    antenna_objects = [
        sphere("Kofte_AntennaGrommet", (0, 0, 1.735), (0.105, 0.105, 0.055), mats["joint"], segments=16, rings=10),
        cylinder_between("Kofte_Antenna", (0, 0, 1.75), (0.07, -0.015, 2.075), 0.026, mats["graphite"], vertices=12),
        sphere("Kofte_AntennaTip", (0.075, -0.015, 2.13), (0.078, 0.078, 0.078), mats["amber"], segments=20, rings=14),
        sphere("Kofte_AntennaLens", (0.075, -0.077, 2.13), (0.034, 0.018, 0.034), mats["cyan"], segments=12, rings=8),
    ]
    for obj in antenna_objects:
        bone_parent(obj, rig, "antenna")

    arm_points = {
        "L": ((-0.66, 0, 1.20), (-0.83, -0.03, 1.00), (-0.87, -0.10, 0.76)),
        "R": ((0.66, 0, 1.20), (0.83, -0.03, 1.00), (0.87, -0.10, 0.76)),
    }
    for side, (shoulder, elbow, wrist) in arm_points.items():
        palm_center, digits = hand_layout(side)
        shoulder_v = Vector(shoulder)
        elbow_v = Vector(elbow)
        wrist_v = Vector(wrist)
        upper_shell_start = tuple(shoulder_v.lerp(elbow_v, 0.20))
        upper_shell_end = tuple(shoulder_v.lerp(elbow_v, 0.72))
        fore_shell_start = tuple(elbow_v.lerp(wrist_v, 0.15))
        fore_shell_end = tuple(elbow_v.lerp(wrist_v, 0.78))

        upper_objects = [
            cylinder_between(f"Kofte_UpperArmShell_{side}", upper_shell_start, upper_shell_end, 0.112, mats["cream"], vertices=14, bevel=0.036),
        ]
        for obj in upper_objects:
            bone_parent(obj, rig, f"upper.{side}")

        fore_objects = [
            sphere(f"Kofte_ElbowHousing_{side}", elbow, (0.132, 0.132, 0.132), mats["orange"], segments=16, rings=10),
            cylinder_between(f"Kofte_ForearmShell_{side}", fore_shell_start, fore_shell_end, 0.124, mats["pearl"], vertices=14, bevel=0.038),
        ]
        for obj in fore_objects:
            bone_parent(obj, rig, f"fore.{side}")

        hand_objects = [
            sphere(f"Kofte_WristJoint_{side}", tuple(wrist_v.lerp(Vector(palm_center), 0.18)), (0.115, 0.11, 0.105), mats["joint"], segments=12, rings=8),
            sphere(f"Kofte_Hand_{side}", palm_center, (0.185, 0.135, 0.175), mats["pearl"], segments=16, rings=10),
            sphere(f"Kofte_PalmPad_{side}", (palm_center[0], -0.326, palm_center[2] - 0.004), (0.132, 0.020, 0.118), mats["joint"], segments=14, rings=8),
        ]
        for obj in hand_objects:
            bone_parent(obj, rig, f"hand.{side}")

        for digit_name, (base, middle, tip) in digits.items():
            proximal_bone = f"finger.{digit_name}.{side}"
            distal_bone = f"finger.{digit_name}_tip.{side}"
            proximal_radius = 0.052 if digit_name == "thumb" else 0.042
            distal_radius = 0.046 if digit_name == "thumb" else 0.036
            proximal_objects = [
                sphere(f"Kofte_FingerSocket_{digit_name}_{side}", base, (0.054, 0.048, 0.054), mats["orange"], segments=10, rings=6),
                cylinder_between(f"Kofte_FingerProximal_{digit_name}_{side}", base, middle, proximal_radius, mats["pearl"], vertices=8, bevel=0.012),
            ]
            for obj in proximal_objects:
                bone_parent(obj, rig, proximal_bone)

            distal_objects = [
                sphere(f"Kofte_FingerJoint_{digit_name}_{side}", middle, (0.047, 0.047, 0.047), mats["joint"], segments=10, rings=6),
                cylinder_between(f"Kofte_FingerDistal_{digit_name}_{side}", middle, tip, distal_radius, mats["pearl"], vertices=8, bevel=0.011),
                sphere(
                    f"Kofte_FingerTip_{digit_name}_{side}",
                    tip,
                    (0.056, 0.052, 0.060) if digit_name == "thumb" else (0.048, 0.045, 0.052),
                    mats["pearl"],
                    segments=10,
                    rings=6,
                ),
            ]
            for obj in distal_objects:
                bone_parent(obj, rig, distal_bone)

    hover_objects = [
        torus("Kofte_HoverHousing", (0, 0, 0.43), 0.49, 0.060, mats["graphite"], major_segments=30, minor_segments=8),
        torus("Kofte_HoverTrim", (0, 0, 0.445), 0.485, 0.025, mats["orange"], major_segments=30, minor_segments=6),
        torus("Kofte_HoverRing", (0, 0, 0.425), 0.405, 0.034, mats["cyan"], major_segments=30, minor_segments=7),
        cylinder_between("Kofte_HoverCore", (0, 0, 0.37), (0, 0, 0.56), 0.31, mats["graphite"], vertices=28, bevel=0.045),
        cylinder_between("Kofte_HoverBellyPlate", (0, 0, 0.345), (0, 0, 0.405), 0.255, mats["joint"], vertices=24, bevel=0.025),
    ]
    for angle in (0, 2 * math.pi / 3, 4 * math.pi / 3):
        x = math.cos(angle) * 0.24
        y = math.sin(angle) * 0.24
        socket = sphere(
            f"Kofte_ThrusterSocket_{int(angle * 100)}",
            (x, y, 0.33),
            (0.115, 0.115, 0.070),
            mats["orange"],
            segments=14,
            rings=8,
        )
        hover_objects.append(socket)
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.050, radius2=0.088, depth=0.18, location=(x, y, 0.255))
        thruster = bpy.context.object
        thruster.name = f"Kofte_Thruster_{int(angle * 100)}"
        assign(thruster, mats["cyan"])
        smooth(thruster)
        hover_objects.append(thruster)
    for obj in hover_objects:
        bone_parent(obj, rig, "root")

    rig["mascot"] = "kofte"
    rig["version"] = 2
    rig["frontAxis"] = "+Z"
    rig["expressionNodes"] = ["Kofte_Eye_L", "Kofte_Eye_R", "Kofte_Brow_L", "Kofte_Brow_R", "Kofte_Mouth"]
    rig["fingerBones"] = [
        f"finger.{digit_name}{suffix}.{side}"
        for side in ("L", "R")
        for digit_name in (*FINGER_NAMES, "thumb")
        for suffix in ("", "_tip")
    ]
    animate_kofte(rig)
    output = MODEL_DIR / "kofte.glb"
    export_glb(output, rig, animations=True)
    if preview:
        render_kofte_preview()
    return output


def cockpit_materials() -> dict[str, bpy.types.Material]:
    return {
        "hull": material("KEX_MAT_HullGraphite", "#0A1117", metallic=0.52, roughness=0.56),
        "soft": material("KEX_MAT_HullSoft", "#17232B", metallic=0.34, roughness=0.62),
        "panel": material("KEX_MAT_PanelGraphite", "#293941", metallic=0.24, roughness=0.60),
        "worktop": material(
            "KEX_MAT_WorktopComposite",
            "#344951",
            metallic=0.12,
            roughness=0.48,
            coat_weight=0.22,
            coat_roughness=0.26,
        ),
        "cream": material("KEX_MAT_IvoryComposite", "#B8B09F", metallic=0.12, roughness=0.54),
        "bronze": material("KEX_MAT_BronzeHardware", "#9A7350", metallic=0.68, roughness=0.32),
        "orange": material("KEX_MAT_SafetyOrange", "#B96638", metallic=0.18, roughness=0.48),
        "rubber": material("KEX_MAT_RubberSeal", "#05080A", metallic=0.01, roughness=0.90),
        "screen": material("KEX_MAT_DisplayGlass", "#02090D", metallic=0.10, roughness=0.13, emission="#021117", emission_strength=0.22),
        "cyan": material("KEX_MAT_EmissiveCyan", "#116C78", roughness=0.34, emission="#77E9F1", emission_strength=0.76),
        "amber": material("KEX_MAT_EmissiveAmber", "#8B552A", roughness=0.34, emission="#F3B66B", emission_strength=0.72),
        "red": material("KEX_MAT_EmissiveRed", "#7E302A", roughness=0.30, emission="#FF6758", emission_strength=0.7),
    }


def parent_to(obj: bpy.types.Object, root: bpy.types.Object) -> bpy.types.Object:
    obj.parent = root
    return obj


def local_point(
    origin: tuple[float, float, float],
    point: tuple[float, float, float],
    yaw: float,
) -> tuple[float, float, float]:
    ox, oy, oz = origin
    px, py, pz = point
    return (
        ox + px * math.cos(yaw) - py * math.sin(yaw),
        oy + px * math.sin(yaw) + py * math.cos(yaw),
        oz + pz,
    )


def local_point_euler(
    origin: tuple[float, float, float],
    point: tuple[float, float, float],
    rotation: tuple[float, float, float],
) -> tuple[float, float, float]:
    """Transform a local offset by a complete Euler rotation."""
    transformed = Vector(origin) + Euler(rotation, "XYZ").to_matrix() @ Vector(point)
    return tuple(transformed)


def empty(root: bpy.types.Object, name: str) -> bpy.types.Object:
    """Create a semantic module/group node retained in the exported GLB."""
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = root
    return obj


def console(
    root: bpy.types.Object,
    mats: dict[str, bpy.types.Material],
    prefix: str,
    location: tuple[float, float, float],
    width: float,
    height: float,
    *,
    yaw: float = 0,
    interactive_controls: bool = False,
) -> tuple[float, float, float]:
    """Build a sealed physical display and return its UI surface centre.

    All face offsets are evaluated in panel-local space before yaw. This is
    the V2 screen contract: side displays can no longer drift away from their
    bezels when their wall orientation changes.
    """
    depth = 0.46
    front_y = -depth / 2 - 0.035
    rotation = (0, 0, yaw)

    parent_to(cube(f"{prefix}_Chassis", location, (width + 0.82, depth, height + 0.72), mats["hull"], rotation=rotation, bevel=0.24), root)
    parent_to(cube(f"{prefix}_ShockGasket", local_point(location, (0, front_y - 0.025, 0), yaw), (width + 0.28, 0.07, height + 0.28), mats["rubber"], rotation=rotation, bevel=0.16), root)
    screen_center = local_point(location, (0, front_y - 0.07, 0), yaw)
    parent_to(cube(f"{prefix}_Screen", screen_center, (width, 0.055, height), mats["screen"], rotation=rotation, bevel=0.065), root)

    # A single tactile control strip keeps the screen hierarchy readable
    # without surrounding every display with a stack of decorative rails.
    control_z = -height / 2 - 0.48
    parent_to(cube(f"{prefix}_ControlStrip", local_point(location, (0, -0.04, control_z), yaw), (width + 0.5, 0.70, 0.38), mats["panel"], rotation=rotation, bevel=0.10), root)
    # Only the contact terminal needs dedicated hardware actions. Project,
    # experience and skills content is directly selectable on the display,
    # so adding a second, partly occluded button bank would imply duplicate
    # controls with no distinct purpose.
    if interactive_controls:
        controls = (
            ("Back", -0.33, "orange"),
            ("Email", -0.11, "cream"),
            ("Link", 0.11, "cream"),
            ("Copy", 0.33, "cyan"),
        )
        for control_name, x_ratio, material_key in controls:
            parent_to(
                cube(
                    f"{prefix}_Control_{control_name}",
                    local_point(location, (width * x_ratio, -0.42, control_z + 0.07), yaw),
                    (0.42, 0.08, 0.14),
                    mats[material_key],
                    rotation=rotation,
                    bevel=0.035,
                ),
                root,
            )

    parent_to(cube(f"{prefix}_Status", local_point(location, (0, front_y - 0.14, height / 2 + 0.20), yaw), (width * 0.38, 0.025, 0.036), mats["cyan"], rotation=rotation, bevel=0.012), root)
    return screen_center


def wall_panel(
    root: bpy.types.Object,
    mats: dict[str, bpy.types.Material],
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    *,
    material: str = "panel",
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> None:
    parent_to(cube(name, location, dimensions, mats[material], rotation=rotation, bevel=0.13), root)
    x, y, z = location
    dx, dy, dz = dimensions
    for sx in (-1, 1):
        for sz in (-1, 1):
            fastener = sphere(
                f"{name}_Bolt_{sx}_{sz}",
                (x + sx * max(0.05, dx / 2 - 0.14), y - max(0.03, dy / 2 + 0.02), z + sz * max(0.05, dz / 2 - 0.14)),
                (0.045, 0.025, 0.045),
                mats["cream"],
                segments=8,
                rings=5,
            )
            parent_to(fastener, root)


def socket(root: bpy.types.Object, name: str, location: tuple[float, float, float], rotation: tuple[float, float, float] = (0, 0, 0)) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    obj.empty_display_type = "CIRCLE"
    obj.empty_display_size = 0.4
    obj.parent = root
    return obj


def build_mission_command(
    root: bpy.types.Object,
    mats: dict[str, bpy.types.Material],
) -> tuple[float, float, float]:
    """Build the integrated projects/mission-command station."""
    rotation = (math.radians(-6), 0, 0)
    origin = (0, 6.55, 3.0)
    parent_to(cube("KEX_STN_COMMAND_Housing", origin, (11.65, 0.82, 4.35), mats["panel"], rotation=rotation, bevel=0.42), root)
    parent_to(cube("KEX_STN_COMMAND_IvorySurround", local_point_euler(origin, (0, -0.46, 0.10), rotation), (10.75, 0.09, 3.72), mats["cream"], rotation=rotation, bevel=0.31), root)
    parent_to(cube("KEX_STN_COMMAND_ShockGasket", local_point_euler(origin, (0, -0.53, 0.10), rotation), (9.72, 0.07, 3.24), mats["rubber"], rotation=rotation, bevel=0.24), root)
    screen_center = local_point_euler(origin, (0, -0.59, 0.10), rotation)
    parent_to(cube("KEX_STN_COMMAND_DisplayGlass", screen_center, (9.0, 0.045, 3.0), mats["screen"], rotation=rotation, bevel=0.16), root)
    parent_to(cube("KEX_LIGHT_COMMAND_Task", local_point_euler(origin, (0, -0.65, 1.89), rotation), (3.2, 0.035, 0.055), mats["amber"], rotation=rotation, bevel=0.018), root)

    parent_to(tapered_box("KEX_STN_COMMAND_Plinth", (0, 5.10, 1.05), (13.4, 2.92), (12.1, 2.10), 0.92, mats["panel"], top_shift_y=0.10, bevel=0.28), root)
    parent_to(cube("KEX_STN_COMMAND_Worktop", (0, 5.18, 1.53), (11.9, 1.84, 0.14), mats["worktop"], bevel=0.14), root)
    parent_to(cube("KEX_STN_COMMAND_ProjectSelectorBay", (0, 4.69, 1.66), (7.2, 0.34, 0.68), mats["rubber"], rotation=(math.radians(-9), 0, 0), bevel=0.13), root)

    for side_name, x, accent in (("PORT", -4.65, "cyan"), ("STBD", 4.65, "amber")):
        parent_to(cube(f"KEX_STN_COMMAND_TelemetryBay_{side_name}", (x, 4.64, 1.65), (1.72, 0.30, 0.62), mats["rubber"], rotation=(math.radians(-9), 0, 0), bevel=0.11), root)
        parent_to(cube(f"KEX_LIGHT_COMMAND_Telemetry_{side_name}", (x - (0.68 if x < 0 else -0.68), 4.46, 1.66), (0.045, 0.025, 0.32), mats[accent], bevel=0.012), root)

    for control_name, x, accent in (("CONTEXT_SHIFT", -0.66, "cyan"), ("SUMMON_KOFTE", 0.66, "amber")):
        parent_to(cube(f"KEX_STN_COMMAND_Guard_{control_name}", (x, 4.41, 1.72), (0.82, 0.64, 0.24), mats["rubber"], bevel=0.15), root)
        parent_to(cube(f"KEX_STN_COMMAND_Button_{control_name}", (x, 4.06, 1.76), (0.52, 0.13, 0.17), mats[accent], bevel=0.10), root)

    parent_to(cube("KEX_LIGHT_COMMAND_Underglow_PORT", (-4.40, 4.28, 0.72), (3.35, 0.05, 0.055), mats["amber"], bevel=0.018), root)
    parent_to(cube("KEX_LIGHT_COMMAND_Underglow_STBD", (4.40, 4.28, 0.72), (3.35, 0.05, 0.055), mats["amber"], bevel=0.018), root)
    return screen_center


def build_wall_station(
    root: bpy.types.Object,
    mats: dict[str, bpy.types.Material],
    prefix: str,
    origin: tuple[float, float, float],
    width: float,
    height: float,
    yaw: float,
    accent: str,
) -> tuple[float, float, float]:
    """Build a pressure-wall-integrated display, service bay and handhold."""
    parent_to(cube(f"{prefix}_WallCassette", origin, (width + 1.35, 0.30, height + 1.42), mats["soft"], rotation=(0, 0, yaw), bevel=0.34), root)
    surface = console(root, mats, prefix, origin, width, height, yaw=yaw)
    task_position = local_point(origin, (0, -0.39, height / 2 + 0.48), yaw)
    parent_to(cube(f"KEX_LIGHT_{prefix.removeprefix('KEX_STN_')}_Task", task_position, (width * 0.46, 0.045, 0.055), mats["amber"], rotation=(0, 0, yaw), bevel=0.018), root)

    service_z = -height / 2 - 1.04
    parent_to(cube(f"{prefix}_ServiceRecess", local_point(origin, (0.72, -0.18, service_z), yaw), (width * 0.48, 0.36, 0.72), mats["rubber"], rotation=(0, 0, yaw), bevel=0.11), root)
    parent_to(cube(f"{prefix}_ServiceHatch", local_point(origin, (0.72, -0.40, service_z), yaw), (width * 0.40, 0.08, 0.56), mats["panel"], rotation=(0, 0, yaw), bevel=0.08), root)
    parent_to(cube(f"{prefix}_DiagnosticRail", local_point(origin, (-width * 0.25, -0.40, service_z), yaw), (width * 0.30, 0.07, 0.12), mats[accent], rotation=(0, 0, yaw), bevel=0.025), root)

    handle_a = local_point(origin, (-width / 2 - 0.55, -0.55, -height * 0.10), yaw)
    handle_b = local_point(origin, (-width / 2 - 0.55, -0.55, -height * 0.10 + 1.35), yaw)
    parent_to(cylinder_between(f"{prefix}_CrashHandle", handle_a, handle_b, 0.09, mats["bronze"], vertices=12, bevel=0.025), root)
    return surface


def build_cockpit(preview: bool) -> Path:
    reset_scene()
    mats = cockpit_materials()
    root = bpy.data.objects.new("KEX_ROOT", None)
    bpy.context.collection.objects.link(root)
    root["world"] = "kofte-explorer"
    root["version"] = 5
    root["screenContract"] = "kex-stations-v5"

    shell = empty(root, "KEX_MODULE_ARCHITECTURE")
    dock = empty(root, "KEX_MODULE_COPILOT_DOCK")
    command = empty(root, "KEX_MODULE_MISSION_COMMAND")
    mission_log = empty(root, "KEX_MODULE_MISSION_LOG_PORT")
    engineering = empty(root, "KEX_MODULE_ENGINEERING_STBD")
    comms = empty(root, "KEX_MODULE_COMMS_AFT_STBD")

    parent_to(cube("KEX_ARCH_PressureDeck", (0, 0, -0.28), (20.2, 18.8, 0.56), mats["hull"], bevel=0.22), shell)
    parent_to(cube("KEX_ARCH_DeckSpine", (0, -0.15, 0.04), (5.35, 16.4, 0.13), mats["soft"], bevel=0.20), shell)
    for side_name, x in (("PORT", -5.95), ("STBD", 5.95)):
        parent_to(cube(f"KEX_ARCH_DeckPanel_{side_name}", (x, -0.10, 0.02), (5.65, 15.9, 0.11), mats["panel"], bevel=0.18), shell)
        inner_x = -3.02 if side_name == "PORT" else 3.02
        parent_to(cube(f"KEX_LIGHT_DeckGuide_{side_name}", (inner_x, -0.1, 0.11), (0.08, 14.8, 0.035), mats["amber"], bevel=0.016), shell)

    parent_to(cube("KEX_ARCH_PressureWall_PORT", (-9.62, 0, 4.55), (0.82, 18.1, 9.1), mats["hull"], bevel=0.28), shell)
    parent_to(cube("KEX_ARCH_PressureWall_STBD", (9.62, 0, 4.55), (0.82, 18.1, 9.1), mats["hull"], bevel=0.28), shell)
    parent_to(cube("KEX_MOBILE_HIDE_RearBulkhead", (0, -9.18, 4.55), (19.2, 0.48, 9.1), mats["hull"], bevel=0.28), shell)
    parent_to(cube("KEX_ARCH_ForwardPressureBase", (0, 8.50, 1.22), (18.7, 0.84, 2.44), mats["hull"], bevel=0.24), shell)

    observation_trim = 0.46
    parent_to(ellipse_arc("KEX_ARCH_ObservationPerimeter", (0, 8.12, 4.72), 8.45, 4.46, 0.22, mats["soft"], start_angle=observation_trim, end_angle=math.pi - observation_trim, points=48), shell)
    parent_to(ellipse_arc("KEX_ARCH_ObservationSeal", (0, 8.04, 4.72), 8.12, 4.12, 0.075, mats["rubber"], start_angle=observation_trim, end_angle=math.pi - observation_trim, points=48, bevel_resolution=2), shell)
    parent_to(cube("KEX_ARCH_ObservationSill", (0, 8.12, 2.50), (16.55, 0.56, 0.38), mats["soft"], bevel=0.18), shell)
    for side_name, side in (("PORT", -1), ("STBD", 1)):
        parent_to(cylinder_between(f"KEX_ARCH_ObservationPost_{side_name}", (side * 7.42, 8.10, 6.82), (side * 8.20, 8.10, 2.72), 0.22, mats["soft"], vertices=16, bevel=0.035), shell)
        parent_to(cylinder_between(f"KEX_ARCH_ObservationSealPost_{side_name}", (side * 7.14, 8.02, 6.64), (side * 8.02, 8.02, 2.78), 0.073, mats["rubber"], vertices=10, bevel=0.018), shell)
        parent_to(cylinder_between(f"KEX_LIGHT_ObservationPost_{side_name}", (side * 7.92, 7.76, 3.05), (side * 7.92, 7.76, 4.45), 0.038, mats["amber"], vertices=10, bevel=0.012), shell)

    # Longitudinal ceiling members preserve the central Earth sightline; V4's
    # transverse ellipse bows were the unwanted double-ring in every shot.
    for side_name, x in (("PORT", -7.45), ("STBD", 7.45)):
        parent_to(cube(f"KEX_MOBILE_HIDE_CeilingPanel_{side_name}", (x, -1.8, 9.18), (4.25, 14.2, 0.32), mats["hull"], bevel=0.22), shell)
        parent_to(cube(f"KEX_ARCH_LongitudinalSpine_{side_name}", (x * 0.88, -1.0, 8.91), (0.28, 15.1, 0.24), mats["soft"], bevel=0.10), shell)
        parent_to(cube(f"KEX_LIGHT_CeilingGuide_{side_name}", (x * 0.88, 0.3, 8.74), (0.055, 5.4, 0.04), mats["amber"], bevel=0.014), shell)

    for side_name, side in (("PORT", -1), ("STBD", 1)):
        wall_x = side * 9.12
        for rib_name, y in (("AFT", -5.8), ("MID", -1.8), ("FWD", 4.9)):
            parent_to(cube(f"KEX_ARCH_WallRib_{side_name}_{rib_name}", (wall_x, y, 4.55), (0.40, 0.64, 7.95), mats["soft"], bevel=0.15), shell)
        parent_to(cube(f"KEX_ARCH_UtilityPanel_{side_name}", (wall_x - side * 0.23, -5.2, 5.75), (0.18, 2.25, 1.50), mats["panel"], bevel=0.14), shell)
        parent_to(cylinder_between(f"KEX_ARCH_UtilityLine_{side_name}", (wall_x - side * 0.32, -7.6, 6.82), (wall_x - side * 0.32, 6.7, 6.82), 0.042, mats["bronze"], vertices=10, bevel=0.012), shell)

    parent_to(cube("KEX_MOBILE_HIDE_Airlock", (0, -8.86, 3.72), (4.5, 0.20, 6.15), mats["soft"], bevel=0.20), shell)
    parent_to(torus("KEX_MOBILE_HIDE_AirlockSeal", (0, -8.70, 3.72), 2.02, 0.12, mats["orange"], rotation=(math.pi / 2, 0, 0)), shell)

    for radius, material_key, minor, ring_name in ((2.05, "bronze", 0.07, "Outer"), (1.58, "cyan", 0.05, "Guidance"), (1.18, "rubber", 0.18, "Cradle")):
        parent_to(torus(f"KEX_DECK_DOCK_Ring_{ring_name}", (0, -1.0, 0.17), radius, minor, mats[material_key]), dock)
    parent_to(cube("KEX_DECK_DOCK_Plate", (0, -1.0, 0.11), (2.2, 2.2, 0.16), mats["soft"], bevel=0.42), dock)
    for lock_name, angle in (("FWD", 0), ("PORT", math.pi / 2), ("AFT", math.pi), ("STBD", math.pi * 1.5)):
        parent_to(cube(f"KEX_DECK_DOCK_Lock_{lock_name}", (math.cos(angle) * 1.75, -1.0 + math.sin(angle) * 1.75, 0.25), (0.30, 0.30, 0.16), mats["cream"], rotation=(0, 0, angle), bevel=0.07), dock)

    projects_surface = build_mission_command(command, mats)
    experience_surface = build_wall_station(mission_log, mats, "KEX_STN_LOG_PORT", (-9.18, 0.65, 3.65), 5.70, 3.60, math.pi / 2, "cyan")
    skills_surface = build_wall_station(engineering, mats, "KEX_STN_ENGINEERING_STBD", (9.18, 0.40, 3.65), 5.40, 3.40, -math.pi / 2, "amber")
    contact_surface = console(comms, mats, "KEX_STN_COMMS", (4.92, -5.72, 2.45), 3.60, 2.0, yaw=-0.16, interactive_controls=True)

    sockets = {
        "hub": ((0, -1.0, 0.30), (0, 0, 0)),
        "projects": ((0, 4.75, 0.30), (0, 0, 0)),
        "experience": ((-5.35, 0.65, 0.30), (0, 0, -math.pi / 2)),
        "skills": ((5.35, 0.40, 0.30), (0, 0, math.pi / 2)),
        "contact": ((2.5, -4.85, 0.30), (0, 0, -0.16)),
    }
    semantic_socket_names = {
        "hub": "COPILOT_DOCK",
        "projects": "MISSION_COMMAND",
        "experience": "MISSION_LOG_PORT",
        "skills": "ENGINEERING_STBD",
        "contact": "COMMS_AFT_STBD",
    }
    for key, (position, rotation) in sockets.items():
        socket(root, f"KEX_SOCKET_{semantic_socket_names[key]}", position, rotation)

    screen_surfaces = {
        "projects": {"position": projects_surface, "rotation": [-math.radians(6), 0, 0], "size": [9.0, 3.0], "station": "missionCommand"},
        "experience": {"position": experience_surface, "rotation": [0, math.pi / 2, 0], "size": [5.70, 3.60], "station": "missionLogPort"},
        "skills": {"position": skills_surface, "rotation": [0, -math.pi / 2, 0], "size": [5.40, 3.40], "station": "engineeringStarboard"},
        "contact": {"position": contact_surface, "rotation": [0, -0.16, 0], "size": [3.60, 2.0], "station": "commsAftStarboard"},
    }
    for key, screen in screen_surfaces.items():
        socket(root, f"KEX_SCREEN_{semantic_socket_names[key]}", screen["position"])

    output = MODEL_DIR / "cockpit.glb"
    export_glb(output, root, animations=False)
    write_layout_manifest(sockets, screen_surfaces)
    if preview:
        render_cockpit_preview()
    return output


def write_layout_manifest(
    sockets: dict[str, tuple[tuple[float, float, float], tuple[float, float, float]]],
    screen_surfaces: dict[str, dict[str, Any]],
) -> None:
    def three_position(value: tuple[float, float, float]) -> list[float]:
        x, y, z = value
        return [x, z, -y]

    manifest: dict[str, Any] = {
        "version": 5,
        "assetName": "Kofte Explorer",
        "coordinateSystem": "threejs-x-right-y-up-negative-z-forward",
        "stationAliases": {
            "overview": "observationDeck",
            "hub": "copilotDock",
            "projects": "missionCommand",
            "experience": "missionLogPort",
            "skills": "engineeringStarboard",
            "contact": "commsAftStarboard",
        },
        "sockets": {key: {"position": three_position(position)} for key, (position, _rotation) in sockets.items()},
        "screens": {
            key: {
                "station": screen["station"],
                "position": three_position(screen["position"]),
                "rotation": screen["rotation"],
                "size": screen["size"],
            }
            for key, screen in screen_surfaces.items()
        },
        "mobileOccluderPrefix": "KEX_MOBILE_HIDE_",
        "shots": {
            "desktop": {
                "hub": {"position": [0, 4.25, 7.9], "target": [0, 1.55, 0.65]},
                "overview": {"position": [0, 5.5, 9.1], "target": [0, 3.4, -4.8]},
                "projects": {"position": [0, 3.8, 6.8], "target": [0, 3.05, -6.0]},
                "experience": {"position": [2.3, 4.5, 1.2], "target": [-8.85, 3.65, -0.65]},
                "skills": {"position": [-2.3, 4.5, 1.2], "target": [8.85, 3.65, -0.40]},
                "contact": {"position": [0.9, 3.45, 8.0], "target": [4.87, 2.45, 6.02]},
            },
            "mobile": {
                "hub": {"position": [0, 5.9, 9.4], "target": [0, 1.85, 0.1]},
                "overview": {"position": [0, 6.2, 10.8], "target": [0, 3.6, -4.3]},
                "projects": {"position": [0, 4.5, 9.6], "target": [0, 3.05, -6.0]},
                "experience": {"position": [4.4, 4.7, 2.0], "target": [-8.85, 3.65, -0.65]},
                "skills": {"position": [-4.4, 4.7, 2.0], "target": [8.85, 3.65, -0.40]},
                "contact": {"position": [0.9, 4.5, 8.8], "target": [4.87, 2.45, 6.02]},
            },
        },
    }

    def format_json(value: Any, depth: int = 0) -> str:
        """Biome-compatible JSON with compact numeric vectors."""
        if isinstance(value, dict):
            indent = "  " * depth
            child_indent = "  " * (depth + 1)
            entries = [
                f"{child_indent}{json.dumps(key)}: {format_json(child, depth + 1)}"
                for key, child in value.items()
            ]
            return "{\n" + ",\n".join(entries) + f"\n{indent}}}"
        if isinstance(value, list):
            return json.dumps(value, ensure_ascii=False)
        return json.dumps(value, ensure_ascii=False)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    (MODEL_DIR / "cockpit-layout.json").write_text(format_json(manifest) + "\n")


def setup_preview_camera(location: tuple[float, float, float], target: tuple[float, float, float], lens: float = 48) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    camera.data.lens = lens
    camera.data.clip_end = 250
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    return camera


def add_area_light(location: tuple[float, float, float], energy: float, color: str, size: float, target: tuple[float, float, float]) -> None:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = rgba(color)[:3]
    light.rotation_euler = (Vector(target) - light.location).to_track_quat("-Z", "Y").to_euler()


def render_kofte_preview() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    setup_preview_camera((3.7, -6.4, 3.0), (0, 0, 1.05), 58)
    add_area_light((4, -4, 6), 950, "#FFF0D5", 5, (0, 0, 1))
    add_area_light((-4, -2, 3), 650, PALETTE["cyan"], 4, (0, 0, 1))
    add_area_light((0, 4, 4), 750, PALETTE["orange"], 3, (0, 0, 1))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects.get("KofteRig")
    if rig is None:
        raise RuntimeError("KofteRig missing during preview render")
    rig.animation_data_create()
    preview_poses = (
        ("kofte.png", "Idle", 1),
        ("kofte-wave.png", "Wave", 34),
        ("kofte-point.png", "Point", 28),
        ("kofte-thumbsup.png", "ThumbsUp", 28),
    )
    for filename, action_name, frame in preview_poses:
        rig.animation_data.action = bpy.data.actions.get(action_name)
        scene.frame_set(frame)
        scene.render.filepath = str(PREVIEW_DIR / filename)
        bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None
    scene.frame_set(1)


def render_cockpit_preview() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    setup_preview_camera((0, -12.8, 5.2), (0, 4.2, 3.2), 34)
    add_area_light((0, -2, 7), 1500, "#FFE1B0", 8, (0, 2, 2))
    add_area_light((-7, 2, 5), 900, PALETTE["cyan"], 5, (0, 2, 2))
    add_area_light((7, 5, 6), 750, PALETTE["orange"], 5, (0, 3, 2))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(PREVIEW_DIR / "cockpit.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = parse_args()
    outputs: list[Path] = []
    if args.asset in ("all", "kofte"):
        outputs.append(build_kofte(args.preview))
    if args.asset in ("all", "cockpit"):
        outputs.append(build_cockpit(args.preview))
    print("BUILT_ASSETS=" + json.dumps([str(path) for path in outputs]))


if __name__ == "__main__":
    main()
