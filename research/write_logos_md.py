"""Generate research/logos.md from logos_manifest.json (+ the files on disk)."""
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
man = json.load(open(os.path.join(HERE, 'logos_manifest.json')))
D = os.path.join(HERE, '..', 'public', 'logos')
files = sorted(f[:-4] for f in os.listdir(D) if f.endswith('.png'))
NAMES = {'BUF': 'Bills', 'MIA': 'Dolphins', 'NE': 'Patriots', 'NYJ': 'Jets', 'BAL': 'Ravens', 'CIN': 'Bengals', 'CLE': 'Browns', 'PIT': 'Steelers', 'HOU': 'Texans', 'IND': 'Colts', 'JAX': 'Jaguars', 'TEN': 'Titans', 'DEN': 'Broncos', 'KC': 'Chiefs', 'LV': 'Raiders', 'LAC': 'Chargers', 'DAL': 'Cowboys', 'NYG': 'Giants', 'PHI': 'Eagles', 'WAS': 'Commanders', 'CHI': 'Bears', 'DET': 'Lions', 'GB': 'Packers', 'MIN': 'Vikings', 'ATL': 'Falcons', 'CAR': 'Panthers', 'NO': 'Saints', 'TB': 'Buccaneers', 'ARI': 'Cardinals', 'LAR': 'Rams', 'SF': '49ers', 'SEA': 'Seahawks'}

def short(u): return u.replace('https://en.wikipedia.org/wiki/', 'en:').replace('https://commons.wikimedia.org/wiki/', 'commons:')

rows = []
for f in files:
    m = man.get(f, {})
    team = f.split('_')[0]
    team = NAMES.get(team, 'NFL / Nike' if f in ('NFL_shield', 'nike_swoosh') else team)
    im = Image.open(os.path.join(D, f + '.png'))
    rows.append((f, team, m.get('what', '(existing file, source not re-verified)'), m.get('worn', ''), m.get('source_url', ''), m.get('license', ''), m.get('colors', ''), f'{im.width}x{im.height}', m.get('render', '')))
order = {n: i for i, n in enumerate(NAMES.values())}
rows.sort(key=lambda r: (order.get(r[1], 99), r[0]))

out = ['# Logo and wordmark library (`public/logos`)', '',
 'Every file is sourced artwork from Wikimedia (en.wikipedia.org / commons.wikimedia.org), cleaned and rasterized, never redrawn:',
 'SVG originals are rendered with resvg (straight alpha, no matte), trimmed to the artwork bounds, edge pixels are colour-bled from the nearest',
 'solid pixel (no dark/white halos, checked on dark and light backgrounds) and saved as PNG (long side ~1024 px).',
 'Where upload.wikimedia.org rate-limited the download of the original SVG, the MediaWiki-rendered PNG of the same SVG (`thumb.php`) was used (column "render").',
 'Stacked wordmarks (e.g. CINCINNATI / BENGALS) are also provided split into `_word_city` and `_word_name` lines (cropped from the same artwork).',
 'The app loads `public/logos/<KEY>.png`; `KEY@#hex` tints a mark one colour at runtime (use it on one-colour wordmarks).', '',
 '## Licensing', '',
 '- `Public domain [trademarked]` = Commons/Wikipedia tag PD-textlogo (below the threshold of originality). The marks remain trademarks of the NFL and its clubs.',
 '- `Fair use (non-free)` = the logo is hosted on en.wikipedia under a non-free-use rationale (not freely licensed). Used here for a non-commercial, educational uniform viewer.',
 '- `CC BY-SA 4.0` / `CC0` = freely licensed files (attribution/share-alike applies for BY-SA).',
 '- Marks cut from the Wikipedia/Commons NFL uniform sheets (CC0 sheets) are labelled `cut from uniform sheet`.', '',
 '## Files', '',
 '| file | team | mark | worn on | size | render | source | license | main colours |', '|---|---|---|---|---|---|---|---|---|']
for r in rows:
    f, team, what, worn, src, lic, col, sz, rend = r
    out.append(f'| `{f}.png` | {team} | {what} | {worn} | {sz} | {rend} | {short(src) if src else ""} | {lic} | {col} |')
open(os.path.join(HERE, 'logos.md'), 'w').write('\n'.join(out) + '\n')
print(len(rows), 'rows')
