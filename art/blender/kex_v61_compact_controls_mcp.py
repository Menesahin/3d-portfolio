"""Rebuild KEX V6 cockpit controls through the live Blender MCP connection.

This is intentionally an MCP orchestration script, not an asset generator. The
authoritative geometry is created and saved inside the open Blender workspace.
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
COCKPIT = bpy.data.collections.get("10_COCKPIT")
REFERENCE = bpy.data.collections.get("00_REFERENCE")
EXPORT = bpy.data.collections.get("KEX_EXPORT_GEOMETRY")

if COCKPIT is None or REFERENCE is None or EXPORT is None:
    raise RuntimeError("Expected KEX cockpit collections are missing")


def relink(obj, collection):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def material(name, base, metallic=0.0, roughness=0.45, emission=None, strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.2 if metallic else 0.08
    if emission is not None:
        key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[key].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


MAT_PANEL = bpy.data.materials["KEX_MAT_Panel"]
MAT_RUBBER = bpy.data.materials["KEX_MAT_Rubber"]
MAT_BRONZE = bpy.data.materials["KEX_MAT_BronzeHardware"]
MAT_CREAM = bpy.data.materials["KEX_MAT_CreamStructure"]
MAT_CYAN = bpy.data.materials["KEX_MAT_CyanEmission"]
MAT_AMBER = bpy.data.materials["KEX_MAT_AmberEmission"]
MAT_WHITE = bpy.data.materials["KEX_MAT_CreamEmission"]
MAT_RED = material("KEX_MAT_RedEmission", (0.18, 0.012, 0.008), 0.12, 0.28, (1.0, 0.035, 0.018), 4.2)
MAT_GREEN = material("KEX_MAT_GreenEmission", (0.006, 0.12, 0.06), 0.08, 0.3, (0.02, 1.0, 0.32), 3.4)
MAT_STEEL = material("KEX_MAT_ControlSteel", (0.12, 0.15, 0.16), 0.78, 0.24)
MAT_IVORY = material("KEX_MAT_LeverIvory", (0.76, 0.65, 0.44), 0.08, 0.24, (1.0, 0.68, 0.26), 0.45)
MAT_SAFETY_RED = material("KEX_MAT_SafetyRed", (0.38, 0.018, 0.012), 0.52, 0.28)
MAT_SAFETY_AMBER = material("KEX_MAT_SafetyAmber", (0.36, 0.16, 0.018), 0.48, 0.30)


# Remove the oversized V6 controls and any previous V6.1 pass. Hull, decks,
# screen binnacles and structural console bodies remain untouched.
delete_prefixes = (
    "KEX_V61_",
    "KEX_V6_Command_Selector_",
    "KEX_V6_Command_SelectorState_",
    "KEX_V6_Command_SelectorBay",
    "KEX_V6_Command_DOCKING_",
    "KEX_V6_Command_THROTTLE_",
    "KEX_V6_CTRL_",
    "KEX_V6_Telemetry_",
    "KEX_V6_Mission_Control_",
    "KEX_V6_Mission_ModeEncoder",
    "KEX_V6_Engineering_Control_",
    "KEX_V6_Engineering_ModeEncoder",
    "REF_UI_ControlLabel_",
    "REF_UI_Projects_Selector_",
    "REF_UI_Projects_SelectorLight_",
)
for obj in list(bpy.data.objects):
    if obj.name.startswith(delete_prefixes):
        bpy.data.objects.remove(obj, do_unlink=True)
for action in list(bpy.data.actions):
    if action.name.startswith("KEX_V61_OrbitalLever_PivotAction") and action.users == 0:
        bpy.data.actions.remove(action)


def bevel_cube(name, location, dimensions, mat, rotation=(0.0, 0.0, 0.0), bevel=0.035, collection=COCKPIT):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.0:
        mod = obj.modifiers.new("EdgeSoftening", "BEVEL")
        mod.width = bevel
        mod.segments = 2
    obj.data.materials.append(mat)
    relink(obj, collection)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0.0, 0.0, 0.0), vertices=12, collection=COCKPIT):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    relink(obj, collection)
    bevel = obj.modifiers.new("EdgeSoftening", "BEVEL")
    bevel.width = min(radius * 0.13, depth * 0.18)
    bevel.segments = 2
    return obj


def sphere(name, location, dimensions, mat, collection=COCKPIT):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    relink(obj, collection)
    return obj


CENTRAL_PITCH = math.atan(0.7 / 2.45)
SIDE_PITCH = math.atan(0.68 / 1.95)


def central_pose(x, y, lift=0.0):
    # x/y are local coordinates on the command deck.
    return (x, 5.05 + y, 1.37 + (0.7 / 2.45) * y + lift), (CENTRAL_PITCH, 0.0, 0.0)


def side_pose(side, x, y, lift=0.0):
    # x follows the long axis of each wraparound console; y points toward its MFD.
    angle = math.radians(70.0 if side == "Mission" else -70.0)
    cx = -5.8935 if side == "Mission" else 5.8935
    cy = 0.5199
    wx = cx + math.cos(angle) * x - math.sin(angle) * y
    wy = cy + math.sin(angle) * x + math.cos(angle) * y
    wz = 1.44 + (0.68 / 1.95) * y + lift
    return (wx, wy, wz), (SIDE_PITCH, 0.0, angle)


def panel(name, pose_fn, x, y, width, height):
    location, rotation = pose_fn(x, y, 0.035)
    return bevel_cube(name, location, (width, height, 0.075), MAT_PANEL, rotation, 0.05)


def push_button(name, pose_fn, x, y, color, size=0.16, active=False, legend=""):
    """Raised tactile key with a visible travel gap and illuminated legend."""
    width = max(0.30, size * 1.85)
    height = max(0.23, size * 1.42)
    rotation = pose_fn(x, y, 0.0)[1]
    well_location, _ = pose_fn(x, y, 0.065)
    bevel_cube(name + "_Well", well_location, (width + 0.09, height + 0.09, 0.075), MAT_RUBBER, rotation, 0.034)
    collar_location, _ = pose_fn(x, y, 0.105)
    bevel_cube(name + "_Collar", collar_location, (width + 0.035, height + 0.035, 0.055), MAT_PANEL, rotation, 0.028)
    cap_location, _ = pose_fn(x, y, 0.165)
    cap_mat = color if active else MAT_STEEL
    cap = bevel_cube(name + "_Keycap", cap_location, (width, height, 0.115), cap_mat, rotation, 0.040)
    cap["interaction"] = "momentary_push"
    cap["travel_mm"] = 3.5
    face_location, _ = pose_fn(x, y + 0.012, 0.228)
    bevel_cube(name + "_Face", face_location, (width - 0.055, height - 0.055, 0.018), MAT_PANEL, rotation, 0.022)
    strip_location, _ = pose_fn(x, y - height * 0.39, 0.242)
    bevel_cube(name + "_StateStrip", strip_location, (width * 0.56, 0.028, 0.018), color, rotation, 0.006)
    if legend:
        label(name + "_Legend", pose_fn, legend, x, y + 0.018, min(0.052, width * 0.16), color, lift=0.247)
    return cap


def rocker(name, pose_fn, x, y, color, state=1, legend=""):
    """Two-position tactile rocker with a raised paddle and labeled state."""
    location, rotation = pose_fn(x, y, 0.070)
    bevel_cube(name + "_Well", location, (0.37, 0.27, 0.082), MAT_RUBBER, rotation, 0.034)
    recess_location, _ = pose_fn(x, y, 0.108)
    bevel_cube(name + "_Recess", recess_location, (0.30, 0.20, 0.045), MAT_PANEL, rotation, 0.025)
    top_location, _ = pose_fn(x, y + (0.020 if state else -0.020), 0.165)
    top_rotation = (rotation[0] + math.radians(8.0 if state else -8.0), rotation[1], rotation[2])
    paddle = bevel_cube(name + "_Paddle", top_location, (0.28, 0.16, 0.105), MAT_STEEL, top_rotation, 0.030)
    paddle["interaction"] = "two_position_rocker"
    state_location, _ = pose_fn(x, y - 0.125, 0.222)
    bevel_cube(name + "_StateStrip", state_location, (0.15, 0.030, 0.020), color, rotation, 0.006)
    if legend:
        label(name + "_Legend", pose_fn, legend, x, y - 0.205, 0.046, color, lift=0.145)
    return paddle


def rotary(name, pose_fn, x, y, color, scale=1.0):
    location, rotation = pose_fn(x, y, 0.078)
    cylinder(name + "_Ring", location, 0.19 * scale, 0.065, MAT_BRONZE, rotation, vertices=16)
    knob_location, _ = pose_fn(x, y, 0.145)
    cylinder(name + "_Knob", knob_location, 0.13 * scale, 0.13, MAT_STEEL, rotation, vertices=12)
    mark_location, _ = pose_fn(x, y - 0.085 * scale, 0.22)
    bevel_cube(name + "_Pointer", mark_location, (0.026, 0.10 * scale, 0.026), color, rotation, 0.008)


def status_led(name, pose_fn, x, y, color, radius=0.032):
    location, rotation = pose_fn(x, y, 0.09)
    cylinder(name + "_Socket", location, radius + 0.020, 0.04, MAT_RUBBER, rotation, vertices=10)
    cap_location, _ = pose_fn(x, y, 0.122)
    cylinder(name + "_Lens", cap_location, radius, 0.025, color, rotation, vertices=10)


def guarded_master_power(name, pose_fn, x, y):
    """Compact aerospace-style master rocker with an open safety cover."""
    bezel_location, surface_rotation = pose_fn(x, y, 0.075)
    bezel = bevel_cube(name + "_Bezel", bezel_location, (0.46, 0.58, 0.085), MAT_RUBBER, surface_rotation, 0.045)
    bezel["interaction"] = "master_power_guard"
    bezel["control_state"] = "armed"

    recess_location, _ = pose_fn(x, y - 0.01, 0.125)
    bevel_cube(name + "_Recess", recess_location, (0.33, 0.43, 0.045), MAT_PANEL, surface_rotation, 0.025)

    rocker_location, _ = pose_fn(x, y - 0.05, 0.175)
    rocker_rotation = (surface_rotation[0] + math.radians(-7.0), surface_rotation[1], surface_rotation[2])
    bevel_cube(name + "_PowerRocker", rocker_location, (0.22, 0.27, 0.09), MAT_STEEL, rocker_rotation, 0.028)
    state_location, _ = pose_fn(x, y - 0.14, 0.235)
    bevel_cube(name + "_PowerState", state_location, (0.13, 0.045, 0.025), MAT_AMBER, surface_rotation, 0.008)

    # Compose the cover in the local surface frame so its hinge follows the
    # sloped and rotated Engineering deck correctly.
    base_q = Euler(surface_rotation).to_quaternion()
    cover_q = base_q @ Euler((math.radians(-56.0), 0.0, 0.0)).to_quaternion()
    hinge_location = Vector(pose_fn(x, y + 0.24, 0.18)[0])
    cover_location = hinge_location + cover_q @ Vector((0.0, -0.22, 0.0))
    cover_rotation = cover_q.to_euler()
    cover = bevel_cube(name + "_SafetyCover", cover_location, (0.38, 0.44, 0.055), MAT_SAFETY_RED, cover_rotation, 0.035)
    cover["interaction"] = "master_power_cover"
    cover["hinge_angle_degrees"] = 56.0

    inset_location = cover_location + cover_q @ Vector((0.0, -0.03, 0.036))
    bevel_cube(name + "_CoverInset", inset_location, (0.27, 0.26, 0.018), MAT_RUBBER, cover_rotation, 0.018)
    stripe_location = cover_location + cover_q @ Vector((0.0, -0.12, 0.048))
    bevel_cube(name + "_WarningStripe", stripe_location, (0.24, 0.045, 0.018), MAT_WHITE, cover_rotation, 0.008)

    hinge_q = base_q @ Euler((0.0, math.radians(90.0), 0.0)).to_quaternion()
    cylinder(name + "_Hinge", hinge_location, 0.042, 0.43, MAT_BRONZE, hinge_q.to_euler(), vertices=14)
    for dx in (-0.23, 0.23):
        barrel_location = hinge_location + base_q @ Vector((dx, 0.0, 0.0))
        cylinder(name + ("_HingeL" if dx < 0 else "_HingeR"), barrel_location, 0.065, 0.09, MAT_STEEL, hinge_q.to_euler(), vertices=14)
    return bezel


def compact_guarded_switch(name, pose_fn, x, y, cover_mat, state_mat):
    """Small rectangular guarded switch with no stem or spherical cap."""
    surface_location, surface_rotation = pose_fn(x, y, 0.07)
    bezel = bevel_cube(name + "_Bezel", surface_location, (0.34, 0.42, 0.075), MAT_RUBBER, surface_rotation, 0.035)
    bezel["interaction"] = "guarded_rectangular_switch"

    recess_location, _ = pose_fn(x, y - 0.01, 0.115)
    bevel_cube(name + "_Recess", recess_location, (0.25, 0.31, 0.035), MAT_PANEL, surface_rotation, 0.022)
    paddle_location, _ = pose_fn(x, y - 0.04, 0.16)
    paddle_rotation = (surface_rotation[0] + math.radians(-6.0), surface_rotation[1], surface_rotation[2])
    bevel_cube(name + "_Paddle", paddle_location, (0.16, 0.20, 0.075), MAT_STEEL, paddle_rotation, 0.022)

    base_q = Euler(surface_rotation).to_quaternion()
    cover_q = base_q @ Euler((math.radians(-50.0), 0.0, 0.0)).to_quaternion()
    hinge_location = Vector(pose_fn(x, y + 0.16, 0.15)[0])
    cover_location = hinge_location + cover_q @ Vector((0.0, -0.15, 0.0))
    cover_rotation = cover_q.to_euler()
    cover = bevel_cube(name + "_SafetyCover", cover_location, (0.29, 0.30, 0.045), cover_mat, cover_rotation, 0.028)
    cover["hinge_angle_degrees"] = 50.0
    inset_location = cover_location + cover_q @ Vector((0.0, -0.02, 0.031))
    bevel_cube(name + "_CoverInset", inset_location, (0.20, 0.17, 0.014), MAT_RUBBER, cover_rotation, 0.014)

    hinge_q = base_q @ Euler((0.0, math.radians(90.0), 0.0)).to_quaternion()
    cylinder(name + "_Hinge", hinge_location, 0.032, 0.32, MAT_BRONZE, hinge_q.to_euler(), vertices=12)
    state_location, _ = pose_fn(x, y - 0.25, 0.13)
    bevel_cube(name + "_State", state_location, (0.12, 0.035, 0.022), state_mat, surface_rotation, 0.007)
    return bezel


def label(name, pose_fn, body, x, y, size=0.11, mat=MAT_WHITE, lift=0.145):
    location, rotation = pose_fn(x, y, lift)
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.resolution_u = 2
    obj.data.extrude = 0.006
    obj.data.bevel_depth = 0.003
    obj.data.bevel_resolution = 0
    obj.data.materials.append(mat)
    relink(obj, COCKPIT)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return obj


# ---------------------------------------------------------------------------
# Central flight/command console: one mechanical hero control, several compact
# instrument islands, and many small controls instead of four large selectors.

panel("KEX_V61_Command_NavPanel", central_pose, -4.70, 0.02, 2.10, 1.48)
panel("KEX_V61_Command_FlightPanel", central_pose, -2.25, 0.02, 1.85, 1.48)
panel("KEX_V61_Command_DriveGatePanel", central_pose, 0.0, -0.28, 1.00, 0.90)
panel("KEX_V61_Command_SystemsPanel", central_pose, 1.95, 0.02, 1.90, 1.48)
panel("KEX_V61_Command_CommsPanel", central_pose, 4.55, 0.02, 2.45, 1.48)

# NAV: six route keys and one compact confirmation strip.
command_nav_legends = ("ORB", "DOCK", "HOLD", "AUTO", "HOME", "BACK")
for row in range(2):
    for col in range(3):
        idx = row * 3 + col + 1
        push_button(
            f"KEX_V61_Command_NAV_Key_{idx:02d}", central_pose,
            -5.20 + col * 0.50, -0.22 + row * 0.42,
            MAT_GREEN if idx == 5 else MAT_CYAN, 0.14, idx in (2, 5), command_nav_legends[idx - 1],
        )
for idx, x in enumerate((-5.15, -4.70, -4.25), 1):
    status_led(f"KEX_V61_Command_NAV_State_{idx:02d}", central_pose, x, -0.57, (MAT_GREEN, MAT_CYAN, MAT_AMBER)[idx - 1])

# FLIGHT: mode switches paired with their own trim encoders.
for idx, x in enumerate((-2.62, -1.88), 1):
    rocker(f"KEX_V61_Command_FLT_Rocker_{idx:02d}", central_pose, x, 0.16, MAT_CYAN if idx == 1 else MAT_AMBER, idx % 2, ("PIT", "YAW")[idx - 1])
    rotary(f"KEX_V61_Command_FLT_Trim_{idx:02d}", central_pose, x, -0.31, MAT_CYAN if idx == 1 else MAT_GREEN, 0.68)
for idx, x in enumerate((-2.75, -2.42, -2.09, -1.76), 1):
    status_led(f"KEX_V61_Command_FLT_State_{idx:02d}", central_pose, x, -0.58, (MAT_GREEN, MAT_CYAN, MAT_AMBER, MAT_GREEN)[idx - 1], 0.026)

# SYSTEMS: a normal route rocker and a separately guarded critical path.
rocker("KEX_V61_Command_SYS_Route", central_pose, 1.62, 0.18, MAT_AMBER, 1, "AUX")
compact_guarded_switch("KEX_V61_Command_SYS_Critical", central_pose, 2.28, 0.18, MAT_SAFETY_RED, MAT_RED)
for idx, x in enumerate((1.62, 2.28), 1):
    rotary(f"KEX_V61_Command_SYS_Trim_{idx:02d}", central_pose, x, -0.31, MAT_CYAN if idx == 1 else MAT_GREEN, 0.68)
for idx, x in enumerate((1.52, 1.95, 2.38), 1):
    status_led(f"KEX_V61_Command_SYS_State_{idx:02d}", central_pose, x, -0.58, (MAT_GREEN, MAT_AMBER, MAT_RED)[idx - 1], 0.026)

# COMMS: six frequency keys and two selector dials.
command_com_legends = ("CH1", "CH2", "CH3", "TX", "MUTE", "LINK")
for row in range(2):
    for col in range(3):
        idx = row * 3 + col + 1
        push_button(
            f"KEX_V61_Command_COM_Key_{idx:02d}", central_pose,
            3.65 + col * 0.46, -0.21 + row * 0.42,
            MAT_CYAN, 0.14, idx in (1, 6), command_com_legends[idx - 1],
        )
for idx, x in enumerate((5.18, 5.64), 1):
    rotary(f"KEX_V61_Command_COM_Dial_{idx:02d}", central_pose, x, 0.02, MAT_CYAN if idx == 1 else MAT_AMBER, 0.62)
for idx, x in enumerate((3.72, 4.10, 4.48, 5.20, 5.58), 1):
    status_led(f"KEX_V61_Command_COM_State_{idx:02d}", central_pose, x, -0.58, (MAT_GREEN, MAT_CYAN, MAT_GREEN, MAT_AMBER, MAT_CYAN)[idx - 1], 0.026)

label("KEX_V61_Command_Label_NAV", central_pose, "NAV / AP", -4.70, 0.60, 0.11, MAT_CYAN)
label("KEX_V61_Command_Label_FLIGHT", central_pose, "FLIGHT", -2.25, 0.60, 0.11, MAT_WHITE)
label("KEX_V61_Command_Label_DRIVE", central_pose, "DRIVE", 0.0, -0.72, 0.09, MAT_AMBER)
label("KEX_V61_Command_Label_SYSTEMS", central_pose, "SYSTEMS", 1.95, 0.60, 0.11, MAT_WHITE)
label("KEX_V61_Command_Label_COMMS", central_pose, "COMMS / LINK", 4.55, 0.60, 0.11, MAT_CYAN)


# Compact orbital-drive pull lever. It keeps a real pivot hierarchy and stays
# below the main-display sightline.
lever_y = -0.30
surface, _ = central_pose(0.0, lever_y, 0.0)
pivot_location = (surface[0], surface[1], surface[2] + 0.24)

bevel_cube("KEX_V61_OrbitalLever_Base", central_pose(0.0, lever_y, 0.075)[0], (0.78, 0.48, 0.14), MAT_RUBBER, (CENTRAL_PITCH, 0.0, 0.0), 0.065)
cylinder("KEX_V61_OrbitalLever_Axle", pivot_location, 0.10, 0.58, MAT_BRONZE, (0.0, math.radians(90.0), 0.0), vertices=16)
for x in (-0.32, 0.32):
    cylinder(f"KEX_V61_OrbitalLever_Bearing_{'L' if x < 0 else 'R'}", (x, pivot_location[1], pivot_location[2]), 0.15, 0.11, MAT_STEEL, (0.0, math.radians(90.0), 0.0), vertices=16)

pivot = bpy.data.objects.new("KEX_V61_OrbitalLever_Pivot", None)
pivot.empty_display_type = "ARROWS"
pivot.empty_display_size = 0.22
pivot.location = pivot_location
relink(pivot, COCKPIT)
pivot["interaction"] = "orbital_drive_pull_lever"
pivot["axis"] = "forward_back"
pivot["range_degrees"] = 40.0
pivot["web_action"] = "setOrbitalDrive"

cylinder("KEX_V61_OrbitalLever_Shaft", (0.0, 0.0, 0.34), 0.055, 0.68, MAT_STEEL, vertices=12).parent = pivot
bevel_cube("KEX_V61_OrbitalLever_THandle", (0.0, 0.0, 0.72), (0.46, 0.14, 0.14), MAT_IVORY, bevel=0.045).parent = pivot
bevel_cube("KEX_V61_OrbitalLever_HandleBridge", (0.0, 0.0, 0.63), (0.16, 0.12, 0.15), MAT_BRONZE, bevel=0.035).parent = pivot

# After parenting, the children above are already expressed in pivot-local space.
for child in pivot.children:
    child.matrix_parent_inverse.identity()

for frame, degrees in ((1, -18.0), (44, 22.0), (88, -18.0)):
    pivot.rotation_euler = (math.radians(degrees), 0.0, 0.0)
    pivot.keyframe_insert(data_path="rotation_euler", frame=frame, index=0)
# Blender 5 uses layered actions; the three authored keys remain portable to
# glTF without relying on the legacy Action.fcurves collection.

# Twin mechanical gate rails and a three-light position strip.
for rail_x in (-0.255, 0.255):
    curve = bpy.data.curves.new(f"KEX_V61_OrbitalLever_GateCurve_{rail_x:+.2f}", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.024
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    samples = 13
    spline.points.add(samples - 1)
    for idx, degrees in enumerate(range(-30, 31, 5)):
        radians = math.radians(degrees)
        radius = 0.56
        y = pivot_location[1] - math.sin(radians) * radius
        z = pivot_location[2] + math.cos(radians) * radius
        spline.points[idx].co = (rail_x, y, z, 1.0)
    rail = bpy.data.objects.new(f"KEX_V61_OrbitalLever_GateRail_{'L' if rail_x < 0 else 'R'}", curve)
    curve.materials.append(MAT_BRONZE)
    COCKPIT.objects.link(rail)
    bpy.context.view_layer.objects.active = rail
    rail.select_set(True)
    bpy.ops.object.convert(target="MESH")
for idx, y in enumerate((-0.48, -0.30, -0.12), 1):
    status_led(f"KEX_V61_OrbitalLever_Position_{idx:02d}", central_pose, 0.34, y, MAT_AMBER if idx == 2 else MAT_CYAN, 0.022)


# ---------------------------------------------------------------------------
# Side stations. Mission is nav/comms-oriented; Engineering is power/thermal.

def mission_pose(x, y, lift=0.0):
    return side_pose("Mission", x, y, lift)


def engineering_pose(x, y, lift=0.0):
    return side_pose("Engineering", x, y, lift)


panel("KEX_V61_Mission_NavKeypadPanel", mission_pose, -1.95, 0.03, 1.62, 1.42)
panel("KEX_V61_Mission_SensorPanel", mission_pose, 0.0, 0.03, 1.48, 1.42)
panel("KEX_V61_Mission_CommsPanel", mission_pose, 1.95, 0.03, 1.62, 1.42)

# Mission station: route entry, sensor gain and comms are three distinct bays.
mission_nav_legends = ("MAP", "POI", "LOCK", "PREV", "NEXT", "HOME")
for row in range(2):
    for col in range(3):
        idx = row * 3 + col + 1
        push_button(
            f"KEX_V61_Mission_NAV_Key_{idx:02d}", mission_pose,
            -2.40 + col * 0.46, -0.20 + row * 0.43,
            MAT_CYAN if idx != 5 else MAT_GREEN, 0.14, idx in (2, 5), mission_nav_legends[idx - 1],
        )
for idx, x in enumerate((-0.43, 0.0, 0.43), 1):
    rotary(f"KEX_V61_Mission_SENSOR_Dial_{idx:02d}", mission_pose, x, -0.02, MAT_CYAN if idx < 3 else MAT_GREEN, 0.62)
    status_led(f"KEX_V61_Mission_SENSOR_State_{idx:02d}", mission_pose, x, -0.47, (MAT_GREEN, MAT_CYAN, MAT_AMBER)[idx - 1], 0.026)
rocker("KEX_V61_Mission_COM_Channel", mission_pose, 1.68, 0.20, MAT_CYAN, 1, "CH")
compact_guarded_switch("KEX_V61_Mission_COM_Emergency", mission_pose, 2.22, 0.20, MAT_SAFETY_AMBER, MAT_AMBER)
for idx, x in enumerate((1.68, 2.22), 1):
    rocker(f"KEX_V61_Mission_COM_Rocker_{idx:02d}", mission_pose, x, -0.32, MAT_GREEN if idx == 1 else MAT_CYAN, idx % 2, ("TX", "RX")[idx - 1])
label("KEX_V61_Mission_Label_NAV", mission_pose, "NAV SOLVER", -1.95, 0.57, 0.10, MAT_CYAN)
label("KEX_V61_Mission_Label_SENSOR", mission_pose, "SENSOR", 0.0, 0.57, 0.10, MAT_WHITE)
label("KEX_V61_Mission_Label_COMMS", mission_pose, "COMMS", 1.95, 0.57, 0.10, MAT_CYAN)


panel("KEX_V61_Engineering_PowerPanel", engineering_pose, -1.95, 0.03, 1.62, 1.42)
panel("KEX_V61_Engineering_ThermalPanel", engineering_pose, 0.0, 0.03, 1.48, 1.42)
panel("KEX_V61_Engineering_BusPanel", engineering_pose, 1.95, 0.03, 1.62, 1.42)

# Engineering station: one protected master feed and two compact distribution
# buses, rather than three visually identical decorative toggles.
guarded_master_power("KEX_V61_Engineering_PWR_Master", engineering_pose, -2.42, 0.08)
rocker("KEX_V61_Engineering_PWR_BusA", engineering_pose, -1.95, 0.08, MAT_AMBER, 1, "A")
rocker("KEX_V61_Engineering_PWR_BusB", engineering_pose, -1.48, 0.08, MAT_GREEN, 1, "B")
for idx, (name, x, color) in enumerate((
    ("MASTER PWR", -2.42, MAT_RED),
    ("BUS A", -1.95, MAT_AMBER),
    ("BUS B", -1.48, MAT_GREEN),
), 1):
    label(f"KEX_V61_Engineering_PWR_Label_{idx:02d}", engineering_pose, name, x, -0.22, 0.052, color)
    status_led(f"KEX_V61_Engineering_PWR_State_{idx:02d}", engineering_pose, x, -0.49, color, 0.026)
for idx, x in enumerate((-0.43, 0.0, 0.43), 1):
    rotary(f"KEX_V61_Engineering_THERM_Dial_{idx:02d}", engineering_pose, x, -0.02, (MAT_AMBER, MAT_CYAN, MAT_GREEN)[idx - 1], 0.62)
    status_led(f"KEX_V61_Engineering_THERM_State_{idx:02d}", engineering_pose, x, -0.47, (MAT_GREEN, MAT_AMBER, MAT_CYAN)[idx - 1], 0.026)
for row in range(2):
    for col in range(3):
        idx = row * 3 + col + 1
        rocker(
            f"KEX_V61_Engineering_BUS_Rocker_{idx:02d}", engineering_pose,
            1.50 + col * 0.45, -0.22 + row * 0.43,
            (MAT_GREEN, MAT_AMBER, MAT_RED)[(idx - 1) % 3], idx % 2,
            ("B1", "B2", "B3", "A1", "A2", "A3")[idx - 1],
        )
label("KEX_V61_Engineering_Label_POWER", engineering_pose, "POWER", -1.95, 0.57, 0.10, MAT_AMBER)
label("KEX_V61_Engineering_Label_THERMAL", engineering_pose, "THERMAL", 0.0, 0.57, 0.10, MAT_WHITE)
label("KEX_V61_Engineering_Label_BUS", engineering_pose, "BUS / LOAD", 1.95, 0.57, 0.10, MAT_AMBER)


# Make the mechanical lever read at an intermediate, clearly visible pose.
SCENE.frame_start = 1
SCENE.frame_end = 88
SCENE.frame_set(26)
SCENE["kex_cockpit_version"] = "6.3.0-mcp-labeled-tactile-controls"
SCENE["kex_control_language"] = "labeled-tactile-flight-deck"


# Rebuild optimized material batches from the authoritative cockpit collection.
for obj in list(EXPORT.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

depsgraph = bpy.context.evaluated_depsgraph_get()
groups = {}
source_meshes = [o for o in COCKPIT.objects if o.type == "MESH" and not o.hide_render]
for src in source_meshes:
    evaluated = src.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    duplicate = bpy.data.objects.new("__KEX_BATCH_SOURCE__" + src.name, mesh)
    duplicate.matrix_world = src.matrix_world.copy()
    mat = src.data.materials[0] if src.data.materials else MAT_HULL if "MAT_HULL" in globals() else MAT_PANEL
    mesh.materials.clear()
    mesh.materials.append(mat)
    EXPORT.objects.link(duplicate)
    groups.setdefault(mat.name, []).append(duplicate)

batch_objects = []
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
    joined.name = "KEX_EXPORT_" + mat_name.replace("KEX_MAT_", "")
    joined["source_material"] = mat_name
    joined["optimized_batch"] = True
    batch_objects.append(joined)

for obj in batch_objects:
    obj.hide_set(True)
    obj.hide_render = True

triangles = 0
for obj in source_meshes:
    evaluated = obj.evaluated_get(depsgraph)
    triangles += sum(len(poly.vertices) - 2 for poly in evaluated.data.polygons)

bpy.ops.wm.save_as_mainfile(filepath="/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/kofte-explorer.blend")
result = {
    "version": SCENE["kex_cockpit_version"],
    "controls": len([o for o in COCKPIT.objects if o.name.startswith("KEX_V61_")]),
    "source_meshes": len(source_meshes),
    "triangles": triangles,
    "export_batches": len(batch_objects),
    "lever_action": bool(pivot.animation_data and pivot.animation_data.action),
    "saved": not bpy.data.is_dirty,
}
'''


RENDER_CODE = r'''
import bpy
import os

scene = bpy.context.scene
camera_name = __CAMERA_NAME__
output_path = __OUTPUT_PATH__
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
result = {"camera": camera_name, "path": output_path, "exists": os.path.exists(output_path)}
'''


INSPECT_CODE = r'''
import bpy
scene = bpy.context.scene
controls = [o for o in bpy.data.objects if o.name.startswith("KEX_V61_")]
result = {
    "file": bpy.data.filepath,
    "version": scene.get("kex_cockpit_version"),
    "controls": len(controls),
    "meshes": len([o for o in controls if o.type == "MESH"]),
    "empties": len([o for o in controls if o.type == "EMPTY"]),
    "actions": [a.name for a in bpy.data.actions],
    "missing_files": [img.filepath for img in bpy.data.images if img.source == "FILE" and img.filepath and not bpy.path.abspath(img.filepath)],
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
        camera_by_mode = {
            "render-overview": "KEX_CAM_Overview",
            "render-front": "KEX_CAM_Projects",
            "render-mission": "KEX_CAM_Experience",
            "render-engineering": "KEX_CAM_Skills",
        }
        output_by_mode = {
            "render-overview": "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v63-overview.png",
            "render-front": "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v63-front-controls.png",
            "render-mission": "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v63-mission-controls.png",
            "render-engineering": "/Users/muhammedenessahin/Desktop/Dev/personalwebsite/art/blender/previews/kex-v63-engineering-controls.png",
        }
        code = RENDER_CODE.replace("__CAMERA_NAME__", repr(camera_by_mode[mode])).replace("__OUTPUT_PATH__", repr(output_by_mode[mode]))
        result = call(code)
    else:
        raise SystemExit(f"Unknown mode: {mode}")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
