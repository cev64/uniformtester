# Uniform Lab realism project: handoff

This file is for the next agent (with subagents) picking up this project.
Read all of it before starting. Branch: `claude/youthful-dijkstra-nww1vz`
(everything below is merged and pushed there).

## 1. The goal (from the user)

Make the 3D NFL uniform builder **as lifelike as physically possible**:
- every team's jerseys, pants, socks and helmets match the real 2026 uniforms
  in every detail: fonts, numbers, logos, wordmarks, stripes, collars, sleeve
  graphics, nameplates;
- the helmet for every team is a faithful **Riddell SpeedFlex**;
- the player and the way the gear sits on him read as a real NFL player.

How the user wants it run:
- Use subagents, choosing the model per task: **Opus** for 3D modelling, rendering
  engine work and the final visual review; **Sonnet** for well-defined data and
  asset work.
- **Review subagent output critically.** Don't accept "done": look at the
  render next to the reference and send back what's wrong with specific fixes.
- **Be economical with time and tokens.** The user stopped one agent for
  endlessly re-rendering. Render only what verifies a change, batch views,
  never re-render unchanged pieces, and stop once a piece matches.
- **The user has signed off on the cleats.** Don't rework them unless asked.

## 2. Environment and tooling

```bash
npm install
npm run dev                 # local server
npm run build               # must pass before every merge/push
pip install bpy             # Blender as a Python module (5.2 works); needed only to rebuild models
git clone --depth 1 https://github.com/makehumancommunity/makehuman <dir>   # CC0 body data for build_player.py
```

- **Rebuilding models:** see the `build:model` script in package.json
  (`tools/build_player.py --mh <makehuman>/makehuman/data`, `tools/build_helmet.py`,
  then `gltf-transform meshopt`, then copy player.json/helmet.json/helmet_detail.png).
  Cleat geometry lives in `tools/cleat.py`, which build_player.py calls.
- **Screenshots** (headless Chromium, software GL; ~10 s per view):
  `node tools/shoot.mjs --team PIT,PHI --look all --views front,three,back --out <dir>`
  - Options: `--sel helmetId,jerseyId,pantsId,socksId`, `--number 7 --name SMITH`,
    `--skin 0-3`, and `--patch "<js>"` to try data changes against `window.__teams`
    without editing files.
  - Views (see the VIEWS table in the script):
    - body: front, three, side, back
    - helmet: helmet, helmetside, helmetfront, helmetback
    - upper body: chest, backtop, shoulder, numclose, neck, sleeve, sleeveR, backclose, side3, shouldertop
    - lower body: pants, hip, feet, cleatside, cleat34, towel
  - Read the PNGs and compare them against references. PIL contact sheets save time.
- **References**
  - `research/uniforms/<TEAM>.png`: Commons uniform sheets (CC0, ~1500 px).
    Full-resolution originals are listed in `research/download.py`
    (upload.wikimedia.org rate-limits; use `commons.wikimedia.org/w/thumb.php?f=<file>&w=4000`).
  - `research/notes.md`: per-team notes (verify them; they contain errors).
  - `research/logos.md`: every logo PNG with its source, licence, where it's worn and its colours.
- **Gotchas**
  - The container restarts without warning. Subagents must make WIP commits
    after each milestone, and you resume them from what's on disk.
  - Never run `pkill -f vite`: it kills your own shell.
  - The scratchpad is shared, so give each agent its own subfolder.
  - Use worktree isolation for parallel agents and merge their branches yourself.

## 3. What's done (all merged)

| Area | Status | Key files |
|---|---|---|
| **Logo/wordmark library** | Done. 115 PNGs at ~1024 px, sourced from Wikimedia, defringed: primaries, chest wordmarks `<T>_word*`, secondary marks, `nike_swoosh`, `NFL_shield`. | `public/logos/`, `research/logos.md`, `research/build_logos.py` |
| **Rendering engine** | Done. Vapor F.U.S.E. fabric (knit, perforated zones, stretch shoulders, seams, cover-stitch), layered tackle-twill/pressed/embroidered appliqués with stitched edges, sleeve swoosh, embroidered collar shield, jock tag, nameplate fonts, arching and nameplate bars, image wordmarks, stadium lighting. | `src/three/fabric.js`, `applique.js`, `sdf.js`, `garments.js`, `numerals.js`, `fonts.js`, `player.js`, `stage.js` |
| **Player model** | Done (two rounds). NFL build, pro pad silhouette with the pad arch up to the jaw, defined shoulder caps, bloused tuck, thigh/knee pads, belt, wristbands, eye black, painted brows, pore normals. | `tools/build_player.py`, `tools/fix_skin.py`, `tools/paint_brows.py`, `public/models/player.*` |
| **Cleats** | Done; **user approved**. Subdivision-cage Nike Vapor-style cleat traced from product photos: knit sock collar, laces, bladed studs. | `tools/cleat.py` |
| **Helmet** | **Needs another pass, see §5 Step 2.** The user isn't satisfied: there's a visible gap between the top of the facemask and the shell. Current state: Riddell SpeedFlex shell (Flex panel gap, vents, rear bumper, nameplate), SF-2BD-SW facemask traced from Riddell renders with `2EG`/`3BD` variants, four quick-release clips, 4-point chinstrap with hard cup, metallic flake/matte/chrome finishes, true-width stripes. | `tools/build_helmet.py`, `src/three/helmet.js`, `paintHelmet` in `paint.js` |
| **Team accuracy (phase 2)** | **Partial**, see §4. | `src/data/teams.js` |

All new data fields are documented in the header comment of `src/data/teams.js`. Highlights:
- **Numbers and nameplate:** `numStyle` ('twill' or 'pressed'); `plateFont`, `plateArch`, `plateScaleX`, `plateBar`, `plateOutline`.
- **Wordmark:** `word: { img, h }`.
- **Branding:** `swoosh`, `jockTag`.
- **Pants:** `belt`, `hipStyle`.
- **Helmet:** `maskStyle` ('2BD', '2EG' or '3BD'), `nameplate: { bg, fg }`, `cup`, `chinstrap`.

## 4. Phase 2 (team accuracy) status at shutdown

Four agents were stopped mid-run; all their committed work is merged.

| Group | Teams | Done | Not done |
|---|---|---|---|
| AFC East + North | BUF MIA NE NYJ BAL CIN CLE PIT | First data pass on all 8 (image wordmarks for BUF/MIA/NE/BAL/CIN, new numeral styles, swooshes, plate fonts for NYJ/BAL), helmet finishes, MIA mask, BUF/MIA Cold Front and throwback fixes, belts | Helmet pass (true-cm stripe widths, logo placement). PIT needs checking (below). |
| AFC South + West | HOU IND JAX TEN DEN KC LV LAC | First pass on HOU IND JAX TEN DEN KC LAC (new numeral styles, Colts UCLA bars shoulder graphic, sleeve cuffs, Broncos image wordmark, blackletter font) | **LV never audited.** Helmet pass not started. |
| NFC East + North | DAL NYG PHI WAS CHI DET GB MIN | First pass on all 8 (image wordmarks for DAL/PHI/DET/MIN, WAS 2026 cuffs and pants, numeral tuning, pants stripe placement), **helmet stripe widths converted to true cm** | Helmet logo placement and size: it was mid-render of all 22 helmets when stopped. |
| NFC South + West | ATL CAR NO TB ARI LAR SF SEA | First pass on all 8 as WIP (Falcons 2026 redesign, Panthers/Saints/Bucs stripes, collars, outlines, wordmarks; Cardinals, Rams 2026 refresh and alternates, 49ers, Seahawks) | Helmet pass not started; NFC South was labelled WIP. |

Across all 32 teams:
- **`numStyle` is not set on any jersey except two LAR jerseys,** so everything else renders the default twill. Research which 2026 jerseys use heat-pressed numbers versus sewn twill and set it per jersey.
- **Helmet logo `at`/`size` has not been tuned anywhere** except LAC. The new helmet moved the default logo position to `[0.5, 0.08]`.
- **`maskStyle` is unused.** Decide whether some looks should use `3BD`/`2EG`.
- **Helmet stripes:** the new painter draws stripes at their true cm width, about 20% narrower than the old one. Only the NFC East + North teams have been re-measured.

## 5. Remaining work: specific instructions

### Step 1: finish team accuracy (4 Sonnet subagents in worktrees, same groups as §4)

Give each agent the rules in §6 and this checklist for every helmet, jersey, pants, socks and look of its teams:
1. **Jersey:**
   - official base hex
   - numbers: fill, outline, outer outline, shadow
   - numeral glyph shapes compared with the reference sheet
   - `numStyle` (research twill vs pressed)
   - TV-number position
   - collar bands and V shape
   - sleeve stripes, caps, loops and panels
   - chest wordmark: use the real image `<T>_word*` when it is the jersey lettering, and check colour, `@#hex` tint, size and position
   - chest, sleeve and centre logos
   - neck tag
   - nameplate font, scale, tracking, arch and colour, matched to the team's real nameplate
   - `swoosh` colour
2. **Pants:** stripe order and widths in cm, hip logos, `belt` colour.
3. **Socks:** base and bands.
4. **Helmets:**
   - shell hex and finish
   - stripe widths in **true cm**, measured from references
   - logo key, colour, `at`, `size` (real decals are ~12–15 cm) and facing, checked at `helmet` and `helmetside`
   - helmet numbers (`numAt`)
   - mask colour, `maskStyle`, `nameplate`, `cup`
5. **Looks:** the 2026 combinations, notes and debut dates.

Group-specific items:
- **AFC East + North:** PIT. A real Steelers shop photo (Vapor F.U.S.E. Elite)
  showed wider gold sleeve panels with black/white stripes and **upright**
  rounded numerals, while the data draws a thin stripe band at the hem and the
  `steelers` style is italic. Verify against the 2025 sheet and current photos,
  and fix whichever is wrong.
- **AFC South + West:**
  - Audit **LV** from scratch.
  - Check that `TEN_word` (it may be the pre-2026 sword-serif mark) matches the 2026 Titans jersey; otherwise use typeset text.
  - Check the LAC helmet bolt and numbers.
- **NFC East + North:** finish helmet logo placement for all 8 teams. Stripe widths are already done.
- **NFC South + West:**
  - Finish the NFC South (ATL CAR NO TB) helmet pass.
  - The Rams 2026 horn has no image (the procedural `ramhorn` stays), so tune its size and placement.

Each agent reports per team: what was wrong, what changed, and a before/after sheet (home and road, front and back, plus the helmet side).

**You** review each sheet against the reference before merging. Send back anything that doesn't match, with the specific fix.

### Step 2: helmet rework (one Opus subagent in a worktree; can run in parallel with Step 1)

The user still thinks the helmet needs work. The most visible problem is **a gap between the top of the facemask and the helmet shell**. It looks wrong, and on a real SpeedFlex the top bar sits snug under the brim and nameplate bumper. The user specifically asked that this pass use **the same kind of brief that worked for the cleats**. The cleats only came out right after a fresh agent was told why the old approach failed, made to switch modelling methods, and made to trace real product photos. The brief below follows that pattern; give it to the subagent nearly verbatim.

> You are the HELMET specialist. The Riddell SpeedFlex in `tools/build_helmet.py` has been iterated on in place and still doesn't hold up at close range. Your job is to make it unmistakably a SpeedFlex, starting with how the facemask meets the shell.
>
> **Why the current helmet fails (from review of the renders):**
> - **Gap at the top of the mask:** there is a visible gap between the facemask's top bar and the shell/brim. On the real helmet the top bar sits tight under the front bumper and nameplate, following the brim curve within a few millimetres. The two upper quick-release clips sit right at the temples, so the mask reads as fastened to the shell, not floating in front of it.
> - **Chin cup:** it's too large and sits forward of the chin bar in the front view. The real hard cup is smaller, wraps the chin, and sits behind the chin bar.
> - **How it was built:** the mask is a set of hand-placed bar paths and the shell an analytically displaced surface, so the parts don't share a fit. Don't keep nudging constants in the old code; change approach.
>
> **Approach (suggested; use judgement):**
> - **Trace real silhouettes.** Find side, front, top and ¾ product photos of a current Riddell SpeedFlex adult helmet and the SF-2BD-SW mask (Riddell product renders on white are ideal; keep the images in scratch only, don't commit them). Encode the traced profiles as point lists:
>   - the shell's side profile, top outline and front outline
>   - the face-opening edge and the brim line
>   - the jaw extensions and the Flex panel cut line
>   - every bar of the mask in front and side view
> - **Build the shell as a subdivision cage.** Use a low-poly control mesh with a Subdivision Surface modifier, adding creases or support loops where edges must stay crisp (shell lip, Flex panel gap, vent lips, bumper edges). This gives a smooth, sculpted surface with crisp detail edges.
> - **Fit the mask to the shell.** Build the mask from the traced bar curves as round tube (~6.8 mm). Then constrain it to the shell:
>   - the top bar runs along the brim/bumper with a 2–4 mm clearance, measured along its whole length
>   - the upper clips sit on the shell at the temples and the lower clips on the jaw extensions
>   - each bar passes through its clip, with no air between bar, clip and shell
>
>   Check it numerically: report the minimum and maximum top-bar-to-shell distance.
> - **Keep the existing contracts** so `src/data/teams.js` keeps working:
>   - the helmet origin, scale and axes, and the shell UV layout (see the docstring in build_helmet.py)
>   - material names
>   - the `maskStyle` variants `2BD`/`2EG`/`3BD`, as separate meshes
>   - `nameplate`, `cup`, `chinstrap`
>   - the default logo position `[0.5, 0.08]`
>
>   If any of these must change, report exactly what changed.
>
> **Verify:** for each angle (front, ¾, side, plus a top-bar close-up), make a sheet with your render next to the reference photo at the same angle. Check that team logos and stripes still sit right on a few teams (PHI, DAL, PIT, LAC). Iterate until the silhouettes and the mask-to-shell fit match. Then **stop**: the user doesn't want endless re-rendering. Keep the GLB under ~2.5 MB after meshopt. Run `npm run build`, make WIP commits along the way, and report with the sheets.

**Review it yourself before merging.** Look at the top-bar close-up and the front view specifically. If the gap is still visible, send it back.

### Step 2b: small engine fixes (one Opus subagent, or do them yourself)

1. **Cleat knit collar** (`player.js`, `cleatknit` material): it renders greyish on black cleats. Make it follow the cleat colour. **Don't change the cleat geometry.**
3. **Cleat swoosh decal** (`placeDecals` in player.js): it's 0.1 × 0.05 m with the same unmirrored texture on both shoes. Size it like the real lateral swoosh and mirror it so it points forward on both feet.
4. **Jock tag:** it shows above the belt. On a tucked game jersey it sits under the pants. Lower it or hide it by default, and check against game photos.
5. **Towel:** hidden by default (`ACCESSORIES.towel = false`) because it reads as a stiff board. Optional: drape it with Blender cloth simulation (pinned under the belt at the front-right hip, ~12×27 cm) and re-enable it only if it looks real.
6. **Screenshot tool:** the stock `helmetside` view frames off the front of the mask. Widen it.
7. **Low-res throwback crops** (`PHI_tb` is ragged; also `DEN_tb`, `JAX_tb`, `MIA_tb`, `ATL_tb`, `TB_tb`, `NYJ_classic`, `PIT_crest`): find better sources if any exist (see `research/logos.md` "not found").

### Step 3: final realism review (one Opus subagent)

- Render the Home and Road looks of all 32 teams (`three` and `back` views) plus a helmet close-up for each.
- Compare them side by side against the reference sheets, and look across teams for:
  - inconsistencies
  - logos too big or small
  - colours that look wrong under the stadium lighting
  - clipping, seams and decal stretching
- Output a prioritized punch list with exact fixes. Apply the small ones and send larger ones back to a subagent.

### Step 4: ship

- Update README.md: the new fields, the tools (`shoot.mjs`, `cleat.py`, `paint_brows.py`, the logo scripts), and the model pipeline.
- Run `npm run build`, then commit and push to `claude/youthful-dijkstra-nww1vz`.
- Open a PR only if the user asks for one.

## 6. Rules to give every parallel subagent

- **`src/data/teams.js`:** edit only your teams' blocks. Never touch the header, the shared helpers or other teams.
- **`src/three/numerals.js`:**
  - Tune only team-named styles used solely by your teams.
  - Add new styles under your group's anchor comment (`// ── team styles: <group> ──`).
  - Never change shared styles (`block`, `blockRound`, `square`, `chamfer`, `round`, `futura`, `italic`, `angular`); make a team-named copy instead.
  - New glyph parameters must be opt-in, with the default keeping current behaviour.
- **`src/three/fonts.js`:** add fonts and letter mappings under your group's anchor comments. If you add a Google Font, append it to the single fonts `<link>` in `index.html`.
- **Engine files:** don't edit them (`player.js`, `garments.js`, `applique.js`, `fabric.js`, `helmet.js`, the Blender scripts) during a data pass. Report engine bugs precisely instead.
- **Logos:** never draw or forge team logos. Use the PNGs in `public/logos`. Typeset text and procedural graphics already in code are fine.
- **Commits:** WIP commit after each team, with your session's attribution trailer.
- **Rendering:** render economically (see §1).

## 7. Merge procedure (for you)

- Each agent works in a worktree branch. After review:
  `git merge --no-ff <branch>`. Team branches usually merge cleanly thanks to the anchor comments.
- Before pushing:
  - Run `npm run build`.
  - Check that every look references existing pieces and every logo key has a file in `public/logos/`.
  - Render a quick sanity check of four teams, one per group, to catch runtime errors.
- Push with `git push -u origin claude/youthful-dijkstra-nww1vz`.
