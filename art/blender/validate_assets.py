"""Validate the production Köfte and KEX-07 GLBs with Blender.

Run after ``export_v7_web_mcp.py``:

    blender --background --python art/blender/validate_assets.py

The checks intentionally describe the web runtime contract rather than the
builder internals. A hand-edited replacement GLB is therefore accepted when it
keeps the same nodes, clips and performance envelope.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "public" / "models" / "cockpit"

KOFTE_REQUIRED_NODES = {
    "KofteRig",
    "Kofte_Eye_L",
    "Kofte_Eye_R",
    "Kofte_Mouth",
    "Kofte_Visor",
    "Kofte_V7Detail_MouthCorner_L",
    "Kofte_V7Detail_MouthCorner_R",
    "Kofte_V7Detail_EyeSpark_L",
    "Kofte_V7Detail_EyeSpark_R",
    "Kofte_V7Detail_Tear_R",
    "Kofte_HoverRing",
    "Kofte_Hand_L",
    "Kofte_Hand_R",
    "Kofte_FingerTip_index_L",
    "Kofte_FingerTip_index_R",
}
KOFTE_FORBIDDEN_NODES = {"Kofte_FaceGasket", "Kofte_VisorTrim"}
KOFTE_REQUIRED_BONES = {
    "root",
    "body",
    "head",
    "hand.L",
    "hand.R",
    "finger.index.L",
    "finger.index_tip.L",
    "finger.thumb.L",
    "finger.thumb_tip.L",
    "finger.index.R",
    "finger.index_tip.R",
    "finger.thumb.R",
    "finger.thumb_tip.R",
}
KOFTE_REQUIRED_ACTIONS = {
    "Idle",
    "HoverMove",
    "Talk",
    "Wave",
    "Point",
    "ThumbsUp",
    "HeadTilt",
    "Bow",
    "Dance",
    "Flip",
    "SpinHappy",
    "Shy",
    "BootUp",
    "Scan",
    "Celebrate",
    "Sleep",
}
FILE_BUDGETS = {"kofte.glb": 1_600_000}
TRIANGLE_BUDGETS = {"kofte.glb": 26_000}
V7_FILE_BUDGETS = {
    "cockpit-v7-shell.glb": 5_000_000,
    "cockpit-v7-controls.glb": 1_100_000,
    "kofte-explorer-v7-exterior.glb": 1_200_000,
}
V7_TRIANGLE_BUDGETS = {
    "cockpit-v7-shell.glb": 72_000,
    "cockpit-v7-controls.glb": 16_000,
    "kofte-explorer-v7-exterior.glb": 20_000,
}


class ValidationError(RuntimeError):
    """Raised when an exported asset breaks the runtime contract."""


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path: Path) -> None:
    if not path.is_file():
        raise ValidationError(f"Missing generated asset: {path}")
    bpy.ops.import_scene.gltf(filepath=str(path), import_pack_images=True)


def triangle_count() -> int:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    count = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            count += len(mesh.loop_triangles)
        finally:
            evaluated.to_mesh_clear()
    return count


def action_names() -> set[str]:
    return {action.name.rsplit(".", 1)[0] for action in bpy.data.actions}


def validate_file_budget(path: Path) -> None:
    size = path.stat().st_size
    budget = FILE_BUDGETS[path.name]
    if size > budget:
        raise ValidationError(f"{path.name} is {size} bytes; budget is {budget}")


def validate_kofte() -> dict[str, object]:
    path = MODEL_DIR / "kofte.glb"
    validate_file_budget(path)
    reset_scene()
    import_glb(path)
    nodes = {obj.name for obj in bpy.context.scene.objects}
    missing_nodes = sorted(KOFTE_REQUIRED_NODES - nodes)
    forbidden_nodes = sorted(KOFTE_FORBIDDEN_NODES & nodes)
    missing_actions = sorted(KOFTE_REQUIRED_ACTIONS - action_names())
    triangles = triangle_count()
    armature_objects = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    armatures = len(armature_objects)
    bones = {bone.name for armature in armature_objects for bone in armature.data.bones}
    missing_bones = sorted(KOFTE_REQUIRED_BONES - bones)
    if missing_nodes:
        raise ValidationError(f"kofte.glb missing nodes: {missing_nodes}")
    if forbidden_nodes:
        raise ValidationError(f"kofte.glb still contains removed visor rings: {forbidden_nodes}")
    if missing_actions:
        raise ValidationError(f"kofte.glb missing actions: {missing_actions}")
    if missing_bones:
        raise ValidationError(f"kofte.glb missing bones: {missing_bones}")
    if armatures != 1:
        raise ValidationError(f"kofte.glb needs exactly one armature; found {armatures}")
    if triangles > TRIANGLE_BUDGETS[path.name]:
        raise ValidationError(f"kofte.glb has {triangles} triangles")
    return {
        "file": str(path.relative_to(ROOT)),
        "bytes": path.stat().st_size,
        "triangles": triangles,
        "objects": len(nodes),
        "armatures": armatures,
        "bones": len(bones),
        "actions": sorted(action_names()),
    }


def validate_v7_glb(filename: str) -> dict[str, object]:
    path = MODEL_DIR / "v7" / filename
    if not path.is_file():
        raise ValidationError(f"Missing V7 asset: {path}")
    size = path.stat().st_size
    if size > V7_FILE_BUDGETS[filename]:
        raise ValidationError(f"{filename} is {size} bytes; budget is {V7_FILE_BUDGETS[filename]}")
    reset_scene()
    import_glb(path)
    triangles = triangle_count()
    if triangles > V7_TRIANGLE_BUDGETS[filename]:
        raise ValidationError(
            f"{filename} has {triangles} triangles; budget is {V7_TRIANGLE_BUDGETS[filename]}"
        )
    return {
        "file": str(path.relative_to(ROOT)),
        "bytes": size,
        "triangles": triangles,
        "objects": len(bpy.context.scene.objects),
        "materials": len(bpy.data.materials),
    }


def validate_v7_layout() -> dict[str, object]:
    path = MODEL_DIR / "v7" / "cockpit-v7-layout.json"
    if not path.is_file():
        raise ValidationError(f"Missing V7 layout manifest: {path}")
    payload = json.loads(path.read_text())
    expected_zones = {"hub", "gallery", "projects", "experience", "skills", "contact"}
    sockets = set(payload.get("sockets", {}))
    if sockets != expected_zones:
        raise ValidationError(f"V7 layout socket mismatch: {sorted(sockets)}")
    expected_shots = expected_zones | {"overview"}
    for breakpoint in ("desktop", "mobile"):
        shots = set(payload.get("shots", {}).get(breakpoint, {}))
        if shots != expected_shots:
            raise ValidationError(f"V7 layout {breakpoint} shot mismatch: {sorted(shots)}")
    screens = set(payload.get("screens", {}))
    if screens != {"projects", "experience", "skills", "contact"}:
        raise ValidationError(f"V7 screen mismatch: {sorted(screens)}")
    controls = payload.get("controls", {})
    if len(controls) < 30:
        raise ValidationError(f"V7 requires at least 30 semantic controls; found {len(controls)}")
    control_nodes = [definition.get("node") for definition in controls.values()]
    if len(control_nodes) != len(set(control_nodes)):
        raise ValidationError("V7 semantic control nodes must be unique")
    reset_scene()
    import_glb(MODEL_DIR / "v7" / "cockpit-v7-controls.glb")
    exported_nodes = {obj.name for obj in bpy.context.scene.objects}
    missing_control_nodes = sorted(set(control_nodes) - exported_nodes)
    if missing_control_nodes:
        raise ValidationError(f"V7 controls GLB missing semantic nodes: {missing_control_nodes}")
    return {
        "file": str(path.relative_to(ROOT)),
        "version": payload.get("version"),
        "controls": len(controls),
        "screens": len(screens),
        "desktopShots": len(payload["shots"]["desktop"]),
        "mobileShots": len(payload["shots"]["mobile"]),
    }


def main() -> None:
    report = {
        "kofte": validate_kofte(),
        "v7Shell": validate_v7_glb("cockpit-v7-shell.glb"),
        "v7Controls": validate_v7_glb("cockpit-v7-controls.glb"),
        "v7Exterior": validate_v7_glb("kofte-explorer-v7-exterior.glb"),
        "v7Layout": validate_v7_layout(),
    }
    print("ASSET_VALIDATION=" + json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except ValidationError as error:
        print(f"ASSET_VALIDATION_ERROR={error}", file=sys.stderr)
        sys.exit(1)
