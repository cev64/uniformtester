"""
Packs the site into one self-contained HTML page (models and logos embedded
as data URLs) for sharing as a single file.

Run after `npm run build:single`:
  python3 tools/build_preview.py --player /tmp/uniformlab-model/player_q.glb \
      --helmet /tmp/uniformlab-model/helmet_q.glb --out preview.html
The models passed here should be quantized (not meshopt), so no WebAssembly
decoder is needed.
"""
import argparse, base64, io, json, os, re
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--player', required=True)
ap.add_argument('--helmet', required=True)
ap.add_argument('--html', default='dist-single/index.html')
ap.add_argument('--out', required=True)
ap.add_argument('--fragment', action='store_true', help='emit body content only (no html/head/body tags)')
a = ap.parse_args()

def data(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

assets = {
    'public/models/player.glb': data(a.player, 'model/gltf-binary'),
    'public/models/helmet.glb': data(a.helmet, 'model/gltf-binary'),
    'public/models/player.json': data('public/models/player.json', 'application/json'),
    'public/models/helmet_detail.png': data('public/models/helmet_detail.png', 'image/png'),
}
for f in sorted(os.listdir('public/logos')):
    im = Image.open(os.path.join('public/logos', f)).convert('RGBA')
    im.thumbnail((440, 440))
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    assets[f'public/logos/{f}'] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

html = open(a.html).read()
inject = '<script>window.__UL_ASSETS=' + json.dumps(assets) + ';</script>'
if a.fragment:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>|<meta name="viewport"[^>]*>', '', head)
    scripts = re.findall(r'<script type="module"[^>]*>.*?</script>', head, re.S)
    for sc in scripts:
        head = head.replace(sc, '')
    head = re.sub(r'<script type="importmap">.*?</script>', '', head, flags=re.S)
    body = re.sub(r'<script type="importmap">.*?</script>', '', body, flags=re.S)
    title = re.search(r'<title>.*?</title>', head).group(0)
    head = head.replace(title, '')
    out = title + '\n' + head.strip() + '\n' + body.strip() + '\n' + inject + '\n' + '\n'.join(scripts) + '\n'
else:
    out = html.replace('<script type="module"', inject + '\n<script type="module"', 1)
open(a.out, 'w').write(out)
print('wrote', a.out, round(len(out) / 1e6, 2), 'MB')
