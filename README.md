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

## Running it

```bash
npm install
npm run dev          # local dev server
npm run build        # static site in dist/ (deploy anywhere)
npm run build:single # one self-contained HTML file in dist-single/
npm run build:model  # regenerate the player and helmet (needs `pip install bpy` and MakeHuman data)
```

GitHub Pages can serve the repository as-is (no build step): `index.html`
loads three.js through an import map and the models from `public/`.

## How it's built

Plain JavaScript + [three.js](https://threejs.org), bundled with Vite.

- **Player**: `tools/build_player.py` builds an athletic body in Blender from
  [MakeHuman](https://github.com/makehumancommunity/makehuman) assets (CC0),
  proportioned after a modern NFL quarterback (6'5", 237 lb). The shoulder
  pads are a blended signed-distance shell (chest and back plates plus
  epaulet arches) that the jersey is stretched over; the pants sit at the hip
  bones with thigh, knee, hip and tailbone pads under them; the knit collar
  follows the real neckline; the cleats are swept from slices of the foot
  (toe box, laced instep, open mid-cut collar, sole plate with toe spring).
  `tools/fix_skin.py` evens out the baked lighting in the photo skin.
- **Helmet**: `tools/build_helmet.py` models a Riddell SpeedFlex from its
  product photography: the raised Flex panel from brow to crown with the
  forehead slits, chevron and rear vents, jaw extensions, flared rear edge,
  Riddell nameplate bumper, rubber trim, a SpeedFlex facemask on four clear
  quick-release clips, chin strap with cup and buckles, and inner padding.
- **Numbers**: `src/three/numerals.js` draws jersey numbers as tackle-twill
  shapes rather than typing them in a font. Each team has a style (pro block,
  octagonal footed, round, Bears condensed, Steelers italic rounds, Vikings,
  Chargers italic, Rams, ...) and numbers get real stacked outlines, drop
  shadows and printed textures (Seahawks feathers, Lions carbon fibre,
  perforated Rivalries numbers, Jaguars spots).
- **Uniforms**: stripes, collars, panels (yokes, raglan panels, V-bands,
  fins, sleeve text bands, knotwork, diamond plate) and numbers are painted
  per team at real sizes; logos, the NFL shield and swooshes are projected
  decals.
- **Reference**: `research/uniforms/` holds each team's uniform sheet from
  Wikimedia Commons (CC0) that the data was built from, with notes in
  `research/notes.md`. Team logos in `public/logos/` come from Wikimedia;
  throwback marks were cut from the same CC0 sheets.

| File | What's in it |
| --- | --- |
| `src/data/teams.js` | The uniform database: colors, stripes, number fonts, logos and documented looks for all 32 teams |
| `src/data/status.js` | Worn / announced / fantasy logic |
| `tools/build_player.py`, `tools/build_helmet.py` | Blender scripts that generate `public/models/*.glb` (`npm run build:model`) |
| `src/three/garments.js`, `src/three/paint.js` | Canvas painters for jerseys, sleeves, pants, socks, helmet shells and drawn marks |
| `src/three/numerals.js` | Twill-style number shapes and per-team numeral styles |
| `src/three/player.js` | Loads the player, paints the garments and places number/name/logo decals |
| `src/three/helmet.js` | Loads the helmet and applies shell paint, finish and logo decals |
| `src/three/stage.js` | Renderer, lighting, turf, camera and controls |
| `src/main.js` | UI state, panel, team picker, matchup mode |

### Editing uniforms

Everything the renderer draws comes from `src/data/teams.js`. Each team has
`helmets`, `jerseys`, `pants`, `socks` and `looks`. Stripe lists are
`[color, widthInCm]` pairs from edge to edge (`null` = a gap in the base color),
and `debut: 'YYYY-MM-DD'` marks anything announced but not yet worn.

Unofficial fan project, not affiliated with the NFL or its teams. Team names
and logos are trademarks of their owners.
