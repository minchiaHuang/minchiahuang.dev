"""v2 scene: a retro desk with a scripted CRT, built from scratch, baked into three lightmaps.

Run from the repo root:
    /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/scene_v2.py

Writes blender/out/v2/{computer,environment,decor}.{glb,jpg}, the same three groups the app
loads today, so wiring it in only changes file paths.

Units are the app's glTF units (the app scales every mesh by 900), not metres: 1 unit is
about 0.27 m. The frame was measured from the current app models: floor at glTF y = -3.32,
desk top at y = -0.50, screen centre at (0, 1.056, 0.283). Blender is z-up, so a glTF point
(x, y, z) is (x, -z, y) here and the viewer side (glTF +z) is Blender -y.

Environment overrides (handy for quick tests):
    BAKE_SIZE=512 BAKE_SAMPLES=8 BAKE_DEBUG=1 ... Blender -b -P blender/scene_v2.py
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True  # no __pycache__ next to the scripts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import add_light, bbox, place  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "blender", "assets")
OUT = os.path.join(ROOT, "blender", "out", "v2")
SIZE = int(os.environ.get("BAKE_SIZE", 2048))
SAMPLES = int(os.environ.get("BAKE_SAMPLES", 256))
SHELL_DENSITY = 0.4  # floor/wall texel density relative to props
GROUPS = ("computer", "environment", "decor")
os.makedirs(OUT, exist_ok=True)

FLOOR = -3.32
DESK_TOP = -0.50
CASE_TOP = 0.0  # the CRT stands on a desktop case, like the old app's computer block
# screen opening (glTF units) and its centre, in Blender coordinates
SCREEN_W, SCREEN_H = 1.42, 1.14
SCREEN_C = Vector((0.0, -0.283, 1.056))
TILT = math.radians(-3)  # about x: the top leans away from the viewer, as in MonitorScreen.ts

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ---------------------------------------------------------------- materials
def srgb(hex_color):
    """'#rrggbb' -> linear RGBA, so colours can be picked by eye."""
    c = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)


def mat(name, hex_color, rough=0.8, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = srgb(hex_color)
    p.inputs["Roughness"].default_value = rough
    if emit:
        p.inputs["Emission Color"].default_value = srgb(hex_color)
        p.inputs["Emission Strength"].default_value = emit
    return m


# ---------------------------------------------------------------- mesh builders
# Every builder writes world-space vertices into an object at the origin: joined groups then
# keep their origin at 0, which the app relies on (it scales each mesh about its own origin).
def to_object(name, bm, material, group):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    me.materials.append(material)
    o["group"] = group
    return o


def drop_bottom(bm):
    """Remove the face a part rests on: never lit, never seen, it would only bake black."""
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z < -0.99], context="FACES")


def finish(bm, loc, rot, bottom):
    if not bottom:
        bm.normal_update()
        drop_bottom(bm)
    if rot:
        bmesh.ops.rotate(bm, verts=bm.verts, matrix=Matrix.Rotation(rot, 3, "Z"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(loc))


def box(name, size, loc, material, group, bevel=0.0, segments=2, rot=0.0, bottom=False):
    """Box with its base centred on loc (x, y, z = bottom)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, 0, size[2] / 2)))
    if bevel:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=segments, affect="EDGES",
                        profile=0.5, clamp_overlap=True)
    finish(bm, loc, rot, bottom)
    return to_object(name, bm, material, group)


def frustum(name, bottom_wh, top_wh, height, loc, material, group, rot=0.0, bottom=False):
    """Tapered box (key caps, lamp base); base centred on loc."""
    bm = bmesh.new()
    vs = []
    for (w, d), z in ((bottom_wh, 0.0), (top_wh, height)):
        for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            vs.append(bm.verts.new((x * w / 2, y * d / 2, z)))
    bm.faces.new(vs[3::-1])
    bm.faces.new(vs[4:])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vs[i], vs[j], vs[4 + j], vs[4 + i]))
    finish(bm, loc, rot, bottom)
    return to_object(name, bm, material, group)


def cylinder(name, r, h, loc, material, group, r_top=None, segments=24, bottom=False, top=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=r,
                          radius2=r if r_top is None else r_top, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, 0, h / 2)))
    bm.normal_update()
    if not top:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.99], context="FACES")
    finish(bm, loc, 0.0, bottom)
    return to_object(name, bm, material, group)


def rod(name, a, b, r, material, group, segments=12):
    """Cylinder from point a to point b (lamp arms, chair column)."""
    a, b = Vector(a), Vector(b)
    o = cylinder(name, r, (b - a).length, (0, 0, 0), material, group, segments=segments, bottom=True)
    q = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    o.data.transform(Matrix.Translation(a) @ q.to_matrix().to_4x4())
    return o


def transform(objs, matrix):
    for o in objs:
        o.data.transform(matrix)


def plane(name, size, loc, rot, material, group):
    """One-sided quad for the room shell (see bake.py: a closed box bakes its unseen sides)."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=Vector((size[0], size[1], 1)), verts=bm.verts)
    bmesh.ops.rotate(bm, verts=bm.verts, matrix=rot.to_matrix())
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(loc))
    return to_object(name, bm, material, group)


# ---------------------------------------------------------------- room shell
FLOOR_X, FLOOR_Y = (-7.0, 6.0), (-8.0, 1.6)  # Blender x, y; back wall at y = 1.6, right wall at x = 6
WALL_TOP = 4.5
# Walls stand on the two far sides of the idle camera (it looks from -x, front), so they never
# hide the desk; the open sides show the app's background, like a diorama.
SHELL = ("Floor", "WallBack", "WallRight")
m_floor = mat("Floor", "#5b4535", 0.7)
m_wall = mat("WallBack", "#cfc4b1", 0.9)
m_wall_r = mat("WallRight", "#c4c8b8", 0.9)
cx, cy = sum(FLOOR_X) / 2, sum(FLOOR_Y) / 2
wx, wy, wh = FLOOR_X[1] - FLOOR_X[0], FLOOR_Y[1] - FLOOR_Y[0], WALL_TOP - FLOOR
plane("Floor", (wx, wy), (cx, cy, FLOOR), Matrix.Identity(3).to_quaternion(), m_floor, "environment")
plane("WallBack", (wx, wh), (cx, FLOOR_Y[1], FLOOR + wh / 2),
      Matrix.Rotation(math.pi / 2, 3, "X").to_quaternion(), m_wall, "environment")
plane("WallRight", (wh, wy), (FLOOR_X[1], cy, FLOOR + wh / 2),
      Matrix.Rotation(-math.pi / 2, 3, "Y").to_quaternion(), m_wall_r, "environment")
m_skirt = mat("Skirting", "#e9e2d3", 0.6)
box("SkirtBack", (wx, 0.06, 0.35), (cx, FLOOR_Y[1] - 0.03, FLOOR), m_skirt, "environment")
box("SkirtRight", (0.06, wy - 0.06, 0.35), (FLOOR_X[1] - 0.03, cy - 0.03, FLOOR), m_skirt,
    "environment")
m_rug = mat("Rug", "#7b3e35", 0.95)
box("Rug", (4.6, 3.6, 0.025), (0.3, -2.9, FLOOR), m_rug, "environment", bevel=0.01, segments=1)

# ---------------------------------------------------------------- desk
m_wood = mat("DeskWood", "#9a6a45", 0.55)
m_wood_dark = mat("DeskWoodDark", "#7c5236", 0.6)
m_metal = mat("Handle", "#c9c3b5", 0.3)
DESK_X, DESK_Y = (-3.7, 3.7), (-1.85, 1.35)
box("DeskTop", (DESK_X[1] - DESK_X[0], DESK_Y[1] - DESK_Y[0], 0.16), (0, sum(DESK_Y) / 2, DESK_TOP - 0.16),
    m_wood, "environment", bevel=0.03, bottom=True)
leg_h = DESK_TOP - 0.16 - FLOOR
box("DeskSide", (0.14, 3.0, leg_h), (-3.5, -0.25, FLOOR), m_wood, "environment", bevel=0.01, segments=1)
box("DeskBack", (5.3, 0.1, 1.6), (-0.75, 1.15, DESK_TOP - 0.16 - 1.6), m_wood_dark, "environment",
    bottom=True)
# drawer pedestal on the right
box("Pedestal", (1.7, 3.0, leg_h), (2.75, -0.25, FLOOR), m_wood, "environment", bevel=0.01, segments=1)
drawer_h = (leg_h - 0.25) / 3
for i in range(3):
    z = FLOOR + 0.15 + i * drawer_h + 0.04
    box(f"Drawer{i}", (1.5, 0.04, drawer_h - 0.08), (2.75, -1.77, z), m_wood_dark, "environment",
        bevel=0.01, segments=1, bottom=True)
    box(f"DrawerHandle{i}", (0.5, 0.05, 0.05), (2.75, -1.81, z + drawer_h - 0.3), m_metal, "environment",
        bevel=0.01, segments=1, bottom=True)

# ---------------------------------------------------------------- chair
m_fabric = mat("ChairFabric", "#3b4150", 0.9)
m_black = mat("ChairBase", "#26272b", 0.4)
CHAIR = Vector((0.5, -3.0, 0))
chair = []
for i in range(5):
    a = math.radians(18 + i * 72)
    tip = CHAIR + Vector((math.cos(a), math.sin(a), 0)) * 0.85
    chair.append(rod(f"ChairLeg{i}", (CHAIR.x, CHAIR.y, FLOOR + 0.2), (tip.x, tip.y, FLOOR + 0.14), 0.06,
                     m_black, "environment", segments=8))
    chair.append(cylinder(f"ChairCaster{i}", 0.08, 0.12, (tip.x, tip.y, FLOOR + 0.025), m_black, "environment",
                          segments=12))
chair.append(rod("ChairColumn", (CHAIR.x, CHAIR.y, FLOOR + 0.15), (CHAIR.x, CHAIR.y, -1.95), 0.08, m_black,
                 "environment"))
chair.append(box("ChairSeat", (1.55, 1.45, 0.24), (CHAIR.x, CHAIR.y, -1.97), m_fabric, "environment",
                 bevel=0.08, segments=3, bottom=True))
chair.append(box("ChairPost", (0.18, 0.08, 1.0), (CHAIR.x, CHAIR.y - 0.72, -1.95), m_black, "environment",
                 bottom=True))
chair.append(box("ChairBack", (1.4, 0.2, 1.25), (CHAIR.x, CHAIR.y - 0.8, -1.05), m_fabric, "environment",
                 bevel=0.08, segments=3, bottom=True))
# turned a little towards the viewer's left, so it reads as pushed back, not parked
transform(chair, Matrix.Translation(CHAIR) @ Matrix.Rotation(math.radians(-14), 4, "Z")
          @ Matrix.Translation(-CHAIR))

# ---------------------------------------------------------------- computer: case, CRT, keyboard, mouse
m_beige = mat("CaseBeige", "#d6cdb6", 0.6)
m_beige_dark = mat("CaseBeigeDark", "#b9ae95", 0.65)
m_slot = mat("CaseSlot", "#2b2a28", 0.5)
m_led = mat("LedGreen", "#4dff7a", 0.4, emit=4.0)
m_led_amber = mat("LedAmber", "#ffb43a", 0.4, emit=3.0)
m_screen = mat("Screen", "#0c1210", 0.35)

# desktop case under the monitor (old app block: x -0.85..0.89, z -0.96..0.83 glTF)
CASE_Y = (-0.85, 0.95)
box("Case", (1.8, CASE_Y[1] - CASE_Y[0], CASE_TOP - DESK_TOP), (0, sum(CASE_Y) / 2, DESK_TOP), m_beige,
    "computer", bevel=0.03)
front = CASE_Y[0]
for i, z in enumerate((-0.25, -0.38)):  # two 5.25" bays, the lower one with a floppy slot
    box(f"Bay{i}", (0.82, 0.012, 0.1), (-0.32, front - 0.006, z), m_beige_dark, "computer", bottom=True)
    box(f"BaySlot{i}", (0.6, 0.012, 0.018), (-0.32, front - 0.012, z + 0.04), m_slot, "computer",
        bottom=True)
box("CasePower", (0.12, 0.03, 0.08), (0.62, front - 0.015, -0.33), m_beige_dark, "computer", bevel=0.01,
    segments=1, bottom=True)
box("CaseLed", (0.04, 0.012, 0.02), (0.78, front - 0.006, -0.3), m_led_amber, "computer", bottom=True)
for i in range(6):
    box(f"CaseVent{i}", (0.02, 0.012, 0.16), (0.25 + i * 0.05, front - 0.006, -0.4), m_slot, "computer",
        bottom=True)



def loft(name, rects, material, group, front_cap=True, bevel=0.0):
    """Join rectangles (w, h, y, z_centre), front to back along +y: the CRT's tapered back."""
    bm = bmesh.new()
    rings = [[bm.verts.new((sx * w / 2, y, z + sz * h / 2)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
             for w, h, y, z in rects]
    if front_cap:
        bm.faces.new(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((b[i], b[j], a[j], a[i]))
    bm.faces.new(rings[-1][::-1])
    if bevel:
        edges = [e for e in bm.edges if not (not front_cap and all(v in rings[0] for v in e.verts))]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, affect="EDGES", profile=0.5,
                        clamp_overlap=True)
    return to_object(name, bm, material, group)


# CRT, built upright around the screen centre, then tilted back 3 degrees as one piece
crt = []
BEZEL_SIDE, BEZEL_TOP, CHIN, RECESS = 0.21, 0.2, 0.33, 0.05
SHELL_DEPTH = 0.5
x0, x1 = -SCREEN_W / 2 - BEZEL_SIDE, SCREEN_W / 2 + BEZEL_SIDE
z0, z1 = SCREEN_C.z - SCREEN_H / 2 - CHIN, SCREEN_C.z + SCREEN_H / 2 + BEZEL_TOP
sx0, sx1 = -SCREEN_W / 2, SCREEN_W / 2
sz0, sz1 = SCREEN_C.z - SCREEN_H / 2, SCREEN_C.z + SCREEN_H / 2
yf = SCREEN_C.y - RECESS  # bezel front face; the glass sits RECESS behind it
yb = yf + SHELL_DEPTH
# Front shell: a box whose front face has the screen opening cut through to the glass. Vertex
# order is counter-clockwise seen from the front, so every face below points outward (into the
# opening for its inner walls) without a normal recalculation, which the open hole can confuse.
bm = bmesh.new()
quad = ((0, 0), (1, 0), (1, 1), (0, 1))
outer_f = [bm.verts.new(((x0, x1)[i], yf, (z0, z1)[k])) for i, k in quad]
outer_b = [bm.verts.new(((x0, x1)[i], yb, (z0, z1)[k])) for i, k in quad]
hole_f = [bm.verts.new(((sx0, sx1)[i], yf, (sz0, sz1)[k])) for i, k in quad]
hole_b = [bm.verts.new(((sx0, sx1)[i], SCREEN_C.y, (sz0, sz1)[k])) for i, k in quad]
for i in range(4):
    j = (i + 1) % 4
    bm.faces.new((outer_f[i], outer_f[j], hole_f[j], hole_f[i]))  # bezel
    bm.faces.new((hole_f[i], hole_f[j], hole_b[j], hole_b[i]))  # opening walls down to the glass
    bm.faces.new((outer_b[i], outer_b[j], outer_f[j], outer_f[i]))  # sides, top, bottom
bm.faces.new(outer_b[::-1])
# round only the outer edges: beveling the opening would shrink the visible screen
outer = set(outer_f + outer_b)
bmesh.ops.bevel(bm, geom=[e for e in bm.edges if all(v in outer for v in e.verts)], offset=0.07,
                segments=3, affect="EDGES", profile=0.5, clamp_overlap=True)
crt.append(to_object("CrtFront", bm, m_beige, "computer"))
# chunky tube housing, tapering toward the wall; its front ring hides inside the shell
cz = (z0 + z1) / 2 + 0.03
crt.append(loft("CrtBack", [((x1 - x0) - 0.18, (z1 - z0) - 0.18, yb - 0.05, cz),
                            ((x1 - x0) - 0.3, (z1 - z0) - 0.3, yb + 0.25, cz),
                            (0.95, 0.82, yb + 1.0, cz + 0.05)],
                m_beige, "computer", front_cap=False, bevel=0.04))
for i in range(7):  # vent slots on top of the housing
    crt.append(box(f"CrtVent{i}", (0.9, 0.04, 0.012), (0, yb + 0.12 + i * 0.1, z1 - 0.15 - i * 0.033),
                   m_slot, "computer", bottom=True))
# chin: power button, LED and two adjustment knobs; no badge or brand text
chin_z = z0 + CHIN / 2 - 0.02
crt.append(box("CrtPower", (0.16, 0.03, 0.09), (x1 - 0.32, yf - 0.03, chin_z - 0.045), m_beige_dark,
               "computer", bevel=0.012, segments=1, bottom=True))
crt.append(box("CrtLed", (0.035, 0.015, 0.035), (x1 - 0.52, yf - 0.015, chin_z - 0.017), m_led, "computer",
               bottom=True))
for i in range(2):
    knob = cylinder(f"CrtKnob{i}", 0.04, 0.03, (0, 0, 0), m_beige_dark, "computer", segments=12, bottom=True)
    knob.data.transform(Matrix.Translation((x0 + 0.3 + i * 0.13, yf, chin_z))
                        @ Matrix.Rotation(math.pi / 2, 4, "X"))
    crt.append(knob)
# the glass: flat and dark, its own mesh after the bake (the app lays the OS iframe over it)
crt.append(plane("Screen", (SCREEN_W, SCREEN_H), SCREEN_C, Matrix.Rotation(math.pi / 2, 3, "X").to_quaternion(),
                 m_screen, "computer"))
transform(crt, Matrix.Translation(SCREEN_C) @ Matrix.Rotation(TILT, 4, "X") @ Matrix.Translation(-SCREEN_C))
# swivel foot, level on the case (not tilted); it tucks a little into the tilted shell
box("CrtFoot", (1.15, 0.85, z0 - CASE_TOP + 0.03), (0, yf + 0.4, CASE_TOP), m_beige_dark, "computer",
    bevel=0.04)

# keyboard: a wedge with tapered key caps, in front of the case (old app: x -1.11..0.67)
KB_X, KB_Y, KB_W, KB_D = -0.2, -1.43, 1.86, 0.66
kb = box("Keyboard", (KB_W, KB_D, 0.07), (KB_X, KB_Y, DESK_TOP), m_beige, "computer")
for v in kb.data.vertices:  # raise the back edge so the board slopes toward the user
    if v.co.y > KB_Y and v.co.z > DESK_TOP + 0.01:
        v.co.z += 0.05
m_key = mat("Key", "#c9bfa8", 0.6)
m_key_mod = mat("KeyMod", "#8e877a", 0.6)
PITCH = 0.112
y_front = KB_Y - KB_D / 2
for r in range(5):
    y = y_front + 0.1 + r * PITCH
    z = DESK_TOP + 0.07 + 0.05 * (y - y_front) / KB_D
    if r == 0:  # space bar row
        keys = [(-5.5, 1.5, True), (-3.5, 1.5, True), (0.0, 5.0, False), (3.5, 1.5, True), (5.5, 1.5, True)]
    else:
        keys = [(c - 6.5, 1.0, c in (0, 13)) for c in range(14)]
    for k, (c, w, mod) in enumerate(keys):
        frustum(f"Key{r}_{k}", (w * PITCH - 0.018, PITCH - 0.018), (w * PITCH - 0.04, PITCH - 0.04), 0.045,
                (KB_X + c * PITCH, y, z - 0.01), m_key_mod if mod else m_key, "computer")
# mouse
m_mouse_line = mat("MouseLine", "#8e877a", 0.6)
mouse = [box("Mouse", (0.27, 0.42, 0.11), (0.95, -1.45, DESK_TOP + 0.012), m_beige, "computer", bevel=0.05,
             segments=3),
         box("MouseSplit", (0.008, 0.15, 0.004), (0.95, -1.57, DESK_TOP + 0.12), m_mouse_line, "computer",
             bottom=True)]
transform(mouse, Matrix.Translation((0.95, -1.45, 0)) @ Matrix.Rotation(math.radians(-8), 4, "Z")
          @ Matrix.Translation((-0.95, 1.45, 0)))

# ---------------------------------------------------------------- decor
K = os.path.join(ASSETS, "kenney")


def fit(path, x, y, z, height, rot_z=0.0):
    """place() a Kenney model, then scale it about its base to the given height."""
    new = place(path, x, y, z, rot_z=rot_z)
    lo, hi = bbox(new)
    s = height / (hi.z - lo.z)
    base = Vector((x, y, z))
    for r in (o for o in new if o.parent is None):
        r.scale *= s
        r.location = base + (r.location - base) * s
    for o in new:
        o["group"] = "decor"
    return new


fit(os.path.join(K, "books.glb"), 2.45, 0.55, DESK_TOP, 0.5, rot_z=-0.25)


def leaf(name, height, width, material):
    """A snake-plant blade: a thin closed sliver, widest a third of the way up, pointed at the
    top. Closed rather than a single quad strip, because the app culls back faces."""
    bm = bmesh.new()
    rings = [[bm.verts.new((sx * w / 2, sy * 0.025, t * height)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
             for t, w in ((0.0, width * 0.6), (0.35, width), (0.75, width * 0.7))]
    tip = bm.verts.new((0, 0, height))
    for a, b in zip(rings, rings[1:]):
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((a[i], a[j], b[j], b[i]))
    for i in range(4):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % 4], tip))
    return to_object(name, bm, material, "decor")


# snake plant in a terracotta pot, in the back corner out of the window light's reach (a plant
# right in front of it over-lit its leaves and threw a green glow onto the wall)
POT = Vector((4.9, 0.6, FLOOR))
POT_H = 1.1
cylinder("Pot", 0.42, POT_H, POT, mat("Pot", "#b5653f", 0.85), "decor", r_top=0.55, segments=20)
cylinder("PotRim", 0.6, 0.14, POT + Vector((0, 0, POT_H - 0.14)), mat("PotRim", "#a75a37", 0.85), "decor",
         segments=20, bottom=True)
cylinder("Soil", 0.52, 0.01, POT + Vector((0, 0, POT_H)), mat("Soil", "#3b2a1e", 1.0), "decor", segments=20)
m_leaf = (mat("Leaf", "#4a7040", 0.6), mat("LeafLight", "#6f8a45", 0.6))
golden = math.pi * (3 - math.sqrt(5))  # spreads the blades evenly round the pot
for i in range(9):
    yaw = i * golden
    h = 1.7 + 0.9 * ((i * 0.618) % 1)  # deterministic spread of heights, no random seed
    blade = leaf(f"Leaf{i}", h, 0.26, m_leaf[i % 2])
    # tilting about x leans the blade toward local -y; the extra quarter turn points that outward
    r = 0.12 + 0.2 * ((i * 0.382) % 1)
    blade.data.transform(Matrix.Translation(POT + Vector((r * math.cos(yaw), r * math.sin(yaw), POT_H - 0.05)))
                         @ Matrix.Rotation(yaw + math.pi / 2, 4, "Z") @ Matrix.Rotation(math.radians(6 + 14 * r / 0.32), 4, "X"))

box("Mousepad", (0.78, 0.82, 0.012), (0.95, -1.42, DESK_TOP), mat("Mousepad", "#2c4a63", 0.9), "decor",
    bevel=0.005, segments=1)
# mug where the app's coffee steam rises (CoffeeSteam.ts: 1670, 200, 900 -> x 1.86, y -1.0)
m_mug = mat("Mug", "#e9e3d6", 0.35)
cylinder("Mug", 0.17, 0.48, (1.86, -1.0, DESK_TOP), m_mug, "decor", segments=32)
cylinder("Coffee", 0.145, 0.004, (1.86, -1.0, DESK_TOP + 0.48), mat("Coffee", "#3a2414", 0.2), "decor",
         segments=32)
bpy.ops.mesh.primitive_torus_add(major_radius=0.11, minor_radius=0.028, major_segments=24, minor_segments=8,
                                 location=(1.86 + 0.17, -1.0, DESK_TOP + 0.25), rotation=(math.pi / 2, 0, 0))
handle = bpy.context.object
handle.name = "MugHandle"
handle.data.materials.append(m_mug)
handle["group"] = "decor"

# desk lamp, back left, shade aimed at the keyboard
m_lamp = mat("Lamp", "#2f6b66", 0.4)
LAMP = Vector((-2.75, 0.55, DESK_TOP))
frustum("LampBase", (0.5, 0.5), (0.4, 0.4), 0.08, LAMP, m_lamp, "decor")
elbow = Vector((-2.6, 0.3, 1.25))
joint = Vector((-2.1, -0.25, 1.1))
rod("LampArm1", LAMP + Vector((0, 0, 0.08)), elbow, 0.035, m_lamp, "decor")
rod("LampArm2", elbow, joint, 0.035, m_lamp, "decor")
axis = Vector((-0.2, 0.35, 0.9)).normalized()  # shade axis, opening -> top
shade = cylinder("LampShade", 0.34, 0.45, (0, 0, 0), m_lamp, "decor", r_top=0.1, segments=24)
shade.data.transform(Matrix.Translation(joint - axis * 0.45)
                     @ Vector((0, 0, 1)).rotation_difference(axis).to_matrix().to_4x4())
lamp_mouth = joint - axis * 0.5

# floppy disks and a notepad
for i, (hex_color, a) in enumerate((("#1f1f22", 0.2), ("#2d4f8c", -0.1), ("#8a8f96", 0.35))):
    disk = [box(f"Floppy{i}", (0.33, 0.33, 0.012), (0, 0, DESK_TOP + i * 0.013), mat(f"Floppy{i}", hex_color, 0.5),
                "decor", bottom=i > 0),
            box(f"FloppyLabel{i}", (0.24, 0.12, 0.002), (0, 0.08, DESK_TOP + i * 0.013 + 0.012),
                mat(f"FloppyLabel{i}", "#efe9dc", 0.8), "decor")]
    transform(disk, Matrix.Translation((-1.55, -1.25, 0)) @ Matrix.Rotation(a, 4, "Z"))
pad = [box("Notepad", (0.7, 0.95, 0.03), (0, 0, DESK_TOP), mat("Notepad", "#f1ead2", 0.85), "decor"),
       rod("Pencil", (-0.15, -0.25, DESK_TOP + 0.045), (0.2, 0.35, DESK_TOP + 0.045), 0.015,
           mat("Pencil", "#e8b730", 0.6), "decor", segments=6)]
transform(pad, Matrix.Translation((-2.45, -0.95, 0)) @ Matrix.Rotation(0.18, 4, "Z"))

# a striped sunset print on the back wall, behind and left of the monitor
WALL_Y = FLOOR_Y[1]
box("PosterFrame", (2.3, 0.05, 1.7), (-2.4, WALL_Y - 0.025, 1.2), mat("PosterFrame", "#2a2523", 0.5), "decor",
    bottom=True)
for i, hex_color in enumerate(("#f2c14e", "#f08a4b", "#d1495b", "#6b3f6e")):
    box(f"PosterBand{i}", (2.1, 0.02, 0.375), (-2.4, WALL_Y - 0.06, 1.3 + i * 0.375),
        mat(f"PosterBand{i}", hex_color, 0.8), "decor", bottom=True)

# ---------------------------------------------------------------- lights
# Lights are in app units (about 3.8x metres), so the bake.py wattages scale by about 3.8^2.
add_light("Window", "AREA", (5.7, -2.6, 1.8), 1300, (1.0, 0.9, 0.78), size=3.5, rot=(0, math.pi / 2, 0))


def aim(light, target):
    light.rotation_euler = (Vector(target) - light.location).to_track_quat("-Z", "Y").to_euler()


aim(add_light("Fill", "AREA", (-5.0, -7.0, 5.0), 900, (0.8, 0.88, 1.0), size=6.0), (0, -1, -1))
add_light("Ceiling", "AREA", (0, -1.5, 4.4), 500, (1.0, 0.95, 0.88), size=4.0)
spot = add_light("LampBulb", "SPOT", lamp_mouth, 150, (1.0, 0.78, 0.5), size=0.08)
spot.data.spot_size = math.radians(100)
spot.data.spot_blend = 0.5
aim(spot, lamp_mouth - axis)
# faint phosphor glow onto the keyboard; an area light emits one way, so the glass stays dark
glow = add_light("ScreenGlow", "AREA", SCREEN_C + Vector((0, -0.03, 0)), 25, (0.6, 0.9, 0.8))
glow.data.shape = "RECTANGLE"
glow.data.size, glow.data.size_y = SCREEN_W * 0.9, SCREEN_H * 0.9
glow.rotation_euler = (math.pi / 2 + TILT, 0, 0)

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.5, 0.55, 0.65, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.2
scene.world = world

# ---------------------------------------------------------------- join each group + lightmap UV
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
for o in meshes:
    assert o.get("group") in GROUPS, f"{o.name} has no group"
for o in bpy.data.objects:
    o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
# the Kenney imports come in parented under empties with transforms: bake them into the vertices
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o.type == "EMPTY":
        bpy.data.objects.remove(o)

joined = {}
for g in GROUPS:
    objs = [o for o in bpy.data.objects if o.type == "MESH" and o.get("group") == g]
    for o in bpy.data.objects:
        o.select_set(o in objs)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = obj.data.name = g.capitalize()
    joined[g] = obj
used = {}
for g, obj in joined.items():
    for m in obj.data.materials:
        # one bake image per group, written through the material: a shared material would bake twice
        assert used.setdefault(m.name, g) == g, f"material {m.name} is shared between groups"

for g, obj in joined.items():
    mesh = obj.data
    # downward faces resting on the floor, desk or case (the Kenney models' undersides)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    rests = (FLOOR, DESK_TOP, CASE_TOP)
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
    # same recipe as bake.py: smart project, equal texel density, a margin wider than the bake margin
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
    print("GROUP", g, "faces", len(mesh.polygons), "removed resting faces", len(hidden))

# ---------------------------------------------------------------- bake all three in one pass
images = {}
for g, obj in joined.items():
    # float buffer: an 8-bit image would clamp the bake at 1.0 (see the bake.py notes)
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
# glTF export turns Blender local -Y into glTF local +Z, so this makes local +Z the screen normal
anchor.rotation_euler = (TILT, 0, 0)
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
sys.stdout.flush()
