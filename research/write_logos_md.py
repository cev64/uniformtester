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
 '- Marks cut from the Commons NFL uniform sheets are labelled `cut from uniform sheet` (or `recut from full-size uniform sheet`). The sheets are CC BY 4.0 or CC BY-SA 4.0 (credit the sheet\'s Commons page; an earlier version of this file called them CC0), and the marks on them remain trademarks.', '',
 '## Files', '',
 '| file | team | mark | worn on | size | render | source | license | main colours |', '|---|---|---|---|---|---|---|---|---|']
for r in rows:
    f, team, what, worn, src, lic, col, sz, rend = r
    out.append(f'| `{f}.png` | {team} | {what} | {worn} | {sz} | {rend} | {short(src) if src else ""} | {lic} | {col} |')
out += ['', '## Notes on specific files', '',
 '- `<TEAM>_word` is the club\'s official wordmark (Wikimedia `<Team> wordmark.svg`, PD-textlogo). For stacked wordmarks `<TEAM>_word_city` / `_word_name` are the two lines cropped from the same artwork (e.g. `CIN_word_name` = BENGALS, `ARI_word_city` = ARIZONA). `TEN_word` and `TB_word` could not be split: the small top line touches the tall letters of the second line.',
 '- Wordmarks are drawn in the club colours (some two-tone: Ravens black + gold outline, Dolphins aqua + orange, Chargers navy + gold underline). For one-colour use the runtime tint `KEY@#hex`.',
 '- `LAR` is the current Rams primary (LA monogram); `LAR_ram` is the 2000-2016 ram head; the 2026 horn mark has no clean Wikimedia source (see below).',
 '- `NE_pat` replaces the old sheet crop with the SVG of the same Pat Patriot mark; `NYJ_word` replaces the old file with the SVG render of the same wordmark (`NYJ_word_plain` is the plainer JETS lettering, `NYJ_1978` the 1978-97 JETS mark).',
 '- `NE_ne` and `CLE_elf` are raster-only sources (496x362 and 147x168 px, never upscaled): the elf is soft when drawn large.',
 '- Low-res legacy crops (`*_tb`, `BAL_dark`, `NYJ_classic`, `NYJ_plane`, `PIT_crest`) come from the Commons uniform sheets (100-300 px); they were cleaned (stray fragments of neighbouring marks removed, edge colours bled from solid pixels) but cannot be sharper than the sheet.',
 '- `PHI_tb`, `DEN_tb`, `ATL_tb` and `TB_tb` were re-cut from the full-size sheets with `research/recut_marks.py` (Oct 2026): `TB_tb` had been cut from a downscaled copy (now 285x303, was 176x186); `PHI_tb` had lost its black outlines and the football to the background removal (the sleeve edge clips the eagle on the sheet itself); `DEN_tb` and `ATL_tb` lose the blue/red helmet-colour fringe. `JAX_tb`, `MIA_tb`, `NYJ_classic` and `PIT_crest` are already at the sheet\'s native resolution and a re-cut was no better. Searched again: Commons/en.wikipedia have no standalone file of any of these marks (only the Pittsburgh city arms, a different drawing from the Steelers crest, and unrelated JETS wordmarks).',
 '', '## Not found (no clean Wikimedia source)', '',
 '- **Rams 2026 ram-horn helmet/sleeve mark**: Wikimedia only has the LA monogram, the 2000-16 ram head and the horn-helmet drawing. `ramhorn()` in teams.js stays as the fallback.',
 '- **Steelers steelmark alone** (three hypocycloids, no ring/text) for the helmet: only the ringed "Steelers" logo (`PIT`) and the older "Steel" ring are on Wikimedia; the ring cannot be removed without redrawing.',
 '- **Ravens** shield patch and the 2026 redesign secondary marks (`BAL_dark` is the only extra, from the sheet); **Bears** "GSH" sleeve patch; **Titans** 2026 secondary (flaming T / sleeve marks); **Falcons** 2026 redesign secondary marks; **Commanders** alt marks; **Giants** capital "NY"; **Dolphins** alternate dolphin; **Saints** alt; **Vikings** horn; **Seahawks** alternates; **Eagles** Kelly-green throwback eagle, **Broncos** 1968 "D", **Bucs** Bucco Bruce, **Jaguars** 1995 mark, **Dolphins** 1966 throwback dolphin, **Steelers** 1933 crest, **Jets** classic oval and Gotham plate, **Falcons** 1966: no standalone file, only crops of the uniform sheets (130-300 px, see the notes above).',
 '- **Typeset text that is not a mark** (needs no image): "BILLS MAFIA", "GO BILLS", "H-TOWN", "WE ARE ALL PATRIOTS", "DIRTY BIRDS", "GO FINS!" etc.',
 '- Colts jerseys, Raiders, Cowboys etc. have no extra secondary marks on Wikimedia beyond those listed.', '']
open(os.path.join(HERE, 'logos.md'), 'w').write('\n'.join(out) + '\n')
print(len(rows), 'rows')
