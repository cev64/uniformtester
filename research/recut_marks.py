"""Re-cut throwback marks from the Commons uniform sheets at the sheets' native resolution.

    python3 research/recut_marks.py            # every mark in RECUT
    python3 research/recut_marks.py PHI_tb     # only these keys

The first cut-outs (see LEGACY in build_logos.py) were taken from downscaled copies of the sheets
or lost detail to the background removal (the PHI eagle lost its outlines and football, the D and
the falcon kept a fringe of the helmet colour). This takes the same mark from the full-size sheet
(fetched with thumb.php at the original width, cached in logos_src/sheets/, not committed):
crop the box, remove the background colour flood-filled from the crop border, optionally strip a
garment edge that clips the mark, then the library's usual clean-up (specks, defringe, trim).
Nothing is drawn. Afterwards run build_logos.py <keys> and write_logos_md.py to refresh the docs.
"""
import os, sys, time, urllib.parse
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo_tools import _req, defringe, trim, save_png, SRC
import build_logos as B

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'logos')

# key: (sheet file, original width, box x0 y0 x1 y1 on the full-size sheet, colour tolerance, right-edge strip px)
RECUT = {
    'PHI_tb': ('Philadelphia Eagles Uniforms (2026).png', 6477, (6158, 1112, 6303, 1270), 70, 14),
    'DEN_tb': ('Denver Broncos Uniforms 2024-Present.png', 3464, (3005, 72, 3134, 207), 150, 0),
    'ATL_tb': ('Atlanta Falcons Uniforms 2026.png', 3464, (2831, 96, 2975, 288), 130, 0),
    'TB_tb': ('Tampa Bay Buccaneers Uniforms (2026).png', 6263, (5405, 63, 5696, 369), 60, 0),
}


def sheet(title, width):
    d = os.path.join(SRC, 'sheets'); os.makedirs(d, exist_ok=True)
    q = urllib.parse.quote(title.replace(' ', '_'))
    p = os.path.join(d, q)
    if not os.path.exists(p):
        data = _req(f'https://commons.wikimedia.org/w/thumb.php?f={q}&w={width}', binary=True)
        open(p, 'wb').write(data)
        time.sleep(1)
    im = Image.open(p).convert('RGBA')
    assert im.width == width, (title, im.size)
    return im


def recut(im, box, tol, strip, margin=3):
    x0, y0, x1, y1 = box
    a = np.asarray(im.crop((x0 - margin, y0 - margin, x1 + margin, y1 + margin))).astype(np.float32)
    rgb = a[..., :3]
    # background = the most common border colour; remove what is near it and connected to the border
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(int) // 8
    vals, cnt = np.unique(border[:, 0] * 10000 + border[:, 1] * 100 + border[:, 2], return_counts=True)
    v = vals[cnt.argmax()]
    bg = np.array([v // 10000, (v // 100) % 100, v % 100]) * 8 + 4
    lab, _ = ndimage.label(np.sqrt(((rgb - bg) ** 2).sum(-1)) < tol)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = np.isin(lab, list(edge))
    if strip:  # a mark clipped by a sleeve edge: drop the dark border line beyond it, row by row
        dark = rgb.sum(-1) < 200
        for y in range(bgm.shape[0]):
            x = bgm.shape[1] - 1
            while x > bgm.shape[1] - 1 - strip and (bgm[y, x] or dark[y, x]):
                bgm[y, x] = True
                x -= 1
    a[..., 3] = np.where(bgm, 0, a[..., 3])
    out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    return trim(B.clamp_alpha(defringe(B.clean_specks(trim(out), 0.08))))


def main(only):
    for key, (title, width, box, tol, strip) in RECUT.items():
        if only and key not in only: continue
        im = recut(sheet(title, width), box, tol, strip)
        save_png(im, os.path.join(OUT, key + '.png'))
        print(key, im.size, B.colours(im))


if __name__ == '__main__':
    main(sys.argv[1:])
