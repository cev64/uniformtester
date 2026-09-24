import hashlib, os, sys, time, urllib.parse, urllib.request
UA = "UniformLab/1.0 (https://github.com/cev64/uniformtester; charlievonderheid@gmail.com)"
UNIFORMS = {
 'BUF':'Buffalo Bills Uniforms 2026.png','MIA':'Miami Dolphins Uniforms 2025.png','NE':'New England Patriots Uniforms 2025.png',
 'NYJ':'New York Jets Uniforms (2026).png','BAL':'Baltimore Ravens Uniforms (2026).png','CIN':'Cincinnati Bengals Uniforms (2024).png',
 'CLE':'Cleveland Browns Uniforms 2025.png','PIT':'Pittsburgh Steelers Uniforms 2025.png','HOU':'Houston Texans Uniforms (2026).png',
 'IND':'Indianapolis Colts Uniforms (2026).png','JAX':'Jacksonville Jaguars Uniforms (2026).png','TEN':'Tennessee Titans Uniforms (2026).png',
 'DEN':'Denver Broncos Uniforms 2024-Present.png','KC':'Kansas City Chiefs Uniforms 2025.png','LV':'Las Vegas Raiders Uniforms (2016).png',
 'LAC':'Los Angeles Chargers Uniforms 2025.png','DAL':'Dallas Cowboys Uniforms 2022.png','NYG':'New York Giants Uniforms 2022-Present.png',
 'PHI':'Philadelphia Eagles Uniforms (2026).png','WAS':'Washington Commanders Uniforms (2026).png','CHI':'Chicago Bears Uniforms ((2026)).png',
 'DET':'Detroit Lions Uniforms (2026).png','GB':'Green Bay Packers Uniforms -2026.png','MIN':'Minnesota Vikings Uniforms (2026).png',
 'ATL':'Atlanta Falcons Uniforms 2026.png','CAR':'Carolina Panthers Uniforms (2022).png','NO':'New Orleans Saints Uniforms (2025).png',
 'TB':'Tampa Bay Buccaneers Uniforms (2026).png','ARI':'Arizona Cardinals Uniforms 2025.png','LAR':'Los Angeles Rams Uniforms (2026).png',
 'SF':'San Francisco 49ers Uniforms 2025.png','SEA':'Seattle Seahawks Uniforms 2025.png'}
NAMES = {'BUF':'Buffalo Bills','MIA':'Miami Dolphins','NE':'New England Patriots','NYJ':'New York Jets','BAL':'Baltimore Ravens','CIN':'Cincinnati Bengals','CLE':'Cleveland Browns','PIT':'Pittsburgh Steelers','HOU':'Houston Texans','IND':'Indianapolis Colts','JAX':'Jacksonville Jaguars','TEN':'Tennessee Titans','DEN':'Denver Broncos','KC':'Kansas City Chiefs','LV':'Las Vegas Raiders','LAC':'Los Angeles Chargers','DAL':'Dallas Cowboys','NYG':'New York Giants','PHI':'Philadelphia Eagles','WAS':'Washington Commanders','CHI':'Chicago Bears','DET':'Detroit Lions','GB':'Green Bay Packers','MIN':'Minnesota Vikings','ATL':'Atlanta Falcons','CAR':'Carolina Panthers','NO':'New Orleans Saints','TB':'Tampa Bay Buccaneers','ARI':'Arizona Cardinals','LAR':'Los Angeles Rams','SF':'San Francisco 49ers','SEA':'Seattle Seahawks'}
LOGOS = {k: f'{v} logo.svg' for k, v in NAMES.items()}
LOGOS.update({'DAL': 'Dallas Cowboys.svg', 'NYJ': 'New York Jets 2024.svg', 'TEN': 'Tennessee Titans Logo 2026.svg'})
EXTRA = {'NFL_shield': 'National Football League logo.svg', 'nike_swoosh': 'Logo NIKE.svg'}

def try_get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        r = urllib.request.urlopen(req, timeout=60)
        data = r.read()
        if data[:4] == b'\x89PNG' or data[:3] == b'\xff\xd8\xff': return data
    except Exception as e:
        return None
    return None

def fetch(fname, out, width):
    if os.path.exists(out) and os.path.getsize(out) > 1000: return 'cached'
    u = fname.replace(' ', '_')
    h = hashlib.md5(u.encode()).hexdigest()
    q = urllib.parse.quote(u)
    cands = [
        f'https://commons.wikimedia.org/w/thumb.php?f={q}&w={width}',
        f'https://en.wikipedia.org/w/thumb.php?f={q}&w={width}',
        f'https://i0.wp.com/upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}',
        f'https://i0.wp.com/upload.wikimedia.org/wikipedia/en/{h[0]}/{h[:2]}/{q}',
    ]
    if fname.endswith('.svg'):
        cands = cands[:2] + [f'https://i0.wp.com/upload.wikimedia.org/wikipedia/{s}/thumb/{h[0]}/{h[:2]}/{q}/{width}px-{q}.png' for s in ('commons', 'en')]
    for attempt in range(4):
        for c in cands:
            d = try_get(c)
            if d:
                open(out, 'wb').write(d); return c.split('/')[2]
            time.sleep(2)
        time.sleep(30)
    return 'FAILED'

jobs = [(k, f, f'uniforms/{k}.png', 1500) for k, f in UNIFORMS.items()]
jobs += [(k, f, f'logos/{k}.png', 1024) for k, f in LOGOS.items()]
jobs += [(k, f, f'logos/{k}.png', 1024) for k, f in EXTRA.items()]
for k, f, out, w in jobs:
    print(k, f, fetch(f, out, w), flush=True)
    time.sleep(3)
