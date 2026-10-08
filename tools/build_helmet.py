"""
Builds a Riddell SpeedFlex football helmet with Blender (bpy), modelled from
Riddell's SpeedFlex product photography (side, 3/4, front and back views of
retail and NFL "Authentic" SpeedFlex helmets) and Riddell's orthographic
renders of the SF-2BD-SW facemask (front, side, 3/4).

Everything is sized around the player's head (tools/build_player.py): the
origin is the centre of the head at eye level, x to the player's left, -y
forward, z up. The web app parks the helmet there (src/three/player.js).

How it is built:
  * the shell's form is a subdivision-surface cage (a quad sphere, Catmull-
    Clark) whose control points are fitted so the limit surface passes through
    the traced side, front and top profiles. The openings, the Flex panel gap
    and the vent lips are then cut exactly into a dense resampling of that
    surface, so their edges stay crisp.
  * the facemask is traced bar by bar from the SF-2BD-SW renders, then fitted
    to the finished shell: the top bar is solved to run 3 mm off the nameplate
    bumper and shell along its whole length, the frame drops into the upper
    clips at the temples and the lower clips on the jaw extensions, and the
    rest of the mask follows through a smooth (thin-plate) deformation so all
    the welds stay joined. The clips are moulded onto the shell around the bar.

SpeedFlex features reproduced:
  * the long shell: round crown, flat-sided jaw extensions that run forward
    along the cheeks and taper in toward the chin, a bottom edge that dips
    under the ear and rises to the flared rear, where a rubber rear bumper
    wraps the lower back
  * the Flex panel: a hexagonal tongue cut into the front of the shell, hinged
    at the crown, free on three sides with a real gap (you can see the liner
    through it) and sitting a little below the surrounding shell
  * vents with sculpted scoops: the forward "<" brow vents, crown slots, the
    rear upper slots, the slanted jaw/ear vent, two slots low on the back,
    plus the round jaw-pad port plug
  * Riddell nameplate bumper (rounded trapezoid wedge) above the brow,
    black rubber U-channel trim on the face opening and bottom edge
  * SpeedFlex facemask (SF-2BD-SW: a frame that runs from the top bar back
    to the temple clips and down the S-shaped side to the lower clips and the
    chin bar, an eye bar on a centre bridge, two posts, the nose bar and the
    "SW" side stubs, two lower verticals) in 6.8 mm round bar with weld beads,
    on four clear quick-release clips with chrome release buttons
  * 4-point chin strap: a small hard cup that wraps the chin behind the chin
    bar, upper straps through black rockers behind the temple clips, lower
    straps through cam buckles and clear ratchet strips to anchors on the
    lower back
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

# ─── shell form: a subdivision cage fitted to the traced profiles ──────
# Proportions from the photos, scaled to the head: half width just above the
# ear, front reach at the brow, back reach, crown height, jaw depth.
AX = 0.127
AY_F, AY_B = 0.152, 0.164
AZ_T, AZ_B = 0.141, 0.172
BROW_Z = 0.03
SHELL_T = 0.0042      # shell wall


def profile_point(o):
    """The traced form along direction o: sections whose semi-axes follow the
    side, front and top profiles. Side: the crown peaks a little behind the
    middle. Front: the jaw extensions are flat-sided and run forward along the
    cheeks, tapering in toward the chin (the front photos show the lower front
    ~12% narrower than the temples). The cage below smooths the seams between
    the front/back and upper/lower semi-axes."""
    x, y, z = o
    ay = AY_F if y < 0 else AY_B
    az = AZ_T if z > 0 else AZ_B
    ax = AX * (1 - 0.12 * smooth(-0.05, -0.7, z) * smooth(0.3, -0.7, y))
    m = 2.0 + 1.6 * smooth(0.05, -0.45, z) * smooth(0.05, -0.55, y)
    n = lerp(2.1, 2.6, smooth(0.15, -0.35, z))
    rxy = (abs(x / ax) ** m + abs(y / ay) ** m) ** (1 / m)
    r = (rxy ** n + abs(z / az) ** n) ** (-1 / n)
    p = Vector((x, y, z)) * r
    p.z += 0.005 * smooth(0.3, 1.0, z) * math.exp(-((y - 0.25) / 0.6) ** 2)
    return p


CAGE_N = 10           # control points per cube-face edge (600 cage faces)
CAGE_LEVELS = 3


def build_cage():
    """Quad-sphere control mesh (no poles: only the eight cube corners are
    extraordinary), Catmull-Clark subdivided. Each control point moves along
    its own direction; a few fitting passes make the limit surface pass
    through the traced form at every control direction."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=CAGE_N - 1, use_grid_fill=True)
    for v in bm.verts:
        v.co = Vector([math.tan(c * math.pi / 4) for c in v.co]).normalized()
    me = bpy.data.meshes.new('ShellCage'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('ShellCage', me); bpy.context.collection.objects.link(ob)
    sub = ob.modifiers.new('Sub', 'SUBSURF'); sub.levels = sub.render_levels = CAGE_LEVELS
    dirs = [v.co.copy() for v in me.vertices]
    rho = [profile_point(d).length for d in dirs]
    for it in range(6):
        for v, d, r in zip(me.vertices, dirs, rho):
            v.co = d * r
        me.update(); bpy.context.view_layer.update()
        bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
        worst = 0.0
        for i, d in enumerate(dirs):
            hit = bvh.ray_cast(Vector((0, 0, 0)), d)[0]
            want = profile_point(d).length
            worst = max(worst, abs(hit.length - want))
            rho[i] *= want / hit.length
        tick(f'cage fit {it}: worst {worst * 1000:.2f} mm')
    for v, d, r in zip(me.vertices, dirs, rho):
        v.co = d * r
    me.update(); bpy.context.view_layer.update()
    oe = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    em = oe.to_mesh()
    em.calc_loop_triangles()
    V = [v.co.copy() for v in em.vertices]
    N = [n.vector.copy() for n in em.vertex_normals]
    T = [tuple(t.vertices) for t in em.loop_triangles]
    oe.to_mesh_clear()
    bpy.data.objects.remove(ob)
    return V, N, T


CAGE_V, CAGE_NRM, CAGE_T = build_cage()
BASE = BVHTree.FromPolygons(CAGE_V, CAGE_T)
ORIGIN = Vector((0, 0, 0))


def base_hit(o):
    hit = BASE.ray_cast(ORIGIN, o)
    if hit[0] is None:
        hit = BASE.ray_cast(ORIGIN, (o + Vector((1e-5, 2e-5, 3e-5))).normalized())
    return hit


def base_point(o):
    """the limit surface of the cage along direction o"""
    return base_hit(o)[0]


def base_normal(o):
    """outward normal of the limit surface, interpolated from the subdivided
    vertex normals so reflections never show the facets"""
    p, _, idx, _ = base_hit(o)
    a, b, c = (CAGE_V[i] for i in CAGE_T[idx])
    v0, v1, v2 = b - a, c - a, p - a
    d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1)
    den = d00 * d11 - d01 * d01 or 1e-12
    wb = (d11 * d20 - d01 * d21) / den
    wc = (d00 * d21 - d01 * d20) / den
    na, nb, nc = (CAGE_NRM[i] for i in CAGE_T[idx])
    n = (na * (1 - wb - wc) + nb * wb + nc * wc).normalized()
    return n if n.dot(o) > 0 else -n


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
NP_TOP = BROW_Z + 0.043                # nameplate top edge (the plate is 4.1 cm tall)
_pb = centre_point(NP_TOP + 0.023)
PANEL_BOT_S = math.atan2(-_pb.y, _pb.z)
PANEL_R = 0.15                          # arc-length scale for s
PANEL_GAP = 0.0042
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
    return lerp(0.0020, 0.0028, smooth(PANEL_TOP_S, PANEL_KNEE_S, panel_s(p)))


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

    def lip_side(self, p):
        """signed distance to the lip line inside the scoop region (None elsewhere)"""
        if not self.depth:
            return None
        c = self.coords(p)
        if c is None or not (self.box[0] < c[0] < self.box[1] and self.box[2] < c[1] < self.box[3]):
            return None
        if poly_sd(c, self.poly) > self.fade + 0.002:
            return None
        (a0, b0), (a1, b1) = self.lip
        return ((a1 - a0) * (c[1] - b0) - (b1 - b0) * (c[0] - a0)) / math.hypot(a1 - a0, b1 - b0)

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
        # only alongside the opening: the scoop dies out just past its ends
        ux, uy = (a1 - a0) / L, (b1 - b0) / L
        ts = [(q[0] - a0) * ux + (q[1] - b0) * uy for q in self.poly]
        t = (c[0] - a0) * ux + (c[1] - b0) * uy
        along = max(min(ts) - t, t - max(ts), 0.0)
        return (self.depth * (1 - smooth(0.0, self.fade, max(d, 0.0))) * (1 - smooth(0.0, 0.004, along))
                * (1 - smooth(-LIP_W, 0.0, side)))


VENTS = [
    # forward-facing brow vent beside the Flex panel: slanted slot, front end high,
    # in a scoop that opens toward the front
    Vent([(-0.088, 0.095), (-0.080, 0.098), (-0.056, 0.087), (-0.041, 0.083), (-0.039, 0.072),
          (-0.056, 0.070), (-0.084, 0.083)],
         lip=((-0.092, 0.099), (-0.038, 0.084)), depth=0.005, fade=0.02),
    # crown slot
    Vent([(-0.004, 0.138), (0.046, 0.127), (0.049, 0.121), (-0.002, 0.132)],
         lip=((-0.008, 0.140), (0.052, 0.126)), depth=0.0032, fade=0.014),
    # rear upper slot, slanting down toward the back
    Vent([(0.093, 0.090), (0.101, 0.092), (0.131, 0.046), (0.124, 0.042)],
         lip=((0.122, 0.038), (0.091, 0.093)), depth=0.003, fade=0.012),
    # jaw / ear vent: long slanted pentagon with a crisp top edge
    Vent([(-0.044, -0.045), (-0.036, -0.022), (0.018, -0.019), (0.025, -0.029), (-0.020, -0.047)],
         lip=((-0.048, -0.0215), (0.030, -0.0170)), depth=0.0032, fade=0.018, rnd=0.0),
    # two slots low on the back
    Vent([(0.052, -0.019), (0.090, -0.008), (0.091, -0.001), (0.054, -0.011)], proj='back',
         lip=((0.048, -0.008), (0.096, 0.004)), depth=0.0028, fade=0.014),
]
PLUG = ((-0.050, -0.071), 0.0062)
LIP_W = 0.0016                              # width of the bevel at a vent lip
STEP_W = 0.0014                             # and at the Flex panel's edge          # jaw-pad port, side projection (y, z), radius


def displace_amount(p):
    d = 0.0
    e = panel_e(p)
    if e > -0.01:
        d -= panel_depth(p) * smooth(-STEP_W, 0.0, e)
    for v in VENTS:
        d -= v.scoop(p)
    # the lower back flares out to the rear bumper
    d += 0.0075 * smooth(0.02, 0.14, p.y) * smooth(-0.06, -0.125, p.z)
    return d


def displace(p):
    return p + p.normalized() * displace_amount(p)


def surf(o):
    return displace(base_point(o))


# ─── openings ──────────────────────────────────────────────────────────
# face opening edge seen from the side: just in front of the upper clip at the
# temple, then down the jaw extension a few mm ahead of the mask's S-shaped
# side bar, so the frame lies over the shell between the clips; the jaw
# extension reaches forward under the lower clip.
EDGE_Y = [(-0.17, -0.097), (-0.14, -0.095), (-0.12, -0.090), (-0.10, -0.080), (-0.08, -0.066),
          (-0.06, -0.064), (-0.04, -0.067), (-0.02, -0.068), (0.0, -0.075), (0.02, -0.085),
          (0.035, -0.105), (0.05, -0.14)]
OPEN_HW = [(-0.16, 0.080), (-0.10, 0.083), (-0.06, 0.088), (0.0, 0.094), (0.05, 0.09)]  # half width of the opening from the front
BOTTOM_Z = [(-0.2, -0.128), (-0.11, -0.134), (-0.06, -0.140), (-0.02, -0.143), (0.03, -0.138),
            (0.07, -0.128), (0.12, -0.118), (0.2, -0.115)]         # lower edge by y


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
    if -0.0055 < e < 0.0025 and p.z > 0.0 and panel_s(p) > GAP_FROM_S - 0.03:
        return 2
    if min(v.sd(p) for v in VENTS) < 0.0035:
        return 1
    return 0


tick('grown')
for cuts in (2, 1):
    edges = [e for e in bm.edges if any(near_detail(v.co) == cuts for v in e.verts)]
    tick(f'densify {cuts}: {len(edges)} edges, {len(bm.verts)} verts')
    bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        o = get_o(v)
        o = o.normalized() if o.length > 0.5 else v.co.normalized()
        set_o(v, o)
        v.co = surf(o)

def split_contour(bm, field):
    """Split the mesh along the zero contour of field(point) (None = no opinion):
    every edge whose ends differ in sign gets a vertex at the crossing (found by
    bisection on the shell), and the crossings in each triangle are joined.
    Returns the per-vertex field values."""
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    F = {v: field(v.co) for v in bm.verts}
    zero = set()
    for e in list(bm.edges):
        a, b = e.verts
        fa, fb = F[a], F[b]
        if fa is None or fb is None or (fa < 0) == (fb < 0) or fa == 0 or fb == 0:
            continue
        oa, ob = get_o(a), get_o(b)
        lo, hi = 0.0, 1.0
        for _ in range(14):
            t = (lo + hi) / 2
            fv = field(surf(oa.lerp(ob, t).normalized()))
            if fv is None:
                break
            lo, hi = (t, hi) if (fv < 0) == (fa < 0) else (lo, t)
        t = (lo + hi) / 2
        o = oa.lerp(ob, t).normalized()
        # a crossing right next to a vertex moves that vertex instead of making a sliver
        near = a if t < 0.2 else b if t > 0.8 else None
        if near is not None and near not in zero:
            set_o(near, o)
            near.co = surf(o)
            F[near] = 0.0
            zero.add(near)
            continue
        ne, nv = bmesh.utils.edge_split(e, a, t)
        set_o(nv, o)
        nv.co = surf(o)
        F[nv] = 0.0
        zero.add(nv)
    for f in list(bm.faces):
        zs = [v for v in f.verts if v in zero]
        if len(zs) == 2 and not bm.edges.get(zs):
            bmesh.utils.face_split(f, zs[0], zs[1])
    return F


# vertex rows exactly along the vent lips and the Flex panel's edge, so the
# scoops and the panel step get clean bevels instead of stair steps
for v in VENTS:
    if v.depth:
        for off in (0.0, LIP_W):
            split_contour(bm, lambda p, v=v, off=off: (lambda q: None if q is None else q + off)(v.lip_side(p)))
for off in (0.0, STEP_W):
    split_contour(bm, lambda p, off=off: (lambda e: None if e < -0.006 else e + off)(panel_e(p)))
tick(f'lips split {len(bm.verts)}')

# exact cut: split along the zero contour of the cut field, drop the negative side
F = split_contour(bm, cut_value)
tick(f'cut {len(bm.verts)}')
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


def surf_normal(o):
    """outward normal of the (undisplaced) shell surface at direction o"""
    return base_normal(o)


loops = ordered_loops(bm)
# tiny holes (a lone face dropped by the cut) are filled back in
for loop in [l for l in loops if 3 <= len(l) < 7]:
    try:
        bm.faces.new(loop)
    except ValueError:
        pass
loops = [l for l in loops if len(l) >= 7]
main_loop = min(loops, key=lambda l: min(v.co.z for v in l))   # face opening + bottom edge
trim_path = [v.co.copy() for v in main_loop]
trim_norm = [surf_normal(get_o(v)) for v in main_loop]

SKIRT = bm.faces.layers.int.new('skirt')
# walls: the shell edge (4 mm, shell coloured) then dark liner behind it, so
# vents, the panel gap and the face opening show depth instead of a paper edge
for loop in loops:
    N = len(loop)
    r1, r2 = {}, {}
    # the Flex panel gap is dark all the way down; vents show the shell wall first
    in_gap = sum(abs(f_gap(v.co)) < 0.0005 for v in loop) > N * 0.6
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
        q1 = bm.faces.new((b, a, r1[a], r1[b])); q1.material_index = 1 if in_gap else 0
        q2 = bm.faces.new((r1[b], r1[a], r2[a], r2[b])); q2.material_index = 1
        q1[SKIRT] = q2[SKIRT] = 1
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
bm.to_mesh(me); bm.free()
me.validate(clean_customdata=False)


def surf_normal_disp(o, h=0.0004):
    """outward normal of the displaced shell (panel recess and scoops
    included): the smooth base normal tilted by the slope of the displacement"""
    n = base_normal(o)
    if displace_amount(base_point(o)) == 0.0:
        return n
    t1 = n.orthogonal().normalized()
    t2 = n.cross(t1).normalized()
    g = Vector((0, 0, 0))
    for t in (t1, t2):
        qa, qb = base_point((o + t * h).normalized()), base_point((o - t * h).normalized())
        da, db = displace_amount(qa), displace_amount(qb)
        e = qa - qb
        L = e.length
        g += e.normalized() * ((da - db) / L)
    return (n - g).normalized()


# shade the outer surface from the analytic shape, so the triangulation left by
# the cuts never shows in reflections; the walls keep flat normals
ox, oy, oz = (me.attributes[k].data for k in ('ox', 'oy', 'oz'))
skirt = me.attributes['skirt'].data
vn = {}
loop_normals = []
for poly in me.polygons:
    for li in poly.loop_indices:
        vi = me.loops[li].vertex_index
        if skirt[poly.index].value:
            loop_normals.append(tuple(poly.normal))
        else:
            if vi not in vn:
                vn[vi] = tuple(surf_normal_disp(Vector((ox[vi].value, oy[vi].value, oz[vi].value)).normalized()))
            loop_normals.append(vn[vi])
me.normals_split_custom_set(loop_normals)
for k in ('ox', 'oy', 'oz', 'skirt'):
    me.attributes.remove(me.attributes[k])
while len(me.uv_layers) > 1:
    me.uv_layers.remove(me.uv_layers[0])
shell.data.materials.append(material('shell'))
shell.data.materials.append(material('liner'))
tick(f'shell verts {len(me.vertices)}')


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
    """project a point onto the outer shell, along the ray from the origin
    (over a hole in the shell, the nearest point of the shell instead)"""
    d = target.normalized()
    hit = shell_bvh.ray_cast(d * 0.4, -d)
    if hit[0] is None or hit[0].dot(d) < 0:
        hit = shell_bvh.find_nearest(target)
    return hit[0] + hit[1] * lift, hit[1]


def on_shell_dir(origin, direction, lift=0.0, dist=0.32):
    hit = shell_bvh.ray_cast(origin, direction, dist)
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
    H = 0.027                                  # height up the shell
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
            out = 0.0014 + 0.0045 * (1 - h) ** 1.8 * endk
            down = 0.003 * (1 - h) ** 3 * endk
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
            verts.append(hit + n * thick_fn(u, v)); uvs.append((u, v))
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


np_outline = rounded_trapezoid(0.056, 0.046, BROW_Z + 0.002, NP_TOP, 0.012, 0.003)
# the bumper is thickest in the middle and thins toward its ends
nameplate = plate_on_shell('Nameplate', np_outline, 'bumper',
                           lambda u, v: lerp(0.0062, 0.0048, v) * (1 - 0.3 * smooth(0.7, 1.0, abs(2 * u - 1))))

# hard surface the facemask is fitted against: the finished shell and the bumper
_hard_v, _hard_f = [], []
for ob in (shell, nameplate):
    for v in ob.data.vertices:
        _hard_v.append(v.co.copy())
    off = len(_hard_v) - len(ob.data.vertices)
    for poly in ob.data.polygons:
        _hard_f.append([off + i for i in poly.vertices])
HARD = BVHTree.FromPolygons(_hard_v, _hard_f)


def hard_dist(q):
    """signed distance from q to the shell/bumper surface (negative inside)"""
    hit, n, _, d = HARD.find_nearest(q)
    if hit is None:
        return 1.0, q, Vector((0, 0, 1))
    return (d if (q - hit).dot(n) >= 0 else -d), hit, n


# ─── SpeedFlex facemasks ───────────────────────────────────────────────
# Traced from Riddell's orthographic renders of the SF-2BD-SW (front, side,
# 3/4). Points are (X, Y, Z) in render pixels: X from the front view (out from
# the centre line), Y and Z from the side view (Y back from the front, Z down).
# Both renders share one scale. The frame is a single bar per side: the top
# bar across the brow steps down round the corner of the face opening, runs
# back above the temple to the "horn", drops through the upper clip, swings
# forward and down the S-shaped side to the nose-bar junction, back to the
# lower corner in the lower clip and forward again as the chin bar.
MR = 0.0034            # 6.8 mm bar (1/4" + powder coat)
TOP_GAP = 0.003        # top bar to bumper/shell, surface to surface
CLIP_BAR_H = 0.0064    # bar centre above the shell where a clip holds it
MASK_S = 0.000275      # m per render pixel (frame width at the horns = shell width at the temples)
MASK_Z0 = 0.045        # top bar centre height: across the lower third of the nameplate bumper
PX_Y0, PX_Z0 = 400, 238

FRAME_PX = [(0, 400, 238), (150, 437, 238), (300, 525, 240), (362, 585, 270), (418, 708, 254),
            (470, 830, 240), (488, 893, 345), (450, 782, 440), (425, 742, 560), (418, 760, 600),
            (410, 800, 665), (403, 855, 750), (365, 720, 835), (300, 657, 865), (230, 581, 895),
            (150, 506, 925), (0, 430, 945)]
FRAME_TOP_END = 5      # FRAME_PX[:6] is the top bar (fitted to the bumper and shell)
UPPER_CLIP_PX = (481, 867, 303)   # on the drop from the horn
LOWER_CLIP_PX = (403, 855, 750)   # the lower corner
EYE_PX = [(0, 380, 292), (300, 470, 305), (425, 625, 327)]
BRIDGE_PX = [(0, 400, 238), (0, 368, 265), (0, 380, 292)]
POST_PX = [(428, 625, 282), (420, 628, 330), (390, 633, 450), (355, 640, 600), (315, 645, 720), (262, 655, 880)]
NOSE_PX = [(0, 330, 642), (100, 355, 640), (200, 450, 632), (300, 590, 620), (350, 690, 612), (418, 760, 606),
           (450, 768, 605)]
STUB_PX = [(340, 640, 688), (410, 760, 670), (450, 805, 665)]
LOWV_PX = [(175, 340, 632), (150, 375, 780), (130, 425, 935)]
EYEGUARD_PX = [(175, 432, 298), (175, 424, 465), (175, 426, 634)]


def px(q, y0):
    X, Y, Z = q
    return P(X * MASK_S, y0 + (Y - PX_Y0) * MASK_S, MASK_Z0 - (Z - PX_Z0) * MASK_S)


def mirror(pts):
    return [P(-q.x, q.y, q.z) for q in pts]


def fillet(pts, R):
    """polyline with every corner rounded to radius R (bent bar stock)"""
    if len(pts) < 3:
        return list(pts)
    out = [pts[0]]
    for a, b, c in zip(pts, pts[1:], pts[2:]):
        u, w = (a - b), (c - b)
        la, lc = u.length, w.length
        u.normalize(); w.normalize()
        ang = math.acos(max(-1.0, min(1.0, u.dot(w))))
        if ang > math.pi - 0.02:
            out.append(b); continue
        t = min(R / math.tan(ang / 2), la * 0.45, lc * 0.45)
        p0, p1 = b + u * t, b + w * t
        # quadratic Bezier through the corner: close to an arc, tangent at both ends
        for k in range(9):
            s = k / 8
            out.append(p0 * (1 - s) ** 2 + b * 2 * s * (1 - s) + p1 * s * s)
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
    if (out[-1] - pts[-1]).length > step * 0.3:
        out.append(pts[-1])
    else:
        out[-1] = pts[-1]
    return out


def fair(pts, n=3, keep_ends=True):
    for _ in range(n):
        pts = [pts[0]] + [(pts[i - 1] + pts[i] * 2 + pts[i + 1]) / 4 for i in range(1, len(pts) - 1)] + [pts[-1]]
    return pts


def solve_top(q, gap, check=True):
    """move a top-bar point horizontally toward the z axis until the bar sits
    `gap` off the bumper/shell (surface to surface); None over the opening"""
    d = Vector((q.x, q.y, 0.0))
    if d.length < 1e-6:
        return None
    d.normalize()
    axis = P(0, 0, q.z)
    hit = HARD.ray_cast(axis + d * 0.4, -d, 0.4)
    if hit[0] is None:
        return None
    ts = (hit[0] - axis).dot(d)
    t_trace = (q - axis).dot(d)
    if check and (t_trace - ts > 0.03 or ts - t_trace > 0.025):
        return None                  # the ray went through the face opening
    want = MR + gap
    lo, hi = ts, ts + 0.04
    for _ in range(30):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if hard_dist(axis + d * mid)[0] < want else (lo, mid)
    return axis + d * ((lo + hi) / 2)


def on_hard(q, lift):
    s, hit, n = hard_dist(q)
    return hit + n * lift, n


def trace_bars(style, y0):
    """the traced bars of one mask style, filleted and resampled (2 mm)"""
    def half(pxs, R=0.008):
        return fillet([px(q, y0) for q in pxs], R)

    bars = {}
    fr = resample(half(FRAME_PX, 0.0075), 0.002)
    # one closed loop: top centre → +x side → chin centre → -x side → (top centre)
    bars['frame'] = fr + list(reversed(mirror(fr)))[1:-1]
    eye = resample(half(EYE_PX, 0.02), 0.002)
    bars['eye'] = list(reversed(eye))[:-1] + mirror(eye)
    bars['bridge'] = resample(half(BRIDGE_PX, 0.012), 0.002)
    post = resample(half(POST_PX, 0.01), 0.002)
    bars['postL'], bars['postR'] = post, mirror(post)
    nose = resample(half(NOSE_PX, 0.02), 0.002)
    bars['nose'] = list(reversed(nose))[:-1] + mirror(nose)
    stub = resample(half(STUB_PX, 0.01), 0.002)
    bars['stubL'], bars['stubR'] = stub, mirror(stub)
    if style in ('2BD', '2EG'):
        lv = resample(half(LOWV_PX, 0.02), 0.002)
        bars['lowvL'], bars['lowvR'] = lv, mirror(lv)
    if style == '2EG':
        eg = resample(half(EYEGUARD_PX, 0.02), 0.002)
        bars['guardL'], bars['guardR'] = eg, mirror(eg)
    if style == '3BD':
        # lineman cage: two more bars between the posts below the nose bar and
        # a centre bar from the nose bar to the chin bar; inner verticals stay
        lv = resample(half(LOWV_PX, 0.02), 0.002)
        bars['lowvL'], bars['lowvR'] = lv, mirror(lv)
        for k, Z in enumerate((702, 775)):
            yc = 330 + (Z - 642) * 0.26
            xp = 355 - (Z - 600) * (40 / 120)
            ypost = 640 + (Z - 600) * 0.05
            pts = [(xp * f, yc + (ypost - yc) * f ** 2.2, Z - 6 * (1 - f)) for f in (0, 0.25, 0.5, 0.75, 0.9, 1.0)]
            h = resample(half(pts, 0.02), 0.002)
            bars[f'cage{k}'] = list(reversed(h))[:-1] + mirror(h)
        bars['centre'] = resample(half([(0, 330, 642), (0, 372, 790), (0, 430, 945)], 0.02), 0.002)
    return bars


def build_mask(style):
    tag = f'M{style}_'
    # place the trace so its top bar centre sits TOP_GAP off the bumper
    front = solve_top(P(0, -0.25, MASK_Z0), TOP_GAP, check=False)
    y0 = front.y
    bars = trace_bars(style, y0)
    fr = bars['frame']
    horn = px(FRAME_PX[FRAME_TOP_END], y0)
    top_ids = [i for i, q in enumerate(fr) if q.y <= horn.y + 1e-4 and q.z >= horn.z - 0.012
               and q.z > px(FRAME_PX[7], y0).z + 0.01]
    # 1. the top bar: solved against the bumper and shell sample by sample,
    # then faired and kept at least 2 mm off
    solved = {}
    for i in top_ids:
        s = solve_top(fr[i], TOP_GAP)
        if s is not None:
            solved[i] = s
    ids = sorted(solved)
    # fair along the bar (runs of consecutive solved samples)
    for _ in range(4):
        new = {}
        for i in ids:
            a, b = solved.get(i - 1), solved.get(i + 1)
            new[i] = (a + solved[i] * 2 + b) / 4 if a is not None and b is not None else solved[i]
        for i in ids:
            q = new[i]
            sd = hard_dist(q)[0]
            if sd < MR + 0.002:
                _, hit, n = hard_dist(q)
                q = hit + n * (MR + 0.002)
            solved[i] = q
    # 2. the clips: the frame drops into the upper clip at the temple and sits in
    # the lower clip at its lower corner, both CLIP_BAR_H off the shell
    clips = []
    anchors, disp = [], []
    for side in (1, -1):
        for key, pxq in (('Hi', UPPER_CLIP_PX), ('Lo', LOWER_CLIP_PX)):
            q = px(pxq, y0)
            if side < 0:
                q = P(-q.x, q.y, q.z)
            tgt, n = on_hard(q, CLIP_BAR_H)
            # nearest frame sample is the one the clip holds
            j = min(range(len(fr)), key=lambda k: (fr[k] - q).length)
            anchors.append(fr[j].copy()); disp.append(tgt - fr[j])
            clips.append((key, side, tgt, n, j))
    for i in ids[::3]:
        anchors.append(fr[i].copy()); disp.append(solved[i] - fr[i])
    # 3. everything follows through a smooth thin-plate field, so the welds
    # stay joined and the bars keep their traced shape
    from scipy.interpolate import RBFInterpolator
    import numpy as np
    rbf = RBFInterpolator(np.array([tuple(a) for a in anchors]), np.array([tuple(d) for d in disp]),
                          kernel='thin_plate_spline', smoothing=1e-9)

    def warp(pts):
        if not pts:
            return pts
        D = rbf(np.array([tuple(q) for q in pts]))
        return [q + Vector(tuple(d)) for q, d in zip(pts, D)]

    for name in bars:
        bars[name] = warp(bars[name])
    fr = bars['frame']
    for i in ids:
        fr[i] = solved[i]
    for key, side, tgt, n, j in clips:
        fr[j] = tgt
    bars['frame'] = fair(fr, 2)
    # 4. nothing may sink into the shell (outside the clips): push out, fair the push
    clip_pts = [tgt for _, _, tgt, _, _ in clips]
    for name, pts in bars.items():
        for _ in range(6):
            push = []
            for q in pts:
                if min((q - c).length for c in clip_pts) < 0.014:
                    push.append(Vector((0, 0, 0))); continue
                hit, _, _, dist = HARD.find_nearest(q)
                need = MR + 0.0028          # room for a chin strap under the bar
                # away from the nearest surface point (the face normal is no
                # guide at the open edges of the shell)
                push.append((q - hit).normalized() * (need - dist) if dist < need else Vector((0, 0, 0)))
            if max(p.length for p in push) < 1e-5:
                break
            push = fair(push, 2)
            pts = [q + p for q, p in zip(pts, push)]
        bars[name] = pts
    # 5. the "SW" stubs and the nose-bar ends run out until they touch the jaw extension
    for name in ('stubL', 'stubR'):
        bars[name] = run_to_shell(bars[name])
    nose = bars['nose']
    bars['nose'] = list(reversed(run_to_shell(list(reversed(run_to_shell(nose))))))
    return bars, clips


def run_to_shell(pts, max_ext=0.02):
    """extend (or trim) the last end of a bar along its direction until the bar touches the shell"""
    d = (pts[-1] - pts[-3]).normalized()
    q = pts[-1]
    if hard_dist(q)[0] < MR:
        while len(pts) > 4 and hard_dist(pts[-2])[0] < MR:
            pts = pts[:-1]
        return pts
    ext = []
    for k in range(1, int(max_ext / 0.001)):
        r = q + d * (k * 0.001)
        ext.append(r)
        if hard_dist(r)[0] < MR + 0.0002:
            break
    else:
        return pts
    return pts + ext[1::2] + [ext[-1]]


def top_clearance(bars, clips):
    """surface-to-surface distance from the top bar to the bumper/shell"""
    horn_z = min(c[2].z for c in clips if c[0] == 'Hi') + 0.012
    ds = []
    for q in bars['frame']:
        if q.z > horn_z and q.y < max(c[2].y for c in clips if c[0] == 'Hi') + 0.005:
            sd = hard_dist(q)[0] - MR
            if sd < 0.02:
                ds.append(sd)
    return ds


WELDS = [('bridge', 'frame'), ('bridge', 'eye'), ('eye', 'postL'), ('eye', 'postR'), ('postL', 'frame'),
         ('postR', 'frame'), ('nose', 'postL'), ('nose', 'postR'), ('nose', 'frame'), ('stubL', 'postL'),
         ('stubR', 'postR'), ('stubL', 'frame'), ('stubR', 'frame'), ('lowvL', 'nose'), ('lowvR', 'nose'),
         ('lowvL', 'frame'), ('lowvR', 'frame'), ('guardL', 'eye'), ('guardR', 'eye'), ('guardL', 'nose'),
         ('guardR', 'nose'), ('centre', 'nose'), ('centre', 'frame'), ('cage0', 'postL'), ('cage0', 'postR'),
         ('cage1', 'postL'), ('cage1', 'postR'), ('cage0', 'lowvL'), ('cage0', 'lowvR'), ('cage1', 'lowvL'),
         ('cage1', 'lowvR'), ('centre', 'cage0'), ('centre', 'cage1')]


def snap_welds(bars):
    """where two bars meet, pull the lighter bar onto the other (blended back
    along it) so every joint really touches; return the weld positions"""
    import numpy as np
    welds = []
    for a, b in WELDS:
        if a not in bars or b not in bars:
            continue
        A, B = bars[a], bars[b]
        Bn = np.array([tuple(q) for q in B])
        best = None
        for i, q in enumerate(A):
            d = np.linalg.norm(Bn - np.array(tuple(q)), axis=1)
            j = int(d.argmin())
            if best is None or d[j] < best[0]:
                best = (d[j], i, j)
        dist, i, j = best
        if dist > 0.03:
            continue
        # crossings: within 2 bar radii; ends: pull A's point onto B
        if dist > MR * 1.2:
            delta = B[j] - A[i]
            delta = delta - delta.normalized() * MR * 1.2
            # arc length from i
            acc = [0.0] * len(A)
            for k in range(i + 1, len(A)):
                acc[k] = acc[k - 1] + (A[k] - A[k - 1]).length
            for k in range(i - 1, -1, -1):
                acc[k] = acc[k + 1] + (A[k] - A[k + 1]).length
            A = [q + delta * (1 - smooth(0.0, 0.035, acc[k])) for k, q in enumerate(A)]
            bars[a] = A
        welds.append((A[i] + B[j]) / 2)
    return welds


def end_cap(name, at, d, mat):
    """rounded end on a cut bar"""
    return blob(name, at, (MR, MR, MR), mat, n=2.0, seg=12, rings=8)


MASK_STYLES = ('2BD', '2EG', '3BD')
mask_parts = []
mask_info = {}
for st in MASK_STYLES:
    bars, clips = build_mask(st)
    welds = snap_welds(bars)
    tag = f'M{st}_'
    for name, pts in bars.items():
        pts = [pts[0]] + pts[1:-1:2] + [pts[-1]] if len(pts) > 40 else pts   # 4 mm along the bar is plenty
        loop = name == 'frame'
        mask_parts.append(tube(f'{tag}{name}', pts, MR, 'mask', cyclic=loop, res=3))
        if not loop:
            for k, (e, e2) in enumerate(((pts[0], pts[1]), (pts[-1], pts[-2]))):
                mask_parts.append(end_cap(f'{tag}{name}_end{k}', e, e - e2, 'mask'))
    for i, w in enumerate(welds):
        mask_parts.append(blob(f'{tag}weld{i}', w, (MR * 1.35, MR * 1.35, MR * 1.35), 'mask', n=2.0, seg=12, rings=8))
    mask_info[st] = (bars, clips)
    ds = top_clearance(bars, clips)
    tick(f'mask {st}: top bar clearance min {min(ds) * 1000:.2f} mm, max {max(ds) * 1000:.2f} mm over {len(ds)} samples')
TOP_CLEARANCE = top_clearance(*mask_info['2BD'])
if os.environ.get('HELMET_DEBUG'):
    json.dump({st: {'bars': {k: [tuple(q) for q in v] for k, v in mask_info[st][0].items()},
                    'clips': [(c[0], c[1], tuple(c[2]), tuple(c[3])) for c in mask_info[st][1]]}
               for st in MASK_STYLES} | {'y0': solve_top(P(0, -0.25, MASK_Z0), TOP_GAP, check=False).y},
              open(os.path.join(args.out, 'mask_debug.json'), 'w'))


# ─── quick-release clips ───────────────────────────────────────────────
# Clear polycarbonate housings moulded round the bar, ~46 x 26 mm, the base
# following the shell, the chrome release button toward the front end and the
# bar held in a channel across the rear end.
clips = []
CLIP_L, CLIP_W, CLIP_H = 0.048, 0.026, 0.0118
CLIP_BAR_AT = 0.0115   # bar centre this far in from the housing's rear end


def qr_clip(name, bar_at, n, along):
    """housing whose rear end wraps the bar at bar_at"""
    n = n.normalized()
    ax = (along - n * along.dot(n)).normalized()
    ay = n.cross(ax)
    base_c = bar_at - n * CLIP_BAR_H + ax * (CLIP_L / 2 - CLIP_BAR_AT)
    # footprint: rounded rectangle, projected onto the shell along -n
    NU, NV, RINGS = 40, 1, 7
    outline = []
    rr = 0.0085
    hx, hy = CLIP_L / 2, CLIP_W / 2
    for k in range(64):
        a = 2 * math.pi * k / 64
        c, s = math.cos(a), math.sin(a)
        # superellipse footprint, squarer along its length
        e = 4.0
        r = (abs(c / hx) ** e + abs(s / hy) ** e) ** (-1 / e)
        outline.append((c * r, s * r))
    verts, faces = [], []
    grid = []
    for j in range(RINGS + 1):
        t = j / RINGS
        row = []
        for k in range(len(outline) if j else 1):
            u, v = (0.0, 0.0) if j == 0 else (outline[k][0] * t, outline[k][1] * t)
            q = base_c + ax * u + ay * v
            hit, hn, _, _ = shell_bvh.find_nearest(q)
            if hit is None:
                hit, hn = q, n
            # flat-topped dome with rounded shoulders; the rear third, where the
            # bar runs through, stands a little taller
            rear = smooth(0.1, 0.6, -u / hx)
            h = CLIP_H * (1 - t ** 8) ** 0.5 * (0.84 + 0.16 * rear)
            row.append(len(verts)); verts.append(hit + hn * h)
        grid.append(row)
    N = len(outline)
    for k in range(N):
        faces.append((grid[0][0], grid[1][k], grid[1][(k + 1) % N]))
    for j in range(1, RINGS):
        for k in range(N):
            faces.append((grid[j][k], grid[j + 1][k], grid[j + 1][(k + 1) % N], grid[j][(k + 1) % N]))
    rim = grid[RINGS]
    base = []
    for k in range(N):
        q = verts[rim[k]]
        hit, hn, _, _ = shell_bvh.find_nearest(q)
        base.append(len(verts)); verts.append(hit - hn * 0.0006)
    for k in range(N):
        faces.append((rim[k], base[k], base[(k + 1) % N], rim[(k + 1) % N]))
    housing = mesh_object(name, verts, faces, 'clip')
    me = housing.data; me.update()
    if me.polygons[0].normal.dot(n) < 0:
        for poly in me.polygons:
            poly.flip()
    housing.data.shade_smooth()
    top = base_c + n * (CLIP_H * 0.86)
    btn_at = top + ax * 0.007
    hit, hn, _, _ = shell_bvh.find_nearest(btn_at)
    btn_at = hit + hn * (CLIP_H * 0.84)
    btn = cylinder(name + '_btn', 0.0052, 0.0022, 'button', verts=28, bevel=0.0007)
    place(btn, frame(btn_at, hn, ax))
    pin = cylinder(name + '_pin', 0.0016, 0.0010, 'clipscrew', verts=16)
    place(pin, frame(btn_at + hn * 0.0022, hn, ax))
    ring = cylinder(name + '_base', 0.0068, 0.0010, 'clipscrew', verts=24)
    place(ring, frame(btn_at - hn * 0.0006, hn, ax))
    return [housing, btn, pin, ring]


bars0, clips0 = mask_info['2BD']
for key, side, tgt, n, j in clips0:
    along = P(0, -1, -0.12) if key == 'Hi' else P(0, -1, 0.3)
    clips += qr_clip(f'Clip{key}{side}', tgt, n, along)
hi_at = next(c[2] for c in clips0 if c[0] == 'Hi' and c[1] == 1)
lo_at = next(c[2] for c in clips0 if c[0] == 'Lo' and c[1] == 1)


# ─── chin strap ────────────────────────────────────────────────────────
# The hard cup is small and wraps the chin (chin at y -0.104, z -0.134): its
# front sits ~1 cm off the chin, 4 cm behind the chin bar, and its lower edge
# hides behind the chin bar in the front view.
CUP_C = P(0, -0.080, -0.1325)           # centre of the cup's curvature


CUP_A, CUP_ZH, CUP_N = 1.22, 0.0205, 2.8          # angular half-width, half-height, outline roundness
CUP_HOLES = ((-0.34, -0.006, 0.21, 0.0062), (0.34, -0.006, 0.21, 0.0062))   # (a, z, ra, rz)


def cup_point(a, z, inset):
    rx, ry = 0.041 - inset, 0.035 - inset
    # the lower edge tucks under the chin, the upper edge leans back a little
    curl = 0.36 * (min(z, 0) ** 2) / 0.03 + 0.10 * (max(z, 0) ** 2) / 0.03
    return P(math.sin(a) * rx, -math.cos(a) * ry + curl, z) + CUP_C


def cup_sheet(name, mat, inset, holes):
    """the hard cup: a rounded, chin-wrapping shell with two oval vents"""
    NA, NZ = 96, 44
    bm = bmesh.new()
    az = {}
    grid = {}
    for j in range(NZ + 1):
        for i in range(NA + 1):
            a = lerp(-CUP_A * 1.05, CUP_A * 1.05, i / NA); z = lerp(-CUP_ZH * 1.05, CUP_ZH * 1.05, j / NZ)
            v = bm.verts.new(cup_point(a, z, inset)); az[v] = (a, z); grid[(i, j)] = v
    outside = lambda a, z: abs(a / CUP_A) ** CUP_N + abs(z / CUP_ZH) ** CUP_N > 1
    in_hole = lambda a, z: holes and any(((a - ha) / ra) ** 2 + ((z - hz) / rz) ** 2 < 1 for ha, hz, ra, rz in CUP_HOLES)
    for j in range(NZ):
        for i in range(NA):
            vs = [grid[(i, j)], grid[(i, j + 1)], grid[(i + 1, j + 1)], grid[(i + 1, j)]]
            if any(outside(*az[v]) or in_hole(*az[v]) for v in vs):
                continue
            bm.faces.new(vs)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # pull the jagged boundary onto the true outline / hole ellipses
    for v in [v for v in bm.verts if v.is_boundary]:
        a, z = az[v]
        best = None
        k = (abs(a / CUP_A) ** CUP_N + abs(z / CUP_ZH) ** CUP_N) ** (-1 / CUP_N)
        cand = [(abs(k - 1), a * k, z * k)]
        if holes:
            for ha, hz, ra, rz in CUP_HOLES:
                da, dz = a - ha, z - hz
                r = math.hypot(da / ra, dz / rz) or 1e-6
                cand.append((abs(r - 1) * 0.7, ha + da / r, hz + dz / r))
        _, a2, z2 = min(cand)
        v.co = cup_point(a2, z2, inset)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material(mat))
    me.update()
    mid = max(me.polygons, key=lambda q: -abs(q.center.x) - abs(q.center.z - CUP_C.z))
    if mid.normal.y > 0:
        for poly in me.polygons:
            poly.flip()
    ob.data.shade_smooth()
    return ob


cup = cup_sheet('ChinCup', 'cup', 0.0, True)
sol = cup.modifiers.new('S', 'SOLIDIFY'); sol.thickness = 0.003; sol.offset = -1
bev = cup.modifiers.new('B', 'BEVEL'); bev.width = 0.0012; bev.segments = 2; bev.limit_method = 'ANGLE'
select_only(cup); bpy.ops.object.modifier_apply(modifier='S'); bpy.ops.object.modifier_apply(modifier='B')
cup.data.shade_smooth()
cup_liner = cup_sheet('ChinCupLiner', 'cuppad', 0.0055, False)
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
STRAP_LIFT = 0.0018
for s in (1, -1):
    sm = (lambda q: q) if s > 0 else (lambda q: P(-q.x, q.y, q.z))
    # upper strap: cup → up the front of the jaw flap, under the temple clip → rocker → tail
    # the rocker sits ~3 cm behind the temple clip, leaning back at the top
    rk_top, _ = on_shell(sm(P(0.126, 0.022, 0.030)), 0.0)
    rk_bot, _ = on_shell(sm(P(0.126, 0.006, -0.008)), 0.0)
    rk_c, rk_n = on_shell((rk_top + rk_bot) / 2, 0.0)
    # (under the mask frame, between the jaw vent and the temple clip)
    path = [CUP_C + sm(P(0.037, -0.013, 0.012)), sm(P(0.074, -0.106, -0.096)),
            on_shell(sm(P(0.118, -0.058, -0.060)), STRAP_LIFT)[0], on_shell(sm(P(0.127, -0.036, -0.011)), STRAP_LIFT)[0],
            rk_c + rk_n * 0.0045, on_shell(sm(P(0.125, 0.034, 0.046)), 0.0025)[0]]
    path = catmull(path, 8)
    path = [on_shell(q, STRAP_LIFT)[0] if q.y > -0.066 and q.z > -0.09 else q for q in path]
    straps.append(ribbon(f'StrapHi{s}', path, 0.017, 0.0018, 'strap', lambda p: on_shell(p)[1] if p.y > -0.1 else up_out(p)))
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
    path = [CUP_C + sm(P(0.038, -0.013, -0.014)), sm(P(0.084, -0.102, -0.154)), sm(P(0.112, -0.062, -0.152)),
            cb + cbn * 0.006]
    path = catmull(path, 8)
    straps.append(ribbon(f'StrapLo{s}', path, 0.017, 0.0018, 'strap', lambda p: up_out(p)))
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
    pads.append(blob(f'JawPad{s}', (s * 0.089, -0.052, -0.080), (0.015, 0.042, 0.048), 'pad', n=2.6))

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
