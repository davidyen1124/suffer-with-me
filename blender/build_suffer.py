# Builds the fluffy thing, what it wears and every prop of the programme as low-poly meshes, and writes
# public/models/suffer.glb.
#
#   /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
#       --python blender/build_suffer.py -- public/models/suffer.glb
#
# The look is an old 3D adventure game: few polygons, small pixel textures, lighting baked into the
# vertices. The file is a box of parts, not a scene: every object sits at the origin with its pivot where
# the page will want to turn it (a shoulder, a hip, the foot of a signpost), and src/stage.js puts the
# little theatres together out of them. Run `node scripts/textures.mjs` first: it draws the textures.
import bpy
import bmesh
import json
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from kit import *  # noqa: E402,F403
from mathutils import Vector, Matrix  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

TEX = os.path.join(HERE, 'tex')
ATLAS = json.load(open(os.path.join(TEX, 'atlas.json')))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else os.path.join(HERE, '..', 'public', 'models', 'suffer.glb'))

FUR = 0xf6efe2       # the page tints it: cream for the guest, pink for the host
FUR_LIGHT = 0xffffff
INK = 0x1a1a22
GOLD = 0xd8b25a
GOLD_DARK = 0x9a7426
CREAM = 0xf3ead6
WHITE = 0xf2efe6
RED = 0xc8323a
YELLOW = 0xf2c230
WOOD = 0x9a6a3a
WOOD_DARK = 0x5b3a1c
STEEL = 0xaab4bf
IRON = 0x2a2a30
TERRACOTTA = 0xc9583a
BLUE = 0x4a6fb5
GRASS = 0x74b43e
EARTH = 0x8a5a34

FLAT_W, FLAT_H = 2.6, 2.1  # the backdrop card (scripts/cook.mjs cuts the paintings to this shape)
STAGE_W, STAGE_BACK, STAGE_FRONT = 1.4, -0.62, 0.8


def L(name, **kw):
    return label_uv(ATLAS, name, **kw)


OBJECTS = []


def obj(name, geo, pivot=(0, 0, 0), parent=None, occluders=(), **extras):
    OBJECTS.append({'name': name, 'geo': geo, 'pivot': Vector(pivot), 'parent': parent, 'extras': extras, 'occluders': occluders})


rnd = random.Random(11)

# ════════════════════════════════════════════════════════════════════════════
# The fluffy thing: a gumdrop of fur with a bare face in a hood, two stub arms, two feet.
# It stands on the origin, a metre tall, facing +Z.
# ════════════════════════════════════════════════════════════════════════════
BODY = Profile([(0.0, 0.0), (0.25, 0.0), (0.36, 0.06), (0.42, 0.18), (0.43, 0.32), (0.40, 0.46), (0.36, 0.56), (0.345, 0.64), (0.35, 0.74), (0.345, 0.84), (0.31, 0.92), (0.22, 0.98), (0.1, 1.01), (0.0, 1.015)])
FACE_Y, FACE_HALF_H, FACE_HALF_PHI = 0.655, 0.155, 0.66

body = Geo()
bv, bf = lathe(BODY.pts, 14)
# pile: nothing on it is quite where a compass would have put it
bv = [(x * k, y + (rnd.random() - 0.5) * 0.012 if 0.02 < y < 0.98 else y, z * k) for (x, y, z), k in ((p, 1 + (rnd.random() - 0.5) * 0.05) for p in bv)]
body.add((bv, bf), 'fur', FUR)
# the trim of the hood: tufts all the way round the face
for i in range(14):
    a = TAU * (i + 0.5) / 14
    m = BODY.frame(FACE_HALF_PHI * 1.1 * math.cos(a), FACE_Y + FACE_HALF_H * 1.14 * math.sin(a), 0.006)
    body.add(ellipsoid(0.062, 0.056, 0.034, 6, 3), 'fur', FUR_LIGHT, m=m @ RZ(rnd.random()))
# ears, a tail, and the tuft that will not lie down
for side in (-1, 1):
    body.add(ellipsoid(0.08, 0.085, 0.055, 7, 4), 'fur', FUR, m=T(side * 0.235, 0.955, -0.02) @ RZ(-side * 0.3))
    body.add(ellipsoid(0.045, 0.05, 0.03, 6, 3), 'fur', 0xf2c9c0, m=T(side * 0.235, 0.958, 0.016) @ RZ(-side * 0.3), ao=False)
body.add(ellipsoid(0.1, 0.1, 0.1, 7, 4), 'fur', FUR_LIGHT, m=T(0, 0.17, -0.43))
for dx, dz, lean in ((0.0, 0.0, 0.0), (-0.05, -0.02, 0.5), (0.05, -0.03, -0.45)):
    body.add(cone(0.034, 0.11, 5), 'fur', FUR_LIGHT, m=T(dx, 0.995, dz) @ RZ(lean) @ RX(-0.25))
obj('body', body)

# the bare face: an oval patch laid on the head, mapped to the first cell of the sheet of faces
face = Geo()
FS = ATLAS['faces']
u0, u1 = 0.03 / FS['size'], (FS['w'] - 0.03) / FS['size']
v0, v1 = 1 - (FS['h'] - 0.03) / FS['size'], 1 - 0.03 / FS['size']
fv, ff, fuv = [], [], []
N = 12
ring_uv = {}
fv.append(tuple(BODY.surf(0, FACE_Y, 0.03)))
centre_uv = ((u0 + u1) / 2, (v0 + v1) / 2)
rings = []
for t in (0.55, 1.0):
    row = []
    for k in range(N):
        a = TAU * k / N
        row.append(len(fv))
        fv.append(tuple(BODY.surf(FACE_HALF_PHI * t * math.cos(a), FACE_Y + FACE_HALF_H * t * math.sin(a), 0.024)))
        ring_uv[len(fv) - 1] = (u0 + (u1 - u0) * (0.5 + 0.5 * t * math.cos(a)), v0 + (v1 - v0) * (0.5 + 0.5 * t * math.sin(a)))
    rings.append(row)
for k in range(N):
    k2 = (k + 1) % N
    ff.append((0, rings[0][k], rings[0][k2]))
    fuv.append([centre_uv, ring_uv[rings[0][k]], ring_uv[rings[0][k2]]])
    q = (rings[0][k], rings[1][k], rings[1][k2], rings[0][k2])
    ff.append(q)
    fuv.append([ring_uv[i] for i in q])
face.add((fv, ff, fuv), 'faces', 0xffffff, ao=False)
obj('face', face, pivot=BODY.surf(0, FACE_Y, 0.024), parent='body')

SHOULDER = {s: Vector((s * 0.365, 0.44, 0.05)) for s in (-1, 1)}
for side, name in ((-1, 'arm_r'), (1, 'arm_l')):
    g = Geo()
    g.add(lathe([(0, -0.26), (0.062, -0.245), (0.09, -0.18), (0.084, 0.0), (0.056, 0.045), (0, 0.06)], 7), 'fur', FUR, m=T(*SHOULDER[side]) @ RZ(side * 0.42))
    obj(name, g, pivot=SHOULDER[side], parent='body', occluders=('body',))

HIP = {s: Vector((s * 0.17, 0.09, 0.04)) for s in (-1, 1)}
for side, name in ((-1, 'foot_r'), (1, 'foot_l')):
    g = Geo()
    g.add(ellipsoid(0.105, 0.062, 0.15, 7, 4), 'fur', 0xf2c9c0, m=T(side * 0.17, 0.058, 0.2) @ RY(side * 0.16))
    obj(name, g, pivot=HIP[side])

# ── what it wears ───────────────────────────────────────────────────────────
# a sweatband (the host never takes it off)
g = Geo()
g.add(lathe([(BODY.radius_at(0.85) + 0.014, 0.85), (BODY.radius_at(0.865) + 0.04, 0.865), (BODY.radius_at(0.915) + 0.04, 0.915), (BODY.radius_at(0.93) + 0.014, 0.93)], 14), 'fabric', YELLOW)
g.add(lathe([(BODY.radius_at(0.88) + 0.044, 0.88), (BODY.radius_at(0.9) + 0.044, 0.9)], 14), 'fabric', WHITE, ao=False)
obj('headband', g, parent='body', occluders=('body',))

# the race number, pinned to the chest
g = Geo()
bw, by0, by1, cols = 0.42, 0.17, 0.41, 3
uv = L('bib')
bv2, bf2, buv2 = [], [], []
for j in range(2):
    for i in range(cols + 1):
        phi = -bw + 2 * bw * i / cols
        bv2.append(tuple(BODY.surf(phi, (by0, by1)[j], 0.03)))
for i in range(cols):
    bf2.append((i, i + 1, cols + 1 + i + 1, cols + 1 + i))
    a, b = i / cols, (i + 1) / cols
    (ua, va), (ub, _), (_, vb), _ = uv
    buv2.append([(ua + (ub - ua) * a, va), (ua + (ub - ua) * b, va), (ua + (ub - ua) * b, vb), (ua + (ub - ua) * a, vb)])
g.add((bv2, bf2, buv2), 'labels', 0xffffff, ao=False)
obj('bib', g, parent='body')

# a medal for taking part
g = Geo()
for side in (-1, 1):
    top = BODY.surf(side * 0.62, 0.55, 0.022)
    bot = BODY.surf(side * 0.08, 0.33, 0.04)
    mid = BODY.surf(side * 0.38, 0.44, 0.03)
    g.add(tube([top, mid, bot], 0.024, 4, up=(0, 0, 1), scale=(0.35, 1)), 'fabric', RED if side < 0 else BLUE)
m = BODY.frame(0, 0.27, 0.05)
g.add(cyl(0.085, 0.085, 0.022, 10), 'metal', GOLD_DARK, m=m @ RX(math.pi / 2))
g.add(disc(0.078, 10, uv_rect=L('medal')), 'labels', 0xffffff, m=m @ T(0, 0, 0.013), ao=False)
obj('medal', g, parent='body', occluders=('body',))

# a nightcap
g = Geo()
o = circle(1.0, 10)
levels = [(0.86, 0.365, 0.0), (0.93, 0.325, 0.0), (1.01, 0.26, 0.02), (1.09, 0.19, 0.07), (1.16, 0.12, 0.15), (1.21, 0.06, 0.25)]
for i in range(len(levels) - 1):
    (ya, ra, da), (yb, rb, db) = levels[i], levels[i + 1]
    g.add(loft(o, [(ya, ra, ra, da, 0), (yb, rb, rb, db, 0)], cap_bottom=False, cap_top=i == len(levels) - 2), 'fabric', BLUE if i % 2 == 0 else WHITE)
g.add(lathe([(0.37, 0.84), (0.4, 0.868), (0.37, 0.896)], 10), 'fur', FUR_LIGHT)
g.add(ellipsoid(0.07, 0.07, 0.07, 6, 4), 'fur', FUR_LIGHT, m=T(0.3, 1.2, 0))
obj('nightcap', g, parent='body', occluders=('body',))

# a folded towel, for sitting in cold water looking pleased
g = Geo()
g.add(box(0.36, 0.07, 0.26), 'fabric', WHITE, m=T(0, 1.045, 0))
for z in (-0.07, 0.07):
    g.add(box(0.365, 0.02, 0.04), 'fabric', BLUE, m=T(0, 1.065, z), ao=False)
obj('towel', g, parent='body', occluders=('body',))


# ════════════════════════════════════════════════════════════════════════════
# The theatre: a floor to stand on, a painted flat behind it, a gold frame round the flat
# ════════════════════════════════════════════════════════════════════════════
def stage_outline(grow=0.0):
    pts = [((STAGE_W + grow) * math.cos(math.pi * k / 12), -0.2 + (STAGE_FRONT + 0.2 + grow) * math.sin(math.pi * k / 12)) for k in range(13)]
    return pts + [(-STAGE_W - grow, STAGE_BACK - grow), (STAGE_W + grow, STAGE_BACK - grow)]


g = Geo()
so = stage_outline()
sv = [(0, 0, 0.1)] + [(x, 0, z) for x, z in so]
suv = lambda x, z: ((x + STAGE_W) / (2 * STAGE_W), (STAGE_FRONT - z) / (STAGE_FRONT - STAGE_BACK))  # noqa: E731
sf, suvs = [], []
for i in range(len(so)):
    j = (i + 1) % len(so)
    sf.append((0, j + 1, i + 1))
    suvs.append([suv(0, 0.1), suv(*so[j]), suv(*so[i])])
g.add((sv, sf, suvs), 'floor', 0xffffff, ao=False)
obj('stage_top', g)

g = Geo()
g.add(loft(so, [(-0.1, 1, 1), (0, 1, 1)], cap_top=False), 'metal', GOLD, smooth=False)
g.add(loft(stage_outline(0.05), [(-0.17, 1, 1), (-0.1, 1, 1)]), 'metal', GOLD_DARK, smooth=False)
obj('stage_rim', g)

# the flat: a card with an arched top, in the XY plane, its foot on the origin
arch = lambda x: 1.45 + (FLAT_H - 1.45) * math.sqrt(max(0.0, 1 - (x / (FLAT_W / 2)) ** 2))  # noqa: E731
g = Geo()
COLS, ROWS = 12, 6
fv, ff, fuv = [], [], []
for i in range(COLS + 1):
    x = -FLAT_W / 2 + FLAT_W * i / COLS
    for j in range(ROWS + 1):
        y = arch(x) * j / ROWS
        fv.append((x, y, 0))
uvp = lambda p: ((p[0] + FLAT_W / 2) / FLAT_W, p[1] / FLAT_H)  # noqa: E731
for i in range(COLS):
    for j in range(ROWS):
        q = (i * (ROWS + 1) + j, (i + 1) * (ROWS + 1) + j, (i + 1) * (ROWS + 1) + j + 1, i * (ROWS + 1) + j + 1)
        ff.append(q)
        fuv.append([uvp(fv[k]) for k in q])
g.add((fv, ff, fuv), 'backdrop', 0xffffff, ao=False)
obj('flat', g)

g = Geo()
path = [(-FLAT_W / 2, -0.1, 0)] + [(-FLAT_W / 2 + FLAT_W * i / 16, arch(-FLAT_W / 2 + FLAT_W * i / 16), 0) for i in range(17)] + [(FLAT_W / 2, -0.1, 0)]
g.add(tube(path, 0.07, 4, up=(0, 0, 1)), 'metal', GOLD)
g.add(tube([(x, y, 0.02) for x, y, _ in path], 0.03, 4, up=(0, 0, 1)), 'metal', 0xf6e3a1, ao=False)
for side in (-1, 1):
    g.add(box(0.24, 0.16, 0.2), 'metal', GOLD_DARK, smooth=False, m=T(side * FLAT_W / 2, 0.0, 0))
    g.add(ellipsoid(0.08, 0.08, 0.08, 6, 4), 'metal', GOLD, m=T(side * FLAT_W / 2, 1.45, 0.04))
g.add(ellipsoid(0.11, 0.13, 0.09, 6, 4), 'metal', GOLD, m=T(0, FLAT_H + 0.07, 0.03))
obj('frame', g)


# ════════════════════════════════════════════════════════════════════════════
# The invitation
# ════════════════════════════════════════════════════════════════════════════
g = Geo()
g.add(slab(0.5, 0.34, 0.03, front=L('envelope_back'), back=L('envelope_front', flip_x=True)), 'labels', 0xffffff, smooth=False, ao=False)
obj('envelope', g)

g = Geo()
star = [(0, 0.1, 0), (0.022, 0.022, 0), (0.1, 0, 0), (0.022, -0.022, 0), (0, -0.1, 0), (-0.022, -0.022, 0), (-0.1, 0, 0), (-0.022, 0.022, 0)]
g.add((star, [tuple(range(8)), tuple(reversed(range(8)))]), 'plastic', 0xffe9a8, smooth=False, ao=False)
obj('sparkle', g)


# ════════════════════════════════════════════════════════════════════════════
# 4:45  The alarm
# ════════════════════════════════════════════════════════════════════════════
MATTRESS_TOP = 0.36
g = Geo()
for sx in (-1, 1):
    for sz in (-1, 1):
        g.add(box(0.08, 0.1, 0.08), 'wood', WOOD_DARK, smooth=False, m=T(sx * 0.8, 0.05, sz * 0.4))
g.add(box(1.72, 0.12, 0.92), 'wood', WOOD, smooth=False, m=T(0, 0.16, 0))
g.add(box(0.08, 0.66, 0.92), 'wood', WOOD, smooth=False, m=T(-0.86, 0.43, 0))
g.add(box(0.5, 0.05, 0.94), 'wood', WOOD_DARK, smooth=False, m=T(-0.86, 0.78, 0) @ S(0.2, 1, 1))
g.add(box(0.07, 0.3, 0.92), 'wood', WOOD, smooth=False, m=T(0.86, 0.25, 0))
g.add(box(1.6, 0.14, 0.84), 'fabric', WHITE, smooth=False, m=T(0, MATTRESS_TOP - 0.07, 0))
g.add(ellipsoid(0.2, 0.085, 0.34, 8, 4), 'fabric', 0xfbf8f0, m=T(-0.57, MATTRESS_TOP + 0.07, 0))
obj('bed', g)

# the blanket is a tunnel: whoever is in the bed lies along X with their head out of the left end of it
g = Geo()
AXIS_Y, BR = MATTRESS_TOP + 0.43, 0.475
section = [(0.5, 0.26), (BR, AXIS_Y)] + [(BR * math.cos(math.pi * k / 8), AXIS_Y + BR * math.sin(math.pi * k / 8)) for k in range(1, 8)] + [(-BR, AXIS_Y), (-0.5, 0.26)]


def tunnel(x0, x1, color, grow=1.0, cap=False):
    sec = [(z * grow, AXIS_Y + (y - AXIS_Y) * grow if y > 0.3 else y) for z, y in section]
    v = [(x0, y, z) for z, y in sec] + [(x1, y, z) for z, y in sec]
    n = len(sec)
    f = [(k, n + k, n + k + 1, k + 1) for k in range(n - 1)]
    if cap:
        f.append(tuple(reversed(range(n, 2 * n))))
    g.add((v, f), 'fabric', color)


tunnel(0.0, 0.8, TERRACOTTA, cap=True)
tunnel(-0.1, 0.0, CREAM, grow=1.03)
obj('blanket', g)

g = Geo()
g.add(cyl(0.16, 0.16, 0.11, 12), 'metal', RED, m=T(0, 0.2, 0) @ RX(math.pi / 2))
g.add(cyl(0.17, 0.17, 0.03, 12), 'metal', GOLD, m=T(0, 0.2, 0.045) @ RX(math.pi / 2))
g.add(disc(0.145, 12, uv_rect=L('dial')), 'labels', 0xffffff, m=T(0, 0.2, 0.062), ao=False)
for side in (-1, 1):
    g.add(lathe([(0.075, 0.0), (0.07, 0.03), (0.045, 0.055), (0, 0.065)], 7), 'metal', GOLD, m=T(side * 0.105, 0.34, 0) @ RZ(-side * 0.5))
    g.add(box(0.03, 0.09, 0.03), 'metal', GOLD_DARK, smooth=False, m=T(side * 0.1, 0.035, 0) @ RZ(side * 0.4))
g.add(box(0.03, 0.07, 0.03), 'metal', GOLD_DARK, smooth=False, m=T(0, 0.385, 0))
g.add(tube([(-0.105, 0.39, 0), (-0.06, 0.45, 0), (0.06, 0.45, 0), (0.105, 0.39, 0)], 0.012, 4, up=(0, 0, 1)), 'metal', GOLD_DARK)
obj('clock', g, pivot=(0, 0, 0))

g = Geo()
for y in (0.075, -0.075):
    g.add(box(0.18, 0.04, 0.035), 'plastic', 0xe6eeff, smooth=False, m=T(0, y, 0), ao=False)
g.add(box(0.215, 0.04, 0.035), 'plastic', 0xe6eeff, smooth=False, m=RZ(math.atan2(0.15, 0.14)), ao=False)
obj('z', g)


# ════════════════════════════════════════════════════════════════════════════
# 5:15  The "easy" run
# ════════════════════════════════════════════════════════════════════════════
g = Geo()
g.add(box(0.07, 1.2, 0.07), 'wood', WOOD_DARK, smooth=False, m=T(0, 0.6, 0))
g.add(slab(0.9, 0.366, 0.05, front=L('sign'), back=L('sign', flip_x=True)), 'labels', 0xffffff, smooth=False, m=T(0, 1.3, 0.03), ao=False)
obj('sign', g)

g = Geo()
g.add(lathe([(0, -0.05), (0.032, -0.034), (0.04, -0.006), (0.022, 0.034), (0, 0.075)], 6), 'plastic', 0xa6e0ff, ao=False)
obj('drop', g)


# ════════════════════════════════════════════════════════════════════════════
# 6:20  The hill
# ════════════════════════════════════════════════════════════════════════════
HILL = [(-0.7, 0.0), (1.15, 0.0), (1.15, 0.9), (0.45, 0.9), (0.067, 0.6), (-0.317, 0.3)]
g = Geo()
hv, hf = prism(HILL, -0.3, 0.5)
n = len(HILL)
UPRIGHT = RX(-math.pi / 2)
g.add((hv, [hf[i] for i in (2, 3, 4, 5)]), 'grass', GRASS, m=UPRIGHT, density=260)
g.add((hv, [hf[i] for i in (0, 1, n, n + 1)]), 'grass', 0x5c9a34, smooth=False, m=UPRIGHT, density=260)
# a lip of turf along the front, and the path everyone takes
g.add(tube([(x, y - 0.03, 0.3) for x, y in (HILL[2], HILL[3], HILL[4], HILL[5], HILL[0])], 0.04, 4, up=(0, 0, 1)), 'grass', 0x5f9c33)
g.add(tube([(x, y + 0.002, -0.02) for x, y in (HILL[3], HILL[4], HILL[5], HILL[0])], 0.11, 4, up=(0, 0, 1), scale=(1, 0.05), caps=False), 'paper', 0xdcc99a, ao=False)
obj('hill', g)

g = Geo()
g.add(box(0.04, 0.86, 0.04), 'wood', WOOD_DARK, smooth=False, m=T(0, 0.43, 0))
g.add(ellipsoid(0.04, 0.04, 0.04, 5, 3), 'metal', GOLD, m=T(0, 0.88, 0))
g.add(slab(0.46, 0.35, 0.012, front=L('flag'), back=L('flag', flip_x=True)), 'labels', 0xffffff, smooth=False, m=T(0.25, 0.66, 0), ao=False)
obj('flag', g)


# ════════════════════════════════════════════════════════════════════════════
# 7:05  The workout
# ════════════════════════════════════════════════════════════════════════════
g = Geo()
g.add(lathe([(0, 0), (0.13, 0), (0.2, 0.07), (0.22, 0.18), (0.19, 0.29), (0.11, 0.36), (0, 0.37)], 10), 'metal', IRON)
g.add(tube([(-0.12, 0.31, 0), (-0.13, 0.43, 0), (-0.07, 0.52, 0), (0.07, 0.52, 0), (0.13, 0.43, 0), (0.12, 0.31, 0)], 0.034, 5, up=(0, 0, 1)), 'metal', IRON)
g.add(quad(0.24, 0.176, L('kg')), 'labels', 0xffffff, m=T(0, 0.19, 0.224), ao=False)
obj('kettlebell', g)

g = Geo()
g.add(box(1.3, 0.035, 0.62), 'rubber', 0x3faea6, smooth=False, m=T(0, 0.0175, 0))
obj('mat', g)


# ════════════════════════════════════════════════════════════════════════════
# 7:50  The cold plunge
# ════════════════════════════════════════════════════════════════════════════
TUB = circle(1.0, 16, rz=0.6)
g = Geo()
g.add(loft(TUB, [(0, 0.93, 0.93), (0.1, 0.98, 0.98), (0.2, 0.95, 0.95), (0.32, 1.0, 1.0), (0.44, 0.97, 0.97), (0.56, 1.02, 1.02)], cap_top=False), 'metal', STEEL)
g.add(loft(TUB, [(0.56, 1.02, 1.02), (0.6, 1.05, 1.05), (0.62, 1.0, 1.0)], cap_bottom=False, cap_top=False), 'metal', 0xd3dae2)
g.add(loft(TUB, [(0.3, 0.94, 0.94), (0.62, 0.96, 0.96)], cap_bottom=False, cap_top=False), 'metal', 0x7d8894, m=S(-1, 1, 1))
g.add(quad(0.45, 0.24, L('temp')), 'labels', 0xffffff, m=T(0, 0.29, 0.618), ao=False)
obj('tub', g)

g = Geo()
wo = circle(0.95, 16, rz=0.56)
g.add(([(0, 0, 0)] + [(x, 0, z) for x, z in wo], [(0, (i + 1) % 16 + 1, i + 1) for i in range(16)]), 'plastic', 0x62bfe0, ao=False)
obj('water', g)

g = Geo()
g.add(box(0.14, 0.14, 0.14), 'plastic', 0xffffff, smooth=False, ao=False)
obj('ice', g)


# ════════════════════════════════════════════════════════════════════════════
# 8:30  Brunch
# ════════════════════════════════════════════════════════════════════════════
TABLE_TOP = 0.46
g = Geo()
g.add(cyl(0.26, 0.2, 0.05, 10), 'metal', IRON, m=T(0, 0.025, 0))
g.add(cyl(0.045, 0.045, TABLE_TOP - 0.06, 6), 'metal', IRON, m=T(0, TABLE_TOP / 2, 0))
g.add(cyl(0.46, 0.46, 0.04, 14), 'fabric', CREAM, m=T(0, TABLE_TOP - 0.02, 0))
g.add(loft(circle(1.0, 14), [(TABLE_TOP - 0.16, 0.49, 0.49), (TABLE_TOP - 0.001, 0.465, 0.465)], cap_bottom=False, cap_top=False), 'fabric', 0xd9523f)
obj('table', g)

g = Geo()
g.add(cyl(0.21, 0.28, 0.03, 12), 'plastic', WHITE, m=T(0, 0.015, 0))
y = 0.03
for i in range(5):
    r = 0.2 + (rnd.random() - 0.5) * 0.02
    dx, dz = (rnd.random() - 0.5) * 0.03, (rnd.random() - 0.5) * 0.03
    g.add(loft(circle(r, 10), [(y, 0.93, 0.93, dx, dz), (y + 0.013, 1, 1, dx, dz), (y + 0.035, 1, 1, dx, dz), (y + 0.048, 0.93, 0.93, dx, dz)]), 'cake', 0xe2a653 if i % 2 else 0xd8973f)
    y += 0.048
g.add(disc(0.2, 10, uv_rect=L('pancake')), 'labels', 0xffffff, m=T(dx, y + 0.002, dz) @ RX(-math.pi / 2), ao=False)
g.add(box(0.07, 0.035, 0.07), 'plastic', 0xfbe58a, smooth=False, m=T(dx - 0.01, y + 0.02, dz - 0.01), ao=False)
for a, drop in ((0.5, 0.13), (2.3, 0.09), (4.2, 0.16)):
    g.add(box(0.05, drop, 0.02), 'plastic', 0x8a4a16, smooth=False, m=T(dx, y - drop / 2, dz) @ RY(a) @ T(0, 0, 0.2), ao=False)
obj('pancakes', g)

g = Geo()
g.add(cyl(0.07, 0.08, 0.14, 8), 'plastic', WHITE, m=T(0, 0.07, 0))
g.add(disc(0.068, 8), 'plastic', 0x4a2a12, m=T(0, 0.135, 0) @ RX(-math.pi / 2), ao=False)
g.add(ring(0.045, 8, radius=0.014, plane='xy'), 'plastic', WHITE, m=T(0.1, 0.07, 0))
obj('mug', g)


# ════════════════════════════════════════════════════════════════════════════
# From bags of faces to Blender objects
# ════════════════════════════════════════════════════════════════════════════
def P(v):
    """Page coordinates (Y up, +Z to the viewer) to Blender's (Z up, -Y to the viewer)."""
    return (v.x, -v.z, v.y)


bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
SHEETS = {'labels': 'labels.png', 'faces': 'faces.png', 'backdrop': 'blank.png', 'floor': 'blank.png'}


def material(name):
    if name in MATS:
        return MATS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 1.0
    img = bpy.data.images.load(os.path.join(TEX, SHEETS.get(name, f'tile_{name}.png')))
    # two materials may not share one image file: the page tells them apart by their texture
    img.name = name
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Closest'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    MATS[name] = mat
    return mat


def face_normal(geo, face):
    n = Vector((0, 0, 0))
    for i in range(len(face)):
        a, b = geo.v[face[i]], geo.v[face[(i + 1) % len(face)]]
        n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    return n.normalized() if n.length > 1e-12 else Vector((0, 1, 0))


# a fixed spread of directions over the upper hemisphere, cosine-weighted
random.seed(7)
HEMI = []
for _ in range(48):
    u, v = random.random(), random.random()
    r, t = math.sqrt(u), TAU * v
    HEMI.append(Vector((r * math.cos(t), r * math.sin(t), math.sqrt(1 - u))))


def bake_ao(o, by_name):
    """Per-vertex ambient occlusion by ray casting, so creases and undersides go darker."""
    geo = o['geo']
    verts, faces = [], []
    for g in [geo] + [by_name[n]['geo'] for n in o['occluders']]:
        off = len(verts)
        verts += [tuple(p) for p in g.v]
        faces += [tuple(off + k for k in f) for f in g.f]
    tree = BVHTree.FromPolygons(verts, faces, all_triangles=False, epsilon=0.0)
    normal = [Vector((0, 0, 0)) for _ in geo.v]
    for f in geo.f:
        n = face_normal(geo, f)
        for k in f:
            normal[k] += n
    out = []
    for p, n in zip(geo.v, normal):
        if n.length < 1e-9:
            out.append(1.0)
            continue
        n = n.normalized()
        t = n.cross(Vector((0, 1, 0)) if abs(n.y) < 0.9 else Vector((1, 0, 0))).normalized()
        b = n.cross(t)
        origin = p + n * 0.006
        hit = 0
        for h in HEMI:
            d = t * h.x + b * h.y + n * h.z
            if tree.ray_cast(origin, d, 0.3)[0] is not None:
                hit += 1
        out.append(1.0 - hit / len(HEMI))
    return out


def build(o, by_name):
    geo, pivot = o['geo'], o['pivot']
    mesh = bpy.data.meshes.new(o['name'])
    mesh.from_pydata([P(v - pivot) for v in geo.v], [], [tuple(f) for f in geo.f])
    mesh.update()
    assert len(mesh.polygons) == len(geo.f), f"{o['name']}: {len(geo.f) - len(mesh.polygons)} faces were rejected"
    names = sorted({fa['mat'] for fa in geo.fa})
    for n in names:
        mesh.materials.append(material(n))
    for poly, fa in zip(mesh.polygons, geo.fa):
        poly.material_index = names.index(fa['mat'])
        poly.use_smooth = fa['smooth']
    # hard edges wherever two smooth faces meet at more than 38 degrees
    bm = bmesh.new()
    bm.from_mesh(mesh)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(38):
            e.smooth = False
    bm.to_mesh(mesh)
    bm.free()

    ao = bake_ao(o, by_name)
    uvl = mesh.uv_layers.new(name='UVMap')
    col = mesh.color_attributes.new(name='Col', type='BYTE_COLOR', domain='CORNER')
    tile = ATLAS['tile']
    for poly, fa, face in zip(mesh.polygons, geo.fa, geo.f):
        n = face_normal(geo, face)
        ax = max(range(3), key=lambda k: abs(n[k]))
        ua, va = ((2, 1), (0, 2), (0, 1))[ax]
        for k, li in enumerate(poly.loop_indices):
            vi = face[k]
            if fa['uv'] is not None:
                uvl.data[li].uv = fa['uv'][k]
            else:
                p = geo.v[vi] - pivot
                uvl.data[li].uv = (p[ua] * fa['density'] / tile, p[va] * fa['density'] / tile)
            shade = 0.5 + 0.5 * ao[vi] ** 0.9 if fa['ao'] else 1.0
            c = fa['color']
            col.data[li].color_srgb = (c[0] * shade, c[1] * shade, c[2] * shade, 1.0)
    mesh.color_attributes.active_color = col
    try:
        mesh.color_attributes.render_color_index = 0
    except Exception:
        pass
    ob = bpy.data.objects.new(o['name'], mesh)
    bpy.context.scene.collection.objects.link(ob)
    for k, v in o['extras'].items():
        ob[k] = v
    return ob


by_name = {o['name']: o for o in OBJECTS}
built = {}
tris = 0
for o in OBJECTS:
    built[o['name']] = build(o, by_name)
    tris += sum(len(f) - 2 for f in o['geo'].f)
for o in OBJECTS:
    ob = built[o['name']]
    if o['parent']:
        ob.parent = built[o['parent']]
        ob.location = P(o['pivot'] - by_name[o['parent']]['pivot'])
    else:
        ob.location = P(o['pivot'])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
kw = dict(filepath=OUT, export_format='GLB', export_yup=True, export_apply=False, export_extras=True, export_normals=True, export_texcoords=True, export_materials='EXPORT', export_animations=False, export_cameras=False, export_lights=False)
for extra in (dict(export_vertex_color='ACTIVE', export_all_vertex_colors=False), dict(export_vertex_color='ACTIVE'), dict(export_colors=True), {}):
    try:
        bpy.ops.export_scene.gltf(**kw, **extra)
        break
    except TypeError as e:
        print('export option not accepted, trying the next set:', e)
print(f'\n{len(OBJECTS)} objects, {tris} triangles -> {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB)')
for o in OBJECTS:
    a, b = o['geo'].bounds()
    print(f"  {o['name']:<12} parent={str(o['parent']):<6} tris={sum(len(f) - 2 for f in o['geo'].f):<5} size=({b.x - a.x:.2f}, {b.y - a.y:.2f}, {b.z - a.z:.2f})")
