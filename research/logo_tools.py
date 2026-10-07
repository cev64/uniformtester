"""Helpers for building public/logos from Wikimedia files.

  python3 research/logo_tools.py search "Buffalo Bills wordmark"
  python3 research/logo_tools.py info "File:Buffalo Bills logo.svg"

`info`/`search` query both en.wikipedia.org and commons.wikimedia.org (the
NFL marks are mostly non-free uploads on en.wikipedia; a few are PD-textlogo
on Commons).  `get()` downloads the ORIGINAL file (usually SVG) from
upload.wikimedia.org and caches it under research/logos_src/.
"""
import json, os, sys, time, urllib.parse, urllib.request

UA = "UniformLab/1.0 (charlievonderheid@gmail.com)"
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'logos_src')
WIKIS = {'en': 'https://en.wikipedia.org/w/api.php', 'commons': 'https://commons.wikimedia.org/w/api.php'}


_BLOCKED = {}  # upload host -> time until which we skip it (it answers 429, retry-after 600)


def _req(url, binary=False, tries=5):
    host = url.split('/')[2]
    up = host.startswith('upload')
    if up and _BLOCKED.get(host, 0) > time.time():
        raise RuntimeError('blocked ' + url)
    err = None
    for i in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60)
            d = r.read()
            return d if binary else json.loads(d)
        except Exception as e:  # 429 etc.
            err = e
            if up and getattr(e, 'code', 0) == 429:
                _BLOCKED[host] = time.time() + 90
                break
            time.sleep(4 * (i + 1))
    raise RuntimeError(f'failed {url}: {err}')


def api(wiki, **params):
    params['format'] = 'json'
    return _req(WIKIS[wiki] + '?' + urllib.parse.urlencode(params))


def search(q, wiki, limit=20):
    r = api(wiki, action='query', list='search', srsearch=q, srnamespace=6, srlimit=limit)
    return [h['title'] for h in r['query']['search']]


_CACHE = os.path.join(SRC, '_info.json')


def info(title, wiki=None):
    """-> dict(url, page, license, wiki, w, h) or None.  Tries en then commons.  Cached on disk."""
    if not title.startswith('File:'): title = 'File:' + title
    os.makedirs(SRC, exist_ok=True)
    try: cache = json.load(open(_CACHE))
    except Exception: cache = {}
    if title not in cache:
        v = _info(title, wiki)
        if v is None: return None
        cache[title] = v
        json.dump(cache, open(_CACHE, 'w'), indent=1, sort_keys=True)
    return cache[title]


def prefetch(titles):
    """Fill the info cache for many titles with a few batched API calls (40 per call)."""
    os.makedirs(SRC, exist_ok=True)
    try: cache = json.load(open(_CACHE))
    except Exception: cache = {}
    todo = [('File:' + t if not t.startswith('File:') else t) for t in titles]
    todo = [t for t in dict.fromkeys(todo) if cache.get(t) is None]
    for w in ('en', 'commons'):
        for k in range(0, len(todo), 40):
            chunk = todo[k:k + 40]
            r = api(w, action='query', titles='|'.join(chunk), prop='imageinfo', iiprop='url|size|extmetadata|mime', iilimit=1)
            norm = {n['to']: n['from'] for n in r['query'].get('normalized', [])}
            for p in r['query']['pages'].values():
                ii = p.get('imageinfo')
                t = norm.get(p['title'], p['title'])
                if not ii or 'url' not in ii[0] or 'width' not in ii[0]: continue
                ii = ii[0]
                md = ii.get('extmetadata', {})
                lic = md.get('LicenseShortName', {}).get('value', '')
                rest = md.get('Restrictions', {}).get('value', '')
                nf = md.get('NonFree', {}).get('value', '')
                cache[t] = dict(title=t, url=ii['url'], page=ii['descriptionurl'], wiki=w, w=ii['width'], h=ii['height'],
                                mime=ii['mime'], license=lic + (' (non-free)' if nf else '') + (f' [{rest}]' if rest else ''))
            time.sleep(1)
        todo = [t for t in todo if cache.get(t) is None]
    json.dump(cache, open(_CACHE, 'w'), indent=1, sort_keys=True)
    return todo  # titles that could not be found


def _info(title, wiki=None):
    time.sleep(0.4)
    for w in ([wiki] if wiki else ['en', 'commons']):
        r = api(w, action='query', titles=title, prop='imageinfo', iiprop='url|size|extmetadata|mime')
        for p in r['query']['pages'].values():
            ii = p.get('imageinfo')
            if not ii: continue
            ii = ii[0]
            md = ii.get('extmetadata', {})
            lic = md.get('LicenseShortName', {}).get('value', '')
            rest = md.get('Restrictions', {}).get('value', '')
            nf = md.get('NonFree', {}).get('value', '')
            return dict(title=title, url=ii['url'], page=ii['descriptionurl'], wiki=w, w=ii['width'], h=ii['height'],
                        mime=ii['mime'], license=lic + (' (non-free)' if nf else '') + (f' [{rest}]' if rest else ''))
    return None


def get(title, wiki=None):
    """Download the ORIGINAL file; returns (local_path, info).  If upload.wikimedia.org
    rate-limits us (HTTP 429, retry-after 600 s) path is None and info is still returned."""
    i = info(title, wiki)
    if not i: return None, None
    os.makedirs(SRC, exist_ok=True)
    fn = os.path.join(SRC, i['url'].split('?')[0].rsplit('/', 1)[1])
    if not os.path.exists(fn):
        if os.environ.get('LOGO_THUMBS'): return None, i  # skip slow, rate-limited original downloads
        try:
            data = _req(i['url'], binary=True, tries=2)
        except RuntimeError:
            return None, i
        open(fn, 'wb').write(data)
        time.sleep(0.5)
    return fn, i


def thumb(title, i, long=1024):
    """Fallback when the original can't be fetched: MediaWiki-rendered PNG (thumb.php) of the file,
    long side == `long` for SVGs (never upscaled for rasters).  Cached in logos_src/thumbs."""
    from PIL import Image
    import io
    w, h = i['w'], i['h']
    if i['mime'] == 'image/svg+xml':
        tw = long if w >= h else round(long * w / h)
    else:
        tw = w
    q = urllib.parse.quote(title.replace('File:', '').replace(' ', '_'))
    cdir = os.path.join(SRC, 'thumbs'); os.makedirs(cdir, exist_ok=True)
    cf = os.path.join(cdir, f'{tw}_{q}.png')
    if os.path.exists(cf):
        return defringe(trim(Image.open(cf).convert('RGBA')))
    for host in ('commons.wikimedia.org', 'en.wikipedia.org'):
        try:
            d = _req(f'https://{host}/w/thumb.php?f={q}&w={tw}', binary=True, tries=2)
            if d[:4] == b'\x89PNG':
                open(cf, 'wb').write(d)
                time.sleep(0.5)
                return defringe(trim(Image.open(io.BytesIO(d)).convert('RGBA')))
        except RuntimeError:
            pass
    return None


def art(title, long=1024, wiki=None):
    """Best available raster for a Wikimedia file: (RGBA image, info, how)."""
    from PIL import Image
    p, i = get(title, wiki)
    if i is None: return None, None, None
    if p and p.endswith('.svg'):
        im = render_svg(p, long)
        if im is not None: return im, i, 'svg'
        p = None
    if p: return defringe(trim(Image.open(p).convert('RGBA'))), i, 'raster'
    im = thumb(title, i, long)
    if im is not None: return im, i, 'thumb.php'
    return None, i, None


def render_svg(path, long=1024):
    """SVG -> trimmed, de-fringed RGBA PIL image whose long side is `long` px.
    resvg gives straight (un-premultiplied) alpha, so edges carry no matte colour.
    Falls back to cairosvg when resvg rejects the file; returns None if both fail."""
    import io
    from PIL import Image
    try:
        import resvg_py
        im = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=path))))
        z = long / max(im.size)
        im = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=path, zoom=z)))).convert('RGBA')
    except Exception:
        try:
            import cairosvg
            d = cairosvg.svg2png(url=path)
            im = Image.open(io.BytesIO(d))
            if im.width >= im.height: d = cairosvg.svg2png(url=path, output_width=long)
            else: d = cairosvg.svg2png(url=path, output_height=long)
            im = Image.open(io.BytesIO(d)).convert('RGBA')
        except Exception:
            return None
    return defringe(trim(im))


def defringe(im, solid=250):
    """Replace the RGB of semi-transparent edge pixels by the colour of the nearest solid pixel
    (removes dark/white mattes); alpha is untouched."""
    import numpy as np
    from scipy import ndimage
    a = np.asarray(im).copy()
    solid_m = a[..., 3] >= solid
    if not solid_m.any() or solid_m.all(): return im
    idx = ndimage.distance_transform_edt(~solid_m, return_distances=False, return_indices=True)
    nearest = a[idx[0], idx[1], :3]
    edge = (~solid_m) & (a[..., 3] > 0)
    a[edge, :3] = nearest[edge]
    from PIL import Image
    return Image.fromarray(a, 'RGBA')


def trim(im, pad=0, thresh=8):
    """Crop to the bounding box of pixels with alpha > thresh."""
    from PIL import Image
    a = im.getchannel('A').point(lambda v: 255 if v > thresh else 0)
    bb = a.getbbox()
    if not bb: return im
    im = im.crop(bb)
    if pad:
        out = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
        out.paste(im, (pad, pad)); im = out
    return im


def save_png(im, out, limit=400 * 1024):
    """Save RGBA; if over the size budget fall back to an 8-bit palette (with alpha)."""
    from PIL import Image
    im.save(out, optimize=True)
    if os.path.getsize(out) > limit:
        q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        q.save(out, optimize=True)
        print('   palette-quantised', os.path.basename(out))
    return os.path.getsize(out)


if __name__ == '__main__':
    cmd, arg = sys.argv[1], ' '.join(sys.argv[2:])
    if cmd == 'search':
        for w in WIKIS:
            for t in search(arg, w): print(w, t)
    elif cmd == 'info':
        print(json.dumps(info(arg), indent=1))
