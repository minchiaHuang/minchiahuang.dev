"""Check the v2 bake output: lightmap UV overlap, black texels, noise, texel density.

Run from the repo root after scene_v2.py, naming one group:
    LIGHTMAP=v2/computer /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/check_lightmap.py
(v2/computer, v2/environment or v2/decor checks blender/out/<name>.glb against <name>.jpg.)

Rasterises every lightmap-UV triangle at 1024 px (pixel centres, so shared island edges
are not counted) and reports texels covered by more than one triangle. Then samples the
lightmap JPG on the covered texels and reports how many are near black, and how noisy it is.

The Computer group's meshes (Computer + Screen) share one atlas, so they are joined first;
the lightmap is the last UV set.
"""
import os
import sys

import bmesh
import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "blender", "out")
RES = 1024
STEM = os.environ.get("LIGHTMAP")
if not STEM:
    print("set LIGHTMAP=v2/computer|v2/environment|v2/decor")
    sys.exit(2)
GLB, JPG = f"{STEM}.glb", f"{STEM}.jpg"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, GLB))
objs = [o for o in bpy.data.objects if o.type == "MESH"]
for o in bpy.data.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
if len(objs) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
me = obj.data

bm = bmesh.new()
bm.from_mesh(me)
uv = bm.loops.layers.uv[len(bm.loops.layers.uv) - 1]
tris = bm.calc_loop_triangles()

cover = np.zeros((RES, RES), np.uint16)
mat_of = np.full((RES, RES), -1, np.int32)
owner = np.full((RES, RES), -1, np.int32)
mat_texels = {}
mat_area = {}
for t in tris:
    f = t[0].face
    name = me.materials[f.material_index].name if me.materials else "-"
    p = np.array([[l[uv].uv.x, l[uv].uv.y] for l in t]) * RES
    lo = np.floor(p.min(0)).astype(int).clip(0, RES - 1)
    hi = np.ceil(p.max(0)).astype(int).clip(0, RES - 1)
    xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1) + 0.5, np.arange(lo[1], hi[1] + 1) + 0.5)
    (x0, y0), (x1, y1), (x2, y2) = p
    d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
    if abs(d) < 1e-12:
        continue
    a = ((y1 - y2) * (xs - x2) + (x2 - x1) * (ys - y2)) / d
    b = ((y2 - y0) * (xs - x2) + (x0 - x2) * (ys - y2)) / d
    inside = (a > 0) & (b > 0) & (1 - a - b > 0)
    iy = ys[inside].astype(int)
    ix = xs[inside].astype(int)
    cover[iy, ix] += 1
    mat_of[iy, ix] = f.material_index
    # count overlap only between different faces of the mesh
    owner[iy, ix] = np.where((owner[iy, ix] >= 0) & (owner[iy, ix] != f.index), -2, f.index)
    mat_texels[name] = mat_texels.get(name, 0) + int(inside.sum())

for f in bm.faces:
    name = me.materials[f.material_index].name if me.materials else "-"
    mat_area[name] = mat_area.get(name, 0.0) + f.calc_area()

covered = cover > 0
overlap = owner == -2
print(f"faces {len(bm.faces)}  UV coverage {covered.mean():.1%}  "
      f"overlap texels {int(overlap.sum())} ({overlap.sum() / max(covered.sum(), 1):.3%} of covered)")

img = bpy.data.images.load(os.path.join(OUT, JPG))
w, h = img.size
px = np.array(img.pixels[:], np.float32).reshape(h, w, img.channels)[..., :3]
# bpy image rows start at the bottom, same as UV v=0 after glTF import flips v back
# nearest-neighbour resample to RES x RES for any lightmap size
small = px[(np.arange(RES) * h // RES)][:, (np.arange(RES) * w // RES)]
lum = small.mean(-1)
black = covered & (lum < 0.02)
print(f"lightmap {w}x{h}  near-black covered texels {int(black.sum())} "
      f"({black.sum() / max(covered.sum(), 1):.2%})")

# Noise: mean absolute Laplacian of luminance over covered texels whose 4 neighbours are also
# covered (so island borders don't count). Lower is smoother; compare before/after a change.
lum = small @ np.array([0.2126, 0.7152, 0.0722])
inner = covered.copy()
inner[1:-1, 1:-1] &= covered[:-2, 1:-1] & covered[2:, 1:-1] & covered[1:-1, :-2] & covered[1:-1, 2:]
inner[0, :] = inner[-1, :] = inner[:, 0] = inner[:, -1] = False
lap = np.abs(4 * lum[1:-1, 1:-1] - lum[:-2, 1:-1] - lum[2:, 1:-1] - lum[1:-1, :-2] - lum[1:-1, 2:])
print(f"noise (mean |laplacian| on inner covered texels): {lap[inner[1:-1, 1:-1]].mean():.5f}")

full = w / RES
print(f"by material: texel density at {w} px (px per metre), share of its texels near black")
for name, n in sorted(mat_texels.items(), key=lambda kv: -mat_area.get(kv[0], 0)):
    area = mat_area.get(name, 0)
    if area > 0:
        mi = [m.name for m in me.materials].index(name)
        nb = int((black & (mat_of == mi)).sum())
        print(f"  {name:22s} area {area:6.3f} m2  {np.sqrt(n / area) * full:6.0f} px/m"
              f"  black {nb / max(n, 1):6.1%}")
