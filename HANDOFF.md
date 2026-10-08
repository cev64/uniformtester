# Uniform Lab realism project: handoff (after round 3)

For the next agent (with subagents). Read all of it before starting.
Branch: `claude/youthful-dijkstra-nww1vz`. Everything listed as done is merged and pushed there.
No agents are running and there are no open worktree branches you need.

## 1. The goal (from the user)

Make the 3D NFL uniform builder **as lifelike as physically possible**:
- every team's jerseys, pants, socks and helmets match the real 2026 uniforms in every detail
  (fonts, numbers, logos, wordmarks, stripes, collars, sleeve and shoulder graphics, nameplates);
- the helmet for every team is a faithful **Riddell SpeedFlex**;
- the player and the way the gear sits on him read as a real NFL player.

The user's priority has been **jersey detail**; round 3 finished the shoulder designs and the jersey backs. Next: the punch list in §4.

How the user wants it run:
- Use subagents, choosing the model per task: **Opus** for 3D modelling, rendering-engine work and the
  final visual review; **Sonnet** for well-defined data and asset work.
- **Review subagent output critically.** Look at the render next to the reference and send back what's
  wrong with specific fixes. Render close-ups yourself (`chest`, `shoulder`, `sleeve`) to review;
  full-body cells in contact sheets are too small to judge.
- **Be economical with time and tokens.** The user is watching usage closely. Render only what
  verifies a change, batch views and teams in one `shoot.mjs` call, never re-render unchanged pieces,
  stop once a piece matches. Give agents a stopping point.
- **Signed off; don't rework unless asked:** the cleats and the helmet model ("good enough", see §3).

## 2. Environment and tooling

```bash
npm install
npm run dev                 # local server
npm run build               # must pass before every merge/push
pip install bpy             # Blender as a Python module; only needed to rebuild models
git clone --depth 1 https://github.com/makehumancommunity/makehuman <dir>   # CC0 body data for build_player.py
```

- **Screenshots** (headless Chromium, software GL; ~30 s per view, slower when several agents render):
  `node tools/shoot.mjs --team PIT,PHI --look Home --views front,chest,back --out <dir>`
  - Several teams in one call share one browser and are much faster than one call per team.
  - Options: `--sel helmetId,jerseyId,pantsId,socksId`, `--number 38 --name SMITH`, `--skin 0-3`,
    `--url http://localhost:PORT/` (use a server you started), and `--patch "<js>"` to try data
    changes against `window.__teams` without editing files.
  - Views (VIEWS table in the script):
    - body: front, three, side, back
    - helmet: helmet, helmetside, helmetsideR (player's right), helmetfront, helmetback
    - upper body: chest, backtop, shoulder, numclose, neck, sleeve, sleeveR, backclose, side3, shouldertop
    - lower body: pants, hip, feet, cleatside, cleatsideR, cleat34, towel
  - **Parallel agents:** each agent in a worktree should start its own Vite once
    (`npx vite --port <random 5-digit> --strictPort &` from the worktree root) and pass `--url`.
    shoot.mjs now waits for its own Vite (a port race used to render another worktree's code),
    but a shared fixed server per agent is still faster. An HMR reload while shoot.mjs runs can
    throw "execution context destroyed"; don't edit files mid-render.
  - Background shell commands time out at 30 min unless you pass a longer timeout.
- **Rebuilding models:** see the `build:model` script in package.json (`tools/build_player.py`,
  `tools/build_helmet.py`, then `gltf-transform meshopt`, then copy player.json/helmet.json/helmet_detail.png).
- **References:** `research/uniforms/<TEAM>.png` (Commons uniform sheets; CC BY / CC BY-SA 4.0, not CC0),
  `research/notes.md` (contains errors), `research/logos.md` (generated from `research/logos_manifest.json`
  by `research/write_logos_md.py`; add new logo files to the manifest, then regenerate).
  Team sites and Commons photos are reachable with WebSearch/WebFetch; keep downloads in scratch only.
- **Gotchas:** the container can restart without warning (WIP-commit after each milestone);
  never `pkill -f vite` (kills your shell); give each agent its own scratch subfolder; use worktree
  isolation for parallel agents and merge their branches yourself (`git merge --no-ff`).
- **Pre-push check:** `npm run build`, then confirm every look references existing pieces and every logo
  key has a file (a 30-line node script that imports `src/data/teams.js` does it).

## 3. What's done

| Area | Status | Key files |
|---|---|---|
| Logo/wordmark library | Done. 116 PNGs (+ `NYG_white`, the Giants "ny" with a white fill for the helmet). Throwback crops TB_tb, PHI_tb, DEN_tb, ATL_tb re-cut from the full-size sheets (`research/recut_marks.py`); no better sources exist for the rest. Licences corrected. | `public/logos/`, `research/logos.md` |
| Rendering engine | Done: fabric, appliqués, numerals, fonts, wordmarks, lighting. This round: helmet drawn marks (`t: 'horn'/'ramhorn'/'wing'/...`) honour `logo.size` and `logo.at`; helmet `nameplate.text` sets the bumper lettering; sleeve `textBand` no longer mirrored. | `src/three/*.js` |
| Player model | Done. | `tools/build_player.py` |
| Cleats | Done, **user approved**. Knit collar and laces follow the cleat colour; lateral swoosh ~14 cm, mirrored correctly on both feet. | `tools/cleat.py`, `player.js` |
| Jock tag | Hidden by default; `jockTag: true` or `{ size, bg, fg }` opts in. | `player.js` |
| Towel | Still off (`ACCESSORIES.towel = false`); a real drape needs a player rebuild. Low priority. | |
| Helmet | **Rebuilt, accepted by the user as good enough; don't rework.** Subdivision-cage shell traced from Riddell photos; SF-2BD-SW mask fitted to the shell (top bar 2.8–4.0 mm under the bumper along its length); smaller chin cup behind the chin bar; new clips. Known leftover: from the side, the jaw area shows some jagged black pieces (recess, vent, trim). Only touch it if the user asks. GLB 1.6 MB. | `tools/build_helmet.py`, `src/three/helmet.js` |
| Team accuracy | Second pass done on all 32 teams (details below). | `src/data/teams.js`, `numerals.js`, `fonts.js` |
| Shoulder graphics on the new pad cap | Done. `jersey.shoulder.at` = `'front'` (default) / `'top'` / `'outer'` / `'cuff'` places the mark on the rounded cap (documented in the `teams.js` header). DAL Road star on the outer sleeve, clear of the TV number; DAL Arctic/1960s stars on the cap crown; LAC bolt 22 cm, upright down the front of the shoulder; IND UCLA bars over the crown front to back; DEN peak at the sleeve cuff. BUF/LV shoulder TV numbers and sleeve-TV teams checked, unchanged. | `player.js` (`if (jersey.shoulder)`) |
| Seahawks shoulders | Done (Home, Road, Action Green). `panels.wing: [band, accent]`: band across the chest at the V (wordmark on it) sweeping down the front of each sleeve, accent wedge at the outer sleeve end set off by a base-colour stripe; drawn in front view and projected over torso + sleeves (`wingCanvas`, `wingPanel`; `decal()` gained `axis`/`order`). `collarFeathers: { c, n }` draws 6 feather chevrons (12 feathers) a side on the collar; the old torso `feathers` spikes stay for BAL only. TV numbers sit on the navy/white/green cap above the band, as on the sheet. | `garments.js`, `player.js`, SEA block |

Team pass highlights (all merged):
- **numStyle** set on every jersey of every team: `twill` for on-field jerseys; `pressed` for
  Rivalries, Color Rush and patterned/textured number sets. Only PIT is confirmed by a source
  (shop listing: stitched twill); the rest is a reasoned default.
- **Team numeral styles** added or retuned: cowboys, giants, eagles, commanders, bears, lions, packers,
  vikings, patriots, browns, ravens, steelers (now **upright**), raiders, titansNeon (opt-in `inline`
  parameter for the Music City neon digits), texans, texansRiv, falcons, panthers, saints, cardinals,
  niners, seahawks.
- **PIT:** upright numerals; the real wide gold sleeve-stripe group on home and road; helmet stripe 2.4 cm.
- **LV:** full audit (TV numbers on the shoulder, silver #A9B0B4, raiders numerals, outlines, helmet stripe 3.2 cm).
- **TEN:** `TEN_word` is unused (wordmarks are typeset); Music City neon numerals; wordmark proportions.
- **HOU:** wordmark sizes, numerals, Rivalries number placement; Rivalries helmet shell is now **plain white gloss**.
- **NFC East + North:** helmet logo size/placement tuned (on the old helmet; see §4 P2). DET collars fixed.
- **NFC South + West:** Falcons and Rams 2026 redesigns confirmed against official photos; Panthers
  "KEEP POUNDING" tag; 49ers chest wordmark typeset; Rams helmet horn 20 cm curling round the ear;
  Vikings helmet horn 24 cm.

## 4. Round 3 results and what's left

Round 3 finished P1, P1b, P2, P4 and P5 (all merged and pushed). The old P0–P5 instructions are in git
history (`git show f4046bc:HANDOFF.md`) if you need the detail.

Done this round:
- **P1:** LAR per-jersey sleeve horns (`sleevehorn` options `weight`, `line`, `outline`; 'outer' placement
  `lift`, `minDot`; sleeve `top` fade → halftone; Fearsome White `sweep: { t: 'horn', lift }`). HOU sleeve
  bullhorn drawn into the sleeve texture with the loop band (`sweep: { t: 'bullhorn', c, line }`). HOU
  Battle Red helmet `t: 'bullhorn'` mark; H-Town/Rivalries blackletter H (Pirata One, `scaleX`, `shift`,
  `starAt`, size 0.21); Rivalries shell stripe with tiled strips and "H-TOWN" bumper.
- **P2:** helmet logos moved clear of the temple clip and vents for 30 teams (12–15 cm, `at` ≈ [0.46, 0.22–0.34]).
- **P1b:** `research/backs.md` (ratios from back photos). Back layout calibrated (plate letters 0.055 m,
  plate top 0.08 H below the seam at `neckY - 0.03`, gap 0.09 H; name width cap 0.235 m). New fields:
  `numBack`, `numBackH`, `plateAt`, `plateMaxW`, `numBackMaxW` (back number condensed above 1.05 x its
  height; it used to run off the torso panel and clip), `backShoulder`, `neckTag.at` ('inside'/'hidden'),
  `neckTag: { img, w }`, `chestLogoAt`, `chestLogoSize`, `sleeveLogoSize`; `panels.wing` draws its back
  view. Per-team nameplate fonts, arches, colours, bars, neck tags, back shoulder graphics for all 32.
- **P5:** 13 team numeral styles narrowed to photo proportions (they were 15–30% too wide); road
  nameplate bars removed (PIT, NE, DEN, WAS); BUF Charge streak 0.26.
- **Belt off by default** (`ACCESSORIES.belt = false`; painted belt loops skipped): real jerseys blouse
  over the waistband and hide it (user request).
- README rewritten; Commons sheet licence corrected everywhere (CC BY / CC BY-SA 4.0, not CC0).

Remaining punch list (priority order):
1. **(Medium, engine)** A nameplate bar matching the jersey colour renders as a shaded, stitched box
   (`letteringLayers` bar layer `thick 0.35, halo 0.3`); LAR road and DET home look boxy. Needs a subtler edge.
2. **(Player model, report only so far)** The back collar dips toward the centre and bunches (KC, BUF,
   PIT, NE, NO); real back necks are nearly flat. Needs a `build_player.py` change and rebuild.
3. **(Small)** Faint grey patch at the front centre of the waistband where the hidden buckle sat (KC `hip`).
4. **(Small, glyph)** Ravens 8 has no waist notch (`ravens` style `notch: 0`) and the 3 has squared
   terminals; check against photos.
5. **(Small, engine)** Charge streak is thickest at the front; the sheet has it thickest at the back
   (`paint.js` case 'streak'). CHI "GSH" sleeve letters fixed at 0.065 m; real patch ~4 cm (`sleeveText.h`).
6. **(Data, needs photos)** Digit widths unmeasured for packers, vikings, commanders (2026), patriots,
   jaguars, titans, broncos, raiders, cardinals, seahawks (packers and vikings look wide). Front numbers
   have no width cap; only the back does.
7. **(Data)** NO nameplate arch 0.3 came from a Color Rush photo; NO's black number outline looks thicker
   in photos (~0.045 vs 0.022); ARI road plate outline too heavy; NE shoulder stripes angled on the sheet
   but flat on the cap; SEA outside "12" neck tag unconfirmed; KC white pants stripe order unconfirmed.
8. **(Assets)** ATL 2026 "FALCONS" back plate (needs a `plateText` field and a game photo), WAS round crest
   neck tag (no licensed PNG), JAX "904", 1983–2001 Seahawks logo, Saints 60th patch, Eagles wing feathers.
9. **(Engine)** Back-of-helmet marks (HOU Rivalries "TEXANS" rear bumper, Battle Red rear bull head);
   a top-down helmet view in `shoot.mjs` to measure stripe widths; DET Concrete carbon-fibre caps.
10. **Unchanged from before:** towel off (needs a player rebuild); helmet jaw area shows some jagged
    black pieces from the side (only if the user asks).

## 5. Rules to give every parallel subagent

- **`src/data/teams.js`:** edit only your teams' blocks. Never touch the header, the shared helpers or
  other teams. The header documents every field; update it when an engine change adds one (lead only).
- **`src/three/numerals.js`:** tune only team-named styles. Add new ones under your group's anchor
  comment (`// ── team styles: <group> ──`). Never change shared styles (`block`, `blockRound`, `square`,
  `chamfer`, `round`, `futura`, `italic`, `angular`). New glyph parameters must be opt-in, with the
  default keeping current behaviour.
- **`src/three/fonts.js`:** add fonts under your group's anchor. A new Google Font goes in the single
  fonts `<link>` in `index.html`.
- **Engine files** (`player.js`, `garments.js`, `applique.js`, `fabric.js`, `helmet.js`, `paint.js`,
  the Blender scripts, `shoot.mjs`): only the agent assigned engine work edits them. Data agents report
  engine gaps precisely instead.
- **Logos:** never draw or forge team logos. Use the PNGs in `public/logos` (tinting with `@#hex`, or a
  documented recolour of the same artwork, is fine). Typeset text and procedural graphics are fine.
- **Commits:** WIP commit after each team or fix. End each message with the session's attribution trailer.
- **Rendering:** run your own Vite with `--url`, batch views and teams, and stop when it matches.
