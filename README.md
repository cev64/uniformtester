# Uniform Lab

A 3D NFL uniform builder. Pick any of the 32 teams, then mix and match their
2026 helmets, jerseys, pants and socks on a rotating player. Matchup mode puts
two teams side by side.

## What it does

- **Locker Room**: one player, every uniform piece a team has for 2026, including
  throwbacks, Color Rush sets, the Nike "Rivalries" alternates and this year's
  redesigns (Titans, Ravens, Falcons, Commanders, Rams).
- **Game-day looks**: one-tap presets for the documented combinations (home,
  road, alternates) with notes on when they're scheduled.
- **Combo status**: every combination is labelled
  - **Worn**: it's in the game-day records,
  - **Announced**: it (or one of its pieces) has been revealed but hasn't
    debuted yet. The label flips automatically once the debut date passes,
  - **Fantasy**: every piece is real, but the combination hasn't been worn.
- **Matchup**: away team (defaults to road whites) vs. home team, each with
  its own camera. Tap a side to edit it; swap flips home and away.
- Custom number and name on the back, skin tone, glove and cleat colors,
  camera presets (front, ¾, side, back, helmet close-up) and a turntable.
- Camera: drag to orbit, scroll / pinch to zoom toward the point under the
  cursor (down to about 35 cm), right-drag / two-finger drag to pan. The view
  stays on the player; a preset button resets it.

## Running it

```bash
npm install
npm run dev          # local dev server
npm run build        # static site in dist/ (deploy anywhere); run before every push
npm run build:single # one self-contained HTML file in dist-single/
npm run build:model  # regenerate the player and helmet (see "Model pipeline")
```

GitHub Pages can serve the repository as-is (no build step): `index.html`
loads three.js through an import map and the models from `public/`.

## How it's built

Plain JavaScript + [three.js](https://threejs.org), bundled with Vite.

| File | What's in it |
| --- | --- |
| `src/data/teams.js` | The uniform database: colors, stripes, number fonts, logos and documented looks for all 32 teams |
| `src/data/status.js` | Worn / announced / fantasy logic |
| `src/three/garments.js`, `src/three/paint.js` | Canvas painters for jerseys, sleeves, pants, socks, helmet shells and drawn marks |
| `src/three/numerals.js` | Twill-style number shapes and per-team numeral styles |
| `src/three/fabric.js` | Cloth material (knit / twill / rib micro-weaves, seam and panel maps in each garment's UV space) |
| `src/three/applique.js`, `src/three/sdf.js` | Builds numbers, letters and logos as twill, pressed film or embroidery (colour + relief maps, stitching) |
| `src/three/fonts.js` | Lettering fonts for wordmarks, nameplates and tags |
| `src/three/player.js` | Loads the player, paints the garments and places number/name/logo decals |
| `src/three/helmet.js` | Loads the helmet and applies shell paint, finish and logo decals |
| `src/three/stage.js` | Renderer, lighting, turf, camera and controls |
| `src/main.js` | UI state, panel, team picker, matchup mode |
| `tools/`, `research/` | Model pipeline, screenshot script, logo and reference tooling (below) |

- **Player**: an athletic body built in Blender from
  [MakeHuman](https://github.com/makehumancommunity/makehuman) assets (CC0),
  proportioned after a modern NFL quarterback (6'5", 237 lb). The shoulder
  pads are a blended signed-distance shell (chest and back plates plus
  epaulet arches) that the jersey is stretched over; the pants sit at the hip
  bones with thigh, knee, hip and tailbone pads under them; the knit collar
  follows the real neckline; the cleats are Nike Vapor-style subdivision
  cages traced from product photos (sculpted upper, sole plate with heel cup
  and lip, molded studs, knit sock collar, pull loops, criss-crossed laces).
- **Helmet**: a Riddell SpeedFlex modelled from product photography: the
  hexagonal Flex panel cut into the shell (with a real gap along its free
  edges), brow, crown, rear, jaw and lower-back vents, jaw extensions, the
  flared rear with its rubber bumper, the Riddell nameplate, rubber edge trim,
  SpeedFlex facemasks (`maskStyle` in the helmet data: `2BD`, `2EG`, `3BD`) on
  four clear quick-release clips, a 4-point chin strap with hard cup, and the
  liner and pads inside. Stripes are painted at true width.
- **Numbers**: `src/three/numerals.js` draws jersey numbers as tackle-twill
  shapes rather than typing them in a font. Each team has a style (pro block,
  octagonal footed, round, Bears condensed, Steelers italic rounds, Vikings,
  Chargers italic, Rams, ...) with real stacked outlines, drop shadows and
  printed textures (Seahawks feathers, Lions carbon fibre, perforated
  Rivalries numbers, Jaguars spots).
- **Uniforms**: stripes, collars, panels (yokes, raglan panels, V-bands,
  fins, sleeve text bands, knotwork, diamond plate) and numbers are painted
  per team at real sizes; logos, the NFL shield and swooshes are projected
  decals.
- **Cloth**: every garment is built like Nike's Vapor F.U.S.E. game gear.
  The jersey has the real panel layout (chest yoke, front and back panel
  seams, back nameplate yoke, side vents, mesh insert under the collar) as
  sewn seams with cover stitching, a fine double knit with laser-perforated
  vent panels and smooth stretch shoulders, all at true scale; pants are
  glossy stretch twill with a stitched waistband (the belt is modelled but off by default, since the bloused jersey hides it in real photos); socks and
  collar are rib knit. Numbers, names and wordmarks are built as tackle
  twill (stacked cloth layers with zig-zag stitched edges) or heat-pressed
  film (`numStyle`), the shield and swooshes as embroidery, plus the woven
  jock tag (hidden under the tucked pants unless a jersey sets `jockTag`).

## Team data format

Everything the renderer draws comes from `src/data/teams.js`; the header
comment at the top of that file is the full field reference. In short, each
team is `{ id, city, name, conf, div, colors, font, helmets, jerseys, pants,
socks, looks }`. Stripe lists are `[color, widthInCm]` pairs from edge to edge
(`null` = a gap in the base color), and `debut: 'YYYY-MM-DD'` marks any piece
or look announced but not yet worn.

- **Helmets** (`helmets[]`: `id, name, tag, shell, finish, mask, stripe, logo`):
  `finish` is `gloss | matte | metallic | chrome`; `mask` is the facemask
  colour (`null` = no mask) and `maskStyle` picks `2BD | 2EG | 3BD`. `logo` is a
  real mark `{ img, faces: 'left' | 'right' }` or a drawn one (`t: 'horn' |
  'ramhorn' | 'wing' | 'bullhorn' | 'text' | ...`), with `size` (m) and `at`
  (`[up, back]` on the shell). Also `chinstrap`, `cup`, `numbers`/`numAt`,
  `pattern`, and `nameplate: { bg, fg, text }` for the front bumper (documented
  in the header of `src/three/helmet.js`). Stripe entries may carry a third
  value, a grout colour for tiled stripes.
- **Jerseys, front** (`jerseys[]`): `base`, `num: [fill, outline, outer]` with
  `numO` outline widths, `font`, `numStyle` (`twill | pressed | embroidered |
  print`), `collar` bands, `tv` (TV numbers on the `shoulder` or `sleeve`),
  `sleeve` (cap, top colour with optional halftone fade, `stripes`, `from`,
  `pattern`), `loop`/`loopPattern`/`loopAt` arm-top stripes, `panels`
  (`yoke, sides, vstripes, wing`), `sweep` (raglan, horn and bullhorn
  graphics across the sleeve seam), `collarFeathers`, `fade`, `swoosh`,
  `jockTag`, and chest graphics: `word` (text or `img` wordmark),
  `chestLogo`/`chestLogoAt`/`chestLogoSize`, `sleeveLogo`/`sleeveLogoSize`,
  `centerLogo`.
- **Jerseys, back** (all optional, defaults from `research/backs.md`):
  `numBack` and `numBackH`/`numBackMaxW` for the back number; the nameplate
  via `plateFont, plateArch, plateTracking, plateScaleX, plateH, plateAt,
  plateMaxW, plateColor, plateOutline, plateStyle, plateBar`; the back-collar
  `neckTag` (`{ s, c, bg, font, style, h, at }` text or `{ img, w }` logo;
  `at` is omitted for outside, `'inside'` or `'hidden'`).
- **Shoulder and sleeve graphics**: `shoulder` is a decal on each shoulder (a
  drawn mark `{ t: 'star' | 'bolt' | 'bars' | 'peak' | 'sleevehorn' | ... }` or
  `{ img }`, placed with `at: 'front' | 'top' | 'outer' | 'cuff'`, `size`,
  `along`, `lift`, `minDot`); `backShoulder` is the same seen from behind, as
  polygons `{ shapes, out, lift }`.
- **Pants** (`pants[]`): `base`, `stripe` (plus `stripeStart`, `stripeTaper`),
  `hipLogo`, `hipStyle`, `swoosh`, `belt` (colour, used only when the belt accessory is on), `fade`, `pattern`. **Socks**
  (`socks[]`): `base`, `stripes` with `stripesFrom` (cm from the foot), and
  `lower` (`[colour, cm]` foot colour). Both take `tag` and `debut`.
- **Looks** (`looks[]`): `{ name, h, j, p, s }` reference a helmet, jersey,
  pants and socks `id`; plus `status` (`'worn'` or omitted) or a `debut` date,
  and a free-text `note`. Combinations that match no look are labelled
  Fantasy (`src/data/status.js`).

## Screenshots: `tools/shoot.mjs`

Renders the stage in headless Chromium (software GL, about 30 s per view) so
changes can be reviewed without a browser. It needs Playwright, found in the
project or in `/opt/node-tools`. It starts its own Vite on a free port unless
you pass `--url`, loads the page with `?debug` (which exposes `window.__stage0`
and `window.__teams`) and writes `<out>/<TEAM>_<look>_<view>.png`.

```bash
node tools/shoot.mjs --team PIT,PHI --look Home --views front,chest,back --out /tmp/shots
node tools/shoot.mjs --team PIT --sel white,black,gold,black --number 7 --name SMITH
```

| Option | Meaning |
| --- | --- |
| `--team` | Team ids, comma separated (default `BUF`). Several teams in one call share one browser and are much faster |
| `--look` | Look name from `looks` (default: the team's first look); `all` renders every look |
| `--sel` | `helmetId,jerseyId,pantsId,socksId` to dress a custom combination instead of a look |
| `--views` | Comma-separated views (default `front,three,back,helmet`) |
| `--number`, `--name` | Back number and name (default `12`, `PLAYER`) |
| `--skin` | Skin tone index 0 to 3 (default 0) |
| `--url` | Use an already running dev server (for example `http://localhost:5173/`) |
| `--patch` | JS run against `window.__teams` before dressing, to try data changes without editing files, e.g. `--patch "__teams.NYJ.jerseys[0].plateArch = 0.3"` |
| `--out` | Output folder (default `shots/`, git-ignored) |

`--w`/`--h` (canvas size, default 900 x 1100) and `--settle` (ms to wait
after dressing, default 1200) also exist. Don't edit files while it renders:
a Vite hot reload can destroy the page context.

Views (the `VIEWS` table in the script):

| Group | Views |
| --- | --- |
| Body | `front`, `three`, `side`, `back` |
| Helmet | `helmet`, `helmetside`, `helmetsideR` (player's right), `helmetfront`, `helmetback` |
| Upper body | `chest`, `backtop`, `shoulder`, `numclose`, `neck`, `sleeve`, `sleeveR`, `backclose`, `side3`, `shouldertop` |
| Lower body | `pants`, `hip`, `feet`, `cleatside`, `cleatsideR`, `cleat34`, `towel` |

## Model pipeline

`public/models/` holds `player.glb`, `helmet.glb`, their `player.json` /
`helmet.json` metadata, `helmet_detail.png` (baked bump map) and the two skin
textures `skin_dark.jpg` / `skin_light.jpg`. Rebuilding them is only needed
when the geometry changes.

```bash
pip install bpy      # Blender as a Python module
git clone --depth 1 https://github.com/makehumancommunity/makehuman <dir>   # CC0 body data
MAKEHUMAN_DATA=<dir>/makehuman/data npm run build:model
```

`npm run build:model` (see `package.json`) runs, in order:

1. `tools/build_player.py --mh $MAKEHUMAN_DATA --out /tmp/uniformlab-model`:
   MakeHuman base mesh and macro targets, rigged and posed with relaxed arms;
   generates the shoulder pads, jersey, pants, socks and gloves from the posed
   body, lays out their UVs, adds the cleats and exports `player.glb` +
   `player.json`. `MAKEHUMAN_DATA` defaults to `/tmp/mh/makehuman/data`.
2. `tools/build_helmet.py --out /tmp/uniformlab-model`: the SpeedFlex shell,
   facemasks, chin strap and interior; exports `helmet.glb`, `helmet.json` and
   `helmet_detail.png`.
3. `gltf-transform meshopt` on both `.glb` files into `public/models/`
   (the app loads them with the meshopt decoder).
4. Copies `player.json`, `helmet.json` and `helmet_detail.png` to `public/models/`.

Helpers that are not part of that script:

- `tools/cleat.py`: the Nike Vapor-style football cleat (subdivision cage,
  sole plate, studs, knit collar, laces). Imported by `build_player.py`.
- `tools/fix_skin.py in.jpg out.jpg`: evens out the baked lighting and the
  head/body tone step in a MakeHuman skin photo texture.
- `tools/paint_brows.py --mh <data> in.jpg out.jpg`: the MakeHuman skin photos
  have no eyebrows, so this projects a brow curve onto the base mesh and paints
  hundreds of hair strokes into the texture. Run it on the output of
  `fix_skin.py`; the results are `skin_dark.jpg` / `skin_light.jpg`.
- `tools/preview.py`: Cycles turntable previews of a `.blend` or `.glb`.
- `tools/build_preview.py`: packs `dist-single/` plus models and logos into one
  shareable HTML file (after `npm run build:single`).

## Logos

`public/logos/<KEY>.png` are cleaned renders of Wikimedia artwork (never
redrawn); the data refers to them by key, and `KEY@#hex` tints a one-colour
mark at runtime. Scripts in `research/` (Python 3 with Pillow, NumPy, SciPy):

- `download.py`: one-off fetch of the 32 team uniform sheets (to
  `uniforms/`) and the primary logos (to `logos/`), relative to the current directory.
- `logo_tools.py`: shared helpers (Wikipedia/Commons API search and info,
  download and cache of originals in `logos_src/`, rasterising, defringing,
  trimming); its `search` and `info` commands look up files.
- `build_logos.py [KEY ...]`: the job list (key, Wikimedia file, what, where
  it is worn); builds `public/logos/` and writes `logos_manifest.json`.
- `recut_marks.py [KEY ...]`: re-cuts throwback marks (`PHI_tb`, `DEN_tb`,
  `ATL_tb`, `TB_tb`) from the full-size Commons uniform sheets. Nothing is drawn.
- `write_logos_md.py`: generates `research/logos.md` from
  `logos_manifest.json` and the files on disk. To add a logo, add it to the
  manifest (via `build_logos.py`), then regenerate.
- `contact_sheet.py OUT.png [prefix ...]`: contact sheet of the logos on dark
  and light backgrounds.

## Research files

- `research/uniforms/<TEAM>.png`: each team's uniform sheet from Wikimedia
  Commons, which the data was built from. They are **CC BY or CC BY-SA 4.0,
  not CC0** (credit the sheet's Commons page; some older comments in the repo
  still say CC0).
- `research/notes.md`: per-team notes read off the sheets. It **contains
  errors**; trust `src/data/teams.js` and the sheets over it.
- `research/backs.md`: measurements of real jersey backs (nameplate, number,
  neck tag placement) behind the back-of-jersey defaults.
- `research/logos.md`: generated table of every logo with its source, licence
  and colours.

## Licences and attribution

- The body data is [MakeHuman](https://github.com/makehumancommunity/makehuman)
  (CC0), including the skin photo textures.
- Team logos in `public/logos/` come from Wikimedia (Wikipedia and Commons);
  throwback marks were cut from the Commons uniform sheets (CC BY / CC BY-SA 4.0).
  Per-file source and licence are in `research/logos.md`. All marks remain
  trademarks of their owners.

Unofficial fan project, not affiliated with the NFL or its teams. Team names
and logos are trademarks of their owners.
