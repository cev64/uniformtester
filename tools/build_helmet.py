"""
Builds a Riddell SpeedFlex football helmet with Blender (bpy), modelled from
Riddell's SpeedFlex product photography (side, 3/4 and front views).

Everything is sized around the player's head (tools/build_player.py): the
origin is the centre of the head at eye level, x to the player's left, -y
forward, z up. The web app parks the helmet there (src/three/player.js).

SpeedFlex features reproduced:
  * long shell with a round, slightly rear-biased crown and jaw extensions
    that come down to the jaw line
  * the Flex panel: a raised tongue that starts at the brow either side of
    the nameplate and runs up over the crown to a rounded point, with a vent
    slit tucked under each of its side edges on the forehead
  * chevron vent on the upper side, trapezoid vent low at the back, small
    round side hole, flared rear edge
  * the Riddell nameplate bumper above the brow, black rubber edge trim
  * SpeedFlex facemask (wide 2-bar with a centre bar down and front posts)
    held by four clear side clips with grey screws: two at the temples, two
    on the jaw
  * chin strap with hard cup, upper and lower straps to black buckles
  * jaw and brow pads inside

UVs on the shell match the web app's helmet painter:
  u runs around the head (0 bottom, 0.25 back, 0.5 crown, 0.75 front)
  v runs side to side (0 = +x side, 0.5 = centre line, 1 = -x side, in canvas-down order)

Run:  python3 tools/build_helmet.py --out /tmp/uniformlab-model
"""
import argparse, json, math, os, sys
import bpy, bmesh
from mathutils import Vector

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


# ─── head landmarks (from the player build, relative to the helmet origin) ──
# forehead front y -0.105 at z +0.03; top of the skull z +0.110; back of the
# skull y +0.107; head half-width 0.077 at the brow, 0.089 across the ears;
# nose tip (0, -0.123, -0.044); chin (0, -0.104, -0.134).

# ─── shell ─────────────────────────────────────────────────────────────
AX = 0.127            # half width
AY_F, AY_B = 0.150, 0.158
AZ_T, AZ_B = 0.150, 0.17
BROW_Z = 0.03

bpy.ops.mesh.primitive_uv_sphere_add(segments=288, ring_count=180, radius=1.0)
shell = bpy.context.active_object
shell.name = 'Shell'
me = shell.data
orig = [v.co.copy() for v in me.vertices]      # unit directions: UVs and masks come from these


def base_point(o):
    x, y, z = o
    # squarer (more vertical-sided) below the ears, round on top
    n = lerp(2.0, 2.35, smooth(0.0, -0.6, z))
    ay = AY_F if y < 0 else AY_B
    az = AZ_T if z > 0 else AZ_B
    r = (abs(x / AX) ** n + abs(y / ay) ** n + abs(z / az) ** n) ** (-1 / n)
    p = Vector((x, y, z)) * r
    # crown peaks a little behind the middle
    p.z += 0.006 * smooth(0.3, 1.0, z) * math.exp(-((y - 0.3) / 0.6) ** 2)
    return p


def panel_s(p):
    # position along the centre line: 0 at the crown, ~1.4 at the brow
    return math.atan2(-p.y, p.z)


def panel_hw(s):
    # half width of the Flex panel along its length
    if s > 0.35:
        return lerp(0.058, 0.066, smooth(0.35, 1.0, s))
    return 0.058 * math.sqrt(max(0.0, (s + 0.28) / 0.63))


def panel_edge(p):
    """signed distance-ish to the Flex panel outline (positive inside)"""
    s = panel_s(p)
    if p.z < BROW_Z - 0.01 or s < -0.3:
        return -1.0
    return panel_hw(s) - abs(p.x)


def displace(p, o):
    d = 0.0
    # raised Flex panel with a crisp edge
    e = panel_edge(p)
    d += 0.0036 * smooth(-0.0012, 0.0012, e)
    # rear edge flares out a touch
    back = smooth(0.0, 0.1, p.y)
    d += 0.0045 * back * smooth(-0.085, -0.115, p.z)
    # jaw extensions curl in slightly toward the cheek at the front
    jaw = smooth(-0.04, -0.11, p.z) * smooth(-0.03, -0.1, p.y)
    d -= 0.006 * jaw
    return p + p.normalized() * d


for v, o in zip(me.vertices, orig):
    v.co = displace(base_point(o), o)


# Fine surface detail baked into a bump map in the painter's UV space:
# the parting line around the Flex panel and the moulding seam at the jaw.
def detail_height(p):
    h = 0.0
    e = panel_edge(p)
    if e > -0.5:
        h -= 1.0 * (1 - smooth(0.0, 0.0016, abs(e)))
    return h


def bake_detail(path, W=1024, H=512):
    from PIL import Image
    img = Image.new('L', (W, H))
    px = img.load()
    for j in range(H):
        vv = (j + 0.5) / H
        th = vv * math.pi
        sx, sr = math.cos(th), math.sin(th)
        for i in range(W):
            a = ((i + 0.5) / W) * 2 * math.pi
            o = Vector((sx, math.sin(a) * sr, -math.cos(a) * sr))
            px[i, j] = int(128 + 120 * detail_height(base_point(o)))
    img.save(path)


bake_detail(os.path.join(args.out, 'helmet_detail.png'))

# UVs from the unit sphere
while me.uv_layers:
    me.uv_layers.remove(me.uv_layers[0])
uv = me.uv_layers.new(name='UVMap')
for poly in me.polygons:
    for li in poly.loop_indices:
        o = orig[me.loops[li].vertex_index]
        a = math.atan2(o.y, -o.z)
        uv.data[li].uv = ((a / (2 * math.pi)) % 1.0, 1 - math.acos(max(-1, min(1, o.x))) / math.pi)
for poly in me.polygons:
    us = [uv.data[li].uv.x for li in poly.loop_indices]
    if max(us) - min(us) > 0.5:
        for li in poly.loop_indices:
            if uv.data[li].uv.x < 0.5:
                uv.data[li].uv.x += 1


# ─── openings ──────────────────────────────────────────────────────────


def edge_y(z):
    # front edge of the side of the shell (face opening), by height
    pts = [(0.05, -0.124), (0.02, -0.116), (-0.02, -0.108), (-0.06, -0.104), (-0.1, -0.103), (-0.15, -0.098)]
    if z >= pts[0][0]:
        return pts[0][1]
    for (z0, y0), (z1, y1) in zip(pts, pts[1:]):
        if z1 <= z <= z0:
            return lerp(y0, y1, (z - z0) / (z1 - z0))
    return pts[-1][1]


def bottom_z(y):
    # lower edge: down at the jaw line in front, a little higher at the back
    return lerp(lerp(-0.133, -0.126, smooth(-0.1, 0.0, y)), -0.113, smooth(0.0, 0.13, y))


def seg_dist(p, a, b):
    ab = (b[0] - a[0], b[1] - a[1]); ap = (p[0] - a[0], p[1] - a[1])
    t = max(0.0, min(1.0, (ap[0] * ab[0] + ap[1] * ab[1]) / (ab[0] ** 2 + ab[1] ** 2)))
    return math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t)


def poly_sd(p, poly):
    # signed distance to a convex polygon (negative inside)
    inside = True
    d = min(seg_dist(p, poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        if (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 0:
            inside = False
    return -d if inside else d


# side vents in side projection (y, z), mirrored on both sides
CHEVRON = [((0.054, 0.068), (0.002, 0.07)), ((0.002, 0.07), (-0.028, 0.088))]
LOWER_VENT = [(0.108, -0.048), (0.062, -0.058), (0.058, -0.079), (0.109, -0.066)]
if sum((LOWER_VENT[i][0] * LOWER_VENT[(i + 1) % 4][1] - LOWER_VENT[(i + 1) % 4][0] * LOWER_VENT[i][1]) for i in range(4)) > 0:
    LOWER_VENT.reverse()
SIDE_HOLE = ((0.042, -0.103), 0.0048)


def cut_value(p):
    x, y, z = p
    brow = BROW_Z + 0.012 * (abs(x) / AX) ** 2
    face = max(z - brow, y - edge_y(z))              # inside the face opening when both < 0
    bottom = z - bottom_z(y)
    v = min(face, bottom)
    if abs(x) > 0.06:
        yz = (y, z)
        v = min(v, min(seg_dist(yz, a, b) for a, b in CHEVRON) - 0.0042)
        v = min(v, poly_sd(yz, LOWER_VENT) + 0.001)
        v = min(v, math.hypot(y - SIDE_HOLE[0][0], z - SIDE_HOLE[0][1]) - SIDE_HOLE[1])
    # slits tucked under the Flex panel's side edges on the forehead
    s = panel_s(p)
    if 0.72 < s < 1.08 and p.z > BROW_Z + 0.02:
        e = -panel_edge(p)                             # distance outside the panel edge
        v = min(v, max(0.0013 - e, e - 0.0058, (0.74 - s) * 0.1, (s - 1.06) * 0.1))
    return v                                           # < 0 → remove


bm = bmesh.new(); bm.from_mesh(me)
bm.verts.ensure_lookup_table()
cv = [cut_value(v.co) for v in bm.verts]
bmesh.ops.delete(bm, geom=[f for f in bm.faces if sum(cv[v.index] for v in f.verts) / len(f.verts) < 0], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
edge = [v for v in bm.verts if v.is_boundary]
for _ in range(8):
    new = {}
    for v in edge:
        nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
        if len(nb) == 2:
            new[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
    for v, co in new.items():
        v.co = co
bm.to_mesh(me); bm.free()
me.shade_smooth()


def boundary_loops(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    edges = [e for e in bm.edges if e.is_boundary]
    loops, used = [], set()
    for e in edges:
        if e.index in used:
            continue
        loop = [e.verts[0]]
        cur = e.verts[1]
        used.add(e.index)
        while cur != loop[0]:
            loop.append(cur)
            nxt = [x for x in cur.link_edges if x.is_boundary and x.index not in used]
            if not nxt:
                break
            used.add(nxt[0].index)
            cur = nxt[0].other_vert(cur)
        loops.append([v.co.copy() for v in loop])
    bm.free()
    return loops


trim_loops = boundary_loops(shell)

sol = shell.modifiers.new('Solidify', 'SOLIDIFY')
sol.thickness = 0.004; sol.offset = -1; sol.use_rim = True
sol.material_offset = 1; sol.material_offset_rim = 0
shell.data.materials.append(material('shell'))
shell.data.materials.append(material('liner'))
bpy.context.view_layer.objects.active = shell
bpy.ops.object.modifier_apply(modifier='Solidify')


# ─── helpers ───────────────────────────────────────────────────────────
def select_only(ob):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def tube(name, pts, radius, mat, cyclic=False, res=4):
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
    mesh = bpy.data.meshes.new(name); mesh.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material(mat))
    return ob


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


# ─── rubber trim on the face opening and bottom edge ───────────────────
for i, loop in enumerate(trim_loops):
    if len(loop) < 12:
        continue
    span = max((a - b).length for a in loop[::4] for b in loop[::4])
    if span < 0.12:
        continue                                        # vents and holes: bare moulded edges
    pts = loop
    for _ in range(4):
        pts = [(pts[k - 1] + pts[k] * 2 + pts[(k + 1) % len(pts)]) / 4 for k in range(len(pts))]
    pts = [p - p.normalized() * 0.0018 for p in pts]
    tube(f'Trim{i}', pts, 0.0034, 'trim', cyclic=True, res=4)

from mathutils.bvhtree import BVHTree
bm = bmesh.new(); bm.from_mesh(shell.data); shell_bvh = BVHTree.FromBMesh(bm); bm.free()


def on_shell(direction, lift=0.0):
    d = direction.normalized()
    hit = shell_bvh.ray_cast(d * 0.4, -d)
    if hit[0] is None:
        return d * 0.14, d
    return hit[0] + hit[1] * lift, hit[1]


def surface_patch(name, mat, xs, zs, lift, thick, cols=25, rows=5):
    """a thin plate conforming to the shell front, spanning x in xs and z in zs"""
    verts, faces = [], []
    for j in range(rows):
        z = lerp(zs[0], zs[1], j / (rows - 1))
        for k in range(cols):
            x = lerp(xs[0], xs[1], k / (cols - 1))
            verts.append(on_shell(Vector((x, -0.15, z)), lift)[0])
    for j in range(rows - 1):
        for k in range(cols - 1):
            a = j * cols + k
            faces.append((a, a + 1, a + cols + 1, a + cols))
    mesh = bpy.data.meshes.new(name); mesh.from_pydata(verts, [], faces)
    uvl = mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            j, k = divmod(mesh.loops[li].vertex_index, cols)
            uvl.data[li].uv = (k / (cols - 1), j / (rows - 1))
    ob = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material(mat))
    so = ob.modifiers.new('S', 'SOLIDIFY'); so.thickness = thick; so.offset = -1
    select_only(ob); bpy.ops.object.modifier_apply(modifier='S')
    bev = ob.modifiers.new('B', 'BEVEL'); bev.width = thick * 0.45; bev.segments = 2
    bpy.ops.object.modifier_apply(modifier='B')
    ob.data.shade_smooth()
    return ob


# ─── Riddell nameplate bumper above the brow ───────────────────────────
nameplate = surface_patch('Nameplate', 'bumper', (-0.046, 0.046), (BROW_Z + 0.006, BROW_Z + 0.03), 0.0055, 0.0055)

# ─── SpeedFlex facemask ────────────────────────────────────────────────
MR = 0.0032            # 1/4" bar
P = lambda x, y, z: Vector((x, y, z))
CLIP_HI = {s: P(s * 0.114, -0.086, 0.004) for s in (1, -1)}      # temple clips
CLIP_LO = {s: P(s * 0.104, -0.097, -0.098) for s in (1, -1)}     # jaw clips


def hbar(c_front, corner, side_end, n=9):
    """horizontal bar: side end → corner → front centre → mirrored corner → other side end.
    corner/side_end are given for the +x side."""
    half = catmull([side_end, corner, c_front], n)
    left = [P(-q.x, q.y, q.z) for q in reversed(half[:-1])]
    return [P(-q.x, q.y, q.z) for q in half[:-1]] + [c_front] + list(reversed(half[:-1]))


def mirror_x(pts):
    return [P(-q.x, q.y, q.z) for q in pts]


def bar(name, pts, n=6):
    return tube(name, catmull(pts, n) if len(pts) > 2 else pts, MR, 'mask')


TOP_F, MID_F, CHIN_F = P(0, -0.166, BROW_Z - 0.006), P(0, -0.196, -0.05), P(0, -0.19, -0.127)
top = hbar(TOP_F, P(0.086, -0.153, BROW_Z - 0.008), CLIP_HI[1] + P(-0.004, -0.012, 0.002))
mid = hbar(MID_F, P(0.078, -0.186, -0.05), P(0.109, -0.104, -0.052))
chin = hbar(CHIN_F, P(0.062, -0.18, -0.125), CLIP_LO[1] + P(-0.004, -0.01, -0.006))
mask_parts = [bar('Mask_top', top, 1), bar('Mask_mid', mid, 1), bar('Mask_chin', chin, 1)]
POST_X = 0.058


def near(pts, x):
    return min(pts, key=lambda q: abs(q.x - x))


for s in (1, -1):
    # side bar along the shell edge: temple clip → mid bar end → jaw clip
    side = [CLIP_HI[s] + P(-s * 0.004, -0.012, 0.002), P(s * 0.111, -0.098, -0.024), P(s * 0.109, -0.104, -0.052), CLIP_LO[s] + P(-s * 0.004, -0.01, -0.006)]
    mask_parts.append(bar(f'Mask_side{s}', side))
    # front posts: brow bar down through the mid bar to the chin bar
    a, b, c = near(top, s * POST_X), near(mid, s * POST_X), near(chin, s * POST_X)
    mask_parts.append(bar(f'Mask_post{s}', [a, (a + b) / 2 + P(0, -0.004, 0), b, (b + c) / 2 + P(0, -0.003, 0), c]))
# centre bar down
mask_parts.append(bar('Mask_centre', [MID_F, (MID_F + CHIN_F) / 2 + P(0, -0.004, 0), CHIN_F]))


# ─── clips ─────────────────────────────────────────────────────────────
def rbox(name, center, size, mat, rot=(0, 0, 0), bevel=0.35):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True, rotation=True, location=False)
    bev = ob.modifiers.new('Bevel', 'BEVEL'); bev.width = min(size) * bevel; bev.segments = 3
    bpy.ops.object.modifier_apply(modifier='Bevel')
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob


def oriented_box(name, at, normal, along, size, mat, bevel=0.4):
    """box lying on the shell: z along the normal, x along `along`"""
    n = normal.normalized()
    ax = (along - n * along.dot(n)).normalized()
    ay = n.cross(ax)
    from mathutils import Matrix
    M = Matrix((ax, ay, n)).transposed().to_4x4()
    ob = rbox(name, (0, 0, 0), size, mat, bevel=bevel)
    ob.data.transform(M)
    ob.data.transform(Matrix.Translation(at))
    return ob


def screw(name, at, normal):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.0042, depth=0.003, location=(0, 0, 0))
    ob = bpy.context.active_object; ob.name = name
    from mathutils import Matrix
    q = Vector((0, 0, 1)).rotation_difference(normal.normalized())
    ob.data.transform(q.to_matrix().to_4x4())
    ob.data.transform(Matrix.Translation(at))
    ob.data.materials.append(material('screw'))
    ob.data.shade_smooth()
    return ob


clips = []
for s in (1, -1):
    for key, c, tilt in (('Hi', CLIP_HI[s], P(0, -1, 0.35)), ('Lo', CLIP_LO[s], P(0, -1, 0.9))):
        at, n = on_shell(c, 0.004)
        clips.append(oriented_box(f'Clip{key}{s}', at, n, tilt, (0.03, 0.021, 0.008), 'clip'))
        clips.append(screw(f'Screw{key}{s}', at + n * 0.0045, n))

# ─── chin strap ────────────────────────────────────────────────────────
CUP_C = P(0, -0.106, -0.133)
cup = blob('ChinCup', CUP_C, (0.028, 0.012, 0.018), 'cup', n=2.2, keep=lambda c: c.y < CUP_C.y + 0.002)
sol = cup.modifiers.new('S', 'SOLIDIFY'); sol.thickness = 0.003
select_only(cup); bpy.ops.object.modifier_apply(modifier='S')
straps = []
up_out = lambda p: (p - P(0, -0.03, -0.05)).normalized()
for s in (1, -1):
    # upper strap: from the cup, up under the temple clip, back to a buckle high on the side
    hb, hn = on_shell(P(s * 0.12, -0.028, -0.02), 0.003)
    path = [CUP_C + P(s * 0.026, 0.004, 0.008), P(s * 0.076, -0.1, -0.085), P(s * 0.106, -0.078, -0.05), on_shell(P(s * 0.12, -0.056, -0.034), 0.003)[0], hb]
    straps.append(ribbon(f'StrapHi{s}', catmull(path, 6), 0.017, 0.0022, 'strap', up_out))
    straps.append(oriented_box(f'BuckleHi{s}', hb + hn * 0.002, hn, hb - path[-2], (0.034, 0.014, 0.007), 'buckle', bevel=0.3))
    # lower strap: from the cup back along the jaw to a buckle low at the back
    lb, ln = on_shell(P(s * 0.112, 0.05, -0.1), 0.003)
    path = [CUP_C + P(s * 0.03, 0.006, -0.006), P(s * 0.075, -0.08, -0.138), on_shell(P(s * 0.11, -0.02, -0.12), 0.003)[0], lb]
    straps.append(ribbon(f'StrapLo{s}', catmull(path, 6), 0.017, 0.0022, 'strap', up_out))
    straps.append(oriented_box(f'BuckleLo{s}', lb + ln * 0.002, ln, lb - path[-2], (0.034, 0.014, 0.007), 'buckle', bevel=0.3))

# ─── interior pads visible around the face ─────────────────────────────
pads = []
for s in (1, -1):
    pads.append(blob(f'JawPad{s}', (s * 0.084, -0.062, -0.078), (0.013, 0.04, 0.044), 'pad', n=2.6))
pads.append(blob('BrowPad', (0, -0.1, BROW_Z + 0.02), (0.066, 0.018, 0.024), 'pad', n=2.6, keep=lambda c: c.y < -0.09))

# inner padding: a dark layer ~1 cm inside the shell so vents and holes read as padding
inner = blob('Padding', (0, 0, 0), (1, 1, 1), 'pad', n=2.0, seg=96, rings=64)
for v in inner.data.vertices:
    o = v.co.normalized()
    v.co = base_point(o) - o * 0.011
bm = bmesh.new(); bm.from_mesh(inner.data)
def _open(c):
    q = c + c.normalized() * 0.011
    brow = BROW_Z + 0.012 * (abs(q.x) / AX) ** 2
    return max(q.z - brow, q.y - edge_y(q.z)) < 0.012 or q.z - bottom_z(q.y) < 0.012
bmesh.ops.delete(bm, geom=[f for f in bm.faces if _open(f.calc_center_median())], context='FACES')
for f in bm.faces:
    f.normal_flip()
bm.to_mesh(inner.data); bm.free()

# ─── export ────────────────────────────────────────────────────────────
meta = {
    'origin': 'head centre at eye level',
    'brow_z': BROW_Z,
    'nfl_decal': [list(v) for v in on_shell(P(0, 1.0, -0.55), 0.0)],
}
bpy.ops.export_scene.gltf(filepath=os.path.join(args.out, 'helmet.glb'), export_format='GLB',
                          export_texcoords=True, export_normals=True, export_yup=True, export_materials='EXPORT')
json.dump(meta, open(os.path.join(args.out, 'helmet.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, '_helmet.blend'))
print('exported helmet', os.path.getsize(os.path.join(args.out, 'helmet.glb')) // 1024, 'KB')
