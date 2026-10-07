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
        cache[title] = _info(title, wiki)
        json.dump(cache, open(_CACHE, 'w'), indent=1, sort_keys=True)
    return cache[title]


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
        try:
            data = _req(i['url'], binary=True, tries=2)
        except RuntimeError:
            return None, i
        open(fn, 'wb').write(data)
        time.sleep(0.5)
    return fn, i


def thumb(title, i, long=1024):
    """Fallback: MediaWiki-rendered PNG of an SVG (thumb.php) with the long side == `long`."""
    from PIL import Image
    import io
    w = long if i['w'] >= i['h'] else round(long * i['w'] / i['h'])
    q = urllib.parse.quote(title.replace('File:', '').replace(' ', '_'))
    for host in ('commons.wikimedia.org', 'en.wikipedia.org'):
        try:
            d = _req(f'https://{host}/w/thumb.php?f={q}&w={w}', binary=True, tries=2)
            if d[:4] == b'\x89PNG':
                time.sleep(0.5)
                return trim(Image.open(io.BytesIO(d)).convert('RGBA'))
        except RuntimeError:
            pass
    return None


def art(title, long=1024, wiki=None):
    """Best available raster for a Wikimedia file: (RGBA image, info, how)."""
    from PIL import Image
    p, i = get(title, wiki)
    if i is None: return None, None, None
    if p and p.endswith('.svg'): return render_svg(p, long), i, 'svg'
    if p: return trim(Image.open(p).convert('RGBA')), i, 'raster'
    if i['mime'] == 'image/svg+xml':
        im = thumb(title, i, long)
        if im: return im, i, 'thumb.php'
    return None, i, None


def render_svg(path, long=1024, tint=None):
    """SVG -> trimmed RGBA PIL image whose long side is `long` px (resvg: straight alpha, no matte)."""
    import io
    import resvg_py
    from PIL import Image
    im = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=path))))
    w, h = im.size
    z = long / max(w, h)
    im = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_path=path, zoom=z)))).convert('RGBA')
    return trim(im)


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
