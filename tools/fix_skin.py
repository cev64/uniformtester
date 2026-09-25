"""
Evens out the MakeHuman skin photo textures for the player model.

The source photos carry baked lighting: light blotches on the arms and a
tone step between the head and body islands that shows as a seam at the back
of the neck. This removes the large-scale tone variation on the body
(keeping pores and fine detail), matches the head island to the body, and
fills the flat background between islands with skin so edge UVs don't pick
up a different colour.

  python3 tools/fix_skin.py in.jpg out.jpg
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert('RGB')
im = np.asarray(img).astype(np.float32)
H, W, _ = im.shape

# flat background between the UV islands
bgc = im[5, 5].copy()
dist = np.abs(im - bgc).sum(-1)
g = img.convert('L')
var = np.asarray(g.filter(ImageFilter.MaxFilter(5))).astype(int) - np.asarray(g.filter(ImageFilter.MinFilter(5))).astype(int)
bg = (dist < 9) & (var < 5)
skin = ~bg

yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
face = (xx > 0.63) & (yy > 0.17) & (yy < 0.86)        # head island (face + scalp)
extremities = (yy > 0.8) & (xx < 0.8)                  # hands, feet, small parts
body = skin & ~face & ~extremities


def box(a, r, axis):
    c = np.cumsum(np.pad(a, [(r + 1, r) if k == axis else (0, 0) for k in range(a.ndim)], mode='edge'), axis=axis)
    hi = np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return (hi - lo) / (2 * r + 1)


def blur(a, r):
    for _ in range(3):
        a = box(box(a, r, 0), r, 1)
    return a


def masked_blur(values, mask, radius):
    m = mask.astype(np.float32)
    return blur(values * m[..., None], radius) / np.maximum(blur(m, radius), 1e-4)[..., None]


target = np.median(im[body], axis=0)
low = masked_blur(im, body, 16)
out = im.copy()
# body: keep detail, replace the low-frequency tone with the median skin tone
flat = im / np.maximum(low, 1) * target
out[body] = flat[body]
# head island: shift its average toward the body tone (keeps facial shading)
fm = face & skin & (im.mean(-1) > im[face & skin].mean(-1).mean() * 0.8)   # skip hair
if fm.any():
    out[face & skin] = im[face & skin] * (target / np.median(im[fm], axis=0)) ** 0.7

# fill the background from the nearest skin (grow outward), then soften it
known = skin.copy()
fill = out.copy(); fill[~known] = 0
acc = known.astype(np.float32)
for _ in range(600):
    if acc.min() > 0:
        break
    s = np.zeros_like(fill); n = np.zeros_like(acc)
    for dy, dx in ((0, 3), (0, -3), (3, 0), (-3, 0)):
        s += np.roll(np.roll(fill * acc[..., None], dy, 0), dx, 1)
        n += np.roll(np.roll(acc, dy, 0), dx, 1)
    grow = (acc == 0) & (n > 0)
    fill[grow] = s[grow] / n[grow][:, None]
    acc[grow] = 1
fill[acc == 0] = target
soft = np.asarray(Image.fromarray(fill.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
out = np.where(known[..., None], out, soft)
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(dst, quality=90)
print('target skin', target.round(), 'background px', int(bg.sum()))
