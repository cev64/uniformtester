"""
Builds a Riddell SpeedFlex football helmet with Blender (bpy), modelled from
Riddell's SpeedFlex product photography (side, 3/4, front and back views of
retail and NFL/college "Authentic" SpeedFlex helmets).

Everything is sized around the player's head (tools/build_player.py): the
origin is the centre of the head at eye level, x to the player's left, -y
forward, z up. The web app parks the helmet there (src/three/player.js).

SpeedFlex features reproduced:
  * the long shell: round crown, flat-sided boxy jaw extensions that run
    forward along the cheeks, a bottom edge that dips under the ear and rises
    to the flared rear, where a rubber rear bumper wraps the lower back
  * the Flex panel: a hexagonal tongue cut into the front of the shell, hinged
    at the crown, free on three sides with a real gap (you can see the liner
    through it) and sitting a little below the surrounding shell
  * vents with sculpted scoops: the forward "<" brow vents, crown slots, the
    rear upper slots, the slanted jaw/ear vent, two slots low on the back,
    plus the round jaw-pad port plug
  * Riddell nameplate bumper (rounded trapezoid wedge) above the brow,
    black rubber U-channel trim on the face opening and bottom edge
  * SpeedFlex facemask (two top bars joined by a centre bridge, nose bar,
    two posts down to the chin bar, lower side bars) in 6.8 mm round bar with
    weld beads, on four clear quick-release clips with chrome release buttons
  * 4-point chin strap: hard cup, upper straps through black rockers behind
    the temple clips, lower straps through cam buckles and clear ratchet
    strips to anchors on the lower back
  * liner, jaw pads and a "SPEEDFLEX" brow pad inside

UVs on the shell match the web app's helmet painter:
  u runs around the head (0 bottom, 0.25 back, 0.5 crown, 0.75 front)
  v runs side to side (0 = +x side, 0.5 = centre line, 1 = -x side, in canvas-down order)
The UV of a shell vertex comes from the unit direction it was grown from, so
the mapping does not depend on the shell's proportions. helmet.json carries the
centre-line radius per u so stripes can be painted at true widths.

Run:  python3 tools/build_helmet.py --out /tmp/uniformlab-model
"""
import argparse, json, math, os, sys, time
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
os.makedirs(args.out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def material(name):
    return bpy.data.materials.get(name) or bpy.data.materials.new(name)


def interp(pts, x):
    """piecewise linear through [(x, y), ...] sorted by x"""
    if x <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x <= x1:
            return lerp(y0, y1, (x - x0) / (x1 - x0))
    return pts[-1][1]


P = lambda x, y, z: Vector((x, y, z))
_T0 = time.time()


def tick(msg):
    print(f'[{time.time() - _T0:6.1f}s] {msg}', flush=True)


# ─── head landmarks (from the player build, relative to the helmet origin) ──
# forehead front y -0.105 at z +0.03; top of the skull z +0.110; back of the
# skull y +0.107; head half-width 0.077 at the brow, 0.089 across the ears;
# ear canal about (±0.08, +0.03, -0.02); nose tip (0, -0.123, -0.044);
# chin (0, -0.104, -0.134).

# ─── shell ─────────────────────────────────────────────────────────────
AX = 0.127            # half width
AY_F, AY_B = 0.152, 0.164
AZ_T, AZ_B = 0.147, 0.17
BROW_Z = 0.03
SHELL_T = 0.0042      # shell wall


def base_point(o):
    x, y, z = o
    ay = AY_F if y < 0 else AY_B
    az = AZ_T if z > 0 else AZ_B
    # the jaw extensions are flat-sided: the lower front is boxy so they run
    # forward along the cheeks instead of rounding in toward the chin
    m = 2.0 + 1.6 * smooth(0.05, -0.45, z) * smooth(0.05, -0.55, y)
    n = lerp(2.1, 2.6, smooth(0.15, -0.35, z))
    rxy = (abs(x / AX) ** m + abs(y / ay) ** m) ** (1 / m)
    r = (rxy ** n + abs(z / az) ** n) ** (-1 / n)
    p = Vector((x, y, z)) * r
    # crown peaks a little behind the middle
    p.z += 0.005 * smooth(0.3, 1.0, z) * math.exp(-((y - 0.25) / 0.6) ** 2)
    return p


def centre_point(z_target):
    """front centre-line shell point at height z (bisection on the elevation)"""
    lo, hi = -0.5, 1.5
    for _ in range(50):
        e = (lo + hi) / 2
        p = base_point(Vector((0, -math.cos(e), math.sin(e))))
        lo, hi = (e, hi) if p.z < z_target else (lo, e)
    return p


# ─── Flex panel ────────────────────────────────────────────────────────
# Outline in (|x|, s) with s = angle from the crown toward the front:
# parallel sides up top, tapering to a flat bottom edge 2.3 cm above the nameplate.
PANEL_HW, PANEL_HW_B = 0.056, 0.040
PANEL_TOP_S, PANEL_KNEE_S = 0.27, 0.60
NP_TOP = BROW_Z + 0.046                # nameplate top edge
_pb = centre_point(NP_TOP + 0.023)
PANEL_BOT_S = math.atan2(-_pb.y, _pb.z)
PANEL_R = 0.15                          # arc-length scale for s
PANEL_GAP = 0.0028
GAP_FROM_S = 0.47                       # the gap runs from here down; above it the hinge is a step


def panel_s(p):
    return math.atan2(-p.y, p.z)


def panel_e(p):
    """distance to the Flex panel outline (positive inside)"""
    if p.z < 0.0 or p.y > 0.09:
        return -1.0
    s = panel_s(p)
    k = min(1.0, max(0.0, (s - PANEL_KNEE_S) / (PANEL_BOT_S - PANEL_KNEE_S)))
    hw = lerp(PANEL_HW, PANEL_HW_B, k)
    side = (hw - abs(p.x)) * (0.93 if k > 0 else 1.0)
    return min(side, (PANEL_BOT_S - s) * PANEL_R, (s - PANEL_TOP_S) * PANEL_R)


def panel_depth(p):
    return lerp(0.0010, 0.0026, smooth(PANEL_TOP_S, PANEL_KNEE_S, panel_s(p)))


# ─── vents ─────────────────────────────────────────────────────────────
def seg_dist(p, a, b):
    ab = (b[0] - a[0], b[1] - a[1]); ap = (p[0] - a[0], p[1] - a[1])
    t = max(0.0, min(1.0, (ap[0] * ab[0] + ap[1] * ab[1]) / (ab[0] ** 2 + ab[1] ** 2)))
    return math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t)


def poly_sd(p, poly):
    """signed distance to a simple polygon (negative inside)"""
    d = min(seg_dist(p, poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))
    inside = False
    for i in range(len(poly)):
        (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % len(poly)]
        if (y0 > p[1]) != (y1 > p[1]) and p[0] < x0 + (p[1] - y0) * (x1 - x0) / (y1 - y0):
            inside = not inside
    return -d if inside else d


class Vent:
    """A vent cut through the shell. `poly` is in side projection (y, z) for
    proj='side' (mirrored on both sides) or back projection (|x|, z) for
    proj='back'. The scoop recesses the shell on the right-hand side of the
    `lip` line (a0 → a1), fading over `fade`, so the lip edge stays crisp."""

    def __init__(self, poly, proj='side', lip=None, depth=0.0, fade=0.016, rnd=0.0):
        self.poly, self.proj, self.lip, self.depth, self.fade, self.rnd = poly, proj, lip, depth, fade, rnd
        xs = [q[0] for q in poly]; ys = [q[1] for q in poly]
        m = fade + 0.01
        self.box = (min(xs) - m, max(xs) + m, min(ys) - m, max(ys) + m)

    def coords(self, p):
        if self.proj == 'side':
            return (p.y, p.z) if abs(p.x) > 0.035 else None
        return (abs(p.x), p.z) if p.y > 0.04 else None

    def sd(self, p):
        c = self.coords(p)
        if c is None or not (self.box[0] < c[0] < self.box[1] and self.box[2] < c[1] < self.box[3]):
            return 1.0
        return poly_sd(c, self.poly) - self.rnd

    def scoop(self, p):
        if not self.depth:
            return 0.0
        c = self.coords(p)
        if c is None or not (self.box[0] < c[0] < self.box[1] and self.box[2] < c[1] < self.box[3]):
            return 0.0
        d = poly_sd(c, self.poly)
        if d > self.fade:
            return 0.0
        (a0, b0), (a1, b1) = self.lip
        L = math.hypot(a1 - a0, b1 - b0)
        side = ((a1 - a0) * (c[1] - b0) - (b1 - b0) * (c[0] - a0)) / L
        return self.depth * (1 - smooth(0.0, self.fade, max(d, 0.0))) * (1 - smooth(-0.0016, 0.0016, side))


VENTS = [
    # forward-facing brow vent beside the Flex panel: slanted slot, front end high,
    # in a scoop that opens toward the front
    Vent([(-0.093, 0.097), (-0.085, 0.099), (-0.061, 0.084), (-0.047, 0.080), (-0.046, 0.074),
          (-0.062, 0.075), (-0.089, 0.090)],
         lip=((-0.097, 0.100), (-0.044, 0.081)), depth=0.0045, fade=0.02),
    # crown slot
    Vent([(-0.004, 0.138), (0.046, 0.127), (0.049, 0.121), (-0.002, 0.132)],
         lip=((-0.008, 0.140), (0.052, 0.126)), depth=0.0032, fade=0.014),
    # rear upper slot, slanting down toward the back
    Vent([(0.083, 0.096), (0.093, 0.099), (0.126, 0.050), (0.117, 0.044)],
         lip=((0.115, 0.040), (0.081, 0.098)), depth=0.0035, fade=0.016),
    # jaw / ear vent: long slanted pentagon with a crisp top edge
    Vent([(-0.038, -0.046), (-0.029, -0.037), (0.030, -0.037), (0.037, -0.052), (-0.012, -0.064)],
         lip=((-0.045, -0.035), (0.042, -0.035)), depth=0.0032, fade=0.018, rnd=0.0),
    # two slots low on the back
    Vent([(0.052, -0.019), (0.090, -0.008), (0.091, -0.001), (0.054, -0.011)], proj='back',
         lip=((0.048, -0.008), (0.096, 0.004)), depth=0.0028, fade=0.014),
]
PLUG = ((-0.052, -0.088), 0.0062)          # jaw-pad port, side projection (y, z), radius


def displace(p):
    d = 0.0
    e = panel_e(p)
    if e > -0.01:
        d -= panel_depth(p) * smooth(-0.0013, 0.0013, e)
    for v in VENTS:
        d -= v.scoop(p)
    # the lower back flares out to the rear bumper
    d += 0.0075 * smooth(0.02, 0.14, p.y) * smooth(-0.06, -0.125, p.z)
    return p + p.normalized() * d


def surf(o):
    return displace(base_point(o))


# ─── openings ──────────────────────────────────────────────────────────
EDGE_Y = [(-0.16, -0.122), (-0.13, -0.121), (-0.105, -0.114), (-0.075, -0.102), (-0.04, -0.094),
          (0.0, -0.096), (0.025, -0.11), (0.05, -0.14)]          # face opening edge seen from the side
OPEN_HW = [(-0.16, 0.093), (-0.06, 0.097), (0.0, 0.094), (0.05, 0.09)]  # half width of the opening from the front
BOTTOM_Z = [(-0.2, -0.132), (-0.11, -0.140), (-0.06, -0.148), (-0.02, -0.149), (0.03, -0.142),
            (0.07, -0.130), (0.12, -0.119), (0.2, -0.115)]         # lower edge by y


def brow_z(x):
    return BROW_Z + 0.013 * (abs(x) / 0.1) ** 2.4


def f_face(p):
    x, y, z = p
    front = min(y - interp(EDGE_Y, z), max(abs(x) - interp(OPEN_HW, z), y + 0.01))
    return max(z - brow_z(x), front)


def f_bottom(p):
    return p.z - interp(BOTTOM_Z, p.y)


def f_gap(p):
    e = panel_e(p)
    if e < -0.009 or e > 0.009:
        return 1.0
    return max(e, -(e + PANEL_GAP), (GAP_FROM_S - panel_s(p)) * PANEL_R)


def f_plug(p):
    if abs(p.x) < 0.05:
        return 1.0
    return math.hypot(p.y - PLUG[0][0], p.z - PLUG[0][1]) - PLUG[1]


CUTS = [f_face, f_bottom, f_gap] + [v.sd for v in VENTS]


def cut_value(p):
    return min(f(p) for f in CUTS)


# ─── shell mesh ────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_uv_sphere_add(segments=352, ring_count=216, radius=1.0)
shell = bpy.context.active_object
shell.name = 'Shell'
me = shell.data
bm = bmesh.new(); bm.from_mesh(me)
OL = [bm.verts.layers.float.new(k) for k in ('ox', 'oy', 'oz')]   # the direction each vertex grew from


def set_o(v, o):
    for l, c in zip(OL, o):
        v[l] = c


def get_o(v):
    return Vector((v[OL[0]], v[OL[1]], v[OL[2]]))


for v in bm.verts:
    o = v.co.normalized()
    set_o(v, o)
    v.co = surf(o)

# densify around the Flex panel outline and the vents so the thin gap and the
# scoop lips have vertices to land on
def near_detail(p):
    e = panel_e(p)
    if -0.009 < e < 0.006 and p.z > 0.0:
        return 2
    if min(v.sd(p) for v in VENTS) < 0.006:
        return 1
    return 0


tick('grown')
for cuts in (2, 1):
    edges = [e for e in bm.edges if any(near_detail(v.co) >= cuts for v in e.verts)]
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        o = get_o(v)
        o = o.normalized() if o.length > 0.5 else v.co.normalized()
        set_o(v, o)
        v.co = surf(o)

# exact cut: split every edge where the cut field changes sign at its zero
# crossing, connect the crossings inside each triangle, drop the negative side
tick('densified')
bmesh.ops.triangulate(bm, faces=bm.faces[:])
F = {v: cut_value(v.co) for v in bm.verts}
zero = set()
for e in list(bm.edges):
    a, b = e.verts
    fa, fb = F[a], F[b]
    if (fa < 0) == (fb < 0):
        continue
    oa, ob = get_o(a), get_o(b)
    lo, hi = 0.0, 1.0                      # bisection along the edge, on the shell
    for _ in range(14):
        t = (lo + hi) / 2
        fv = cut_value(surf(oa.lerp(ob, t).normalized()))
        lo, hi = (t, hi) if (fv < 0) == (fa < 0) else (lo, t)
    t = (lo + hi) / 2
    ne, nv = bmesh.utils.edge_split(e, a, t)
    o = oa.lerp(ob, t).normalized()
    set_o(nv, o)
    nv.co = surf(o)
    F[nv] = 0.0
    zero.add(nv)
tick(f'split {len(zero)}')
for f in list(bm.faces):
    zs = [v for v in f.verts if v in zero]
    if len(zs) == 2:
        bmesh.ops.connect_verts(bm, verts=zs)
tick('connected')
bmesh.ops.delete(bm, geom=[f for f in bm.faces if any(F[v] < 0 for v in f.verts)], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
# sliver triangles at the crossings are harmless, but merge crossings that land on top of each other
bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.is_boundary], dist=0.0002)
bm.normal_update()


def ordered_loops(bm):
    loops, seen = [], set()
    for e in bm.edges:
        if not e.is_boundary or e in seen:
            continue
        a, b = e.verts
        loop = [a]
        seen.add(e)
        cur = b
        while cur is not a:
            loop.append(cur)
            nxt = [x for x in cur.link_edges if x.is_boundary and x not in seen]
            if not nxt:
                break
            seen.add(nxt[0])
            cur = nxt[0].other_vert(cur)
        loops.append(loop)
    return loops


def surf_normal(o, h=0.002):
    """outward normal of the analytic shell surface at direction o"""
    t1 = o.orthogonal().normalized()
    t2 = o.cross(t1).normalized()
    a = surf((o + t1 * h).normalized()) - surf((o - t1 * h).normalized())
    b = surf((o + t2 * h).normalized()) - surf((o - t2 * h).normalized())
    n = a.cross(b).normalized()
    return n if n.dot(o) > 0 else -n


loops = ordered_loops(bm)
# tiny holes (a lone face dropped by the cut) are filled back in
for loop in [l for l in loops if len(l) < 7]:
    try:
        bm.faces.new(loop)
    except ValueError:
        pass
loops = [l for l in loops if len(l) >= 7]
main_loop = max(loops, key=len)
trim_path = [v.co.copy() for v in main_loop]
trim_norm = [surf_normal(get_o(v)) for v in main_loop]

# walls: the shell edge (4 mm, shell coloured) then dark liner behind it, so
# vents, the panel gap and the face opening show depth instead of a paper edge
for loop in loops:
    N = len(loop)
    r1, r2 = {}, {}
    for v in loop:
        n = surf_normal(get_o(v))
        a = bm.verts.new(v.co - n * SHELL_T); set_o(a, get_o(v)); r1[v] = a
        b = bm.verts.new(v.co - n * (SHELL_T + 0.009)); set_o(b, get_o(v)); r2[v] = b
    for i in range(N):
        a, b = loop[i], loop[(i + 1) % N]
        e = bm.edges.get((a, b))
        if e is None or not e.link_faces:
            continue
        f = e.link_faces[0]
        fwd = any(l.vert is a and l.link_loop_next.vert is b for l in f.loops)
        if not fwd:
            a, b = b, a
        q1 = bm.faces.new((b, a, r1[a], r1[b])); q1.material_index = 0
        q2 = bm.faces.new((r1[b], r1[a], r2[a], r2[b])); q2.material_index = 1
        e.smooth = False

# UVs from the growth directions
uvl = bm.loops.layers.uv.new('UVMap')
for f in bm.faces:
    us = []
    for l in f.loops:
        o = get_o(l.vert)
        a = math.atan2(o.y, -o.z)
        l[uvl].uv = ((a / (2 * math.pi)) % 1.0, 1 - math.acos(max(-1, min(1, o.x))) / math.pi)
        us.append(l[uvl].uv.x)
    if max(us) - min(us) > 0.5:
        for l in f.loops:
            if l[uvl].uv.x < 0.5:
                l[uvl].uv.x += 1
for f in bm.faces:
    f.smooth = True
for l in OL:
    bm.verts.layers.float.remove(l)
bm.to_mesh(me); bm.free()
while len(me.uv_layers) > 1:
    me.uv_layers.remove(me.uv_layers[0])
shell.data.materials.append(material('shell'))
shell.data.materials.append(material('liner'))
print('shell verts', len(me.vertices))


# Fine surface detail baked into a bump map in the painter's UV space:
# the hinge step across the top of the Flex panel and along its upper sides.
def detail_height(p):
    h = 0.0
    e = panel_e(p)
    if e > -0.004 and panel_s(p) < GAP_FROM_S + 0.02:
        h -= 1.0 * (1 - smooth(0.0, 0.0011, abs(e + 0.0004)))
    return h


def bake_detail(path, W=1024, H=512):
    from PIL import Image
    img = Image.new('L', (W, H), 128)
    px = img.load()
    for j in range(H):
        vv = (j + 0.5) / H
        th = vv * math.pi
        sx, sr = math.cos(th), math.sin(th)
        if abs(sx) > 0.6:
            continue
        for i in range(W):
            a = ((i + 0.5) / W) * 2 * math.pi
            o = Vector((sx, math.sin(a) * sr, -math.cos(a) * sr))
            if o.z < 0.2 or o.y > 0.3:
                continue
            px[i, j] = int(128 + 120 * detail_height(base_point(o)))
    img.save(path)


bake_detail(os.path.join(args.out, 'helmet_detail.png'))


# ─── helpers ───────────────────────────────────────────────────────────
def select_only(ob):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def mesh_object(name, verts, faces, mat, smooth_shade=True, uvs=None):
    mesh = bpy.data.meshes.new(name); mesh.from_pydata(verts, [], faces)
    if uvs is not None:
        uvl = mesh.uv_layers.new(name='UVMap')
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                uvl.data[li].uv = uvs[mesh.loops[li].vertex_index]
    ob = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material(mat))
    if smooth_shade:
        ob.data.shade_smooth()
    return ob


def tube(name, pts, radius, mat, cyclic=False, res=4, sides=None):
    cd = bpy.data.curves.new(name, 'CURVE')
    cd.dimensions = '3D'
    cd.bevel_depth = radius
    cd.bevel_resolution = res
    cd.use_fill_caps = not cyclic
    sp = cd.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (co.x, co.y, co.z, 1)
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cd)
    bpy.context.collection.objects.link(ob)
    select_only(ob)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob


def catmull(pts, n=6):
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(len(pts) - 1, i + 2)]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return out


def resample(pts, step):
    out = [pts[0]]
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        seg = (b - a).length
        while acc + seg >= step:
            t = (step - acc) / seg
            a = a.lerp(b, t)
            out.append(a)
            seg = (b - a).length
            acc = 0.0
        acc += seg
    return out


def blob(name, center, radii, mat, n=3.0, keep=None, seg=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1.0, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    for v in ob.data.vertices:
        o = v.co.copy()
        r = (abs(o.x) ** n + abs(o.y) ** n + abs(o.z) ** n) ** (-1 / n)
        v.co = Vector((o.x * r * radii[0], o.y * r * radii[1], o.z * r * radii[2])) + Vector(center)
    if keep:
        bm = bmesh.new(); bm.from_mesh(ob.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context='FACES')
        bm.to_mesh(ob.data); bm.free()
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob


def rbox(name, size, mat, bevel=0.35, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True, rotation=True, location=False)
    bev = ob.modifiers.new('Bevel', 'BEVEL'); bev.width = min(size) * bevel; bev.segments = segments
    bpy.ops.object.modifier_apply(modifier='Bevel')
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob


def frame(at, normal, along):
    """matrix with z along normal and x along `along` (projected), placed at `at`"""
    n = normal.normalized()
    ax = (along - n * along.dot(n)).normalized()
    ay = n.cross(ax)
    M = Matrix((ax, ay, n)).transposed().to_4x4()
    M.translation = at
    return M


def place(ob, M):
    ob.data.transform(M)
    return ob


def cylinder(name, radius, depth, mat, verts=24, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=(0, 0, depth / 2))
    ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.transform_apply(location=True)
    if bevel:
        b = ob.modifiers.new('B', 'BEVEL'); b.width = bevel; b.segments = 2
        bpy.ops.object.modifier_apply(modifier='B')
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob


bm = bmesh.new(); bm.from_mesh(shell.data); shell_bvh = BVHTree.FromBMesh(bm); bm.free()


def on_shell(target, lift=0.0):
    """project a point onto the outer shell, along the ray from the origin"""
    d = target.normalized()
    hit = shell_bvh.ray_cast(d * 0.4, -d)
    if hit[0] is None:
        return d * 0.14, d
    return hit[0] + hit[1] * lift, hit[1]


def on_shell_dir(origin, direction, lift=0.0):
    hit = shell_bvh.ray_cast(origin, direction)
    return (hit[0] + hit[1] * lift, hit[1]) if hit[0] is not None else (None, None)


# ─── rubber trim on the face opening and bottom edge ───────────────────
# U-channel over the shell edge, stopping where the rear bumper takes over
BUMPER_Y = 0.055
segs, cur = [], []
for p, n in zip(trim_path, trim_norm):
    if p.y < BUMPER_Y + 0.004 or p.z > -0.08:
        cur.append((p, n))
    elif cur:
        segs.append(cur); cur = []
if cur:
    if segs and (segs[0][0][0] - cur[-1][0]).length < 0.01:
        segs[0] = cur + segs[0]
    else:
        segs.append(cur)
for i, sg in enumerate(segs):
    if len(sg) < 6:
        continue
    pts = [p - n * (SHELL_T * 0.5) for p, n in sg]
    closed = (pts[0] - pts[-1]).length < 0.006 and len(segs) == 1
    for _ in range(3):
        pts = [pts[0]] + [(pts[k - 1] + pts[k] * 2 + pts[k + 1]) / 4 for k in range(1, len(pts) - 1)] + [pts[-1]]
    tube(f'Trim{i}', pts, 0.0036, 'trim', cyclic=closed, res=3)


# ─── rear bumper ───────────────────────────────────────────────────────
def edge_point(phi):
    """bottom edge of the shell at azimuth phi (0 = straight back)"""
    lo, hi = -1.2, 0.3
    for _ in range(40):
        e = (lo + hi) / 2
        o = Vector((math.sin(phi) * math.cos(e), math.cos(phi) * math.cos(e), math.sin(e)))
        p = surf(o)
        lo, hi = (lo, e) if f_bottom(p) > 0 else (e, hi)
    return e


def build_bumper():
    COLS, ROWS = 72, 7
    H = 0.034                                  # height up the shell
    phis = []
    # azimuth range: from where the bottom edge passes y = BUMPER_Y on each side
    lim = 1.2
    for _ in range(30):
        e = edge_point(lim)
        p = surf(Vector((math.sin(lim) * math.cos(e), math.cos(lim) * math.cos(e), math.sin(e))))
        lim += 0.02 if p.y > BUMPER_Y else -0.02
    verts, uvs = [], []
    for i in range(COLS):
        t = i / (COLS - 1)
        phi = (t * 2 - 1) * lim
        e0 = edge_point(phi)
        # ends of the bumper roll off: shorter and thinner
        endk = smooth(0.0, 0.08, min(t, 1 - t))
        col = []
        e = e0
        # march up the surface to the strip height
        pts = []
        prev = surf(Vector((math.sin(phi) * math.cos(e), math.cos(phi) * math.cos(e), math.sin(e))))
        dist = 0.0
        target = H * lerp(0.55, 1.0, endk)
        k = 0
        while dist < target and k < 400:
            e += 0.002
            q = surf(Vector((math.sin(phi) * math.cos(e), math.cos(phi) * math.cos(e), math.sin(e))))
            dist += (q - prev).length; prev = q; k += 1
        e1 = e
        for j in range(ROWS):
            h = j / (ROWS - 1)                 # 0 bottom, 1 top
            ee = lerp(e0, e1, h)
            o = Vector((math.sin(phi) * math.cos(ee), math.cos(phi) * math.cos(ee), math.sin(ee)))
            p = surf(o)
            n = p.normalized()
            # the lower edge flares outward and hangs a little below the shell
            out = 0.0016 + 0.0065 * (1 - h) ** 1.6 * endk
            down = 0.004 * (1 - h) ** 3 * endk
            verts.append(p + n * out - P(0, 0, down))
            uvs.append((t, h))
    faces = [(i * ROWS + j, i * ROWS + j + 1, (i + 1) * ROWS + j + 1, (i + 1) * ROWS + j)
             for i in range(COLS - 1) for j in range(ROWS - 1)]
    ob = mesh_object('RearBumper', verts, faces, 'backplate', uvs=uvs)
    # orientation: outward
    me = ob.data
    me.update()
    c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
    if me.polygons[len(me.polygons) // 2].normal.dot(me.polygons[len(me.polygons) // 2].center) < 0:
        for poly in me.polygons:
            poly.flip()
    sol = ob.modifiers.new('S', 'SOLIDIFY'); sol.thickness = 0.0035; sol.offset = -1
    select_only(ob); bpy.ops.object.modifier_apply(modifier='S')
    ob.data.shade_smooth()
    return ob


bumper = build_bumper()


# ─── Riddell nameplate bumper above the brow ───────────────────────────
def rounded_trapezoid(hw_bot, hw_top, z0, z1, r_top, r_bot, n=10):
    """outline (x, z), counter-clockwise seen from the front"""
    pts = []
    def arc(cx, cz, r, a0, a1):
        for k in range(n + 1):
            a = lerp(a0, a1, k / n)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    # corner arcs; the straight sides connect them
    corners = [(hw_bot - r_bot, z0 + r_bot, r_bot, -math.pi / 2, 0.0),
               (hw_top - r_top, z1 - r_top, r_top, 0.0, math.pi / 2),
               (-hw_top + r_top, z1 - r_top, r_top, math.pi / 2, math.pi),
               (-hw_bot + r_bot, z0 + r_bot, r_bot, math.pi, 1.5 * math.pi)]
    for cx, cz, r, a0, a1 in corners:
        arc(cx, cz, r, a0, a1)
    # even spacing so the long straight edges follow the shell too
    loop = [Vector((x, z, 0)) for x, z in pts] + [Vector((pts[0][0], pts[0][1], 0))]
    out = resample(loop, 0.0025)[:-1]
    return [(q.x, q.y) for q in out]


def plate_on_shell(name, outline, mat, thick_fn, rings=6, dirn=Vector((0, 1, 0))):
    """a plate whose back follows the shell, built from a 2D outline (x, z) projected along dirn"""
    cx = sum(q[0] for q in outline) / len(outline); cz = sum(q[1] for q in outline) / len(outline)
    xs = [q[0] for q in outline]; zs = [q[1] for q in outline]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    N = len(outline)
    verts, uvs, faces = [], [], []
    grid = []
    for j in range(rings + 1):
        t = j / rings
        row = []
        for k in range(N if j else 1):
            if j == 0:
                q = (cx, cz)
            else:
                q = (cx + (outline[k][0] - cx) * t, cz + (outline[k][1] - cz) * t)
            hit, n = on_shell_dir(Vector((q[0], -0.4, q[1])), dirn)
            if hit is None:
                hit, n = Vector((q[0], -0.15, q[1])), Vector((0, -1, 0))
            u, v = (q[0] - x0) / (x1 - x0), (q[1] - z0) / (z1 - z0)
            row.append(len(verts))
            verts.append(hit + n * thick_fn(v)); uvs.append((u, v))
        grid.append(row)
    for k in range(N):
        faces.append((grid[0][0], grid[1][k], grid[1][(k + 1) % N]))
    for j in range(1, rings):
        for k in range(N):
            a, b = grid[j][k], grid[j][(k + 1) % N]
            c, d = grid[j + 1][(k + 1) % N], grid[j + 1][k]
            faces.append((a, d, c, b))
    # side wall down to the shell
    rim = grid[rings]
    base = []
    for k in range(N):
        q = outline[k]
        hit, n = on_shell_dir(Vector((q[0], -0.4, q[1])), dirn)
        if hit is None:
            hit, n = Vector((q[0], -0.15, q[1])), Vector((0, -1, 0))
        base.append(len(verts)); verts.append(hit - n * 0.001); uvs.append((0.0, 0.0))
    for k in range(N):
        faces.append((rim[k], base[k], base[(k + 1) % N], rim[(k + 1) % N]))
    ob = mesh_object(name, verts, faces, mat, uvs=uvs)
    me = ob.data; me.update()
    # outward-facing check on the centre fan
    if me.polygons[0].normal.y > 0:
        for poly in me.polygons:
            poly.flip()
    bev = ob.modifiers.new('B', 'BEVEL'); bev.width = 0.0012; bev.segments = 2; bev.limit_method = 'ANGLE'
    select_only(ob); bpy.ops.object.modifier_apply(modifier='B')
    ob.data.shade_smooth()
    return ob


np_outline = rounded_trapezoid(0.057, 0.050, BROW_Z - 0.002, NP_TOP, 0.011, 0.004)
nameplate = plate_on_shell('Nameplate', np_outline, 'bumper', lambda v: lerp(0.0068, 0.0048, v))


# ─── SpeedFlex facemask ────────────────────────────────────────────────
MR = 0.0034            # 6.8 mm bar
CLIP_LIFT = 0.0068     # bar centre above the shell under the clips
hi_at, hi_n = on_shell(P(0.118, -0.068, 0.008))
lo_at, lo_n = on_shell(P(0.112, -0.100, -0.096))
HI = hi_at + hi_n * CLIP_LIFT
LO = lo_at + lo_n * CLIP_LIFT


def mirror(pts):
    return [P(-q.x, q.y, q.z) for q in pts]


def across(half):
    """half path from the +x side end to the centre → full path side to side"""
    full = catmull(half, 6)
    return full[:-1] + [full[-1]] + mirror(list(reversed(full[:-1])))


mask_parts = []
welds = []


def bar(name, pts, n=6):
    path = catmull(pts, n) if len(pts) > 2 else pts
    mask_parts.append(tube(name, path, MR, 'mask', res=3))
    return path


# top bar and eye bar, both running back to the temple clips, bridged at the centre
top = bar('Mask_top', across([HI + P(-0.002, -0.004, 0.003), P(0.112, -0.103, 0.024), P(0.088, -0.146, 0.037),
                               P(0.045, -0.166, 0.041), P(0.0, -0.170, 0.041)]), 1)
eye = bar('Mask_eye', across([HI + P(-0.003, -0.006, -0.002), P(0.111, -0.106, 0.008), P(0.090, -0.150, 0.016),
                               P(0.046, -0.170, 0.019), P(0.0, -0.173, 0.019)]), 1)
bar('Mask_bridge', [P(0, -0.170, 0.041), P(0, -0.1725, 0.030), P(0, -0.173, 0.019)])
welds += [P(0, -0.170, 0.041), P(0, -0.173, 0.019)]

NOSE_C = P(0.0, -0.191, -0.047)
CHIN_C = P(0.0, -0.170, -0.152)
J1 = P(0.121, -0.111, -0.044)              # side bar meets nose bar
nose = bar('Mask_nose', across([J1, P(0.104, -0.152, -0.040), P(0.064, -0.183, -0.044), P(0.0, -0.191, -0.047)]), 1)
chin = bar('Mask_chin', across([LO + P(-0.002, -0.006, -0.004), P(0.100, -0.126, -0.124), P(0.072, -0.158, -0.147),
                                 P(0.036, -0.168, -0.152), CHIN_C]), 1)


def nearest(path, x, sign=1):
    return min((q for q in path if q.x * sign >= 0), key=lambda q: abs(q.x - x))


for s in (1, -1):
    sm = (lambda q: q) if s > 0 else (lambda q: P(-q.x, q.y, q.z))
    # side bar: temple clip → nose-bar junction → jaw clip, bowed forward
    side = [HI + P(0.0, -0.002, -0.004), P(0.124, -0.093, -0.018), J1, P(0.120, -0.114, -0.070),
            LO + P(0.0, -0.004, 0.004)]
    bar(f'Mask_side{s}', [sm(q) for q in side])
    # posts: nose bar down to the chin bar
    a = nearest(nose, s * 0.050, s); c = nearest(chin, s * 0.043, s)
    b = (a + c) / 2 + P(0, -0.003, 0)
    bar(f'Mask_post{s}', [a, b, c])
    # lower side bar: from the side bar under the nose bar forward to the post
    q0 = sm(P(0.119, -0.114, -0.064))
    q2 = b.lerp(a, 0.25)
    bar(f'Mask_low{s}', [q0, sm(P(0.098, -0.150, -0.070)), q2])
    welds += [a, c, q0, q2, sm(J1)]

for i, w in enumerate(welds):
    mask_parts.append(blob(f'Weld{i}', w, (MR * 1.32, MR * 1.32, MR * 1.32), 'mask', n=2.0, seg=12, rings=8))


# ─── quick-release clips ───────────────────────────────────────────────
clips = []


def qr_clip(name, at, n, along):
    M = frame(at, n, along)
    housing = blob(name, (0, 0, 0.0055), (0.0175, 0.0115, 0.0062), 'clip', n=2.6, seg=24, rings=12,
                   keep=lambda c: c.z > 0.0005)
    place(housing, M)
    btn = cylinder(name + '_btn', 0.0046, 0.0022, 'button', verts=24, bevel=0.0006)
    place(btn, M @ Matrix.Translation((0, 0, 0.0112)))
    pin = cylinder(name + '_pin', 0.0018, 0.0012, 'screw', verts=16)
    place(pin, M @ Matrix.Translation((0, 0, 0.0133)))
    base = cylinder(name + '_base', 0.0075, 0.0012, 'screw', verts=24)
    place(base, M @ Matrix.Translation((0, 0, 0.0002)))
    return [housing, btn, pin, base]


for s in (1, -1):
    for key, at, n, along in (('Hi', hi_at, hi_n, P(0, -1, 0.15)), ('Lo', lo_at, lo_n, P(0, -1, 0.75))):
        if s < 0:
            at = P(-at.x, at.y, at.z); n = P(-n.x, n.y, n.z)
        clips += qr_clip(f'Clip{key}{s}', at, n, along)


# ─── chin strap ────────────────────────────────────────────────────────
CUP_C = P(0, -0.095, -0.131)
cup = blob('ChinCup', CUP_C, (0.050, 0.023, 0.030), 'cup', n=2.8, seg=40, rings=20,
           keep=lambda c: c.y < CUP_C.y - 0.004 and abs(c.z - CUP_C.z) < 0.026)
sol = cup.modifiers.new('S', 'SOLIDIFY'); sol.thickness = 0.0035
select_only(cup); bpy.ops.object.modifier_apply(modifier='S')
cup_liner = blob('ChinCupLiner', CUP_C + P(0, 0.003, 0), (0.047, 0.020, 0.027), 'pad', n=2.8, seg=32, rings=16,
                 keep=lambda c: c.y < CUP_C.y - 0.002 and abs(c.z - CUP_C.z) < 0.024)
cup_rim = []
straps = []
up_out = lambda p: (p - P(0, -0.03, -0.05)).normalized()


def ribbon(name, path, width, thick, mat, up_fn):
    """flat strap following `path`, its face turned toward up_fn(point)"""
    verts, faces = [], []
    for i, p in enumerate(path):
        t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        n = up_fn(p)
        side = t.cross(n).normalized()
        n = side.cross(t).normalized()
        for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            verts.append(p + side * (a * width / 2) + n * (b * thick / 2))
    for i in range(len(path) - 1):
        for k in range(4):
            a, b = i * 4 + k, i * 4 + (k + 1) % 4
            faces.append((a, b, b + 4, a + 4))
    faces.append((0, 3, 2, 1)); m = (len(path) - 1) * 4; faces.append((m, m + 1, m + 2, m + 3))
    return mesh_object(name, verts, faces, mat)


def shell_normal_fn(p):
    return on_shell(p)[1]


hw_parts = []
for s in (1, -1):
    sm = (lambda q: q) if s > 0 else (lambda q: P(-q.x, q.y, q.z))
    # upper strap: cup → up the front of the jaw flap, under the temple clip → rocker → tail
    rk_top, _ = on_shell(sm(P(0.126, -0.013, 0.029)), 0.0)
    rk_bot, _ = on_shell(sm(P(0.126, -0.002, -0.015)), 0.0)
    rk_c, rk_n = on_shell((rk_top + rk_bot) / 2, 0.0)
    path = [CUP_C + sm(P(0.047, -0.020, 0.018)), sm(P(0.088, -0.118, -0.098)),
            on_shell(sm(P(0.125, -0.092, -0.050)), 0.004)[0], on_shell(sm(P(0.128, -0.050, -0.016)), 0.004)[0],
            rk_c + rk_n * 0.0045, on_shell(sm(P(0.125, 0.045, 0.022)), 0.0025)[0]]
    path = catmull(path, 8)
    path = [on_shell(q, 0.0035)[0] if q.y > -0.09 and q.z > -0.08 else q for q in path]
    straps.append(ribbon(f'StrapHi{s}', path, 0.019, 0.0018, 'strap', lambda p: on_shell(p)[1] if p.y > -0.1 else up_out(p)))
    # rocker the upper strap threads through
    rocker = rbox(f'Rocker{s}', (0.046, 0.0125, 0.0055), 'buckle', bevel=0.45)
    place(rocker, frame(rk_c + rk_n * 0.0035, rk_n, rk_top - rk_bot))
    hw_parts.append(rocker)
    sc = cylinder(f'RockerScrew{s}', 0.0033, 0.0016, 'screw', verts=16, bevel=0.0004)
    place(sc, frame(rk_bot + rk_n * 0.0062 + (rk_top - rk_bot).normalized() * 0.004, rk_n, P(0, 1, 0)))
    hw_parts.append(sc)

    # lower strap: cup → under the jaw → cam buckle at the bottom edge → ratchet strip → anchor
    cb, cbn = on_shell(sm(P(0.122, -0.030, -0.132)), 0.0)
    an, ann = on_shell(sm(P(0.125, 0.072, -0.074)), 0.0)
    rs, rsn = on_shell(sm(P(0.125, 0.0, -0.106)), 0.0)
    path = [CUP_C + sm(P(0.046, -0.018, -0.022)), sm(P(0.086, -0.104, -0.156)), sm(P(0.112, -0.062, -0.152)),
            cb + cbn * 0.006]
    path = catmull(path, 8)
    straps.append(ribbon(f'StrapLo{s}', path, 0.019, 0.0018, 'strap', lambda p: up_out(p)))
    cam = rbox(f'CamBuckle{s}', (0.030, 0.021, 0.008), 'buckle', bevel=0.3)
    place(cam, frame(cb + cbn * 0.0055, cbn, an - cb))
    hw_parts.append(cam)
    rpath = [on_shell(cb.lerp(an, t), 0.0028)[0] for t in [0.12 + 0.88 * k / 10 for k in range(11)]]
    straps.append(ribbon(f'Ratchet{s}', rpath, 0.014, 0.0016, 'ratchet', lambda p: on_shell(p)[1]))
    anc = rbox(f'Anchor{s}', (0.022, 0.016, 0.006), 'buckle', bevel=0.4)
    place(anc, frame(an + ann * 0.0035, ann, an - cb))
    hw_parts.append(anc)
    sc = cylinder(f'AnchorScrew{s}', 0.003, 0.0014, 'screw', verts=16, bevel=0.0004)
    place(sc, frame(an + ann * 0.0068, ann, P(0, 1, 0)))
    hw_parts.append(sc)

    # jaw-pad port plug
    pc, pn = on_shell(sm(P(0.12, PLUG[0][0], PLUG[0][1])), 0.0)
    plug = cylinder(f'Plug{s}', PLUG[1], 0.0014, 'buckle', verts=24, bevel=0.0005)
    place(plug, frame(pc - pn * 0.0002, pn, P(0, 1, 0)))
    slot = rbox(f'PlugSlot{s}', (0.0062, 0.0011, 0.0006), 'liner', bevel=0.3, segments=1)
    place(slot, frame(pc + pn * 0.0012, pn, P(0, 1, 0)))
    hw_parts += [plug, slot]


# ─── interior: liner, jaw pads, brow pad ───────────────────────────────
inner = blob('Padding', (0, 0, 0), (1, 1, 1), 'pad', n=2.0, seg=128, rings=80)
for v in inner.data.vertices:
    o = v.co.normalized()
    v.co = surf(o) - o * 0.0075
bm = bmesh.new(); bm.from_mesh(inner.data)


def _open(c):
    q = c + c.normalized() * 0.0075
    return min(f_face(q), f_bottom(q)) < 0.003


bmesh.ops.delete(bm, geom=[f for f in bm.faces if _open(f.calc_center_median())], context='FACES')
for f in bm.faces:
    f.normal_flip()
bm.to_mesh(inner.data); bm.free()

pads = []
for s in (1, -1):
    pads.append(blob(f'JawPad{s}', (s * 0.090, -0.058, -0.080), (0.016, 0.050, 0.052), 'pad', n=2.6))

# brow pad: a curved band behind the brow edge with "SPEEDFLEX" printed on it
BR, A0 = 0.118, 0.72
verts, uvs, faces = [], [], []
COLS, ROWS = 33, 5
for j in range(ROWS):
    z = lerp(BROW_Z - 0.026, BROW_Z + 0.022, j / (ROWS - 1))
    for i in range(COLS):
        a = lerp(-A0, A0, i / (COLS - 1))
        bulge = 0.004 * math.sin(math.pi * j / (ROWS - 1))
        r = BR + bulge - 0.004 * (1 - j / (ROWS - 1)) ** 4
        verts.append(P(math.sin(a) * r, -math.cos(a) * r + 0.006, z))
        uvs.append((i / (COLS - 1), j / (ROWS - 1)))
for j in range(ROWS - 1):
    for i in range(COLS - 1):
        a = j * COLS + i
        faces.append((a, a + COLS, a + COLS + 1, a + 1))
brow = mesh_object('BrowPad', verts, faces, 'browpad', uvs=uvs)
brow.data.update()
if brow.data.polygons[len(faces) // 2].normal.y > 0:
    for poly in brow.data.polygons:
        poly.flip()

# ─── export ────────────────────────────────────────────────────────────
# centre-line radius by u (for painting stripes at true widths)
radii = []
for k in range(65):
    a = 2 * math.pi * k / 64
    o = Vector((0, math.sin(a), -math.cos(a)))
    radii.append(round(surf(o).length, 4))
meta = {
    'origin': 'head centre at eye level',
    'brow_z': BROW_Z,
    'nfl_decal': [list(v) for v in on_shell(P(0, 1.0, -0.4), 0.0)],
    'centerline_r': radii,
}
bpy.ops.export_scene.gltf(filepath=os.path.join(args.out, 'helmet.glb'), export_format='GLB',
                          export_texcoords=True, export_normals=True, export_yup=True, export_materials='EXPORT')
json.dump(meta, open(os.path.join(args.out, 'helmet.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, '_helmet.blend'))
print('exported helmet', os.path.getsize(os.path.join(args.out, 'helmet.glb')) // 1024, 'KB')
