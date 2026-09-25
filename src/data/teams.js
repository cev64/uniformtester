// NFL uniform closet data, 2026 season.
//
// Sources: each team's current uniform sheet on Wikipedia / Wikimedia Commons
// (research/uniforms/*.png, CC0), team announcements for 2026 debuts, and
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
//   sleeve: { cap, top: [colour, cmFromHem], stripes, from, pattern }
//   loop / loopPattern / loopAt: stripes around the top of the arm (UCLA, horns, bolts)
//   shoulder: decal on each shoulder (drawn mark or logo image)
//   panels: { yoke, sides, vstripes }        word: chest wordmark
//   chestLogo / sleeveLogo / centerLogo: logo image keys (public/logos)
//   neckTag: text on the back of the collar
// Helmet logo: { img: key, faces: 'left'|'right' } uses the real team mark;
// `faces` says which way it points so it can face forward on both sides.

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
    const logo = { img: 'BUF', faces: 'left', size: 0.14 };
    return {
      id: 'BUF', city: 'Buffalo', name: 'Bills', conf: 'AFC', div: 'East',
      colors: [R, RED, W], font: 'block',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: '#E4E6E8', stripe: sym([R, 0.8], [RED, 2.2]), logo },
        { id: 'red', name: 'Red', tag: 'Alternate', shell: RED, finish: 'gloss', mask: '#E4E6E8', stripe: sym([W, 0.8], [R, 2.2]), logo },
        { id: 'charge', name: '"The Charge"', tag: 'New 2026', debut: '2026-09-27', shell: R, finish: 'gloss', mask: R, stripe: null,
          logo: { t: 'streak', fill: RED, stroke: W } },
        { id: 'coldfront', name: 'Cold Front', tag: 'Rivalries', shell: W, finish: 'gloss', mask: W, stripe: null,
          logo: { img: 'BUF@#A9B0B8', faces: 'left', size: 0.14 } },
      ],
      jerseys: [
        { id: 'royal', name: 'Royal Blue', tag: 'Home', base: R, num: [W, RED, NAVY], tv: 'shoulder', word: { s: 'BILLS', c: W, font: 'slab' },
          collar: [[NAVY, 0.5], [RED, 0.7], [W, 1.5]], sleeve: { stripes: sym([NAVY, 0.3], [RED, 0.5], [W, 1.4], [RED, 0.5], [NAVY, 0.3], [R, 0.7]), from: 2 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, RED, NAVY], tv: 'shoulder', word: { s: 'BILLS', c: R, font: 'slab' },
          collar: [[NAVY, 0.5], [RED, 0.7], [R, 1.5]], sleeve: { stripes: sym([NAVY, 0.3], [RED, 0.5], [R, 1.4], [RED, 0.5], [NAVY, 0.3], [W, 0.7]), from: 2 } },
        { id: 'red', name: 'Red', tag: 'Alternate', base: RED, num: [W, R], tv: 'shoulder', word: { s: 'BILLS', c: W, font: 'slab' },
          collar: [[RED, 2.6]], sleeve: { stripes: sym([R, 0.35], [W, 1.3], [R, 0.35], [RED, 0.7]), from: 2 } },
        { id: 'coldfront', name: 'Cold Front', tag: 'Rivalries', base: W, num: ['#C2C7CC', R], numO: [0.045, 0], tv: 'shoulder', word: { s: 'BUFFALO', c: R, font: 'slab' },
          fade: { c: '#B4BBC3', cm: 30 }, collar: [['#D2D7DC', 2.6]], neckTag: { s: 'BILLS MAFIA', c: R }, sleeveLogo: 'BUF@#AEB5BD' },
        { id: 'nickel', name: 'Nickel City', tag: 'New 2026', debut: '2026-09-27', base: GRAY, num: [R, W, RED], numO: [0.025, 0.03], tv: 'shoulder',
          collar: [[R, 3.2]], neckTag: { s: 'GO BILLS', c: W }, chestLogo: 'BUF', sleeve: { stripes: sym(['#6E7073', 0.35], [null, 0.35], ['#6E7073', 1.2], [null, 0.35]), from: 2 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([R, 0.8], [RED, 1.8]), hipLogo: 'BUF' },
        { id: 'royal', name: 'Royal Blue', base: R, stripe: sym([W, 0.6], [RED, 1.8]), hipLogo: 'BUF' },
        { id: 'ice', name: 'Cold Front', tag: 'Rivalries', base: W, stripe: null, fade: { c: '#C3C8CE', cm: 9 } },
        { id: 'gray', name: 'Nickel City Gray', tag: 'New 2026', debut: '2026-09-27', base: GRAY, stripe: [['#7E8184', 0.5]], hipLogo: 'BUF' },
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
    const AQUA = '#008E97', OR = '#FC4C02', DARK = '#12141B';
    const logo = { img: 'MIA', faces: 'left', size: 0.14 };
    return {
      id: 'MIA', city: 'Miami', name: 'Dolphins', conf: 'AFC', div: 'East',
      colors: [AQUA, OR, '#005778'], font: 'round',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: '#D9DCDF', stripe: sym([OR, 0.6], [AQUA, 1.4]), logo },
        { id: 'dark', name: 'Dark Water', tag: 'Rivalries', shell: '#1A1D24', finish: 'gloss', mask: '#9EA3A8', stripe: null, logo },
        { id: 'throwback', name: '1966 Throwback', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#D9DCDF', stripe: sym([OR, 0.9], [null, 0.5], [AQUA, 1.4]), logo: { img: 'MIA_tb', faces: 'left', size: 0.12 } },
      ],
      jerseys: [
        { id: 'aqua', name: 'Aqua', tag: 'Home', base: AQUA, num: [W, OR], tv: 'shoulder', word: { s: 'Dolphins', c: W, font: 'italic' },
          neckTag: { s: 'MIAMI', c: OR }, sleeveLogo: 'MIA' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [AQUA, OR], tv: 'shoulder', word: { s: 'Dolphins', c: AQUA, font: 'italic' },
          neckTag: { s: 'MIAMI', c: OR }, sleeveLogo: 'MIA' },
        { id: 'darkwater', name: 'Dark Water', tag: 'Rivalries', base: DARK, num: [AQUA, '#0A6E75'], numO: [0.025, 0], tv: 'shoulder', word: { s: 'MIAMI', c: OR, font: 'geometric', italic: true },
          collar: [[OR, 1.2]], neckTag: { s: 'GO FINS!', c: W, bg: OR }, sleeve: { fin: { c: AQUA, stripe: OR } } },
        { id: 'tbaqua', name: '1966 Aqua', tag: 'Throwback', base: AQUA, num: [W, OR], font: 'block', tv: 'shoulder',
          sleeve: { stripes: sym([W, 0.9], [OR, 0.9], [W, 1.2]), from: 2.5 } },
        { id: 'tbwhite', name: '1966 White', tag: 'Throwback · New', debut: '2026-12-13', base: W, num: [AQUA, OR], font: 'block', tv: 'shoulder',
          sleeve: { stripes: sym([AQUA, 0.9], [OR, 0.9], [AQUA, 1.2]), from: 2.5 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[OR, 0.6], [AQUA, 1.6], [OR, 0.6]] },
        { id: 'aqua', name: 'Aqua', base: AQUA, stripe: [[OR, 0.6], [W, 1.2], [OR, 0.6]] },
        { id: 'black', name: 'Dark Water', tag: 'Rivalries', base: DARK, stripe: [[OR, 0.5], [AQUA, 2.4], [OR, 0.5]], stripeTaper: [0.2, 1.4] },
        { id: 'tbwhite', name: '1966 White', tag: 'Throwback', base: W, stripe: sym([OR, 0.8], [AQUA, 1.4]) },
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
      colors: [NAVY, RED, SIL], font: 'blockRound',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#C6CACE', finish: 'metallic', mask: RED, stripe: null, logo: { img: 'NE', faces: 'right', size: 0.15 } },
        { id: 'white', name: "Nor'easter White", tag: 'Rivalries', shell: W, finish: 'gloss', mask: '#C6CACE', stripe: null, logo: { img: 'NE@#4B5D72', faces: 'right', size: 0.15 } },
        { id: 'pat', name: 'Pat Patriot', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#E4E6E8', stripe: [[RED, 2.6]], logo: { img: 'NE_pat', size: 0.11 } },
      ],
      jerseys: [
        { id: 'navy', name: 'Navy', tag: 'Home', base: NAVY, num: [W, RED, SIL], numO: [0.03, 0.03], word: { s: 'PATRIOTS', c: W }, neckTag: { s: 'WE ARE ALL PATRIOTS', c: RED },
          sleeveLogo: 'NE', loop: sym([RED, 1.3], [W, 1], [RED, 1.3]), loopAt: 16.5 },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, SIL, RED], numO: [0.025, 0.03], word: { s: 'PATRIOTS', c: NAVY }, neckTag: { s: 'WE ARE ALL PATRIOTS', c: NAVY },
          sleeveLogo: 'NE', loop: sym([RED, 1.3], [NAVY, 1], [RED, 1.3]), loopAt: 16.5 },
        { id: 'noreaster', name: "Nor'easter", tag: 'Rivalries', base: STORM, num: [W, NAVY], numO: [0.05, 0], numShadow: { color: NAVY, dx: 0.035, dy: 0.035 },
          numPattern: { t: 'dots', c: '#9AA6B6', step: 0.04, r: 0.2 }, collar: [[STORM, 2.6]], collarStars: { c: RED, n: 3 }, neckTag: { s: 'We Are All Patriots', c: W },
          sleeveText: { L: 'N', R: 'E', c: [W, NAVY], font: 'slab' }, loop: sym([SIL, 1.2], [NAVY, 0.8]), loopAt: 16.5 },
        { id: 'red', name: 'Pat Patriot Red', tag: 'Throwback', base: RED, num: [W, BLUE], tv: 'sleeve',
          loop: sym([BLUE, 1.2], [W, 1.2], [BLUE, 1.2]), loopAt: 16.5 },
      ],
      pants: [
        { id: 'silver', name: 'Silver', base: SIL, stripe: [[NAVY, 0.7], [RED, 1.6], [NAVY, 0.7]] },
        { id: 'white', name: 'White', tag: 'Rivalries', base: W, stripe: sym([SIL, 0.8], [NAVY, 1.4]) },
        { id: 'tbwhite', name: 'Throwback White', tag: 'Throwback', base: W, stripe: sym([RED, 1.2], [W, 0.6], [BLUE, 1.2]) },
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
    const G = '#125740', K2 = '#101010', GOTHAM = '#353A36', GR = '#C8C9C5';
    const logo = { img: 'NYJ_word', size: 0.15 };
    return {
      id: 'NYJ', city: 'New York', name: 'Jets', conf: 'AFC', div: 'East',
      colors: [G, W, K2], font: 'block',
      helmets: [
        { id: 'green', name: 'Legacy Green', tag: 'Primary', shell: G, finish: 'gloss', mask: W, stripe: null, logo },
        { id: 'white', name: 'White Out', tag: 'New 2026', debut: '2026-09-20', shell: W, finish: 'gloss', mask: W, stripe: [[G, 1.4]], logo },
        { id: 'black', name: 'Stealth Black', tag: 'Alternate', shell: K2, finish: 'gloss', mask: G, stripe: null, logo },
        { id: 'classic', name: 'Classic', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#BFC2C5', stripe: [[G, 1.0]], logo: { img: 'NYJ_classic', size: 0.12 } },
        { id: 'gotham', name: 'Gotham Black', tag: 'Rivalries', shell: '#1C1D1E', finish: 'matte', mask: K2, stripe: null, logo: { img: 'NYJ@#BDBAB2', faces: 'left', size: 0.14 } },
      ],
      jerseys: [
        { id: 'green', name: 'Legacy Green', tag: 'Home', base: G, num: [W], tv: 'shoulder', collar: [[W, 2.6]],
          sleeve: { stripes: [[W, 1.4], [null, 0.9], [W, 1.4]], from: 3 } },
        { id: 'white', name: 'Spotlight White', tag: 'Road', base: W, num: [G], tv: 'shoulder', collar: [[G, 2.6]],
          sleeve: { stripes: [[G, 1.4], [null, 0.9], [G, 1.4]], from: 3 } },
        { id: 'black', name: 'Stealth Black', tag: 'Alternate', base: K2, num: [W, G], tv: 'shoulder', collar: [[G, 2.6]],
          sleeve: { stripes: [[G, 1.4], [null, 0.9], [G, 1.4]], from: 3 } },
        { id: 'classic', name: 'Classic', tag: 'Throwback', base: W, num: [G], font: 'block', tv: 'sleeve', sleeve: { cap: G, top: [W, 13.5] },
          loop: [[G, 1.3], [null, 1.1], [G, 1.3]], loopAt: 17.5 },
        { id: 'gotham', name: 'Gotham City FC', tag: 'Rivalries', base: GOTHAM, num: ['#C9C7C0', '#8F918D'], numO: [0.035, 0], tv: 'sleeve', chestLogo: 'NYJ_plane',
          sleeve: { cap: '#1E2020', pattern: { t: 'diamondplate', c: '#3A3D3D' } }, loop: [[K2, 1.3], [GR, 1.3]], loopAt: 17.5 },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[G, 1.6]] },
        { id: 'green', name: 'Green', base: G, stripe: [[W, 1.6]] },
        { id: 'black', name: 'Black', base: K2, stripe: [[G, 1.6]] },
        { id: 'classic', name: 'Classic White', tag: 'Throwback', base: W, stripe: sym([G, 0.7], [null, 0.5]) },
        { id: 'gotham', name: 'Gotham', tag: 'Rivalries', base: GOTHAM, stripe: [[GR, 1.2], [K2, 0.4]] },
      ],
      socks: [
        { id: 'green', name: 'Green', base: G },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: K2 },
        { id: 'classic', name: 'Classic', base: W, stripes: [[G, 1.6], [null, 1], [G, 1.6]], stripesFrom: 20 },
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
    const P = '#2B0F6B', MID = '#1A0E3D', GOLD = '#C8A43C';
    const logo = { img: 'BAL', faces: 'right', size: 0.15 };
    return {
      id: 'BAL', city: 'Baltimore', name: 'Ravens', conf: 'AFC', div: 'North',
      colors: [P, K, GOLD], font: 'ravens',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: '#0B0B0C', finish: 'gloss', mask: K, stripe: [[P, 3.4]], stripeSpan: [0.1, 0.5], logo },
        { id: 'rising', name: 'Purple Rising', tag: 'Alternate', shell: '#34177A', finish: 'metallic', mask: GOLD, stripe: [[GOLD, 3.4]], stripeSpan: [0.1, 0.5], logo },
        { id: 'darkness', name: 'Darkness', tag: 'New 2026', debut: '2026-11-16', shell: '#1E1E21', finish: 'matte', mask: K, stripe: null, logo: { img: 'BAL_dark', size: 0.1 } },
      ],
      jerseys: [
        { id: 'purple', name: 'Purple', tag: 'Home · New 2026', base: P, num: [W, K], numO: [0.02, 0], tv: 'shoulder', word: { s: 'RAVENS', c: W, font: 'roman', tracking: 0.06 },
          collar: [[P, 1.2]], feathers: K, sleeveLogo: 'BAL_shield', sleeve: { stripes: [[K, 3]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [P, K], numO: [0.02, 0], tv: 'shoulder', word: { s: 'BALTIMORE', c: P, font: 'roman', tracking: 0.06 },
          collar: [[W, 1.2]], feathers: P, sleeveLogo: 'BAL_shield', sleeve: { stripes: [[P, 3]], from: 0 } },
        { id: 'rising', name: 'Purple Rising', tag: 'Alternate · Updated', debut: '2026-11-05', base: P, num: [GOLD, W], numO: [0.025, 0], tv: 'shoulder', word: { s: 'RAVENS', c: GOLD, font: 'roman', tracking: 0.06 },
          collar: [[P, 2.6]], sleeveLogo: 'BAL_shield' },
        { id: 'darkness', name: 'Darkness', tag: 'New 2026', debut: '2026-11-16', base: '#0A0A0B', num: [W, '#4B2AA0'], numO: [0.025, 0], tv: 'shoulder', word: { s: 'RAVENS', c: W, font: 'roman', tracking: 0.06 },
          collar: [['#0A0A0B', 1.2]], feathers: '#4B2AA0', sleeveLogo: 'BAL_shield', sleeve: { stripes: [['#4B2AA0', 3]], from: 0 } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: [[P, 1.6]], stripeStart: 0.8 },
        { id: 'purple', name: 'Purple', tag: 'New 2026', base: P, stripe: [[K, 1.6]], stripeStart: 0.8 },
        { id: 'goldstripe', name: 'Purple (Gold Stripe)', tag: 'New 2026', base: P, stripe: [[GOLD, 1.4]], stripeStart: 0.8 },
        { id: 'black', name: 'Black', tag: 'New 2026', base: '#0A0A0B', stripe: [['#4B2AA0', 1.4]], stripeStart: 0.8 },
      ],
      socks: [
        { id: 'white', name: 'White', base: W },
        { id: 'purple', name: 'Purple', base: P },
        { id: 'black', name: 'Black', base: '#0A0A0B' },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'purple', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'purple', s: 'white', status: 'worn' },
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
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W, OR], word: { s: 'BENGALS', c: OR, font: 'slab', tracking: 0.2 }, sleeve: { pattern: { t: 'tiger', c: OR } } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, OR], word: { s: 'BENGALS', c: OR, font: 'slab', tracking: 0.2 }, sleeve: { pattern: { t: 'tiger', c: BK } } },
        { id: 'orange', name: 'Orange', tag: 'Alternate', base: OR, num: [W, BK], word: { s: 'BENGALS', c: BK, font: 'slab', tracking: 0.2 }, sleeve: { pattern: { t: 'tiger', c: BK } } },
      ],
      pants: [
        { id: 'white', name: 'White (Orange Stripes)', base: W, pattern: { t: 'tiger', c: OR } },
        { id: 'whiteblack', name: 'White (Black Stripes)', base: W, pattern: { t: 'tiger', c: BK } },
        { id: 'black', name: 'Black', base: BK, pattern: { t: 'tiger', c: OR } },
        { id: 'orange', name: 'Orange', base: OR, pattern: { t: 'tiger', c: BK } },
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
      colors: [BR, OR, W], font: 'square',
      helmets: [
        { id: 'orange', name: 'Orange', tag: 'Primary', shell: OR, finish: 'gloss', mask: '#E4E6E8', stripe: sym([BR, 1], [W, 1.2]), logo: { t: 'none' } },
        { id: 'brown', name: 'Brown', tag: 'Alternate', shell: BR, finish: 'gloss', mask: BR, stripe: sym([OR, 1], [W, 1.2]), logo: { t: 'none' } },
        { id: 'white', name: 'White', tag: 'Throwback', shell: W, finish: 'gloss', mask: BR, stripe: sym([OR, 1], [BR, 1.2]), logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'brown', name: 'Brown', tag: 'Home', base: BR, num: [W], tv: 'shoulder', neckTag: { s: '=1946=', c: OR },
          sleeve: { stripes: [...rep(OR, 1.2, 0.9, 3, W)], from: 2.5 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BR], tv: 'shoulder', neckTag: { s: '=1946=', c: OR },
          sleeve: { stripes: [...rep(BR, 1.2, 0.9, 3, OR)], from: 2.5 } },
        { id: 'alpha', name: 'Brown Alternate', tag: 'Alternate', base: BR, num: [OR], tv: 'shoulder', neckTag: { s: '=1946=', c: OR } },
        { id: 'throwback', name: '1946 White', tag: 'Throwback', base: W, num: [BR, OR], numO: [0.06, 0], tv: 'shoulder', neckTag: { s: '=1946=', c: OR },
          chestPatch: { t: 'football', s: '1946', fill: BR, text: OR }, sleeve: { stripes: [...rep(BR, 1.2, 0.9, 3, OR)], from: 2.5 } },
      ],
      pants: [
        { id: 'orange', name: 'Orange', base: OR, stripe: sym([BR, 0.8], [W, 1.4]) },
        { id: 'brown', name: 'Brown', base: BR },
        { id: 'white', name: 'White', base: W, stripe: sym([OR, 0.8], [BR, 1.2]) },
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
    const steel = { img: 'PIT', size: 0.095, side: 'right' };
    const stripes = [[GOLD, 1], [BK, 0.5], [W, 0.35], [GOLD, 1], [W, 0.35], [BK, 0.5], [GOLD, 1]];
    return {
      id: 'PIT', city: 'Pittsburgh', name: 'Steelers', conf: 'AFC', div: 'North',
      colors: [BK, GOLD, W], font: 'steelers',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: K, stripe: [[GOLD, 1.6]], logo: steel, numbers: W },
        { id: 'gold1933', name: '1933 Gold', tag: 'Throwback', shell: GOLD, finish: 'matte', mask: '#9EA2A2', stripe: null, logo: steel },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W], tv: 'shoulder', chestLogo: 'PIT', sleeve: { stripes, from: 2 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK], tv: 'shoulder', chestLogo: 'PIT', sleeve: { stripes, from: 2 } },
        { id: 'rush', name: 'Color Rush', tag: 'Color Rush', base: BK, num: [GOLD], font: 'block', tv: 'shoulder', chestLogo: 'PIT', sleeve: { stripes, from: 2 } },
        { id: 'y1933', name: '1933', tag: 'Throwback', base: GOLD, num: [W, BK], numO: [0.06, 0], font: 'block', collar: [[GOLD, 2.5]], chestLogo: 'PIT_crest',
          panels: { vstripes: [BK, 3.2, 4.2], vband: [BK, 5, 27, 0.1] } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: [[BK, 3.6]] },
        { id: 'black', name: 'Black', base: BK, stripe: [[GOLD, 2.6]] },
        { id: 'khaki', name: '1933 Khaki', tag: 'Throwback', base: KHAKI },
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
    const swoosh = (fill) => ({ t: 'horn', fill, stroke: fill, size: 0.13 });
    return {
      id: 'HOU', city: 'Houston', name: 'Texans', conf: 'AFC', div: 'South',
      colors: [NAVY, RED, LB], font: 'chamfer',
      helmets: [
        { id: 'navy', name: 'Deep Steel Blue', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null, logo },
        { id: 'red', name: 'Battle Red', tag: 'Alternate', shell: RED, finish: 'gloss', mask: RED, stripe: null, logo: { t: 'horn', fill: NAVY, stroke: NAVY } },
        { id: 'htown', name: 'H-Town', tag: 'Alternate', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'H', fill: LB, stroke: RED, font: 'serif', star: RED } },
        { id: 'riv', name: 'Rivalries Chrome', tag: 'New 2026', debut: '2026-11-19', shell: '#EEF0F2', finish: 'chrome', mask: LB, stripe: rep(LB, 0.35, 0.35, 5, W),
          logo: { t: 'text', s: 'H', fill: '#E9ECF0', stroke: LB, font: 'serif', star: RED } },
      ],
      jerseys: [
        { id: 'navy', name: 'Deep Steel Blue', tag: 'Home', base: NAVY, num: [W, RED, '#9AA3AA'], tv: 'shoulder', word: { s: 'TEXANS', c: RED, font: 'squareSans', tracking: 0.28 },
          collar: [[RED, 1.4], [NAVY, 0.6], [RED, 0.6]], sleeveLogo: 'HOU' },
        { id: 'white', name: 'Liberty White', tag: 'Road', base: W, num: [NAVY, RED], word: { s: 'HOUSTON', c: RED, font: 'squareSans', tracking: 0.28 }, shoulder: swoosh(NAVY) },
        { id: 'red', name: 'Battle Red', tag: 'Alternate', base: RED, num: [NAVY, W], word: { s: 'TEXANS', c: NAVY, font: 'squareSans', tracking: 0.28 }, shoulder: swoosh(NAVY) },
        { id: 'htown', name: 'H-Town Navy', tag: 'Alternate', base: NAVY, num: [RED, LB], word: { s: 'H-TOWN', c: LB, font: 'squareSans', tracking: 0.28 }, collar: [[RED, 2.8]], sleeveLogo: 'HOU' },
        { id: 'riv', name: 'Rivalries White', tag: 'New 2026', debut: '2026-11-19', base: '#F5F6F7', num: [LB], tv: 'shoulder', chestLogo: 'HOU',
          collar: rep(LB, 0.4, 0.3, 4, W), sleeve: { stripes: [[RED, 2.4], [LB, 1]], from: 3 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[NAVY, 1.2], [RED, 0.6]], hipLogo: 'HOU' },
        { id: 'navy', name: 'Deep Steel Blue', base: NAVY, stripe: [[RED, 1.2], [W, 0.4]], hipLogo: 'HOU' },
        { id: 'red', name: 'Battle Red', base: RED, stripe: [[NAVY, 1.2], [W, 0.4]], hipLogo: 'HOU' },
        { id: 'htown', name: 'H-Town Navy', base: NAVY, stripe: [[RED, 1], [LB, 0.8]] },
        { id: 'riv', name: 'Rivalries White', base: W, stripe: [[RED, 1], [LB, 1.4]] },
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
    return {
      id: 'IND', city: 'Indianapolis', name: 'Colts', conf: 'AFC', div: 'South',
      colors: [B, W, GRAY], font: 'blockRound',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: W, stripe: [[B, 2.4]], logo: { img: 'IND', size: 0.11 } },
        { id: 'nights', name: 'Indiana Nights', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: [[B, 1.4]], logo: { img: 'IND', size: 0.11 } },
        { id: 'anvil', name: 'Anvil Metallic Blue', tag: 'Rivalries · New', debut: '2026-09-27', shell: '#123E86', finish: 'metallic', mask: BK, stripe: null,
          logo: { t: 'horseshoe', fill: W } },
      ],
      jerseys: [
        { id: 'blue', name: 'Blue', tag: 'Home', base: B, num: [W], tv: 'sleeve', loop: sym([W, 1.5], [null, 1.1], [W, 1.5]), loopAt: 17 },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [B], tv: 'sleeve', loop: sym([B, 1.5], [null, 1.1], [B, 1.5]), loopAt: 17 },
        { id: 'nights', name: 'Indiana Nights', tag: 'Alternate', base: B, num: [W, BK], tv: 'sleeve', collar: [[BK, 2.8]], sleeve: { stripes: [[BK, 3]], from: 0 },
          loop: [[W, 0.8]], loopAt: 17 },
        { id: 'anvil', name: 'Anvil Strike', tag: 'Rivalries · New', debut: '2026-09-27', base: ANV, num: [B, W, BK], tv: 'sleeve', sleeveLogo: 'IND',
          loop: [[BK, 0.5], [B, 1.4], [null, 0.9], [B, 1.4], [BK, 0.5]], loopAt: 17 },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[B, 0.6], [W, 0.5], [B, 0.6]] },
        { id: 'blue', name: 'Blue', base: B, stripe: [[W, 0.8]] },
        { id: 'anvil', name: 'Anvil', base: ANV, stripe: [[BK, 0.6], [B, 1.2]] },
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
    const logo = { img: 'JAX', faces: 'right', size: 0.14 };
    return {
      id: 'JAX', city: 'Jacksonville', name: 'Jaguars', conf: 'AFC', div: 'South',
      colors: [T, BK, GOLD], font: 'square',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: BK, stripe: null, logo },
        { id: 'teal', name: 'Rivalries Teal', tag: 'New 2026', debut: '2026-11-01', shell: T, finish: 'gloss', mask: GOLD, stripe: null, logo },
        { id: 'prowler', name: 'Prowler Black', tag: 'Throwback', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { img: 'JAX_tb', faces: 'left', size: 0.13 } },
      ],
      jerseys: [
        { id: 'teal', name: 'Teal', tag: 'Home', base: T, num: [W], tv: 'shoulder', chestLogo: 'JAX', collar: [[BK, 0.8], [T, 2]], sleeve: { stripes: [[BK, 3.2]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK], tv: 'shoulder', chestLogo: 'JAX', collar: [[BK, 0.8], [W, 2]], sleeve: { stripes: [[BK, 3.2]], from: 0 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [W], tv: 'shoulder', chestLogo: 'JAX', collar: [[T, 0.8], [BK, 2]], sleeve: { stripes: [[T, 3.2]], from: 0 } },
        { id: 'prowler', name: 'Prowler Teal', tag: 'Throwback', base: T, num: [W, GOLD, BK], font: 'slab', tv: 'shoulder', collar: [[BK, 2.8]], sleeveLogo: 'JAX_tb2',
          sleeve: { stripes: [[GOLD, 0.8], [BK, 0.8]], from: 2.5 } },
        { id: 'riv', name: 'Rivalries Alabaster', tag: 'New 2026', debut: '2026-11-01', base: ALB, num: [BK, T], font: 'varsity', numPattern: { t: 'spots', c: '#3A3A36' }, tv: 'shoulder', word: { s: 'Jaguars', c: BK, script: true },
          collar: [[T, 2.6]], sleeveLogo: 'JAX' },
      ],
      pants: [
        { id: 'white', name: 'White', base: W },
        { id: 'teal', name: 'Teal', base: T },
        { id: 'black', name: 'Black', base: BK },
        { id: 'prowler', name: 'Prowler White', tag: 'Throwback', base: W, stripe: [[T, 0.8], [GOLD, 0.6], [BK, 0.8]] },
        { id: 'riv', name: 'Rivalries Black', base: BK, stripe: [[T, 0.9], [GOLD, 0.4]], pattern: { t: 'spots', c: '#2E2E2E' } },
      ],
      socks: [
        { id: 'teal', name: 'Teal', base: T },
        { id: 'black', name: 'Black', base: BK },
        { id: 'alabaster', name: 'Alabaster', base: ALB },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'teal', p: 'white', s: 'teal', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'teal', s: 'black', status: 'worn' },
        { name: 'Alternate', h: 'white', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Prowler', h: 'prowler', j: 'prowler', p: 'prowler', s: 'black', status: 'worn', note: 'Not confirmed for 2026' },
        { name: 'Rivalries', h: 'teal', j: 'riv', p: 'riv', s: 'alabaster', debut: '2026-11-01', note: 'Debut vs IND; first teal helmet' },
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
        { id: 'white', name: 'White', tag: 'Primary · New 2026', shell: W, finish: 'gloss', mask: W, stripe: sym([RED, 0.6], [W, 0.3], [LB, 1.4]), logo: { img: 'TEN', size: 0.11 } },
        { id: 'blue', name: 'Music City Blue', tag: 'Rivalries · New', debut: '2026-11-15', shell: LB, finish: 'gloss', mask: NAVY, stripe: strings(NAVY, W, 4), logo: { img: 'TEN', size: 0.11 } },
      ],
      jerseys: [
        { id: 'blue', name: 'Titans Blue', tag: 'Home · New 2026', base: LB, num: [W, RED], tv: 'shoulder', word: { s: 'TITANS', c: W, font: 'slab', tracking: 0.1 }, sleeve: sleeveStrings(LB) },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [LB, RED], tv: 'shoulder', word: { s: 'TENNESSEE', c: LB, font: 'squareSans', tracking: 0.25 }, sleeve: { stripes: [[RED, 0.7], [W, 0.5], ...rep(NAVY, 0.3, 0.45, 6, LB)], from: 2 } },
        { id: 'music', name: 'Music City', tag: 'Rivalries · New', debut: '2026-11-15', base: NAVY, num: [LB, W], numO: [0.02, 0], numShadow: { color: '#2F6FB5', dx: 0.05, dy: 0.04 }, tv: 'shoulder', word: { s: 'Music City', c: W, script: true },
          sleeve: { stripes: [[W, 0.5], ...rep(LB, 0.3, 0.45, 6, NAVY)], from: 2 } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: sym([RED, 0.6], [W, 0.4], [NAVY, 1.2]) },
        { id: 'blue', name: 'Titans Blue', tag: 'New 2026', base: LB, stripe: sym([RED, 0.6], [W, 0.4], [NAVY, 1.2]) },
        { id: 'navy', name: 'Navy', tag: 'Rivalries', debut: '2026-11-15', base: NAVY, stripe: sym([LB, 0.6], [W, 0.4], [LB, 1.2]) },
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
    const logo = { img: 'DEN', faces: 'right', size: 0.15 };
    return {
      id: 'DEN', city: 'Denver', name: 'Broncos', conf: 'AFC', div: 'West',
      colors: [OR, NAVY, W], font: 'angular',
      helmets: [
        { id: 'navy', name: 'Midnight Navy', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, pattern: { t: 'triangles', c: OR }, logo },
        { id: 'white', name: 'Snowcapped White', tag: 'Alternate', shell: W, finish: 'gloss', mask: W, pattern: { t: 'triangles', c: NAVY }, logo },
        { id: 'crush', name: 'Orange Crush Blue', tag: 'Throwback', shell: RB, finish: 'gloss', mask: '#D9DCDF', stripe: sym([W, 0.8], [OR, 1.8]),
          logo: { img: 'DEN_tb', faces: 'left', size: 0.12 } },
      ],
      jerseys: [
        { id: 'orange', name: 'Sunset Orange', tag: 'Home', base: OR, num: [W, NAVY], numMarks: { c: NAVY, n: 3 }, word: { s: 'BRONCOS', c: NAVY, font: 'squareSans', tracking: 0.2 }, neckTag: { s: 'BRONCOS COUNTRY', c: W },
          collar: [[NAVY, 1.4], [OR, 0.5], [NAVY, 0.5]], sleeve: { cap: NAVY, stripes: [[OR, 1.2], [W, 0.8]], from: 4 } },
        { id: 'white', name: 'Summit White', tag: 'Road', base: W, num: [NAVY, OR], numMarks: { c: OR, n: 3 }, word: { s: 'BRONCOS', c: OR, font: 'squareSans', tracking: 0.2 }, neckTag: { s: 'BRONCOS COUNTRY', c: OR },
          collar: [[OR, 1.4], [W, 0.5], [NAVY, 0.5]], sleeve: { stripes: [[NAVY, 2], [OR, 1.2]], from: 3 } },
        { id: 'navy', name: 'Midnight Navy', tag: 'Alternate', base: NAVY, num: [W, OR], numMarks: { c: OR, n: 3 }, word: { s: 'BRONCOS', c: OR, font: 'squareSans', tracking: 0.2 }, neckTag: { s: 'BRONCOS COUNTRY', c: OR },
          collar: [[OR, 1.4], [NAVY, 0.5], [OR, 0.5]], sleeve: { stripes: [[OR, 1.2], [W, 0.8]], from: 4 } },
        { id: 'crush', name: 'Orange Crush', tag: 'Throwback', base: OR, num: [W, RB], font: 'block', tv: 'shoulder', neckTag: { s: 'BRONCOS COUNTRY', c: W },
          sleeve: { stripes: rep(RB, 1, 0.8, 3, W), from: 3 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 0.5], [null, 2.2]), band: { stripe: [[OR, 2.2]], stop: 0.62 } },
        { id: 'orange', name: 'Orange', base: OR, stripe: sym([NAVY, 0.5], [null, 2.2]), band: { stripe: [[W, 2.2]], stop: 0.62 } },
        { id: 'navy', name: 'Navy', base: NAVY, stripe: sym([W, 0.5], [null, 2.2]), band: { stripe: [[OR, 2.2]], stop: 0.62 } },
        { id: 'crush', name: 'Orange Crush White', tag: 'Throwback', base: W, stripe: sym([RB, 0.8], [OR, 1.4]) },
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
        { id: 'red', name: 'Red', tag: 'Primary', shell: R, finish: 'gloss', mask: W, stripe: null, logo: { img: 'KC', size: 0.14 } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home', base: R, num: [W, GOLD], numO: [0.035, 0], tv: 'shoulder', sleeve: { stripes: [[W, 1], [GOLD, 1.3], [W, 1]], from: 3 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, GOLD], numO: [0.035, 0], tv: 'shoulder', sleeve: { stripes: [[R, 1], [GOLD, 1.3], [R, 1]], from: 3 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([R, 0.7], [GOLD, 0.9]) },
        { id: 'red', name: 'Red', base: R, stripe: sym([GOLD, 0.6], [W, 0.6]) },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R, stripes: [[W, 1], [GOLD, 1.5], [R, 1]], stripesFrom: 25, lower: [W, 28.5] },
        { id: 'white', name: 'White', base: W, stripes: [[R, 1], [GOLD, 1.5], [R, 1]], stripesFrom: 25 },
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
    const SIL = '#C4C8CB', BK = '#000000';
    return {
      id: 'LV', city: 'Las Vegas', name: 'Raiders', conf: 'AFC', div: 'West',
      colors: [BK, SIL, W], font: 'chiefs',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#BFC3C6', finish: 'metallic', mask: '#9EA2A6', stripe: [[BK, 2.6]], logo: { img: 'LV', size: 0.105 } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [SIL], tv: 'sleeve' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, SIL], numO: [0.025, 0], tv: 'sleeve' },
        { id: 'classic', name: 'Silver Numbers', tag: 'Throwback', base: W, num: [SIL, '#8F9396'], numO: [0.02, 0], tv: 'sleeve' },
      ],
      pants: [
        { id: 'silver', name: 'Silver', base: SIL, stripe: [[BK, 3.2]] },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'black', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Classic Silver Numbers', h: 'silver', j: 'classic', p: 'silver', s: 'black', status: 'worn', note: 'Oct at NE' },
      ],
    };
  })(),

  (() => {
    const PB = '#0080C6', GOLD = '#FFC20E', NAVY = '#0B1F4D';
    const bolt = (fill, stroke) => ({ t: 'bolt', fill, stroke, size: 0.17, vertical: true });
    return {
      id: 'LAC', city: 'Los Angeles', name: 'Chargers', conf: 'AFC', div: 'West',
      colors: [PB, GOLD, NAVY], font: 'chargers',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: GOLD, stripe: null, logo: { img: 'LAC', faces: 'right', size: 0.19, at: [0.55, 0.1] }, numbers: PB, numAt: [0.02, 0.2] },
        { id: 'navy', name: 'Navy', tag: 'Alternate', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null, logo: { img: 'LAC@#FFFFFF', faces: 'right', size: 0.19, at: [0.55, 0.1] }, numbers: W, numAt: [0.02, 0.2] },
      ],
      jerseys: [
        { id: 'powder', name: 'Powder Blue', tag: 'Home', base: PB, num: [W, GOLD], numO: [0.035, 0], neckTag: { s: 'BOLT UP', c: W, bg: PB }, shoulder: bolt(GOLD, W) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [PB, GOLD], numO: [0.035, 0], neckTag: { s: 'BOLT UP', c: PB }, shoulder: bolt(GOLD, PB) },
        { id: 'gold', name: 'Charger Power Gold', tag: 'Alternate', base: GOLD, num: [W, PB], numO: [0.035, 0], neckTag: { s: 'CHARGER POWER', c: PB }, shoulder: bolt(W, PB) },
        { id: 'navy', name: 'Super Chargers Navy', tag: 'Alternate', base: NAVY, num: [W, GOLD, NAVY], numO: [0.03, 0.02], neckTag: { s: 'SUPERCHARGERS', c: W }, shoulder: bolt(W, GOLD) },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, pattern: { t: 'bolt', c: GOLD, o: PB } },
        { id: 'powder', name: 'Powder Blue', base: PB, pattern: { t: 'bolt', c: GOLD, o: W } },
        { id: 'gold', name: 'Gold', base: GOLD, pattern: { t: 'bolt', c: W, o: PB } },
        { id: 'navy', name: 'Navy', base: NAVY, pattern: { t: 'bolt', c: W, o: GOLD } },
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
    const NAVY = '#041E42', ROY = '#0D2F9F', SB = '#A9B4BE', GR = '#B4B8BC';
    const star = (fill) => ({ t: 'star', fill, stroke: fill, size: 0.085 });
    return {
      id: 'DAL', city: 'Dallas', name: 'Cowboys', conf: 'NFC', div: 'East',
      colors: [NAVY, SB, W], font: 'block',
      helmets: [
        { id: 'silver', name: 'Metallic Silver-Blue', tag: 'Primary', shell: SB, finish: 'metallic', mask: GR, stripe: sym([NAVY, 0.9], [W, 0.9]), logo: { img: 'DAL', size: 0.1 } },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: GR, stripe: sym([NAVY, 0.9], [W, 0.9]), logo: { img: 'DAL', size: 0.1 } },
      ],
      jerseys: [
        { id: 'white', name: 'White', tag: 'Home', base: W, num: [ROY], tv: 'shoulder', sleeve: { stripes: rep(ROY, 1.1, 0.7, 3, W), from: 2.5 } },
        { id: 'navy', name: 'Navy', tag: 'Road', base: NAVY, num: [W, NAVY, W], numO: [0.03, 0.025], font: 'cowboys', tv: 'shoulder', word: { s: 'COWBOYS', c: W, font: 'slab', tracking: 0.04 },
          collar: [[W, 0.6], [GR, 0.6], [W, 0.6], [GR, 0.6]], sleeve: { stripes: [[W, 0.3], [GR, 1.3], [W, 0.3]], from: 3 }, shoulder: star(W) },
        { id: 'arctic', name: 'Arctic Cowboy', tag: 'Color Rush', base: W, num: [NAVY, W, NAVY], numO: [0.03, 0.025], font: 'cowboys', tv: 'sleeve', sleeve: { cap: NAVY, top: [NAVY, 0] }, shoulder: star(W) },
        { id: '60s', name: '1960s', tag: 'Throwback', base: NAVY, num: [W], tv: 'sleeve', panels: { yoke: [W, 14, 0] }, sleeve: { cap: W }, shoulder: star(NAVY) },
      ],
      pants: [
        { id: 'silver', name: 'Silver-Green', base: '#C8D3D3', stripe: sym([ROY, 1], [W, 0.7]) },
        { id: 'gray', name: 'Silver', base: '#C4C6C8', stripe: sym([NAVY, 1], [W, 0.7]) },
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 1], [W, 0.6]) },
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
    const B = '#0B2265', RED = '#A71930', ROY = '#1D4FB8', GR = '#B5B9BC';
    return {
      id: 'NYG', city: 'New York', name: 'Giants', conf: 'NFC', div: 'East',
      colors: [B, RED, GR], font: 'block',
      helmets: [
        { id: 'blue', name: 'Blue', tag: 'Primary', shell: '#123C8C', finish: 'metallic', mask: GR, stripe: null, logo: { img: 'NYG', size: 0.11 }, numbers: W },
        { id: 'legacy', name: 'Legacy', tag: 'Throwback', shell: '#0A1640', finish: 'gloss', mask: GR, stripe: [[RED, 0.8]],
          logo: { t: 'text', s: 'GIANTS', fill: W, stroke: RED, font: 'italic' } },
      ],
      jerseys: [
        { id: 'blue', name: 'Blue', tag: 'Home', base: B, num: [W], tv: 'shoulder', centerLogo: 'NYG@white' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [RED], tv: 'shoulder', centerLogo: 'NYG', sleeve: { stripes: rep(RED, 0.9, 0.6, 4), from: 2.5 } },
        { id: 'vintage', name: 'Vintage White', tag: 'Color Rush', base: W, num: [ROY, RED], tv: 'sleeve', centerLogo: 'NYG',
          collar: [[RED, 0.7], [W, 0.5], [ROY, 0.8]], sleeve: { stripes: [[RED, 0.6], [ROY, 0.6]], from: 2 } },
        { id: 'legacy', name: 'Legacy Blue', tag: 'Throwback', base: ROY, num: [W, RED], tv: 'sleeve', neckTag: { s: 'ONCE A GIANT, ALWAYS A GIANT', c: RED },
          collar: [[RED, 0.7], [W, 0.5], [RED, 0.7]], sleeve: { stripes: [[RED, 0.6], [W, 0.6], [RED, 0.6]], from: 2 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([RED, 0.6], [W, 0.3], [B, 1]) },
        { id: 'whitered', name: 'White (Red Stripes)', base: W, stripe: [[RED, 0.9], [null, 0.7], [RED, 0.9]] },
        { id: 'legacy', name: 'Legacy White', tag: 'Throwback', base: W, stripe: sym([RED, 0.7], [ROY, 1]) },
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
    const MG = '#004C54', SIL = '#A5ACAF', KG = '#2E8B47', BK = '#0B0B0B';
    const wing = (fill, stroke) => ({ t: 'wing', fill, stroke });
    return {
      id: 'PHI', city: 'Philadelphia', name: 'Eagles', conf: 'NFC', div: 'East',
      colors: [MG, SIL, BK], font: 'eagles',
      helmets: [
        { id: 'green', name: 'Midnight Green', tag: 'Primary', shell: MG, finish: 'metallic', mask: BK, stripe: null, logo: wing('#D6DADD', W) },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: wing('#D6DADD', W) },
        { id: 'kelly', name: 'Kelly Green', tag: 'Throwback', shell: KG, finish: 'gloss', mask: '#C0C3C6', stripe: null, logo: wing(W, '#C0C3C6') },
      ],
      jerseys: [
        { id: 'green', name: 'Midnight Green', tag: 'Home', base: MG, num: [W, SIL], numO: [0.018, 0], numShadow: { color: BK, dx: 0.045, dy: 0.045 }, tv: 'shoulder', word: { s: 'EAGLES', c: W, font: 'italic' },
          collar: [[BK, 2.8]], sleeveLogo: 'PHI', sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [MG, SIL], numO: [0.018, 0], numShadow: { color: BK, dx: 0.045, dy: 0.045 }, tv: 'shoulder', word: { s: 'EAGLES', c: BK, font: 'italic' },
          collar: [[BK, 2.8]], sleeveLogo: 'PHI', sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [W, SIL], numO: [0.018, 0], numShadow: { color: MG, dx: 0.045, dy: 0.045 }, tv: 'shoulder', word: { s: 'EAGLES', c: W, font: 'italic' },
          collar: [[MG, 2.8]], sleeveLogo: 'PHI', sleeve: { stripes: [[MG, 3]], from: 0 } },
        { id: 'kelly', name: 'Kelly Green', tag: 'Throwback', base: KG, num: [W, BK], numO: [0.035, 0], font: 'block', tv: 'shoulder', sleeveLogo: 'PHI_tb' },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[BK, 0.6], ['#8A8D8F', 0.8]] },
        { id: 'green', name: 'Midnight Green', base: MG, stripe: [[BK, 0.6], [SIL, 0.6]] },
        { id: 'black', name: 'Black', base: BK, stripe: [[SIL, 0.8]] },
        { id: 'silver', name: 'Kelly Silver', tag: 'Throwback', base: '#C9CBCD', stripe: sym([KG, 0.9], [W, 0.6]) },
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
    const BUR = '#5A1414', GOLD = '#FFB612', BK = '#0B0B0B';
    return {
      id: 'WAS', city: 'Washington', name: 'Commanders', conf: 'NFC', div: 'East',
      colors: [BUR, GOLD, W], font: 'chiefs',
      helmets: [
        { id: 'burgundy', name: 'Burgundy', tag: 'Primary · New 2026', shell: BUR, finish: 'gloss', mask: GOLD, stripe: sym([GOLD, 0.9], [W, 0.9]), logo: { img: 'WAS', size: 0.12 } },
        { id: 'black', name: 'Hail Raiser Black', tag: 'New 2026', debut: '2026-11-23', shell: BK, finish: 'gloss', mask: BK, stripe: [[BUR, 0.8]],
          logo: { t: 'text', s: 'W', fill: BUR, stroke: GOLD, font: 'block', spear: GOLD } },
      ],
      jerseys: [
        { id: 'burgundy', name: 'Burgundy', tag: 'Home · New 2026', base: BUR, num: [W, GOLD], numO: [0.03, 0], tv: 'sleeve', collar: [[BUR, 2.4], [K, 0.3]],
          sleeve: { stripes: [[W, 0.6], [GOLD, 1.4]], from: 1.5 } },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [BUR, GOLD], numO: [0.03, 0], tv: 'sleeve', collar: [[BUR, 2.8]],
          sleeve: { stripes: [[GOLD, 0.6], [BUR, 1.4]], from: 1.5 } },
        { id: 'hail', name: 'Hail Raiser', tag: 'New 2026', debut: '2026-11-23', base: BK, num: [BUR, GOLD], numO: [0.03, 0], tv: 'sleeve', collar: [[BK, 2.4], ['#333', 0.3]],
          sleeve: { stripes: [[GOLD, 0.6], [BUR, 1.4]], from: 1.5 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[BUR, 0.7], [GOLD, 1], [BUR, 0.7]] },
        { id: 'burgundy', name: 'Burgundy', base: BUR, stripe: [[W, 0.6], [GOLD, 1], [W, 0.6]] },
        { id: 'gold', name: 'Gold', base: GOLD, stripe: [[BUR, 0.8], [W, 0.6], [BUR, 0.8]] },
        { id: 'black', name: 'Hail Raiser Black', debut: '2026-11-23', base: BK, stripe: [[BUR, 0.7], [GOLD, 1], [BUR, 0.7]] },
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
        { name: 'Hail Raiser', h: 'black', j: 'hail', p: 'black', s: 'black', debut: '2026-11-23', note: 'vs CIN, then Dec 20 vs ATL' },
      ],
    };
  })(),

  // ───────────────────────────── NFC NORTH ─────────────────────────────
  (() => {
    const NAVY = '#0B162A', OR = '#E64100';
    const hem = (a, b) => ({ stripes: [[a, 0.8], [b, 0.5], [a, 0.8], [b, 0.5], [a, 0.8]], from: 3 });
    const sock = (base, a, b) => ({ base, stripes: [[a, 0.8], [b, 0.5], [a, 0.8], [b, 0.5], [a, 0.8]], stripesFrom: 13, lower: [W, 20] });
    return {
      id: 'CHI', city: 'Chicago', name: 'Bears', conf: 'NFC', div: 'North',
      colors: [NAVY, OR, W], font: 'bears',
      helmets: [
        { id: 'navy', name: 'Navy', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null, logo: { img: 'CHI', size: 0.12 } },
        { id: 'orange', name: 'Orange', tag: 'New 2026', debut: '2026-12-25', shell: OR, finish: 'gloss', mask: NAVY, stripe: null, logo: { img: 'CHI', size: 0.12 } },
        { id: 'throwback', name: '1936 Navy', tag: 'Throwback', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: [[OR, 3], [NAVY, 1.4], [OR, 3]], logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'navy', name: 'Navy', tag: 'Home', base: NAVY, num: [W, OR], tv: 'shoulder', sleeve: hem(OR, W) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, OR], tv: 'shoulder', sleeve: hem(NAVY, OR) },
        { id: 'orange', name: 'Orange', tag: 'Alternate', base: OR, num: [W, NAVY], tv: 'shoulder', sleeve: hem(NAVY, W) },
        { id: 'throwback', name: '1936', tag: 'Throwback', base: W, num: [NAVY], font: 'block', loop: [[NAVY, 1], [OR, 0.8], [NAVY, 1], [OR, 0.8], [NAVY, 1]], loopAt: 18 },
        { id: 'monsters', name: 'Monsters Rivalries', tag: 'Rivalries · New', debut: '2026-12-25', base: NAVY, num: [OR, W], numO: [0.04, 0], font: 'block',
          chestPatch: { t: 'football', s: 'GHS', fill: OR, text: NAVY }, sleeve: { vbars: { stripes: [[OR, 1.4], [null, 1.2], [W, 0.5], [null, 1.2], [OR, 1.4]], len: 10 } } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([OR, 0.7], [NAVY, 0.9]) },
        { id: 'navy', name: 'Navy', base: NAVY, stripe: sym([OR, 0.7], [W, 0.9]) },
        { id: 'orange', name: 'Orange', tag: 'New 2026', debut: '2026-12-25', base: OR, stripe: sym([W, 0.6], [NAVY, 0.9]) },
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
    const HB = '#0076B6', SIL = '#B0B7BC', BK = '#0D0D0D', CON = '#DADCDD';
    return {
      id: 'DET', city: 'Detroit', name: 'Lions', conf: 'NFC', div: 'North',
      colors: [HB, SIL, BK], font: 'cowboys',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#BCC2C6', finish: 'metallic', mask: HB, stripe: null, logo: { img: 'DET', faces: 'right', size: 0.15 } },
        { id: 'blue', name: 'Honolulu Blue', tag: 'Alternate', shell: HB, finish: 'gloss', mask: BK, stripe: null, logo: { img: 'DET', faces: 'right', size: 0.15 } },
        { id: 'throwback', name: 'Throwback Silver', tag: 'Throwback', shell: '#C4C8CB', finish: 'gloss', mask: '#C4C8CB', stripe: null, logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'blue', name: 'Honolulu Blue', tag: 'Home', base: HB, num: [W, '#D5D9DC'], numO: [0.02, 0], tv: 'shoulder', sleeve: { stripes: [[SIL, 1], [W, 0.6], [SIL, 1]], from: 3 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [HB, SIL], tv: 'shoulder', word: { s: 'DETROIT', c: HB, font: 'italic' }, collar: [[HB, 2.6]],
          sleeve: { stripes: [[HB, 1], [W, 0.6], [HB, 1]], from: 3 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [HB, SIL], tv: 'shoulder', word: { s: 'LIONS', c: HB, font: 'italic' }, collar: [[HB, 2.6]],
          sleeve: { stripes: [[HB, 1], [BK, 0.6], [HB, 1]], from: 3 } },
        { id: 'throwback', name: 'Throwback', tag: 'Throwback', base: HB, num: [SIL], font: 'block' },
        { id: 'concrete', name: 'Concrete Rivalries', tag: 'Rivalries · New', debut: '2026-11-01', base: CON, num: ['#202225', HB], numO: [0.035, 0], numPattern: { t: 'lines', c: '#3A3D42', step: 0.03, w: 0.5 }, tv: 'shoulder', word: { s: 'DETROIT', c: HB, font: 'italic' },
          collar: [[HB, 2.6]], loop: [[HB, 1], [BK, 2.4]], loopAt: 18 },
      ],
      pants: [
        { id: 'blue', name: 'Honolulu Blue', base: HB },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
        { id: 'silver', name: 'Silver', base: '#C9CCCE' },
        { id: 'concrete', name: 'Concrete', tag: 'Rivalries', debut: '2026-11-01', base: '#E4E5E6', stripe: [[BK, 1.2]], stripeTaper: [0.4, 1.4] },
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
    const G = '#203731', GOLD = '#FFB612', DS = '#3F4E45', ALB = '#ECE3D3', NAVY = '#1E2A4A', RUST = '#B8653A';
    return {
      id: 'GB', city: 'Green Bay', name: 'Packers', conf: 'NFC', div: 'North',
      colors: [G, GOLD, W], font: 'cowboys',
      helmets: [
        { id: 'gold', name: 'Gold', tag: 'Primary', shell: GOLD, finish: 'gloss', mask: G, stripe: sym([G, 1.1], [W, 1.1]), logo: { img: 'GB', size: 0.12 } },
        { id: 'leather', name: '1923 Leather', tag: 'Throwback · New', debut: '2026-12-13', shell: '#7A4A2A', finish: 'matte', mask: K, stripe: null, pattern: { t: 'leather' }, logo: { t: 'none' } },
        { id: 'alabaster', name: 'Alabaster', tag: 'Rivalries · New', debut: '2026-10-11', shell: ALB, finish: 'gloss', mask: DS, stripe: sym([DS, 0.9], [GOLD, 0.9]), logo: { img: 'GB', size: 0.12 } },
      ],
      jerseys: [
        { id: 'green', name: 'Green', tag: 'Home', base: G, num: [W], tv: 'shoulder', collar: [[GOLD, 0.5], [W, 1.4], [GOLD, 0.6]],
          sleeve: { stripes: [[GOLD, 1.2], [W, 1.2], [GOLD, 1.2]], from: 3 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [G], tv: 'shoulder', collar: [[G, 0.4], [GOLD, 1.4], [G, 0.5]],
          sleeve: { stripes: [[G, 1.2], [GOLD, 1.2], [G, 1.2]], from: 3 } },
        { id: 'y1923', name: '1923', tag: 'Throwback · New', debut: '2026-12-13', base: NAVY, num: ['#F2A33A'], font: 'block',
          sleeve: { stripes: rep('#F2A33A', 0.6, 0.9, 3), from: 5 } },
        { id: 'riv', name: 'Stock Certificate', tag: 'Rivalries · New', debut: '2026-10-11', base: DS, num: [ALB, GOLD], numO: [0.03, 0], font: 'serifNum', tv: 'shoulder',
          collar: [[GOLD, 0.5], [ALB, 1.4], [GOLD, 0.6]], chestLogo: 'GB_monogram', sleeve: { stripes: [[ALB, 1], [GOLD, 1], [ALB, 1]], from: 3 } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: sym([G, 0.9], [W, 0.9]) },
        { id: 'rust', name: '1923 Rust', tag: 'Throwback', debut: '2026-12-13', base: RUST },
        { id: 'alabaster', name: 'Alabaster', tag: 'Rivalries', debut: '2026-10-11', base: ALB, stripe: sym([GOLD, 0.9], [DS, 0.9]) },
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
    const P = '#4F2683', GOLD = '#FFC62F', DP = '#33205C', DKP = '#2A1552';
    const horn = (fill, stroke) => ({ t: 'horn', fill, stroke });
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
        { id: 'purple', name: 'Purple', tag: 'Home', base: P, num: [W], tv: 'shoulder', word: { s: 'VIKINGS', c: GOLD, font: 'roman', tracking: 0.08 },
          sleeve: { stripes: [[GOLD, 1.6], [W, 0.6]], from: 3.5 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [P], tv: 'shoulder', word: { s: 'VIKINGS', c: P, font: 'roman', tracking: 0.08 },
          sleeve: { stripes: [[GOLD, 1.6], [P, 0.6]], from: 3.5 } },
        { id: 'winter', name: 'Winter Warrior', tag: 'Alternate', base: W, num: [P, '#C0C4C8'], numO: [0.02, 0], numShadow: { color: '#B9BEC3', dx: 0.04, dy: 0.04 }, word: { s: 'VIKINGS', c: '#A9AEB2', font: 'squareSans', tracking: 0.15 },
          sleeve: { stripes: [['#C9CDD1', 1.6], [P, 0.6]], from: 3.5 } },
        { id: 'classic', name: 'Purple People Eater', tag: 'Throwback', base: DKP, num: [GOLD, W], font: 'block', tv: 'shoulder',
          sleeve: { stripes: [[W, 0.9], [GOLD, 0.9], [W, 0.9], [GOLD, 0.9]], from: 3 } },
        { id: 'riv', name: 'Rivalries Deep Purple', tag: 'Rivalries · New', debut: '2026-12-20', base: DP, num: [W, '#A68A4E'], numO: [0.03, 0], word: { s: 'VIKINGS', c: W, font: 'condensed', tracking: 0.12 },
          sleeve: { knot: { c: '#A68A4E' } } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[P, 0.6], [GOLD, 1]] },
        { id: 'purple', name: 'Purple', base: P, stripe: [[W, 0.6], [GOLD, 1]] },
        { id: 'winter', name: 'Winter White', base: W, stripe: [[P, 0.6], ['#C0C4C8', 1]] },
        { id: 'classic', name: 'Throwback White', tag: 'Throwback', base: W, stripe: sym([GOLD, 0.6], [DKP, 1]) },
        { id: 'riv', name: 'Rivalries Purple', debut: '2026-12-20', base: DP, stripe: [[W, 0.6], ['#A68A4E', 0.6]] },
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
    const R = '#A71930', BK = '#101010', SIL = '#A5ACAF';
    return {
      id: 'ATL', city: 'Atlanta', name: 'Falcons', conf: 'NFC', div: 'South',
      colors: [R, BK, SIL], font: 'chamfer',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: SIL, stripe: null, logo: { img: 'ATL', faces: 'right', size: 0.13 } },
        { id: 'red', name: '1966 Red', tag: 'Throwback', shell: R, finish: 'gloss', mask: SIL, stripe: sym([BK, 1], [W, 0.8]), logo: { img: 'ATL_tb', faces: 'right', size: 0.1 } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home · New 2026', base: R, num: [W, BK], numO: [0.03, 0], tv: 'shoulder', word: { s: 'FALCONS', c: W, font: 'squareSans', tracking: 0.2 }, neckTag: { s: 'DIRTY BIRDS', c: R }, sleeveLogo: 'ATL' },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [R, BK], numO: [0.03, 0], tv: 'shoulder', word: { s: 'ATLANTA', c: BK, font: 'squareSans', tracking: 0.2 }, neckTag: { s: 'DIRTY BIRDS', c: R }, sleeveLogo: 'ATL' },
        { id: 'y1966', name: '1966 Black', tag: 'Throwback', base: BK, num: [W, R], numO: [0.03, 0], tv: 'shoulder', sleeveLogo: 'ATL_tb' },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: [[BK, 1], ['#C4C8CB', 1.4]] },
        { id: 'black', name: 'Black', tag: 'New 2026', base: BK, stripe: [[W, 1], ['#9EA3A7', 1.4]] },
        { id: 'tb', name: '1966 White', tag: 'Throwback', base: W, stripe: sym([BK, 0.8], [R, 1.2]) },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W },
        { id: 'tb', name: 'Throwback', base: W, stripes: [[BK, 1.2], [W, 0.6], [R, 1.6], [W, 0.6], [BK, 1.2]], stripesFrom: 14 },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'red', p: 'white', s: 'red', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'black', s: 'white', status: 'worn' },
        { name: '1966 Throwback', h: 'red', j: 'y1966', p: 'tb', s: 'tb', debut: '2026-10-25', note: 'vs SF, then Dec 6 vs DET' },
      ],
    };
  })(),

  (() => {
    const BLUE = '#0085CA', BK = '#101820', SIL = '#BFC0BF';
    const logo = { img: 'CAR', faces: 'right', size: 0.15 };
    return {
      id: 'CAR', city: 'Carolina', name: 'Panthers', conf: 'NFC', div: 'South',
      colors: [BLUE, BK, SIL], font: 'chiefs',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: '#C4C6C8', finish: 'metallic', mask: BK, stripe: [[BLUE, 0.6], [BK, 0.6]], logo },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: [[BLUE, 0.6]], logo },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W, BLUE], tv: 'shoulder', collar: [[BLUE, 3]], sleeveLogo: 'CAR', panels: { raglan: [BLUE, 3.4, [SIL, 0.5]] }, sleeve: { cap: BK } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, BLUE], tv: 'shoulder', collar: [[BK, 3]], sleeveLogo: 'CAR', panels: { raglan: [BLUE, 3.4, [SIL, 0.5]] } },
        { id: 'blue', name: 'Process Blue', tag: 'Alternate', base: BLUE, num: [W, BK], tv: 'shoulder', collar: [[BK, 3]], sleeveLogo: 'CAR', panels: { raglan: [BK, 3.4, [SIL, 0.5]] } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[BK, 0.6], [BLUE, 1.4]] },
        { id: 'silver', name: 'Silver', base: '#C9CACB', stripe: [[BK, 0.6], [BLUE, 1.4]] },
        { id: 'blue', name: 'Process Blue', base: BLUE, stripe: [[SIL, 0.5], [BK, 1.4]] },
        { id: 'black', name: 'Black', base: BK, stripe: [[SIL, 0.5], [BLUE, 1.4]] },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'black', p: 'white', s: 'black', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'black', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Process Blue', h: 'silver', j: 'blue', p: 'blue', s: 'black', status: 'worn' },
        { name: 'Process Blue (Black Helmet)', h: 'black', j: 'blue', p: 'blue', s: 'black', status: 'worn', note: 'Sep 13 vs CHI' },
      ],
    };
  })(),

  (() => {
    const GOLD = '#D3BC8D', BK = '#101820', DG = '#B39A3A';
    return {
      id: 'NO', city: 'New Orleans', name: 'Saints', conf: 'NFC', div: 'South',
      colors: [GOLD, BK, W], font: 'block',
      helmets: [
        { id: 'gold', name: 'Old Gold', tag: 'Primary', shell: GOLD, finish: 'metallic', mask: BK, stripe: null, logo: { img: 'NO', size: 0.1 } },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { img: 'NO', size: 0.1 } },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: DG, stripe: [[DG, 1.6]], logo: { img: 'NO', size: 0.1 } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [GOLD, W], tv: 'shoulder', collar: [[GOLD, 3]], sleeveLogo: 'NO' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, GOLD], tv: 'shoulder', collar: [[BK, 3]], sleeveLogo: 'NO' },
        { id: 'gold', name: 'Gold', tag: 'Alternate', base: GOLD, num: [BK, W], tv: 'shoulder', collar: [[BK, 3]], sleeveLogo: 'NO' },
        { id: 'rush', name: 'Color Rush White', tag: 'Color Rush', base: W, num: [DG, BK], tv: 'shoulder', sleeve: { stripes: [[BK, 1], [DG, 1], [BK, 1], [DG, 1]], from: 3 } },
      ],
      pants: [
        { id: 'black', name: 'Black', base: BK, hipLogo: 'NO' },
        { id: 'gold', name: 'Old Gold', base: GOLD, stripe: [[BK, 3.2]], hipLogo: 'NO' },
        { id: 'white', name: 'White', base: W, stripe: [[BK, 0.4], [DG, 1.3], [BK, 0.4]] },
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
    const R = '#C8102E', PEW = '#34302B', BK = '#0A0A08', OR = '#FF7900', CREAM = '#F58426';
    return {
      id: 'TB', city: 'Tampa Bay', name: 'Buccaneers', conf: 'NFC', div: 'South',
      colors: [R, PEW, OR], font: 'block',
      helmets: [
        { id: 'pewter', name: 'Pewter', tag: 'Primary', shell: '#3A3632', finish: 'metallic', mask: BK, stripe: null, logo: { img: 'TB', faces: 'left', size: 0.15 } },
        { id: 'creamsicle', name: 'Creamsicle White', tag: 'Throwback', shell: W, finish: 'gloss', mask: OR, stripe: sym([OR, 0.8], [R, 1]),
          logo: { t: 'text', s: 'B', fill: R, stroke: OR, font: 'serif' } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home', base: R, num: [W, BK, OR], tv: 'shoulder', word: { s: 'BUCCANEERS', c: BK, font: 'serif' }, collar: [[BK, 1.2], [R, 0.5], [BK, 0.6]],
          sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, BK, OR], tv: 'shoulder', word: { s: 'BUCCANEERS', c: BK, font: 'serif' }, collar: [[BK, 1.2], [W, 0.5], [BK, 0.6]],
          sleeve: { stripes: [[BK, 3]], from: 0 } },
        { id: 'pewter', name: 'Pewter', tag: 'Alternate', debut: '2026-12-20', base: PEW, num: [W, R], tv: 'shoulder', word: { s: 'BUCCANEERS', c: R, font: 'serif' },
          collar: [[R, 1.2], [PEW, 0.5], [R, 0.6]], sleeve: { stripes: [[R, 3]], from: 0 } },
        { id: 'creamwhite', name: 'Creamsicle White', tag: 'Throwback', debut: '2026-12-06', base: W, num: [OR, R], font: 'block', tv: 'sleeve',
          sleeve: { stripes: [[OR, 1.6]], from: 1 } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[R, 0.8], [OR, 0.6], [BK, 0.9]] },
        { id: 'pewter', name: 'Pewter', base: PEW, stripe: [[R, 0.8], [OR, 0.6], [BK, 0.9]] },
        { id: 'pewteralt', name: 'Pewter (Red/White)', base: PEW, stripe: [[R, 0.8], [W, 0.6]] },
        { id: 'creamsicle', name: 'Creamsicle White', tag: 'Throwback', base: W, stripe: [[OR, 1], [R, 0.8]] },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'pewter', name: 'Pewter', base: PEW },
        { id: 'cream', name: 'Throwback', base: W, stripes: [[OR, 1.6], [R, 0.8]], stripesFrom: 16 },
      ],
      looks: [
        { name: 'Home', h: 'pewter', j: 'red', p: 'white', s: 'black', status: 'worn' },
        { name: 'Road', h: 'pewter', j: 'white', p: 'pewter', s: 'black', status: 'worn' },
        { name: 'All Pewter', h: 'pewter', j: 'pewter', p: 'pewteralt', s: 'pewter', debut: '2026-12-20', note: 'vs NO' },
        { name: 'Creamsicle Road', h: 'creamsicle', j: 'creamwhite', p: 'creamsicle', s: 'cream', debut: '2026-12-06', note: 'At LAC' },
      ],
    };
  })(),

  // ───────────────────────────── NFC WEST ─────────────────────────────
  (() => {
    const R = '#97233F', BK = '#101010', SAND = '#EFE0CA', OR = '#E86A2C', GR = '#A5ACAF';
    const logo = { img: 'ARI', faces: 'right', size: 0.13 };
    return {
      id: 'ARI', city: 'Arizona', name: 'Cardinals', conf: 'NFC', div: 'West',
      colors: [R, BK, W], font: 'angular',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: GR, stripe: null, logo },
        { id: 'sand', name: 'Desert Sand', tag: 'Rivalries', shell: '#EAD9C0', finish: 'matte', mask: R, stripe: null, logo },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: GR, stripe: null, logo },
      ],
      jerseys: [
        { id: 'red', name: 'Cardinal Red', tag: 'Home', base: R, num: [W, GR], tv: 'shoulder', word: { s: 'ARIZONA', c: W }, neckTag: { s: 'PROTECT THE NEST', c: W } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, BK], neckTag: { s: 'BIRD GANG', c: R }, sleeve: { stripes: [[R, 0.6], [null, 0.5], [R, 3.4], [null, 0.5], [R, 0.6]], from: 3 } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [R, GR], neckTag: { s: 'BIRD GANG', c: R }, sleeve: { stripes: [[R, 0.6], [null, 0.5], [W, 3.4], [null, 0.5], [R, 0.6]], from: 3 } },
        { id: 'desert', name: 'Desert Rivalries', tag: 'Rivalries', base: SAND, num: [R, OR], word: { s: 'ARIZONA', c: R }, pattern: { t: 'spots', c: '#9C8B74' } },
      ],
      pants: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W, stripe: [[GR, 0.6], [R, 1]] },
        { id: 'black', name: 'Black', base: BK, stripe: [[GR, 0.6], [R, 1]] },
        { id: 'sand', name: 'Desert Sand', tag: 'Rivalries', base: SAND, stripe: [[OR, 0.8], [R, 1]] },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'All Red', h: 'white', j: 'red', p: 'red', s: 'red', status: 'worn' },
        { name: 'All White', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn', note: 'Oct 11 vs DET, Nov 29 vs WAS' },
        { name: 'Desert Rivalries', h: 'sand', j: 'desert', p: 'sand', s: 'red', status: 'worn', note: 'Sep 20 vs SEA' },
      ],
    };
  })(),

  (() => {
    const ROY = '#003594', SOL = '#FFD100', BK = '#0B0B0B';
    const ramhorn = (fill) => ({ t: 'ramhorn', fill, stroke: fill });
    const rams = (cap, horn) => ({ sleeve: { cap, top: [cap, 0] }, loop: [[horn, 3.2]], loopPattern: 'horn', loopAt: 6 });
    return {
      id: 'LAR', city: 'Los Angeles', name: 'Rams', conf: 'NFC', div: 'West',
      colors: [ROY, SOL, W], font: 'angular',
      helmets: [
        { id: 'royal', name: 'Royal Horns', tag: 'Primary', shell: ROY, finish: 'gloss', mask: ROY, stripe: null, logo: ramhorn(SOL) },
        { id: 'black', name: 'Midnight Black', tag: 'Rivalries', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: ramhorn(SOL) },
        { id: 'fearsome', name: 'Fearsome White Horns', tag: 'New 2026', debut: '2026-11-25', shell: '#123B8C', finish: 'gloss', mask: W, stripe: null, logo: ramhorn(W) },
      ],
      jerseys: [
        { id: 'royal', name: 'Royal', tag: 'Home · Updated 2026', base: ROY, num: [SOL], ...rams(SOL, ROY) },
        { id: 'white', name: 'White', tag: 'Road · Updated 2026', base: W, num: [ROY], ...rams(SOL, ROY) },
        { id: 'midnight', name: 'Midnight Mode', tag: 'Rivalries', base: BK, num: [W, ROY], ...rams(SOL, ROY) },
        { id: 'fearsome', name: 'Fearsome White', tag: 'New 2026', debut: '2026-11-25', base: W, num: [ROY], font: 'block', tv: 'sleeve', loop: [[ROY, 3.2]], loopPattern: 'horn', loopAt: 13 },
        { id: 'sol', name: 'Classic Sol', tag: '75th Anniversary', base: SOL, num: [ROY], font: 'block', sleeve: { stripes: rep(ROY, 1, 0.7, 3), from: 3 } },
      ],
      pants: [
        { id: 'sol', name: 'Sol', base: SOL, stripe: [[ROY, 1], [W, 0.6]] },
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: [[ROY, 0.9], [SOL, 0.7]] },
        { id: 'black', name: 'Midnight', tag: 'Rivalries', base: BK, stripe: [[ROY, 0.8], [SOL, 0.7]] },
        { id: 'fearsome', name: 'Fearsome White', debut: '2026-11-25', base: W, stripe: [[ROY, 1.8]] },
      ],
      socks: [
        { id: 'royal', name: 'Royal', base: ROY },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
      ],
      looks: [
        { name: 'Home', h: 'royal', j: 'royal', p: 'sol', s: 'royal', status: 'worn' },
        { name: 'Road', h: 'royal', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Midnight Mode', h: 'black', j: 'midnight', p: 'black', s: 'black', status: 'worn', note: 'Rivalries set; Christmas vs SEA' },
        { name: 'Fearsome White', h: 'fearsome', j: 'fearsome', p: 'fearsome', s: 'white', debut: '2026-11-25', note: 'Thanksgiving Eve vs GB' },
        { name: 'Classic Sol', h: 'royal', j: 'sol', p: 'white', s: 'royal', status: 'worn', note: 'Sep 21 vs NYG, Dec 3 vs KC' },
      ],
    };
  })(),

  (() => {
    const SC = '#AA0000', GOLD = '#B3995D', BK = '#0B0B0B';
    const logo = { img: 'SF', size: 0.12 };
    const four = (c) => ({ stripes: rep(c, 0.9, 0.6, 4), from: 2.5 });
    return {
      id: 'SF', city: 'San Francisco', name: '49ers', conf: 'NFC', div: 'West',
      colors: [SC, GOLD, BK], font: 'block',
      helmets: [
        { id: 'gold', name: 'Metallic Gold', tag: 'Primary', shell: GOLD, finish: 'metallic', mask: '#BFC2C5', stripe: sym([W, 0.5], [SC, 1.8]), logo },
        { id: 'black', name: 'Faithful Black', tag: 'Rivalries', shell: BK, finish: 'gloss', mask: GOLD, stripe: [[SC, 1.8]], logo },
        { id: 'tb94', name: '1994 Gold', tag: 'Throwback', shell: '#BFA468', finish: 'gloss', mask: '#BFC2C5', stripe: sym([W, 0.5], [SC, 1.8]), logo },
      ],
      jerseys: [
        { id: 'scarlet', name: 'Scarlet', tag: 'Home', base: SC, num: [W], tv: 'shoulder', word: { s: '49ERS', c: W }, sleeve: four(W) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [SC], tv: 'shoulder', word: { s: '49ERS', c: SC }, sleeve: four(SC) },
        { id: 'faithful', name: 'Faithful (All Black)', tag: 'Rivalries', base: BK, num: [SC, GOLD], font: 'slab', tv: 'shoulder', word: { s: 'Faithful', c: GOLD, script: true },
          neckTag: { s: 'FAITHFUL TO THE BAY', c: GOLD }, sleeve: four(SC) },
        { id: 'tb94', name: '1994 Scarlet', tag: 'Throwback', base: SC, num: [W, BK], sleeve: four(W) },
        { id: 'tb94w', name: '1994 White', tag: 'Throwback · New', debut: '2026-12-17', base: W, num: [SC, BK], sleeve: four(SC) },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: sym([W, 0.5], [SC, 1.3]) },
        { id: 'black', name: 'Black', tag: 'Rivalries', base: BK, stripe: sym([SC, 0.8], [null, 0.4]) },
        { id: 'tbwhite', name: '1994 White', tag: 'Throwback', base: W, stripe: [[SC, 1], [BK, 0.6]] },
      ],
      socks: [
        { id: 'red', name: 'Scarlet', base: SC },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'scarlet', p: 'gold', s: 'red', status: 'worn' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'red', status: 'worn' },
        { name: 'Faithful', h: 'black', j: 'faithful', p: 'black', s: 'red', status: 'worn', note: 'Rivalries set; Dec 13 vs LAR' },
        { name: '1994 Home', h: 'tb94', j: 'tb94', p: 'tbwhite', s: 'red', status: 'worn', note: 'Nov 15 vs DAL, Jan 3 vs PHI' },
        { name: '1994 Road', h: 'tb94', j: 'tb94w', p: 'tbwhite', s: 'white', debut: '2026-12-17', note: 'First road version, at LAC' },
      ],
    };
  })(),

  (() => {
    const NAVY = '#002244', G = '#69BE28', WG = '#A5ACAF', ROY = '#1E4DB7';
    const logo = { img: 'SEA', faces: 'right', size: 0.15 };
    return {
      id: 'SEA', city: 'Seattle', name: 'Seahawks', conf: 'NFC', div: 'West',
      colors: [NAVY, G, WG], font: 'square',
      helmets: [
        { id: 'navy', name: 'Navy', tag: 'Primary', shell: NAVY, finish: 'metallic', mask: NAVY, stripe: sym([G, 0.5], [WG, 2.2]), logo },
        { id: 'chrome', name: 'Rivalries Green', tag: 'Rivalries', shell: '#1E4A45', finish: 'chrome', mask: NAVY, stripe: null, logo },
        { id: 'silver', name: '90s Silver', tag: 'Throwback', shell: '#C4C8CB', finish: 'gloss', mask: '#C4C8CB', stripe: sym([ROY, 1.2], [G, 1.2]), logo },
      ],
      jerseys: [
        { id: 'navy', name: 'College Navy', tag: 'Home', base: NAVY, num: [WG, G], tv: 'shoulder', word: { s: 'SEAHAWKS', c: WG }, neckTag: { s: '12', c: NAVY },
          collar: [[G, 0.6], [NAVY, 2]], panels: { yoke: [WG, 11, 0] }, sleeve: { top: [WG, 14] } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, G], tv: 'shoulder', word: { s: 'SEAHAWKS', c: NAVY }, neckTag: { s: '12', c: W },
          collar: [[G, 0.6], [NAVY, 2]], panels: { yoke: [NAVY, 11, 0] }, sleeve: { top: [NAVY, 14] } },
        { id: 'green', name: 'Action Green', tag: 'Alternate', base: G, num: [NAVY, WG], tv: 'shoulder', word: { s: 'SEAHAWKS', c: NAVY },
          collar: [[NAVY, 2.6]], panels: { yoke: [NAVY, 11, 0] }, sleeve: { top: [NAVY, 14] } },
        { id: 'wolf', name: 'Wolf Grey Rivalries', tag: 'Rivalries', base: '#C4C7C9', num: [G, NAVY], word: { s: 'SEAHAWKS', c: NAVY },
          loop: [[G, 0.5], [null, 0.8], [G, 0.5], [null, 0.8], [G, 0.5]], loopAt: 15 },
        { id: 'royal', name: '90s Royal', tag: 'Throwback', base: ROY, num: [W], font: 'block', tv: 'shoulder', collar: [[G, 0.6], [W, 0.5], [ROY, 1.2]], sleeveLogo: 'SEA' },
      ],
      pants: [
        { id: 'navy', name: 'Navy', base: NAVY, stripe: [[G, 0.7], [NAVY, 0.4], [G, 0.4]] },
        { id: 'gray', name: 'Wolf Grey', base: '#C4C7C9', stripe: [[NAVY, 0.9], [G, 0.5]] },
        { id: 'green', name: 'Action Green', base: G, stripe: [[NAVY, 0.9]] },
        { id: 'tb', name: '90s Silver', tag: 'Throwback', base: '#C9CCCE', stripe: [[ROY, 0.9], [G, 0.6], [W, 0.4]] },
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
        { name: 'Wolf Grey Rivalries', h: 'chrome', j: 'wolf', p: 'gray', s: 'navy', status: 'worn', note: 'Christmas vs LAR' },
        { name: '90s Throwback', h: 'silver', j: 'royal', p: 'tb', s: 'royal', status: 'worn', note: 'Oct 15 at DEN, Oct 25, Dec 7' },
      ],
    };
  })(),
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

export const DIVISIONS = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];
