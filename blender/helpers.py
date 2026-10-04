"""Helpers used by scene_v2.py."""
import math

import bpy
from mathutils import Vector


def import_gltf(path):
    """Import a glTF/GLB and return the new top-level objects."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return [o for o in new if o.parent is None], new


def bbox(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == "MESH" for c in o.bound_box]
    lo = Vector(min(p[i] for p in pts) for i in range(3))
    hi = Vector(max(p[i] for p in pts) for i in range(3))
    return lo, hi


def place(path, x, y, z, rot_z=0.0, scale=1.0):
    """Import a model, centre it on (x, y) with its base at z."""
    roots, new = import_gltf(path)
    bpy.context.view_layer.update()
    for r in roots:
        r.rotation_mode = "XYZ"
        r.scale = (scale,) * 3
    bpy.context.view_layer.update()
    lo, hi = bbox(new)
    centre = (lo + hi) / 2
    for r in roots:
        r.location += Vector((x - centre.x, y - centre.y, z - lo.z))
    bpy.context.view_layer.update()
    if rot_z:
        # rotate around the placed centre
        pivot = Vector((x, y, 0))
        c, s = math.cos(rot_z), math.sin(rot_z)
        for r in roots:
            d = r.location - pivot
            r.location = pivot + Vector((d.x * c - d.y * s, d.x * s + d.y * c, d.z))
            r.rotation_euler.z += rot_z
        bpy.context.view_layer.update()
    return new


def add_light(name, kind, loc, energy, color=(1, 1, 1), size=None, rot=None):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if size is not None:
        if kind == "AREA":
            data.size = size
        else:
            data.shadow_soft_size = size
    o = bpy.data.objects.new(name, data)
    o.location = loc
    if rot:
        o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    return o
