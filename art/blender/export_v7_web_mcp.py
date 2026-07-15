"""Export the authored Kofte Explorer V7 Blender scene for the web runtime.

This script deliberately does not build or redesign geometry. It talks to the
open authoritative Blender workspace through Blender MCP, derives optimized
static batches plus semantic controls from the existing scene, and writes the
versioned GLBs/layout manifest consumed by the Three.js application.

Run from the repository root:

    PYTHONPATH=blender_mcp/tests \
      blender_mcp/mcp/.venv/bin/python art/blender/export_v7_web_mcp.py
"""

from __future__ import annotations

import json
import os

from mcp_client import MCPClient


ROOT = "/Users/muhammedenessahin/Desktop/Dev/personalwebsite"
BLEND_COPY = f"{ROOT}/art/blender/kofte-explorer-v7.blend"
MODEL_DIR = f"{ROOT}/public/models/cockpit/v7"


EXPORT_CODE = rf'''
import bpy
import json
import os
from mathutils import Matrix

ROOT = {ROOT!r}
BLEND_COPY = {BLEND_COPY!r}
MODEL_DIR = {MODEL_DIR!r}
os.makedirs(MODEL_DIR, exist_ok=True)

scene = bpy.context.scene
if scene.get("kex_cockpit_version") != "7.0.0-mcp-research-spacecraft":
    raise RuntimeError("Open Blender workspace is not the approved KEX V7 scene")

cockpit = bpy.data.collections.get("10_COCKPIT")
interior = bpy.data.collections.get("16_V7_INTERIOR_PRESSURE")
exterior_batches = bpy.data.collections.get("KEX_EXPORT_EXTERIOR_GEOMETRY")
anchors = bpy.data.collections.get("90_EXPORT")
if not all((cockpit, interior, exterior_batches, anchors)):
    raise RuntimeError("KEX V7 source collections are incomplete")

# Keep the approved V7 framing in the authoritative Blender workspace. The
# side-screen cameras sit lower and closer so the pressure shell supports the
# composition without becoming a large empty block above the consoles.
camera_overrides = {{
    "KEX_CAM_Experience": (0.35, -0.9, 4.65),
    "KEX_CAM_Skills": (-0.35, -0.9, 4.65),
}}
for camera_name, location in camera_overrides.items():
    camera = bpy.data.objects.get(camera_name)
    if camera is None:
        raise RuntimeError("Missing V7 camera: " + camera_name)
    camera.location = location

# This becomes Blender's active file, so future MCP refinements continue from
# the V7 workspace rather than the pre-export research scene.
bpy.ops.wm.save_as_mainfile(filepath=BLEND_COPY)


def remove_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        return
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)


def temp_collection(name):
    remove_collection(name)
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    return collection


def three_position(value):
    return [round(value.x, 6), round(value.z, 6), round(-value.y, 6)]


def three_size(value):
    return [round(value.x, 6), round(value.z, 6), round(value.y, 6)]


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)
    if objects:
        bpy.context.view_layer.objects.active = objects[0]


def export_glb(path, objects):
    select_only(objects)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_extras=True,
        export_materials="EXPORT",
        export_animations=False,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
    )


CONTROL_SPECS = [
    # Main navigation bank.
    ("nav-projects", "KEX_V61_Command_NAV_Key_01", "Keycap", "Projects", "navigate.projects", "button", ("Keycap", "Face", "Legend")),
    ("nav-experience", "KEX_V61_Command_NAV_Key_02", "Keycap", "Experience", "navigate.experience", "button", ("Keycap", "Face", "Legend")),
    ("nav-skills", "KEX_V61_Command_NAV_Key_03", "Keycap", "Skills", "navigate.skills", "button", ("Keycap", "Face", "Legend")),
    ("nav-contact", "KEX_V61_Command_NAV_Key_04", "Keycap", "Contact", "navigate.contact", "button", ("Keycap", "Face", "Legend")),
    ("nav-overview", "KEX_V61_Command_NAV_Key_05", "Keycap", "Overview", "navigate.overview", "button", ("Keycap", "Face", "Legend")),
    ("nav-home", "KEX_V61_Command_NAV_Key_06", "Keycap", "Home", "navigate.home", "button", ("Keycap", "Face", "Legend")),
    # Flight/system bank.
    ("flight-close", "KEX_V61_Command_FLT_Rocker_01", "Paddle", "Close view", "camera.close", "rocker", ("Paddle", "Legend")),
    ("flight-wide", "KEX_V61_Command_FLT_Rocker_02", "Paddle", "Wide view", "camera.wide", "rocker", ("Paddle", "Legend")),
    ("system-route", "KEX_V61_Command_SYS_Route", "Paddle", "Observation lights", "lighting.cycle", "rocker", ("Paddle", "Legend")),
    ("system-cover", "KEX_V61_Command_SYS_Critical", "SafetyCover", "Reset cover", "system.cover", "cover", ("SafetyCover", "CoverInset")),
    ("system-reset", "KEX_V61_Command_SYS_Critical", "Paddle", "Reset world", "system.reset", "guarded", ("Paddle",)),
    # Main comms bank.
    ("com-contact", "KEX_V61_Command_COM_Key_01", "Keycap", "Contact", "navigate.contact", "button", ("Keycap", "Face", "Legend")),
    ("com-email", "KEX_V61_Command_COM_Key_02", "Keycap", "Email", "contact.email", "button", ("Keycap", "Face", "Legend")),
    ("com-linkedin", "KEX_V61_Command_COM_Key_03", "Keycap", "LinkedIn", "contact.linkedin", "button", ("Keycap", "Face", "Legend")),
    ("com-copy", "KEX_V61_Command_COM_Key_04", "Keycap", "Copy email", "contact.copy", "button", ("Keycap", "Face", "Legend")),
    ("com-en", "KEX_V61_Command_COM_Key_05", "Keycap", "English", "language.en", "button", ("Keycap", "Face", "Legend")),
    ("com-tr", "KEX_V61_Command_COM_Key_06", "Keycap", "Turkish", "language.tr", "button", ("Keycap", "Face", "Legend")),
    # Port mission log: the three real jobs.
    ("mission-ing", "KEX_V61_Mission_NAV_Key_01", "Keycap", "ING", "experience.ing-bank", "button", ("Keycap", "Face", "Legend")),
    ("mission-formica", "KEX_V61_Mission_NAV_Key_02", "Keycap", "Formica", "experience.formica", "button", ("Keycap", "Face", "Legend")),
    ("mission-nar", "KEX_V61_Mission_NAV_Key_03", "Keycap", "Nar Sistem", "experience.nar-sistem", "button", ("Keycap", "Face", "Legend")),
    # Starboard engineering: skill matrix selectors.
    ("engineering-ai", "KEX_V61_Engineering_BUS_Rocker_01", "Paddle", "AI", "skills.ai", "rocker", ("Paddle", "Legend")),
    ("engineering-backend", "KEX_V61_Engineering_BUS_Rocker_02", "Paddle", "Backend", "skills.backend", "rocker", ("Paddle", "Legend")),
    ("engineering-frontend", "KEX_V61_Engineering_BUS_Rocker_03", "Paddle", "Frontend", "skills.frontend", "rocker", ("Paddle", "Legend")),
    ("engineering-devops", "KEX_V61_Engineering_BUS_Rocker_04", "Paddle", "DevOps", "skills.devops", "rocker", ("Paddle", "Legend")),
    ("engineering-audio", "KEX_V61_Engineering_BUS_Rocker_05", "Paddle", "Cockpit audio", "system.audio", "rocker", ("Paddle", "Legend")),
    ("engineering-lights", "KEX_V61_Engineering_BUS_Rocker_06", "Paddle", "Cabin lights", "lighting.cycle", "rocker", ("Paddle", "Legend")),
    ("power-cover", "KEX_V61_Engineering_PWR_Master", "SafetyCover", "Power cover", "power.cover", "cover", ("SafetyCover", "CoverInset")),
    ("power-master", "KEX_V61_Engineering_PWR_Master", "PowerRocker", "Master lighting", "power.toggle", "guarded", ("PowerRocker",)),
    ("power-bus-a", "KEX_V61_Engineering_PWR_BusA", "Paddle", "Standard light bus", "lighting.standard", "rocker", ("Paddle", "Legend")),
    ("power-bus-b", "KEX_V61_Engineering_PWR_BusB", "Paddle", "Observation light bus", "lighting.observation", "rocker", ("Paddle", "Legend")),
    ("thermal-cool", "KEX_V61_Engineering_THERM_Dial_01", "Knob", "Cool cabin", "lighting.cool", "dial", ("Knob", "Pointer")),
    ("thermal-neutral", "KEX_V61_Engineering_THERM_Dial_02", "Knob", "Neutral cabin", "lighting.standard", "dial", ("Knob", "Pointer")),
    ("thermal-warm", "KEX_V61_Engineering_THERM_Dial_03", "Knob", "Warm cabin", "lighting.warm", "dial", ("Knob", "Pointer")),
    # Three-position orbital lever.
    ("orbital-lever", "KEX_V61_OrbitalLever", "Pivot", "Park / Cruise / Warp", "mode.cycle", "lever", ("Pivot", "Shaft", "THandle", "HandleBridge")),
]


def matches_component(name, prefix, components):
    if not name.startswith(prefix + "_"):
        return False
    return any(name.endswith("_" + component) or name == prefix + "_" + component for component in components)


source_objects = [obj for obj in list(cockpit.objects) + list(interior.objects) if obj.type == "MESH" and not obj.hide_render]
consumed_control_names = set()
resolved_controls = []
for control_id, prefix, representative_suffix, label, action, kind, components in CONTROL_SPECS:
    matches = [obj for obj in bpy.data.objects if matches_component(obj.name, prefix, components)]
    representative = next((obj for obj in matches if obj.name.endswith("_" + representative_suffix)), None)
    if representative is None:
        continue
    consumed_control_names.update(obj.name for obj in matches)
    resolved_controls.append((control_id, prefix, label, action, kind, matches, representative))


shell_collection = temp_collection("KEX7_WEB_TMP_SHELL")
depsgraph = bpy.context.evaluated_depsgraph_get()
batch_sources = {{}}
mobile_pattern = ("MobileOccluder_", "KEX_MOBILE_HIDE_")
for src in source_objects:
    if src.name in consumed_control_names:
        continue
    mobile = src.name.startswith(mobile_pattern) or any(
        token in src.name for token in ("PressureFrame", "PressureShellSkin", "CeilingRaceway")
    )
    material = src.data.materials[0] if src.data.materials else None
    material_name = material.name if material else "KEX_MAT_Panel"
    key = ("MOBILE" if mobile else "STATIC", material_name)
    evaluated = src.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    duplicate = bpy.data.objects.new("__KEX7_SHELL_SOURCE__" + src.name, mesh)
    duplicate.matrix_world = src.matrix_world.copy()
    mesh.materials.clear()
    if material:
        mesh.materials.append(material)
    shell_collection.objects.link(duplicate)
    batch_sources.setdefault(key, []).append(duplicate)

shell_batches = []
for (role, material_name), objects in batch_sources.items():
    select_only(objects)
    if len(objects) > 1:
        bpy.ops.object.join()
        joined = bpy.context.object
    else:
        joined = objects[0]
    safe_material = material_name.replace("KEX_MAT_", "").replace(" ", "_")
    joined.name = f"KEX7_{{'MOBILE_HIDE' if role == 'MOBILE' else 'SHELL'}}_{{safe_material}}"
    joined["surfaceRole"] = role.lower()
    joined["mobileHide"] = role == "MOBILE"
    shell_batches.append(joined)

# Export semantic anchors alongside the static shell so runtime/socket audits
# can inspect the GLB even without loading the JSON manifest.
anchor_duplicates = []
for source in anchors.objects:
    duplicate = bpy.data.objects.new(source.name, None)
    duplicate.matrix_world = source.matrix_world.copy()
    duplicate["semanticAnchor"] = True
    shell_collection.objects.link(duplicate)
    anchor_duplicates.append(duplicate)

shell_path = os.path.join(MODEL_DIR, "cockpit-v7-shell.glb")
export_glb(shell_path, shell_batches + anchor_duplicates)


# Controls remain separate, named nodes. Their source geometry is excluded
# from the shell batches so runtime press/cover/lever animation never z-fights.
controls_collection = temp_collection("KEX7_WEB_TMP_CONTROLS")
control_nodes = []
control_manifest = {{}}
for control_id, _prefix, label, action, kind, sources, representative in resolved_controls:
    node = bpy.data.objects.new("KEX7_CTRL_" + control_id.replace("-", "_").upper(), None)
    node.matrix_world = representative.matrix_world.copy()
    node["controlId"] = control_id
    node["controlAction"] = action
    node["controlKind"] = kind
    node["label"] = label
    controls_collection.objects.link(node)
    control_nodes.append(node)
    for src in sources:
        if src.type == "EMPTY":
            continue
        evaluated = src.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
        duplicate = bpy.data.objects.new(src.name, mesh)
        duplicate.matrix_world = src.matrix_world.copy()
        controls_collection.objects.link(duplicate)
        world = duplicate.matrix_world.copy()
        duplicate.parent = node
        duplicate.matrix_world = world
        control_nodes.append(duplicate)

    size = representative.dimensions.copy()
    hit_size = [max(0.38, size.x * 1.55), max(0.24, size.z * 2.0), max(0.38, size.y * 1.8)]
    control_manifest[control_id] = {{
        "node": node.name,
        "label": label,
        "action": action,
        "kind": kind,
        "position": three_position(representative.matrix_world.translation),
        "hitSize": [round(value, 5) for value in hit_size],
    }}

controls_path = os.path.join(MODEL_DIR, "cockpit-v7-controls.glb")
export_glb(controls_path, control_nodes)


# Exterior is already optimized into fourteen material batches by the V7 MCP
# authoring script. Duplicate them into a visible temporary export collection.
exterior_collection = temp_collection("KEX7_WEB_TMP_EXTERIOR")
exterior_nodes = []
for src in exterior_batches.objects:
    if src.type != "MESH":
        continue
    duplicate = bpy.data.objects.new(src.name, src.data.copy())
    duplicate.matrix_world = src.matrix_world.copy()
    duplicate.hide_render = False
    exterior_collection.objects.link(duplicate)
    exterior_nodes.append(duplicate)
exterior_path = os.path.join(MODEL_DIR, "kofte-explorer-v7-exterior.glb")
export_glb(exterior_path, exterior_nodes)


def anchor_position(name):
    obj = anchors.objects.get(name)
    if obj is None:
        raise RuntimeError("Missing semantic anchor: " + name)
    return three_position(obj.matrix_world.translation)


def camera_position(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError("Missing V7 camera: " + name)
    return three_position(obj.matrix_world.translation)


sockets = {{
    "hub": anchor_position("ANCHOR_HUB"),
    "gallery": anchor_position("ANCHOR_PROJECTS_INTERACTION"),
    "projects": anchor_position("ANCHOR_PROJECTS_INTERACTION"),
    "experience": anchor_position("ANCHOR_EXPERIENCE_INTERACTION"),
    "skills": anchor_position("ANCHOR_SKILLS_INTERACTION"),
    "contact": anchor_position("ANCHOR_CONTACT_INTERACTION"),
}}
screens = {{
    "projects": {{"position": anchor_position("SOCKET_PROJECTS"), "rotation": [0, 0, 0], "size": [9.2, 3.25]}},
    "experience": {{"position": anchor_position("SOCKET_EXPERIENCE"), "rotation": [0, 1.22173, 0], "size": [5.7, 3.55]}},
    "skills": {{"position": anchor_position("SOCKET_SKILLS"), "rotation": [0, -1.22173, 0], "size": [5.4, 3.4]}},
    "contact": {{"position": anchor_position("SOCKET_CONTACT"), "rotation": [0, -1.1, 0], "size": [3.7, 2.05]}},
}}

layout = {{
    "version": 7,
    "assetName": "Kofte Explorer V7",
    "coordinateSystem": "threejs-x-right-y-up-negative-z-forward",
    "assets": {{
        "shell": "/models/cockpit/v7/cockpit-v7-shell.glb",
        "controls": "/models/cockpit/v7/cockpit-v7-controls.glb",
        "exterior": "/models/cockpit/v7/kofte-explorer-v7-exterior.glb",
        "mascot": "/models/cockpit/kofte.glb",
    }},
    "sockets": sockets,
    "screens": screens,
    "observationAperture": anchor_position("SOCKET_OBSERVATION_APERTURE"),
    "earthAnchor": anchor_position("ANCHOR_EARTH_VISTA"),
    "controls": control_manifest,
    "shots": {{
        "desktop": {{
            "hub": {{"position": camera_position("KEX_CAM_Hub"), "target": [0, 2.0, 2.8]}},
            "overview": {{"position": camera_position("KEX_CAM_Overview"), "target": [0, 3.05, -1.55]}},
            "gallery": {{"position": camera_position("KEX_CAM_Projects"), "target": screens["projects"]["position"]}},
            "projects": {{"position": camera_position("KEX_CAM_Projects"), "target": screens["projects"]["position"]}},
            "experience": {{"position": camera_position("KEX_CAM_Experience"), "target": screens["experience"]["position"]}},
            "skills": {{"position": camera_position("KEX_CAM_Skills"), "target": screens["skills"]["position"]}},
            "contact": {{"position": [1.2, 4.2, 10.4], "target": screens["contact"]["position"]}},
        }},
        "mobile": {{
            "hub": {{"position": [0, 5.4, 10.6], "target": [0, 2.2, 1.5]}},
            "overview": {{"position": [0, 5.8, 11.0], "target": [0, 3.3, -1.8]}},
            "gallery": {{"position": [0, 4.35, 7.4], "target": screens["projects"]["position"]}},
            "projects": {{"position": [0, 4.35, 7.4], "target": screens["projects"]["position"]}},
            "experience": {{
                "position": [0.35, 4.65, 0.9],
                "target": [screens["experience"]["position"][0], 2.9, screens["experience"]["position"][2]],
            }},
            "skills": {{
                "position": [-0.35, 4.65, 0.9],
                "target": [screens["skills"]["position"][0], 2.9, screens["skills"]["position"][2]],
            }},
            "contact": {{"position": [1.2, 4.5, 10.4], "target": screens["contact"]["position"]}},
        }},
    }},
    "budgets": {{
        "desktopTriangles": 72000,
        "mobileTriangles": 45000,
        "exteriorTriangles": 20000,
    }},
}}

layout_path = os.path.join(MODEL_DIR, "cockpit-v7-layout.json")
layout_source_path = os.path.join(ROOT, "src/world/cockpit/v7/cockpit-v7-layout.json")
os.makedirs(os.path.dirname(layout_source_path), exist_ok=True)
for target_path in (layout_path, layout_source_path):
    with open(target_path, "w", encoding="utf-8") as handle:
        json.dump(layout, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def triangle_count(objects):
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        total += sum(max(0, len(poly.vertices) - 2) for poly in evaluated.data.polygons)
    return total


result = {{
    "version": scene.get("kex_cockpit_version"),
    "sourceCopy": BLEND_COPY,
    "shell": {{"path": shell_path, "batches": len(shell_batches), "triangles": triangle_count(shell_batches), "bytes": os.path.getsize(shell_path)}},
    "controls": {{"path": controls_path, "count": len(resolved_controls), "nodes": len(control_nodes), "triangles": triangle_count(control_nodes), "bytes": os.path.getsize(controls_path)}},
    "exterior": {{"path": exterior_path, "batches": len(exterior_nodes), "triangles": triangle_count(exterior_nodes), "bytes": os.path.getsize(exterior_path)}},
    "layout": layout_path,
    "layoutSource": layout_source_path,
}}

# The generated collections are temporary. Source geometry and authoring
# collections remain untouched in the open Blender workspace.
remove_collection("KEX7_WEB_TMP_SHELL")
remove_collection("KEX7_WEB_TMP_CONTROLS")
remove_collection("KEX7_WEB_TMP_EXTERIOR")
bpy.ops.object.select_all(action="DESELECT")
'''


def main() -> None:
    command = [os.path.join(ROOT, "blender_mcp/mcp/.venv/bin/blender-mcp")]
    with MCPClient(command) as client:
        client.initialize()
        response = client.call_tool("execute_blender_code", {"code": EXPORT_CODE})
    payload = response.get("structuredContent", response)
    print(json.dumps(payload, indent=2, default=str))


if __name__ == "__main__":
    main()
