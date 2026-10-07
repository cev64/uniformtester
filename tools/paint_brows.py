"""
Paints eyebrows into the MakeHuman skin photo textures, which have none.

The brow curve is laid out in 3D over each eye of the MakeHuman base mesh
(rest pose; UVs don't change with the body morphs), projected onto the skin
and mapped to texture space through the hit triangle's UVs. The brow is drawn
as hundreds of short, thin hair strokes that lean outward along the brow,
dense and thick at the inner end and thinning toward the tail.

  python3 tools/paint_brows.py --mh <makehuman/data> in.jpg out.jpg [--color 18,12,9] [--alpha 0.85]
Run it on the output of tools/fix_skin.py.
"""
import argparse, json, math, os, random
import numpy as np
np.seterr(all="ignore")
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('--mh', required=True)
ap.add_argument('src')
ap.add_argument('dst')
ap.add_argument('--color', default='20,13,9')
ap.add_argument('--alpha', type=float, default=0.85)
a = ap.parse_args()

V, UV, F, FUV = [], [], [], []
group = None
for line in open(os.path.join(a.mh, '3dobjs/base.obj')):
    if line.startswith('v '):
        V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('vt '):
        UV.append([float(x) for x in line.split()[1:3]])
    elif line.startswith('g '):
        group = line.split()[1]
    elif line.startswith('f ') and group == 'body':
        idx = [p.split('/') for p in line.split()[1:]]
        F.append([int(p[0]) - 1 for p in idx])
        FUV.append([int(p[1]) - 1 for p in idx])
V, UV = np.array(V), np.array(UV)
skel = json.load(open(os.path.join(a.mh, 'rigs/default.mhskel')))
def joint(n):
    return V[skel['joints'][n]].mean(0)
eyes = {s: joint(f'eye.{s}____head') for s in 'LR'}
iod = np.linalg.norm(eyes['L'] - eyes['R'])
cm = iod / 6.3                      # base-mesh units per centimetre

# triangles of the face (front-facing, near the eyes) for ray casts along -z (MakeHuman faces +z)
tris = []
for f, fu in zip(F, FUV):
    for k in range(1, len(f) - 1):
        tris.append((f[0], f[k], f[k + 1], fu[0], fu[k], fu[k + 1]))
c = (eyes['L'] + eyes['R']) / 2
tris = [t for t in tris if np.linalg.norm(V[t[0]] - c) < 6 * cm]

T = np.array(tris)
P0, P1, P2 = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
U0, U1, U2 = UV[T[:, 3]], UV[T[:, 4]], UV[T[:, 5]]
E1, E2 = P1 - P0, P2 - P0
DET = E1[:, 0] * E2[:, 1] - E2[:, 0] * E1[:, 1]
ok = np.abs(DET) > 1e-12

def project(x, y):
    """uv of the frontmost skin point at (x, y)"""
    dx, dy = x - P0[:, 0], y - P0[:, 1]
    with np.errstate(divide='ignore', invalid='ignore'):
        u = (dx * E2[:, 1] - E2[:, 0] * dy) / DET
        v = (E1[:, 0] * dy - dx * E1[:, 1]) / DET
    m = ok & (u >= -1e-6) & (v >= -1e-6) & (u + v <= 1 + 1e-6)
    if not m.any():
        return None
    z = P0[:, 2] + u * E1[:, 2] + v * E2[:, 2]
    z = np.where(m, z, -1e9)
    i = int(np.argmax(z))
    return (1 - u[i] - v[i]) * U0[i] + u[i] * U1[i] + v[i] * U2[i]

img = Image.open(a.src).convert('RGB')
W, H = img.size
layer = Image.new('L', (W, H), 0)
dr = ImageDraw.Draw(layer)
rng = random.Random(3)
def to_px(uv):
    return (uv[0] * W, (1 - uv[1]) * H)

for s, sx in (('L', 1), ('R', -1)):
    e = eyes[s]
    # brow: from just above the inner corner, arching over the eye to past its outer corner
    def brow(t):          # t 0 (inner) .. 1 (tail)
        x = e[0] + sx * (-1.35 + 3.9 * t) * cm
        y = e[1] + (1.55 + 0.55 * math.sin(math.pi * min(1, t * 1.25)) - 0.5 * t * t) * cm
        thick = (0.95 - 0.65 * t) * cm
        return x, y, thick
    for _ in range(1400):
        t = rng.random() ** 1.15
        x, y, th = brow(t)
        off = (rng.random() - 0.5) * th
        # each hair: ~6 mm, leaning outward and a little up at the inner end
        ang = math.radians(70 - 60 * min(1, t * 1.6)) if True else 0
        ln = (0.45 + 0.35 * rng.random()) * cm
        x0, y0 = x, y + off
        x1 = x0 + sx * math.cos(ang) * ln
        y1 = y0 + math.sin(ang) * ln * (1 if off < th * 0.2 else -0.3)
        p0, p1 = project(x0, y0), project(x1, y1)
        if p0 is None or p1 is None:
            continue
        val = int(255 * (0.35 + 0.65 * rng.random()) * (1 - 0.45 * t))
        dr.line([to_px(p0), to_px(p1)], fill=val, width=max(1, round(W / 1536)))

mask = np.asarray(layer).astype(np.float32) / 255 * a.alpha
mask = np.maximum(mask, np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((W // 2, H // 2)).resize((W, H))).astype(np.float32) / 255 * 0.6)
col = np.array([int(x) for x in a.color.split(',')], np.float32)
im = np.asarray(img).astype(np.float32)
out = im * (1 - mask[..., None]) + col * mask[..., None]
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(a.dst, quality=90)
print('painted brows into', a.dst)
