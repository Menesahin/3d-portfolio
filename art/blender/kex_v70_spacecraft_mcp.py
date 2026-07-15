"""Build the expanded Kofte Explorer interior and research-spacecraft exterior.

The script executes against the open authoritative Blender workspace through
the live Blender MCP connection. It is idempotent and keeps console/mascot
scale unchanged while expanding the usable cockpit floor area by ~2x.
"""

from __future__ import annotations

import json
import os
import sys

from mcp_client import MCPClient


BLENDER_CODE = r'''
import bpy
import math
from mathutils import Euler, Vector


SCENE = bpy.context.scene
COCKPIT = bpy.data.collections["10_COCKPIT"]
REFERENCE = bpy.data.collections["00_REFERENCE"]
SOCKETS = bpy.data.collections["90_EXPORT"]
CAMERAS = bpy.data.collections["50_CAMERAS"]
LIGHTS = bpy.data.collections["40_LIGHTING"]


def ensure_collection(name):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        SCENE.collection.children.link(collection)
    return collection


INTERIOR = ensure_collection("16_V7_INTERIOR_PRESSURE")
EXTERIOR = ensure_collection("17_V7_EXTERIOR_HULL")
EXT_REFERENCE = ensure_collection("18_V7_EXTERIOR_REFERENCE")
EXT_LIGHTS = ensure_collection("70_V7_EXTERIOR_LIGHTING")
EXT_CAMERAS = ensure_collection("75_V7_EXTERIOR_CAMERAS")
EXPORT_INTERIOR = ensure_collection("KEX_EXPORT_GEOMETRY")
EXPORT_EXTERIOR = ensure_collection("KEX_EXPORT_EXTERIOR_GEOMETRY")


for collection in (INTERIOR, EXTERIOR, EXT_REFERENCE, EXT_LIGHTS, EXT_CAMERAS):
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def relink(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def material(name, base, metallic=0.0, roughness=0.45, emission=None, strength=0.0, alpha=1.0, transmission=0.0, cull=False):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*base, alpha)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.28
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission is not None:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    mat.use_backface_culling = cull
    if alpha < 1.0:
        try:
            mat.surface_render_method = "DITHERED"
        except Exception:
            pass
    return mat


MAT_PRESSURE = material("KEX_MAT_V7PressureShell", (0.028, 0.058, 0.068), 0.72, 0.30)
MAT_FRAME = material("KEX_MAT_V7Frame", (0.31, 0.37, 0.37), 0.82, 0.21)
MAT_INNER_PANEL = material("KEX_MAT_V7InnerPanel", (0.09, 0.18, 0.20), 0.42, 0.34)
MAT_WHITE_ARMOR = material("KEX_MAT_V7WhiteArmor", (0.52, 0.58, 0.57), 0.55, 0.27, cull=True)
MAT_GRAPHITE = material("KEX_MAT_V7GraphiteHull", (0.035, 0.075, 0.088), 0.82, 0.29, cull=True)
MAT_BELLY = material("KEX_MAT_V7BellyArmor", (0.075, 0.115, 0.125), 0.74, 0.34, cull=True)
MAT_GLASS = material("KEX_MAT_V7CanopyGlass", (0.015, 0.14, 0.19), 0.18, 0.10, alpha=0.30, transmission=0.58, cull=False)
MAT_BRONZE = bpy.data.materials["KEX_MAT_BronzeHardware"]
MAT_RUBBER = bpy.data.materials["KEX_MAT_Rubber"]
MAT_PANEL = bpy.data.materials["KEX_MAT_Panel"]
MAT_CYAN = bpy.data.materials["KEX_MAT_CyanEmission"]
MAT_AMBER = bpy.data.materials["KEX_MAT_AmberEmission"]
MAT_RED = bpy.data.materials["KEX_MAT_RedEmission"]
MAT_ENGINE = material("KEX_MAT_V7EngineEmission", (0.005, 0.12, 0.19), 0.20, 0.18, (0.02, 0.75, 1.0), 8.0)
MAT_RCS = material("KEX_MAT_V7RCSEmission", (0.15, 0.06, 0.01), 0.15, 0.20, (1.0, 0.22, 0.02), 6.0)


def bevel_cube(name, location, dimensions, mat, rotation=(0.0, 0.0, 0.0), bevel=0.06, collection=INTERIOR):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("EdgeSoftening", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    obj.data.materials.append(mat)
    relink(obj, collection)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0.0, 0.0, 0.0), vertices=20, collection=EXTERIOR):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    relink(obj, collection)
    bevel = obj.modifiers.new("EdgeSoftening", "BEVEL")
    bevel.width = min(radius * 0.08, depth * 0.12)
    bevel.segments = 2
    return obj


def sphere(name, location, dimensions, mat, collection=EXTERIOR):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    relink(obj, collection)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def mesh_object(name, vertices, faces, mat, collection, smooth=False):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    mesh.materials.append(mat)
    collection.objects.link(obj)
    if smooth:
        for polygon in mesh.polygons:
            polygon.use_smooth = True
    return obj


def tube_curve(name, points, radius, mat, collection):
    curve = bpy.data.curves.new(name + "Curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for idx, point in enumerate(points):
        spline.points[idx].co = (*point, 1.0)
    obj = bpy.data.objects.new(name, curve)
    curve.materials.append(mat)
    collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def move_once(obj, delta):
    if obj.get("kex_v7_expanded"):
        return
    obj.location += Vector(delta)
    obj["kex_v7_expanded"] = True


# ---------------------------------------------------------------------------
# Remove the legacy room-like shell. The consoles and controls are retained.

legacy_prefixes = (
    "KEX_Hull_",
    "MobileOccluder_",
    "KEX_ObservationPerimeter_",
    "KEX_WindowSill",
    "KEX_Window_PortCheek",
    "KEX_Window_StarboardCheek",
    "KEX_PORT_ServiceHatch_",
    "KEX_STARBOARD_ServiceHatch_",
    "KEX_PORT_VerticalTaskLight_",
    "KEX_STARBOARD_VerticalTaskLight_",
)
for obj in list(COCKPIT.objects):
    if obj.name.startswith(legacy_prefixes):
        bpy.data.objects.remove(obj, do_unlink=True)


# Expand the floor from 18.8 x 17.2 to 26.6 x 24.3: almost exactly 2x area.
floor_layout = {
    "KEX_Floor_MainPressureDeck": ((0.0, 0.0, -0.27), (26.60, 24.30, 0.54)),
    "KEX_Floor_CentralWalkway": ((0.0, -0.40, 0.055), (7.20, 19.40, 0.11)),
    "KEX_Floor_PortWing": ((-8.35, 0.0, 0.045), (9.90, 20.30, 0.09)),
    "KEX_Floor_StarboardWing": ((8.35, 0.0, 0.045), (9.90, 20.30, 0.09)),
    "KEX_Floor_PortDataRail": ((-4.00, -0.40, 0.14), (0.11, 18.20, 0.08)),
    "KEX_Floor_StarboardDataRail": ((4.00, -0.40, 0.14), (0.11, 18.20, 0.08)),
    "KEX_Floor_PortGuideLight": ((-4.23, -0.40, 0.15), (0.05, 15.40, 0.05)),
    "KEX_Floor_StarboardGuideLight": ((4.23, -0.40, 0.15), (0.05, 15.40, 0.05)),
}
for name, (location, dimensions) in floor_layout.items():
    obj = bpy.data.objects.get(name)
    if obj:
        obj.location = location
        obj.dimensions = dimensions


# Preserve control size; reposition complete stations as rigid groups.
for obj in list(COCKPIT.objects):
    name = obj.name
    if name.startswith(("KEX_V6_Command_", "KEX_V61_Command_")):
        move_once(obj, (0.0, 1.50, 0.0))
    elif "Mission_" in name:
        move_once(obj, (-2.0, 0.15, 0.0))
    elif "Engineering_" in name:
        move_once(obj, (2.0, 0.15, 0.0))
    elif name.startswith("KEX_KofteDock_"):
        move_once(obj, (0.0, -2.40, 0.0))
    elif name.startswith("KEX_ContactConsole_"):
        move_once(obj, (1.80, -1.80, 0.0))
    elif name.startswith("KEX_FloorVent_Port_"):
        move_once(obj, (-2.15, -0.40, 0.0))
    elif name.startswith("KEX_FloorVent_Starboard_"):
        move_once(obj, (2.15, -0.40, 0.0))

for obj in list(REFERENCE.objects):
    if obj.name.startswith(("REF_UI_Project", "REF_UI_Projects")):
        move_once(obj, (0.0, 1.50, 0.0))
    elif obj.name.startswith("REF_UI_Mission"):
        move_once(obj, (-2.0, 0.15, 0.0))
    elif obj.name.startswith("REF_UI_Engineering"):
        move_once(obj, (2.0, 0.15, 0.0))

socket_offsets = {
    "SOCKET_OBSERVATION_APERTURE": (0.0, 3.0, 0.0),
    "SOCKET_PROJECTS": (0.0, 1.50, 0.0),
    "ANCHOR_PROJECTS_INTERACTION": (0.0, 1.50, 0.0),
    "SOCKET_EXPERIENCE": (-2.0, 0.15, 0.0),
    "ANCHOR_EXPERIENCE_INTERACTION": (-2.0, 0.15, 0.0),
    "SOCKET_SKILLS": (2.0, 0.15, 0.0),
    "ANCHOR_SKILLS_INTERACTION": (2.0, 0.15, 0.0),
    "SOCKET_CONTACT": (1.80, -1.80, 0.0),
    "ANCHOR_CONTACT_INTERACTION": (1.80, -1.80, 0.0),
    "ANCHOR_HUB": (0.0, -2.40, 0.0),
}
for name, delta in socket_offsets.items():
    obj = bpy.data.objects.get(name)
    if obj:
        move_once(obj, delta)


# Expanded interior camera choreography.
camera_layout = {
    "KEX_CAM_Overview": ((0.0, -11.20, 5.35), (0.0, 1.55, 3.05), 24.0),
    "KEX_CAM_Hub": ((0.0, -10.10, 4.90), (0.0, -2.8, 2.0), 31.0),
    "KEX_CAM_Projects": ((0.0, -7.40, 4.35), (0.0, 7.15, 3.35), 34.0),
    "KEX_CAM_Experience": ((3.8, -1.6, 5.2), (-8.0, 0.9, 3.45), 32.0),
    "KEX_CAM_Skills": ((-3.8, -1.6, 5.2), (8.0, 0.9, 3.45), 32.0),
}
for name, (location, target, lens) in camera_layout.items():
    camera = bpy.data.objects.get(name)
    if camera:
        camera.location = location
        camera.data.lens = lens
        look_at(camera, target)


# Existing task lights follow their corresponding stations.
light_offsets = {
    "KEX_LGT_CommandTask": (0.0, 1.50, 0.0),
    "KEX_LGT_PortTask": (-2.0, 0.15, 0.0),
    "KEX_LGT_StarboardTask": (2.0, 0.15, 0.0),
    "KEX_LGT_KofteDockRim": (0.0, -2.40, 0.0),
}
for name, delta in light_offsets.items():
    light = bpy.data.objects.get(name)
    if light:
        move_once(light, delta)


# ---------------------------------------------------------------------------
# Curved pressure shell and spacecraft interior architecture.

cross_section = [
    (-13.0, 0.35), (-12.9, 3.0), (-11.4, 6.35), (-7.4, 8.15),
    (0.0, 8.75), (7.4, 8.15), (11.4, 6.35), (12.9, 3.0), (13.0, 0.35),
]
shell_vertices = []
for y in (-11.75, 10.65):
    shell_vertices.extend([(x, y, z) for x, z in cross_section])
shell_faces = []
count = len(cross_section)
for idx in range(count - 1):
    # Leave the two crown bays open. The dark service spine and structural
    # frames below them read as a spacecraft ceiling without producing the
    # overexposed white trapezoid visible in the cockpit overview.
    if idx in (3, 4):
        continue
    shell_faces.append((idx, idx + 1, count + idx + 1, count + idx))
shell = mesh_object("KEX_V7_INT_PressureShellSkin", shell_vertices, shell_faces, MAT_PRESSURE, INTERIOR)
solid = shell.modifiers.new("PressureShellThickness", "SOLIDIFY")
solid.thickness = 0.18
solid.offset = 0.0

# Structural frames make the volume read as one pressure vessel instead of a room.
for frame_idx, y in enumerate((-10.4, -7.4, -4.4, -1.4, 1.6, 4.6, 7.6, 10.45), 1):
    points = [(x, y, z) for x, z in cross_section]
    radius = 0.13 if frame_idx in (1, 8) else 0.09
    mat = MAT_FRAME if frame_idx % 2 else MAT_BRONZE
    tube_curve(f"KEX_V7_INT_PressureFrame_{frame_idx:02d}", points, radius, mat, INTERIOR)

# Service raceways and floor-edge pressure rails. The crown remains open
# between the pressure frames so the panoramic canopy owns the overhead view.
for side in (-1, 1):
    bevel_cube(f"KEX_V7_INT_CeilingRaceway_{'Port' if side < 0 else 'Starboard'}", (side * 6.2, -0.4, 7.86), (2.1, 21.0, 0.28), MAT_PANEL, rotation=(0.0, side * math.radians(10.0), 0.0), bevel=0.10)
    bevel_cube(f"KEX_V7_INT_FloorPressureRail_{'Port' if side < 0 else 'Starboard'}", (side * 12.55, -0.4, 0.50), (0.34, 22.0, 0.46), MAT_FRAME, bevel=0.12)

# Panoramic forward canopy opening aligned with the exterior canopy.
front_arch = [(x * 0.95, 10.85, max(1.05, z)) for x, z in cross_section]
tube_curve("KEX_V7_INT_CanopyPrimaryFrame", front_arch, 0.18, MAT_FRAME, INTERIOR)
bevel_cube("KEX_V7_INT_CanopyLowerSill", (0.0, 10.78, 1.02), (24.2, 0.54, 0.52), MAT_FRAME, bevel=0.15)
for x in (-7.2, 7.2):
    tube_curve(f"KEX_V7_INT_CanopyMullion_{'Port' if x < 0 else 'Starboard'}", [(x, 10.70, 1.1), (x * 0.78, 10.74, 8.1)], 0.11, MAT_BRONZE, INTERIOR)

# Port airlock and starboard service bay.
airlock = bevel_cube("KEX_V7_INT_AirlockDoor", (-12.72, -4.4, 3.05), (0.22, 3.75, 4.95), MAT_INNER_PANEL, bevel=0.13)
airlock["interaction"] = "airlock_door"
for y in (-6.45, -2.35):
    bevel_cube(f"KEX_V7_INT_AirlockFrame_H_{y:+.2f}", (-12.54, y, 3.05), (0.34, 0.25, 5.25), MAT_FRAME, bevel=0.07)
for z in (0.56, 5.54):
    bevel_cube(f"KEX_V7_INT_AirlockFrame_V_{z:.2f}", (-12.54, -4.4, z), (0.34, 4.25, 0.25), MAT_FRAME, bevel=0.07)
for stripe_idx, y in enumerate((-5.55, -4.8, -4.05, -3.30), 1):
    bevel_cube(f"KEX_V7_INT_AirlockWarning_{stripe_idx:02d}", (-12.42, y, 1.02), (0.08, 0.46, 0.10), MAT_AMBER, rotation=(0.0, 0.0, math.radians(25.0)), bevel=0.02)

bevel_cube("KEX_V7_INT_StarboardServiceBay", (12.72, -4.2, 3.0), (0.22, 4.4, 5.2), MAT_PANEL, bevel=0.13)
for idx, y in enumerate((-5.55, -4.45, -3.35, -2.25), 1):
    bevel_cube(f"KEX_V7_INT_ServiceDrawer_{idx:02d}", (12.55, y, 3.0), (0.16, 0.88, 0.82), MAT_INNER_PANEL, bevel=0.08)
    bevel_cube(f"KEX_V7_INT_ServiceDrawerState_{idx:02d}", (12.44, y, 3.0), (0.05, 0.36, 0.06), MAT_CYAN if idx < 4 else MAT_AMBER, bevel=0.015)

# Rear pressure bulkhead and docking passage.
bevel_cube("KEX_V7_INT_RearBulkheadTop", (0.0, -12.0, 7.15), (25.8, 0.45, 3.0), MAT_PRESSURE, bevel=0.18)
for side in (-1, 1):
    bevel_cube(f"KEX_V7_INT_RearBulkhead_{'Port' if side < 0 else 'Starboard'}", (side * 8.25, -12.0, 3.25), (9.1, 0.45, 5.2), MAT_PRESSURE, bevel=0.18)
door = bevel_cube("KEX_V7_INT_RearDockDoor", (0.0, -11.82, 3.15), (6.5, 0.30, 5.0), MAT_INNER_PANEL, bevel=0.55)
door["interaction"] = "rear_docking_passage"
for x in (-3.55, 3.55):
    bevel_cube(f"KEX_V7_INT_RearDoorFrame_{'L' if x < 0 else 'R'}", (x, -11.62, 3.2), (0.28, 0.24, 5.6), MAT_FRAME, bevel=0.09)

# Expanded interior lighting grid.
for idx, (location, target, energy, color) in enumerate((
    ((0.0, -5.5, 8.05), (0.0, -4.0, 0.0), 820.0, (0.70, 0.92, 1.0)),
    ((0.0, 1.0, 8.15), (0.0, 2.0, 0.0), 900.0, (0.78, 0.95, 1.0)),
    ((0.0, 7.2, 8.0), (0.0, 7.0, 1.0), 760.0, (0.88, 0.95, 1.0)),
    ((-9.5, -1.0, 6.6), (-7.5, 0.5, 1.2), 560.0, (0.35, 0.82, 1.0)),
    ((9.5, -1.0, 6.6), (7.5, 0.5, 1.2), 520.0, (1.0, 0.58, 0.30)),
), 1):
    data = bpy.data.lights.new(f"KEX_V7_INT_Light_{idx:02d}", "AREA")
    data.energy = energy
    data.color = color
    data.shape = "RECTANGLE"
    data.size = 4.0
    data.size_y = 2.0
    light = bpy.data.objects.new(data.name, data)
    light.location = location
    INTERIOR.objects.link(light)
    look_at(light, target)


# ---------------------------------------------------------------------------
# Rounded-wedge research spacecraft exterior.

sections = [
    (-18.5, 7.8, 3.75, 2.40),
    (-13.0, 10.9, 4.75, 2.65),
    (-7.0, 13.15, 5.55, 2.92),
    (2.0, 13.75, 5.85, 3.00),
    (10.0, 12.8, 5.40, 2.95),
    (16.0, 10.1, 4.55, 2.72),
    (22.0, 5.35, 2.95, 2.45),
    (25.5, 0.42, 0.42, 2.35),
]
segments = 24
vertices = []
for y, half_width, half_height, center_z in sections:
    for segment in range(segments):
        theta = 2.0 * math.pi * segment / segments
        vertices.append((half_width * math.cos(theta), y, center_z + half_height * math.sin(theta)))

hull_faces = []
canopy_faces = []
for section_idx in range(len(sections) - 1):
    for segment in range(segments):
        nxt = (segment + 1) % segments
        face = (
            section_idx * segments + segment,
            section_idx * segments + nxt,
            (section_idx + 1) * segments + nxt,
            (section_idx + 1) * segments + segment,
        )
        theta_mid = (2.0 * math.pi * (segment + 0.5) / segments) % (2.0 * math.pi)
        canopy_sector = math.radians(35.0) < theta_mid < math.radians(145.0)
        if section_idx in (2, 3, 4, 5) and canopy_sector:
            canopy_faces.append(face)
        else:
            hull_faces.append(face)
hull_faces.append(tuple(reversed(range(segments))))
hull_faces.append(tuple(range((len(sections) - 1) * segments, len(sections) * segments)))

hull = mesh_object("KEX_V7_EXT_MainPressureHull", vertices, hull_faces, MAT_GRAPHITE, EXTERIOR, smooth=True)
hull["ship_class"] = "orbital_research_explorer"
hull["interior_floor_area_multiplier"] = 2.0
hull_solid = hull.modifiers.new("HullThickness", "SOLIDIFY")
hull_solid.thickness = 0.16
hull_solid.offset = 0.0

canopy = mesh_object("KEX_V7_EXT_PanoramicCanopy", vertices, canopy_faces, MAT_GLASS, EXTERIOR, smooth=True)
canopy["interior_socket"] = "SOCKET_OBSERVATION_APERTURE"
canopy_solid = canopy.modifiers.new("CanopyThickness", "SOLIDIFY")
canopy_solid.thickness = 0.08
canopy_solid.offset = 0.0

# Canopy structural frame follows the real hull sections.
for section_idx in (2, 3, 4, 5, 6):
    y, half_width, half_height, center_z = sections[section_idx]
    points = []
    for degrees in range(35, 146, 10):
        theta = math.radians(degrees)
        points.append((half_width * math.cos(theta), y, center_z + half_height * math.sin(theta)))
    tube_curve(f"KEX_V7_EXT_CanopyArc_{section_idx:02d}", points, 0.13, MAT_WHITE_ARMOR, EXTERIOR)
for degrees in (35, 90, 145):
    points = []
    theta = math.radians(degrees)
    for section_idx in (2, 3, 4, 5, 6):
        y, half_width, half_height, center_z = sections[section_idx]
        points.append((half_width * math.cos(theta), y, center_z + half_height * math.sin(theta)))
    tube_curve(f"KEX_V7_EXT_CanopyLongeron_{degrees:03d}", points, 0.11, MAT_BRONZE, EXTERIOR)

# A continuous tapered dorsal spine replaces the old roof-like tile grid.
spine_sections = [
    (-14.0, 1.25, 7.10),
    (-7.0, 1.75, 8.18),
    (1.5, 2.10, 8.72),
    (9.0, 1.70, 8.18),
    (16.0, 0.65, 6.82),
]
spine_vertices = []
for y, half_width, z in spine_sections:
    spine_vertices.extend([(-half_width, y, z - 0.09), (half_width, y, z - 0.09), (-half_width, y, z + 0.09), (half_width, y, z + 0.09)])
spine_faces = []
for idx in range(len(spine_sections) - 1):
    a = idx * 4
    b = (idx + 1) * 4
    spine_faces.extend([
        (a + 2, a + 3, b + 3, b + 2),
        (a, b, b + 1, a + 1),
        (a, a + 2, b + 2, b),
        (a + 1, b + 1, b + 3, a + 3),
    ])
spine_faces.extend([(0, 1, 3, 2), ((len(spine_sections) - 1) * 4, (len(spine_sections) - 1) * 4 + 2, (len(spine_sections) - 1) * 4 + 3, (len(spine_sections) - 1) * 4 + 1)])
mesh_object("KEX_V7_EXT_DorsalSpine", spine_vertices, spine_faces, MAT_WHITE_ARMOR, EXTERIOR, smooth=False)
tube_curve("KEX_V7_EXT_DorsalNavigationLine", [(0.0, y, z + 0.13) for y, _, z in spine_sections], 0.045, MAT_CYAN, EXTERIOR)

for side in (-1, 1):
    side_name = "Port" if side < 0 else "Starboard"
    for idx, (y, hull_x, z) in enumerate(((-11.0, 11.75, 2.85), (-4.5, 13.25, 3.00), (3.0, 13.55, 3.05), (10.5, 12.45, 2.95)), 1):
        bevel_cube(f"KEX_V7_EXT_{side_name}Armor_{idx:02d}", (side * hull_x, y, z), (0.16, 2.45, 1.30), MAT_WHITE_ARMOR if idx in (1, 4) else MAT_BELLY, rotation=(0.0, side * math.radians(11.0), 0.0), bevel=0.10, collection=EXTERIOR)

# Delta radiator/wing roots.
for side in (-1, 1):
    inner = side * 10.7
    outer = side * 19.2
    z_low, z_high = 1.25, 1.55
    verts = [
        (inner, -13.0, z_low), (outer, -9.0, z_low), (outer, -1.5, z_low), (inner, 1.0, z_low),
        (inner, -13.0, z_high), (outer, -9.0, z_high), (outer, -1.5, z_high), (inner, 1.0, z_high),
    ]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    wing = mesh_object(f"KEX_V7_EXT_{'Port' if side < 0 else 'Starboard'}RadiatorWing", verts, faces, MAT_BELLY, EXTERIOR)
    wing["function"] = "thermal_radiator_and_attitude_surface"
    wing_outline = [
        (inner, -13.0, z_high + 0.08),
        (outer, -9.0, z_high + 0.08),
        (outer, -1.5, z_high + 0.08),
        (inner, 1.0, z_high + 0.08),
        (inner, -13.0, z_high + 0.08),
    ]
    tube_curve(
        f"KEX_V7_EXT_{'Port' if side < 0 else 'Starboard'}RadiatorOutline",
        wing_outline,
        0.11,
        MAT_WHITE_ARMOR,
        EXTERIOR,
    )
    for strip_idx, x_factor in enumerate((0.28, 0.52, 0.76), 1):
        x = inner + (outer - inner) * x_factor
        bevel_cube(f"KEX_V7_EXT_{'P' if side < 0 else 'S'}RadiatorStrip_{strip_idx:02d}", (x, -5.8, z_high + 0.05), (0.12, 6.2, 0.06), MAT_CYAN, rotation=(0.0, 0.0, side * math.radians(-8.0)), bevel=0.02, collection=EXTERIOR)

# Twin primary engines and a smaller cruise core.
for idx, x in enumerate((-5.6, 5.6), 1):
    cylinder(f"KEX_V7_EXT_EngineHousing_{idx:02d}", (x, -18.3, 2.55), 2.05, 3.1, MAT_GRAPHITE, (math.radians(90.0), 0.0, 0.0), 28)
    cylinder(f"KEX_V7_EXT_EngineNozzle_{idx:02d}", (x, -19.78, 2.55), 1.48, 0.80, MAT_RUBBER, (math.radians(90.0), 0.0, 0.0), 28)
    cylinder(f"KEX_V7_EXT_EngineGlow_{idx:02d}", (x, -20.21, 2.55), 1.12, 0.12, MAT_ENGINE, (math.radians(90.0), 0.0, 0.0), 28)
    for vane_idx, degrees in enumerate((0, 90, 180, 270), 1):
        theta = math.radians(degrees)
        bevel_cube(f"KEX_V7_EXT_EngineVane_{idx:02d}_{vane_idx:02d}", (x + math.cos(theta) * 1.52, -20.05, 2.55 + math.sin(theta) * 1.52), (0.16, 0.65, 0.72), MAT_BRONZE, rotation=(0.0, 0.0, theta), bevel=0.05, collection=EXTERIOR)

cylinder("KEX_V7_EXT_CruiseCoreHousing", (0.0, -18.7, 1.2), 1.15, 2.4, MAT_BELLY, (math.radians(90.0), 0.0, 0.0), 24)
cylinder("KEX_V7_EXT_CruiseCoreGlow", (0.0, -19.93, 1.2), 0.66, 0.10, MAT_ENGINE, (math.radians(90.0), 0.0, 0.0), 24)

# Rear docking collar.
bpy.ops.mesh.primitive_torus_add(major_radius=1.85, minor_radius=0.22, major_segments=32, minor_segments=10, location=(0.0, -18.72, 4.35), rotation=(math.radians(90.0), 0.0, 0.0))
dock_ring = bpy.context.object
dock_ring.name = "KEX_V7_EXT_RearDockingRing"
dock_ring.data.materials.append(MAT_WHITE_ARMOR)
relink(dock_ring, EXTERIOR)
cylinder("KEX_V7_EXT_RearDockingDoor", (0.0, -18.75, 4.35), 1.60, 0.34, MAT_PANEL, (math.radians(90.0), 0.0, 0.0), 32)

# Attitude-control pods, navigation lamps and sensor mast.
for side in (-1, 1):
    side_name = "P" if side < 0 else "S"
    cylinder(f"KEX_V7_EXT_RCSHousing_{side_name}", (side * 12.65, 10.8, 2.8), 0.68, 1.25, MAT_BELLY, (0.0, math.radians(90.0), 0.0), 20)
    cylinder(f"KEX_V7_EXT_RCSGlow_{side_name}", (side * 13.32, 10.8, 2.8), 0.34, 0.08, MAT_RCS, (0.0, math.radians(90.0), 0.0), 16)
    sphere(f"KEX_V7_EXT_NavLamp_{side_name}", (side * 12.50, 12.0, 4.2), (0.24, 0.24, 0.24), MAT_RED if side < 0 else bpy.data.materials["KEX_MAT_GreenEmission"])

cylinder("KEX_V7_EXT_SensorMast", (0.0, 0.3, 9.35), 0.18, 1.25, MAT_FRAME, vertices=16)
sphere("KEX_V7_EXT_SensorHead", (0.0, 0.3, 10.10), (1.25, 0.72, 0.44), MAT_WHITE_ARMOR)
cylinder("KEX_V7_EXT_SensorLens", (0.0, 0.70, 10.10), 0.22, 0.16, MAT_CYAN, (math.radians(90.0), 0.0, 0.0), 16)

# Exterior airlock interface aligned with the interior port door.
bevel_cube("KEX_V7_EXT_PortAirlockOuterDoor", (-13.48, -4.4, 3.05), (0.30, 3.9, 5.05), MAT_WHITE_ARMOR, bevel=0.18, collection=EXTERIOR)
for idx, y in enumerate((-5.65, -4.82, -3.98, -3.15), 1):
    bevel_cube(f"KEX_V7_EXT_AirlockChevron_{idx:02d}", (-13.66, y, 1.10), (0.06, 0.48, 0.13), MAT_AMBER, rotation=(0.0, 0.0, math.radians(25.0)), bevel=0.02, collection=EXTERIOR)

# Hull identification plaques.
def exterior_text(name, body, location, rotation, size, mat):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.resolution_u = 2
    obj.data.extrude = 0.016
    obj.data.bevel_depth = 0.004
    obj.data.bevel_resolution = 0
    obj.data.materials.append(mat)
    relink(obj, EXTERIOR)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj

exterior_text("KEX_V7_EXT_DorsalShipName", "KOFTE EXPLORER  07", (0.0, -4.0, 8.34), (0.0, 0.0, 0.0), 0.50, MAT_WHITE_ARMOR)


# Exterior lighting rig.
sun_data = bpy.data.lights.new("KEX_V7_EXT_Sun", "SUN")
sun_data.energy = 3.8
sun_data.angle = math.radians(8.0)
sun = bpy.data.objects.new(sun_data.name, sun_data)
sun.rotation_euler = (math.radians(28.0), math.radians(-18.0), math.radians(-32.0))
EXT_LIGHTS.objects.link(sun)

for idx, (location, target, energy, color, size) in enumerate((
    ((18.0, -12.0, 20.0), (0.0, 0.0, 2.5), 2600.0, (0.72, 0.90, 1.0), 14.0),
    ((-20.0, 8.0, 10.0), (0.0, 1.0, 3.0), 1900.0, (0.18, 0.58, 1.0), 12.0),
    ((4.0, -22.0, 3.0), (0.0, -7.0, 2.0), 1600.0, (1.0, 0.30, 0.08), 9.0),
), 1):
    data = bpy.data.lights.new(f"KEX_V7_EXT_Area_{idx:02d}", "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(data.name, data)
    light.location = location
    EXT_LIGHTS.objects.link(light)
    look_at(light, target)


# Exterior camera suite.
def create_camera(name, location, target, lens):
    data = bpy.data.cameras.new(name + "Data")
    data.lens = lens
    data.sensor_width = 36.0
    camera = bpy.data.objects.new(name, data)
    camera.location = location
    EXT_CAMERAS.objects.link(camera)
    look_at(camera, target)
    return camera


create_camera("KEX_CAM_ExteriorHero", (58.0, 76.0, 34.0), (0.0, 1.5, 3.0), 54.0)
create_camera("KEX_CAM_ExteriorNose", (0.0, 84.0, 16.0), (0.0, 3.5, 2.8), 58.0)
create_camera("KEX_CAM_ExteriorOrbit", (-72.0, 29.0, 40.0), (0.0, 0.0, 3.0), 58.0)


# Exterior-only Earth backdrop, sharing the authored 4K Earth materials.
for source_name in ("REF_EarthVista_4K", "REF_EarthAtmosphere", "REF_EarthClouds"):
    source = bpy.data.objects.get(source_name)
    if source:
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        duplicate.name = "KEX_V7_EXT_" + source_name.replace("REF_", "")
        duplicate.hide_render = False
        duplicate.hide_set(False)
        # Aligned behind the front three-quarter hero camera, with a small
        # upward offset so the full orbital body reads without touching hull.
        duplicate.location = (-38.0, -52.0, -8.0)
        duplicate.scale = source.scale * 2.65
        EXT_REFERENCE.objects.link(duplicate)


# ---------------------------------------------------------------------------
# Optimized interior/exterior export batches.

def rebuild_batches(target_collection, source_objects, prefix):
    for obj in list(target_collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    groups = {}
    for src in source_objects:
        if src.type != "MESH" or src.hide_render:
            continue
        evaluated = src.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
        duplicate = bpy.data.objects.new("__KEX_BATCH_SOURCE__" + src.name, mesh)
        duplicate.matrix_world = src.matrix_world.copy()
        mat = src.data.materials[0] if src.data.materials else MAT_PANEL
        mesh.materials.clear()
        mesh.materials.append(mat)
        target_collection.objects.link(duplicate)
        groups.setdefault(mat.name, []).append(duplicate)
    batches = []
    for mat_name, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
            joined = bpy.context.object
        else:
            joined = objects[0]
        joined.name = prefix + mat_name.replace("KEX_MAT_", "")
        joined["source_material"] = mat_name
        joined["optimized_batch"] = True
        joined.hide_set(True)
        joined.hide_render = True
        batches.append(joined)
    return batches


interior_sources = [o for o in COCKPIT.objects if o.type == "MESH"] + [o for o in INTERIOR.objects if o.type == "MESH"]
exterior_sources = [o for o in EXTERIOR.objects if o.type == "MESH"]
interior_batches = rebuild_batches(EXPORT_INTERIOR, interior_sources, "KEX_EXPORT_INT_")
exterior_batches = rebuild_batches(EXPORT_EXTERIOR, exterior_sources, "KEX_EXPORT_EXT_")


def triangle_count(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        total += sum(len(poly.vertices) - 2 for poly in evaluated.data.polygons)
    return total


# Default authoring state stays interior-safe; exterior render mode toggles it.
EXTERIOR.hide_render = True
EXT_REFERENCE.hide_render = True
EXT_LIGHTS.hide_render = True
INTERIOR.hide_render = False
for source_name in ("REF_EarthVista_4K", "REF_EarthAtmosphere", "REF_EarthClouds"):
    source = bpy.data.objects.get(source_name)
    if source:
        source.hide_render = False
SCENE.camera = bpy.data.objects["KEX_CAM_Overview"]
SCENE.frame_set(26)
SCENE["kex_cockpit_version"] = "7.0.0-mcp-research-spacecraft"
SCENE["kex_floor_area_original"] = 18.8 * 17.2
SCENE["kex_floor_area_v7"] = 26.6 * 24.3
SCENE["kex_ship_class"] = "Kofte Explorer orbital research vessel"

bpy.ops.wm.save_as_mainfile(filepath="/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/kofte-explorer.blend")
result = {
    "version": SCENE["kex_cockpit_version"],
    "floor_area_multiplier": round(SCENE["kex_floor_area_v7"] / SCENE["kex_floor_area_original"], 3),
    "interior_source_meshes": len(interior_sources),
    "exterior_source_meshes": len(exterior_sources),
    "interior_triangles": triangle_count(interior_sources),
    "exterior_triangles": triangle_count(exterior_sources),
    "interior_batches": len(interior_batches),
    "exterior_batches": len(exterior_batches),
    "exterior_cameras": [o.name for o in EXT_CAMERAS.objects if o.type == "CAMERA"],
    "saved": not bpy.data.is_dirty,
}
'''


RENDER_CODE = r'''
import bpy
import os

scene = bpy.context.scene
camera_name = __CAMERA_NAME__
output_path = __OUTPUT_PATH__
exterior_mode = __EXTERIOR_MODE__

exterior = bpy.data.collections.get("17_V7_EXTERIOR_HULL")
ext_reference = bpy.data.collections.get("18_V7_EXTERIOR_REFERENCE")
ext_lights = bpy.data.collections.get("70_V7_EXTERIOR_LIGHTING")
interior = bpy.data.collections.get("16_V7_INTERIOR_PRESSURE")
if exterior:
    exterior.hide_render = not exterior_mode
if ext_reference:
    # The Earth is a deliberate hero/nose backdrop. Keeping it out of the
    # rear engineering angle prevents the sunlit limb from reading as a
    # disconnected orange object behind the engines.
    ext_reference.hide_render = not (exterior_mode and camera_name != "KEX_CAM_ExteriorOrbit")
if ext_lights:
    ext_lights.hide_render = not exterior_mode
if interior:
    interior.hide_render = False

# The authored interior Earth remains visible through the cockpit canopy.
# Exterior shots use the larger, purpose-positioned duplicate only; hiding
# these originals prevents two Earth spheres from intersecting in camera.
for source_name in ("REF_EarthVista_4K", "REF_EarthAtmosphere", "REF_EarthClouds"):
    source = bpy.data.objects.get(source_name)
    if source:
        source.hide_render = exterior_mode

camera = bpy.data.objects.get(camera_name)
if camera is None:
    raise RuntimeError("Camera not found: " + camera_name)
scene.camera = camera
scene.frame_set(26)
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.filepath = output_path
bpy.ops.render.render(write_still=True)
result = {"camera": camera_name, "path": output_path, "exterior": exterior_mode, "exists": os.path.exists(output_path)}
'''


INSPECT_CODE = r'''
import bpy
import os
scene = bpy.context.scene
floor = bpy.data.objects.get("KEX_Floor_MainPressureDeck")
legacy_prefixes = (
    "KEX_Hull_", "MobileOccluder_", "KEX_ObservationPerimeter_",
    "KEX_WindowSill", "KEX_Window_PortCheek", "KEX_Window_StarboardCheek",
)
result = {
    "file": bpy.data.filepath,
    "version": scene.get("kex_cockpit_version"),
    "ship_class": scene.get("kex_ship_class"),
    "floor_area_multiplier": round(scene.get("kex_floor_area_v7", 0.0) / scene.get("kex_floor_area_original", 1.0), 3),
    "interior_objects": len(bpy.data.collections.get("16_V7_INTERIOR_PRESSURE").objects),
    "exterior_objects": len(bpy.data.collections.get("17_V7_EXTERIOR_HULL").objects),
    "interior_batches": len(bpy.data.collections.get("KEX_EXPORT_GEOMETRY").objects),
    "exterior_batches": len(bpy.data.collections.get("KEX_EXPORT_EXTERIOR_GEOMETRY").objects),
    "missing_files": [img.filepath for img in bpy.data.images if img.source == "FILE" and img.filepath and not os.path.exists(bpy.path.abspath(img.filepath))],
    "floor_dimensions": [round(value, 3) for value in floor.dimensions] if floor else None,
    "legacy_room_shells": [obj.name for obj in bpy.data.objects if obj.name.startswith(legacy_prefixes)],
    "active_camera": scene.camera.name if scene.camera else None,
    "exterior_hidden_by_default": bpy.data.collections.get("17_V7_EXTERIOR_HULL").hide_render,
    "original_earth_visible": all(not bpy.data.objects[name].hide_render for name in ("REF_EarthVista_4K", "REF_EarthAtmosphere", "REF_EarthClouds") if name in bpy.data.objects),
    "dirty": bpy.data.is_dirty,
}
'''


def call(code: str) -> dict:
    command = [os.path.join(os.path.dirname(__file__), "../../blender_mcp/mcp/.venv/bin/blender-mcp")]
    with MCPClient(command) as client:
        client.initialize()
        response = client.call_tool("execute_blender_code", {"code": code})
        return response.get("structuredContent", response)


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "build"
    if mode == "build":
        result = call(BLENDER_CODE)
    elif mode == "inspect":
        result = call(INSPECT_CODE)
    elif mode.startswith("render-"):
        render_modes = {
            "render-interior": ("KEX_CAM_Overview", "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v70-interior-overview.png", False),
            "render-projects": ("KEX_CAM_Projects", "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v70-projects.png", False),
            "render-exterior": ("KEX_CAM_ExteriorHero", "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v70-exterior-hero.png", True),
            "render-nose": ("KEX_CAM_ExteriorNose", "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v70-exterior-nose.png", True),
            "render-orbit": ("KEX_CAM_ExteriorOrbit", "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v70-exterior-orbit.png", True),
        }
        camera, output, exterior = render_modes[mode]
        code = RENDER_CODE.replace("__CAMERA_NAME__", repr(camera)).replace("__OUTPUT_PATH__", repr(output)).replace("__EXTERIOR_MODE__", repr(exterior))
        result = call(code)
    else:
        raise SystemExit(f"Unknown mode: {mode}")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
