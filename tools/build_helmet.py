"""
Builds a Riddell SpeedFlex-style football helmet with Blender (bpy).

Shell: a deformed sphere with forward-swept jaw flaps, the stepped "Speed"
ridge along the sides, a flared rear skirt, the hinged front flex panel (a U
groove on the brow), top vents, ear holes, a 3.5 mm wall and a rubber trim
along every edge. Facemask: a SpeedFlex-style cage built from swept tubes,
with quick-release side clips and a centre clip on the flex panel. Chin
strap with a hard cup.

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

# Outer half-dimensions in metres (SpeedFlex adult L: ~31 cm long, ~25 cm wide)
RX, RY, RZ = 0.124, 0.152, 0.128

def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

# ─── shell ─────────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_uv_sphere_add(segments=192, ring_count=128, radius=1.0)
shell = bpy.context.active_object
shell.name = 'Shell'
me = shell.data
orig = [v.co.copy() for v in me.vertices]      # unit sphere, used for UVs and masks

def shape(p):
    x, y, z = p            # blender: x side, -y front, z up
    front = -y
    # jaw flaps sweep forward and slightly in
    jaw = smooth(0.25, -0.55, z) * smooth(-0.1, 0.55, front)
    front += 0.3 * jaw
    x *= 1 - 0.05 * jaw
    # flared rear skirt ("offset" shell) around the lower back
    back = smooth(0.1, 0.8, -front) * smooth(0.1, -0.5, z)
    k = 1 + 0.07 * back
    x *= k; front *= 1 + 0.05 * back
    # slightly flatter crown, a little more length at the back of the head
    z *= 1 - 0.05 * smooth(0.6, 1.0, z)
    if front < 0:
        front *= 1.04
    # the Speed "step": the upper shell stands proud of the lower side along a rising line
    zr = -0.2 + 0.32 * (-front)
    side = smooth(0.45, 0.8, abs(x))
    along = smooth(0.35, -0.2, front)
    step = 0.03 * side * along * smooth(-0.04, 0.04, z - zr)
    r = Vector((x, -front, z))
    r += Vector((x, -front, z)).normalized() * step
    return Vector((r.x * RX, r.y * RY, r.z * RZ))

for v, o in zip(me.vertices, orig):
    v.co = shape(o)

# Surface detail (flex-panel groove, vents, ridge seams) goes into a bump map
# baked in the same UV space, so it stays crisp regardless of mesh density.
def detail_height(o):
    x, y, z = o; front = -y
    h = 0.0
    if front > 0.35 and z > 0.1:
        u = abs(x)
        d_side = abs(u - 0.26) if 0.3 < z < 0.8 else 9
        d_bottom = abs(z - 0.3) if u < 0.26 else 9
        d_corner = abs(math.hypot(u - 0.2, z - 0.36) - 0.06) if (u > 0.2 and z < 0.36) else 9
        d = min(d_side, d_bottom, d_corner)
        h -= 1.0 * (1 - smooth(0.0, 0.012, d))
    for (vx, vf, a_, b_) in ((0.2, 0.3, 0.045, 0.13), (-0.2, 0.3, 0.045, 0.13), (0.15, -0.15, 0.04, 0.11), (-0.15, -0.15, 0.04, 0.11)):
        if z > 0.55:
            dv = math.hypot((x - vx) / a_, (front - vf) / b_)
            h -= 0.9 * (1 - smooth(0.85, 1.0, dv))
    return h

def bake_detail(path, W=1024, H=512):
    from PIL import Image
    img = Image.new('L', (W, H))
    px = img.load()
    for j in range(H):
        vv = (j + 0.5) / H                 # canvas row → side-to-side angle
        th = vv * math.pi
        sx, sr = math.cos(th), math.sin(th)
        for i in range(W):
            a = ((i + 0.5) / W) * 2 * math.pi
            # invert u = atan2(y, -z)/2pi
            y, z = math.sin(a) * sr, -math.cos(a) * sr
            px[i, j] = int(128 + 120 * detail_height((sx, y, z)))
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
        u = (a / (2 * math.pi)) % 1.0
        vv = math.acos(max(-1, min(1, o.x))) / math.pi
        uv.data[li].uv = (u, 1 - vv)
for poly in me.polygons:
    us = [uv.data[li].uv.x for li in poly.loop_indices]
    if max(us) - min(us) > 0.5:
        for li in poly.loop_indices:
            if uv.data[li].uv.x < 0.5:
                uv.data[li].uv.x += 1

# openings: face opening, ear holes, bottom edge (rising toward the back)
def cut_value(o):
    x, y, z = o; front = -y
    bottom = z - (-0.62 + 0.2 * smooth(-0.2, 0.9, -front))
    face = max(z - 0.2, 0.3 - front, abs(x) - 0.64)
    ear = math.hypot(y - 0.03, z + 0.2) - 0.085 if abs(x) > 0.8 else 1
    return min(bottom, face, ear)
bm = bmesh.new(); bm.from_mesh(me)
bm.verts.ensure_lookup_table()
cv = [cut_value(orig[v.index]) for v in bm.verts]
bmesh.ops.delete(bm, geom=[f for f in bm.faces if sum(cv[v.index] for v in f.verts) / len(f.verts) < 0], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
edge = [v for v in bm.verts if v.is_boundary]
for _ in range(6):
    new = {}
    for v in edge:
        nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
        if len(nb) == 2:
            new[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
    for v, co in new.items():
        v.co = co
bm.to_mesh(me); bm.free()
me.shade_smooth()

# edge loops for the rubber trim, captured before thickening
def boundary_loops(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    edges = [e for e in bm.edges if e.is_boundary]
    loops, used = [], set()
    for e in edges:
        if e.index in used:
            continue
        loop = [e.verts[0]]
        cur, prev_e = e.verts[1], e
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
sol.thickness = 0.0035; sol.offset = -1; sol.use_rim = True
sol.material_offset = 1; sol.material_offset_rim = 1

def material(name):
    return bpy.data.materials.get(name) or bpy.data.materials.new(name)
shell.data.materials.append(material('shell'))
shell.data.materials.append(material('liner'))
bpy.context.view_layer.objects.active = shell
bpy.ops.object.modifier_apply(modifier='Solidify')

# ─── rubber trim along the edges ───────────────────────────────────────
def tube_from_points(name, pts, radius, mat, cyclic=True):
    cd = bpy.data.curves.new(name, 'CURVE')
    cd.dimensions = '3D'
    cd.bevel_depth = radius
    cd.bevel_resolution = 3
    sp = cd.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (co.x, co.y, co.z, 1)
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cd)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob

trims = []
for i, loop in enumerate(trim_loops):
    if len(loop) < 12:
        continue
    # small ear-hole loops get a thinner grommet
    size = max((a - b).length for a in loop for b in loop[::max(1, len(loop) // 12)])
    r = 0.0022 if size < 0.05 else 0.0032
    # smooth the loop a little
    pts = loop
    for _ in range(3):
        pts = [(pts[k - 1] + pts[k] * 2 + pts[(k + 1) % len(pts)]) / 4 for k in range(len(pts))]
    # push the trim onto the mid-wall
    pts = [p - p.normalized() * 0.0016 for p in pts]
    trims.append(tube_from_points(f'Trim{i}', pts, r, 'trim'))

# ─── measure the shell to place the facemask ───────────────────────────
def front_at(z, x):
    """most forward shell point near (x, z) in metres"""
    best = None
    for v in shell.data.vertices:
        co = v.co
        if abs(co.z - z) < 0.008 and abs(co.x - x) < 0.01 and co.dot(co) > 0:
            if best is None or co.y < best.y:
                best = co.copy()
    return best

brow = front_at(0.2 * RZ + 0.004, 0.0)           # bottom of the flex panel
jaw_hi = {s: front_at(-0.02, s * 0.105) for s in (1, -1)}
jaw_lo = {s: front_at(-0.055, s * 0.1) for s in (1, -1)}
print('brow', brow, 'jaw', jaw_hi[1], jaw_lo[1])

# ─── facemask (SpeedFlex-style "2BD-SW" cage) ──────────────────────────
MR = 0.0052
fy = brow.y + 0.004      # front plane of the upper cage
def P(x, y, z):
    return Vector((x, y, z))
def mirror(pts):
    return [Vector((-p.x, p.y, p.z)) for p in reversed(pts)] + pts[1:]
def smooth_curve(pts, n=4):
    # Catmull-Rom resample so bars look bent, not segmented
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(len(pts) - 1, i + 2)]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return out

jh = jaw_hi[1]; jl = jaw_lo[1]
bars = []
# top bar: from the upper side clips across the brow
top = [P(jh.x - 0.002, jh.y - 0.004, jh.z + 0.012), P(0.085, fy - 0.02, 0.02), P(0.05, fy - 0.042, 0.024), P(0, fy - 0.05, 0.025)]
bars.append(mirror(top))
# eye-level bar
mid = [P(jh.x, jh.y - 0.006, jh.z - 0.004), P(0.086, fy - 0.035, -0.03), P(0.05, fy - 0.058, -0.034), P(0, fy - 0.064, -0.035)]
bars.append(mirror(mid))
# lower bar
low = [P(jl.x, jl.y - 0.005, jl.z), P(0.08, fy - 0.045, -0.07), P(0.045, fy - 0.06, -0.078), P(0, fy - 0.064, -0.08)]
bars.append(mirror(low))
# chin bar sweeping under the chin
chin = [P(jl.x - 0.004, jl.y - 0.002, jl.z - 0.018), P(0.07, fy - 0.035, -0.1), P(0.035, fy - 0.05, -0.112), P(0, fy - 0.054, -0.115)]
bars.append(mirror(chin))
for s in (1, -1):
    # verticals
    bars.append([P(s * 0.05, fy - 0.042, 0.024), P(s * 0.05, fy - 0.058, -0.034), P(s * 0.045, fy - 0.06, -0.078), P(s * 0.035, fy - 0.05, -0.112)])
    # side struts tying the bars together at the jaw
    bars.append([P(s * (jh.x - 0.002), jh.y - 0.004, jh.z + 0.012), P(s * jh.x, jh.y - 0.006, jh.z - 0.004), P(s * jl.x, jl.y - 0.005, jl.z), P(s * (jl.x - 0.004), jl.y - 0.002, jl.z - 0.018)])
# centre bar from the eye bar down to the chin
bars.append([P(0, fy - 0.064, -0.035), P(0, fy - 0.064, -0.08), P(0, fy - 0.054, -0.115)])
# flex-panel connector: short bar from the brow clip down to the top bar
bars.append([P(0, brow.y - 0.004, brow.z + 0.006), P(0, fy - 0.03, 0.026), P(0, fy - 0.05, 0.025)])

mask_parts = []
for i, b in enumerate(bars):
    pts = smooth_curve(b) if len(b) > 2 else b
    mask_parts.append(tube_from_points(f'Mask{i}', pts, MR, 'mask', cyclic=False))

# quick-release clips
def box(name, center, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    bev = ob.modifiers.new('Bevel', 'BEVEL'); bev.width = min(size) * 0.35; bev.segments = 3
    bpy.ops.object.modifier_apply(modifier='Bevel')
    ob.data.materials.append(material(mat))
    ob.data.shade_smooth()
    return ob

clips = []
for s in (1, -1):
    clips.append(box(f'ClipHi{s}', (s * (jh.x + 0.003), jh.y + 0.004, jh.z + 0.004), (0.01, 0.022, 0.026), 'clip'))
    clips.append(box(f'ClipLo{s}', (s * (jl.x + 0.003), jl.y + 0.004, jl.z - 0.008), (0.01, 0.02, 0.022), 'clip'))
clips.append(box('ClipFlex', (0, brow.y + 0.002, brow.z + 0.012), (0.03, 0.01, 0.016), 'clip'))

# ─── chin strap ────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.03, location=(0, fy - 0.01, -0.125))
cup = bpy.context.active_object; cup.name = 'ChinCup'
cup.scale = (1.0, 0.55, 0.8)
bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(cup.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y > fy - 0.012], context='FACES')
bm.to_mesh(cup.data); bm.free()
cup.data.materials.append(material('cup'))
cup.data.shade_smooth()
straps = []
for s in (1, -1):
    straps.append(tube_from_points(f'Strap{s}', [P(s * 0.022, fy - 0.004, -0.128), P(s * 0.075, jl.y + 0.03, -0.1), P(s * 0.112, jl.y + 0.06, -0.06)], 0.004, 'strap', cyclic=False))
    straps.append(tube_from_points(f'StrapUp{s}', [P(s * 0.024, fy - 0.004, -0.12), P(s * 0.09, jh.y + 0.02, -0.02), P(s * 0.118, jh.y + 0.05, 0.0)], 0.0035, 'strap', cyclic=False))

# ─── interior pads visible through the openings ────────────────────────
pads = []
for s in (1, -1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.03, location=(s * 0.088, -0.07, -0.05))
    p = bpy.context.active_object; p.name = f'JawPad{s}'
    p.scale = (0.45, 1.3, 1.1)
    bpy.ops.object.transform_apply(scale=True)
    p.data.materials.append(material('pad')); p.data.shade_smooth()
    pads.append(p)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.1, location=(0, -0.005, 0.035))
p = bpy.context.active_object; p.name = 'BrowPad'
p.scale = (0.85, 1.0, 0.5)
bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(p.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y > -0.07 or f.calc_center_median().z < 0.03], context='FACES')
bm.to_mesh(p.data); bm.free()
p.data.materials.append(material('pad')); p.data.shade_smooth()
pads.append(p)

# ─── export ────────────────────────────────────────────────────────────
meta = {
    'radii': [RX, RY, RZ],
    'brow': list(brow), 'jaw_hi': list(jh), 'jaw_lo': list(jl),
    # physical size of the texture: u spans the circumference around x, v spans half a turn side to side
    'circumference_m': round(2 * math.pi * (RY + RZ) / 2, 4),
    'side_arc_m': round(math.pi * (RX + RZ) / 2, 4),
}
bpy.ops.export_scene.gltf(filepath=os.path.join(args.out, 'helmet.glb'), export_format='GLB',
                          export_texcoords=True, export_normals=True, export_yup=True, export_materials='EXPORT')
json.dump(meta, open(os.path.join(args.out, 'helmet.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, '_helmet.blend'))
import shutil
print('exported helmet', os.path.getsize(os.path.join(args.out, 'helmet.glb')) // 1024, 'KB')
