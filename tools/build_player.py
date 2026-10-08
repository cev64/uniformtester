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
MUSCLE, WEIGHT, HEIGHT = 0.95, 0.76, 0.72   # MakeHuman macro sliders (0..1)
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
    ('neck/neck-scale-horiz-incr.target', 1.0),
    ('neck/neck-scale-depth-incr.target', 0.7),
    ('neck/neck-back-scale-depth-incr.target', 0.5),     # traps running into the back of the neck
    ('neck/neck-scale-vert-decr.target', 0.3),
    ('torso/torso-scale-horiz-incr.target', 0.12),
    ('torso/torso-scale-depth-incr.target', 0.35),        # deep rib cage
    ('torso/torso-vshape-incr.target', 0.4),
    ('torso/torso-muscle-pectoral-incr.target', 0.35),
    ('torso/torso-muscle-dorsi-incr.target', 0.5),
    ('bodyshapes/bodyshapes-elvs-man-trapezoid.target', 0.25),
    ('stomach/stomach-pregnant-decr.target', 0.3),        # flat stomach
    ('buttocks/buttocks-volume-incr.target', 0.35),
    ('armslegs/{s}-upperarm-muscle-incr.target', 0.6),
    ('armslegs/{s}-upperarm-scale-horiz-incr.target', 0.5),
    ('armslegs/{s}-upperarm-scale-depth-incr.target', 0.45),
    ('armslegs/{s}-lowerarm-muscle-incr.target', 0.7),
    ('armslegs/{s}-lowerarm-scale-horiz-incr.target', 0.5),
    ('armslegs/{s}-lowerarm-scale-depth-incr.target', 0.35),
    ('armslegs/{s}-upperarm-shoulder-muscle-incr.target', 0.2),
    ('armslegs/{s}-hand-scale-incr.target', 0.25),        # big hands (gloved)
    ('armslegs/{s}-upperleg-muscle-incr.target', 0.15),   # thighs are under pads: bulk, not definition
    ('armslegs/{s}-upperleg-scale-horiz-incr.target', 0.35),
    ('armslegs/{s}-upperleg-scale-depth-incr.target', 0.35),
    ('armslegs/{s}-lowerleg-muscle-incr.target', 0.6),
    ('armslegs/{s}-lowerleg-scale-horiz-incr.target', 0.35),
    ('armslegs/{s}-lowerleg-scale-depth-incr.target', 0.35),
]
for name, w in EXTRA:
    for nm in ([name.format(s=s) for s in 'lr'] if '{s}' in name else [name]):
        if w and os.path.exists(os.path.join(MH, 'targets', nm)):
            targets.append((nm, w))
        elif w:
            print('missing extra target', nm)

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
    aim(f'upperarm01.{side}', (sx * 0.27, 0.02, -1.0))
    aim(f'lowerarm01.{side}', (sx * 0.2, -0.3, -1.0))
    aim(f'wrist.{side}', (sx * 0.06, -0.12, -1.0))
    # bring the feet in a little from MakeHuman's wide stance
    aim(f'lowerleg01.{side}', (sx * 0.035, 0.015, -1.0))

def turn(bone_name, axis, angle):
    pb = rig.pose.bones[bone_name]
    bpy.context.view_layer.update()
    head = pb.head.copy()
    R = Matrix.Translation(head) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-head)
    pb.matrix = R @ pb.matrix
    bpy.context.view_layer.update()

# feet turned out a little, as people stand
for side, sx in (('L', 1), ('R', -1)):
    turn(f'foot.{side}', Vector((0, 0, 1)), math.radians(8) * sx)

# relaxed gloved hands: fingers loosely curled toward the palm
CURL = {2: (10, 20, 14), 3: (14, 26, 16), 4: (17, 30, 18), 5: (20, 34, 20)}
for side, sx in (('L', 1), ('R', -1)):
    bpy.context.view_layer.update()
    pbs = rig.pose.bones
    knuck = (pbs[f'finger2-1.{side}'].head - pbs[f'finger5-1.{side}'].head).normalized()
    kc = (pbs[f'finger2-1.{side}'].head + pbs[f'finger5-1.{side}'].head) / 2
    thumb = pbs[f'finger1-3.{side}'].tail
    # swing the thumb down from MakeHuman's splayed rest pose to lie along the index finger
    for tb in ('finger1-1', 'finger1-2'):
        pb = pbs[f'{tb}.{side}']
        td = (pb.tail - pb.head).normalized()
        idx = (pbs[f'finger2-1.{side}'].tail - pbs[f'finger2-1.{side}'].head).normalized()
        aim(pb.name, td * 0.45 + idx * 0.55)
    for f, angles in CURL.items():
        for j, a in enumerate(angles, 1):
            pb = pbs[f'finger{f}-{j}.{side}']
            d = (pb.tail - pb.head).normalized()
            palm = knuck.cross(d).normalized()
            if (thumb - kc).dot(palm) < 0:   # the thumb sits on the palm side
                palm = -palm
            axis = d.cross(palm).normalized()
            turn(pb.name, axis, math.radians(a))
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

WAIST_Z = HIP['L'].z + 0.03        # top of the pants: at the hip bones, below the navel
JERSEY_BOTTOM = HIP['L'].z - 0.05  # jersey tucks well under the pants
SLEEVE_LEN = 0.13                  # short modern sleeves: shoulder joint → hem along the arm
PANTS_HEM = 0.07                   # below the knee joint
SOCK_BOTTOM = 0.09                 # just above the ankle joint (the cleat's knit collar covers the rest)

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

# The groin is always under the pants (which are built from the body surface):
# relax it into the smooth shape of a cup and girdle so the pants front reads
# as fabric over pads rather than anatomy.
_bm = bmesh.new(); _bm.from_mesh(bdata)
_hz = HIP['L'].z
_groin = [v for v in _bm.verts if abs(v.co.x) < 0.085 and _hz - 0.17 < v.co.z < _hz + 0.03 and v.co.y < 0.03]
for _ in range(40):
    bmesh.ops.smooth_vert(_bm, verts=_groin, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
_bm.to_mesh(bdata); _bm.free()

CHEST_Z = SH['L'].z - 0.24
ARM_AXIS = {s: (EL[s] - SH[s]).normalized() for s in 'LR'}
FORE_AXIS = {s: (WR[s] - EL[s]).normalized() for s in 'LR'}
THIGH_AXIS = {s: (KNEE[s] - HIP[s]).normalized() for s in 'LR'}
SHIN_AXIS = {s: (ANK[s] - KNEE[s]).normalized() for s in 'LR'}

def t_arm(co, s): return (co - SH[s]).dot(ARM_AXIS[s])

# ─── shoulder pads ───
# The pads are modelled as a signed-distance shell: a boxy front/back plate
# over the chest and shoulder blades, plus an arch over each shoulder that
# ends in a rounded epaulet. The three pieces are blended with a smooth
# minimum so the jersey stretched over them has no creases. Jersey points
# inside the shell are pushed out onto it, which gives the square, flat-topped
# pro silhouette with the sleeve wrapping the epaulet.
SHZ = SH['L'].z
SHX = abs(SH['L'].x)
# Dimensions follow a modern low-profile skill-position pad on a 6'5" frame:
# about 68 cm across the caps, the top a few centimetres over the traps,
# chest and back plates standing 3-5 cm off the body down to the bottom of
# the pecs / shoulder blades.
PAD_SHAPES = [
    # centre, (x-, x+), (front, back), (down, up), exponents (xz, y)
    # chest + back plates
    (Vector((0, -0.024, SHZ - 0.07)), (0.218, 0.218), (0.196, 0.186), (0.165, 0.165), (4.2, 3.2)),
]
for s_ in (1, -1):
    # arch over the shoulder ending in a rounded cap over the deltoid
    PAD_SHAPES.append((Vector((s_ * (SHX + 0.012), -0.016, SHZ + 0.045)), (0.088, 0.142) if s_ < 0 else (0.142, 0.088), (0.106, 0.104), (0.092, 0.09), (4.6, 3.2)))

def _sdf_one(p, shape):
    c, rx, ry, rz, (nxz, ny) = shape
    d = p - c
    ax = rx[1] if d.x > 0 else rx[0]
    ay = ry[0] if d.y < 0 else ry[1]
    az = rz[1] if d.z > 0 else rz[0]
    f = (abs(d.x / ax) ** nxz + abs(d.y / ay) ** ny + abs(d.z / az) ** nxz)
    f = f ** (1 / max(nxz, ny)) if f > 0 else 1e-6
    L = d.length
    return L * (1 - 1 / max(f, 1e-6))

def smin(a, b, k):
    h = max(k - abs(a - b), 0) / k
    return min(a, b) - h * h * k * 0.25

def smax(a, b, k):
    return -smin(-a, -b, k)

NECK_HOLE = Vector((0, NECK.y + 0.012, 0))
def pad_sdf(p):
    d = _sdf_one(p, PAD_SHAPES[0])
    for sh in PAD_SHAPES[1:]:
        d = smin(d, _sdf_one(p, sh), 0.06)
    # the neck opening: a cone that widens upward, a little deeper at the front
    k = smooth01(SHZ - 0.04, SHZ + 0.07, p.z)
    if k <= 0:
        return d
    rx = 0.118 * k ** 0.5
    ry = rx * (1.12 if p.y < NECK_HOLE.y else 0.92)
    q = math.hypot(p.x / rx, (p.y - NECK_HOLE.y) / ry)
    hole = (1 - q) * rx            # > 0 inside the opening
    return smax(d, hole, 0.025)

def pad_shape(p, c):
    w = 1.0
    if c['arm']:
        # fade out down the sleeve so the epaulet meets the arm smoothly
        w = 1 - smooth01(0.05, 0.08, t_arm(p, c['side']))
        if w <= 0:
            return p
    if p.z < CHEST_Z - 0.12:
        return p
    q = p.copy()
    e = 0.002
    for _ in range(4):
        d = pad_sdf(q)
        if d >= 0:
            break
        g = Vector((pad_sdf(q + Vector((e, 0, 0))) - pad_sdf(q - Vector((e, 0, 0))),
                    pad_sdf(q + Vector((0, e, 0))) - pad_sdf(q - Vector((0, e, 0))),
                    pad_sdf(q + Vector((0, 0, e))) - pad_sdf(q - Vector((0, 0, e)))))
        if g.length < 1e-9:
            break
        q = q - g.normalized() * d
    return p.lerp(q, w)

def jersey_offset(co, c, n):
    # compression fit: a few millimetres off the skin, a little more ease on the sleeve
    off = 0.005
    if c['arm']:
        off += 0.006 * (1 - smooth01(0.02, SLEEVE_LEN, t_arm(co, c['side'])))
    return off

def frame(axis, sx):
    lat = Vector((sx, 0, 0)); lat = (lat - axis * lat.dot(axis)).normalized()
    fwd = axis.cross(lat).normalized()
    if fwd.dot(Vector((0, -1, 0))) < 0:
        fwd = -fwd
    return lat, fwd

THIGH_LEN = {s: (KNEE[s] - HIP[s]).length for s in 'LR'}
THIGH_FRAME = {s: frame(THIGH_AXIS[s], SIGN[s]) for s in 'LR'}

def leg_local(co, s):
    # (distance down the thigh axis, angle round the leg: 0 front / + outside, radius)
    p = co - HIP[s]
    t = p.dot(THIGH_AXIS[s])
    lat, fwd = THIGH_FRAME[s]
    r = p - THIGH_AXIS[s] * t
    return t, math.atan2(r.dot(lat), r.dot(fwd)), r.length

def plate(t, a, ct, ca, ht, ha, n=4):
    # superelliptic footprint: 0 at the centre, 1 at the edge
    return (abs((t - ct) / ht) ** n + abs((a - ca) / ha) ** n) ** (1 / n)

def pants_offset(co, c):
    s = c['side']
    off = 0.009
    t, ang, rad = leg_local(co, s)
    # the hem grips the leg just under the knee
    off -= 0.004 * smooth01(THIGH_LEN[s] + 0.03, THIGH_LEN[s] + 0.07, t)
    # girdle hip pads on the outside of each hip, tailbone pad at the back
    off += 0.008 * gauss(co, HIP[s] + Vector((SIGN[s] * 0.11, 0, 0.03)), 0.07)
    off += 0.004 * gauss(co, Vector((0, 0.1, HIP[s].z + 0.02)), 0.07)
    return off

def pants_detail(co, c, n):
    """Integrated thigh and knee pads with crisp edges, the fly placket and
    the soft folds behind the knee, applied after the fit is smoothed."""
    s = c['side']
    t, ang, rad = leg_local(co, s)
    L = THIGH_LEN[s]
    arc = ang * max(rad, 0.03)
    d = 0.0
    if not c['arm']:
        # thigh pad: a tall rounded plate on the front of the thigh, slightly to the outside
        q = plate(t, arc, 0.5 * L, 0.012, 0.115, 0.07)
        d += 0.0085 * (1 - smooth01(0.8, 1.0, q)) * (1 - 0.18 * q * q)
        # knee pad: a domed oval over the kneecap
        q = plate(t, arc, L - 0.012, 0.0, 0.062, 0.056, 3)
        d += 0.0115 * (1 - smooth01(0.78, 1.0, q)) * (1 - 0.4 * q * q)
        # gathers behind the knee
        back = smooth01(2.0, 2.7, abs(ang))
        if back > 0:
            w = smooth01(L - 0.09, L - 0.04, t) * (1 - smooth01(L + 0.02, L + 0.05, t))
            d += 0.0022 * back * w * math.sin((t - L) / 0.019 * math.pi + 0.6 * math.sin(ang * 3))
    # fly placket down the front, lapped over to the wearer's left, with a stitched groove
    if co.y < -0.02 and HIP['L'].z - 0.12 < co.z < WAIST_Z + 0.01:
        fx = co.x - 0.006
        k = smooth01(HIP['L'].z - 0.12, HIP['L'].z - 0.08, co.z)
        d += k * (0.0022 * (1 - smooth01(0.012, 0.016, abs(fx))) - 0.0009 * math.exp(-((fx - 0.009) / 0.0018) ** 2))
    return n * d

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

from mathutils.bvhtree import BVHTree
body_bvh = BVHTree.FromPolygons([v.co.copy() for v in bdata.vertices], [tuple(p.vertices) for p in bdata.polygons])

def keep_out(bm, min_off):
    # push any vertex that sank toward the skin back out to at least min_off
    for v in bm.verts:
        hit = body_bvh.find_nearest(v.co)
        if hit[0] is None:
            continue
        loc, nrm = hit[0], hit[1]
        d = (v.co - loc).dot(nrm)
        if d < min_off:
            v.co += nrm * (min_off - d)

def make_garment(name, keep_face, cuts, offset, smooth_iters=6, post_cut=None, shape=None, tension=None, min_off=0.0, detail=None, drape=None):
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
    if tension:
        # fabric stretched across hollows (e.g. over the abs below the pads)
        pred, iters = tension
        sel = [v for v in inner if pred(v.co)]
        for _ in range(iters):
            bmesh.ops.smooth_vert(bm, verts=sel, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            keep_out(bm, min_off)
    if min_off:
        keep_out(bm, min_off)
        for _ in range(2):
            bmesh.ops.smooth_vert(bm, verts=inner, factor=0.3, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    if drape:
        drape(bm)
    if detail:
        # crisp surface detail (pad edges, plackets, folds) after all the smoothing
        bm.normal_update()
        moves = [(v, detail(v.co.copy(), info_at(v.co), v.normal.copy())) for v in bm.verts]
        for v, d in moves:
            v.co += d
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

def set_materials(ob, names):
    for n in names:
        m = bpy.data.materials.get(n) or bpy.data.materials.new(n)
        ob.data.materials.append(m)

def solidify(ob, thickness):
    clean(ob)
    sol = ob.modifiers.new('Solidify', 'SOLIDIFY')
    sol.thickness = thickness; sol.offset = -1; sol.use_rim = True; sol.use_even_offset = False
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='Solidify')

# ─── jersey ───
R_NECK = 0.086
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
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if (lambda c: c.z > NECK.z - 0.065 + 0.025 * smooth01(0.0, 0.07, c.y - NECK.y) and neck_d(c) < R_NECK)(f.calc_center_median())], context='FACES')
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
def jersey_detail(co, c, n):
    """Soft tension folds where a compression jersey creases over pads: fanning
    out of each armpit, and puckering where it is tucked into the waistband."""
    d = 0.0
    side = 1 if co.x >= 0 else -1
    s = 'L' if side > 0 else 'R'
    # armpit: folds radiating from the hollow under the pad cap, front and back
    if not c['arm'] and abs(co.x) > 0.1:
        A = Vector((side * (SHX - 0.03), -0.02, SHZ - 0.1))
        r = math.hypot(co.y - A.y, co.z - A.z)
        th = math.atan2(co.z - A.z, co.y - A.y)
        fall = smooth01(0.025, 0.05, r) * (1 - smooth01(0.08, 0.15, r)) * smooth01(0.1, 0.17, abs(co.x))
        d += 0.0016 * fall * math.sin(th * 9 + 1.3 * side)
    # sleeve: a couple of folds where the sleeve drops off the cap under the arm
    if c['arm']:
        t = t_arm(co, s)
        lat, fwd = ARM_FRAME0[s]
        p = co - SH[s]
        a = math.atan2(p.dot(fwd), p.dot(lat))
        inner = smooth01(1.6, 2.6, abs(a))           # the side facing the body
        d += 0.0013 * inner * smooth01(0.03, 0.06, t) * math.sin(t / 0.016 * math.pi + a * 2)
    # waist: the jersey blouses a little over the belt with vertical puckers
    zb = co.z - WAIST_Z
    if -0.005 < zb < 0.07:
        k = smooth01(-0.004, 0.006, zb) * (1 - smooth01(0.02, 0.07, zb))
        ang = math.atan2(co.x, -(co.y - 0.02))
        d += k * (0.0018 + 0.0016 * math.sin(ang * 15 + 2.2 * math.sin(ang * 4)))
    return n * d

ARM_FRAME0 = {s: frame(ARM_AXIS[s], SIGN[s]) for s in 'LR'}

def jersey_drape(bm):
    """Below the pads a jersey does not cling to the abs: it falls nearly
    straight from the bottom of the chest and back plates to where it is
    tucked and bloused at the waistband. Each column of the torso is pushed
    out to the line between its radius under the pads and at the waist."""
    ztop, zbot = SHZ - 0.16, WAIST_Z + 0.025
    YC0 = 0.02
    NBIN = 96
    def polar(co):
        return math.atan2(co.x, -(co.y - YC0)), math.hypot(co.x, co.y - YC0)
    def bin_of(a):
        return int((a + math.pi) / (2 * math.pi) * NBIN) % NBIN
    torso = [v for v in bm.verts if not info_at(v.co)['arm']]
    rt, rb = [0.0] * NBIN, [0.0] * NBIN
    for v in torso:
        a, r = polar(v.co)
        if abs(v.co.z - ztop) < 0.012:
            rt[bin_of(a)] = max(rt[bin_of(a)], r)
        if abs(v.co.z - zbot) < 0.012:
            rb[bin_of(a)] = max(rb[bin_of(a)], r)
    for arr in (rt, rb):
        for i in range(NBIN):
            if arr[i] == 0:
                arr[i] = max(arr[i - 1], arr[(i + 1) % NBIN])
        for _ in range(3):
            arr[:] = [(arr[i - 1] + 2 * arr[i] + arr[(i + 1) % NBIN]) / 4 for i in range(NBIN)]
    for v in torso:
        z = v.co.z
        if not (zbot - 0.03 < z < ztop):
            continue
        a, r = polar(v.co)
        b = bin_of(a)
        sfrac = min(1.0, max(0.0, (ztop - z) / (ztop - zbot)))
        line = rt[b] + (rb[b] + 0.006 - rt[b]) * sfrac ** 0.9 - 0.007 * math.sin(math.pi * sfrac)
        w = 0.85 * smooth01(zbot - 0.03, zbot, z) * (1 - smooth01(ztop - 0.08, ztop, z))
        target = r + (line - r) * w
        if target > r:
            k = target / max(r, 1e-6)
            v.co.x *= k
            v.co.y = YC0 + (v.co.y - YC0) * k
    pad_arch(bm)
    # crisp pad caps: after smoothing, put the fabric over the shoulders back
    # on the pad shell so the epaulet keeps a defined edge above the arm
    cap = [v for v in bm.verts if abs(v.co.x) > 0.09 and v.co.z > SHZ - 0.14 and not v.is_boundary]
    for it in range(3):
        for v in cap:
            v.co = pad_snap(v.co, info_at(v.co))
        if it < 2:
            bmesh.ops.smooth_vert(bm, verts=cap, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)

def pad_snap(p, c, off=0.0045, band=0.012):
    """move a point within `band` of the pad shell onto the shell + `off`"""
    w = 1.0
    if c['arm']:
        w = 1 - smooth01(0.05, 0.08, t_arm(p, c['side']))
        if w <= 0:
            return p
    d0 = pad_sdf(p)
    if d0 > band:
        return p
    q = p.copy()
    e = 0.0015
    for _ in range(5):
        d = pad_sdf(q) - off
        g = Vector((pad_sdf(q + Vector((e, 0, 0))) - pad_sdf(q - Vector((e, 0, 0))),
                    pad_sdf(q + Vector((0, e, 0))) - pad_sdf(q - Vector((0, e, 0))),
                    pad_sdf(q + Vector((0, 0, e))) - pad_sdf(q - Vector((0, 0, e)))))
        if g.length < 1e-9:
            break
        q = q - g.normalized() * d
        if abs(d) < 2e-4:
            break
    # fade the pull for points that were already well outside the shell
    k = w * (1 - smooth01(band * 0.5, band, d0)) * smooth01(0.1, 0.2, abs(p.x))
    return p.lerp(q, k)

def pad_arch(bm):
    """The pad arches rise round the sides and back of the neck almost to the
    jaw, pushing the collar up: lift the fabric there into a raised rim that
    hugs the neck, leaving the front V where it is."""
    C = Vector((0, NECK.y + 0.005))
    H_SIDE, H_BACK = SHZ + 0.135, SHZ + 0.122
    NB = 72
    def ang(co):
        return math.atan2(co.x - C.x, -(co.y - C.y))
    # neck radius per direction, a little below the top of the arch
    neck_r = [0.0] * NB
    for bv in bdata.vertices:
        co = bv.co
        if abs(co.z - (H_SIDE - 0.02)) < 0.008:
            r = math.hypot(co.x - C.x, co.y - C.y)
            if r < 0.13:
                b = int((ang(co) + math.pi) / (2 * math.pi) * NB) % NB
                neck_r[b] = max(neck_r[b], r)
    for i in range(NB):
        if neck_r[i] == 0:
            neck_r[i] = 0.07
    for _ in range(2):
        neck_r = [(neck_r[i - 1] + 2 * neck_r[i] + neck_r[(i + 1) % NB]) / 4 for i in range(NB)]
    for v in bm.verts:
        co = v.co
        if co.z < SHZ - 0.04 or info_at(co)['arm']:
            continue
        th = ang(co)
        f = smooth01(0.5, 1.35, abs(th))
        if f <= 0:
            continue
        H = H_SIDE + (H_BACK - H_SIDE) * smooth01(2.2, 3.0, abs(th))
        b = int((th + math.pi) / (2 * math.pi) * NB) % NB
        r_in = neck_r[b] + 0.013
        r = math.hypot(co.x - C.x, co.y - C.y)
        d = r - r_in
        if d > 0.09:
            continue
        sd = smooth01(0.012, 0.085, d)
        # rounded lip on the inside of the arch
        lip = 0.006 * (1 - smooth01(-0.004, 0.012, d))
        zt = (H - lip) * (1 - sd) + co.z * sd
        if zt > co.z:
            co.z += f * (zt - co.z)
        if d < 0:
            k = 1 + f * (r_in - r) / max(r, 1e-6)
            co.x = C.x + (co.x - C.x) * k
            co.y = C.y + (co.y - C.y) * k

jersey = make_garment(
    'Jersey',
    lambda c, i: (not i['leg']) and not (i['head'] and c.z > NECK.z + 0.01) and c.z > JERSEY_BOTTOM - 0.06 and (not i['arm'] or t_arm(c, i['side']) < SLEEVE_LEN + 0.06),
    jersey_cuts, jersey_offset, smooth_iters=10, post_cut=neck_hook, shape=pad_shape,
    tension=(lambda c: c.z < CHEST_Z + 0.04 and abs(c.x) < 0.22, 25), min_off=0.004, detail=jersey_detail, drape=jersey_drape)

# ─── pants ───
pants_cuts = [(Vector((0, 0, WAIST_Z)), Vector((0, 0, 1)), lambda c, i: True)]
for s in 'LR':
    pants_cuts.append((KNEE[s] + THIGH_AXIS[s] * PANTS_HEM, THIGH_AXIS[s], lambda c, i, s=s: i['side'] == s and c.z < HIP[s].z - 0.1))
pants = make_garment('Pants',
    lambda c, i: (not i['arm']) and c.z < WAIST_Z + 0.05 and c.z > KNEE['L'].z - PANTS_HEM - 0.08,
    pants_cuts, pants_offset, smooth_iters=12,
    tension=(lambda c: (c.z > HIP['L'].z - 0.22 and abs(c.x) < 0.11) or (KNEE['L'].z + 0.07 < c.z < HIP['L'].z - 0.04), 30), min_off=0.006, detail=pants_detail)

# ─── socks ───
socks_cuts = []
for s in 'LR':
    socks_cuts.append((KNEE[s] + SHIN_AXIS[s] * (PANTS_HEM - 0.05), -SHIN_AXIS[s], lambda c, i, s=s: i['side'] == s))
    socks_cuts.append((ANK[s] + Vector((0, 0, SOCK_BOTTOM - 0.065)), Vector((0, 0, -1)), lambda c, i, s=s: i['side'] == s))
socks = make_garment('Socks',
    lambda c, i: (not i['arm']) and i['leg'] and c.z < KNEE[i['side']].z + 0.02 and c.z > ANK[i['side']].z + SOCK_BOTTOM - 0.1,
    socks_cuts, lambda co, c: 0.0045, smooth_iters=2)

# ─── cleats ───
# Nike Vapor-style mid football cleats, modelled as subdivision cages traced
# from Nike's product shots (see tools/cleat.py): sculpted upper with a lace
# panel, sole plate with a heel cup and lip, molded studs, knit collar round
# the sock and criss-crossed laces with a bow. The foot itself is hidden.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cleat as cleat_mod
# The turf: kept where the original sole plate put it (z_in = bottom of the
# foot), so the body's joint heights above the ground don't change.
_foot_all = [v.co.copy() for v, c in zip(bdata.vertices, cls) if c['side'] == 'L' and c['leg'] and v.co.z < ANK['L'].z + 0.01]
z_in = min(p.z for p in _foot_all) - 0.003
GROUND_Z = z_in - 0.012 - 0.0145 * 0.8
_cleats = []
for _s in 'LR':
    _pts = [v.co.copy() for v, c in zip(bdata.vertices, cls) if c['side'] == _s and c['leg'] and v.co.z < ANK[_s].z + 0.01]
    _sock = [v.co.copy() for v in socks.data.vertices if (v.co.x > 0) == (_s == 'L')]
    _ob, _ = cleat_mod.build_cleat(_s, _pts, ANK[_s], _sock, GROUND_Z)
    _cleats.append(_ob)
bpy.ops.object.select_all(action='DESELECT')
for o in _cleats:
    o.select_set(True)
bpy.context.view_layer.objects.active = _cleats[0]
bpy.ops.object.join()
cleats = _cleats[0]
cleats.name = 'Cleats'

# ─── gloves ───
# receiver gloves: snug fingers and a raised wrist cuff with a strap edge
GLOVE_CUFF = 0.035
def glove_detail(co, c, n):
    s = c['side']
    u = (co - WR[s]).dot(FORE_AXIS[s]) + GLOVE_CUFF        # 0 at the cuff edge
    cuff = smooth01(0.0, 0.004, u) * (1 - smooth01(0.03, 0.036, u))
    lip = math.exp(-((u - 0.003) / 0.0025) ** 2)
    return n * (0.0018 * cuff + 0.0008 * lip)
glove_cuts = [(WR[s] - FORE_AXIS[s] * GLOVE_CUFF, -FORE_AXIS[s], lambda c, i, s=s: i['arm'] and i['side'] == s) for s in 'LR']
gloves = make_garment('Gloves', lambda c, i: i['arm'] and (c - WR[i['side']]).dot(FORE_AXIS[i['side']]) > -0.08,
    glove_cuts, lambda co, c: 0.0035, smooth_iters=1, detail=glove_detail)
print('garments', {o.name: len(o.data.vertices) for o in (jersey, pants, socks, cleats, gloves)})

# ─── accessories (separate meshes with their own materials, toggled in the app) ───
def new_object(name, verts, faces, mats):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    set_materials(ob, mats)
    return ob

def bvh_of(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.normal_update()
    t = BVHTree.FromBMesh(bm)
    bm.free()
    return t

pants_bvh = bvh_of(pants)
WAIST_C = Vector((0, 0.0, WAIST_Z))

# the tucked tail of the jersey stays inside the pants
_jm = jersey.data
for v in _jm.vertices:
    if v.co.z < WAIST_Z - 0.004:
        loc, nrm, _, dist = pants_bvh.find_nearest(v.co)
        if loc is None or dist > 0.05:
            continue
        if nrm.dot(Vector((v.co.x, v.co.y - 0.02, 0))) < 0:
            nrm = -nrm
        d = (v.co - loc).dot(nrm)
        if d > -0.0035:
            v.co += nrm * (-0.0035 - d)

def waist_point(ang, z, bvh=pants_bvh):
    """the pants surface at angle `ang` round the waist (0 = front, + = wearer's left)"""
    d = Vector((math.sin(ang), -math.cos(ang), 0))
    o = Vector((0, -0.01, z)) + d * 0.5
    hit = bvh.ray_cast(o, -d, 0.6)
    if hit[0] is None:
        return None, None
    n = hit[1] if hit[1].dot(d) > 0 else -hit[1]
    return hit[0], n

# Belt: a 3 cm webbing belt round the waistband with a covered buckle at the
# front and belt loops in the pants colour.
BELT_TOP, BELT_BOT = WAIST_Z - 0.002, WAIST_Z - 0.032
NB = 160
rows_z = [BELT_BOT + (BELT_TOP - BELT_BOT) * k / 5 for k in range(6)]
bv, bf, buv = [], [], []
grid = []
for i in range(NB):
    ang = 2 * math.pi * i / NB - math.pi
    col = []
    for k, z in enumerate(rows_z):
        p, n = waist_point(ang, z)
        if p is None:
            p, n = WAIST_C + Vector((math.sin(ang), -math.cos(ang), 0)) * 0.15, Vector((math.sin(ang), -math.cos(ang), 0))
        n = Vector((n.x, n.y, 0)).normalized()
        # covered buckle: a slightly thicker plate at the front centre
        buckle = (1 - smooth01(0.028, 0.034, abs(p.x))) * (1 if p.y < 0 else 0)
        col.append(p + n * (0.0026 + 0.0022 * buckle))
    grid.append(col)
# smooth round the waist (the ray hits are noisy over the fly)
for _ in range(3):
    grid = [[(grid[i - 1][k] + grid[i][k] * 2 + grid[(i + 1) % NB][k]) / 4 for k in range(6)] for i in range(NB)]
for i in range(NB):
    bv.extend(grid[i])
for i in range(NB):
    j = (i + 1) % NB
    for k in range(5):
        bf.append((i * 6 + k, j * 6 + k, j * 6 + k + 1, i * 6 + k + 1))
belt = new_object('Belt', bv, bf, ['belt', 'beltloop'])
# belt loops: short straps over the belt, in the pants fabric
lv, lf = [], []
for ang in (-2.45, -1.35, -0.42, 0.42, 1.35, 2.45, math.pi):
    for dz in (0.0,):
        p0, n0 = waist_point(ang, BELT_TOP + 0.004)
        p1, n1 = waist_point(ang, BELT_BOT - 0.006)
        if p0 is None or p1 is None:
            continue
        nn = Vector((n0.x + n1.x, n0.y + n1.y, 0)).normalized()
        tang = Vector((0, 0, 1)).cross(nn).normalized()
        b = len(bv) + len(lv)
        for p in (p0, p1):
            for w in (-0.0055, 0.0055):
                for o in (0.0, 0.0058):
                    lv.append(p + tang * w + nn * (o if p is p1 else o + 0.0005))
        # box from the 8 corners: (top/bottom) x (left/right) x (in/out)
        q = lambda a, w, o: b + a * 4 + w * 2 + o
        for f in ((q(0, 0, 1), q(0, 1, 1), q(1, 1, 1), q(1, 0, 1)), (q(0, 0, 0), q(0, 0, 1), q(1, 0, 1), q(1, 0, 0)),
                  (q(0, 1, 1), q(0, 1, 0), q(1, 1, 0), q(1, 1, 1)), (q(0, 0, 0), q(0, 1, 0), q(0, 1, 1), q(0, 0, 1)),
                  (q(1, 0, 1), q(1, 1, 1), q(1, 1, 0), q(1, 0, 0))):
            lf.append(f)
bm = bmesh.new(); bm.from_mesh(belt.data)
vs = [bm.verts.new(co) for co in lv]
bm.verts.ensure_lookup_table()
off = len(bv)
for f in lf:
    face = bm.faces.new([bm.verts[i] for i in f])
    face.material_index = 1
bm.to_mesh(belt.data); bm.free()
solidify_belt = belt.modifiers.new('T', 'SOLIDIFY'); solidify_belt.thickness = 0.0025; solidify_belt.offset = -1
bpy.context.view_layer.objects.active = belt
bpy.ops.object.select_all(action='DESELECT'); belt.select_set(True)
bpy.ops.object.modifier_apply(modifier='T')
uvl = belt.data.uv_layers.new(name='UVMap')
for poly in belt.data.polygons:
    for li in poly.loop_indices:
        p = belt.data.vertices[belt.data.loops[li].vertex_index].co
        if poly.material_index == 1:
            uvl.data[li].uv = (0.74, 0.995)          # pants waistband colour
        else:
            uvl.data[li].uv = ((math.atan2(p.x, -p.y) / (2 * math.pi) + 0.5) * 30, (p.z - BELT_BOT) / (BELT_TOP - BELT_BOT))
belt.data.shade_smooth()
belt_bvh = bvh_of(belt)

# Towel: a hand towel tucked under the belt on the front of the wearer's
# right hip, about 13 x 27 cm, lying on the thigh with soft folds and
# falling free of it toward the hem.
TW, TL = 0.12, 0.27
TCX = -0.076
NU, NV = 28, 42
tv = []
prev = [None] * NU
for j in range(NV):
    l = j / (NV - 1)
    z = BELT_BOT + 0.012 - l * TL
    gather = 0.66 + 0.34 * smooth01(0.0, 0.4, l)          # pinched where it is tucked
    for i in range(NU):
        s_ = i / (NU - 1) * 2 - 1
        x = TCX + s_ * TW / 2 * gather - 0.012 * l * l     # drifts a little toward the side
        hit = pants_bvh.ray_cast(Vector((x, -0.5, z)), Vector((0, 1, 0)), 1.0)
        y = (hit[0].y if hit[0] is not None else -0.15) - 0.0042
        # it lies on the thigh, but can only come back toward the body slowly
        if prev[i] is not None:
            y = min(y, prev[i] + 0.0045 * (1 - l) ** 1.5)
        prev[i] = y
        # two soft lengthwise folds from the tuck that open toward the hem,
        # plus a gentle curl of the free edges
        amp = 0.005 + 0.0065 * l
        fold = amp * math.sin(s_ * math.pi * 1.9 + 0.5 + 0.6 * l)
        fold += 0.0022 * math.sin(s_ * math.pi * 4.3 + 1.7 * l) * (1 - l) * gather
        edge = 0.006 * smooth01(0.65, 1.0, abs(s_)) * (0.3 + l)
        lip = 0.0075 * math.exp(-((l - 0.035) / 0.035) ** 2) * (1 - 0.3 * s_ * s_)   # rolled where it leaves the belt
        y -= max(0.0, fold) * 1.2 + min(0.0, fold) * 0.35 + edge + 0.01 * l ** 2.2 + lip
        zz = z - 0.005 * (1 - s_ * s_) * l ** 3 + 0.003 * math.sin(s_ * 2.3 + 0.8) * l ** 2   # uneven hem
        tv.append(Vector((x, y, zz)))
tf = []
for j in range(NV - 1):
    for i in range(NU - 1):
        a_ = j * NU + i
        tf.append((a_, a_ + NU, a_ + NU + 1, a_ + 1))
towel = new_object('Towel', tv, tf, ['towel'])
tuv = towel.data.uv_layers.new(name='UVMap')
for poly in towel.data.polygons:
    for li in poly.loop_indices:
        vi = towel.data.loops[li].vertex_index
        tuv.data[li].uv = ((vi % NU) / (NU - 1), (vi // NU) / (NV - 1))
bm = bmesh.new(); bm.from_mesh(towel.data)
for _ in range(2):
    bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(towel.data); bm.free()
so = towel.modifiers.new('T', 'SOLIDIFY'); so.thickness = 0.003; so.offset = -1
bpy.context.view_layer.objects.active = towel
bpy.ops.object.select_all(action='DESELECT'); towel.select_set(True)
bpy.ops.object.modifier_apply(modifier='T')
towel.data.shade_smooth()

# Wristbands: terry bands on the forearm just above the glove cuffs
wb_cuts = []
for s in 'LR':
    wb_cuts.append((WR[s] - FORE_AXIS[s] * (GLOVE_CUFF - 0.004), FORE_AXIS[s], lambda c, i, s=s: i['side'] == s))
    wb_cuts.append((WR[s] - FORE_AXIS[s] * (GLOVE_CUFF + 0.07), -FORE_AXIS[s], lambda c, i, s=s: i['side'] == s))
wristbands = make_garment('Wristbands', lambda c, i: i['arm'] and -0.13 < (c - WR[i['side']]).dot(FORE_AXIS[i['side']]) < 0.0,
                          wb_cuts, lambda co, c: 0.0068, smooth_iters=3)
solidify(wristbands, 0.003)
wristbands.data.materials.clear()
set_materials(wristbands, ['wristband'])
for poly in wristbands.data.polygons:
    for li in poly.loop_indices:
        p = wristbands.data.vertices[wristbands.data.loops[li].vertex_index].co
        wristbands.data.uv_layers[0].data[li].uv = (math.atan2(p.y + 0.1, p.x) * 3, p.z * 30)

# Compression undersleeves: from under the jersey sleeve to the glove cuff
us_cuts = []
for s in 'LR':
    us_cuts.append((WR[s] - FORE_AXIS[s] * (GLOVE_CUFF - 0.006), FORE_AXIS[s], lambda c, i, s=s: i['side'] == s))
def _us_keep(c, i):
    if not i['arm']:
        return False
    s_ = i['side']
    return t_arm(c, s_) > SLEEVE_LEN - 0.035 and (c - WR[s_]).dot(FORE_AXIS[s_]) < -0.02
undersleeves = make_garment('Undersleeves', _us_keep, us_cuts, lambda co, c: 0.0024, smooth_iters=3)
undersleeves.data.materials.clear()
set_materials(undersleeves, ['armsleeve'])
for poly in undersleeves.data.polygons:
    for li in poly.loop_indices:
        p_ = undersleeves.data.vertices[undersleeves.data.loops[li].vertex_index].co
        undersleeves.data.uv_layers[0].data[li].uv = (math.atan2(p_.y + 0.05, p_.x - math.copysign(0.3, p_.x)) * 4, p_.z * 25)

# Eye black: matte grease strokes on the cheekbones under each eye
eb_v, eb_f = [], []
for s in 'LR':
    E = Vector(J[f'eye.{s}']['head'])
    cx, cz = E.x + SIGN[s] * 0.006, E.z - 0.029
    NXE, NZE = 14, 7
    base = len(eb_v)
    for j in range(NZE):
        for i in range(NXE):
            u, v = i / (NXE - 1) * 2 - 1, j / (NZE - 1) * 2 - 1
            # a rounded stroke under the eye, a little deeper toward the outside of the face
            v *= (1 - abs(u) ** 4) ** 0.25
            hw = 0.0165
            hh = 0.0058 * (1 + 0.18 * u * SIGN[s])
            x, z = cx + u * hw, cz + v * hh - 0.003 * u * u
            hit = body_bvh.ray_cast(Vector((x, E.y - 0.2, z)), Vector((0, 1, 0)), 0.4)
            p, n = (hit[0], hit[1]) if hit[0] is not None else (Vector((x, E.y, z)), Vector((0, -1, 0)))
            if n.y > 0:
                n = -n
            eb_v.append(p + n * 0.0006)
    for j in range(NZE - 1):
        for i in range(NXE - 1):
            a = base + j * NXE + i
            eb_f.append((a, a + 1, a + NXE + 1, a + NXE))
eyeblack = new_object('EyeBlack', eb_v, eb_f, ['eyeblack'])
eyeblack.data.uv_layers.new(name='UVMap')
eyeblack.data.shade_smooth()


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
# The armhole seam: a plane leaning in from the armpit to the top of the pad
# cap (raglan-like), so the sleeve covers the cap and the chest stays torso.
ARMPIT_Z = SH['L'].z - 0.085
ARMHOLE_P = {s: Vector((SIGN[s] * (SHX - 0.03), 0, SHZ)) for s in 'LR'}
ARMHOLE_N = {s: Vector((SIGN[s], 0, 0.318)).normalized() for s in 'LR'}
def armhole(c, s_):
    return (c - ARMHOLE_P[s_]).dot(ARMHOLE_N[s_])
UNDERARM_N = {}
for s_ in 'LR':
    n_ = ARM_AXIS[s_].cross(Vector((0, 1, 0))).normalized()
    UNDERARM_N[s_] = n_ if n_.x * SIGN[s_] > 0 else -n_
UNDERARM_P = {s_: SH[s_] - UNDERARM_N[s_] * 0.05 for s_ in 'LR'}
bm = bmesh.new(); bm.from_mesh(jersey.data)
for s_ in 'LR':
    faces = [f for f in bm.faces if f.calc_center_median().z > ARMPIT_Z - 0.04 and SIGN[s_] * f.calc_center_median().x > 0.1]
    geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=ARMHOLE_P[s_], plane_no=ARMHOLE_N[s_])
    faces = [f for f in bm.faces if abs(f.calc_center_median().z - ARMPIT_Z - 0.045) < 0.03 and armhole(f.calc_center_median(), s_) > -0.01 and SIGN[s_] * f.calc_center_median().x > 0.1]
    geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector((0, 0, ARMPIT_Z + 0.045)), plane_no=Vector((0, 0, 1)))
    # the underarm seam: a plane along the inside of the arm
    faces = [f for f in bm.faces if ARMPIT_Z - 0.12 < f.calc_center_median().z < ARMPIT_Z + 0.05 and SIGN[s_] * f.calc_center_median().x > 0.12]
    geom = list({e for f in faces for e in f.edges}) + faces + list({v for f in faces for v in f.verts})
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=UNDERARM_P[s_], plane_no=UNDERARM_N[s_])
bm.to_mesh(jersey.data); bm.free()
def is_sleeve_face(c, inf):
    s_ = 'L' if c.x >= 0 else 'R'
    if abs(c.x) <= 0.1 or armhole(c, s_) <= 0:
        return False
    # over the pad cap the armhole seam decides; round the armpit only the arm
    # itself, so the torso's side panel never picks up the sleeve's hem stripes
    if c.z > ARMPIT_Z + 0.045:
        return True
    return (c - UNDERARM_P[s_]).dot(UNDERARM_N[s_]) > 0 and t_arm(c, s_) > 0.02
set_materials(jersey, ['jersey', 'sleeve'])
me = jersey.data
me.uv_layers[0].name = 'UVMap'
uv = me.uv_layers['UVMap']
ARM_FRAME = {s: frame(ARM_AXIS[s], SIGN[s]) for s in 'LR'}
T_TOP = min(t_arm(v.co, 'L' if v.co.x >= 0 else 'R') for v in me.vertices if armhole(v.co, 'L' if v.co.x >= 0 else 'R') > 0 and v.co.z > ARMPIT_Z)
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
from mathutils.bvhtree import BVHTree
jbm = bmesh.new(); jbm.from_mesh(jersey.data)
jbm.normal_update()
bvh = BVHTree.FromBMesh(jbm)

def surf(p):
    q = bvh.find_nearest(p)
    if q[0] is None:
        return p, Vector((0, 0, 1))
    n = q[1]
    # face normals near the neckline aren't reliably wound; point them away from the body
    if n.dot(q[0] - Vector((0, 0.0, q[0].z - 0.15))) < 0:
        n = -n
    return q[0], n

def resample_loop(pts, n):
    L = [0.0]
    for i in range(1, len(pts) + 1):
        L.append(L[-1] + (pts[i % len(pts)] - pts[i - 1]).length)
    out, j = [], 0
    for k in range(n):
        t = L[-1] * k / n
        while L[j + 1] < t:
            j += 1
        f = (t - L[j]) / max(1e-9, L[j + 1] - L[j])
        out.append(pts[j].lerp(pts[(j + 1) % len(pts)], f))
    return out, L[-1]

N = 360
cp, perim = resample_loop(pts, N)
# put index 0 at the back centre and find the V point (lowest point at the front)
back = max(range(N), key=lambda i: cp[i].y - abs(cp[i].x) * 2)
cp = cp[back:] + cp[:back]
vi = min(range(N), key=lambda i: cp[i].z + (0 if cp[i].y < NECK.y else 9))
# smooth the neckline in 3D (keeping the V sharp) and settle it back on the jersey
for _ in range(40):
    cp = [cp[i] if min(abs(i - vi), N - abs(i - vi)) <= 1 else (cp[i - 1] + cp[i] * 2 + cp[(i + 1) % N]) / 4 for i in range(N)]
    cp = [surf(p)[0] for p in cp]
nrms = [surf(p)[1] for p in cp]
centre = sum(cp, Vector()) / N
# outward direction across the band, in the jersey surface
outs = []
for i in range(N):
    t = (cp[(i + 1) % N] - cp[i - 1]).normalized()
    o = nrms[i].cross(t).normalized()
    # outward = toward the fabric, away from the neck hole
    da = (surf(cp[i] + o * 0.015)[0] - (cp[i] + o * 0.015)).length
    db = (surf(cp[i] - o * 0.015)[0] - (cp[i] - o * 0.015)).length
    if db < da:
        o = -o
    outs.append(o)
outer = [surf(cp[i] + outs[i] * COLLAR_W)[0] for i in range(N)]
# trim any jersey fabric left inside the collar line (so nothing pokes out above the band)
tbm = bmesh.new(); tbm.from_mesh(jersey.data)
from mathutils.kdtree import KDTree as _KD
ckd = _KD(N)
for i, p in enumerate(cp):
    ckd.insert(p, i)
ckd.balance()
kill = []
for f in tbm.faces:
    c = f.calc_center_median()
    co, i, dist = ckd.find(c)
    if dist < 0.04 and (c - cp[i]).dot(outs[i]) < -0.003:
        kill.append(f)
bmesh.ops.delete(tbm, geom=kill, context='FACES')
bmesh.ops.delete(tbm, geom=[v for v in tbm.verts if not v.link_faces], context='VERTS')
tbm.to_mesh(jersey.data); tbm.free()
# the two outer edges of the V meet in a point below the neckline's V
step = perim / N
side_a, side_b = (cp[(vi + 12) % N] - cp[vi]).normalized(), (cp[vi - 12] - cp[vi]).normalized()
half = max(0.5, side_a.angle(side_b) / 2)
down = -(side_a + side_b).normalized()
v_outer = surf(cp[vi] + down * (COLLAR_W / math.sin(half)))[0]
m = max(2, int(math.ceil(COLLAR_W / math.tan(half) / step)) + 2)
for k in range(-m, m + 1):
    i = (vi + k) % N
    j = (vi + (m if k >= 0 else -m)) % N
    outer[i] = surf(v_outer.lerp(outer[j], abs(k) / m))[0]
for _ in range(12):
    outer = [outer[i] if min(abs(i - vi), N - abs(i - vi)) <= m else (outer[i - 1] + outer[i] * 2 + outer[(i + 1) % N]) / 4 for i in range(N)]
    outer = [surf(p)[0] for p in outer]
onrm = [surf(p)[1] for p in outer]
jbm.free()
rows = []
for i in range(N):
    n0, n1 = nrms[i], onrm[i]
    d = (outer[i] - cp[i]).normalized()
    # rolled neck edge, flat band lying on the jersey, feathered outer edge
    rows.append([cp[i] - n0 * 0.002 - d * 0.0015, cp[i] + n0 * 0.0032, outer[i] + n1 * 0.0026, outer[i] + n1 * 0.0006 + d * 0.0012])
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
        cuv.data[li].uv = (i / N, VS[r])
fix_seams(cme, cuv)
cme.shade_smooth()
collar = bpy.data.objects.new('Collar', cme)
bpy.context.collection.objects.link(collar)
set_materials(collar, ['collar'])
meta['collar'] = {'width': COLLAR_W, 'perimeter': round(perim, 4), 'v_point_u': round(vi / N, 4)}
# the front of the neckline (outer edge of the collar) in torso UV space, for
# graphics that radiate from the V (e.g. the Ravens' feathered collar)
front_uv = []
for k in range(-60, 61, 3):
    p = outer[(vi + k) % N]
    front_uv.append([round(0.5 + math.atan2(p.x, -(p.y - YC)) / TWO_PI, 4), round((p.z - Z0) / (Z1 - Z0), 4)])
meta['collar']['front_uv'] = front_uv

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

# The feet are hidden inside the shoes and socks: drop them from the body so
# toes never poke through the uppers
bm = bmesh.new(); bm.from_mesh(body.data)
low = ANK['L'].z + SOCK_BOTTOM - 0.05
bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.z < low for v in f.verts) and abs(f.calc_center_median().x) > 0.03], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(body.data); bm.free()

# Stand on the ground
ground = GROUND_Z   # stud tips pressed a little into the turf
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
