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
```

## How it's built

Plain JavaScript + [three.js](https://threejs.org), bundled with Vite. There
are no model files: the player is generated in code.

| File | What's in it |
| --- | --- |
| `src/data/teams.js` | The uniform database: colors, stripes, number fonts, logos and documented looks for all 32 teams |
| `src/data/status.js` | Worn / announced / fantasy logic |
| `src/three/tube.js` | Lofted-tube generator with arc-length UVs so stripes and numbers are drawn in real centimetres |
| `src/three/paint.js` | Canvas painters for jerseys, sleeves, pants, socks, helmet shells and logo decals |
| `src/three/player.js` | Builds the player (torso, sleeves with shoulder domes, helmet shell with jaw flaps, facemask, legs, cleats) |
| `src/three/stage.js` | Renderer, lighting, turf, camera and controls |
| `src/main.js` | UI state, panel, team picker, matchup mode |

### Editing uniforms

Everything the renderer draws comes from `src/data/teams.js`. Each team has
`helmets`, `jerseys`, `pants`, `socks` and `looks`. Stripe lists are
`[color, widthInCm]` pairs from edge to edge (`null` = a gap in the base color),
and `debut: 'YYYY-MM-DD'` marks anything announced but not yet worn.

Team logos are simplified stand-ins drawn by the app, not official artwork.
