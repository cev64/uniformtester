// NFL uniform closet data, 2026 season.
//
// Sources: each team's current uniform sheet on Wikipedia / Wikimedia Commons
// (research/uniforms/*.png, CC BY / CC BY-SA 4.0, not CC0), team announcements for 2026 debuts, and
// back-of-jersey conventions (nameplate, back-collar tags) from team sites.
//
// Units: stripe widths are centimetres on the real garment, listed edge to
// edge; `null` is a gap in the base colour. `debut: 'YYYY-MM-DD'` marks a
// piece or look announced for a date; before then the UI flags it as not yet worn.
//
// Jersey fields
//   num: [fill, outline, outer outline]      font: number font key
//   collar: [[colour, cm], ...] bands from the neck edge outward
//   tv: 'shoulder' | 'sleeve' | null         TV numbers
//   sleeve: { cap, top: [colour, cmFromHem, fadeCm], stripes, from, pattern }
//             top[2] (optional): the top colour breaks up into halftone dots over that many cm
//             below its edge (Rams Midnight cap)
//   loop / loopPattern / loopAt: stripes around the top of the arm (UCLA, horns, bolts)
//   loopWeave: { c, i, cell }: carbon-fibre twill weave over loop stripe i (default the widest),
//             tows highlighted in c (default '#3A3D42'), cell size in cm (default 0.3) (DET Concrete caps)
//   shoulder: decal on each shoulder (drawn mark { t: 'star'|'bolt'|'bars'|'peak'|... } or { img }).
//             size: decal width in metres (default 0.1). at: where it sits on the pad cap:
//             'front' (default; down the front of the shoulder from the cap toward the armpit),
//             'top' (crown of the cap like shoulder TV numbers, vertical axis running front to back),
//             'outer' (outside of the upper sleeve under the cap), 'cuff' (outside of the sleeve at
//             the hem, the mark's outer edge toward the hem). along: how far down the arm an
//             'outer' mark sits (0 = shoulder joint, 1 = elbow); lift: upward tilt of its projection
//             (default 0.12; higher wraps it over the top of the cap); minDot (default 0.2): lower
//             lets it run onto more steeply angled cloth.
//             t: 'sleevehorn' (Rams 2026 horn curl round the swoosh): fill, line (thin ridge line in
//             the top limb, the sleeve colour on the real jerseys), lineW (default 0.022 of size),
//             weight (thickness, default 1), outline / outlineW (optional edge).
//   panels: { yoke, sides, vstripes, wing }  word: chest wordmark
//             wing: [band, accent] Seahawks wing panel: a band across the chest at the V that sweeps
//             down the front of each sleeve to the hem, plus an accent wedge at the outer sleeve end
//             (drawn in front view and projected over torso and sleeves; accent optional)
//   collarFeathers: { c, n = 6 } chevrons of small feathers on the collar either side of the V (Seahawks)
//   chestLogo / sleeveLogo / centerLogo: logo image keys (public/logos)
//   chestLogoAt: [across, down] metres: chest logo / chestPatch centre, across toward the player's
//             left from the centre line and down from the neck joint; default [0.11, 0.16].
//   chestLogoSize: chest logo / patch width in metres (default 0.07 logo, 0.075 patch).
//   sleeveLogoSize: sleeve logo width in metres (default 0.075).
//   neckTag: text on the back of the collar ({ s, c, bg, font, style, h, at }), or a logo tag
//             { img: logo key, w: width in metres (default 0.05), style } (outside only).
//             h: letter height in metres (default 0.016, 0.012 over 12 characters).
//             at: omitted = printed on the outside just under the back neck seam (real only for
//             BUF, LAR, WAS, HOU logo tags: research/backs.md); an outside tag pushes the nameplate
//             down. 'inside' = printed on the inner back neck (most phrase tags; seen from the front
//             through the neck opening, if at all). 'hidden' = not drawn.
//
// Back of the jersey (defaults from research/backs.md; all optional per jersey):
//   Layout, top down: back neck seam (neckY - 0.03 on the model) → nameplate top at 0.10 x the
//   back number height → name letters (plateH) → gap 0.07 x number height → back number
//   (heights to the outer edge of the outlines; the engine uses 0.08 / 0.09 x H, which reads as
//   0.10 / 0.07 in the `back` view because the upper back slopes).
//   numBack: [fill, outline, outer outline] back number colours when they differ from the front
//             (PIT 1933 throwback: white front, black back). Also the default nameplate colour.
//   numBackH: back number height in metres, default 0.25 (10 in).
//   plateAt: nameplate top below the back neck seam in metres (default 0.08 x the number's outer height,
//             or below an outside neckTag). The number follows the plate.
//   plateMaxW: widest the name may be, in metres (default 0.235, about half the shoulder width);
//             longer names are condensed with plateScaleX, as on real jerseys.
//   numBackMaxW: widest the back number may be with its outlines, in metres (default 1.05 x its
//              outer height); wider numbers are condensed so they stay inside the back panel.
//   numMaxW: the same cap for the front number (default 1.05 x its outer height), so wide sets
//              (88 in a wide font) never crowd the chest.
//   plateText: fixed nameplate lettering in place of the player's name (e.g. 'FALCONS').
//   backShoulder: { shapes: [[colour, [[x, y], ...], round], ...], out, lift } shoulder graphics seen
//             from behind (the front projections stop at the sides). Polygons for the player's left
//             shoulder (mirrored), x = metres out from the spine, y = metres above the shoulder joint:
//             the cap top is about y 0.09 at x 0.18 and y 0.06 at x 0.29, the sleeve's outer edge
//             x 0.33 at y 0. round = corner radius (m). Projected from behind, tilted out (`out`,
//             default 0.45) and up (`lift`, default 0.35) so it wraps the cap and the outer sleeve.
//             panels.wing adds a default back view (accent wedge over the cap, band on the outer sleeve).
//
// Optional jersey fields for the cloth renderer (all have defaults):
//   numStyle: 'twill' | 'pressed'   how numbers, name and wordmark are applied.
//              'twill' = sewn tackle twill (layered cloth, zig-zag stitched
//              edges, matte); 'pressed' = heat-applied film (flat, thin edge,
//              slightly glossy, knit shows through). Also 'embroidered' |
//              'print'. Default 'twill', or 'pressed' when numPattern is set.
//   plateFont: font key (src/three/fonts.js) for the nameplate; default
//              follows the numeral style (letterFont). `plate` is an alias.
//   plateArch: vertical arch of the nameplate as a fraction of the letter
//              height (0.25 = middle letters ride 25% higher); default 0.
//   plateTracking: letter spacing (fraction of font size), default 0.05.
//   plateScaleX: horizontal scale of the name letters, default 1.
//   plateH: name letter height in metres, default 0.055 (about 0.21 x the back number's outer height).
//   plateColor / plateOutline: name fill (default num[0]) / [outline, outer].
//   plateO: [outline, outer] widths as fractions of the letter height (default [0.07, 0.05]).
//   plateStyle: finish of the name letters, default numStyle.
//   plateBar: true: a separate sewn-on nameplate strip, always in the jersey colour (the same cloth),
//              snug round the letters, with a fine lock stitch at its edge.
//   sleeveText: { L, R, c: [fill, outline], font, h }: letters on the outside of each sleeve;
//              h = letter height in metres (default 0.065).
//   word.img: image wordmark instead of text, a public/logos key ('KEY' or
//              'KEY@#hex' for a one-colour version); word.h = its height in
//              metres (default 0.045) or word.w = width. word.style = finish
//              (default 'twill', 'pressed' when numStyle is 'pressed').
//              Text wordmarks also take word.arch and word.scaleX.
//   swoosh: sleeve swoosh colour, or false; default white on dark jerseys,
//              the number colour on light ones.
//   sweep: { t: 'raglan', c, edge } | { t: 'horn', c }: shoulder graphic across the
//              torso/sleeve seam (Panthers raglan panel, Rams horn).
//              lift: upward tilt of the projection (default 0.12; higher lays it over the shoulder top).
//              { t: 'stripes', bands: [[colour, cm], ...], front, back, cut, lift, out }: a group of
//              parallel stripes (bands listed from the neck side out) that comes up the front along the
//              sleeve seam, over the top of the shoulder pad and down the back (Patriots). Each half's
//              centre line is [x0, x1, y1] in metres (x out from the centre line, y above the shoulder
//              joint, as in backShoulder): vertical over the pad top at x0, curving to its end at
//              [x1, y1]; defaults front [0.205, 0.165, -0.09], back [0.205, 0.17, -0.03]. The ends are cut
//              along a line rising outward by `cut` (m per m, default 0.25). Projected from the front and
//              from behind with upward tilt `lift` (default 0.35) and outward tilt `out` (default 0);
//              replaces a `loop`. A jersey with its own backShoulder shares that projection.
//              { t: 'bullhorn', c, line, tip: [a, cm] }: Texans sleeve stripe, painted into the sleeve
//              texture with the jersey's `loop` band: on the front both band edges sweep up into a
//              horn point (tip: a = fraction round the arm from the outer side, default 0.36; cm above
//              the band top, default 8) and `line` (a loop colour) follows the top edge as a thin
//              crescent; below the horn the front is the jersey colour.
//   jockTag: true or { size, bg, fg } opts in to the woven tag at the lower left
//              front; off by default (a tucked game jersey hides it).
// Optional pants fields: swoosh (colour of the hip swoosh), hipStyle (finish
//   of the hip logos, default 'pressed').
// Helmet logo: { img: key, faces: 'left'|'right' } uses the real team mark;
// `faces` says which way it points so it can face forward on both sides.
// Helmet logo size (decal width in metres) and at ([up, back] on the shell)
//   apply to image and drawn marks (t: 'horn', 'ramhorn', 'wing', ...) alike.
// Helmet nameplate: { bg, fg, text } colours the front bumper; text replaces 'Riddell'.
//   nameplate.rear: { bg, fg, text } colours the rear bumper; text replaces the moulded SPEEDFLEX.
// Helmet rearLogo: { img | t, size, up }: a mark at the back centre of the shell above the rear
//   bumper and NFL shield; size = width in metres (default 0.06), up = aim tilt (default 0).
// Helmet logo t: 'bullhorn' (Texans Battle Red horn): fill, line (the thin inner crescent).
// Helmet logo t: 'text' also takes scaleX (letter width), shift: [front, down] (mark units),
//   star (colour) with starAt: [front, down, radius] (mark units; default centred, 0.08).
// Helmet stripe entries may take a third value, [colour, cm, grout]: the stripe is tiled with
//   grout lines of that colour across it every 1.25 cm (Texans Rivalries street tiles).

const W = '#FFFFFF';
const K = '#0E0F11';

const sym = (...s) => [...s, ...s.slice(0, -1).reverse()];
const rep = (c, w, gap, n, g = null) => Array.from({ length: n * 2 - 1 }, (_, i) => (i % 2 ? [g, gap] : [c, w]));
const talon = (c) => [[c, 0.8], [null, 0.6], [c, 0.8], [null, 0.6], [c, 0.8]];
const strings = (band, str, n = 6) => [[band, 0.6], ...rep(str, 0.25, 0.35, n, band), [band, 0.6]];

export const TEAMS = [
  // ───────────────────────────── AFC EAST ─────────────────────────────
  (() => {
    const R = '#00338D', RED = '#C60C30', NAVY = '#0C2340', GRAY = '#8E9194';
    const logo = { img: 'BUF', faces: 'left', size: 0.14, at: [0.46, 0.22] };
    return {
      id: 'BUF', city: 'Buffalo', name: 'Bills', conf: 'AFC', div: 'East',
      colors: [R, RED, W], font: 'block',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: '#E4E6E8', stripe: sym([R, 0.8], [RED, 2.2]), logo },
        { id: 'red', name: 'Red', tag: 'Alternate', shell: RED, finish: 'gloss', mask: '#E4E6E8', stripe: sym([W, 0.8], [R, 2.2]), logo },
        { id: 'charge', name: '"The Charge"', tag: 'New 2026', debut: '2026-09-27', shell: R, finish: 'metallic', mask: R, stripe: null,
          logo: { t: 'streak', fill: RED, stroke: W, size: 0.26, at: [0.45, 0.2] } },
        { id: 'coldfront', name: 'Cold Front', tag: 'Rivalries', shell: W, finish: 'gloss', mask: W, stripe: null,
          logo: { img: 'BUF@#A9B0B8', faces: 'left', size: 0.14, at: [0.46, 0.22] } },
      ],
      jerseys: [
        { id: 'royal', name: 'Royal Blue', tag: 'Home', numStyle: 'twill', base: R, num: [W, RED, NAVY], numO: [0.035, 0.03], tv: 'shoulder', word: { img: 'BUF_word@white', h: 0.03 }, plateFont: 'condensed', neckTag: { img: 'BUF', w: 0.055 },
          collar: [[NAVY, 0.5], [RED, 0.7], [W, 1.5]], sleeve: { stripes: sym([NAVY, 0.3], [RED, 0.5], [W, 1.4], [RED, 0.5], [NAVY, 0.3], [R, 0.7]), from: 2 } },
        { id: 'white', name: 'White', tag: 'Road', numStyle: 'twill', base: W, num: [R, RED, NAVY], numO: [0.035, 0.03], tv: 'shoulder', word: { img: 'BUF_word@#00338D', h: 0.03 }, plateFont: 'condensed', neckTag: { img: 'BUF', w: 0.055 },
          collar: [[NAVY, 0.5], [RED, 0.7], [R, 1.5]], sleeve: { stripes: sym([NAVY, 0.3], [RED, 0.5], [R, 1.4], [RED, 0.5], [NAVY, 0.3], [W, 0.7]), from: 2 } },
        { id: 'red', name: 'Red', tag: 'Alternate', numStyle: 'twill', base: RED, num: [W, R], tv: 'shoulder', word: { img: 'BUF_word@white', h: 0.03 }, plateFont: 'condensed',
          collar: [[RED, 2.6]], sleeve: { stripes: sym([R, 0.35], [W, 1.3], [R, 0.35], [RED, 0.7]), from: 2 } },
        { id: 'coldfront', name: 'Cold Front', tag: 'Rivalries', numStyle: 'pressed', base: W, num: ['#C2C7CC', R], numO: [0.045, 0], tv: 'shoulder', word: { s: 'BUFFALO', c: R, font: 'slab' },
          fade: { c: '#B4BBC3', cm: 30 }, collar: [['#D2D7DC', 2.6]], neckTag: { s: 'BILLS MAFIA', c: R, at: 'inside' }, sleeveLogo: 'BUF@#AEB5BD', swoosh: R, plateColor: R },
        { id: 'nickel', name: 'Nickel City', tag: 'New 2026', debut: '2026-09-27', numStyle: 'twill', base: GRAY, num: [R, W, RED], numO: [0.025, 0.03], tv: 'shoulder',
          collar: [[R, 3.2]], neckTag: { s: 'GO BILLS', c: W, at: 'inside' }, chestLogo: 'BUF', sleeve: { stripes: sym(['#6E7073', 0.35], [null, 0.35], ['#6E7073', 1.2], [null, 0.35]), from: 2 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([R, 0.8], [RED, 1.8]), hipLogo: 'BUF', swoosh: R },
        { id: 'royal', name: 'Royal Blue', base: R, stripe: sym([W, 0.6], [RED, 1.8]), hipLogo: 'BUF', swoosh: W },
        { id: 'ice', name: 'Cold Front', tag: 'Rivalries', base: W, stripe: null, fade: { c: '#C3C8CE', cm: 9 }, swoosh: R, belt: '#E6E8EB' },
        { id: 'gray', name: 'Nickel City Gray', tag: 'New 2026', debut: '2026-09-27', base: GRAY, stripe: [['#7E8184', 0.5]], hipLogo: 'BUF', swoosh: W, belt: '#85888B' },
      ],
      socks: [
        { id: 'royal', name: 'Royal', base: R },
        { id: 'red', name: 'Red', base: RED },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'royal', p: 'white', s: 'royal', status: 'worn' },
        { name: 'Home (Red Helmet)', h: 'red', j: 'royal', p: 'white', s: 'red', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'royal', s: 'white', status: 'worn' },
        { name: 'Red Alternate', h: 'white', j: 'red', p: 'white', s: 'red', status: 'worn', note: 'Also scheduled Jan 10 vs NYJ' },
        { name: 'Cold Front', h: 'coldfront', j: 'coldfront', p: 'ice', s: 'white', status: 'worn', note: 'Rivalries set; Nov 22 vs MIA' },
        { name: 'Nickel City', h: 'charge', j: 'nickel', p: 'gray', s: 'royal', debut: '2026-09-27', note: 'vs LAC, Sep 27 and vs CHI, Dec 19' },
        { name: 'Christmas Road', h: 'red', j: 'white', p: 'royal', s: 'white', debut: '2026-12-25', note: 'Red helmet with road whites at DEN' },
      ],
    };
  })(),

  (() => {
    const AQUA = '#008E97', OR = '#FC4C02', DARK = '#0E111C';
    const logo = { img: 'MIA', faces: 'left', size: 0.15, at: [0.46, 0.26] };
    return {
      id: 'MIA', city: 'Miami', name: 'Dolphins', conf: 'AFC', div: 'East',
      colors: [AQUA, OR, '#005778'], font: 'round',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: '#D9DCDF', stripe: sym([OR, 0.6], [AQUA, 1.4]), logo },
        { id: 'dark', name: 'Dark Water', tag: 'Rivalries', shell: '#12151D', finish: 'gloss', mask: '#3A3F48', stripe: null, logo },
        { id: 'throwback', name: '1966 Throwback', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#D9DCDF', stripe: sym([OR, 0.9], [null, 0.5], [AQUA, 1.4]), logo: { img: 'MIA_tb', faces: 'left', size: 0.12, at: [0.4, 0.26] } },
      ],
      jerseys: [
        { id: 'aqua', name: 'Aqua', tag: 'Home', numStyle: 'twill', base: AQUA, num: [W, OR], font: 'dolphins', tv: 'shoulder', word: { img: 'MIA_word_name@white', h: 0.036 },
          neckTag: { s: 'MIAMI', c: OR, at: 'inside' }, sleeveLogo: 'MIA' },
        { id: 'white', name: 'White', tag: 'Road', numStyle: 'twill', base: W, num: [AQUA, OR], font: 'dolphins', tv: 'shoulder', word: { img: 'MIA_word_name', h: 0.036 },
          neckTag: { s: 'MIAMI', c: OR, at: 'inside' }, sleeveLogo: 'MIA' },
        { id: 'darkwater', name: 'Dark Water', tag: 'Rivalries', numStyle: 'pressed', base: DARK, num: [AQUA, '#0A6E75'], numO: [0.025, 0], font: 'dolphins', tv: 'shoulder', word: { img: 'MIA_word_city@#FC4C02', h: 0.02 },
          collar: [[OR, 1.2]], neckTag: { s: 'GO FINS!', c: W, bg: OR, at: 'inside' }, sleeve: { fin: { c: AQUA, stripe: OR } }, swoosh: OR },
        { id: 'tbaqua', name: '1966 Aqua', tag: 'Throwback', numStyle: 'twill', base: AQUA, num: [W, OR], numO: [0.04, 0], font: 'block', tv: 'shoulder', swoosh: OR,
          sleeve: { stripes: sym([W, 0.9], [OR, 0.9], [W, 1.2]), from: 2.5 } },
        { id: 'tbwhite', name: '1966 White', tag: 'Throwback · New', debut: '2026-12-13', numStyle: 'twill', base: W, num: [AQUA, OR], numO: [0.04, 0], font: 'block', tv: 'shoulder', swoosh: OR,
          sleeve: { stripes: sym([AQUA, 0.9], [OR, 0.9], [AQUA, 1.2]), from: 2.5 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[OR, 0.6], [AQUA, 1.6], [OR, 0.6]], swoosh: AQUA },
        { id: 'aqua', name: 'Aqua', base: AQUA, stripe: [[OR, 0.6], [W, 1.2], [OR, 0.6]], swoosh: W },
        { id: 'black', name: 'Dark Water', tag: 'Rivalries', base: DARK, stripe: [[OR, 0.5], [AQUA, 2.4], [OR, 0.5]], stripeTaper: [0.2, 1.4], swoosh: OR, belt: '#101218' },
        { id: 'tbwhite', name: '1966 White', tag: 'Throwback', base: W, stripe: sym([OR, 0.8], [AQUA, 1.4]), swoosh: OR },
      ],
      socks: [
        { id: 'aqua', name: 'Aqua', base: AQUA },
        { id: 'black', name: 'Black', base: DARK },
        { id: 'tbwhite', name: 'Throwback White', base: W, stripes: [[AQUA, 1.4], [null, 0.5], [OR, 1.4], [null, 0.5], [AQUA, 1.4]], stripesFrom: 20 },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'aqua', p: 'white', s: 'aqua', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'aqua', s: 'aqua', status: 'worn' },
        { name: 'Dark Water', h: 'dark', j: 'darkwater', p: 'black', s: 'black', status: 'worn', note: 'Rivalries set; Jan 3 vs BUF' },
        { name: '1966 Home', h: 'throwback', j: 'tbaqua', p: 'tbwhite', s: 'tbwhite', status: 'worn', note: 'Back Oct 25 vs NYJ' },
        { name: '1966 Road', h: 'throwback', j: 'tbwhite', p: 'tbwhite', s: 'tbwhite', debut: '2026-12-13', note: 'First road version, Dec 13 vs CHI' },
      ],
    };
  })(),

  (() => {
    const NAVY = '#002244', RED = '#C60C30', SIL = '#C0C4C8', STORM = '#4B5D72', BLUE = '#1F49A6';
    return {
      id: 'NE', city: 'New England', name: 'Patriots', conf: 'AFC', div: 'East',
      colors: [NAVY, RED, SIL], font: 'patriots',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#C6CACE', finish: 'metallic', mask: RED, stripe: null, logo: { img: 'NE', faces: 'right', size: 0.15, at: [0.46, 0.3] } },
        { id: 'white', name: "Nor'easter White", tag: 'Rivalries', shell: W, finish: 'matte', mask: '#C6CACE', stripe: null, logo: { img: 'NE@#4B5D72', faces: 'right', size: 0.15, at: [0.46, 0.3] } },
        { id: 'pat', name: 'Pat Patriot', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#E4E6E8', stripe: [[RED, 2.6]], logo: { img: 'NE_pat', faces: 'left', size: 0.13, at: [0.5, 0.3] } },
      ],
      jerseys: [
        { id: 'navy', name: 'Navy', tag: 'Home', numStyle: 'twill', base: NAVY, num: [W, RED, SIL], numO: [0.03, 0.03], word: { img: 'NE_word@white', h: 0.03 }, neckTag: { s: 'WE ARE ALL PATRIOTS', c: RED, font: 'condensed', at: 'inside' }, plateFont: 'heavyBlock', plateBar: true,
          sleeveLogo: 'NE', sweep: { t: 'stripes', bands: [[RED, 3.4], [W, 2.6], [RED, 3.4]] } },
        { id: 'white', name: 'White', tag: 'Road', numStyle: 'twill', base: W, num: [NAVY, SIL, RED], numO: [0.025, 0.03], word: { img: 'NE_word@#002244', h: 0.03 }, neckTag: { s: 'WE ARE ALL PATRIOTS', c: NAVY, font: 'condensed', at: 'inside' }, plateFont: 'heavyBlock',
          sleeveLogo: 'NE', sweep: { t: 'stripes', bands: [[RED, 3.4], [NAVY, 2.6], [RED, 3.4]] } },
        { id: 'noreaster', name: "Nor'easter", tag: 'Rivalries', numStyle: 'pressed', base: STORM, num: [W, NAVY], numO: [0.05, 0], numShadow: { color: NAVY, dx: 0.035, dy: 0.035 },
          numPattern: { t: 'dots', c: '#9AA6B6', step: 0.04, r: 0.2 }, collar: [[STORM, 2.6]], collarStars: { c: RED, n: 3 }, neckTag: { s: 'We Are All Patriots', c: W, bg: RED, font: 'script', at: 'inside' }, swoosh: RED,
          sleeveText: { L: 'N', R: 'E', c: [W, NAVY], font: 'slab' }, sweep: { t: 'stripes', bands: [[SIL, 3.4], [NAVY, 2.2], [SIL, 3.4]] } },
        { id: 'red', name: 'Pat Patriot Red', tag: 'Throwback', numStyle: 'twill', base: RED, num: [W, BLUE], font: 'block', tv: 'sleeve',
          sweep: { t: 'stripes', bands: [[BLUE, 3], [W, 3], [BLUE, 3]] } },
      ],
      pants: [
        { id: 'silver', name: 'Silver', base: SIL, stripe: sym([RED, 0.7], [NAVY, 1.6]), swoosh: NAVY },
        { id: 'white', name: 'White', tag: 'Rivalries', base: W, stripe: sym([SIL, 0.8], [NAVY, 1.4]), swoosh: RED },
        { id: 'tbwhite', name: 'Throwback White', tag: 'Throwback', base: W, stripe: sym([RED, 1.2], [W, 0.6], [BLUE, 1.2]), swoosh: BLUE },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'white', name: 'White', base: W },
        { id: 'storm', name: 'Storm', base: STORM },
        { id: 'tb', name: 'Throwback White', base: W, stripes: [[RED, 1], [W, 0.6], [BLUE, 1], [W, 0.6], [RED, 1]], stripesFrom: 22 },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'navy', p: 'silver', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'white', status: 'worn' },
        { name: "Nor'easter", h: 'white', j: 'noreaster', p: 'white', s: 'storm', status: 'worn', note: 'Rivalries set; Dec 6 vs BUF' },
        { name: 'Pat Patriot', h: 'pat', j: 'red', p: 'tbwhite', s: 'tb', status: 'worn', note: 'Back Oct 11 vs LV and Dec 10 vs MIN' },
      ],
    };
  })(),

  (() => {
    const G = '#125740', CG = '#1D7149', K2 = '#101010', GOTHAM = '#353A36', GR = '#C8C9C5';
    const logo = { img: 'NYJ_word', size: 0.15, at: [0.46, 0.3] };
    return {
      id: 'NYJ', city: 'New York', name: 'Jets', conf: 'AFC', div: 'East',
      colors: [G, W, K2], font: 'jets',
      helmets: [
        { id: 'green', name: 'Legacy Green', tag: 'Primary', shell: G, finish: 'gloss', mask: W, stripe: null, logo: { ...logo, img: 'NYJ_word@white' } },
        { id: 'white', name: 'White Out', tag: 'New 2026', debut: '2026-09-20', shell: W, finish: 'gloss', mask: W, stripe: null, logo },
        { id: 'black', name: 'Stealth Black', tag: 'Alternate', shell: K2, finish: 'gloss', mask: G, stripe: null, logo },
        { id: 'classic', name: 'Classic', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#BFC2C5', stripe: [[CG, 1.0]], logo: { img: 'NYJ_classic', size: 0.12, at: [0.46, 0.3] } },
        { id: 'gotham', name: 'Gotham Black', tag: 'Rivalries', shell: '#1C1D1E', finish: 'matte', mask: K2, stripe: null, logo: { ...logo, img: 'NYJ_word@#BDBAB2' } },
      ],
      jerseys: [
        { id: 'green', name: 'Legacy Green', tag: 'Home', numStyle: 'twill', base: G, num: [W], plateFont: 'squareBlock', tv: 'shoulder', collar: [[W, 2.6]],
          sleeve: { stripes: [[W, 1.4], [null, 0.9], [W, 1.4]], from: 3 } },
        { id: 'white', name: 'Spotlight White', tag: 'Road', numStyle: 'twill', base: W, num: [G], plateFont: 'squareBlock', tv: 'shoulder', collar: [[G, 2.6]],
          sleeve: { stripes: [[G, 1.4], [null, 0.9], [G, 1.4]], from: 3 } },
        { id: 'black', name: 'Stealth Black', tag: 'Alternate', numStyle: 'twill', base: K2, num: [W, G], numO: [0.03, 0], plateFont: 'squareBlock', tv: 'shoulder', collar: [[G, 2.6]],
          sleeve: { stripes: [[G, 1.4], [null, 0.9], [G, 1.4]], from: 3 } },
        { id: 'classic', name: 'Classic', tag: 'Throwback', numStyle: 'twill', base: W, num: [CG], plateFont: 'squareBlock', tv: 'sleeve', sleeve: { cap: CG, top: [W, 13.5] },
          loop: [[CG, 1.3], [null, 1.1], [CG, 1.3]], loopAt: 17.5 },
        { id: 'gotham', name: 'Gotham City FC', tag: 'Rivalries', numStyle: 'pressed', base: GOTHAM, num: ['#C9C7C0', '#8F918D'], numO: [0.035, 0], font: 'gotham', plateFont: 'roundBlock', tv: 'sleeve', chestLogo: 'NYJ_plane',
          sleeve: { cap: '#1E2020', pattern: { t: 'diamondplate', c: '#3A3D3D' } }, loop: [[K2, 1.3], [GR, 1.3]], loopAt: 17.5 },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[G, 2.6]], swoosh: G },
        { id: 'green', name: 'Green', base: G, stripe: [[W, 2.6]], swoosh: W },
        { id: 'black', name: 'Black', base: K2, stripe: [[G, 2.6]], swoosh: W },
        { id: 'classic', name: 'Classic White', tag: 'Throwback', base: W, stripe: sym([CG, 0.5], [null, 0.5]), swoosh: CG },
        { id: 'gotham', name: 'Gotham', tag: 'Rivalries', base: GOTHAM, stripe: [[GR, 1.2], [K2, 0.4]], swoosh: GR, belt: '#232624' },
      ],
      socks: [
        { id: 'green', name: 'Green', base: G },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: K2 },
        { id: 'classic', name: 'Classic', base: W, stripes: [[CG, 1.6], [null, 1], [CG, 1.6]], stripesFrom: 20 },
      ],
      looks: [
        { name: 'Home', h: 'green', j: 'green', p: 'green', s: 'green', status: 'worn' },
        { name: 'Road', h: 'green', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'White Out', h: 'white', j: 'white', p: 'white', s: 'white', debut: '2026-09-20', note: 'Home opener vs GB' },
        { name: 'Stealth', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Classic', h: 'classic', j: 'classic', p: 'classic', s: 'classic', status: 'worn', note: 'Back Oct 25 at MIA' },
        { name: 'Gotham City FC', h: 'gotham', j: 'gotham', p: 'gotham', s: 'black', status: 'worn', note: 'Rivalries set; Dec 27 vs NE' },
      ],
    };
  })(),

  // ───────────────────────────── AFC NORTH ─────────────────────────────
  (() => {
    const P = '#2B0F6B', MID = '#1A0E3D', GOLD = '#C8A43C', MP = '#4B2AA0';
    const logo = { img: 'BAL', faces: 'right', size: 0.15, at: [0.46, 0.3] };
    return {
      id: 'BAL', city: 'Baltimore', name: 'Ravens', conf: 'AFC', div: 'North',
      colors: [P, K, GOLD], font: 'ravens',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: '#0B0B0C', finish: 'gloss', mask: K, stripe: [[P, 3.4]], stripeSpan: [0.1, 0.5], logo },
        { id: 'rising', name: 'Purple Rising', tag: 'Alternate', shell: '#34177A', finish: 'metallic', mask: GOLD, stripe: [[GOLD, 3.4]], stripeSpan: [0.1, 0.5], logo },
        { id: 'darkness', name: 'Darkness', tag: 'New 2026', debut: '2026-11-16', shell: '#1E1E21', finish: 'matte', mask: K, stripe: null, logo: { img: 'BAL_dark', size: 0.1, at: [0.46, 0.3] } },
      ],
      jerseys: [
        { id: 'purple', name: 'Purple', tag: 'Home · New 2026', numStyle: 'twill', base: P, num: [W, MID, K], numO: [0.018, 0.022], tv: 'shoulder', word: { img: 'BAL_word_name@white', h: 0.02 },
          plateFont: 'roman', plateTracking: 0.06, plateColor: W, neckTag: { s: 'PLAY LIKE A RAVEN', c: GOLD, bg: MP, font: 'roman', at: 'inside' },
          collar: [[P, 1.2]], feathers: K, sleevePatch: { t: 'mdshield' }, sleeve: { stripes: [[K, 3]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road · New 2026', numStyle: 'twill', base: W, num: [P, MID, K], numO: [0.015, 0.015], tv: 'shoulder', word: { img: 'BAL_word_city@#2B0F6B', h: 0.0105 },
          plateFont: 'roman', plateTracking: 0.06, plateColor: P, neckTag: { s: 'BALTIMORE', c: GOLD, bg: MP, font: 'roman', at: 'inside' },
          collar: [[W, 1.2]], feathers: P, sleevePatch: { t: 'mdshield' }, sleeve: { stripes: [[P, 3]], from: 0 } },
        { id: 'rising', name: 'Purple Rising', tag: 'Alternate · Updated', debut: '2026-11-05', numStyle: 'twill', base: P, num: [GOLD, W], numO: [0.025, 0], tv: 'shoulder', word: { img: 'BAL_word_name@#C8A43C', h: 0.02 },
          plateFont: 'roman', plateTracking: 0.06, plateColor: GOLD, neckTag: { s: 'BALTIMORE', c: GOLD, font: 'roman', at: 'inside' },
          collar: [[P, 2.6]], sleevePatch: { t: 'mdshield' } },
        { id: 'darkness', name: 'Darkness', tag: 'New 2026', debut: '2026-11-16', numStyle: 'twill', base: '#0A0A0B', num: [W, MP], numO: [0.025, 0], tv: 'shoulder', word: { img: 'BAL_word_name@white', h: 0.02 },
          plateFont: 'roman', plateTracking: 0.06, plateColor: W, neckTag: { s: 'RAVENS', c: W, font: 'roman', h: 0.012 },
          collar: [['#0A0A0B', 1.2]], feathers: '#4B2AA0', sleevePatch: { t: 'mdshield' }, sleeve: { stripes: [['#4B2AA0', 3]], from: 0 } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: [[P, 2.2]], stripeStart: 0.85, swoosh: P },
        { id: 'purple', name: 'Purple', tag: 'New 2026', base: P, stripe: [[K, 2.2]], stripeStart: 0.85, swoosh: W },
        { id: 'goldstripe', name: 'Purple (Gold Stripe)', tag: 'New 2026', base: P, stripe: [[GOLD, 2.0]], stripeStart: 0.85, swoosh: W },
        { id: 'black', name: 'Black', tag: 'New 2026', base: '#0A0A0B', stripe: [[MP, 2.2]], stripeStart: 0.85, swoosh: W },
      ],
      socks: [
        { id: 'white', name: 'White', base: W },
        { id: 'purple', name: 'Purple', base: P },
        { id: 'black', name: 'Black', base: '#0A0A0B' },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'purple', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'purple', s: 'white', status: 'worn' },
        { name: 'Road (Black Pants)', h: 'black', j: 'white', p: 'black', s: 'black', status: 'worn', note: 'Season opener at IND' },
        { name: 'White Noise', h: 'rising', j: 'white', p: 'white', s: 'white', debut: '2026-09-20', note: 'Purple helmet with road whites vs NO' },
        { name: 'Purple Rising', h: 'rising', j: 'rising', p: 'goldstripe', s: 'purple', debut: '2026-11-05', note: 'Thursday night vs JAX' },
        { name: 'Darkness Falls', h: 'darkness', j: 'darkness', p: 'black', s: 'black', debut: '2026-11-16', note: 'vs LAC' },
      ],
    };
  })(),

  (() => {
    const OR = '#FB4F14', BK = '#0B0B0B';
    return {
      id: 'CIN', city: 'Cincinnati', name: 'Bengals', conf: 'AFC', div: 'North',
      colors: [OR, BK, W], font: 'bengals',
      helmets: [
        { id: 'tiger', name: 'Tiger Stripe', tag: 'Primary', shell: OR, finish: 'gloss', mask: BK, pattern: { t: 'tiger', c: BK }, logo: { t: 'none' } },
        { id: 'white', name: 'White Bengal', tag: 'Alternate', shell: W, finish: 'gloss', mask: BK, pattern: { t: 'tiger', c: BK }, logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', numStyle: 'twill', base: BK, num: [W, OR], numO: [0.025, 0], word: { img: 'CIN_word_name@#FB4F14', h: 0.019 }, sleeve: { pattern: { t: 'tiger', c: OR } } },
        { id: 'white', name: 'White', tag: 'Road', numStyle: 'twill', base: W, num: [BK, OR], numO: [0.025, 0], word: { img: 'CIN_word_name@#FB4F14', h: 0.019 }, sleeve: { pattern: { t: 'tiger', c: BK } }, swoosh: OR },
        { id: 'orange', name: 'Orange', tag: 'Alternate', numStyle: 'twill', base: OR, num: [W, BK], numO: [0.02, 0], word: { img: 'CIN_word_name@#0B0B0B', h: 0.019 }, sleeve: { pattern: { t: 'tiger', c: BK } }, swoosh: W },
      ],
      pants: [
        { id: 'white', name: 'White (Orange Stripes)', base: W, pattern: { t: 'tiger', c: OR }, swoosh: BK },
        { id: 'whiteblack', name: 'White (Black Stripes)', base: W, pattern: { t: 'tiger', c: BK }, swoosh: OR },
        { id: 'black', name: 'Black', base: BK, pattern: { t: 'tiger', c: OR }, swoosh: W },
        { id: 'orange', name: 'Orange', base: OR, pattern: { t: 'tiger', c: BK }, swoosh: W },
      ],
      socks: [
        { id: 'orange', name: 'Orange', base: OR },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'tiger', j: 'black', p: 'white', s: 'orange', status: 'worn' },
        { name: 'Road', h: 'tiger', j: 'white', p: 'black', s: 'white', status: 'worn' },
        { name: 'Open in Orange', h: 'tiger', j: 'orange', p: 'orange', s: 'black', status: 'worn', note: 'Sep 13 home opener' },
        { name: 'White Bengal', h: 'white', j: 'white', p: 'whiteblack', s: 'white', status: 'worn', note: 'Back Nov 15 vs PIT and Dec 31 vs BAL' },
      ],
    };
  })(),

  (() => {
    const BR = '#311D00', OR = '#FF3C00';
    return {
      id: 'CLE', city: 'Cleveland', name: 'Browns', conf: 'AFC', div: 'North',
      colors: [BR, OR, W], font: 'browns',
      helmets: [
        { id: 'orange', name: 'Orange', tag: 'Primary', shell: OR, finish: 'gloss', mask: '#E4E6E8', stripe: sym([BR, 2.0], [W, 2.6]), logo: { t: 'none' } },
        { id: 'brown', name: 'Alpha Dawg', tag: 'Alternate', shell: BR, finish: 'matte', mask: BR, stripe: sym([OR, 1.8], [BR, 2.6]), logo: { t: 'none' } },
        { id: 'white', name: 'White', tag: 'Throwback', shell: W, finish: 'gloss', mask: BR, stripe: sym([OR, 1.8], [BR, 2.6]), logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'brown', name: 'Brown', tag: 'Home', numStyle: 'twill', base: BR, num: [W], tv: 'shoulder', neckTag: { s: '=1946=', c: OR, at: 'inside' }, swoosh: OR,
          sleeve: { stripes: [...rep(OR, 1.2, 0.9, 3, W)], from: 2.5 } },
        { id: 'white', name: 'White', tag: 'Road', numStyle: 'twill', base: W, num: [BR], tv: 'shoulder', neckTag: { s: '=1946=', c: OR, at: 'inside' }, swoosh: OR,
          sleeve: { stripes: [...rep(BR, 1.2, 0.9, 3, OR)], from: 2.5 } },
        { id: 'alpha', name: 'Brown Alternate', tag: 'Alternate', numStyle: 'twill', base: BR, num: [OR], tv: 'shoulder', neckTag: { s: '=1946=', c: OR, at: 'inside' }, swoosh: OR },
        { id: 'throwback', name: '1946 White', tag: 'Throwback', numStyle: 'twill', base: W, num: [BR, OR], numO: [0.06, 0], font: 'chamfer', tv: 'shoulder', neckTag: { s: '=1946=', c: OR, at: 'inside' }, swoosh: OR,
          chestPatch: { t: 'football', s: '1946', fill: BR, text: OR }, sleeve: { stripes: [...rep(BR, 1.2, 0.9, 3, OR)], from: 2.5 } },
      ],
      pants: [
        { id: 'orange', name: 'Orange', base: OR, stripe: sym([BR, 0.8], [W, 1.4]), swoosh: W },
        { id: 'brown', name: 'Brown', base: BR, swoosh: OR },
        { id: 'white', name: 'White', base: W, stripe: sym([OR, 0.8], [BR, 1.2]), swoosh: OR },
      ],
      socks: [
        { id: 'brown', name: 'Brown Striped', base: BR, stripes: rep(OR, 1.2, 0.9, 3, W), stripesFrom: 13, lower: [W, 24] },
        { id: 'white', name: 'White Striped', base: W, stripes: rep(BR, 1.2, 0.9, 3, OR), stripesFrom: 20 },
        { id: 'plainbrown', name: 'Brown', base: BR },
      ],
      looks: [
        { name: 'Home', h: 'orange', j: 'brown', p: 'orange', s: 'brown', status: 'worn' },
        { name: 'Road', h: 'orange', j: 'white', p: 'orange', s: 'white', status: 'worn' },
        { name: 'Alpha Dawg (All Brown)', h: 'brown', j: 'alpha', p: 'brown', s: 'plainbrown', status: 'worn' },
        { name: '1946 Throwback', h: 'white', j: 'throwback', p: 'white', s: 'white', status: 'worn' },
      ],
    };
  })(),

  (() => {
    const GOLD = '#FFB612', BK = '#101820', KHAKI = '#C4B283';
    const steel = { img: 'PIT', size: 0.095, side: 'right', at: [0.46, 0.32] };
    // Sleeve: gold/white/gold wide-centre stripe group, symmetric, black between (sheet + Elite shop photo).
    // On the white road jersey the black edge lines are what separate it from the body.
    const stripes = [[BK, 0.35], [GOLD, 1.2], [BK, 0.5], [W, 1.5], [BK, 0.5], [GOLD, 6.2], [BK, 0.5], [W, 1.5], [BK, 0.5], [GOLD, 1.2], [BK, 0.35]];
    const rushStripes = [[GOLD, 1.2], [BK, 0.5], [GOLD, 1.5], [BK, 0.5], [GOLD, 6.2], [BK, 0.5], [GOLD, 1.5], [BK, 0.5], [GOLD, 1.2]];
    return {
      id: 'PIT', city: 'Pittsburgh', name: 'Steelers', conf: 'AFC', div: 'North',
      colors: [BK, GOLD, W], font: 'steelers',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: K, stripe: [[GOLD, 2.4]], logo: steel, numbers: W },
        { id: 'gold1933', name: '1933 Gold', tag: 'Throwback', shell: GOLD, finish: 'matte', mask: '#9EA2A2', stripe: null, logo: steel },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W], numStyle: 'twill', tv: 'shoulder', chestLogo: 'PIT', sleeve: { stripes, from: 0.85 },
          plateBar: true, plateColor: GOLD },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK], numStyle: 'twill', tv: 'shoulder', chestLogo: 'PIT', sleeve: { stripes, from: 0.85 },
          plateColor: GOLD, plateOutline: [BK] },
        { id: 'rush', name: 'Color Rush', tag: 'Color Rush', base: BK, num: [GOLD], numStyle: 'twill', font: 'chiefs', tv: 'shoulder', chestLogo: 'PIT', swoosh: GOLD,
          sleeve: { stripes: rushStripes, from: 1.2 }, plateBar: true },
        { id: 'y1933', name: '1933', tag: 'Throwback', base: GOLD, num: [W, BK], numBack: [W, BK], plateColor: W, plateOutline: [BK], numO: [0.06, 0], numStyle: 'twill', font: 'block', collar: [[GOLD, 2.5]], chestLogo: 'PIT_crest',
          panels: { vstripes: [BK, 3.2, 4.2], vband: [BK, 5, 27, 0.1] } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: [[BK, 3.6]], swoosh: BK },
        { id: 'black', name: 'Black', base: BK, stripe: [[GOLD, 2.6]], swoosh: GOLD },
        { id: 'khaki', name: '1933 Khaki', tag: 'Throwback', base: KHAKI, swoosh: BK },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'gold', name: 'Gold', base: GOLD },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'black', p: 'gold', s: 'black', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'gold', s: 'black', status: 'worn' },
        { name: 'Color Rush', h: 'black', j: 'rush', p: 'black', s: 'black', status: 'worn', note: 'Late-season return in 2026' },
        { name: '1933 Throwback', h: 'gold1933', j: 'y1933', p: 'khaki', s: 'gold', status: 'worn', note: 'Returns in 2026 (date TBA)' },
      ],
    };
  })(),

  // ───────────────────────────── AFC SOUTH ─────────────────────────────
  (() => {
    const NAVY = '#03202F', RED = '#E31837', LB = '#2E8FD4';
    const logo = { img: 'HOU', faces: 'right', size: 0.14 };
    // chest wordmark: the club's wide squared sans, small, above the number
    // blackletter "H" helmet mark, typeset (not the logo artwork): wide H, red star off its front
    const H = { t: 'text', s: 'H', font: 'blackletter', scaleX: 1.3, shift: [-0.05, 0.02], star: RED, starAt: [0.27, -0.05, 0.065], size: 0.21, at: [0.52, 0.36] };
    // shoulder stripes seen from behind: a band over the cap top running out to the sleeve, and a thin line below it
    const hShoulder = (c, c2) => ({ shapes: [[c, [[0.12, 0.112], [0.30, 0.063], [0.30, 0.040], [0.12, 0.088]], 0.003], [c2, [[0.12, 0.078], [0.30, 0.029], [0.30, 0.019], [0.12, 0.068]], 0.002]] });
    const bull = { img: 'HOU', w: 0.028 };
    const TXN = (s, c) => ({ s, c, font: 'squareBlock', h: 0.023, tracking: s === 'HOUSTON' ? 0.18 : 0.12, scaleX: 1.2 });
    return {
      id: 'HOU', city: 'Houston', name: 'Texans', conf: 'AFC', div: 'South',
      colors: [NAVY, RED, LB], font: 'texans',
      helmets: [
        { id: 'navy', name: 'Deep Steel Blue', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null, logo },
        { id: 'red', name: 'Battle Red', tag: 'Alternate', shell: RED, finish: 'gloss', mask: RED, stripe: null, logo: { t: 'bullhorn', fill: NAVY, line: RED, size: 0.21 } },
        { id: 'htown', name: 'H-Town', tag: 'Alternate', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null,
          logo: { ...H, fill: LB, stroke: NAVY, stroke2: RED } },
        // Liberty White shell; centre stripe: Battle Red between two tiled H-Town Blue strips;
        // chrome H-Town Blue mask; street-tile "H-TOWN" on the front bumper
        { id: 'riv', name: 'Rivalries White', tag: 'New 2026', debut: '2026-11-19', shell: W, finish: 'gloss', mask: LB,
          stripe: [[LB, 1, W], [W, 0.25], [RED, 2.8], [W, 0.25], [LB, 1, W]], nameplate: { bg: W, fg: LB, text: 'H-TOWN', rear: { bg: W, fg: LB, text: 'TEXANS' } },
          logo: { ...H, fill: '#E9ECF0', stroke: LB, stroke2: RED } },
      ],
      jerseys: [
        { id: 'navy', name: 'Deep Steel Blue', tag: 'Home', base: NAVY, num: [W, RED, '#9AA3AA'], numO: [0.03, 0.022], numStyle: 'twill', tv: 'shoulder', word: TXN('TEXANS', RED), neckTag: bull, backShoulder: hShoulder(RED, W),
          collar: [[NAVY, 0.45], [RED, 1.2], [W, 0.5]], sleeveLogo: 'HOU' },
        { id: 'white', name: 'Liberty White', tag: 'Road', base: W, num: [NAVY, RED], numO: [0.03, 0], numStyle: 'twill', word: TXN('HOUSTON', RED), neckTag: bull, backShoulder: hShoulder(NAVY, RED), swoosh: NAVY, loop: [[NAVY, 2.9], [RED, 0.45], [NAVY, 0.85]], loopAt: 9, sweep: { t: 'bullhorn', c: NAVY, line: RED } },
        { id: 'red', name: 'Battle Red', tag: 'Alternate', base: RED, num: [NAVY, W], numO: [0.03, 0], numStyle: 'twill', word: TXN('TEXANS', W), neckTag: bull, backShoulder: hShoulder(NAVY, W), swoosh: NAVY, loop: [[NAVY, 2.9], [RED, 0.45], [NAVY, 0.85]], loopAt: 9, sweep: { t: 'bullhorn', c: NAVY, line: RED } },
        { id: 'htown', name: 'H-Town Navy', tag: 'Alternate', base: NAVY, num: [RED, LB], numO: [0.03, 0], numStyle: 'twill', word: TXN('H-TOWN', LB), collar: [[RED, 2.8]], sleeveLogo: 'HOU', swoosh: RED },
        { id: 'riv', name: 'Rivalries White', tag: 'New 2026', debut: '2026-11-19', base: '#F5F6F7', num: [LB], font: 'texansRiv', numStyle: 'pressed', tv: 'shoulder', word: { s: '' }, chestLogo: 'HOU', swoosh: LB,
          collar: [[LB, 0.4], [W, 0.2], [RED, 0.4], [W, 0.2], [LB, 0.4], [W, 0.2], [RED, 0.4]], sleeve: { stripes: [...rep(LB, 0.4, 0.3, 4, W), [RED, 3.4]], from: 1 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[NAVY, 1.6], [RED, 0.5]], hipLogo: 'HOU', swoosh: NAVY },
        { id: 'navy', name: 'Deep Steel Blue', base: NAVY, stripe: [[RED, 1.3], [W, 0.35]], hipLogo: 'HOU', swoosh: W },
        { id: 'red', name: 'Battle Red', base: RED, stripe: [[NAVY, 1.4], [W, 0.35]], hipLogo: 'HOU', swoosh: NAVY },
        { id: 'htown', name: 'H-Town Navy', base: NAVY, stripe: [[RED, 1.1], [LB, 0.5]], hipLogo: 'HOU', swoosh: RED },
        { id: 'riv', name: 'Rivalries White', base: W, stripe: [[RED, 0.9], [LB, 1.0]], stripeTaper: [1, 0.45], swoosh: LB },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'white', name: 'White', base: W },
        { id: 'red', name: 'Red', base: RED },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'navy', p: 'white', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'white', status: 'worn' },
        { name: 'Battle Red', h: 'red', j: 'red', p: 'red', s: 'red', status: 'worn', note: 'Oct 25 vs NYG' },
        { name: 'H-Town', h: 'htown', j: 'htown', p: 'htown', s: 'navy', status: 'worn', note: 'Jan 10 vs TEN' },
        { name: 'Rivalries', h: 'riv', j: 'riv', p: 'riv', s: 'white', debut: '2026-11-19', note: 'Debut vs IND' },
      ],
    };
  })(),

  (() => {
    const B = '#003B7B', GRAY = '#A2AAAD', ANV = '#4A4B4D', BK = '#0E0E0F';
    // the two UCLA stripes over each shoulder: bars running front to back (edged in `edge` when given)
    const ucla = (c, edge) => {
      const one = edge ? [[edge, 0.02], [c, 0.075], [edge, 0.02]] : [[c, 0.115]];
      return { t: 'bars', stripes: [...one, [null, 0.115], ...one], size: 0.22, skew: -0.06, len: 0.95, at: 'top' };
    };
    return {
      id: 'IND', city: 'Indianapolis', name: 'Colts', conf: 'AFC', div: 'South',
      colors: [B, W, GRAY], font: 'colts',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: W, stripe: [[B, 2.4]], logo: { img: 'IND', size: 0.12, at: [0.46, 0.32] } },
        { id: 'nights', name: 'Indiana Nights', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: [[B, 1.4]], logo: { img: 'IND', size: 0.12, at: [0.46, 0.32] } },
        { id: 'anvil', name: 'Anvil Metallic Blue', tag: 'Rivalries · New', debut: '2026-09-27', shell: '#123E86', finish: 'metallic', mask: BK, stripe: null,
          logo: { img: 'IND@#FFFFFF', size: 0.105, at: [0.46, 0.32] } },
      ],
      jerseys: [
        // two UCLA stripes over each shoulder, TV numbers on the outside of the sleeves, plain same-colour V collar
        { id: 'blue', name: 'Blue', tag: 'Home', base: B, num: [W], numStyle: 'twill', tv: 'sleeve', shoulder: ucla(W) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [B], numStyle: 'twill', tv: 'sleeve', shoulder: ucla(B) },
        // black collar and hem bands, one thin white stripe along the top of the shoulder
        { id: 'nights', name: 'Indiana Nights', tag: 'Alternate', base: B, num: [W, BK], numStyle: 'twill', numO: [0.02, 0], tv: 'sleeve', collar: [[BK, 2.8]], sleeve: { stripes: [[BK, 3]], from: 0 },
          loop: [[W, 0.7]], loopAt: 20.5 },
        // anthracite: each shoulder stripe is royal blue edged in black; white horseshoe on the sleeves
        { id: 'anvil', name: 'Anvil Strike', tag: 'Rivalries · New', debut: '2026-09-27', base: ANV, num: [B, W, BK], numO: [0.028, 0.02], numStyle: 'pressed', tv: 'sleeve', sleeveLogo: 'IND',
          shoulder: ucla(B, BK) },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[B, 1.2]] },
        { id: 'blue', name: 'Blue', base: B, stripe: [[W, 0.8]], swoosh: W },
        { id: 'anvil', name: 'Anvil', base: ANV, stripe: [[B, 0.7], [BK, 1.1]], stripeTaper: [1, 0.5], swoosh: W },
      ],
      socks: [
        { id: 'blue', name: 'Blue', base: B },
        { id: 'white', name: 'White', base: W },
        { id: 'anvil', name: 'Anvil', base: ANV },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'blue', p: 'white', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'White Out Nov 8 vs DAL' },
        { name: 'Indiana Nights', h: 'nights', j: 'nights', p: 'blue', s: 'blue', status: 'worn', note: 'Dec 27 vs CIN' },
        { name: 'Anvil Strike', h: 'anvil', j: 'anvil', p: 'anvil', s: 'anvil', debut: '2026-09-27', note: 'Rivalries debut vs HOU' },
      ],
    };
  })(),

  (() => {
    const T = '#006778', BK = '#101820', GOLD = '#D7A22A', ALB = '#EFE6D2';
    const logo = { img: 'JAX', faces: 'right', size: 0.14, at: [0.42, 0.3] };
    const SLV = 9;   // cm of black (or teal) cuff on the sleeve, measured up from the hem
    return {
      id: 'JAX', city: 'Jacksonville', name: 'Jaguars', conf: 'AFC', div: 'South',
      colors: [T, BK, GOLD], font: 'jaguars',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: BK, stripe: null, logo },
        { id: 'teal', name: 'Rivalries Teal', tag: 'New 2026', debut: '2026-11-01', shell: T, finish: 'gloss', mask: GOLD, stripe: null, logo },
        { id: 'prowler', name: 'Prowler Black', tag: 'Throwback', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { img: 'JAX_tb', faces: 'left', size: 0.13, at: [0.42, 0.3] } },
      ],
      jerseys: [
        // inner collar band in the body colour, black outside it; black sleeve cuffs; jaguar head on the player's left chest
        { id: 'teal', name: 'Teal', tag: 'Home', base: T, num: [W], numBack: [W, BK], plateFont: 'angular', plateArch: 0.12, plateTracking: 0.1, plateOutline: [BK], numStyle: 'twill', tv: 'shoulder', chestLogo: 'JAX', collar: [[T, 1], [BK, 1.7]], sleeve: { stripes: [[BK, SLV]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK], plateFont: 'angular', plateArch: 0.12, plateTracking: 0.1, numStyle: 'twill', tv: 'shoulder', chestLogo: 'JAX', swoosh: T, collar: [[W, 1], [BK, 1.7]], sleeve: { stripes: [[BK, SLV]], from: 0 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [W], plateFont: 'angular', plateArch: 0.12, plateTracking: 0.1, numStyle: 'twill', tv: 'shoulder', chestLogo: 'JAX', swoosh: T, collar: [[T, 0.9], [BK, 1.8]], sleeve: { stripes: [[T, SLV]], from: 0 } },
        { id: 'prowler', name: 'Prowler Teal', tag: 'Throwback', base: T, num: [W, GOLD, BK], numStyle: 'twill', numO: [0.045, 0.02], font: 'serifNum', tv: 'shoulder', collar: [[BK, 2.8]], sleeveLogo: 'JAX_tb',
          sleeve: { stripes: [[BK, 0.9], [GOLD, 0.9]], from: 0 } },
        { id: 'riv', name: 'Rivalries Alabaster', tag: 'New 2026', debut: '2026-11-01', base: ALB, num: [BK, T], numStyle: 'pressed', font: 'varsity', numPattern: { t: 'spots', c: '#3A3A36' }, word: { s: 'Jaguars', c: BK, script: true }, swoosh: T, neckTag: { s: "SINCE '95", c: GOLD, font: 'condensed', at: 'inside' },
          collar: [[T, 1], [BK, 1.6]], sleeveLogo: 'JAX', sleeve: { stripes: [[BK, SLV]], from: 0 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, swoosh: T },
        { id: 'teal', name: 'Teal', base: T, swoosh: W },
        { id: 'black', name: 'Black', base: BK, swoosh: T },
        { id: 'prowler', name: 'Prowler White', tag: 'Throwback', base: W, stripe: [[T, 0.8], [GOLD, 0.6], [BK, 0.8]], swoosh: T },
        { id: 'riv', name: 'Rivalries Black', base: BK, stripe: [[T, 0.9], [GOLD, 0.4]], pattern: { t: 'spots', c: '#2E2E2E' }, swoosh: T },
      ],
      socks: [
        { id: 'teal', name: 'Teal', base: T },
        { id: 'black', name: 'Black', base: BK },
        { id: 'alabaster', name: 'Alabaster', base: ALB },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'teal', p: 'white', s: 'teal', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'teal', s: 'black', status: 'worn' },
        { name: 'Alternate', h: 'white', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Prowler', h: 'prowler', j: 'prowler', p: 'prowler', s: 'black', status: 'worn', note: 'Not confirmed for 2026' },
        { name: 'Rivalries', h: 'teal', j: 'riv', p: 'riv', s: 'white', debut: '2026-11-01', note: 'Debut vs IND; first teal helmet' },
      ],
    };
  })(),

  (() => {
    const LB = '#4B92DB', RED = '#C8102E', NAVY = '#0C2340';
    const sleeveStrings = (band) => ({ stripes: [[RED, 0.7], [W, 0.5], ...rep(NAVY, 0.3, 0.45, 6, band)], from: 2 });
    return {
      id: 'TEN', city: 'Tennessee', name: 'Titans', conf: 'AFC', div: 'South',
      colors: [LB, RED, NAVY], font: 'titans',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary · New 2026', shell: W, finish: 'gloss', mask: W, stripe: sym([RED, 0.6], [W, 0.3], [LB, 1.4]), logo: { img: 'TEN', size: 0.125, at: [0.46, 0.34] } },
        { id: 'blue', name: 'Music City Blue', tag: 'Rivalries · New', debut: '2026-11-15', shell: LB, finish: 'gloss', mask: NAVY, stripe: strings(NAVY, W, 4), logo: { img: 'TEN', size: 0.125, at: [0.46, 0.34] } },
      ],
      jerseys: [
        { id: 'blue', name: 'Titans Blue', tag: 'Home · New 2026', base: LB, num: [W, RED], numO: [0.028, 0], numStyle: 'twill', tv: 'shoulder', word: { s: 'TITANS', c: W, font: 'slab', h: 0.021, tracking: 0.16 }, swoosh: NAVY, sleeve: sleeveStrings(LB) },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [LB, RED], numO: [0.028, 0], numStyle: 'twill', tv: 'shoulder', word: { s: 'TENNESSEE', c: LB, font: 'squareBlock', h: 0.021, tracking: 0.24, scaleX: 1.2 }, swoosh: NAVY, sleeve: { stripes: [[RED, 0.7], [W, 0.5], ...rep(NAVY, 0.3, 0.45, 6, LB)], from: 2 } },
        { id: 'music', name: 'Music City', tag: 'Rivalries · New', debut: '2026-11-15', base: NAVY, num: [LB], font: 'titansNeon', numStyle: 'pressed', numShadow: { color: '#2F6FB5', dx: 0.04, dy: 0.035 }, tv: 'shoulder', word: { s: 'Music City', c: W, script: true },
          sleeve: { stripes: [[W, 0.5], ...rep(LB, 0.3, 0.45, 6, NAVY)], from: 2 } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: [[NAVY, 0.9], [W, 0.2], [RED, 0.6]], swoosh: NAVY },
        { id: 'blue', name: 'Titans Blue', tag: 'New 2026', base: LB, stripe: [[NAVY, 0.9], [W, 0.2], [RED, 0.6]], swoosh: NAVY },
        { id: 'navy', name: 'Navy', tag: 'Rivalries', debut: '2026-11-15', base: NAVY, stripe: [[LB, 0.8], [W, 0.3], [LB, 0.4]], swoosh: W },
      ],
      socks: [
        { id: 'blue', name: 'Titans Blue', base: LB },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'blue', p: 'white', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'blue', s: 'white', status: 'worn' },
        { name: 'Music City', h: 'blue', j: 'music', p: 'navy', s: 'blue', debut: '2026-11-15', note: 'Rivalries debut vs JAX' },
      ],
    };
  })(),

  // ───────────────────────────── AFC WEST ─────────────────────────────
  (() => {
    const OR = '#FB4F14', NAVY = '#0A2343', RB = '#1E4FD0';
    const logo = { img: 'DEN', faces: 'right', size: 0.15, at: [0.46, 0.3] };
    const DW = (c) => ({ img: `DEN_word_name@${c}`, h: 0.021 });
    const TAG = (bg) => ({ s: 'BRONCOS COUNTRY', c: W, bg, font: 'condensed', at: 'inside' });
    const peak = (fill, spike) => ({ t: 'peak', fill, spike, size: 0.11, at: 'cuff' });
    return {
      id: 'DEN', city: 'Denver', name: 'Broncos', conf: 'AFC', div: 'West',
      colors: [OR, NAVY, W], font: 'broncos',
      helmets: [
        { id: 'navy', name: 'Midnight Navy', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, pattern: { t: 'triangles', c: OR }, logo },
        { id: 'white', name: 'Snowcapped White', tag: 'Alternate', shell: W, finish: 'gloss', mask: W, pattern: { t: 'triangles', c: NAVY }, logo },
        { id: 'crush', name: 'Orange Crush Blue', tag: 'Throwback', shell: RB, finish: 'gloss', mask: '#D9DCDF', stripe: sym([W, 0.8], [OR, 1.8]),
          logo: { img: 'DEN_tb', size: 0.11, at: [0.46, 0.3] } },
      ],
      jerseys: [
        // BRONCOS in the club's wordmark above the number, a wedge-and-spike graphic on each shoulder, three triangles beside the number,
        // BRONCOS | COUNTRY tag inside the back collar
        { id: 'orange', name: 'Sunset Orange', tag: 'Home', base: OR, num: [W, NAVY], numStyle: 'twill', numO: [0.03, 0], numMarks: { c: NAVY, n: 3 }, word: DW(NAVY), neckTag: TAG(NAVY), plateOutline: [NAVY], plateBar: true,
          collar: [[OR, 1.3], [NAVY, 0.45]], shoulder: peak(W, NAVY), swoosh: NAVY },
        { id: 'white', name: 'Summit White', tag: 'Road', base: W, num: [NAVY, OR], numStyle: 'twill', numO: [0.03, 0], numMarks: { c: OR, n: 3 }, word: DW(OR), neckTag: TAG(OR), plateOutline: [OR],
          collar: [[OR, 1.1], [W, 1.4]], shoulder: peak(OR, NAVY), swoosh: OR },
        { id: 'navy', name: 'Midnight Navy', tag: 'Alternate', base: NAVY, num: [W, OR], numStyle: 'twill', numO: [0.03, 0], numMarks: { c: OR, n: 3 }, word: DW(OR), neckTag: TAG(OR), plateOutline: [OR],
          collar: [[OR, 1.1], [NAVY, 1.4]], shoulder: peak(OR, W), swoosh: W },
        { id: 'crush', name: 'Orange Crush', tag: 'Throwback', base: OR, num: [W, RB], numStyle: 'twill', font: 'block', tv: 'shoulder', neckTag: { s: 'BRONCOS COUNTRY', c: W, font: 'condensed', at: 'inside' },
          sleeve: { stripes: [[RB, 1.3], [W, 1], [RB, 1.3], [W, 1], [RB, 1.3]], from: 2.5 }, swoosh: W },
      ],
      pants: [
        // a navy pinstripe down the side, with an orange (or white) wedge panel over the upper thigh
        { id: 'white', name: 'White', base: W, stripe: [[null, 1.6], [NAVY, 0.5]], band: { stripe: [[OR, 1.3]], stop: 0.62 }, swoosh: NAVY },
        { id: 'orange', name: 'Orange', base: OR, stripe: [[null, 1.6], [NAVY, 0.5]], band: { stripe: [[W, 1.3]], stop: 0.62 }, swoosh: NAVY },
        { id: 'navy', name: 'Navy', base: NAVY, stripe: [[null, 1.6], [W, 0.5]], band: { stripe: [[OR, 1.3]], stop: 0.62 }, swoosh: W },
        { id: 'crush', name: 'Orange Crush White', tag: 'Throwback', base: W, stripe: [[RB, 0.8], [OR, 1.6], [RB, 0.4]], swoosh: RB },
      ],
      socks: [
        { id: 'orange', name: 'Orange', base: OR },
        { id: 'white', name: 'White', base: W },
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'crush', name: 'Throwback White', base: W, stripes: [[RB, 1.2], [W, 0.6], [OR, 1.4], [W, 0.6], [RB, 1.2]], stripesFrom: 15 },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'orange', p: 'white', s: 'orange', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'orange', s: 'white', status: 'worn' },
        { name: 'Snowcapped', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'Opener vs KC, Sep 14' },
        { name: 'Midnight Navy', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn', note: 'Sep 26 vs LAR' },
        { name: 'White Helmet / Navy', h: 'white', j: 'navy', p: 'navy', s: 'navy', debut: '2026-12-25', note: 'Christmas vs BUF' },
        { name: 'Orange Crush', h: 'crush', j: 'crush', p: 'crush', s: 'crush', status: 'worn', note: 'Oct 15 vs SEA, Jan 10 vs LAC' },
      ],
    };
  })(),

  (() => {
    const R = '#E31837', GOLD = '#FFB81C';
    return {
      id: 'KC', city: 'Kansas City', name: 'Chiefs', conf: 'AFC', div: 'West',
      colors: [R, GOLD, W], font: 'chiefs',
      helmets: [
        { id: 'red', name: 'Red', tag: 'Primary', shell: R, finish: 'gloss', mask: W, stripe: null, logo: { img: 'KC', size: 0.14, at: [0.46, 0.22] } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home', base: R, num: [W, GOLD], plateOutline: [GOLD], numStyle: 'twill', numO: [0.035, 0], tv: 'shoulder', sleeve: { stripes: [[W, 1.3], [GOLD, 1.6], [W, 1.3]], from: 2 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, GOLD], plateOutline: [GOLD], numStyle: 'twill', numO: [0.035, 0], tv: 'shoulder', sleeve: { stripes: [[R, 1.3], [GOLD, 1.6], [R, 1.3]], from: 2 } },
      ],
      pants: [
        // gold edge at the side seam, red line inside it
        // red-gold-red (2009214468: red | gold | red across the side seam; the sheet shows gold-red)
        { id: 'white', name: 'White', base: W, stripe: [[R, 0.4], [GOLD, 0.65], [R, 0.4]], swoosh: R },
        { id: 'red', name: 'Red', base: R, stripe: [[GOLD, 0.6], [null, 0.2], ['#F3C5CB', 0.3]], swoosh: W },
      ],
      socks: [
        // bands low on the leg: white / gold / white / red over a white foot
        { id: 'red', name: 'Red', base: R, stripes: [[W, 0.9], [GOLD, 2], [W, 0.9], [R, 0.9]], stripesFrom: 30.5, lower: [W, 35.2] },
        { id: 'white', name: 'White', base: W, stripes: [[R, 0.9], [GOLD, 2], [R, 0.9]], stripesFrom: 30.5 },
      ],
      looks: [
        { name: 'Home', h: 'red', j: 'red', p: 'white', s: 'red', status: 'worn' },
        { name: 'Road', h: 'red', j: 'white', p: 'red', s: 'white', status: 'worn' },
        { name: 'All Red', h: 'red', j: 'red', p: 'red', s: 'red', status: 'worn' },
        { name: 'All White', h: 'red', j: 'white', p: 'white', s: 'white', status: 'worn' },
      ],
    };
  })(),

  (() => {
    // Raiders silver is a metallic grey (Pantone 877); it reads as a mid light grey under stadium light
    const SIL = '#A9B0B4', SILP = '#B3B9BD', BK = '#000000';
    return {
      id: 'LV', city: 'Las Vegas', name: 'Raiders', conf: 'AFC', div: 'West',
      colors: [BK, SIL, W], font: 'raiders',
      helmets: [
        // silver metallic shell, one black centre stripe, shield on both sides, grey mask (no second shell announced for 2026)
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: SIL, finish: 'metallic', mask: '#9EA2A6', stripe: [[BK, 3.2]], logo: { img: 'LV', size: 0.12, at: [0.5, 0.34] } },
      ],
      jerseys: [
        // plain same-colour V collar, no sleeve stripes or sleeve logos; TV numbers on top of each shoulder with the swoosh in front of them.
        // Sewn tackle twill numbers (Vapor F.U.S.E. Elite; stitched edges visible in 2025 game photos).
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [SIL], tv: 'shoulder', numStyle: 'twill', swoosh: '#C9CED1', plateColor: W, plateFont: 'condensed' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, SIL], numO: [0.022, 0], tv: 'shoulder', numStyle: 'twill', swoosh: BK, plateColor: BK, plateOutline: [SIL], plateFont: 'condensed' },
        // 1970 classic: silver numbers edged in black on white
        { id: 'classic', name: 'Silver Numbers', tag: 'Throwback', base: W, num: [SIL, BK], numO: [0.02, 0], tv: 'shoulder', numStyle: 'twill', swoosh: BK, plateColor: SIL, plateOutline: [BK] },
      ],
      pants: [
        { id: 'silver', name: 'Silver', base: SILP, stripe: [[BK, 3.2]], swoosh: BK },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'black', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Classic Silver Numbers', h: 'silver', j: 'classic', p: 'silver', s: 'black', note: 'Expected at New England, Week 5' },
      ],
    };
  })(),

  (() => {
    const PB = '#0080C6', GOLD = '#FFC20E', NAVY = '#0B1F4D';
    // back-view bolt on each shoulder cap (the front projection stops at the sides): outline layer under the fill
    const bz = (k) => [[0.205, 0.10], [0.24, 0.10], [0.225, 0.068], [0.255, 0.068], [0.215, 0.02], [0.222, 0.054], [0.195, 0.054]]
      .map(([x, y]) => [+(0.225 + (x - 0.225) * k).toFixed(4), +(0.06 + (y - 0.06) * k).toFixed(4)]);
    const backBolt = (fill, stroke) => ({ shapes: [[stroke, bz(1.25)], [fill, bz(1)]] });
    const bolt = (fill, stroke) => ({ t: 'bolt', fill, stroke, size: 0.22, vertical: true, at: 'front' });
    return {
      id: 'LAC', city: 'Los Angeles', name: 'Chargers', conf: 'AFC', div: 'West',
      colors: [PB, GOLD, NAVY], font: 'chargers',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: GOLD, stripe: null, logo: { img: 'LAC', faces: 'right', size: 0.16, at: [0.55, 0.2] }, numbers: PB, numAt: [0.0, 0.5] },
        { id: 'navy', name: 'Navy', tag: 'Alternate', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null, logo: { img: 'LAC@#FFFFFF', faces: 'right', size: 0.16, at: [0.55, 0.2] }, numbers: W, numAt: [0.0, 0.5] },
      ],
      jerseys: [
        { id: 'powder', name: 'Powder Blue', tag: 'Home', base: PB, num: [W, GOLD], numO: [0.024, 0], numStyle: 'twill', plateArch: 0.1, plateOutline: [GOLD], neckTag: { s: 'BOLT UP', c: W, bg: PB, font: 'italic', at: 'inside' }, shoulder: bolt(GOLD, W), backShoulder: backBolt(GOLD, W) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [PB, GOLD], numO: [0.024, 0], numStyle: 'twill', plateArch: 0.1, plateOutline: [GOLD], neckTag: { s: 'BOLT UP', c: PB, font: 'italic', at: 'inside' }, shoulder: bolt(GOLD, PB), backShoulder: backBolt(GOLD, PB) },
        { id: 'gold', name: 'Charger Power Gold', tag: 'Alternate', base: GOLD, num: [W, PB], numO: [0.024, 0], numStyle: 'twill', plateArch: 0.1, neckTag: { s: 'CHARGER POWER', c: PB, font: 'italic', at: 'inside' }, shoulder: bolt(W, PB), backShoulder: backBolt(W, PB) },
        { id: 'navy', name: 'Super Chargers Navy', tag: 'Alternate', base: NAVY, num: [W, GOLD, NAVY], numO: [0.024, 0.018], numStyle: 'twill', plateArch: 0.1, neckTag: { s: 'SUPERCHARGERS', c: W, font: 'italic', at: 'inside' }, shoulder: bolt(W, GOLD), backShoulder: backBolt(W, GOLD) },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, pattern: { t: 'bolt', c: GOLD, o: PB }, swoosh: PB },
        { id: 'powder', name: 'Powder Blue', base: PB, pattern: { t: 'bolt', c: GOLD, o: W }, swoosh: W },
        { id: 'gold', name: 'Gold', base: GOLD, pattern: { t: 'bolt', c: W, o: PB }, swoosh: PB },
        { id: 'navy', name: 'Navy', base: NAVY, pattern: { t: 'bolt', c: W, o: GOLD }, swoosh: W },
      ],
      socks: [
        { id: 'powder', name: 'Powder Blue', base: PB },
        { id: 'white', name: 'White', base: W },
        { id: 'gold', name: 'Gold', base: GOLD },
        { id: 'navy', name: 'Navy', base: NAVY },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'powder', p: 'white', s: 'powder', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'powder', s: 'white', status: 'worn' },
        { name: 'Charger Power (All Gold)', h: 'white', j: 'gold', p: 'gold', s: 'gold', status: 'worn' },
        { name: 'Charger Power / White Pants', h: 'white', j: 'gold', p: 'white', s: 'gold', debut: '2026-12-06', note: 'Gold over white pants vs TB' },
        { name: 'Super Chargers', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn', note: 'Nov 8, Nov 29, Jan 3' },
      ],
    };
  })(),

  // ───────────────────────────── NFC EAST ─────────────────────────────
  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const NAVY = '#041E42', ROY = '#003594', SB = '#9CA7AE', GR = '#B4B8BC';
    const star = (fill, at = 'top', size = 0.11) => ({ t: 'star', fill, stroke: fill, size, at });
    return {
      id: 'DAL', city: 'Dallas', name: 'Cowboys', conf: 'NFC', div: 'East',
      colors: [NAVY, SB, W], font: 'cowboys',
      helmets: [
        { id: 'silver', name: 'Metallic Silver-Blue', tag: 'Primary', shell: SB, finish: 'metallic', mask: GR, stripe: sym([NAVY, 1.1], [W, 1.1]), logo: { img: 'DAL', size: 0.13, at: [0.45, 0.18] } },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: GR, stripe: sym([NAVY, 1.1], [W, 1.1]), logo: { img: 'DAL', size: 0.13, at: [0.45, 0.18] } },
      ],
      jerseys: [
        { id: 'white', name: 'White', tag: 'Home', base: W, num: [ROY], numStyle: 'twill', tv: 'shoulder', plateFont: 'collegeSlab', sleeve: { stripes: rep(ROY, 1.1, 0.7, 3, W), from: 1.2 } },
        { id: 'navy', name: 'Navy', tag: 'Road', base: NAVY, num: [W, NAVY, W], numO: [0.03, 0.025], numStyle: 'twill', tv: 'shoulder', plateFont: 'collegeSlab',
          word: { img: 'DAL_word@#FFFFFF', h: 0.027 },
          collar: [[W, 0.6], [GR, 0.6], [W, 0.6], [GR, 0.6]], sleeve: { stripes: [[W, 0.3], [GR, 1.3], [W, 0.3]], from: 2 }, shoulder: star(W, 'outer', 0.07) },
        { id: 'arctic', name: 'Arctic Cowboy', tag: 'Color Rush', base: W, num: [NAVY, W, NAVY], numO: [0.03, 0.025], numStyle: 'pressed', tv: 'sleeve', sleeve: { cap: NAVY, top: [NAVY, 0] }, shoulder: star(W) },
        { id: '60s', name: '1960s', tag: 'Throwback', base: NAVY, num: [W], numStyle: 'twill', tv: 'sleeve', panels: { yoke: [W, 14, 0] }, sleeve: { cap: W }, shoulder: star(NAVY) },
      ],
      pants: [
        { id: 'silver', name: 'Silver-Green', base: '#C8D3D3', stripe: fwd(sym([ROY, 1], [W, 0.7])) },
        { id: 'gray', name: 'Silver', base: '#C4C6C8', stripe: fwd(sym([NAVY, 1], [W, 0.7])) },
        { id: 'white', name: 'White', base: W, stripe: fwd(sym([NAVY, 1], [W, 0.6])) },
      ],
      socks: [
        { id: 'royal', name: 'Royal', base: ROY, lower: [W, 20] },
        { id: 'navy', name: 'Navy', base: NAVY, lower: [W, 20] },
        { id: 'white', name: 'White', base: W },
        { id: 'tb', name: 'Throwback White', base: W, stripes: rep(NAVY, 1.4, 0.9, 3, W), stripesFrom: 13 },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'white', p: 'silver', s: 'royal', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'navy', p: 'gray', s: 'navy', status: 'worn' },
        { name: 'Arctic Cowboy', h: 'white', j: 'arctic', p: 'white', s: 'white', status: 'worn', note: 'Also Oct 26 at PHI, Dec 27 vs JAX' },
        { name: '1960s Thanksgiving', h: 'white', j: '60s', p: 'white', s: 'tb', status: 'worn', note: 'Thanksgiving vs PHI' },
        { name: 'White Helmet / Navy', h: 'white', j: 'navy', p: 'white', s: 'navy', debut: '2026-11-08', note: 'At IND' },
      ],
    };
  })(),

  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const B = '#0B2265', RED = '#A71930', ROY = '#1D4FB8', GR = '#B5B9BC';
    return {
      id: 'NYG', city: 'New York', name: 'Giants', conf: 'NFC', div: 'East',
      colors: [B, RED, GR], font: 'giants',
      helmets: [
        { id: 'blue', name: 'Blue', tag: 'Primary', shell: '#123C8C', finish: 'metallic', mask: GR, stripe: null, logo: { img: 'NYG_white', size: 0.11, at: [0.44, 0.27] }, numbers: W },
        { id: 'legacy', name: 'Legacy', tag: 'Throwback', shell: '#0A1640', finish: 'gloss', mask: GR, stripe: [[RED, 0.8]],
          logo: { t: 'text', s: 'GIANTS', fill: W, stroke: RED, font: 'italic', size: 0.15, at: [0.46, 0.3] } },
      ],
      jerseys: [
        { id: 'blue', name: 'Blue', tag: 'Home', base: B, num: [W], numStyle: 'twill', tv: 'shoulder', centerLogo: 'NYG@white' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [RED], numStyle: 'twill', tv: 'shoulder', centerLogo: 'NYG@#A71930', sleeve: { stripes: rep(RED, 0.9, 0.6, 4), from: 1.2 } },
        { id: 'vintage', name: 'Vintage White', tag: 'Color Rush', base: W, num: [ROY, RED], numStyle: 'pressed', tv: 'sleeve', centerLogo: 'NYG@#1D4FB8', plateOutline: [RED],
          collar: [[RED, 0.7], [W, 0.5], [ROY, 0.8]], sleeve: { stripes: [[RED, 0.6], [ROY, 0.6]], from: 1.2 } },
        { id: 'legacy', name: 'Legacy Blue', tag: 'Throwback', base: ROY, num: [W, RED], numStyle: 'twill', tv: 'sleeve', plateOutline: [RED], neckTag: { s: 'ONCE A GIANT, ALWAYS A GIANT', c: RED, at: 'inside' },
          collar: [[RED, 0.7], [W, 0.5], [RED, 0.7]], sleeve: { stripes: [[RED, 0.6], [W, 0.6], [RED, 0.6]], from: 1.2 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: fwd(sym([RED, 0.6], [W, 0.3], [B, 1])) },
        { id: 'whitered', name: 'White (Red Stripes)', base: W, stripe: fwd([[RED, 0.9], [null, 0.7], [RED, 0.9]]) },
        { id: 'legacy', name: 'Legacy White', tag: 'Throwback', base: W, stripe: fwd(sym([RED, 0.7], [ROY, 1])) },
      ],
      socks: [
        { id: 'blue', name: 'Blue', base: B },
        { id: 'red', name: 'Red', base: RED },
        { id: 'white', name: 'White', base: W },
        { id: 'legacy', name: 'Legacy Blue', base: ROY, lower: [W, 22] },
      ],
      looks: [
        { name: 'Home', h: 'blue', j: 'blue', p: 'white', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'blue', j: 'white', p: 'whitered', s: 'red', status: 'worn' },
        { name: 'Vintage White', h: 'legacy', j: 'vintage', p: 'legacy', s: 'white', status: 'worn', note: 'Nov 8 at PHI, Nov 12 vs WAS' },
        { name: 'Legacy', h: 'legacy', j: 'legacy', p: 'legacy', s: 'legacy', status: 'worn', note: 'Super Bowl XXI 40th: Oct 4 and Dec 6' },
      ],
    };
  })(),

  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const MG = '#004C54', SIL = '#A5ACAF', KG = '#2E8B47', BK = '#0B0B0B';
    const wing = (fill, stroke) => ({ t: 'wing', fill, stroke, size: 0.2, at: [0.35, 0.22] });
    const eaglesJersey = { numStyle: 'twill', numO: [0.018, 0], plateFont: 'clarendon', plateArch: 0.05, plateTracking: 0.06, tv: 'shoulder', sleeveLogo: 'PHI' };
    return {
      id: 'PHI', city: 'Philadelphia', name: 'Eagles', conf: 'NFC', div: 'East',
      colors: [MG, SIL, BK], font: 'eagles',
      helmets: [
        { id: 'green', name: 'Midnight Green', tag: 'Primary', shell: MG, finish: 'metallic', mask: BK, stripe: null, logo: wing('#E3E6E8', K) },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: wing('#E3E6E8', K) },
        { id: 'kelly', name: 'Kelly Green', tag: 'Throwback', shell: KG, finish: 'gloss', mask: '#C0C3C6', stripe: null, logo: wing(W, '#C0C3C6') },
      ],
      jerseys: [
        { id: 'green', name: 'Midnight Green', tag: 'Home', base: MG, num: [W, SIL], numShadow: { color: BK, dx: 0.045, dy: 0.045 }, ...eaglesJersey, plateOutline: [BK],
          word: { img: 'PHI_word@#FFFFFF', h: 0.024 }, collar: [[BK, 2.8]], sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [MG, SIL], numShadow: { color: BK, dx: 0.045, dy: 0.045 }, ...eaglesJersey, plateOutline: [BK],
          word: { img: 'PHI_word@#0B0B0B', h: 0.024 }, collar: [[BK, 2.8]], sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [W, SIL], numShadow: { color: MG, dx: 0.045, dy: 0.045 }, ...eaglesJersey,
          word: { img: 'PHI_word@#FFFFFF', h: 0.024 }, collar: [[MG, 2.8]], sleeve: { stripes: [[MG, 3]], from: 0 } },
        { id: 'kelly', name: 'Kelly Green', tag: 'Throwback', base: KG, num: [W, BK], numO: [0.035, 0], numStyle: 'twill', font: 'chiefs', tv: 'shoulder', sleeveLogo: 'PHI_tb', plateOutline: [BK] },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: fwd([['#8A8D8F', 0.8], [BK, 0.6]]) },
        { id: 'green', name: 'Midnight Green', base: MG, stripe: fwd([[SIL, 0.6], [BK, 0.6]]) },
        { id: 'black', name: 'Black', base: BK, stripe: fwd([[SIL, 0.8]]) },
        { id: 'silver', name: 'Kelly Silver', tag: 'Throwback', base: '#C9CBCD', stripe: fwd(sym([KG, 0.9], [W, 0.6])) },
      ],
      socks: [
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
        { id: 'green', name: 'Midnight Green', base: MG },
        { id: 'kelly', name: 'Kelly Stripes', base: W, stripes: [[KG, 1.6], [null, 0.9], [KG, 1.6]], stripesFrom: 14 },
      ],
      looks: [
        { name: 'Home', h: 'green', j: 'green', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road', h: 'green', j: 'white', p: 'green', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn', note: 'Dec 19 vs SEA' },
        { name: 'Kelly Green', h: 'kelly', j: 'kelly', p: 'silver', s: 'kelly', status: 'worn', note: 'Nov 8 vs NYG, Dec 24 vs HOU' },
      ],
    };
  })(),

  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const BUR = '#5A1414', GOLD = '#FFB612', BK = '#0B0B0B';
    // 2026 redesign: Super Bowl-era burgundy and white as the primaries, solid
    // block numerals with a gold outline, two-colour cuffs and two-stripe pants.
    // Pants stripe widths run from the back of the leg to the front: outer colour at the seam, the inner one in front of it.
    const sides = (inner, outer) => [[outer, 1.1], [inner, 0.7]];
    const cuff = (c) => ({ stripes: [[GOLD, 1.1], [c, 0.8]], from: 0.3 });
    return {
      id: 'WAS', city: 'Washington', name: 'Commanders', conf: 'NFC', div: 'East',
      colors: [BUR, GOLD, W], font: 'commanders',
      helmets: [
        { id: 'burgundy', name: 'Burgundy', tag: 'Primary · New 2026', shell: BUR, finish: 'gloss', mask: GOLD, stripe: sym([W, 0.6], [null, 0.4], [GOLD, 1.5]), logo: { img: 'WAS', size: 0.12, at: [0.4, 0.28] } },
        { id: 'black', name: 'Hail Raiser Black', tag: 'New 2026', debut: '2026-11-23', shell: BK, finish: 'matte', mask: BK, stripe: [[BUR, 0.8]],
          logo: { t: 'text', s: 'W', fill: BUR, stroke: GOLD, font: 'block', spear: GOLD, at: [0.42, 0.3] } },
      ],
      jerseys: [
        { id: 'burgundy', name: 'Burgundy', tag: 'Home · New 2026', base: BUR, num: [W, GOLD], numO: [0.03, 0], numStyle: 'twill', plateColor: GOLD, plateOutline: [], plateBar: true, tv: 'sleeve', collar: [[BUR, 2.6]],
          sleeve: cuff(W) },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [BUR, GOLD], numO: [0.03, 0], numStyle: 'twill', plateOutline: [GOLD], tv: 'sleeve', collar: [[BUR, 2.8]],
          sleeve: cuff(BUR) },
        { id: 'hail', name: 'Hail Raiser', tag: 'New 2026', debut: '2026-11-23', base: BK, num: [BUR, GOLD], numO: [0.03, 0], numStyle: 'twill', plateOutline: [GOLD], tv: 'sleeve', collar: [[BK, 2.6]],
          sleeve: cuff(BUR) },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: fwd(sides(BUR, GOLD)) },
        { id: 'burgundy', name: 'Burgundy', base: BUR, stripe: fwd(sides(GOLD, W)) },
        { id: 'gold', name: 'Gold', base: GOLD, stripe: fwd(sides(W, BUR)) },
        { id: 'black', name: 'Hail Raiser Black', debut: '2026-11-23', base: BK, stripe: fwd(sides(BUR, GOLD)) },
      ],
      socks: [
        { id: 'burgundy', name: 'Burgundy', base: BUR },
        { id: 'white', name: 'White Striped', base: W, stripes: [[BUR, 1.6], [GOLD, 1.6]], stripesFrom: 14 },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'burgundy', j: 'burgundy', p: 'white', s: 'burgundy', status: 'worn' },
        { name: 'Home Gold Pants', h: 'burgundy', j: 'burgundy', p: 'gold', s: 'burgundy', status: 'worn' },
        { name: 'Road', h: 'burgundy', j: 'white', p: 'burgundy', s: 'white', status: 'worn' },
        { name: 'Road Gold Pants', h: 'burgundy', j: 'white', p: 'gold', s: 'white', status: 'worn' },
        { name: 'Hail Raiser', h: 'black', j: 'hail', p: 'black', s: 'black', debut: '2026-11-23', note: 'vs CIN, then Dec 20 vs ATL' },
      ],
    };
  })(),

  // ───────────────────────────── NFC NORTH ─────────────────────────────
  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const NAVY = '#0B162A', OR = '#E64100';
    const hem = (a, b) => ({ stripes: [[a, 0.8], [b, 0.5], [a, 0.8], [b, 0.5], [a, 0.8]], from: 1.6 });
    const sock = (base, a, b) => ({ base, stripes: [[a, 0.8], [b, 0.5], [a, 0.8], [b, 0.5], [a, 0.8]], stripesFrom: 13, lower: [W, 20] });
    // the "GSH" (George Stanley Halas) memorial patch on the player's left sleeve
    const gsh = (c) => ({ L: 'GSH', R: '', c, font: 'collegeSlab', h: 0.04 });
    return {
      id: 'CHI', city: 'Chicago', name: 'Bears', conf: 'NFC', div: 'North',
      colors: [NAVY, OR, W], font: 'bears',
      helmets: [
        { id: 'navy', name: 'Navy', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null, logo: { img: 'CHI', size: 0.12, at: [0.46, 0.22] } },
        { id: 'orange', name: 'Orange', tag: 'New 2026', debut: '2026-12-25', shell: OR, finish: 'gloss', mask: NAVY, stripe: null, logo: { img: 'CHI@#0B162A', size: 0.12, at: [0.46, 0.22] } },
        { id: 'throwback', name: '1936 Navy', tag: 'Throwback', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: [[OR, 3], [NAVY, 1.4], [OR, 3]], logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'navy', name: 'Navy', tag: 'Home', base: NAVY, num: [W, OR], numO: [0.03, 0], numStyle: 'twill', tv: 'shoulder', plateOutline: [OR], sleeve: hem(OR, W), sleeveText: gsh([W, OR]) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, OR], numO: [0.03, 0], numStyle: 'twill', tv: 'shoulder', plateOutline: [OR], sleeve: hem(NAVY, OR), sleeveText: gsh([NAVY, OR]) },
        { id: 'orange', name: 'Orange', tag: 'Alternate', base: OR, num: [W, NAVY], numO: [0.03, 0], numStyle: 'twill', tv: 'shoulder', plateOutline: [NAVY], sleeve: hem(NAVY, W), sleeveText: gsh([W, NAVY]) },
        { id: 'throwback', name: '1936', tag: 'Throwback', base: W, num: [NAVY], numStyle: 'twill', font: 'chiefs', loop: [[NAVY, 1], [OR, 0.8], [NAVY, 1], [OR, 0.8], [NAVY, 1]], loopAt: 18 },
        { id: 'monsters', name: 'Monsters Rivalries', tag: 'Rivalries · New', debut: '2026-12-25', base: NAVY, num: [OR, W], numO: [0.04, 0], numStyle: 'pressed', font: 'chiefs', plateOutline: [W],
          neckTag: { s: 'MONSTERS OF THE MIDWAY', c: OR, at: 'inside' },
          chestPatch: { t: 'football', s: 'GSH', fill: OR, text: NAVY }, sleeve: { vbars: { stripes: [[OR, 1.4], [null, 1.2], [W, 0.5], [null, 1.2], [OR, 1.4]], len: 10 } } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: fwd(sym([OR, 0.7], [NAVY, 0.9])) },
        { id: 'navy', name: 'Navy', base: NAVY, stripe: fwd(sym([OR, 0.7], [W, 0.9])) },
        { id: 'orange', name: 'Orange', tag: 'New 2026', debut: '2026-12-25', base: OR, stripe: fwd(sym([W, 0.6], [NAVY, 0.9])) },
      ],
      socks: [
        { id: 'navy', name: 'Navy', ...sock(NAVY, OR, W) },
        { id: 'white', name: 'White', ...sock(W, NAVY, OR), lower: null },
        { id: 'orange', name: 'Orange', ...sock(OR, NAVY, W) },
        { id: 'hoops', name: 'Hooped', base: NAVY, stripes: rep(OR, 0.9, 0.9, 10), stripesFrom: 8 },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'navy', p: 'white', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'white', status: 'worn' },
        { name: 'Orange Alternate', h: 'orange', j: 'orange', p: 'white', s: 'orange', status: 'worn' },
        { name: '1936 Throwback', h: 'throwback', j: 'throwback', p: 'navy', s: 'hoops', status: 'worn' },
        { name: 'Monsters Rivalries', h: 'orange', j: 'monsters', p: 'orange', s: 'navy', debut: '2026-12-25', note: 'Christmas vs GB' },
      ],
    };
  })(),

  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const HB = '#0076B6', SIL = '#B0B7BC', BK = '#0D0D0D', CON = '#DADCDD', LB = '#3F8FD0';
    return {
      id: 'DET', city: 'Detroit', name: 'Lions', conf: 'NFC', div: 'North',
      colors: [HB, SIL, BK], font: 'lions',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#BCC2C6', finish: 'metallic', mask: HB, stripe: null, logo: { img: 'DET', faces: 'right', size: 0.15, at: [0.46, 0.22] } },
        { id: 'blue', name: 'Honolulu Blue', tag: 'Alternate', shell: HB, finish: 'matte', mask: BK, stripe: null, logo: { img: 'DET@#0D0D0D', faces: 'right', size: 0.15, at: [0.46, 0.22] } },
        { id: 'throwback', name: 'Throwback Silver', tag: 'Throwback', shell: '#BCC2C6', finish: 'metallic', mask: '#C4C8CB', stripe: null, logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'blue', name: 'Honolulu Blue', tag: 'Home', base: HB, num: [W, '#D5D9DC'], numO: [0.02, 0], numStyle: 'twill', tv: 'shoulder', plateOutline: [], plateBar: true, sleeve: { stripes: [[SIL, 1], [W, 0.6], [SIL, 1]], from: 1.6 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [HB, SIL], numStyle: 'twill', tv: 'shoulder', plateOutline: [SIL], word: { s: 'DETROIT', c: HB, font: 'italic' },
          sleeve: { stripes: [[HB, 1], [W, 0.6], [HB, 1]], from: 1.6 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [HB, SIL], numStyle: 'twill', tv: 'shoulder', plateColor: '#E4E7EA', plateOutline: [], word: { img: 'DET_word@#0076B6', h: 0.03 },
          sleeve: { stripes: [[HB, 1], [BK, 0.6], [HB, 1]], from: 1.6 } },
        { id: 'throwback', name: 'Throwback', tag: 'Throwback', base: HB, num: [SIL], numStyle: 'twill', font: 'chiefs' },
        { id: 'concrete', name: 'Concrete Rivalries', tag: 'Rivalries · New', debut: '2026-11-01', base: CON, num: ['#202225', HB], numO: [0.035, 0], font: 'lionsItalic', numPattern: { t: 'lines', c: '#3A3D42', step: 0.03, w: 0.5 }, tv: 'shoulder', plateOutline: [HB], word: { s: 'DETROIT', c: HB, font: 'italic' },
          neckTag: { s: 'DEFEND THE DEN', c: HB, at: 'inside' },
          loop: [[HB, 1], [BK, 2.4]], loopAt: 18, loopWeave: { c: '#34373C' } },
      ],
      pants: [
        { id: 'blue', name: 'Honolulu Blue', base: HB },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
        { id: 'silver', name: 'Silver', base: '#C9CCCE' },
        { id: 'concrete', name: 'Concrete', tag: 'Rivalries', debut: '2026-11-01', base: '#E4E5E6', stripe: fwd([[BK, 1.2]]), stripeTaper: [0.4, 1.4] },
      ],
      socks: [
        { id: 'blue', name: 'Blue', base: HB },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'blue', p: 'blue', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'blue', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Throwback', h: 'throwback', j: 'throwback', p: 'silver', s: 'blue', status: 'worn', note: 'Thanksgiving' },
        { name: 'Concrete Rivalries', h: 'blue', j: 'concrete', p: 'concrete', s: 'black', debut: '2026-11-01', note: 'Debut vs MIN' },
      ],
    };
  })(),

  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const G = '#203731', GOLD = '#FFB612', DS = '#3F4E45', ALB = '#ECE3D3', NAVY = '#1E2A4A', RUST = '#B8653A';
    return {
      id: 'GB', city: 'Green Bay', name: 'Packers', conf: 'NFC', div: 'North',
      colors: [G, GOLD, W], font: 'packers',
      helmets: [
        { id: 'gold', name: 'Gold', tag: 'Primary', shell: GOLD, finish: 'gloss', mask: G, stripe: sym([G, 1.3], [W, 1.3]), logo: { img: 'GB', size: 0.115, at: [0.46, 0.22] } },
        { id: 'leather', name: '1923 Leather', tag: 'Throwback · New', debut: '2026-12-13', shell: '#7A4A2A', finish: 'matte', mask: K, stripe: null, pattern: { t: 'leather' }, logo: { t: 'none' } },
        { id: 'alabaster', name: 'Alabaster', tag: 'Rivalries · New', debut: '2026-10-11', shell: ALB, finish: 'gloss', mask: DS, stripe: [[GOLD, 1.2]], logo: { img: 'GB', size: 0.115, at: [0.46, 0.22] } },
      ],
      jerseys: [
        { id: 'green', name: 'Green', tag: 'Home', base: G, num: [W], numStyle: 'twill', tv: 'shoulder', collar: [[GOLD, 0.5], [W, 1.4], [GOLD, 0.6]],
          sleeve: { stripes: [[GOLD, 1.2], [W, 1.2], [GOLD, 1.2]], from: 1.6 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [G], numStyle: 'twill', tv: 'shoulder', collar: [[G, 0.4], [GOLD, 1.4], [G, 0.5]],
          sleeve: { stripes: [[G, 1.2], [GOLD, 1.2], [G, 1.2]], from: 1.6 } },
        { id: 'y1923', name: '1923', tag: 'Throwback · New', debut: '2026-12-13', base: NAVY, num: ['#F2A33A'], numStyle: 'twill', font: 'packers',
          sleeve: { stripes: rep('#F2A33A', 0.6, 0.9, 3), from: 4 } },
        { id: 'riv', name: 'Stock Certificate', tag: 'Rivalries · New', debut: '2026-10-11', base: DS, num: [ALB, GOLD], numO: [0.03, 0], numStyle: 'pressed', font: 'serifNum', tv: 'shoulder', plateOutline: [GOLD],
          neckTag: { s: 'MAKING HISTORY SINCE 1919', c: GOLD, at: 'inside' },
          collar: [[GOLD, 0.5], [ALB, 1.4], [GOLD, 0.6]], chestPatch: { t: 'text', s: 'GB', fill: GOLD, stroke: DS, font: 'serifNum' }, sleeve: { stripes: [[ALB, 1], [GOLD, 1], [ALB, 1]], from: 1.6 } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: fwd(sym([G, 0.9], [W, 0.9])) },
        { id: 'rust', name: '1923 Rust', tag: 'Throwback', debut: '2026-12-13', base: RUST },
        { id: 'alabaster', name: 'Alabaster', tag: 'Rivalries', debut: '2026-10-11', base: ALB, stripe: fwd(sym([GOLD, 0.9], [DS, 0.9])) },
      ],
      socks: [
        { id: 'green', name: 'Green', base: G },
        { id: 'white', name: 'White', base: W },
        { id: 'navy', name: '1923 Navy', base: NAVY },
        { id: 'ds', name: 'Rivalries Green', base: DS },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'green', p: 'gold', s: 'green', status: 'worn' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'white', status: 'worn' },
        { name: 'Stock Certificate', h: 'alabaster', j: 'riv', p: 'alabaster', s: 'ds', debut: '2026-10-11', note: 'Rivalries debut vs CHI' },
        { name: '1923 Throwback', h: 'leather', j: 'y1923', p: 'rust', s: 'navy', debut: '2026-12-13', note: 'vs BUF, hand-painted leather-look helmet' },
      ],
    };
  })(),

  (() => {
    // pants stripes sit on the side seam, which is ~1.5 cm behind the front-view silhouette: nudge them forward
    const fwd = (s) => s && [[null, 3], ...s];
    const P = '#4F2683', GOLD = '#FFC62F', DP = '#33205C', DKP = '#2A1552';
    const horn = (fill, stroke) => ({ t: 'horn', fill, stroke, size: 0.24, at: [0.5, 0.2] });
    // cream shoulder-cap wedge with a gold stripe under it, seen from behind
    const capWedge = { shapes: [['#E9DFC4', [[0.1, 0.1], [0.31, 0.06], [0.345, -0.01], [0.2, 0.03]], 0.01], [GOLD, [[0.2, 0.03], [0.345, -0.01], [0.34, -0.035], [0.19, 0.0]], 0.005]] };
    return {
      id: 'MIN', city: 'Minnesota', name: 'Vikings', conf: 'NFC', div: 'North',
      colors: [P, GOLD, W], font: 'vikings',
      helmets: [
        { id: 'purple', name: 'Purple', tag: 'Primary', shell: P, finish: 'gloss', mask: K, stripe: null, logo: horn(W, GOLD) },
        { id: 'winter', name: 'Winter Warrior', tag: 'Alternate', shell: W, finish: 'gloss', mask: '#C0C4C8', stripe: null, logo: horn(W, P) },
        { id: 'classic', name: 'Purple People Eater', tag: 'Throwback', shell: DKP, finish: 'gloss', mask: '#C0C4C8', stripe: null, logo: horn(W, GOLD) },
        { id: 'riv', name: 'Rivalries', tag: 'New 2026', debut: '2026-12-20', shell: DP, finish: 'metallic', mask: '#A68A4E', stripe: [[GOLD, 0.8]], logo: horn('#EFE6CF', '#A68A4E') },
      ],
      jerseys: [
        { id: 'purple', name: 'Purple', tag: 'Home', base: P, num: [W, GOLD], numO: [0.02, 0], numStyle: 'twill', tv: 'shoulder', word: { img: 'MIN_word@#FFC62F', h: 0.045 }, plateArch: 0.1, plateOutline: [], backShoulder: capWedge,
          sleeve: { stripes: [[GOLD, 1.6], [W, 0.6]], from: 1.4 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [P], numStyle: 'twill', tv: 'shoulder', word: { img: 'MIN_word@#4F2683', h: 0.045 }, plateArch: 0.1,
          sleeve: { stripes: [[GOLD, 1.6], [P, 0.6]], from: 1.4 } },
        { id: 'winter', name: 'Winter Warrior', tag: 'Alternate', base: W, num: [P, '#C0C4C8'], numO: [0.02, 0], numShadow: { color: '#B9BEC3', dx: 0.04, dy: 0.04 }, numStyle: 'pressed', word: { s: 'VIKINGS', c: '#A9AEB2', font: 'squareSans', tracking: 0.15 },
          sleeve: { stripes: [['#C9CDD1', 1.6], [P, 0.6]], from: 1.4 } },
        { id: 'classic', name: 'Purple People Eater', tag: 'Throwback', base: DKP, num: [W, GOLD], numO: [0.035, 0], numStyle: 'twill', font: 'chiefs', tv: 'shoulder',
          sleeve: { stripes: [[W, 0.9], [GOLD, 0.9], [W, 0.9], [GOLD, 0.9]], from: 1.4 } },
        { id: 'riv', name: 'Rivalries Deep Purple', tag: 'Rivalries · New', debut: '2026-12-20', base: DP, num: [W, '#A68A4E'], numO: [0.03, 0], numStyle: 'twill', word: { s: 'VIKINGS', c: W, font: 'condensed', tracking: 0.12 },
          sleeve: { knot: { c: '#A68A4E' } } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: fwd([[P, 0.6], [GOLD, 1]]) },
        { id: 'purple', name: 'Purple', base: P, stripe: fwd([[W, 0.6], [GOLD, 1]]) },
        { id: 'winter', name: 'Winter White', base: W, stripe: fwd([[P, 0.6], ['#C0C4C8', 1]]) },
        { id: 'classic', name: 'Throwback White', tag: 'Throwback', base: W, stripe: fwd(sym([GOLD, 0.6], [DKP, 1])) },
        { id: 'riv', name: 'Rivalries Purple', debut: '2026-12-20', base: DP, stripe: fwd([[W, 0.6], ['#A68A4E', 0.6]]) },
      ],
      socks: [
        { id: 'purple', name: 'Purple', base: P },
        { id: 'white', name: 'White', base: W },
        { id: 'deep', name: 'Deep Purple', base: DKP },
      ],
      looks: [
        { name: 'Home', h: 'purple', j: 'purple', p: 'white', s: 'purple', status: 'worn' },
        { name: 'Road', h: 'purple', j: 'white', p: 'purple', s: 'white', status: 'worn' },
        { name: 'Winter Warrior', h: 'winter', j: 'winter', p: 'winter', s: 'white', status: 'worn', note: 'Dec 27 vs WAS' },
        { name: 'Purple People Eater', h: 'classic', j: 'classic', p: 'classic', s: 'deep', status: 'worn', note: 'Opener vs GB, Sep 13' },
        { name: 'Rivalries', h: 'riv', j: 'riv', p: 'riv', s: 'deep', debut: '2026-12-20', note: 'Debut vs DET' },
      ],
    };
  })(),

  // ───────────────────────────── NFC SOUTH ─────────────────────────────
  (() => {
    const R = '#A71930', BK = '#0B0B0C', SIL = '#A5ACAF';
    // 2026 stripe: silver | white | black | red | black | white | silver (red + black from the 1966 original, silver added)
    const stripe26 = [[SIL, 0.8], [W, 0.5], [BK, 1.1], [R, 1.1], [BK, 1.1], [W, 0.5], [SIL, 0.8]];
    return {
      id: 'ATL', city: 'Atlanta', name: 'Falcons', conf: 'NFC', div: 'South',
      colors: [R, BK, SIL], font: 'falcons',
      helmets: [
        // low-gloss black shell, plain silver facemask (replaces the satin black / brushed nickel of 2020-25)
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'matte', mask: SIL, stripe: null, logo: { img: 'ATL', faces: 'right', size: 0.15, at: [0.46, 0.22] } },
        // 1966 throwback: red shell, black centre stripe edged in white, silver mask
        { id: 'red', name: '1966 Red', tag: 'Throwback', shell: R, finish: 'gloss', mask: SIL, stripe: sym([W, 0.5], [BK, 3.0]), logo: { img: 'ATL_tb', faces: 'left', size: 0.11, at: [0.46, 0.24] } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home · New 2026', base: R, num: [W, BK], numO: [0.025, 0], tv: 'shoulder',
          numStyle: 'twill', word: { s: 'FALCONS', c: W, font: 'squareBlock', h: 0.023, tracking: 0.18 },
          neckTag: { s: 'DIRTY BIRDS', c: W, font: 'squareBlock', at: 'inside' }, sleeveLogo: 'ATL', swoosh: W,
          plateFont: 'falconsPlate', plateTracking: 0.04, plateOutline: [BK] },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [R, BK], numO: [0.025, 0], tv: 'shoulder',
          numStyle: 'twill', word: { s: 'ATLANTA', c: BK, font: 'squareBlock', h: 0.023, tracking: 0.18 },
          neckTag: { s: 'DIRTY BIRDS', c: R, font: 'squareBlock', at: 'inside' }, sleeveLogo: 'ATL', swoosh: R,
          plateFont: 'falconsPlate', plateTracking: 0.04, plateOutline: [BK] },
        { id: 'y1966', name: '1966 Black', tag: 'Throwback', base: BK, num: [W, R], numO: [0.03, 0], font: 'block', numStyle: 'twill', tv: 'shoulder', sleeveLogo: 'ATL_tb', swoosh: W },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: stripe26, swoosh: R },
        { id: 'black', name: 'Black', tag: 'New 2026', base: BK, stripe: stripe26, swoosh: W },
        { id: 'tb', name: '1966 White', tag: 'Throwback', base: W, stripe: [[R, 1], [BK, 0.7]], swoosh: BK },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W },
        // 1966 throwback socks per the 2026 uniform sheet: white, with a black / white / black-red-black band set below the knee
        { id: 'tb', name: 'Throwback', base: W, stripes: [[BK, 2.2], [W, 1], [BK, 1], [R, 3.6], [BK, 1], [W, 1], [BK, 2.2]], stripesFrom: 9 },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'red', p: 'white', s: 'red', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'black', s: 'white', status: 'worn' },
        { name: 'Road (White Pants)', h: 'black', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: '1966 Throwback', h: 'red', j: 'y1966', p: 'tb', s: 'tb', debut: '2026-10-25', note: 'vs SF, then Dec 6 vs DET' },
      ],
    };
  })(),

  (() => {
    const BLUE = '#0085CA', BK = '#101820', SIL = '#BFC0BF';
    const logo = { img: 'CAR', faces: 'right', size: 0.15, at: [0.36, 0.2] };
    return {
      id: 'CAR', city: 'Carolina', name: 'Panthers', conf: 'NFC', div: 'South',
      colors: [BLUE, BK, SIL], font: 'panthers',
      helmets: [
        // metallic silver shell; thin process-blue centre stripe edged in black, black mask
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#C4C6C8', finish: 'metallic', mask: BK, stripe: sym([BK, 0.6], [BLUE, 1.5]), logo },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: [[BLUE, 1.2]], logo },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W, BLUE], numO: [0.025, 0], numStyle: 'twill', tv: 'shoulder', collar: [[BLUE, 4.2]], neckTag: { s: 'KEEP POUNDING', c: W, at: 'inside' }, plateArch: 0.1, plateOutline: [BLUE], sleeveLogo: 'CAR', swoosh: W,
          sweep: { t: 'raglan', c: BLUE, edge: SIL }, sleeve: { cap: BK } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, BLUE], numO: [0.025, 0], numStyle: 'twill', tv: 'shoulder', collar: [[BK, 4.2]], neckTag: { s: 'KEEP POUNDING', c: BK, at: 'inside' }, plateArch: 0.1, plateOutline: [BLUE], sleeveLogo: 'CAR', swoosh: BK,
          sweep: { t: 'raglan', c: BLUE, edge: BK } },
        { id: 'blue', name: 'Process Blue', tag: 'Alternate', base: BLUE, num: [W, BK], numO: [0.025, 0], numStyle: 'twill', tv: 'shoulder', collar: [[BK, 4.2]], neckTag: { s: 'KEEP POUNDING', c: W, at: 'inside' }, plateArch: 0.1, plateOutline: [BK], sleeveLogo: 'CAR', swoosh: W,
          sweep: { t: 'raglan', c: BK, edge: SIL } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[BLUE, 1.4], [BK, 0.6]], swoosh: BK },
        { id: 'silver', name: 'Silver', base: '#C9CACB', stripe: [[BLUE, 1.4], [BK, 0.6]], swoosh: BK },
        { id: 'blue', name: 'Process Blue', base: BLUE, stripe: [[BK, 1.4], [SIL, 0.5]], swoosh: W },
        { id: 'black', name: 'Black', base: BK, stripe: [[SIL, 0.5], [BLUE, 1.4]], swoosh: W },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'black', p: 'white', s: 'black', status: 'worn', note: 'Black jerseys: Weeks 4, 9, 11, 15, 17, 18' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'black', status: 'worn', note: 'All eight road games; no white at home in 2026' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Process Blue', h: 'silver', j: 'blue', p: 'blue', s: 'black', status: 'worn', note: 'Blue jerseys: Weeks 1, 7, 14' },
        { name: 'Process Blue (Black Helmet)', h: 'black', j: 'blue', p: 'black', s: 'black', status: 'worn', note: 'Sep 13 vs CHI: blue jersey, black pants, black socks, black helmet' },
      ],
    };
  })(),

  (() => {
    const GOLD = '#D3BC8D', BK = '#101820', RG = '#C2A418';
    const fleurGold = 'NO@#D3BC8D', fleurBlack = 'NO@#101820';
    // plate arch: BREES 9 (white), OLAVE 12 (black) and YIADOM 27 (Color Rush) are all nearly straight (<= 0.05); the old 0.3 was a misread
    const saintsPlate = { plateFont: 'clarendon', plateArch: 0.04 };
    return {
      id: 'NO', city: 'New Orleans', name: 'Saints', conf: 'NFC', div: 'South',
      colors: [GOLD, BK, W], font: 'saints',
      helmets: [
        // metallic old gold, black fleur-de-lis; black centre stripe edged in white
        { id: 'gold', name: 'Old Gold', tag: 'Primary', shell: GOLD, finish: 'metallic', mask: BK, stripe: sym([W, 0.4], [BK, 3.0]), logo: { img: 'NO', size: 0.11, at: [0.5, 0.2] } },
        // black shell with gold dots thickening toward the back, gold fleur
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, pattern: { t: 'halftone', c: GOLD }, logo: { img: fleurGold, size: 0.11, at: [0.5, 0.2] } },
        // 2025 Color Rush white shell: gold facemask, gold-edged centre stripe, gold fleur
        { id: 'white', name: 'White', tag: 'Color Rush', shell: W, finish: 'gloss', mask: RG, stripe: sym([BK, 0.35], [RG, 2.4]), logo: { img: 'NO@#CDB46A', size: 0.11, at: [0.5, 0.2] } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [GOLD, W], numO: [0.022, 0], numStyle: 'twill', tv: 'shoulder', collar: [[GOLD, 3.2]], ...saintsPlate, sleeveLogo: fleurGold, swoosh: GOLD },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, GOLD], plateColor: BK, numO: [0.022, 0], numStyle: 'twill', tv: 'shoulder', collar: [[BK, 3.2]], ...saintsPlate, sleeveLogo: 'NO', swoosh: BK },
        { id: 'gold', name: 'Gold', tag: 'Alternate', base: GOLD, num: [BK, W], numO: [0.025, 0], numStyle: 'twill', tv: 'shoulder', collar: [[BK, 3.2]], ...saintsPlate, sleeveLogo: fleurBlack, swoosh: BK },
        // Color Rush: gold numbers edged in black, black / gold diagonal bars on the sleeves, plain white collar
        { id: 'rush', name: 'Color Rush White', tag: 'Color Rush', base: W, num: [RG, BK], numO: [0.04, 0], numStyle: 'twill', tv: 'shoulder', swoosh: BK, ...saintsPlate,
          sleeve: { stripes: [[BK, 0.9], [RG, 0.9], [BK, 0.9], [RG, 0.9], [BK, 0.9]], from: 5 } },
      ],
      pants: [
        { id: 'black', name: 'Black', base: BK, hipLogo: fleurGold, swoosh: GOLD },
        { id: 'gold', name: 'Old Gold', base: GOLD, stripe: [[BK, 3.2]], hipLogo: 'NO', swoosh: BK },
        { id: 'white', name: 'Color Rush White', tag: 'Color Rush', base: W, stripe: sym([BK, 0.3], [RG, 1]), swoosh: BK },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'black', status: 'worn' },
        { name: 'Gold Alternate', h: 'black', j: 'gold', p: 'black', s: 'black', debut: '2026-11-08', note: 'Black helmet with gold jersey vs CLE' },
        { name: 'Color Rush', h: 'white', j: 'rush', p: 'white', s: 'white', status: 'worn', note: 'Oct 18, Nov 29, Dec 27' },
      ],
    };
  })(),

  (() => {
    const R = '#A6192E', PEW = '#34302B', BK = '#0A0A08', OR = '#FF7900';
    // chest wordmark: the red letter layer of the BUCCANEERS wordmark, tinted flat (the jersey lettering is one colour)
    const word = (c) => ({ img: `TB_word_name@${c}`, h: 0.03 });
    return {
      id: 'TB', city: 'Tampa Bay', name: 'Buccaneers', conf: 'NFC', div: 'South',
      colors: [R, PEW, OR], font: 'bucs',
      helmets: [
        { id: 'pewter', name: 'Pewter', tag: 'Primary', shell: PEW, finish: 'metallic', mask: BK, stripe: null, logo: { img: 'TB', faces: 'left', size: 0.15, at: [0.46, 0.22] } },
        { id: 'creamsicle', name: 'Creamsicle White', tag: 'Throwback', shell: W, finish: 'gloss', mask: OR, stripe: sym([R, 0.5], [OR, 2.6]),
          logo: { img: 'TB_tb', faces: 'left', size: 0.14, at: [0.5, 0.28] } },
      ],
      jerseys: [
        // black bar in the V-neck trim, black sleeve cuffs, white numbers edged in orange then black
        { id: 'red', name: 'Red', tag: 'Home', base: R, num: [W, OR, BK], numO: [0.025, 0.03], numStyle: 'twill', tv: 'shoulder', plateOutline: [BK], word: word(BK), sleeveLogo: 'TB', swoosh: W,
          collar: [[R, 0.8], [BK, 1.2], [R, 1]], sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, OR, BK], numO: [0.025, 0.03], numStyle: 'twill', tv: 'shoulder', plateColor: BK, word: word(BK), sleeveLogo: 'TB', swoosh: R,
          collar: [[W, 0.8], [BK, 1.2], [W, 1]], sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'pewter', name: 'Pewter', tag: 'Alternate', debut: '2026-12-20', base: PEW, num: [W, R], numO: [0.03, 0], numStyle: 'twill', tv: 'shoulder', word: word(R), sleeveLogo: 'TB', swoosh: R,
          collar: [[PEW, 0.8], [R, 1.2], [PEW, 1]], sleeve: { stripes: [[R, 3]], from: 0 } },
        { id: 'creamwhite', name: 'Creamsicle White', tag: 'Throwback', debut: '2026-12-06', base: W, num: [OR, R], numO: [0.025, 0], numStyle: 'twill', font: 'block', tv: 'sleeve', swoosh: OR,
          sleeve: { stripes: [[OR, 1.6], [R, 0.35]], from: 1 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[R, 0.8], [OR, 0.6], [BK, 0.9]], swoosh: R },
        { id: 'pewter', name: 'Pewter', base: PEW, stripe: [[R, 0.8], [OR, 0.6], [BK, 0.9]], swoosh: R },
        { id: 'pewteralt', name: 'Pewter (Red/White)', base: PEW, stripe: [[W, 0.4], [R, 0.9]], swoosh: R },
        { id: 'creamsicle', name: 'Creamsicle White', tag: 'Throwback', base: W, stripe: [[OR, 1], [R, 0.8]], swoosh: OR },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'pewter', name: 'Pewter', base: PEW },
        { id: 'cream', name: 'Throwback', base: W, stripes: [[R, 0.35], [OR, 1.6], [R, 0.35]], stripesFrom: 16 },
      ],
      looks: [
        { name: 'Home', h: 'pewter', j: 'red', p: 'white', s: 'black', status: 'worn' },
        { name: 'Road', h: 'pewter', j: 'white', p: 'pewter', s: 'black', status: 'worn' },
        { name: 'All Pewter', h: 'pewter', j: 'pewter', p: 'pewteralt', s: 'pewter', debut: '2026-12-20', note: 'vs NO; red / white pants stripe, solid pewter socks' },
        { name: 'Creamsicle Road', h: 'creamsicle', j: 'creamwhite', p: 'creamsicle', s: 'cream', debut: '2026-12-06', note: 'vs LAC (the home version sits out 2026)' },
      ],
    };
  })(),

  // ───────────────────────────── NFC WEST ─────────────────────────────
  (() => {
    const R = '#97233F', BK = '#101010', SAND = '#F1E2CE', OR = '#E8702A', GR = '#A5ACAF', BAND = '#D9DADC';
    const logo = { img: 'ARI', faces: 'right', size: 0.155, at: [0.42, 0.22] };
    // "CARDINALS" lettering band wrapped round the sleeve between two red pinstripe pairs
    const cuff = (mid, text) => ({ stripes: [[R, 0.5], [null, 0.4], [R, 0.5], [mid, 3.4], [R, 0.5], [null, 0.4], [R, 0.5]], from: 1.5, textBand: { s: 'CARDINALS', c: text, at: 4.9 } });
    const spots = { t: 'spots', c: '#9C8B74' };
    return {
      id: 'ARI', city: 'Arizona', name: 'Cardinals', conf: 'NFC', div: 'West',
      colors: [R, BK, W], font: 'cardinals',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: GR, stripe: null, logo },
        { id: 'sand', name: 'Desert Sand', tag: 'Rivalries', shell: '#EAD9C0', finish: 'matte', mask: R, stripe: null, logo },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: GR, stripe: null, logo },
      ],
      jerseys: [
        { id: 'red', name: 'Cardinal Red', tag: 'Home', base: R, num: [W, GR], numO: [0.03, 0], numStyle: 'twill', tv: 'shoulder', swoosh: W,
          word: { img: 'ARI_word_city@#FFFFFF', h: 0.034 }, neckTag: { s: 'PROTECT THE NEST', c: W, at: 'inside' } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, BK], numO: [0.03, 0], numStyle: 'twill', swoosh: R, plateOutline: [BK], plateO: [0.03], neckTag: { s: 'BIRD GANG', c: R, at: 'inside' }, sleeve: cuff(BAND, BK) },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [R, GR], numO: [0.03, 0], numStyle: 'twill', swoosh: W, neckTag: { s: 'BIRD GANG', c: R, at: 'inside' }, sleeve: cuff(W, BK) },
        // Rivalries: sandstorm-speckled jersey, red numbers with a copper offset shadow, Arizona flag on the sleeves
        { id: 'desert', name: 'Desert Rivalries', tag: 'Rivalries', base: SAND, num: [R, OR], numO: [0.03, 0], numShadow: { color: OR, dx: 0.04, dy: 0.04 }, numStyle: 'twill', swoosh: R,
          word: { img: 'ARI_word_city@#97233F', h: 0.034 }, pattern: spots, sleevePatch: { t: 'azflag' }, neckTag: { s: '★', c: OR, font: 'block', at: 'inside' } },
      ],
      pants: [
        { id: 'red', name: 'Red', base: R, swoosh: W },
        { id: 'white', name: 'White', base: W, stripe: [[GR, 0.8], [null, 0.4], [R, 0.8]], swoosh: R },
        { id: 'black', name: 'Black', base: BK, stripe: [[GR, 0.8], [null, 0.4], [R, 0.8]], swoosh: W },
        { id: 'sand', name: 'Desert Sand', tag: 'Rivalries', base: SAND, stripe: [[R, 0.9], [OR, 0.5]], pattern: spots, swoosh: R },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'All Red', h: 'white', j: 'red', p: 'red', s: 'red', status: 'worn', note: 'Seven games, home and road' },
        { name: 'All White', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn', note: 'Oct 11 vs DET, Nov 29 vs WAS' },
        { name: 'Desert Rivalries', h: 'sand', j: 'desert', p: 'sand', s: 'red', status: 'worn', note: 'Rivalries set; Sep 20 vs SEA' },
      ],
    };
  })(),

  (() => {
    const ROY = '#003594', SOL = '#FFD100', BK = '#0B0B0B';
    const ramhorn = (fill) => ({ t: 'ramhorn', fill, stroke: fill, size: 0.2, at: [0.2, -0.1] });
    // horn sleeve: the sleeve in one colour (cap) with the horn curling round it in the other.
    // Royal and Midnight jerseys: royal sleeve, Sol horn. White jersey: Sol sleeve, royal horn.
    // Every 2026 horn carries a thin ridge line in the sleeve colour inside its top limb.
    const rams = (cap, horn, sleeve = { cap, top: [cap, 0] }, weight = 1.1) => ({ sleeve, shoulder: { t: 'sleevehorn', fill: horn, line: cap, weight, at: 'outer', along: 0.02, lift: 0.4, minDot: 0.05, size: 0.25 } });
    // 2026: a Sol "LA" monogram on royal backing sits over the back of the collar
    const neck = { s: 'LA', c: ROY, bg: SOL, font: 'block' };
    return {
      id: 'LAR', city: 'Los Angeles', name: 'Rams', conf: 'NFC', div: 'West',
      colors: [ROY, SOL, W], font: 'rams',
      helmets: [
        { id: 'royal', name: 'Royal Horns', tag: 'Primary', shell: ROY, finish: 'gloss', mask: ROY, stripe: null, logo: ramhorn(SOL) },
        { id: 'black', name: 'Midnight Black', tag: 'Rivalries', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: ramhorn(SOL) },
        { id: 'fearsome', name: 'Fearsome White Horns', tag: 'New 2026', debut: '2026-11-25', shell: ROY, finish: 'gloss', mask: W, stripe: null, logo: ramhorn(W) },
      ],
      jerseys: [
        // 2026 refresh: solid (gradient-free) numbers, no chest tag, horn sleeves on both primaries
        { id: 'royal', name: 'Royal', tag: 'Home · Updated 2026', base: ROY, num: [SOL], numStyle: 'pressed', neckTag: neck, swoosh: W, ...rams(ROY, SOL) },
        { id: 'white', name: 'White', tag: 'Road · Updated 2026', base: W, num: [ROY], numStyle: 'pressed', plateBar: true, neckTag: neck, swoosh: ROY, ...rams(SOL, ROY) },
        { id: 'midnight', name: 'Midnight Mode', tag: 'Rivalries', base: BK, num: [W, ROY], numO: [0.02, 0], numPattern: { t: 'dots', c: '#C9CED6', step: 0.035, r: 0.18 }, swoosh: W,
          // black sleeve with a royal cap that breaks up into halftone dots below the horn; the
          // 2025 Rivalries horn has a broader top limb than the 2026 primaries
          ...rams(ROY, SOL, { cap: BK, top: [ROY, 9, 6] }, 1.2) },
        // Fearsome Foursome tribute: royal horns over the shoulders, TV numbers on the sleeves, black names
        { id: 'fearsome', name: 'Fearsome White', tag: 'New 2026', debut: '2026-11-25', base: W, num: [ROY, BK], numO: [0.03, 0], font: 'block', numStyle: 'twill', tv: 'sleeve', swoosh: BK,
          plateColor: BK, plateOutline: [], plateBar: true, sweep: { t: 'horn', c: ROY, lift: 0.7 } },
        // 1951 championship tribute: royal satin triple stripes on a Sol jersey
        { id: 'sol', name: 'Classic Sol', tag: '75th Anniversary', base: SOL, num: [ROY], font: 'block', numStyle: 'twill', neckTag: neck, swoosh: ROY, sleeve: { stripes: rep(ROY, 1, 0.7, 3), from: 3 } },
      ],
      pants: [
        { id: 'sol', name: 'Sol', base: SOL, stripe: [[ROY, 1], [W, 0.4]], swoosh: ROY },
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: [[ROY, 0.5], [SOL, 0.8]], swoosh: ROY },
        { id: 'royal', name: 'Royal', base: ROY, stripe: [[W, 0.6], [SOL, 0.9]], swoosh: W },
        { id: 'black', name: 'Midnight', tag: 'Rivalries', base: BK, stripe: [[SOL, 0.7], [ROY, 0.6]], swoosh: W },
        { id: 'fearsome', name: 'Fearsome White', debut: '2026-11-25', base: W, stripe: sym([BK, 0.3], [ROY, 1.8]), swoosh: BK },
        { id: 'classic', name: 'Classic Sol White', tag: '75th Anniversary', base: W, stripe: sym([ROY, 0.5], [SOL, 0.8]), swoosh: ROY },
      ],
      socks: [
        { id: 'royal', name: 'Royal', base: ROY },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'royal', j: 'royal', p: 'sol', s: 'royal', status: 'worn', note: 'Royal jersey five times in 2026' },
        { name: 'Road', h: 'royal', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'White jersey eight times in 2026' },
        { name: 'Midnight Mode', h: 'black', j: 'midnight', p: 'black', s: 'black', status: 'worn', note: 'Rivalries set; Christmas night at SEA' },
        { name: 'Fearsome White', h: 'fearsome', j: 'fearsome', p: 'fearsome', s: 'white', debut: '2026-11-25', note: 'Thanksgiving Eve vs GB' },
        { name: 'Classic Sol', h: 'royal', j: 'sol', p: 'classic', s: 'royal', status: 'worn', note: 'Sep 21 vs NYG, Dec 3 vs KC' },
      ],
    };
  })(),

  (() => {
    const SC = '#AA0000', GOLD = '#B3995D', BK = '#0B0B0B';
    const logo = { img: 'SF', size: 0.14, at: [0.46, 0.2] };
    const four = (c) => ({ stripes: rep(c, 0.9, 0.6, 4), from: 2.5 });
    // the chest 49ERS is a small flat slab-serif wordmark; the logo PNG (outlined italic) fills in when tinted flat, so it is typeset
    const word = (c) => ({ s: '49ERS', c, font: 'slab', h: 0.021, tracking: 0.1 });
    return {
      id: 'SF', city: 'San Francisco', name: '49ers', conf: 'NFC', div: 'West',
      colors: [SC, GOLD, BK], font: 'niners',
      helmets: [
        { id: 'gold', name: 'Metallic Gold', tag: 'Primary', shell: GOLD, finish: 'metallic', mask: '#BFC2C5', stripe: sym([W, 0.6], [SC, 2.8]), logo },
        { id: 'black', name: 'Faithful Black', tag: 'Rivalries', shell: BK, finish: 'gloss', mask: GOLD, stripe: [[SC, 3.0]], logo },
        { id: 'tb94', name: '1994 Gold', tag: 'Throwback', shell: '#BFA468', finish: 'gloss', mask: '#BFC2C5', stripe: sym([W, 0.6], [SC, 2.8]), logo },
      ],
      jerseys: [
        { id: 'scarlet', name: 'Scarlet', tag: 'Home', base: SC, num: [W, GOLD], numO: [0.02, 0], plateFont: 'roman', plateArch: 0.12, numStyle: 'twill', tv: 'shoulder', word: word('#FFFFFF'), swoosh: W, sleeve: four(W) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [SC, GOLD], numO: [0.02, 0], plateFont: 'roman', plateArch: 0.12, numStyle: 'twill', tv: 'shoulder', word: word(SC), swoosh: SC, sleeve: four(SC) },
        { id: 'faithful', name: 'Faithful (All Black)', tag: 'Rivalries', base: BK, num: [SC, GOLD], numO: [0.045, 0], font: 'western', numStyle: 'twill', tv: 'shoulder', word: { s: 'Faithful', c: GOLD, script: true },
          neckTag: { s: 'FAITHFUL TO THE BAY', c: GOLD, at: 'inside' }, swoosh: GOLD, sleeve: four(SC) },
        { id: 'tb94', name: '1994 Scarlet', tag: 'Throwback', base: SC, num: [W, BK], numO: [0.02, 0], numShadow: { color: BK, dx: 0.035, dy: 0.035 }, numStyle: 'twill', font: 'chamfer', swoosh: W, sleeve: four(W) },
        { id: 'tb94w', name: '1994 White', tag: 'Throwback · New', debut: '2026-12-17', base: W, num: [SC, BK], numO: [0.02, 0], numShadow: { color: BK, dx: 0.035, dy: 0.035 }, numStyle: 'twill', font: 'chamfer', swoosh: SC, sleeve: four(SC) },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: [[W, 0.7], [SC, 0.5]], swoosh: W },
        { id: 'black', name: 'Black', tag: 'Rivalries', base: BK, stripe: sym([SC, 0.8], [null, 0.4]), swoosh: GOLD },
        { id: 'tbwhite', name: '1994 White', tag: 'Throwback', base: W, stripe: [[BK, 0.6], [SC, 1]], swoosh: SC },
      ],
      socks: [
        { id: 'red', name: 'Scarlet', base: SC },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'scarlet', p: 'gold', s: 'red', status: 'worn' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'red', status: 'worn', note: 'Five road games in 2026; the Rams in Melbourne opens the season' },
        { name: 'Faithful', h: 'black', j: 'faithful', p: 'black', s: 'red', status: 'worn', note: 'Rivalries set; Dec 13 vs LAR' },
        { name: '1994 Home', h: 'tb94', j: 'tb94', p: 'tbwhite', s: 'red', status: 'worn', note: 'Nov 15 at DAL, Jan 3 vs PHI' },
        { name: '1994 Road', h: 'tb94', j: 'tb94w', p: 'tbwhite', s: 'white', debut: '2026-12-17', note: 'First road version, at LAC' },
      ],
    };
  })(),

  (() => {
    const NAVY = '#002244', G = '#69BE28', WG = '#A5ACAF', ROY = '#1E4DB7';
    const logo = { img: 'SEA', faces: 'right', size: 0.15, at: [0.44, 0.2] };
    // SEAHAWKS wordmark on the player's left chest, one colour
    const word = (c) => ({ img: `SEA_word_name@${c}`, h: 0.017, at: 'left' });
    return {
      id: 'SEA', city: 'Seattle', name: 'Seahawks', conf: 'NFC', div: 'West',
      colors: [NAVY, G, WG], font: 'seahawks',
      helmets: [
        { id: 'navy', name: 'Navy', tag: 'Primary', shell: NAVY, finish: 'metallic', mask: NAVY, stripe: sym([G, 0.6], [WG, 2.6]), logo },
        // 2025 Rivalries: iridescent green chrome shell
        { id: 'chrome', name: 'Rivalries Green', tag: 'Rivalries', shell: '#1E4A45', finish: 'chrome', mask: NAVY, stripe: null, logo },
        // 1983-2001 silver shell with a royal / green centre stripe and royal facemask
        { id: 'silver', name: '90s Silver', tag: 'Throwback', shell: '#C4C8CB', finish: 'gloss', mask: ROY, stripe: sym([G, 0.7], [ROY, 2.2]), logo },
      ],
      jerseys: [
        // twelve small feathers either side of the V collar, "12" tag at the neck; the wing panel crosses the
        // chest at the V (wordmark on it) and sweeps down the front of each sleeve, with an accent wedge at the
        // outer sleeve end; TV numbers on the shoulder tops above it
        { id: 'navy', name: 'College Navy', tag: 'Home', base: NAVY, num: [WG, G], numO: [0.035, 0], numPattern: { t: 'feathers', c: '#A7ACB0' }, tv: 'shoulder', word: word(NAVY), swoosh: G,
          neckTag: { s: '12', c: NAVY, bg: WG, at: 'inside' }, collarFeathers: { c: G }, collar: [[NAVY, 2.6]], panels: { wing: [WG, G] } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, G], numO: [0.035, 0], numPattern: { t: 'feathers', c: '#243D6E' }, tv: 'shoulder', word: word(W), swoosh: G,
          neckTag: { s: '12', c: W, bg: NAVY, at: 'inside' }, collarFeathers: { c: NAVY }, collar: [[W, 2.6]], panels: { wing: [NAVY, NAVY] } },
        { id: 'green', name: 'Action Green', tag: 'Alternate', base: G, num: [NAVY, WG], numO: [0.035, 0], numPattern: { t: 'feathers', c: '#243D6E' }, tv: 'shoulder', word: word(W), swoosh: W,
          neckTag: { s: '12', c: G, bg: NAVY, at: 'inside' }, collarFeathers: { c: NAVY }, collar: [[G, 2.6]], panels: { wing: [NAVY, NAVY] } },
        { id: 'wolf', name: 'Wolf Grey Rivalries', tag: 'Rivalries', base: '#C4C7C9', num: [G, NAVY], numO: [0.035, 0], numPattern: { t: 'feathers', c: '#3E9A2A' },
          word: { img: 'SEA_word_name@#002244', h: 0.026 }, swoosh: NAVY, collar: [[NAVY, 2.6]], sleeve: { pattern: { t: 'feathers', c: G } } },
        { id: 'royal', name: '90s Royal', tag: 'Throwback', base: ROY, num: [W], font: 'chamfer', numStyle: 'twill', tv: 'shoulder', swoosh: W, collar: [[G, 0.6], [W, 0.5], [ROY, 1.2]], sleeveLogo: 'SEA' },
      ],
      pants: [
        { id: 'navy', name: 'Navy', base: NAVY, pattern: { t: 'feather', c: G }, swoosh: G },
        { id: 'gray', name: 'Wolf Grey', base: '#C4C7C9', stripe: [[G, 0.4], [null, 1.6], [NAVY, 0.7]], swoosh: NAVY },
        { id: 'green', name: 'Action Green', base: G, pattern: { t: 'feather', c: NAVY }, swoosh: NAVY },
        { id: 'tb', name: '90s Silver', tag: 'Throwback', base: '#C9CCCE', stripe: [[ROY, 0.9], [G, 0.6], [W, 0.4]], swoosh: ROY },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'white', name: 'White', base: W },
        { id: 'green', name: 'Action Green', base: G },
        { id: 'royal', name: 'Royal', base: ROY, lower: [W, 20] },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'white', status: 'worn' },
        { name: 'Action Green', h: 'navy', j: 'green', p: 'green', s: 'green', status: 'worn' },
        { name: 'Wolf Grey Rivalries', h: 'chrome', j: 'wolf', p: 'gray', s: 'navy', status: 'worn', note: 'One game in 2026: Christmas night vs LAR' },
        { name: '90s Throwback', h: 'silver', j: 'royal', p: 'tb', s: 'royal', status: 'worn', note: 'Oct 15 at DEN, Oct 25 vs KC, Dec 7 vs DAL' },
      ],
    };
  })(),
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

export const DIVISIONS = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];
