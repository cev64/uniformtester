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
  proportioned after a modern NFL quarterback (6'5", 237 lb), with the
  arms relaxed at the sides. The jersey, pants, socks, cleats and gloves are
  cut from the body surface with clean hems and a compression fit over
  low-profile pads, and given UV layouts the app paints uniforms onto.
- **Helmet**: `tools/build_helmet.py` models a Riddell SpeedFlex-style shell
  (jaw flaps, rear skirt, front flex panel, vents, ear holes, rubber trim)
  with a SpeedFlex-style facemask, clips and chin strap.
- **Uniforms**: stripes, collars and numbers are painted per team at real
  sizes; logos, the NFL shield and swooshes are projected decals.
- **Reference**: `research/uniforms/` holds each team's uniform sheet from
  Wikimedia Commons (CC0) that the data was built from, with notes in
  `research/notes.md`. Team logos in `public/logos/` come from Wikimedia.

| File | What's in it |
| --- | --- |
| `src/data/teams.js` | The uniform database: colors, stripes, number fonts, logos and documented looks for all 32 teams |
| `src/data/status.js` | Worn / announced / fantasy logic |
| `tools/build_player.py`, `tools/build_helmet.py` | Blender scripts that generate `public/models/*.glb` (`npm run build:model`) |
| `src/three/garments.js`, `src/three/paint.js` | Canvas painters for jerseys, sleeves, pants, socks, helmet shells and drawn marks |
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
