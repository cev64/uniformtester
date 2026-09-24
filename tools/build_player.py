"""
Builds the player model for Uniform Lab with Blender (bpy).

Body: MakeHuman 1.1 base mesh + macro targets (all CC0), rigged with the
MakeHuman default skeleton, posed with the arms relaxed at the sides.
Garments (jersey, pants, socks, cleats, gloves) are generated from the posed
body surface and given UV layouts the web app paints uniforms onto.

Run:  python3 tools/build_player.py --mh /path/to/makehuman/makehuman/data --out public/models
"""
import argparse, json, math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion

ap = argparse.ArgumentParser()
ap.add_argument('--mh', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--preview', default='')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
MH = args.mh
os.makedirs(args.out, exist_ok=True)

HEIGHT_M = 1.95           # player height barefoot (Josh Allen: 6'4.9", 237 lb)
MUSCLE, WEIGHT, HEIGHT = 0.74, 0.64, 0.78   # MakeHuman macro sliders (0..1)
RACE = {'african': 0.55, 'caucasian': 0.35, 'asian': 0.10}

# ─── load base mesh ────────────────────────────────────────────────────
verts, uvs, faces, face_uvs, face_group = [], [], [], [], []
group = None
for line in open(os.path.join(MH, '3dobjs/base.obj')):
    if line.startswith('v '):
        verts.append([float(v) for v in line.split()[1:4]])
    elif line.startswith('vt '):
        uvs.append([float(v) for v in line.split()[1:3]])
    elif line.startswith('g '):
        group = line.split()[1]
    elif line.startswith('f '):
        idx = [p.split('/') for p in line.split()[1:]]
        faces.append([int(p[0]) - 1 for p in idx])
        face_uvs.append([int(p[1]) - 1 for p in idx])
        face_group.append(group)
print('base mesh', len(verts), 'verts', len(faces), 'faces')

# ─── macro targets (approximates MakeHuman's macro modifier blending) ──
def read_target(name):
    d = {}
    for line in open(os.path.join(MH, 'targets', name)):
        if line[0].isdigit():
            i, x, y, z = line.split()
            d[int(i)] = (float(x), float(y), float(z))
    return d

def lerp_weights(v):
    # value 0..1 -> weights over (min, average, max)
    if v < 0.5:
        return {'min': 1 - v * 2, 'average': v * 2, 'max': 0}
    return {'min': 0, 'average': 2 - v * 2, 'max': v * 2 - 1}

targets = []
for race, w in RACE.items():
    targets.append((f'macrodetails/{race}-male-young.target', w))
mw, ww = lerp_weights(MUSCLE), lerp_weights(WEIGHT)
hw = HEIGHT * 2 - 1  # -1..1
for m, a in mw.items():
    for wt, b in ww.items():
        if a * b == 0:
            continue
        targets.append((f'macrodetails/universal-male-young-{m}muscle-{wt}weight.target', a * b))
        if hw > 0:
            targets.append((f'macrodetails/height/male-young-{m}muscle-{wt}weight-maxheight.target', a * b * hw))
        targets.append((f'macrodetails-proportions/male-young-{m}muscle-{wt}weight-idealproportions.target', a * b * 0.8))

# Football build: thicker neck and traps, broader upper body
# Modern athletic QB build: broad frame, strong but not bulky
EXTRA = [
    ('neck/neck-scale-horiz-incr.target', 0.45),
    ('neck/neck-scale-depth-incr.target', 0.2),
    ('torso/torso-scale-horiz-incr.target', 0.08),
    ('torso/torso-vshape-incr.target', 0.3),
    ('torso/torso-muscle-pectoral-incr.target', 0.15),
    ('armslegs/l-upperarm-muscle-incr.target', 0.15),
    ('armslegs/r-upperarm-muscle-incr.target', 0.15),
    ('armslegs/l-upperleg-muscle-incr.target', 0.45),
    ('armslegs/r-upperleg-muscle-incr.target', 0.45),
    ('armslegs/l-upperleg-scale-horiz-incr.target', 0.1),
    ('armslegs/r-upperleg-scale-horiz-incr.target', 0.1),
    ('armslegs/l-lowerleg-muscle-incr.target', 0.2),
    ('armslegs/r-lowerleg-muscle-incr.target', 0.2),
]
for name, w in EXTRA:
    if w and os.path.exists(os.path.join(MH, 'targets', name)):
        targets.append((name, w))

for name, w in targets:
    path = os.path.join(MH, 'targets', name)
    if not os.path.exists(path):
        alt = path.replace('macrodetails-proportions/', 'macrodetails/proportions/')
        if os.path.exists(alt):
            name = os.path.relpath(alt, os.path.join(MH, 'targets'))
        else:
            print('missing target', name)
            continue
    for i, (dx, dy, dz) in read_target(name).items():
        verts[i][0] += dx * w; verts[i][1] += dy * w; verts[i][2] += dz * w
print('applied', len(targets), 'targets')

# ─── build the Blender mesh (MakeHuman is y-up, facing +z → Blender z-up, facing -y)
bpy.ops.wm.read_factory_settings(use_empty=True)
body_idx = [i for i, g in enumerate(face_group) if g == 'body']
ys = [verts[i][1] for f in body_idx for i in faces[f]]
scale = HEIGHT_M / (max(ys) - min(ys))
ymin = min(ys)
bl_verts = [(x * scale, -z * scale, (y - ymin) * scale) for x, y, z in verts]

me = bpy.data.meshes.new('body')
me.from_pydata(bl_verts, [], faces)
uv_layer = me.uv_layers.new(name='UVMap')
for poly, fu in zip(me.polygons, face_uvs):
    for li, uvi in zip(poly.loop_indices, fu):
        uv_layer.data[li].uv = uvs[uvi]
body = bpy.data.objects.new('Body', me)
bpy.context.collection.objects.link(body)
# remember which faces are real body vs helpers
me.attributes.new('is_body', 'BOOLEAN', 'FACE')
for p, g in zip(me.polygons, face_group):
    me.attributes['is_body'].data[p.index].value = (g == 'body')

# ─── skeleton ──────────────────────────────────────────────────────────
skel = json.load(open(os.path.join(MH, 'rigs/default.mhskel')))
weights = json.load(open(os.path.join(MH, 'rigs/default_weights.mhw')))['weights']

def joint(name):
    idx = skel['joints'][name]
    v = Vector((0, 0, 0))
    for i in idx:
        v += Vector(bl_verts[i])
    return v / len(idx)

arm_data = bpy.data.armatures.new('Rig')
rig = bpy.data.objects.new('Rig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
ebones = {}
for name, b in skel['bones'].items():
    eb = arm_data.edit_bones.new(name)
    eb.head = joint(b['head'])
    eb.tail = joint(b['tail'])
    if (eb.tail - eb.head).length < 1e-4:
        eb.tail = eb.head + Vector((0, 0, 0.01))
    ebones[name] = eb
for name, b in skel['bones'].items():
    if b['parent']:
        ebones[name].parent = ebones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT')

for bone, lst in weights.items():
    vg = body.vertex_groups.new(name=bone)
    for i, w in lst:
        vg.add([i], w, 'REPLACE')
mod = body.modifiers.new('Armature', 'ARMATURE')
mod.object = rig

# ─── pose: arms relaxed at the sides, slight elbow bend ───────────────
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

def aim(bone_name, target_dir):
    pb = rig.pose.bones[bone_name]
    bpy.context.view_layer.update()
    head = pb.head.copy()
    cur = (pb.tail - pb.head).normalized()
    q = cur.rotation_difference(Vector(target_dir).normalized())
    R = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head)
    pb.matrix = R @ pb.matrix
    bpy.context.view_layer.update()

for side, sx in (('L', 1), ('R', -1)):
    # MakeHuman's left is +x
    aim(f'upperarm01.{side}', (sx * 0.2, 0.02, -1.0))
    aim(f'lowerarm01.{side}', (sx * 0.14, -0.3, -1.0))
    aim(f'wrist.{side}', (sx * 0.06, -0.12, -1.0))
    # bring the feet in a little from MakeHuman's wide stance
    aim(f'lowerleg01.{side}', (sx * 0.035, 0.015, -1.0))
bpy.ops.object.mode_set(mode='OBJECT')

# apply the pose
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier='Armature')

# joints in posed space (used for garment projections)
bpy.context.view_layer.update()
J = {}
for pb in rig.pose.bones:
    J[pb.name] = {'head': list(rig.matrix_world @ pb.head), 'tail': list(rig.matrix_world @ pb.tail)}

# drop helper geometry
bm = bmesh.new(); bm.from_mesh(body.data)
isb = bm.faces.layers.bool.get('is_body')
bmesh.ops.delete(bm, geom=[f for f in bm.faces if not f[isb]], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(body.data); bm.free()
print('body verts', len(body.data.vertices))
bpy.ops.object.shade_smooth()


# ═══════════════════════════════════════════════════════════════════════
# Stage 2: smooth the body, then cut garments from it
# ═══════════════════════════════════════════════════════════════════════
sub = body.modifiers.new('Subsurf', 'SUBSURF')
sub.levels = 1
bpy.ops.object.modifier_apply(modifier='Subsurf')
body.data.shade_smooth()

def V(name, end='head'):
    return Vector(J[name][end])

SH = {s: V(f'upperarm01.{s}') for s in 'LR'}          # shoulder joints
EL = {s: V(f'lowerarm01.{s}') for s in 'LR'}          # elbows
WR = {s: V(f'wrist.{s}') for s in 'LR'}               # wrists
HIP = {s: V(f'upperleg01.{s}') for s in 'LR'}
KNEE = {s: V(f'lowerleg01.{s}') for s in 'LR'}
ANK = {s: V(f'foot.{s}') for s in 'LR'}
NECK = V('neck01')
SIGN = {'L': 1, 'R': -1}

WAIST_Z = HIP['L'].z + 0.075       # top of the pants: just below the navel, like game pants
JERSEY_BOTTOM = HIP['L'].z - 0.01  # jersey tucks well under the pants
SLEEVE_LEN = 0.115                 # short modern sleeves: shoulder joint → hem along the arm
PANTS_HEM = 0.07                   # below the knee joint
SOCK_BOTTOM = 0.13                 # above the ankle joint (cleat collar covers the rest)

gname = {g.index: g.name for g in body.vertex_groups}

def group_sum(v, pred):
    return sum(g.weight for g in v.groups if pred(gname[g.group]))

ARM_BONES = ('upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal')
LEG_BONES = ('upperleg', 'lowerleg', 'foot', 'toe')

def smooth01(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

# Per-vertex classification of the smoothed body
bdata = body.data
cls = []
for v in bdata.vertices:
    co = v.co
    arm = group_sum(v, lambda n: n.startswith(ARM_BONES))
    leg = group_sum(v, lambda n: n.startswith(LEG_BONES))
    head = group_sum(v, lambda n: n in ('head', 'jaw', 'neck02', 'neck03') or n.startswith(('eye', 'oris', 'oculi', 'levator', 'temporalis', 'risorius', 'orbicularis', 'special', 'tongue')))
    side = 'L' if co.x >= 0 else 'R'
    info = {'side': side, 'arm': arm > 0.5, 'leg': leg > 0.5, 'head': head > 0.4}
    if info['arm']:
        axis = (EL[side] - SH[side]).normalized()
        info['t_arm'] = (co - SH[side]).dot(axis)
    cls.append(info)

def gauss(co, center, sigma):
    return math.exp(-((co - center).length / sigma) ** 2)

PAD_CENTER = {s: SH[s] + Vector((SIGN[s] * -0.03, 0.0, 0.06)) for s in 'LR'}
CHEST_Z = 1.36
ARM_AXIS = {s: (EL[s] - SH[s]).normalized() for s in 'LR'}
FORE_AXIS = {s: (WR[s] - EL[s]).normalized() for s in 'LR'}
THIGH_AXIS = {s: (KNEE[s] - HIP[s]).normalized() for s in 'LR'}
SHIN_AXIS = {s: (ANK[s] - KNEE[s]).normalized() for s in 'LR'}

def t_arm(co, s): return (co - SH[s]).dot(ARM_AXIS[s])

# ─── shoulder pads ───
# Modern low-profile pads read as one smooth, slightly boxy shell over the
# shoulders, chest and upper back. Jersey points inside that shell are pushed
# out onto it (a soft max), which gives the flat-topped pro silhouette
# instead of bumps.
PAD_C = Vector((0, NECK.y + 0.01, SH['L'].z - 0.12))
PAD_AX = 0.312
PAD_FRONT, PAD_BACK = 0.168, 0.158
PAD_UP, PAD_DOWN = NECK.z - 0.03 - PAD_C.z, 0.27
PAD_N = 3.2

def pad_f(p):
    d = p - PAD_C
    by = PAD_FRONT if d.y < 0 else PAD_BACK
    cz = PAD_UP if d.z > 0 else PAD_DOWN
    return (abs(d.x / PAD_AX) ** PAD_N + abs(d.y / by) ** PAD_N + abs(d.z / cz) ** PAD_N) ** (1 / PAD_N)

def smax(a, b, k):
    h = max(k - abs(a - b), 0) / k
    return max(a, b) + h * h * k * 0.25

def pad_shape(p, c):
    if c['arm'] and t_arm(p, c['side']) > 0.07:
        return p
    f = pad_f(p)
    if f > 1.25:
        return p
    scale = smax(1.0, 1.0 / max(f, 1e-6), 0.12)
    q = PAD_C + (p - PAD_C) * scale
    if c['arm']:
        # fade out down the sleeve so the pad's cup meets the arm smoothly
        w = 1 - smooth01(0.0, 0.07, t_arm(p, c['side']))
        q = p.lerp(q, w)
    return q

# ─── offsets (how far each garment stands off the skin) ───
PAD_TOP = SH['L'].z + 0.075      # flat top of the pads, a little above the acromion

def jersey_offset(co, c, n):
    # compression fit over low-profile modern pads, built from three pieces:
    off = 0.005
    s_ = c['side']
    ax = abs(co.x)
    # 1. front and back plates over the chest and shoulder blades
    plate = smooth01(CHEST_Z - 0.1, CHEST_Z + 0.02, co.z) * (1 - smooth01(0.15, 0.21, ax))
    off += 0.011 * plate * min(1.0, abs(n.y) * 1.4)
    # 2. epaulet caps over the point of each shoulder
    cap = SH[s_] + Vector((SIGN[s_] * -0.01, 0.0, 0.055))
    d = co - cap
    off += 0.024 * math.exp(-((d.x / 0.085) ** 2 + (d.y / 0.1) ** 2 + (d.z / 0.075) ** 2))
    # 3. the pads' flat top: fill the slope between the neck and the shoulder
    if n.z > 0.2 and 0.07 < ax < SH[s_].x * SIGN[s_] + 0.02 and co.z > CHEST_Z:
        fill = max(0.0, PAD_TOP - co.z) * n.z
        off += min(0.03, fill) * smooth01(0.07, 0.11, ax)
    if c['arm']:
        off += 0.004 * (1 - smooth01(0.0, SLEEVE_LEN, t_arm(co, s_)))
    return off

def pants_offset(co, c):
    s = c['side']
    off = 0.007
    knee_front = KNEE[s] + Vector((0, -0.06, 0.01))
    thigh_front = (HIP[s] + KNEE[s]) / 2 + Vector((SIGN[s] * 0.01, -0.07, 0.04))
    off += 0.012 * gauss(co, knee_front, 0.055)
    off += 0.007 * gauss(co, thigh_front, 0.09)
    off += 0.004 * gauss(co, HIP[s] + Vector((SIGN[s] * 0.1, 0, 0.02)), 0.08)
    return off

from mathutils.kdtree import KDTree
kd = KDTree(len(bdata.vertices))
for v in bdata.vertices:
    kd.insert(v.co, v.index)
kd.balance()
def info_at(co):
    return cls[kd.find(co)[1]]

def face_info(f):
    c = f.calc_center_median()
    return c, info_at(c)

def smooth_boundary(bm, iters):
    # hems: average each edge vertex with its neighbours along the edge (keeps sharp V corners mostly intact)
    edge = [v for v in bm.verts if v.is_boundary]
    for _ in range(iters):
        new = {}
        for v in edge:
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(nb) == 2:
                a, b = nb[0].co, nb[1].co
                turn = (a - v.co).normalized().dot((b - v.co).normalized())
                if turn < -0.2:   # not a corner
                    new[v] = v.co * 0.5 + (a + b) * 0.25
        for v, co in new.items():
            v.co = co

def make_garment(name, keep_face, cuts, offset, smooth_iters=6, post_cut=None, shape=None):
    """keep_face(center, info) coarse region test; cuts = [(co, no, region(center, info))]
    Faces in `region` on the +normal side of a cut plane are removed; the cut gives a clean hem."""
    me = bdata.copy(); me.name = name
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep_face(*face_info(f))], context='FACES')
    for co, no, region in cuts:
        faces = [f for f in bm.faces if region(*face_info(f))]
        if not faces:
            continue
        geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=False, clear_inner=False)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if region(*face_info(f)) and (f.calc_center_median() - co).dot(no) > 0], context='FACES')
    if post_cut:
        post_cut(bm)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.dissolve_degenerate(bm, dist=0.0015, edges=bm.edges[:])
    bm.normal_update()
    infos = [info_at(v.co) for v in bm.verts]
    for v, inf in zip(bm.verts, infos):
        v.co += v.normal * (offset(v.co, inf, v.normal) if offset.__code__.co_argcount == 3 else offset(v.co, inf))
    if shape:
        for v, inf in zip(bm.verts, infos):
            v.co = shape(v.co, inf)
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(smooth_iters):
        bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    smooth_boundary(bm, 4)
    bm.to_mesh(me); bm.free()
    me.shade_smooth()
    return ob

def clean(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0008)
    bmesh.ops.dissolve_degenerate(bm, dist=0.0012, edges=bm.edges[:])
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_area() < 1e-8], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    bm.to_mesh(ob.data); bm.free()

def solidify(ob, thickness):
    clean(ob)
    sol = ob.modifiers.new('Solidify', 'SOLIDIFY')
    sol.thickness = thickness; sol.offset = -1; sol.use_rim = True; sol.use_even_offset = False
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='Solidify')

# ─── jersey ───
R_NECK = 0.078
NECK_XY = Vector((NECK.x, NECK.y + 0.012))
def neck_d(c):
    # elliptical neck opening, a little narrower front-to-back
    d = Vector((c.x, c.y)) - NECK_XY
    return math.hypot(d.x / 1.0, d.y / 0.9)
V_POINT = Vector((0, NECK.y - 0.11, NECK.z - 0.085))
def vplane(sx):
    d = Vector((sx * 0.05, 0.0, 0.08)).normalized()
    n = d.cross(Vector((0, 1, 0))).normalized()
    return n if n.z > 0 else -n
inside_v = lambda c: c.y < NECK.y - 0.02 and all((c - V_POINT).dot(vplane(sx)) > 0 for sx in (1, -1))

def neck_hook(bm):
    near = lambda c: c.z > NECK.z - 0.2 and (Vector((c.x, c.y)) - NECK_XY).length < 0.2
    # round opening hugging the neck
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if (lambda c: c.z > NECK.z - 0.065 + 0.055 * smooth01(0.0, 0.07, c.y - NECK.y) and neck_d(c) < R_NECK)(f.calc_center_median())], context='FACES')
    # V at the front
    for sx in (1, -1):
        faces = [f for f in bm.faces if (lambda c: c.y < NECK.y - 0.02 and abs(c.x) < 0.12 and c.z > NECK.z - 0.16)(f.calc_center_median())]
        geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=V_POINT, plane_no=vplane(sx))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if inside_v(f.calc_center_median())], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # tidy the round part of the neckline: snap to the cylinder, then smooth heights along the edge
    edge_verts = [v for v in bm.verts if v.is_boundary and near(v.co)]
    for v in edge_verts:
        d = Vector((v.co.x, v.co.y)) - NECK_XY
        on_v = v.co.y < NECK.y - 0.03 and abs(v.co.x) < 0.07 and v.co.z < NECK.z - 0.035
        nd = neck_d(v.co)
        if not on_v and nd > 1e-6 and nd < R_NECK + 0.03:
            d = d * (R_NECK / nd)
            v.co.x, v.co.y = NECK_XY.x + d.x, NECK_XY.y + d.y
    for _ in range(4):
        zs = {}
        for v in edge_verts:
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if nb:
                zs[v] = (v.co.z * 2 + sum(n.co.z for n in nb)) / (2 + len(nb))
        for v, z in zs.items():
            v.co.z = z

jersey_cuts = [(Vector((0, 0, JERSEY_BOTTOM)), Vector((0, 0, -1)), lambda c, i: True)]
for s in 'LR':
    jersey_cuts.append((SH[s] + ARM_AXIS[s] * SLEEVE_LEN, ARM_AXIS[s], lambda c, i, s=s: i['arm'] and i['side'] == s))
jersey = make_garment(
    'Jersey',
    lambda c, i: (not i['leg']) and not (i['head'] and c.z > NECK.z + 0.01) and c.z > JERSEY_BOTTOM - 0.06 and (not i['arm'] or t_arm(c, i['side']) < SLEEVE_LEN + 0.06),
    jersey_cuts, jersey_offset, smooth_iters=10, post_cut=neck_hook)

# ─── pants ───
pants_cuts = [(Vector((0, 0, WAIST_Z)), Vector((0, 0, 1)), lambda c, i: True)]
for s in 'LR':
    pants_cuts.append((KNEE[s] + THIGH_AXIS[s] * PANTS_HEM, THIGH_AXIS[s], lambda c, i, s=s: i['side'] == s and c.z < HIP[s].z - 0.1))
pants = make_garment('Pants',
    lambda c, i: (not i['arm']) and c.z < WAIST_Z + 0.05 and c.z > KNEE['L'].z - PANTS_HEM - 0.08,
    pants_cuts, pants_offset, smooth_iters=3)

# ─── socks ───
socks_cuts = []
for s in 'LR':
    socks_cuts.append((KNEE[s] + SHIN_AXIS[s] * (PANTS_HEM - 0.05), -SHIN_AXIS[s], lambda c, i, s=s: i['side'] == s))
    socks_cuts.append((ANK[s] + Vector((0, 0, SOCK_BOTTOM - 0.03)), Vector((0, 0, -1)), lambda c, i, s=s: i['side'] == s))
socks = make_garment('Socks',
    lambda c, i: (not i['arm']) and i['leg'] and c.z < KNEE[i['side']].z + 0.02 and c.z > ANK[i['side']].z + SOCK_BOTTOM - 0.06,
    socks_cuts, lambda co, c: 0.0045, smooth_iters=2)

# ─── cleats ───
CLEAT_TOP = ANK['L'].z + SOCK_BOTTOM
cleat_cuts = [(Vector((0, 0, CLEAT_TOP + 0.02)), Vector((0, 0, 1)), lambda c, i: True)]
cleats = make_garment('Cleats', lambda c, i: (not i['arm']) and c.z < CLEAT_TOP + 0.06,
    cleat_cuts, lambda co, c: 0.012, smooth_iters=2)
bm = bmesh.new(); bm.from_mesh(cleats.data)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bm.to_mesh(cleats.data); bm.free()
rm = cleats.modifiers.new('Remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.007
bpy.context.view_layer.objects.active = cleats
bpy.ops.object.modifier_apply(modifier='Remesh')
sm = cleats.modifiers.new('Smooth', 'LAPLACIANSMOOTH'); sm.iterations = 12; sm.lambda_factor = 1.5
bpy.ops.object.modifier_apply(modifier='Smooth')
bm = bmesh.new(); bm.from_mesh(cleats.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, CLEAT_TOP)), plane_no=Vector((0, 0, 1)), clear_outer=True)
# flat outsole
zmin = min(v.co.z for v in bm.verts)
for v in bm.verts:
    if v.co.z < zmin + 0.012:
        v.co.z = zmin + 0.004 * ((v.co.z - zmin) / 0.012)
bm.to_mesh(cleats.data); bm.free()
cleats.data.shade_smooth()

# ─── gloves ───
glove_cuts = [(WR[s] - FORE_AXIS[s] * 0.035, -FORE_AXIS[s], lambda c, i, s=s: i['arm'] and i['side'] == s) for s in 'LR']
gloves = make_garment('Gloves', lambda c, i: i['arm'] and (c - WR[i['side']]).dot(FORE_AXIS[i['side']]) > -0.08,
    glove_cuts, lambda co, c: 0.0035, smooth_iters=1)
print('garments', {o.name: len(o.data.vertices) for o in (jersey, pants, socks, cleats, gloves)})


# ═══════════════════════════════════════════════════════════════════════
# Stage 3: UV layouts, materials, eyes, export
# ═══════════════════════════════════════════════════════════════════════
TWO_PI = 2 * math.pi
Z0, Z1 = JERSEY_BOTTOM - 0.01, NECK.z + 0.06
YC = 0.02   # torso centre line (front of the body is -y)

def frame(axis, sx):
    lat = Vector((sx, 0, 0)); lat = (lat - axis * lat.dot(axis)).normalized()
    fwd = axis.cross(lat).normalized()
    if fwd.dot(Vector((0, -1, 0))) < 0:
        fwd = -fwd
    return lat, fwd

def around(p, axis, lat, fwd):
    q = p - axis * p.dot(axis)
    return 0.5 + math.atan2(q.dot(fwd), q.dot(lat)) / TWO_PI

def set_materials(ob, names):
    for n in names:
        m = bpy.data.materials.get(n) or bpy.data.materials.new(n)
        ob.data.materials.append(m)

def fix_seams(me, uv):
    for poly in me.polygons:
        us = [uv.data[li].uv.x for li in poly.loop_indices]
        if max(us) - min(us) > 0.5:
            for li in poly.loop_indices:
                if uv.data[li].uv.x < 0.5:
                    uv.data[li].uv.x += 1.0

meta = {'regions': {}}

def region_meta(key, pts_v_r, length):
    # circumference along v, for converting centimetres to texture pixels
    bins = [[] for _ in range(21)]
    for v, r in pts_v_r:
        bins[min(20, max(0, int(round(v * 20))))].append(r)
    circ = []
    last = 0.2
    for b in bins:
        if b:
            last = TWO_PI * sum(b) / len(b)
        circ.append(round(last, 4))
    meta['regions'][key] = {'length': round(length, 4), 'circumference': circ}

# Jersey: torso (material 0) and sleeves (material 1)
ARMHOLE = {s: abs(SH[s].x) - 0.035 for s in 'LR'}
ARMPIT_Z = SH['L'].z - 0.085
bm = bmesh.new(); bm.from_mesh(jersey.data)
for s_ in 'LR':
    faces = [f for f in bm.faces if f.calc_center_median().z > ARMPIT_Z - 0.04 and SIGN[s_] * f.calc_center_median().x > 0.1]
    geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector((SIGN[s_] * ARMHOLE[s_], 0, 0)), plane_no=Vector((1, 0, 0)))
bm.to_mesh(jersey.data); bm.free()
def is_sleeve_face(c, inf):
    s_ = 'L' if c.x >= 0 else 'R'
    out = abs(c.x)
    if out <= ARMHOLE[s_]:
        return False
    # above the armpit the armhole plane decides; below it, only the free-hanging arm
    return c.z > ARMPIT_Z or (inf['arm'] and t_arm(c, s_) > 0.045)
set_materials(jersey, ['jersey', 'sleeve'])
me = jersey.data
me.uv_layers[0].name = 'UVMap'
uv = me.uv_layers['UVMap']
ARM_FRAME = {s: frame(ARM_AXIS[s], SIGN[s]) for s in 'LR'}
T_TOP = min(t_arm(v.co, 'L' if v.co.x >= 0 else 'R') for v in me.vertices if abs(v.co.x) > ARMHOLE['L'] and v.co.z > ARMPIT_Z)
torso_pts, sleeve_pts = [], []
for poly in me.polygons:
    c = poly.center
    inf = info_at(c)
    is_sleeve = is_sleeve_face(c, inf)
    poly.material_index = 1 if is_sleeve else 0
    for li in poly.loop_indices:
        co = me.vertices[me.loops[li].vertex_index].co
        if is_sleeve:
            s_ = 'L' if c.x >= 0 else 'R'
            lat, fwd = ARM_FRAME[s_]
            p = co - SH[s_]
            t = p.dot(ARM_AXIS[s_])
            u = around(p, ARM_AXIS[s_], lat, fwd)
            v = (SLEEVE_LEN - t) / (SLEEVE_LEN - T_TOP)
            sleeve_pts.append((v, (p - ARM_AXIS[s_] * t).length))
        else:
            u = 0.5 + math.atan2(co.x, -(co.y - YC)) / TWO_PI
            v = (co.z - Z0) / (Z1 - Z0)
            torso_pts.append((v, math.hypot(co.x, co.y - YC)))
        uv.data[li].uv = (u, v)
fix_seams(me, uv)
region_meta('jersey', torso_pts, Z1 - Z0)
region_meta('sleeve', sleeve_pts, SLEEVE_LEN - T_TOP)
meta['jersey'] = {'z0': Z0, 'z1': Z1}

# ─── knit collar: a separate raised band following the neckline ───
COLLAR_W = 0.03
def neck_loop(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bm.normal_update()
    edges = [e for e in bm.edges if e.is_boundary and (lambda c: c.z > NECK.z - 0.2 and neck_d(c) < 0.17)((e.verts[0].co + e.verts[1].co) / 2)]
    adj = {}
    for e in edges:
        a, b = e.verts
        adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    start = max(adj, key=lambda v: v.co.y)          # back centre
    loop, prev, cur = [start], None, start
    while True:
        nxt = [n for n in adj[cur] if n is not prev]
        if not nxt or nxt[0] is start:
            break
        prev, cur = cur, nxt[0]
        loop.append(cur)
    pts = [v.co.copy() for v in loop]
    nrm = [v.normal.copy() for v in loop]
    bm.free()
    return pts, nrm

pts, nrm = neck_loop(jersey)
# resample evenly and smooth (keep the V point sharp)
def resample(pts, nrm, n):
    L = [0.0]
    for i in range(1, len(pts) + 1):
        L.append(L[-1] + (pts[i % len(pts)] - pts[i - 1]).length)
    out, onr, j = [], [], 0
    for k in range(n):
        t = L[-1] * k / n
        while L[j + 1] < t:
            j += 1
        f = (t - L[j]) / max(1e-9, L[j + 1] - L[j])
        out.append(pts[j].lerp(pts[(j + 1) % len(pts)], f))
        onr.append(nrm[j].lerp(nrm[(j + 1) % len(pts)], f).normalized())
    return out, onr, L[-1]
from mathutils.bvhtree import BVHTree
N = 360
raw, _, _ = resample(pts, nrm, N)
# heights along the real neckline, heavily smoothed
bz = [p.z for p in raw]
for _ in range(120):
    bz = [(bz[i - 1] + bz[i] * 2 + bz[(i + 1) % N]) / 4 for i in range(N)]
def height_at(x, y):
    k = min(range(N), key=lambda i: (raw[i].x - x) ** 2 + (raw[i].y - y) ** 2)
    return bz[k]
# parametric plan-view neckline: ellipse at the back and sides, straight V at the front
VP = min(raw, key=lambda p: p.z + (0 if p.y < NECK.y else 9))
RX, RY = R_NECK + 0.004, (R_NECK + 0.004) * 0.9
A_V = math.radians(38)       # half-angle (from the front) where the V leaves the ellipse
def ell(a):                   # a = 0 at the front (-y), increasing toward +x
    return Vector((NECK_XY.x + RX * math.sin(a), NECK_XY.y - RY * math.cos(a)))
nv = 40
cp = []
e1, e2 = ell(A_V), ell(2 * math.pi - A_V)
z1 = height_at(e1.x, e1.y); z2 = height_at(e2.x, e2.y)
for k in range(nv):
    f = k / nv
    cp.append(Vector((VP.x + (e1.x - VP.x) * f, VP.y + (e1.y - VP.y) * f, VP.z + (z1 - VP.z) * f)))
for k in range(N - 2 * nv):
    a = A_V + (2 * math.pi - 2 * A_V) * k / (N - 2 * nv)
    e = ell(a)
    cp.append(Vector((e.x, e.y, height_at(e.x, e.y))))
for k in range(nv):
    f = k / nv
    cp.append(Vector((e2.x + (VP.x - e2.x) * f, e2.y + (VP.y - e2.y) * f, z2 + (VP.z - z2) * f)))
perim = sum((cp[i] - cp[i - 1]).length for i in range(N))
# put the UV seam at the back centre
back = max(range(N), key=lambda i: cp[i].y)
cp = cp[back:] + cp[:back]
vi = (N - back) % N
centre = sum(cp, Vector()) / N
jbm = bmesh.new(); jbm.from_mesh(jersey.data)
bvh = BVHTree.FromBMesh(jbm)
def onsurf(p):
    q = bvh.find_nearest(p)
    return q[0] if q[0] is not None else p
# outer edge: offset the neckline outward in plan view, then drop it onto the jersey
outer = []
for i in range(N):
    t = cp[(i + 1) % N] - cp[i - 1]
    t2 = Vector((t.x, t.y, 0)).normalized()
    o = Vector((t2.y, -t2.x, 0))
    if o.dot(Vector((cp[i].x - centre.x, cp[i].y - centre.y, 0))) < 0:
        o = -o
    w = COLLAR_W * (1.3 if abs(i - vi) <= 1 else 1.0)
    outer.append(onsurf(cp[i] + o * w))
for _ in range(30):
    outer = [outer[i] if abs(i - vi) <= 1 else (outer[i - 1] + outer[i] * 2 + outer[(i + 1) % N]) / 4 for i in range(N)]
outer = [onsurf(p) for p in outer]
jbm.free()
rows = []
for i in range(N):
    t = (cp[(i + 1) % N] - cp[i - 1]).normalized()
    across = (outer[i] - cp[i])
    n = t.cross(across).normalized()
    if n.dot(cp[i] - Vector((0, NECK.y, cp[i].z - 0.3))) < 0:
        n = -n
    d = across.normalized()
    rows.append([cp[i] - n * 0.004 - d * 0.004, cp[i] + n * 0.0042, outer[i] + n * 0.0036, outer[i] + d * 0.003 - n * 0.0008])
cverts, cfaces = [], []
for i in range(N):
    cverts.extend(rows[i])
for i in range(N):
    j = (i + 1) % N
    for r in range(3):
        cfaces.append((i * 4 + r, j * 4 + r, j * 4 + r + 1, i * 4 + r + 1))
cme = bpy.data.meshes.new('Collar')
cme.from_pydata(cverts, [], cfaces)
cuv = cme.uv_layers.new(name='UVMap')
VS = [0.0, 0.08, 0.95, 1.0]
for poly in cme.polygons:
    for li in poly.loop_indices:
        vidx = cme.loops[li].vertex_index
        i, r = divmod(vidx, 4)
        u = i / N
        cuv.data[li].uv = (u, VS[r])
fix_seams(cme, cuv)
cme.shade_smooth()
collar = bpy.data.objects.new('Collar', cme)
bpy.context.collection.objects.link(collar)
set_materials(collar, ['collar'])
meta['collar'] = {'width': COLLAR_W, 'perimeter': round(perim, 4), 'v_point_u': round(vi / N, 4)}

# Pants, both legs share one texture: lateral stripe at u = 0.5
set_materials(pants, ['pants'])
me = pants.data
uv = me.uv_layers[0]
LEG_FRAME = {s: frame(THIGH_AXIS[s], SIGN[s]) for s in 'LR'}
ts = [(v.co - HIP['L' if v.co.x >= 0 else 'R']).dot(THIGH_AXIS['L' if v.co.x >= 0 else 'R']) for v in me.vertices]
P_TOP, P_HEM = min(ts), max(ts)
pts = []
for poly in me.polygons:
    s_ = 'L' if poly.center.x >= 0 else 'R'
    lat, fwd = LEG_FRAME[s_]
    for li in poly.loop_indices:
        co = me.vertices[me.loops[li].vertex_index].co
        p = co - HIP[s_]
        t = p.dot(THIGH_AXIS[s_])
        v = (P_HEM - t) / (P_HEM - P_TOP)
        uv.data[li].uv = (around(p, THIGH_AXIS[s_], lat, fwd), v)
        pts.append((v, (p - THIGH_AXIS[s_] * t).length))
fix_seams(me, uv)
region_meta('pants', pts, P_HEM - P_TOP)

# Socks
set_materials(socks, ['socks'])
me = socks.data
uv = me.uv_layers[0]
SHIN_FRAME = {s: frame(SHIN_AXIS[s], SIGN[s]) for s in 'LR'}
ts = [(v.co - KNEE['L' if v.co.x >= 0 else 'R']).dot(SHIN_AXIS['L' if v.co.x >= 0 else 'R']) for v in me.vertices]
S_TOP, S_BOT = min(ts), max(ts)
pts = []
for poly in me.polygons:
    s_ = 'L' if poly.center.x >= 0 else 'R'
    lat, fwd = SHIN_FRAME[s_]
    for li in poly.loop_indices:
        co = me.vertices[me.loops[li].vertex_index].co
        p = co - KNEE[s_]
        t = p.dot(SHIN_AXIS[s_])
        v = (S_BOT - t) / (S_BOT - S_TOP)
        uv.data[li].uv = (around(p, SHIN_AXIS[s_], lat, fwd), v)
        pts.append((v, (p - SHIN_AXIS[s_] * t).length))
fix_seams(me, uv)
region_meta('socks', pts, S_BOT - S_TOP)

set_materials(cleats, ['cleat'])
cleats.data.uv_layers.new(name='UVMap')
set_materials(gloves, ['glove'])
set_materials(body, ['skin'])

# Eyes: small spheres at the eye joints, pole facing forward so the iris is a band near v = 1
for s in 'LR':
    c = Vector(J[f'eye.{s}']['head'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.0118, location=c)
    eye = bpy.context.active_object
    eye.name = f'Eye{s}'
    eye.rotation_euler = (math.pi / 2, 0, 0)   # +z pole → -y (forward)
    bpy.ops.object.transform_apply(rotation=True)
    eye.data.shade_smooth()
    set_materials(eye, ['eye'])

# Solidify hems after UVs so the inner shell and rims inherit them
solidify(jersey, 0.004)
solidify(pants, 0.004)

# Stand on the ground
ground = min((o.matrix_world @ v.co).z for o in (cleats,) for v in o.data.vertices)
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        o.location.z -= ground
meta['ground_shift'] = -ground
meta['head_tail'] = [round(x, 4) for x in (Vector(J['head']['tail']) + Vector((0, 0, -ground)))]
meta['joints'] = {k: [round(x, 4) for x in (Vector(v['head']) + Vector((0, 0, -ground)))] for k, v in J.items()
                  if k in ('neck01', 'head', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R',
                           'upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R', 'foot.L', 'foot.R', 'eye.L', 'eye.R', 'spine01', 'spine03')}
meta['constants'] = {'sleeve_len': SLEEVE_LEN, 'jersey_bottom': JERSEY_BOTTOM - ground, 'waist': WAIST_Z - ground, 'neck_z': NECK.z - ground}

for o in list(bpy.context.scene.objects):
    if o.type == 'ARMATURE':
        bpy.data.objects.remove(o)
body.name = 'Body'
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        for a in list(o.data.attributes):
            if a.name in ('is_body', 'src_index'):
                o.data.attributes.remove(a)
        o.vertex_groups.clear()

bpy.ops.export_scene.gltf(filepath=os.path.join(args.out, 'player.glb'), export_format='GLB',
                          export_texcoords=True, export_normals=True, export_yup=True,
                          export_materials='EXPORT', export_skins=False, export_animations=False)
json.dump(meta, open(os.path.join(args.out, 'player.json'), 'w'), indent=1)
print('exported', os.path.getsize(os.path.join(args.out, 'player.glb')) // 1024, 'KB')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(args.out, '_stage2.blend'))
print('saved stage2')
