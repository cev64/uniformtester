# Uniform Lab realism project: handoff (round 3)

For the next agent (with subagents). Read all of it before starting.
Branch: `claude/youthful-dijkstra-nww1vz`. Everything listed as done is merged and pushed there.
No agents are running and there are no open worktree branches you need.

## 1. The goal (from the user)

Make the 3D NFL uniform builder **as lifelike as physically possible**:
- every team's jerseys, pants, socks and helmets match the real 2026 uniforms in every detail
  (fonts, numbers, logos, wordmarks, stripes, collars, sleeve and shoulder graphics, nameplates);
- the helmet for every team is a faithful **Riddell SpeedFlex**;
- the player and the way the gear sits on him read as a real NFL player.

The user's current priority is **jersey detail**: the shoulder pads and collar are now fixed (§4 P0); next are the shoulder designs (§4 P1).

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

## 4. Remaining work: specific instructions

### P0: modern shoulder pads and collar: DONE (user approved the sizing and proportions)

Done in this session, in `tools/build_player.py`, with the player model rebuilt:
- **Pads:** low-profile rounded caps over the deltoids (centre `SHX - 0.005`, rounder exponents, wider
  inward taper so they blend into the trapezius slope), thinner plates. The upper chest stand-off went
  from 8 cm to about 1–2 cm. The jersey is 64 cm across, down from 67; most of the width is the body's
  own deltoids, which the user is happy with. The shoulder line now slopes down from the neck instead
  of a flat shelf at chin height.
- **Collar:** the neck opening (`R_NECK`) is widened from 0.086 to 0.10 m to match the thick base of
  the neck, so the jersey no longer runs up the neck like a turtleneck. The `pad_arch()` lift is cut to
  the neck base, and the neckline heights are smoothed (40 passes). The collar is now one clean band at
  the base of the neck, with the V below the chin cup. Don't delete faces by radius to lower the
  neckline: that splits the neckline into several loops and breaks the collar builder (`neck_loop`).
- **Shape:** the old "crisp cap" step that snapped fabric back onto the pad shell left a crease round
  the cap, so it's replaced by plain smoothing. The chest plate is slimmer (front radius 0.16, top at
  `SHZ + 0.01`).
- **TV numbers on the shoulder** (`player.js`) are now projected onto the crown of the sloped cap from
  above and outside, so they no longer stretch.
- The cleats came out identical (same vertex count and bounds). `player.glb` is 1.9 MB.
- Shoulder decals (DAL, LAC, IND, DEN) and the SEA shoulders are now fitted to the new cap (§3). Still not
  re-checked: the TV-number size on every team (BUF and LV look right); do it in P5.

### P1: the user's "glaring problems" (do these first)

Each needs engine work plus data. Give them to **one Opus engine agent** (they share the same code:
shoulder/sleeve graphics), with the reference sheet and real 2025/2026 game photos for each team.
Verify each at `chest`, `shoulder`, `sleeve`, `three` and `back`, with a render next to the reference.
Then stop.

1. **DONE: Seahawks shoulders (SEA, all three jerseys)** (see §3). Note: the reference sheet puts the TV
   numbers on the jersey-colour cap *above* the band, not on the grey, so that's how it's built. Back is
   plain (the sheet shows the front only; check a back photo in P5). The "12" tag stays on the back neck.
   Original brief, for reference:
   - Now: `panels: { yoke: [WG, 11, 0] }` plus `sleeve.top`, and `feathers: G` draws green spikes around
     the collar that read as a spiky fringe.
   - Real (sheet + photos): a wolf-grey band runs over the top of each shoulder from the collar to the
     sleeve, edged in Action Green at the sleeve end. The TV numbers sit on the grey, and the collar
     trim is a feather/laurel pattern beside the V with the "12" tab at the front.
   - Fix: make the yoke a shaped shoulder panel that matches the sheet outline, continuous across torso
     and sleeve, with the green edge accent. Redraw the collar feathers as the real small feather trim,
     not spikes. The road (navy yoke on white) and Action Green (navy on green) versions follow.
2. **Panthers shoulders (CAR, all jerseys that use `panels.raglan`).**
   - Now: `garments.js` ~line 72 (`p.raglan`) draws a constant-width stroke on the **torso** texture along
     hard-coded `lines`, so it reads as a thin blue arc across the chest.
   - Real: a tapered blue (or black/silver) panel on the **outer shoulder and sleeve**, running from the
     collar along the raglan seam to the underarm, widest at the shoulder and narrowing toward the armpit,
     with a thin edge line.
   - Fix: draw it as a filled tapered polygon, continuous across the torso and sleeve textures (or as a
     projected decal over the shoulder cap), with positions overridable from data. Remove the chest arc.
3. **Rams shoulder horn (LAR primaries, plus Fearsome White / Classic Sol if they carry it).**
   - Now: `loop` + `loopPattern: 'horn'` (`garments.js` ~line 285) paints a flat horizontal band
     across the shoulder.
   - Real 2026: a horn curl starting at the collar/shoulder top, sweeping over the shoulder cap and
     tapering to a point down the outer sleeve (gold on royal; royal on white).
   - Fix: a shaped horn graphic that follows the sheet and photos, spanning the shoulder and sleeve
     (a projected canvas decal over the shoulder, using the decal machinery in `player.js`, is likely
     the simplest way to cross the torso/sleeve seam). Don't use the helmet `ramhorn` shape: it's the
     helmet curl, not the sleeve horn.
4. **Texans sleeve horns (HOU road white and Battle Red jerseys).** Same `loopPattern: 'horn'` flat-band
   problem. The real sleeves carry a horn crescent with a red line. Fix with the same mechanism as item 3.
5. **Texans alternate helmet logos (HOU).** Research each against team photos:
   - **Battle Red helmet:** now `{ t: 'horn' }`, which is the *Vikings* horn shape, so it's wrong. Find
     the real mark on the 2024+ Battle Red helmet. If it's the bull-head logo, use the `HOU` PNG (tinted
     if the real decal is one colour). If it's a bull-horn graphic, the engine needs a new drawn mark;
     never draw the bull head itself.
   - **H-Town helmet** and **Rivalries helmet:** now a blackletter "H" typeset with a star. Check the real
     letterform, colours, outline and size against photos, and fix the size, which is too small
     (drawn marks now honour `logo.size`).
   - The Rivalries shell is already plain white. Check that the stripe and mask colour are right.

### P2: helmet logo placement on the new helmet (one Sonnet agent; data only)

The helmet was rebuilt after most teams tuned their logos. The UV layout is unchanged, so placements
carried over, but they need a check.
- Render `helmetside` (and `helmetsideR` for PIT) for every team's primary helmet: 32 teams, in a few
  multi-team calls. Then check the alternates.
- Known problems: the **LV shield** is too big and too far forward and high, overlapping the vents (real:
  ~12 cm, centred on the side). The temple clip overlaps the logo on **LV, TEN, IND**. NYG and WAS sit
  close to the top vent. **BUF, NE, NYJ, BAL, CIN** helmet stripes and logos were never measured.
- Real decals are 12–15 cm and centred on the side between the ear hole and the crown, clear of the
  vents. Stripes are in true cm.
- Optional: set `nameplate: { text }` where the real helmet's front bumper isn't "Riddell". The
  Falcons and Rams agent reported team lettering there; confirm with photos first.

### P3: smaller engine requests from the team agents (Opus or yourself; do only what's cheap)

- `numBack: [fill, outline, ...]` for different back-number colours (PIT 1933 throwback: white front numbers, black back numbers).
- `chestLogo` position is fixed and collides with the number when there's no wordmark (HOU Rivalries worked around it with an empty `word`). Add `chestLogoAt`/size.
- A sleeve-logo size field (90s Seahawks big hawk-head sleeves).
- Eagles helmet wing has no feather detail (needs a properly licensed image asset; never forge one).
- DET Concrete: black carbon-fibre shoulder caps (approximated with `loop`).
- Ravens numeral 3: squared terminals look wrong; the glyph engine breaks on narrow counters.
- Missing marks: JAX Rivalries "904" helmet mark, 1983–2001 Seahawks logo for the throwback helmet,
  Saints 60th-season patch. Add only from properly licensed sources.

### P4: data to verify (cheap; fold into P2's agent or the final review)

- `numStyle: 'pressed'` assignments (all teams) and LAR primaries (`pressed` is a guess).
- KC pants stripe order (gold-red vs red-gold-red), ATL 1966 socks (white with black/red bands per the
  2026 sheet), JAX Rivalries socks (white per the team site, cream on the sheet).
- Nameplate fonts for HOU IND JAX TEN DEN KC LV LAC were not checked against photos (none found).

### P5: final realism review (one Opus agent), then ship

- Render the Home and Road looks of all 32 teams (`three` and `back`) plus a helmet close-up, in
  multi-team calls. Compare against the reference sheets for inconsistencies, logo sizes, colours under
  the stadium lighting, clipping, seams and decal stretching.
- Output a prioritized punch list. Apply the small fixes, send larger ones to a subagent, then stop.
- Ship: update README.md (data fields from the `teams.js` header, `shoot.mjs` and its views,
  `cleat.py`, `paint_brows.py`, the logo scripts including `recut_marks.py`, the model pipeline), run
  `npm run build`, commit, and push to `claude/youthful-dijkstra-nww1vz`. Open a PR only if the user asks.

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
