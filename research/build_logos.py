"""Build public/logos from Wikimedia artwork and write research/logos.md + research/logos_manifest.json.

    python3 research/build_logos.py            # everything
    python3 research/build_logos.py BUF NYJ    # only keys starting with these

Sources are fetched with logo_tools.py (originals cached in research/logos_src/, falling back to the
MediaWiki-rendered PNG of the same file when upload.wikimedia.org rate-limits us).  Nothing is drawn
by hand: we only rasterize, trim, de-fringe, split stacked wordmarks into their lines and save.
"""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo_tools import *
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'logos')
MAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logos_manifest.json')

NAMES = {'BUF': 'Buffalo Bills', 'MIA': 'Miami Dolphins', 'NE': 'New England Patriots', 'NYJ': 'New York Jets', 'BAL': 'Baltimore Ravens', 'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns', 'PIT': 'Pittsburgh Steelers', 'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAX': 'Jacksonville Jaguars', 'TEN': 'Tennessee Titans', 'DEN': 'Denver Broncos', 'KC': 'Kansas City Chiefs', 'LV': 'Las Vegas Raiders', 'LAC': 'Los Angeles Chargers', 'DAL': 'Dallas Cowboys', 'NYG': 'New York Giants', 'PHI': 'Philadelphia Eagles', 'WAS': 'Washington Commanders', 'CHI': 'Chicago Bears', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers', 'MIN': 'Minnesota Vikings', 'ATL': 'Atlanta Falcons', 'CAR': 'Carolina Panthers', 'NO': 'New Orleans Saints', 'TB': 'Tampa Bay Buccaneers', 'ARI': 'Arizona Cardinals', 'LAR': 'Los Angeles Rams', 'SF': 'San Francisco 49ers', 'SEA': 'Seattle Seahawks'}

# (key, wikimedia file, what it is, where it is worn, extra options)
JOBS = []
def J(key, title, what, worn, **o): JOBS.append((key, title, what, worn, o))

PRIM = {'DAL': 'Dallas Cowboys.svg', 'NYJ': 'New York Jets 2024.svg', 'TEN': 'Tennessee Titans Logo 2026.svg', 'LAR': 'LA Rams logo.svg'}
WORN_PRIM = {
 'BUF': 'helmet; sleeve (Nickel City alt); pants hip', 'MIA': 'helmet; sleeve', 'NE': 'helmet (Flying Elvis); sleeve', 'NYJ': 'helmet (via NYJ_word); chest (Rivalries)',
 'BAL': 'helmet; sleeve (shield patch)', 'CIN': 'helmet (B logo, Bengals wear tiger stripes instead); sleeve', 'CLE': 'helmet logo (orange helmet mark); sleeve',
 'PIT': 'helmet (steelmark inside ring); chest/sleeve', 'HOU': 'helmet; sleeve; pants hip', 'IND': 'helmet; sleeve', 'JAX': 'helmet; chest; sleeve', 'TEN': 'helmet; sleeve',
 'DEN': 'helmet; sleeve', 'KC': 'helmet; sleeve', 'LV': 'helmet; sleeve', 'LAC': 'helmet (bolt); sleeve', 'DAL': 'helmet; sleeve; pants', 'NYG': 'helmet; chest (ny); sleeve',
 'PHI': 'helmet; sleeve', 'WAS': 'helmet (W); sleeve', 'CHI': 'helmet (C); sleeve', 'DET': 'helmet; sleeve', 'GB': 'helmet (G); sleeve', 'MIN': 'helmet (Viking head, horn variant on helmet); sleeve',
 'ATL': 'helmet; sleeve', 'CAR': 'helmet; sleeve', 'NO': 'helmet (fleur-de-lis); sleeve; pants hip', 'TB': 'helmet (flag); sleeve', 'ARI': 'helmet; sleeve',
 'LAR': 'primary logo (LA monogram); sleeve / pants', 'SF': 'helmet (SF oval); sleeve', 'SEA': 'helmet; sleeve'}
for k, n in NAMES.items():
    J(k, PRIM.get(k, n + ' logo.svg'), 'primary logo', WORN_PRIM[k], primary=True)
J('NFL_shield', 'National Football League logo.svg', 'NFL shield (2008-present)', 'jersey V-neck collar, pants/sleeve', primary=True)
J('nike_swoosh', 'Logo NIKE.svg', 'Nike swoosh', 'jersey/pants (apparel mark)', primary=True)

# wordmarks (team-name lettering used on chest/collar, helmets and sleeves)
WORD = {'BUF': ('Buffalo Bills wordmark.svg', 'BILLS wordmark', 'chest above number (home/road)'),
 'MIA': ('Miami Dolphins wordmark.svg', 'MIAMI over "Dolphins" script', 'chest ("Dolphins" script), collar (MIAMI)'),
 'NE': ('New England Patriots wordmark.svg', 'PATRIOTS wordmark', 'chest, collar'),
 'NYJ': ('New York Jets 2024 (wordmark).svg', 'JETS italic wordmark with swoosh tail (2024)', 'helmet; chest (Rivalries)'),
 'BAL': ('Baltimore Ravens wordmark.svg', 'BALTIMORE / RAVENS wordmark', 'chest above number, collar'),
 'CIN': ('Cincinnati Bengals wordmark.svg', 'CINCINNATI / BENGALS wordmark', 'chest above number'),
 'CLE': ('Cleveland Browns wordmark.svg', 'CLEVELAND / BROWNS wordmark', 'chest above number'),
 'HOU': ('Houston Texans wordmark.svg', 'HOUSTON / TEXANS wordmark', 'chest above number'),
 'IND': ('Indianapolis Colts new wordmark.svg', 'COLTS wordmark (current)', 'chest / back collar'),
 'JAX': ('Jacksonville Jaguars wordmark.svg', 'JACKSONVILLE / JAGUARS wordmark', 'chest above number'),
 'TEN': ('Tennessee Titans wordmark.svg', 'TENNESSEE / TITANS wordmark', 'chest above number'),
 'DEN': ('Denver Broncos wordmark.svg', 'BRONCOS / DENVER wordmark', 'chest above number'),
 'KC': ('Kansas City Chiefs wordmark.svg', 'CHIEFS wordmark', 'chest above number'),
 'LV': ('Las Vegas Raiders wordmark.svg', 'RAIDERS wordmark', 'chest above number'),
 'LAC': ('Los Angeles Chargers wordmark.svg', 'LOS ANGELES / CHARGERS wordmark', 'chest above number'),
 'DAL': ('Cowboys wordmark.svg', 'COWBOYS wordmark', 'chest/sleeve (rare)'),
 'NYG': ('New York Giants wordmark.svg', 'GIANTS wordmark', 'chest above number (Giants wear it on the chest of alternates)'),
 'PHI': ('Philadelphia Eagles wordmark (2022–present).svg', 'EAGLES wordmark (2022-present)', 'chest above number'),
 'WAS': ('Washington Commanders wordmark.svg', 'WASHINGTON / COMMANDERS wordmark', 'chest above number'),
 'CHI': ('Chicago Bears wordmark.svg', 'BEARS wordmark', 'chest above number'),
 'DET': ('Detroit Lions wordmark.svg', 'LIONS wordmark', 'chest above number'),
 'GB': ('Green Bay Packers wordmark.svg', 'PACKERS wordmark', 'chest above number'),
 'MIN': ('Minnesota Vikings wordmark.svg', 'VIKINGS wordmark', 'chest above number'),
 'ATL': ('Atlanta Falcons wordmark.svg', 'ATLANTA / FALCONS wordmark', 'chest above number (2026 redesign)'),
 'CAR': ('Carolina Panthers wordmark.svg', 'CAROLINA / PANTHERS wordmark', 'chest above number'),
 'NO': ('New Orleans Saints wordmark.svg', 'SAINTS wordmark', 'chest above number'),
 'TB': ('Tampa Bay Buccaneers wordmark.svg', 'TAMPA BAY / BUCCANEERS wordmark', 'chest above number'),
 'ARI': ('Arizona Cardinals wordmark.svg', 'ARIZONA / CARDINALS wordmark', 'chest above number'),
 'LAR': ('Los Angeles Rams wordmark.svg', 'LOS ANGELES / Rams script wordmark', 'chest above number'),
 'SF': ('San Francisco 49ers wordmark.svg', '49ERS wordmark', 'chest above number'),
 'SEA': ('Seattle Seahawks wordmark.svg', 'SEATTLE / SEAHAWKS wordmark', 'chest above number'),
 'PIT': ('Pittsburgh Steelers Script.svg', 'Steelers bold wordmark', 'not worn on the 2026 jersey; helmet/sleeve alt use')}
for k, (t, what, worn) in WORD.items():
    J(k + '_word', t, what, worn)

# stacked wordmarks that are split into their lines (top, bottom)
SPLIT = {'BAL': ('city', 'name'), 'CIN': ('city', 'name'), 'CLE': ('city', 'name'), 'HOU': ('city', 'name'), 'JAX': ('city', 'name'), 'TEN': ('city', 'name'),
         'DEN': ('name', 'city'), 'LAC': ('city', 'name'), 'WAS': ('city', 'name'), 'ATL': ('city', 'name'), 'CAR': ('city', 'name'), 'TB': ('city', 'name'),
         'ARI': ('city', 'name'), 'SEA': ('city', 'name'), 'MIA': ('city', 'name')}

# extra / secondary marks
J('BUF_classic', 'Buffalo Bills classic logo.svg', 'classic standing buffalo (1962-73)', 'red throwback helmet')
J('NE_pat', 'New England Patriots logo old.svg', 'Pat Patriot (1961-92)', 'throwback helmet; sleeves of the red throwback')
J('NE_ne', 'New England Patriots NE logo.png', 'NE (with star) monogram', "Rivalries 'Nor'easter' sleeves", raster=True)
J('NYJ_word_plain', 'New York Jets wordmark.svg', 'JETS italic wordmark, plain', 'alt helmet / chest')
J('NYJ_1978', 'New York Jets logo (1978–1997).svg', 'JETS wordmark with swoosh (1978-97)', 'throwback helmet / chest')
J('CLE_elf', 'Brownie Elf logo.png', 'Brownie the Elf', 'throwback sleeve / alternate', raster=True)
J('KC_kc', 'Kansas City Chiefs KC logo.svg', 'KC monogram', 'sleeve / alternate')
J('CHI_bear', 'Chicago Bears logo primary.svg', 'Bear head', 'sleeve / alternate')
J('LAC_classic', 'Los Angeles Charges classic mark.svg', '1960 Los Angeles Chargers shield', 'throwback')
J('LAR_ram', 'NFL Rams logo.svg', 'ram head (2000-16)', 'throwback')
J('LAR_word_alt', 'LA Rams wordmark.svg', 'LOS ANGELES / RAMS block wordmark', 'chest / sleeve')
J('PHI_word_wing', 'Philadelphia Eagles wordmark.svg', 'winged EAGLES wordmark', 'chest')
J('PIT_steelmark', 'Steelmark logo.svg', 'Steelmark (ring w/ hypocycloids)', 'helmet right side', primary=False)
J('MIN_word_1982', 'Minnesota Vikings wordmark (1982 - 2003).svg', 'VIKINGS wordmark (1982-2003)', 'throwback')

LEGACY = {  # cut from the CC0 uniform sheets earlier; cleaned (specks, fringe) but not re-sourced
 'ATL_tb': ('ATL', '1966 black falcon (throwback)', 'throwback helmet / sleeve', 'Atlanta Falcons Uniforms 2026.png'),
 'BAL_dark': ('BAL', 'Darkness raven head', 'Darkness helmet', 'Baltimore Ravens Uniforms (2026).png'),
 'DEN_tb': ('DEN', 'classic D with bucking horse', 'throwback helmet / sleeve', 'Denver Broncos Uniforms 2024-Present.png'),
 'JAX_tb': ('JAX', '1995 Prowler jaguar', 'throwback helmet / sleeve', 'Jacksonville Jaguars Uniforms (2026).png'),
 'MIA_tb': ('MIA', '1966 throwback dolphin in sunburst', 'throwback helmet', 'Miami Dolphins Uniforms 2025.png'),
 'NYJ_classic': ('NYJ', 'classic JETS oval', 'throwback helmet', 'New York Jets Uniforms (2026).png'),
 'NYJ_plane': ('NYJ', 'Gotham diamond-plate JETS oval', 'Rivalries chest', 'New York Jets Uniforms (2026).png'),
 'PHI_tb': ('PHI', 'Kelly-green throwback eagle', 'throwback sleeve', 'Philadelphia Eagles Uniforms (2026).png'),
 'PIT_crest': ('PIT', '1933 crest', '1933 throwback chest', 'Pittsburgh Steelers Uniforms 2025.png'),
 'TB_tb': ('TB', 'Bucco Bruce (1976-96)', 'throwback helmet', 'Tampa Bay Buccaneers Uniforms (2026).png')}


def clean_specks(im, frac=0.004):
    from scipy import ndimage
    a = np.asarray(im).copy()
    lab, n = ndimage.label(a[..., 3] > 0, structure=np.ones((3, 3)))
    if n < 2: return im
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    for j, sz in enumerate(sizes, 1):
        if sz < frac * sizes.max(): a[lab == j] = 0
    return trim(Image.fromarray(a, 'RGBA'))


def clamp_alpha(im, lo=6):
    a = np.asarray(im).copy()
    a[a[..., 3] < lo] = 0
    return Image.fromarray(a, 'RGBA')


def split_lines(im, n=2, gap=2):
    a = np.asarray(im)[..., 3] > 20
    rows = a.any(axis=1)
    groups, start = [], None
    for y, r in enumerate(rows):
        if r and start is None: start = y
        if not r and start is not None: groups.append([start, y]); start = None
    if start is not None: groups.append([start, len(rows)])
    merged = []
    for g in groups:  # merge groups closer than `gap` rows
        if merged and g[0] - merged[-1][1] < gap: merged[-1][1] = g[1]
        else: merged.append(g)
    # drop full-width rules (e.g. the bars above/below WASHINGTON COMMANDERS)
    cov = a.sum(axis=1)
    merged = [g for g in merged if not (cov[g[0]:g[1]].min() > 0.97 * im.width)]
    if len(merged) != n: return None
    return [trim(im.crop((0, y0, im.width, y1))) for y0, y1 in merged]


def colours(im, k=4):
    a = np.asarray(im.resize((128, max(1, round(128 * im.height / im.width)))))
    px = a[a[..., 3] > 200][:, :3]
    if len(px) == 0: return ''
    q = (px // 24) * 24 + 12
    cnt = collections.Counter(map(tuple, q))
    out = []
    for c, n in cnt.most_common(12):
        if n < 0.04 * len(px): break
        if any(sum(abs(int(x) - int(y)) for x, y in zip(c, o)) < 90 for o in out): continue
        out.append(c)
        if len(out) == k: break
    return ' '.join('#%02X%02X%02X' % c for c in out)


def main(only):
    man = json.load(open(MAN)) if os.path.exists(MAN) else {}
    os.makedirs(OUT, exist_ok=True)
    rendered = {}
    miss = prefetch([j[1] for j in JOBS if not only or any(j[0].startswith(p) for p in only)])
    if miss: print('NOT FOUND on Wikimedia:', miss)
    for key, title, what, worn, o in JOBS:
        if only and not any(key.startswith(p) for p in only): continue
        dest = os.path.join(OUT, key + '.png')
        long = 1024
        inf = info(title)
        if o.get('primary') and inf and inf['w'] < inf['h']: long = round(1024 * inf['h'] / inf['w'])  # portrait marks: 1024 px wide like the old files
        im, i, how = art(title, long)
        if im is None:
            print('FAILED', key, title); man.setdefault(key, {})['status'] = 'FAILED ' + title; continue
        im = clamp_alpha(im)
        if os.path.exists(dest) and o.get('primary'):
            old = Image.open(dest)
            ra, rb = old.width / old.height, im.width / im.height
            if abs(ra - rb) / ra > 0.05:
                print('KEEP-OLD (aspect mismatch)', key, round(ra, 3), round(rb, 3), title)
                man[key] = dict(file=key + '.png', status='kept existing render (new source differs)', source_title=title)
                continue
        # raster sources are never upscaled past 2x
        if how == 'raster' and max(im.size) < 256: pass
        sz = save_png(im, dest)
        print('ok', key, im.size, how, sz // 1024, 'KB')
        rendered[key] = im
        man[key] = dict(file=key + '.png', what=what, worn=worn, size=list(im.size), render=how, source_title=title,
                        source_url=i['page'], license=i['license'], colors=colours(im), team=key.split('_')[0])
        if key.endswith('_word') and key.split('_')[0] in SPLIT:
            lines = split_lines(im)
            t = key.split('_')[0]
            if lines is None:
                print('   split failed', key); continue
            for nm, ln in zip(SPLIT[t], lines):
                k2 = f'{t}_word_{nm}'
                ln = clamp_alpha(ln)
                save_png(ln, os.path.join(OUT, k2 + '.png'))
                man[k2] = dict(file=k2 + '.png', what=f'{nm} line of the {t} wordmark', worn=worn, size=list(ln.size), render=how,
                               source_title=title, source_url=i['page'], license=i['license'], colors=colours(ln), team=t)
                print('   +', k2, ln.size)
    # legacy cut-outs: clean in place
    for key, (t, what, worn, sheet) in LEGACY.items():
        if only and not any(key.startswith(p) for p in only): continue
        dest = os.path.join(OUT, key + '.png')
        if not os.path.exists(dest): continue
        im = Image.open(dest).convert('RGBA')
        if not man.get(key, {}).get('cleaned'):
            im = clamp_alpha(defringe(clean_specks(im)))
            save_png(im, dest)
        pg = 'https://commons.wikimedia.org/wiki/File:' + sheet.replace(' ', '_')
        man[key] = dict(file=key + '.png', what=what, worn=worn, size=list(im.size), render='cut from uniform sheet', source_title=sheet,
                        source_url=pg, license='CC0 (uniform sheet); mark itself trademarked', colors=colours(im), team=t, cleaned=True)
    json.dump(man, open(MAN, 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main(sys.argv[1:])
