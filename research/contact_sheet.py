"""Contact sheet of public/logos on dark + light backgrounds.
   python3 research/contact_sheet.py OUT.png [glob-prefix ...]"""
import sys, glob, os
from PIL import Image, ImageDraw
out = sys.argv[1]
pref = sys.argv[2:] or ['']
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'logos')
files = sorted(f for f in glob.glob(D + '/*.png') if any(os.path.basename(f).startswith(p) for p in pref))
CELL, COLS = 150, 8
rows = (len(files) + COLS - 1) // COLS
W = CELL * COLS
sheet = Image.new('RGB', (W * 2, CELL * rows), 'white')
d = ImageDraw.Draw(sheet)
for half, bg in enumerate([(24, 26, 30), (240, 240, 236)]):
    d.rectangle([half * W, 0, half * W + W, CELL * rows], fill=bg)
    for n, f in enumerate(files):
        im = Image.open(f).convert('RGBA')
        im.thumbnail((CELL - 22, CELL - 30), Image.LANCZOS)
        x, y = half * W + (n % COLS) * CELL, (n // COLS) * CELL
        sheet.paste(im, (x + (CELL - im.width) // 2, y + 4 + (CELL - 30 - im.height) // 2), im)
        d.text((x + 3, y + CELL - 24), os.path.basename(f)[:-4], fill=(150, 150, 150) if half == 0 else (90, 90, 90))
sheet.save(out)
print(len(files), sheet.size)
