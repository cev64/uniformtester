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

The user's current priority is **jersey detail**: first the oversized shoulder pads and collar (§4 P0), then the shoulder designs (§4 P1).

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

### P0: modern, smaller shoulder pads and a lower collar (do this first; one Opus agent)

The user finds the shoulder/chest pads too big, and that makes every collar look wrong. This must come
**before P1**, because the Seahawks, Panthers and Rams shoulder graphics are drawn onto the pad shape.

**What's wrong (measured from `public/models/player.glb` and a DAL Road render, front/side/neck):**
- **Too wide.** The jersey is **67 cm across the shoulder caps** (x = ±0.335 m at z ≈ 1.60–1.65), on a
  1.98 m player whose shoulder joints sit at x = ±0.230, z = 1.616 (`SHX`, `SHZ`). The cap shapes in
  `PAD_SHAPES` (`tools/build_player.py` ~line 346) are centred at `SHX + 0.012` and reach 0.142 m
  further out, so the cap stands about 15 cm outside the joint. The code comment says "68 cm",
  which is lineman size. Modern skill/QB pads on a tall player read about **56–60 cm** across the
  caps, about **2.4–2.5 helmet widths** in a front photo (a SpeedFlex is about 24 cm wide). That is
  the photo-measurable check.
- **Flat, boxy top at chin height.** From the front, the top of the pads is a horizontal shelf level
  with the chin cup, with square corners. That comes from exponents 4.2 (plate) and 4.6 (caps), and from
  the cap tops at `SHZ + 0.135` ≈ 1.75 m, above the neck base (`neck01` z = 1.72). Real low-profile
  pads **slope down from the neck to rounded caps** that follow the deltoid, like a trapezius line
  with a few cm of foam on it. In front and ¾ photos of current players you can see a strip of neck
  between the collar and the bottom of the facemask.
- **Chest stands off too far.** At z = 1.65 the jersey front is at y = −0.192 against the body at
  −0.110, **8 cm off the upper chest**, which forms a shelf under the collar. At the back it's about 5 cm.
  Modern pads sit **2–3 cm** off the upper chest and shoulder blades. Arch and plates are thin.
- **Collar pushed up into a rim.** `pad_arch()` (~line 746) lifts the jersey round the sides and back
  of the neck to `H_SIDE = SHZ + 0.135` / `H_BACK = SHZ + 0.122`, "almost to the jaw". That's the
  old high-arch lineman look. It makes the collar band stand up as a ring hugging the jaw and buries
  the V under the facemask (see the `neck` view). A modern Vapor F.U.S.E. collar is a narrow band
  **lying on the pads at the base of the neck**. The V is narrow and about 7–9 cm deep, with no raised rim.

**How to fix it (starting values; confirm each against photos):**
1. **References first.** Collect front, side, ¾ and back photos of current NFL skill players and QBs in
   2024–2026 game uniforms (Wikimedia Commons game photos are easiest to license-check; keep them in
   scratch only). For each, measure in helmet widths: the across-cap width, the cap top height below the
   chin, the chest depth in side view, and the visible neck. Use these numbers, not mine, as the targets.
2. **Shrink and round the pads** in `PAD_SHAPES`:
   - caps: centre about `SHX - 0.005`, outward reach about 0.10 (aim for 58 ± 2 cm across the jersey),
     up-radius about 0.065, xz exponent about 3.0 (round, not boxy);
   - chest/back plate: half-width about 0.20, front/back radii cut so the jersey stands 2–3 cm off the
     upper chest and shoulder blades, exponent about 3.0;
   - make the top **slope**: the pad surface beside the neck at about `SHZ + 0.08`, falling to about
     `SHZ + 0.06` over the cap. Not flat at `SHZ + 0.135`.
   Update the dimension comment above `PAD_SHAPES` to match.
3. **Lower the collar.** Remove the lift in `pad_arch()`, or cut it to at most ~1.5 cm above the pad top
   with no inner lip. Keep the neckline (`R_NECK` 0.086, `neck_hook`) hugging the neck at its base:
   neck circumference is about 48–50 cm, so a radius around 0.080–0.084. Check the V (`V_POINT`,
   `vplane`) against photos: a narrow V about 7–9 cm deep, sides about 5–6 cm from the centre at the top.
   The collar mesh and `player.json` `collar` meta are regenerated from this, so the team `collar`
   bands follow.
4. **Sleeves:** with smaller caps, keep the modern short, tight sleeve (`SLEEVE_LEN` 0.13 from the joint)
   ending above mid-bicep. The sleeve must still wrap the cap without a crease (`pad_shape` fade on the arm).
5. **Rebuild** with the `build:model` pipeline (needs `pip install bpy` and the makehuman clone; see
   §2). `tools/cleat.py` geometry is **user-approved and must come out identical**: don't touch it, and
   diff the cleat mesh vertex count/bounds before and after. Keep the material names, garment UV
   layouts and the `player.json` keys that `src/three/*.js` reads. Keep `player.glb` near its current
   size after meshopt (1.9 MB).
6. **Check what rides on the pads** (one batched render of a few teams at `front`, `three`, `side`,
   `back`, `neck`, `shoulder`, `shouldertop`):
   - TV numbers on the shoulder top (BUF, LV);
   - shoulder decals (DAL stars, LAC bolts, IND UCLA bars);
   - yoke panels (SEA, BUF Nickel City);
   - sleeve stripes and loops (PIT, GB);
   - collar bands and the neck tag (GB, NYG);
   - chest wordmark and number position (PHI, CIN);
   - the jersey tuck and the drape below the pads.
   Fix anything the new shape moves. Most things are positioned in cm or by raycast, so they should follow.
7. **Verify:** sheets with the render next to the reference photo at front, side and ¾, plus a `neck`
   close-up next to a collar photo. Report the new across-cap width and chest stand-off numerically.
   Then stop.

### P1: the user's "glaring problems" (after P0)

Each needs engine work plus data. Give them to **one Opus engine agent** (they share the same code:
shoulder/sleeve graphics), with the reference sheet and real 2025/2026 game photos for each team.
Verify each at `chest`, `shoulder`, `sleeve`, `three` and `back`, with a render next to the reference.
Then stop.

1. **Seahawks shoulders (SEA, all three jerseys).**
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
