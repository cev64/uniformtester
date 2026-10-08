# Jersey backs: reference measurements (P1b steps 1-2)

Scope: what the back of a real 2024-2026 NFL on-field jersey looks like, measured from straight-on photos, so the engine
defaults (`placeDecals`, "Back: nameplate and number") and the per-team data can be corrected. Nothing in the repo was edited
except this file. Date of research: 2026-10-08.

Photo sources and how to find them again
- `G<id>`: Getty Images editorial preview (612 px, watermarked, used for measuring only, not stored in the repo).
  Open `https://www.gettyimages.com/detail/<id>`. Local copy: `/tmp/claude-0/-home-user-uniformtester/3134f4ef-56ab-5b6b-8f22-e55aa0826c4e/scratchpad/p1b/<TEAM>/<id>.jpg`.
  Getty captions that work as search phrases: "a rear view of <player> of the <team>", "the back of <player> of the <team> jersey",
  "detail view of rear nameplate".
- `C:` Wikimedia Commons file, `https://commons.wikimedia.org/wiki/File:<name>`.
- `ATL official`: https://uniforms.atlantafalcons.com/ (2026 reveal, studio back photo "Backplate", "4 Details").
- `BAL official`: https://www.baltimoreravens.com/news/ravens-new-uniforms-jerseys-helmets-next-flight-collection-midnight-purple-matte-black-wings-talon-stripes
  (images on static.clubs.nfl.com; only collar/number crops, no full back).
- Retail pages (nike.com, fanatics, nflshop, dicks) returned 403/404 to the proxy, so no retail "back" product shots were used.

## (a) League-wide baseline

Definitions (all measured in pixels on the photo, then divided, so scale-free)
- `H` = back number height, outer edge of the outline, top to bottom.
- `W` = shoulder width: the two armhole/sleeve-cap seams where the sleeve meets the yoke, on the line of the top of the shoulders.
- `plate` = nameplate letter height (outer edge incl. outline). `gap` = plate bottom to number top.
- `c>p` = back neck seam (jersey's top edge at the centre back, outside edge of the thin collar band) to plate top.

| photo | jersey | W px | H | plate | gap | c>p | H/W | plate/H | gap/H | c>p/H |
|---|---|---|---|---|---|---|---|---|---|---|
| G2190257223 ALLEN 17 | BUF road white | 208 | 110 | 26 | 16 | 19 | 0.53 | 0.24 | 0.145 | 0.17 |
| G2180097370 MAHOMES 15 | KC road white | 273 | 152 | 29 | 7.7 | 12.5 | 0.56 | 0.19 | 0.05 | 0.08 |
| G2194644568 MAHOMES 15 | KC home red (number cut off, H est. from width) | - | ~155 | 35 | 6.6 | 9.4 | - | 0.23 | 0.04 | 0.06 |
| G1964023684 CHASE 1 | CIN road white | 222 | 124 | 24.5 | 11.7 | 17 | 0.56 | 0.20 | 0.09 | 0.14 |
| G2236326449 WILLIAMS 18 | CHI road white | 232 | 127.5 | 25.7 | 11.1 | 11 | 0.55 | 0.20 | 0.09 | 0.09 |
| G2172282120 GOFF 16 | DET home blue | 220 | 142 | 30 | 10 | 21 | 0.65 | 0.21 | 0.07 | 0.15 |
| G2190257482 GOFF 16 | DET alt black (number cut off, H est.) | 286 | ~190 | 43 | 13.5 | 19 | 0.66 | 0.23 | 0.07 | 0.10 |
| G2174003791 JONES 8 | NYG road white | 200 | 106.7 | 21 | 7.3 | 6 | 0.53 | 0.20 | 0.07 | 0.06 |
| G1244045141 NGAKOUE 91 | IND home blue (linebacker, bunched collar) | 295 | 143 | 30.5 | 15 | 38.5 | 0.49 | 0.21 | 0.105 | 0.27 |
| G2183103820 MAYFIELD 6 | TB road white (right side cropped, no W) | - | 141.8 | 31.9 | 12.5 | 17.4 | - | 0.225 | 0.09 | 0.12 |
| ATL official "Backplate" poster (FALCONS 26) | ATL home red 2026 | 380 | 228 | 55 | 15 | 22 | 0.60 | 0.24 | 0.07 | 0.10 |
| **median** | | | | | | | **0.55** | **0.21** | **0.07** | **0.10** (0.09 without IND) |
| mean (range) | | | | | | | 0.57 (0.49-0.66) | 0.215 (0.19-0.24) | 0.08 (0.04-0.145) | 0.12 (0.06-0.27) |

Noise: +/-2 px on 100-150 px quantities, plus perspective (long-lens shots from behind and above, players turned a few degrees).
The ratios that matter (plate/H, gap/H, c>p/H) are tight across teams and jerseys; H/W is the loosest because the seam points are
hard to see under pads (DET 0.65 is probably my W reading being narrow, not a bigger number).

Nameplate width (7-8 letter names), plate width / W:
- WILLIAMS (8) 0.52, MAHOMES (7) 0.52, NGAKOUE (7) 0.51. Long names are squeezed to about half of the shoulder width.
- Short names keep a natural letter pitch of about 0.075-0.08 W per letter: ALLEN (5) 0.37, JONES (5) 0.38, CHASE (5) 0.41, GOFF (4) 0.31.
- Exception: ATL 2026 "FALCONS" (7) is 0.63 W; the new Falcons plate is large and widely tracked.
- ARI "HARRISON JR" (11 chars, G2188532023, 3/4 view) is compressed hard, nearly across the whole yoke.

Back number width (two digits) / H is a font property, not a league constant: KC 0.94, DET 0.97, IND 1.1, ATL 1.2, CHI (condensed) 0.69.

### What this means for the engine (number H = 0.25 m = 10 in, W then about 0.45 m)

| quantity | real, as a fraction of H | in metres at H = 0.25 | engine now | verdict |
|---|---|---|---|---|
| number height | 1 | 0.25 | 0.25 | correct (if model seam-to-seam is about 0.45 m, check on a render) |
| nameplate letter height | 0.21 | 0.052 | `plateH` 0.05 | correct |
| plate top below back neck seam | 0.10 | 0.025 | 0.075 (centre `neckY-0.1`, half 0.025) | plate about 5 cm too low |
| plate bottom to number top | 0.07-0.08 | 0.019 | 0.05 (centres 0.2 apart: 0.2-0.125-0.025) | gap about 3 cm too big |
| back neck seam to number top | 0.10+0.21+0.075 = 0.385 | 0.096 | 0.175 (`neckY-0.3` minus 0.125) | number about 8 cm too low |
| plate width, long name | 0.52 W | about 0.235 m | `plateScaleX` default 1 | needs a width cap, then `plateScaleX` = cap / natural width |

If the back neck seam is the bottom edge of the collar band (player.json: jersey top z1 = 1.7529, collar width 0.03, so seam z = 1.7229, `neck01` z = 1.7215, i.e. seam is about `neckY`):
plate centre = `neckY - 0.051`, number centre = `neckY - 0.2175`.
If the seam is the jersey's top edge (z1, about `neckY + 0.031`): plate centre = `neckY - 0.020`, number centre = `neckY - 0.1865`.
Either way the current `neckY-0.1` / `neckY-0.3` are too low; the exact offsets must be fitted on a `back` render with the same
five ratios (open question 1).

Back neck shape from the photos: a nearly flat, slightly rounded edge about 0.05-0.08 H (1.3-2 cm) above the shoulder-point line; the
collar band is thin (about 1.5-2 cm) and is the jersey colour on most teams, with a contrasting band only on a few (see table). There
is no deep U at the back. No visible yoke seam on the torso on any Nike jersey; the only back panels are the shoulder/sleeve-cap graphics.

Nameplate construction: on every Nike Vapor FUSE jersey the name is on a separate sewn/heat-sealed bar. It is only visible when the
edge shows: DET (lighter blue), LAR (cream on white), WAS (darker burgundy), DEN (darker orange), NE (navy with darker border), BUF
(faint), IND/LV/KC (not visible). Bar height is about 1.15-1.3x the letter height, and the bar is about 1.1x the letters' width.
Default `plateBar` could stay on for teams where it shows and off otherwise.

Back-collar tags, what is actually visible from behind (about 40 back photos checked):
- Exterior marks exist only on: BUF (small buffalo logo, about 0.12 W wide, centre about 0.08 H below the seam), LAR (yellow rounded
  rectangle with blue "LA", about 0.1 W, touching the collar), WAS (round crest, about 0.15 W, just under the collar, 2024 design),
  HOU (tiny bull-head mark at the collar). Every other team seen (KC, CIN, CHI, DET, NYG, NYJ, PHI, TB, IND, LAC, SEA, DEN, DAL, PIT,
  GB, MIN, NO, SF, NE, CAR, ARI, MIA, CLE, JAX, LV) shows a plain collar from behind.
- The phrase tags ("DIRTY BIRDS", "KEEP POUNDING", "BIRD GANG", "WE ARE ALL PATRIOTS", "PLAY LIKE A RAVEN", ...) are printed on the inside
  of the back neck; they show in front views (ATL official "4 Details" photo shows "DIRTY BIRDS" inside the back collar, seen from the
  front above the V) and in the collar crops on the Ravens page, not on the outside back. Whether `neckTag` should be drawn on the
  exterior at all is open question 3.

## (b) Per-team notes

Legend: `photo` = seen in a photo of that jersey (id). `old` = older but same design. `K` = not photographed, from memory/other
sources, unverified. "same as front" = back number colours match the front, as far as the photo shows. No team showed a back number
that differs from its front in the photos (PIT's plate differs from its number, see below). Arch = vertical rise of the middle
letters as a fraction of letter height (eyeballed; strong values are reliable, small ones are +/-0.05). "Bar" = visible separate nameplate bar.

Baseline plate = straight, tracking about 0.05, jersey-matched bar, colours = number fill, no outline. Rows list deviations.

| team | jersey (photo ids) | nameplate | back number | collar tag / shape | back graphics, sleeves from behind |
|---|---|---|---|---|---|
| BUF | Road white (G2190257223, 2190256902, 2190257791; C:Bills-huddle-close-up-1-vs-Bucs-2025.jpg) | ALLEN: condensed grotesque (Bills custom, narrower than the default block), straight, royal #00338D, no outline; bar faint | royal fill, red outline, thin navy outer; same as front; H/W 0.53 | small buffalo logo (red streak + royal) centred under the collar; thin royal collar band | sleeve bands (royal/red/white) go round the upper arm and show as short bands at the sleeve caps |
| BUF | Red alt (G2254071601, 2254072471) | white letters, no outline | white fill, royal outline | none seen | same sleeve bands |
| BUF | Home royal | no photo; K: white letters, no outline | K: white/red/navy as front | K | |
| MIA | Road white (G2149419281, small) | aqua letters (outline not resolved), straight | aqua fill, orange outline; same as front | plain | aqua sleeves are a player undershirt, no sleeve stripes |
| MIA | Home aqua | no photo | K | K (repo `MIAMI` neckTag unverified) | |
| NE | Home navy (G2191917821) | MAYE: white, no outline, wide custom block, straight; bar visible: navy rectangle with a darker border | white fill, red outline; same as front | plain navy collar | red/white/red shoulder stripes cross the shoulder cap and are visible from behind as two angled bars either side of the neck |
| NE | Road white | no photo | K | K | K |
| NYJ | Home green (G2221676892, 2221676827, 2221678482, 2221676697) | RODGERS: white, no outline, Jets squared block, straight | white fill, no outline | plain | sleeve detail not resolved |
| NYJ | Road white (G1964276656, 1964275015) | dark green #125740, no outline, straight | dark green, no outline | plain | two green bars on each sleeve cap, visible from behind |
| BAL | none found (Getty has no Ravens rear shots; team page has collar crops only) | no photo; the repo uses a serif/roman plate, unverified | 2026: number outline is Midnight Purple instead of the gold drop shadow (official text) | white road: "BALTIMORE" inside the collar; black alt: small white "RAVENS" at the back neck above the number (official crop r4); "PLAY LIKE A RAVEN" inside | collar designed as raven wings (official text) |
| CIN | Road white (G1964023684, 1964033129, 1964027384; Oct 2023) | CHASE/BURROW: black, no outline, tall Bengals block, straight | black fill, thin orange outline; same as front | plain | black tiger-stripe flashes at each shoulder cap show from behind |
| CIN | Alt black (G2183972915) | white letters, no outline | light grey fill, orange outline | plain | orange tiger stripes at the shoulders |
| CIN | Home orange | no photo | K | K | |
| CLE | Home brown (G2174003559) | WATSON: white, no outline, straight | white, no visible outline | plain | none |
| CLE | Road white | no photo | K | K | |
| PIT | Road white (G2253170705, 2253168631) | RODGERS/METCALF: gold with heavy black outline, Steelers gothic, straight to very slight arch | black fill, no gold outline (differs from the plate: plate and number are different colours) | plain white collar | gold sleeves with black/white stripes round the upper arm |
| PIT | Home black (G2173446525, small) | gold | gold | plain | |
| HOU | Road white (G2194644524) | STROUD: black, no outline, Texans custom block with notched corners, straight | black fill, red outline | tiny red/navy bull mark at the collar | black/red stripes across the shoulder tops visible from behind |
| HOU | Home navy (G2149911775) | TUNSIL: white, no outline | white fill, red outline | same tiny mark | same shoulder stripes |
| IND | Home blue (G1244045141; 2021) | NGAKOUE: white, no outline, straight, Colts block | white fill, no outline | plain blue collar | two white vertical bars on each shoulder (they run from the cap down the back of the upper arm) |
| IND | Road white (G1191798387; 2019, old) | BRISSETT: royal, straight | royal, no outline | plain | same shoulder bars |
| JAX | Home teal (G2252096400) | LAWRENCE: white with thin black outline, Jaguars custom, arch about 0.12, tracking looser than default | white fill, black outline (K gold) | black collar band | none |
| JAX | Road white | no photo | K | K | |
| TEN | Road white (G1236316282, 2021, **old design**), Home light blue (G1195118836, 2019, **old design**) | navy letters with light-blue outline (road); navy (home); straight | navy fill; same as front | plain | Titans redesigned in 2023 and again for 2026 (Oilers-inspired, official text); no current back photo |
| DEN | Home orange (G2177794100; 2024) | NIX: white with navy outline, tall condensed block, straight; bar visible (darker orange rectangle with seam lines) | white fill, navy outline | plain | none |
| DEN | Road white (G2149882282; 2022) | WILSON: navy with orange outline, straight | navy fill, orange outline | plain | navy/orange stripe at the sleeve |
| KC | Home red (G2194644568, 2194644780, 2196278140) | MAHOMES: white with gold outline, rounded Chiefs block, straight | white fill, gold outline; same as front | plain; inner white lining shows at the back neck | white/gold bands wrap the upper sleeve |
| KC | Road white (G2180097370, 2183103648) | red with gold outline | red fill, gold outline | plain | red/gold bands wrap the sleeve |
| LV | Home black (G2191255720, 2191255782) | BOWERS/McCORMICK: white, no outline, condensed block, straight; "Mc" has a raised small c | silver/white mesh numerals, black outline | plain | none |
| LV | Road white | no photo (repo: black letters with silver outline, unverified) | K | K | |
| LAC | Road white (G2155219745, 2191917732; 2024) | BAUMAN: royal, probably gold outline, slight arch (about 0.1), Chargers custom | royal fill, gold outline | plain | gold lightning bolts sit on each shoulder cap and show from behind (about 0.15 W) |
| LAC | Home powder | no photo | K | K | bolts as above |
| DAL | Road white (G1793661291, 1825327334, 2149898856) | PRESCOTT/VAUGHN: royal blue, slab-serif look (Cowboys custom), no outline, straight | royal fill, no outline | plain | navy/blue sleeve stripes (3) round the upper arm, visible at the back |
| DAL | Home navy | no photo | K | K | |
| NYG | Road white (G2174003791 etc., 2024) | JONES: red, no outline, Giants block, straight; the plate is a plain letter set (no bar visible) | red fill, no outline | plain | three red bars round each sleeve |
| NYG | Home blue (G1966822533 2023; G1018248608 old) | BARKLEY: white, no outline (low confidence), straight | white, red outline (low confidence) | plain | |
| PHI | Road white (G2186436692, 2254072278, 2253695296) | BARKLEY/HURTS: midnight green with black outline, slab-serif Eagles font, straight to arch about 0.05 | green fill, black outline; wet shots read black | plain; dark rib at the neck | sleeve cap shows black (sleeve stripes not resolved) |
| PHI | Home green | no photo | K | K | |
| WAS | Home burgundy (G2166255224; 2024 design, redesigned for 2026) | EKELER: gold, no outline, flat block; bar visible (darker burgundy rectangle) | gold mesh numerals, no outline | round crest tag (about 0.15 W) just under the collar | gold/white sleeve stripes |
| WAS | Road white | no photo; 2026 redesign unverified | K | crest tag may have changed in 2026 | |
| CHI | Road white (G2236326449, 2236322977) | WILLIAMS/SWIFT: navy with orange outline, Bears block (slightly condensed), straight | navy fill, orange outline, narrow digits (18 is 0.69 H wide) | plain | orange/navy bands round each sleeve |
| CHI | Home navy | no photo | K | K | |
| DET | Home blue (G2172282120, 2172282154, 2188730429, 2253168514) | GOFF: white, no outline, Lions custom (squared sans), straight; bar clearly visible, lighter blue, about 1.3x letter height | white fill, silver outline; same as front | plain; no tag seen | silver/white stripes on the sleeves |
| DET | Alt black (G2190257482, 2190255741, 2190268939) | white/silver letters, no outline; no bar visible on black | Honolulu blue fill, silver outline | plain | blue sleeve caps with silver stripe |
| DET | Road white | no photo | K | K | |
| GB | Road white (G2255613498, 2249081830) | LOVE: dark green, no outline, Packers block, straight | green fill (K) | plain white collar | green/gold bands round the upper sleeve |
| GB | Home green | no photo | K | K | |
| MIN | Home purple (G2166317276, 2166011253, 2166009878) | JEFFERSON/MURPHY JR: white/bone letters, thin or no gold outline, condensed Vikings block, arch about 0.1 for the long name | white/bone fill, gold outline | plain | cream shoulder-cap wedge with a gold stripe under it, visible from behind |
| MIN | Road white | no photo | K | K | |
| ATL | Home red 2026 (ATL official Backplate and 4 Details) | **"FALCONS" in place of a name**: white, black outline, new flat-topped sans, wide tracking, straight; plate letter height 0.24 H; 7 letters = 0.63 W | white fill, black outline | "DIRTY BIRDS" printed inside the back collar (not on the outside); collar is a flat black band | none at the back |
| ATL | Road white 2026 | no photo (red numbers per Fox) | K | K | |
| CAR | Road white (G1730206684, 2149909947; 2023-24) | YOUNG: black with a thin cyan outline, slight arch (about 0.1), Panthers custom | black fill, cyan outline; same as front | plain | sleeve detail not resolved |
| CAR | Home black | no photo | K | K | |
| NO | Road white (G2225877992) | YIADOM: black, no outline, strong arch (about 0.3), Saints italic-ish custom | gold fill, black outline | plain | black/gold sleeve stripes round the upper arm |
| NO | Home black | no photo | K | K | |
| TB | Road white (G2183103820, 2242611732, 2183103773) | MAYFIELD: black, no outline, straight; plate colour = the number's outer outline, not its fill | red fill, orange inline, thick black outer outline | plain; helmet bumper carries the slogan | black band at the sleeve cap (rest not resolved) |
| TB | Home red (C:Bucs-defense-huddle-vs-Bills-2025.jpg) | DENNIS: white, thin dark outline, straight | white fill, thin dark outline | plain | |
| ARI | Road white (G2188532023, 3/4 view only) | HARRISON JR: red, thin black outline, narrow Cardinals block, heavy compression for 11 chars | red fill, black outline | plain | "CARDINALS" wordmark on the sleeve, no stripes |
| ARI | Home red | no photo | K | K | |
| LAR | Road white (G2171728602, 2171974308) | TURNER/STAFFORD: royal, no outline, rounded Rams block, straight; bar visible (cream rectangle) | royal fill, no outline | **yellow "LA" rounded-rectangle tag at the collar** (2026: "LA" is now yellow, chest tag removed) | yellow/royal sleeve-cap panels show from behind |
| LAR | Home royal | no photo | K | K | |
| SF | Home red (G2180096945, 2180096926) | TAYLOR JR: white, no outline, flared-serif Niners font, arch about 0.1-0.15 | white fill, gold outline | plain | white bars round the sleeve (colour of the inner stripe not resolved) |
| SF | Road white | no photo | K | K | |
| SEA | Road white (G2175963532, 2175960480) | LOCKETT/SMITH: navy, no outline, straight to slight arch | navy fill, action-green outline (mesh navy fill) | plain navy collar; helmet bumper "SEATTLE" | the wing band does not cross the back; at each shoulder top a navy wedge shows, i.e. the band wraps over the shoulder and stops at the seam |
| SEA | Home navy (G2182843185) | WILLIAMS: wolf-grey/white, no outline, slight arch about 0.05 | wolf-grey fill, action-green outline | plain; the "12" tag is not visible in the photos (hair/helmet cover it) | action-green wedge at each shoulder top (the wing accent seen from behind) |

Alternates and Rivalries sets were not covered beyond the BUF red, CIN black, DET black and ATL/BAL 2026 items above.

## (c) Open questions

1. **Seam vs `neckY`.** The corrections need the real offset between the model's back neck seam and `J.neck01.y`. From `player.json` the
   seam is at or about 0.03 m above `neckY`, but this has not been checked on a render. Measure the same five ratios on a `back` render and
   solve for `plateAt` and the number offset. Also confirm the model's shoulder seam-to-seam is about 0.45 m (H/W of 0.55 depends on it).
2. **H/W spread (0.49-0.66).** Seam points are subjective under pads. If the model's seam-to-seam is much wider or narrower than 0.45 m,
   trust plate/H, gap/H and c>p/H (tight) rather than H/W.
3. **Exterior vs interior back-collar text.** The photos show exterior marks only for BUF, LAR, WAS, HOU. Decide whether `neckTag` phrases
   should be drawn small on the back neck (as now), moved to the inside of the collar, or limited to the four logo tags.
4. **No back photo for 22 jerseys** (listed "no photo" above), including all of BAL, and the current (2026) TEN and WAS designs.
   Getty rear-view coverage is thin outside DET, KC, BUF, PHI, TB, NYG-at-CLE games; the 2026 reveals for TEN, WAS, PHI, MIN, GB, CHI, DET
   may have back photos on the team sites (only ATL and BAL were pulled).
5. **Plate arch values** for NO (0.3), SF, JAX, MIN, LAC, CAR, PHI are eyeballed from 600 px previews; a close-up is needed before setting
   `plateArch` precisely. All other teams looked straight.
6. **Number digit widths** per team font were not measured (only a few samples above), so the `font`-specific widths are not constrained.
7. **Whether back numbers ever differ from the front** (e.g. throwbacks like PIT 1933): none of the current-season photos show it;
   throwbacks and Rivalries sets were not photographed.
8. **Sleeve stripes**: from behind they simply continue round the arm on every team seen; no team shows a back-only change. Whether the
   engine's `sleeve.stripes` ring fully round the arm should be checked on the render.
9. **PIT plate/number colours differ** (gold/black plate, black number); TB's plate is the number's outer outline colour (black), not its
   fill. `plateColor` already supports this, but defaults to the number fill.
