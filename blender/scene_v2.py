"""v2 scene: a Bondi-blue egg-shaped all-in-one on a four-seat hackathon table, built from scratch,
baked into three lightmaps.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/scene_v2.py

Writes blender/out/v2/{computer,environment,decor}.{glb,jpg}, the same three groups the app
loads today, plus shell.glb: the translucent outer shell of the computer, keyboard tray and
mouse ring. Light that passes through tinted plastic cannot live in a lightmap, so the shell is
not baked; it carries a plain alpha-blended material for the app to render live. It is still in
the scene while the others bake, so it shades the chassis inside it and the desk under it.

Units are the app's glTF units (the app scales every mesh by 900), not metres: 1 unit is
about 0.26 m. The props are modelled in metres in the frame the approved concept renders used
(desk top at z = 0.74, the computer at x = 0, y = 0.08) and TO_APP moves and scales them into
app units: floor at glTF y = -3.32, desk top at y = -0.50. Blender is z-up, so a glTF point
(x, y, z) is (x, -z, y) here and the viewer side (glTF +z) is Blender -y.

Environment overrides (handy for quick tests):
    BAKE_SIZE=512 BAKE_SAMPLES=8 BAKE_DEBUG=1 ... Blender -b -P blender/scene_v2.py
"""
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

sys.dont_write_bytecode = True  # no __pycache__ next to the scripts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import add_light  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "blender", "out", "v2")
SIZE = int(os.environ.get("BAKE_SIZE", 2048))
SAMPLES = int(os.environ.get("BAKE_SAMPLES", 256))
SHELL_DENSITY = 0.4  # floor/wall texel density relative to props
GROUPS = ("computer", "environment", "decor")
TRANSLUCENT = "shell"  # not baked: exported on its own as shell.glb
os.makedirs(OUT, exist_ok=True)

FLOOR = -3.32
DESK_TOP = -0.50
DESK = 0.74  # desk height in metres, as in the concept renders
S = (DESK_TOP - FLOOR) / DESK  # app units per metre
IMAC_Y = 0.08  # the computer's spot on the table (metres); TO_APP puts it at the origin
TO_APP = Matrix.Translation((0, -IMAC_Y * S, FLOOR)) @ Matrix.Scale(S, 4)
BONDI = "#0095b6"
SHELL_ALPHA = 0.72

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ---------------------------------------------------------------- materials
def srgb(hex_color):
    """'#rrggbb' -> linear RGBA, so colours can be picked by eye."""
    c = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)


_mats = {}


def mat(group, hex_color, rough=0.6, emit=0.0, name=None):
    """One material per (group, colour): parts of a group share it, so the joined mesh keeps few
    slots. Never shared across groups, because each group bakes into its own image."""
    key = (group, hex_color, rough, emit)
    if key not in _mats:
        m = bpy.data.materials.new(name or f"{group}_{hex_color[1:]}")
        m.use_nodes = True
        p = m.node_tree.nodes["Principled BSDF"]
        p.inputs["Base Color"].default_value = srgb(hex_color)
        p.inputs["Roughness"].default_value = rough
        if emit:
            p.inputs["Emission Color"].default_value = srgb(hex_color)
            p.inputs["Emission Strength"].default_value = emit
        _mats[key] = m
    return _mats[key]


def shell_mat():
    """Tinted translucent plastic. Only base colour, alpha, roughness and coat are set, all of
    which the glTF exporter writes (alphaMode BLEND + KHR_materials_clearcoat) for the app."""
    m = bpy.data.materials.new("BondiShell")
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = srgb(BONDI)
    p.inputs["Roughness"].default_value = 0.14
    p.inputs["Coat Weight"].default_value = 1.0
    p.inputs["Coat Roughness"].default_value = 0.04
    p.inputs["Alpha"].default_value = SHELL_ALPHA
    m.surface_render_method = "BLENDED"
    m.use_backface_culling = False
    return m


# ---------------------------------------------------------------- mesh builders
# Every builder writes its vertices straight into an object at the origin (no object transform):
# joined groups then keep their origin at 0, which the app relies on (it scales each mesh about
# its own origin). Sizes and positions are metres; TO_APP is applied to all meshes at the end.
def to_object(name, bm, material, group, matrix=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if matrix is not None:
        me.transform(matrix)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    me.materials.append(material)
    o["group"] = group
    return o


def placed(loc, rot=(0, 0, 0)):
    """Translation @ rotation; rot is Euler XYZ in degrees, like the concept scripts."""
    return Matrix.Translation(Vector(loc)) @ Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()


def transform(objs, matrix):
    for o in objs:
        o.data.transform(matrix)


def box(name, size, loc, material, group, bevel=0.0, segments=2, rot=(0, 0, 0)):
    """Box centred on loc."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=segments, affect="EDGES",
                        profile=0.5, clamp_overlap=True)
    return to_object(name, bm, material, group, placed(loc, rot))


def frustum(name, bottom_wh, top_wh, height, loc, material, group):
    """Tapered box (key caps) standing on loc; it has no bottom face, which is never seen."""
    bm = bmesh.new()
    vs = []
    for (w, d), z in ((bottom_wh, 0.0), (top_wh, height)):
        for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            vs.append(bm.verts.new((x * w / 2, y * d / 2, z)))
    bm.faces.new(vs[4:])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vs[i], vs[j], vs[4 + j], vs[4 + i]))
    return to_object(name, bm, material, group, Matrix.Translation(Vector(loc)))


def cyl(name, r, h, loc, material, group, r_top=None, segments=24, rot=(0, 0, 0), bevel=0.0):
    """Cylinder or cone centred on loc, axis along local z."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=r,
                          radius2=r if r_top is None else r_top, depth=h)
    if bevel:  # round the two rims only
        rims = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
        bmesh.ops.bevel(bm, geom=rims, offset=bevel, segments=2, affect="EDGES", profile=0.5,
                        clamp_overlap=True)
    return to_object(name, bm, material, group, placed(loc, rot))


def ellipsoid(name, size, loc, material, group, rot=(0, 0, 0), segments=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=segments // 2, radius=0.5)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    return to_object(name, bm, material, group, placed(loc, rot))


def rod(name, a, b, r, material, group, segments=8):
    """Cylinder from point a to point b."""
    a, b = Vector(a), Vector(b)
    o = cyl(name, r, (b - a).length, (0, 0, 0), material, group, segments=segments)
    q = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    o.data.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    return o


def plane(name, size, loc, rot, material, group):
    """One-sided quad for the room shell (a closed box would bake its unseen sides)."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=Vector((size[0], size[1], 1)), verts=bm.verts)
    return to_object(name, bm, material, group, placed(loc, rot))


def loft(name, rects, material, group, bevel=0.0, segments=2):
    """Join rectangles (w, h, y, z_centre), front to back along +y, capped at both ends."""
    bm = bmesh.new()
    rings = [[bm.verts.new((sx * w / 2, y, z + sz * h / 2)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
             for w, h, y, z in rects]
    bm.faces.new(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((b[i], b[j], a[j], a[i]))
    bm.faces.new(rings[-1][::-1])
    if bevel:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=segments, affect="EDGES", profile=0.5,
                        clamp_overlap=True)
    return to_object(name, bm, material, group)


def realize(o):
    """Bake the object's modifiers into its mesh. The group join keeps only the active object's
    modifiers, so anything left as a modifier would silently vanish from the export."""
    me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    old = o.data
    o.modifiers.clear()
    o.data = me
    if not me.materials:
        me.materials.append(old.materials[0])
    bpy.data.meshes.remove(old)
    return o


def cut(target, cutter):
    """Boolean difference, applied at once; the cutter is deleted."""
    mod = target.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    realize(target)
    me = cutter.data
    bpy.data.objects.remove(cutter)
    bpy.data.meshes.remove(me)
    return target


def cable(name, pts, r, material, group):
    """A tube through the points (a NURBS curve, converted to a mesh right away)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 1
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(pts) - 1)
    for pt, c in zip(sp.points, pts):
        pt.co = (*c, 1.0)
    sp.use_endpoint_u = True
    sp.order_u = min(4, len(pts))
    sp.resolution_u = 8
    tmp = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(tmp)
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    me.materials.append(material)
    o["group"] = group
    return o


# ---------------------------------------------------------------- room
SHELL = ("Floor", "WallBack", "WallRight")  # big flat planes: baked at SHELL_DENSITY
BACK_Y, RIGHT_X, WALL_H = 2.17, 2.57, 3.0
FLOOR_X, FLOOR_Y = (-3.2, RIGHT_X), (-3.2, BACK_Y)
fx, fy = FLOOR_X[1] - FLOOR_X[0], FLOOR_Y[1] - FLOOR_Y[0]
plane("Floor", (fx, fy), (sum(FLOOR_X) / 2, sum(FLOOR_Y) / 2, 0), (0, 0, 0),
      mat("environment", "#2c2d33", 0.95, name="Floor"), "environment")
plane("WallBack", (fx, WALL_H), (sum(FLOOR_X) / 2, BACK_Y, WALL_H / 2), (90, 0, 0),
      mat("environment", "#2f3440", 0.85, name="WallBack"), "environment")
plane("WallRight", (WALL_H, fy), (RIGHT_X, sum(FLOOR_Y) / 2, WALL_H / 2), (0, -90, 0),
      mat("environment", "#2f3542", 0.85, name="WallRight"), "environment")

# the shared table: 2.8 m x 1.3 m, the computer just in front of its middle
TABLE_W, TABLE_D, TABLE_Y, TOP_T = 2.8, 1.3, 0.25, 0.035
box("TableTop", (TABLE_W, TABLE_D, TOP_T), (0, TABLE_Y, DESK - TOP_T / 2), mat("environment", "#d9d6cf", 0.45),
    "environment", bevel=0.006)
m_leg = mat("environment", "#3a3a3a", 0.4)
for sx in (-1, 1):
    for sy in (-1, 1):
        box(f"TableLeg{sx}{sy}", (0.04, 0.04, DESK - TOP_T),
            (sx * (TABLE_W / 2 - 0.05), TABLE_Y + sy * (TABLE_D / 2 - 0.05), (DESK - TOP_T) / 2), m_leg, "environment")

# pendant lamp over the table
m_pendant = mat("environment", "#1c1c1c", 0.4)
cyl("PendantCord", 0.004, 1.2, (0.0, 0.25, 2.2), m_pendant, "environment", segments=6)
cyl("Pendant", 0.18, 0.14, (0.0, 0.25, 1.55), m_pendant, "environment", r_top=0.04)


def chair(name, loc, rot_z, col="#25262b", hoodie=None):
    """Office chair facing +y in local space (backrest at -y)."""
    g = "environment"
    cm = mat(g, col, 0.6)
    dark = mat(g, "#333333", 0.4)
    parts = [box(name + "Seat", (0.46, 0.44, 0.07), (0, 0, 0.48), cm, g, bevel=0.025),
             box(name + "Back", (0.44, 0.05, 0.5), (0, -0.24, 0.8), cm, g, bevel=0.025, rot=(-8, 0, 0)),
             box(name + "Spine", (0.05, 0.04, 0.3), (0, -0.26, 0.5), mat(g, "#444444", 0.4), g),
             cyl(name + "Pole", 0.025, 0.38, (0, 0, 0.26), mat(g, "#666666", 0.3), g, segments=12)]
    for k in range(5):
        a = math.radians(k * 72)
        parts.append(box(f"{name}Star{k}", (0.3, 0.04, 0.03), (0.15 * math.cos(a), 0.15 * math.sin(a), 0.06), dark, g,
                         rot=(0, 0, k * 72)))
        parts.append(ellipsoid(f"{name}Wheel{k}", (0.05, 0.05, 0.05), (0.29 * math.cos(a), 0.29 * math.sin(a), 0.03),
                               mat(g, "#111111", 0.5), g, segments=10))
    if hoodie:  # slung over the backrest, sleeves hanging down the sides
        hm = mat(g, hoodie, 0.95)
        parts += [box(name + "Hoodie", (0.5, 0.12, 0.34), (0, -0.25, 0.9), hm, g, bevel=0.05, rot=(-8, 0, 0)),
                  ellipsoid(name + "Hood", (0.26, 0.16, 0.16), (0, -0.31, 1.03), hm, g)]
        for s in (-1, 1):
            parts.append(box(f"{name}Sleeve{s}", (0.09, 0.09, 0.42), (s * 0.27, -0.2, 0.68), hm, g, bevel=0.04,
                             rot=(0, s * 6, 0)))
    transform(parts, placed(loc, (0, 0, rot_z)))


# four seats: two across the table, one at the left end, and the visitor's own, pushed back
chair("ChairA", (-0.62, 1.35, 0), 180, hoodie="#d94a3a")
chair("ChairB", (0.62, 1.35, 0), 190, col="#30333a")
chair("ChairC", (-1.75, 0.0, 0), 75, hoodie="#2e7d5b")
chair("ChairD", (0.1, -0.85, 0), -14)

# ---------------------------------------------------------------- computer
# An egg-shaped all-in-one: opaque ice-white front with a 4:3 CRT, the internals behind it, and
# the translucent Bondi shell around the back. No badge, logo or brand text anywhere.
W, H, LIFT = 0.38, 0.395, 0.016  # body width/height, gap under the body (it stands on its feet)
ZC = LIFT + H / 2
SCR_W, SCR_H, SCR_Z = 0.276, 0.207, LIFT + 0.245  # visible glass, exactly 4:3
GLASS_Y = -0.025  # glass plane; the bezel front is at -0.04
m_shell = shell_mat()
m_ice = mat("computer", "#e6edf0", 0.25)
m_dark = mat("computer", "#1d2226", 0.55)
m_grey = mat("computer", "#8b9196", 0.35)
imac = []
# internals, seen faintly through the shell: CRT funnel + neck, chassis plate, board, shield, yoke
imac += [loft("Funnel", [(SCR_W + 0.01, SCR_H + 0.01, 0.025, SCR_Z), (0.2, 0.16, 0.12, SCR_Z),
                         (0.07, 0.07, 0.22, SCR_Z)], m_dark, "computer", bevel=0.01),
         cyl("Neck", 0.022, 0.13, (0, 0.28, SCR_Z), m_dark, "computer", r_top=0.016, segments=16, rot=(90, 0, 0)),
         box("Chassis", (W - 0.1, 0.2, 0.008), (0, 0.1, LIFT + 0.03), m_grey, "computer"),
         box("Board", (0.2, 0.14, 0.004), (0.02, 0.11, LIFT + 0.037), mat("computer", "#2f5a3a", 0.5), "computer"),
         box("Shield", (0.006, 0.16, 0.12), (-0.12, 0.1, LIFT + 0.095), m_grey, "computer"),
         box("Yoke", (0.12, 0.05, 0.12), (0, 0.2, SCR_Z), mat("computer", "#5a3a24", 0.6), "computer", bevel=0.02)]

# translucent back: a teardrop seen from the side (the back drops and narrows), smoothed
back = loft("ShellBack", [(W - 0.004, H - 0.004, -0.01, ZC), (W - 0.006, H - 0.012, 0.08, ZC + 0.004),
                          (W - 0.05, H - 0.07, 0.21, ZC - 0.012), (W - 0.15, H - 0.18, 0.31, ZC - 0.04),
                          (0.13, 0.11, 0.385, ZC - 0.065)], m_shell, TRANSLUCENT, bevel=0.03)
back.modifiers.new("smooth", "SUBSURF").levels = 2
imac.append(realize(back))
# carrying handle: an arch on top, near the front
handle = box("ShellHandle", (0.16, 0.085, 0.04), (0, 0.12, ZC + H / 2 - 0.006), m_shell, TRANSLUCENT, bevel=0.014,
             segments=4)
imac.append(cut(handle, box("HandleCut", (0.125, 0.2, 0.022), (0, 0.12, ZC + H / 2 - 0.012), m_shell, TRANSLUCENT,
                            bevel=0.008)))

# Ice-white front: a slab whose front face has the screen opening cut through to the glass. The
# opening tapers from a little wider at the front to exactly the glass size, so the visible
# screen is the full SCR_W x SCR_H. Vertex order is counter-clockwise seen from the front, so
# every face points outward (into the opening for its inner walls) without a normal recalc.
yf, yb = -0.04, 0.015
x0, x1, z0, z1 = -W / 2, W / 2, LIFT, LIFT + H
bm = bmesh.new()
quad = ((0, 0), (1, 0), (1, 1), (0, 1))
lip = 0.012
outer_f = [bm.verts.new(((x0, x1)[i], yf, (z0, z1)[k])) for i, k in quad]
outer_b = [bm.verts.new(((x0, x1)[i], yb, (z0, z1)[k])) for i, k in quad]
hole_f = [bm.verts.new(((-1, 1)[i] * (SCR_W / 2 + lip), yf, SCR_Z + (-1, 1)[k] * (SCR_H / 2 + lip))) for i, k in quad]
hole_b = [bm.verts.new(((-1, 1)[i] * SCR_W / 2, GLASS_Y, SCR_Z + (-1, 1)[k] * SCR_H / 2)) for i, k in quad]
for i in range(4):
    j = (i + 1) % 4
    bm.faces.new((outer_f[i], outer_f[j], hole_f[j], hole_f[i]))  # bezel
    bm.faces.new((hole_f[i], hole_f[j], hole_b[j], hole_b[i]))  # opening walls down to the glass
    bm.faces.new((outer_b[i], outer_b[j], outer_f[j], outer_f[i]))  # sides, top, bottom
bm.faces.new(outer_b[::-1])
# round only the outer edges: beveling the opening would shrink the visible screen
outer = set(outer_f + outer_b)
bmesh.ops.bevel(bm, geom=[e for e in bm.edges if all(v in outer for v in e.verts)], offset=0.026,
                segments=4, affect="EDGES", profile=0.5, clamp_overlap=True)
imac.append(to_object("Front", bm, m_ice, "computer"))
# the glass: flat and dark, its own mesh after the bake (the app lays the OS iframe over it)
imac.append(plane("Screen", (SCR_W, SCR_H), (0, GLASS_Y, SCR_Z), (90, 0, 0),
                  mat("computer", "#0c1210", 0.35, name="Screen"), "computer"))

# translucent band under the screen with two speaker grilles, a dark plate behind it
band_y = -0.0415
imac += [box("BandBack", (W - 0.09, 0.004, 0.07), (0, band_y + 0.006, LIFT + 0.072), mat("computer", "#3a4248", 0.6),
             "computer", bevel=0.008),
         box("ShellBand", (W - 0.07, 0.008, 0.08), (0, band_y, LIFT + 0.072), m_shell, TRANSLUCENT, bevel=0.012)]
for sx in (-1, 1):
    imac.append(cyl(f"Speaker{sx}", 0.022, 0.002, (sx * 0.115, band_y - 0.005, LIFT + 0.072), m_dark, "computer",
                    segments=20, rot=(90, 0, 0)))
# intake slot along the bottom lip, two jacks bottom right
imac.append(box("Vent", (0.21, 0.004, 0.0035), (0, -0.0405, LIFT + 0.019), m_dark, "computer"))
for i in range(2):
    imac.append(cyl(f"Jack{i}", 0.0035, 0.004, (0.135 + i * 0.016, -0.0405, LIFT + 0.02), m_dark, "computer",
                    segments=10, rot=(90, 0, 0)))
# translucent feet: two front pads and a rear stand bar
for sx in (-1, 1):
    imac.append(box(f"ShellFoot{sx}", (0.06, 0.05, LIFT + 0.004), (sx * 0.12, 0.0, (LIFT + 0.004) / 2), m_shell,
                    TRANSLUCENT, bevel=0.006))
imac.append(box("ShellFootRear", (0.18, 0.05, LIFT + 0.03), (0, 0.27, (LIFT + 0.03) / 2), m_shell, TRANSLUCENT,
                bevel=0.008))
# square to the viewer, so the screen faces glTF +z like the app's monitor camera
transform(imac, Matrix.Translation((0, IMAC_Y, DESK)))

# compact keyboard: translucent tray, ice-white deck and keys, tilted 3 degrees toward the user
KB = (-0.02, -0.24)
KW, KD, KH = 0.335, 0.14, 0.022
kb = [box("ShellKbTray", (KW, KD, KH), (0, 0, KH / 2), m_shell, TRANSLUCENT, bevel=0.011, segments=4),
      box("KbDeck", (KW - 0.02, KD - 0.022, 0.004), (0, -0.001, KH - 0.003), m_ice, "computer", bevel=0.002)]
m_key = mat("computer", "#f4f7f8", 0.35)
cols, pitch = 15, 0.0198
ks = pitch * 0.86
kx0 = -cols * pitch / 2 + pitch / 2
ky0 = -KD / 2 + 0.017 + pitch / 2
for r in range(6):
    y = ky0 + r * pitch * (0.93 if r < 5 else 0.96)
    if r == 0:  # space bar row
        keys = [(0, 1.25), (1.25, 1.25), (2.5, 1.25), (3.75, 7), (10.75, 1.25), (12, 1), (13, 1), (14, 1)]
    elif r == 5:  # half-height function row
        keys = [(c, 1) for c in range(cols)]
    else:
        off = (0, 0.5, 0.75, 1.25)[r - 1]
        n = cols - 1 - (1 if off > 1 else 0)
        keys = [(0, 1 + off)] + [(1 + off + c, 1) for c in range(n - 1)] + [(1 + off + n - 1, cols - (1 + off + n - 1))]
    for k, (c, kw) in enumerate(keys):
        if kw <= 0.2 or c + kw > cols + 0.01:
            continue
        w, d = kw * pitch - (pitch - ks), ks * (0.6 if r == 5 else 1)
        kb.append(frustum(f"Key{r}_{k}", (w, d), (w - 0.003, d - 0.003), 0.009,
                          (kx0 + (c + kw / 2 - 0.5) * pitch, y, KH - 0.001), m_key, "computer"))
transform(kb, placed((*KB, DESK), (0, 0, -6)) @ placed((0, 0, 0), (3, 0, 0)))

# round "hockey puck" mouse: translucent ring, white domed top, a tinted notch at the front
PUCK = (0.25, -0.21)
puck = [cyl("ShellPuckRing", 0.034, 0.02, (0, 0, 0.01), m_shell, TRANSLUCENT, segments=40, bevel=0.007),
        cyl("PuckCore", 0.028, 0.012, (0, 0, 0.008), mat("computer", "#2a3036", 0.6), "computer", segments=24),
        ellipsoid("PuckTop", (0.062, 0.062, 0.016), (0, 0, 0.019), m_key, "computer", segments=24),
        box("ShellPuckNotch", (0.012, 0.006, 0.004), (0, -0.031, 0.021), m_shell, TRANSLUCENT, bevel=0.0015)]
transform(puck, placed((*PUCK, DESK), (0, 0, -10)))

# keyboard cable from its back edge to the computer's right side; puck cable to the keyboard
m_cord = mat("computer", "#e9eef0", 0.3)
z = DESK
cable("KbCable", [(0.06, -0.17, z + 0.012), (0.1, -0.12, z + 0.003), (0.22, -0.06, z + 0.003),
                  (0.26, 0.05, z + 0.003), (0.19, 0.12, z + 0.05)], 0.0022, m_cord, "computer")
cable("PuckCable", [(0.245, -0.18, z + 0.008), (0.24, -0.15, z + 0.003), (0.2, -0.17, z + 0.003),
                    (0.158, -0.205, z + 0.012)], 0.0019, m_cord, "computer")

# ---------------------------------------------------------------- decor
STICKER_COLS = ("#ff4f9a", "#3fe0d0", "#ffd23f", "#6b7bff", "#ffffff", "#ff7a2f", "#41d36a")
LAPTOP_GLOWS = []


def laptop(name, loc, rot_z, body="#3a3d42", scr="#7fd0ff", seed=9, stickers=9):
    """Generic open laptop. rot_z 180 shows the lid back (stickers, plain shapes) to the viewer."""
    g = "decor"
    bm_ = mat(g, body, 0.35)
    parts = [box(name + "Base", (0.32, 0.22, 0.016), (0, 0, 0.008), bm_, g, bevel=0.004),
             box(name + "Keys", (0.27, 0.1, 0.002), (0, 0.02, 0.0165), mat(g, "#1a1b1e", 0.6), g)]
    lid = [box(name + "LidShell", (0.32, 0.008, 0.215), (0, 0, 0.1075), bm_, g, bevel=0.004),
           box(name + "Screen", (0.29, 0.002, 0.18), (0, -0.005, 0.11), mat(g, scr, 0.3, emit=1.4), g)]
    rnd = random.Random(seed)
    for i in range(stickers):
        c = mat(g, rnd.choice(STICKER_COLS), 0.4)
        if i % 3 == 0:  # round
            lid.append(cyl(f"{name}St{i}", rnd.uniform(0.018, 0.03), 0.002,
                           (rnd.uniform(-0.12, 0.12), 0.0045, rnd.uniform(0.04, 0.18)), c, g, segments=16, rot=(90, 0, 0)))
        elif i % 3 == 1:  # rounded rectangle
            lid.append(box(f"{name}St{i}", (rnd.uniform(0.03, 0.06), 0.002, rnd.uniform(0.02, 0.04)),
                           (rnd.uniform(-0.12, 0.12), 0.0045, rnd.uniform(0.04, 0.18)), c, g, bevel=0.003,
                           rot=(0, rnd.uniform(-20, 20), 0)))
        else:  # hexagon
            lid.append(cyl(f"{name}St{i}", rnd.uniform(0.02, 0.028), 0.002,
                           (rnd.uniform(-0.12, 0.12), 0.0045, rnd.uniform(0.04, 0.18)), c, g, segments=6, rot=(90, 0, 0)))
    transform(lid, placed((0, 0.11, 0.016), (-15, 0, 0)))
    transform(parts + lid, placed(loc, (0, 0, rot_z)))
    a = math.radians(rot_z)
    x, y, z = loc
    LAPTOP_GLOWS.append(((x - math.sin(a) * 0.05, y + math.cos(a) * 0.05, z + 0.15),
                         (x - math.sin(a) * 0.5, y - math.cos(a) * 0.5, z)))


# two across the table (lid backs face us), one front-left (screen faces us)
laptop("LapA", (-0.62, 0.62, DESK), 180, body="#c8ccd2", seed=3)
laptop("LapB", (0.62, 0.62, DESK), 175, body="#2f3136", seed=6)
laptop("LapC", (-0.9, -0.12, DESK), 25, body="#8a8f96", seed=8, stickers=4)

# power strip in the middle, cables to the laptops and one down to the floor
STRIP = (0.05, 0.62, DESK)
strip = [box("StripBody", (0.36, 0.06, 0.035), (0, 0, 0.0175), mat("decor", "#ececea", 0.4), "decor", bevel=0.008),
         box("StripSwitch", (0.025, 0.018, 0.006), (0.16, 0, 0.037), mat("decor", "#e0392b", 0.4, emit=2.0), "decor")]
for k in range(5):
    strip.append(box(f"StripSock{k}", (0.03, 0.03, 0.002), (-0.12 + k * 0.06, 0, 0.035), mat("decor", "#2a2a2a", 0.6),
                     "decor"))
transform(strip, Matrix.Translation(STRIP))
m_black_cord = mat("decor", "#1b1b1b", 0.5)
for k, pts in enumerate((
        [(-0.07, 0.62, z + 0.02), (-0.3, 0.6, z + 0.004), (-0.5, 0.7, z + 0.004), (-0.6, 0.74, z + 0.008)],
        [(0.13, 0.62, z + 0.02), (0.35, 0.66, z + 0.004), (0.55, 0.72, z + 0.004), (0.62, 0.74, z + 0.008)],
        [(0.0, 0.62, z + 0.02), (-0.4, 0.4, z + 0.004), (-0.75, 0.2, z + 0.004), (-0.92, 0.0, z + 0.008)],
        [(0.2, 0.6, z + 0.02), (0.6, 0.4, z + 0.004), (1.3, 0.5, z + 0.004), (1.42, 0.5, z - 0.2),
         (1.45, 0.5, 0.05), (1.6, 0.2, 0.01)])):
    cable(f"StripCable{k}", pts, 0.0035, m_black_cord, "decor")


def can(name, loc, col):
    x, y, z_ = loc
    cyl(name, 0.033, 0.12, (x, y, z_ + 0.06), mat("decor", "#c8ccd2", 0.25), "decor", segments=16)
    cyl(name + "Band", 0.0335, 0.072, (x, y, z_ + 0.06), mat("decor", col, 0.35), "decor", segments=16)


rnd = random.Random(4)
for i in range(6):
    can(f"Can{i}", (rnd.uniform(-1.2, 1.2), rnd.uniform(0.3, 0.8), DESK), rnd.choice(("#43e05a", "#2a8cff", "#ff4f9a")))

# two closed pizza boxes with an open one on top, a slice already gone
PIZZA, PIZZA_ROT = (1.0, 0.1), 10
m_card = (mat("decor", "#c9a26b", 0.8), mat("decor", "#bf975f", 0.8))
for i in range(2):
    box(f"PizzaBox{i}", (0.36, 0.36, 0.045), (*PIZZA, DESK + 0.0225 + i * 0.046), m_card[i % 2], "decor",
        rot=(0, 0, PIZZA_ROT + (i % 2) * 7 - 3))
pizza = [box("PizzaTray", (0.36, 0.36, 0.02), (0, 0, 0.01), m_card[0], "decor"),
         box("PizzaLid", (0.36, 0.01, 0.36), (0, 0.185, 0.19), m_card[1], "decor", rot=(-12, 0, 0)),
         cyl("PizzaCrust", 0.165, 0.012, (0, 0, 0.026), mat("decor", "#d9a456", 0.7), "decor", segments=32),
         cyl("PizzaCheese", 0.15, 0.004, (0, 0, 0.033), mat("decor", "#f2c14e", 0.5), "decor", segments=32)]
rnd = random.Random(7)
for k in range(9):
    a, r = rnd.uniform(0, math.tau), rnd.uniform(0.03, 0.12)
    pizza.append(cyl(f"Pepperoni{k}", 0.018, 0.004, (math.cos(a) * r, math.sin(a) * r, 0.036),
                     mat("decor", "#b8322a", 0.5), "decor", segments=12))
pizza.append(box("PizzaGap", (0.17, 0.17, 0.02), (0.085, -0.085, 0.03), m_card[0], "decor"))
transform(pizza, placed((*PIZZA, DESK + 2 * 0.046), (0, 0, PIZZA_ROT)))

# mug and a notebook with a pen, in front of the visitor's seat
MUG = (0.4, -0.2)
m_mug = mat("decor", "#ffd23f", 0.35)
cyl("Mug", 0.04, 0.095, (*MUG, DESK + 0.0475), m_mug, "decor", segments=32)
cyl("Coffee", 0.036, 0.002, (*MUG, DESK + 0.088), mat("decor", "#2a170b", 0.1), "decor", segments=32)
box("MugHandle", (0.012, 0.04, 0.05), (MUG[0] + 0.045, MUG[1], DESK + 0.05), m_mug, "decor", bevel=0.005)
NB = (-0.45, -0.25)
box("Notebook", (0.15, 0.21, 0.012), (*NB, DESK + 0.006), mat("decor", "#2b2f3a", 0.6), "decor", bevel=0.002,
    rot=(0, 0, 15))
rod("Pen", (NB[0] + 0.1, NB[1] - 0.08, DESK + 0.005), (NB[0] + 0.12, NB[1] + 0.07, DESK + 0.005), 0.004,
    mat("decor", "#2b5fd9", 0.4), "decor", segments=8)

# Whiteboard with an architecture sketch in marker colours. The strokes are thin boxes rather
# than a texture: the lightmap is too coarse for drawn lines, but a stroke's own colour survives.
WB_C, WB_W, WB_H = Vector((-0.4, 0, 1.45)), 1.8, 0.9
box("Whiteboard", (WB_W, 0.02, WB_H), (WB_C.x, BACK_Y - 0.01, WB_C.z), mat("decor", "#e8e8e4", 0.25), "decor")
PX_W, PX_H, DRAW_W, DRAW_H = 640, 420, 1.7, 0.85  # sketch drawn on a 640 x 420 px grid
STROKE_Y = BACK_Y - 0.0215


def px(x, y):
    return Vector((WB_C.x - DRAW_W / 2 + x / PX_W * DRAW_W, STROKE_Y, WB_C.z + DRAW_H / 2 - y / PX_H * DRAW_H))


def stroke(x, y, w, h, col):
    """Axis-aligned rectangle given in sketch pixels (top-left corner, size)."""
    box(f"Stroke{len(bpy.data.objects)}", (w / PX_W * DRAW_W, 0.003, h / PX_H * DRAW_H), px(x + w / 2, y + h / 2),
        mat("decor", col, 0.4), "decor")


def line(x0, y0, x1, y1, col, t=3):
    a, b = px(x0, y0), px(x1, y1)
    d = b - a
    box(f"Stroke{len(bpy.data.objects)}", (d.length, 0.003, t / PX_H * DRAW_H), (a + b) / 2, mat("decor", col, 0.4),
        "decor", rot=(0, -math.degrees(math.atan2(d.z, d.x)), 0))


rnd = random.Random(3)
nodes = [(40, 40), (240, 40), (440, 40), (140, 200), (360, 200), (250, 330)]
for i, (x, y) in enumerate(nodes):
    col = ("#2b5fd9", "#d93a2b", "#222222", "#2e9d4a")[i % 4]
    for sx, sy, sw, sh in ((0, 0, 130, 4), (0, 66, 130, 4), (0, 0, 4, 70), (126, 0, 4, 70)):
        stroke(x + sx, y + sy, sw, sh, col)
    stroke(x + 18, y + 22, rnd.randint(50, 90), 6, col)
    stroke(x + 18, y + 40, rnd.randint(30, 70), 6, col)
for i, j in ((0, 1), (1, 2), (0, 3), (1, 4), (3, 5), (4, 5)):
    (ax, ay), (bx, by) = nodes[i], nodes[j]
    xa, ya, xb, yb_ = ax + 65, ay + 70 if by > ay else ay + 35, bx + 65, by if by > ay else by + 35
    line(xa, ya, xb, yb_, "#333333")
    ang = math.atan2(yb_ - ya, xb - xa)
    for s in (-1, 1):
        line(xb, yb_, xb - 14 * math.cos(ang + s * 0.5), yb_ - 14 * math.sin(ang + s * 0.5), "#333333")
for i in range(4):
    stroke(560, 160 + i * 30, rnd.randint(30, 60), 6, "#d93a2b")

# ---------------------------------------------------------------- lights
# Placed in metres like the props. Every distance grows by S on the way into app units, so the
# power grows by S^2 to keep the same irradiance.
def aim(light, target):
    light.rotation_euler = (Vector(target) - light.location).to_track_quat("-Z", "Y").to_euler()


def light(name, kind, loc, target, power, size, color):
    o = add_light(name, kind, TO_APP @ Vector(loc), power * S * S, color, size=size * S)
    aim(o, TO_APP @ Vector(target))
    return o


# the pendant is the key light: a warm pool on the table, the room falling off into the dark
spot = light("Pendant", "SPOT", (0.0, 0.25, 1.48), (0.0, 0.25, DESK), 25, 0.08, (1.0, 0.78, 0.55))
spot.data.spot_size = math.radians(100)
spot.data.spot_blend = 0.5
light("Fill", "AREA", (-1.6, -1.8, 1.6), (0, 0, DESK), 12, 2.5, (0.75, 0.8, 1.0))
# screen spill onto the keyboard and desk in front; an area light emits one way, so it does not
# light the glass itself (the glass bakes dark, the app draws the OS over it)
glow = light("ScreenGlow", "AREA", (0, IMAC_Y - 0.07, DESK + SCR_Z), (0, IMAC_Y - 1.0, DESK + SCR_Z), 3, 0, (0.7, 0.85, 1.0))
glow.data.shape = "RECTANGLE"
glow.data.size, glow.data.size_y = SCR_W * 0.9 * S, SCR_H * 0.9 * S
light("ScreenSpill", "AREA", (0.02, -0.12, DESK + 0.27), (0.25, -0.6, DESK), 6, 0.25, (0.6, 0.8, 1.0))
for i, (loc, target) in enumerate(LAPTOP_GLOWS):
    light(f"LaptopGlow{i}", "AREA", loc, target, 4, 0.25, (0.5, 0.8, 1.0))

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.08, 0.1, 0.2, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.05
scene.world = world

# ---------------------------------------------------------------- into app units, join, lightmap UV
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
for o in meshes:
    assert o.get("group") in GROUPS + (TRANSLUCENT,), f"{o.name} has no group"
    assert not o.modifiers, f"{o.name} still has modifiers"  # the join would drop them
    o.data.transform(TO_APP)
SCREEN_C = TO_APP @ Vector((0, IMAC_Y + GLASS_Y, DESK + SCR_Z))
SCREEN_W, SCREEN_H = SCR_W * S, SCR_H * S

joined = {}
for g in GROUPS + (TRANSLUCENT,):
    objs = [o for o in bpy.data.objects if o.type == "MESH" and o.get("group") == g]
    for o in bpy.data.objects:
        o.select_set(o in objs)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = obj.data.name = g.capitalize()
    joined[g] = obj
shell = joined.pop(TRANSLUCENT)
# the shell is lit live in the app: smooth normals let its curves read as curves (and share
# vertices, which keeps shell.glb small); creases sharper than 40 degrees stay sharp
shell.data.shade_smooth()
shell.data.set_sharp_from_angle(angle=math.radians(40))
used = {}
for g, obj in joined.items():
    for m in obj.data.materials:
        # one bake image per group, written through the material: a shared material would bake twice
        assert used.setdefault(m.name, g) == g, f"material {m.name} is shared between groups"

for g, obj in joined.items():
    mesh = obj.data
    # downward faces resting on the floor or the table: never lit, never seen, they would bake black
    bm = bmesh.new()
    bm.from_mesh(mesh)
    rests = (FLOOR, DESK_TOP)
    hidden = [f for f in bm.faces if f.normal.z < -0.9
              and all(any(abs(v.co.z - r) < 0.02 for r in rests) for v in f.verts)]
    bmesh.ops.delete(bm, geom=hidden, context="FACES")
    bm.to_mesh(mesh)
    bm.free()
    # the app samples the bake through the first UV set, so the lightmap UV is the only one kept
    while mesh.uv_layers:
        mesh.uv_layers.remove(mesh.uv_layers[0])
    mesh.uv_layers.new(name="Lightmap")
    for o in bpy.data.objects:
        o.select_set(o == obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # smart project, equal texel density, a margin wider than the bake margin
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.006)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode="OBJECT")
    shell_ids = {i for i, m in enumerate(mesh.materials) if m.name in SHELL}
    uvl = mesh.uv_layers["Lightmap"].data
    for poly in mesh.polygons:
        if poly.material_index in shell_ids:
            idx = list(poly.loop_indices)
            c = sum((uvl[i].uv for i in idx), Vector((0, 0))) / len(idx)
            for i in idx:
                uvl[i].uv = c + (uvl[i].uv - c) * SHELL_DENSITY
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(margin=0.006, rotate=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    print("GROUP", g, "faces", len(mesh.polygons), "materials", len(mesh.materials), "removed resting faces",
          len(hidden))
print("GROUP shell faces", len(shell.data.polygons))


def denoise(img):
    """Run a baked float image through the compositor's Denoise node (OpenImageDenoise).

    Cycles' own denoiser only works on renders, not bakes. The compositor reads the image
    directly, and the render engine is switched to Workbench for this pass so the scene itself
    is not path traced again. Returns the denoised pixels as a new float image.
    """
    if hasattr(scene, "compositing_node_group"):  # Blender 5.x
        tree = bpy.data.node_groups.new("DenoiseBake", "CompositorNodeTree")
        scene.compositing_node_group = tree
        tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        out = tree.nodes.new("NodeGroupOutput")
        out_socket = out.inputs[0]
    else:  # Blender 4.x
        scene.use_nodes = True
        tree = scene.node_tree
        tree.nodes.clear()
        out = tree.nodes.new("CompositorNodeComposite")
        out_socket = out.inputs["Image"]
    src = tree.nodes.new("CompositorNodeImage")
    src.image = img
    dn = tree.nodes.new("CompositorNodeDenoise")
    if "HDR" in dn.inputs:  # Blender 5.x moved the flag from a property to a socket
        dn.inputs["HDR"].default_value = True
    else:
        dn.use_hdr = True
    tree.links.new(src.outputs["Image"], dn.inputs["Image"])
    tree.links.new(dn.outputs["Image"], out_socket)

    engine = scene.render.engine
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = scene.render.resolution_y = img.size[0]
    scene.render.resolution_percentage = 100
    scene.render.use_compositing = True
    bpy.ops.render.render()
    scene.render.engine = engine

    result = bpy.data.images["Render Result"]
    tmp = os.path.join(ROOT, "blender", "cache", f"{img.name}_denoised.exr")
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    scene.render.image_settings.file_format = "OPEN_EXR"
    result.save_render(tmp, scene=scene)
    clean = bpy.data.images.load(tmp)
    clean.name = f"{img.name}_denoised"
    return clean


# ---------------------------------------------------------------- bake all three in one pass
images = {}
for g, obj in joined.items():
    # float buffer: an 8-bit image would clamp the bake at 1.0
    images[g] = img = bpy.data.images.new(g, SIZE, SIZE, alpha=False, float_buffer=True)
    for m in obj.data.materials:
        m.use_nodes = True
        node = m.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        node.name = "BakeTarget"
        m.node_tree.nodes.active = node  # Cycles bakes into the active image node

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = False
scene.render.bake.margin = 8
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_diffuse = True
scene.render.bake.use_pass_emit = True
# glossy is view-dependent: baked into a texture it would show highlights seen from nowhere
scene.render.bake.use_pass_glossy = False
scene.render.bake.use_pass_transmission = False
for o in bpy.data.objects:
    o.select_set(o in joined.values())
bpy.context.view_layer.objects.active = joined["computer"]
print("BAKE start", SIZE, SAMPLES)
bpy.ops.object.bake(type="COMBINED")
print("BAKE done")
if os.environ.get("BAKE_DENOISE", "1") == "1":
    images = {g: denoise(img) for g, img in images.items()}
    print("DENOISE done")

scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = float(os.environ.get("BAKE_EXPOSURE", -1.0))
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 90
for g, img in images.items():
    img.save_render(os.path.join(OUT, f"{g}.jpg"), scene=scene)
for obj in joined.values():
    for m in obj.data.materials:
        if "BakeTarget" in m.node_tree.nodes:
            m.node_tree.nodes.remove(m.node_tree.nodes["BakeTarget"])

# ---------------------------------------------------------------- Screen + ScreenAnchor
comp = joined["computer"]
for o in bpy.data.objects:
    o.select_set(o == comp)
bpy.context.view_layer.objects.active = comp
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="DESELECT")
comp.active_material_index = [m.name for m in comp.data.materials].index("Screen")
bpy.ops.object.material_slot_select()
bpy.ops.mesh.separate(type="SELECTED")
bpy.ops.object.mode_set(mode="OBJECT")
screen = next(o for o in bpy.context.selected_objects if o != comp)
# the plane's own mesh is left orphaned by the join and still holds the name "Screen"
if "Screen" in bpy.data.meshes:
    bpy.data.meshes.remove(bpy.data.meshes["Screen"])
screen.name = screen.data.name = "Screen"

anchor = bpy.data.objects.new("ScreenAnchor", None)
scene.collection.objects.link(anchor)
anchor.location = SCREEN_C
# glTF export turns Blender local -Y into glTF local +Z: with no rotation, local +Z is the normal
# of the upright glass. The concept stands the computer square on its feet, so there is no tilt.
anchor.rotation_euler = (0, 0, 0)
anchor["width"] = SCREEN_W
anchor["height"] = SCREEN_H

# ---------------------------------------------------------------- export one GLB per group
for g, obj in joined.items():
    objs = [obj] + ([screen, anchor] if g == "computer" else [])
    for o in bpy.data.objects:
        o.select_set(o in objs)
    path = os.path.join(OUT, f"{g}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_extras=True,
                              export_texcoords=True, export_apply=False, export_lights=False,
                              export_cameras=False)
    print("EXPORTED", path, os.path.getsize(path), os.path.getsize(os.path.join(OUT, f"{g}.jpg")))
# the translucent shell, with its material: the app renders it live over the baked chassis
for o in bpy.data.objects:
    o.select_set(o == shell)
path = os.path.join(OUT, "shell.glb")
bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_texcoords=False,
                          export_normals=True, export_apply=False, export_lights=False, export_cameras=False)
print("EXPORTED", path, os.path.getsize(path))
print("ANCHOR", tuple(round(c, 4) for c in SCREEN_C), "width", round(SCREEN_W, 4), "height", round(SCREEN_H, 4))
sys.stdout.flush()
