// NFL uniform closet data, 2026 season.
//
// Everything the renderer draws comes from this file, so fixing a wrong color
// or adding a new alternate only means editing an entry here.
//
// Units: stripe widths are in centimetres on the real garment.
// Stripe lists run edge-to-edge; a `null` color is a gap in the base color.
// `debut` (YYYY-MM-DD) marks a piece or look that was announced for a date;
// before that date the UI flags it as "announced, not yet worn".
//
// Logos are simplified stand-ins drawn by the app (not official artwork).

const W = '#FFFFFF';
const K = '#101214';

// Mirror a stripe list around its last entry: sym(a, b) -> a, b, a
const sym = (...s) => [...s, ...s.slice(0, -1).reverse()];
const talon = (c) => [[c, 0.8], [null, 0.6], [c, 0.8], [null, 0.6], [c, 0.8]];
// Titans "six string" stripe: six thin navy strings on a light blue band
const strings = (band, str, edge) => [
  ...(edge ? [[edge, 0.8]] : []),
  [band, 0.6],
  ...Array.from({ length: 6 }, (_, i) => (i < 5 ? [[str, 0.25], [band, 0.35]] : [[str, 0.25]])).flat(),
  [band, 0.6],
  ...(edge ? [[edge, 0.8]] : []),
];

export const TEAMS = [
  // ───────────────────────────── AFC EAST ─────────────────────────────
  (() => {
    const R = '#00338D', RED = '#C60C30', NAVY = '#0C2340', GRAY = '#7E8287', ICE = '#EEF3F7', SILVER = '#9AA6B2';
    return {
      id: 'BUF', city: 'Buffalo', name: 'Bills', conf: 'AFC', div: 'East',
      colors: [R, RED, W], font: 'block',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: NAVY,
          stripe: sym([R, 1.2], [RED, 2.6]), logo: { t: 'text', s: 'B', fill: R, stroke: RED, font: 'italic', streak: RED } },
        { id: 'red', name: 'Red Throwback', tag: 'Throwback', shell: RED, finish: 'gloss', mask: W,
          stripe: sym([W, 1.2], [R, 2.6]), logo: { t: 'text', s: 'B', fill: W, stroke: R, font: 'italic' } },
        { id: 'charge', name: '"The Charge"', tag: 'New 2026', debut: '2026-09-27', shell: R, finish: 'gloss', mask: RED,
          stripe: null, logo: { t: 'text', s: 'B', fill: RED, stroke: W, font: 'italic', streak: RED } },
      ],
      jerseys: [
        { id: 'royal', name: 'Royal Blue', tag: 'Home', base: R, num: [W, RED], sleeve: { stripes: sym([W, 1.2], [RED, 2.4]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, RED], sleeve: { stripes: sym([R, 1.2], [RED, 2.4]) } },
        { id: 'red', name: 'Red', tag: 'Alternate', base: RED, num: [W, R], sleeve: { stripes: sym([W, 1.2], [R, 2.4]) } },
        { id: 'coldfront', name: 'Cold Front', tag: 'Rivalries', base: ICE, num: ['#DCE6EE', SILVER, R], sleeve: { stripes: sym([SILVER, 0.8], [ICE, 1], [SILVER, 0.8]) }, collar: SILVER },
        { id: 'nickel', name: 'Nickel City', tag: 'New 2026', debut: '2026-09-27', base: GRAY, num: [R, W], sleeve: { stripes: sym([R, 1.2], [RED, 2.4]) }, collar: R },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([R, 1.2], [RED, 2.4]) },
        { id: 'royal', name: 'Royal Blue', base: R, stripe: sym([W, 1.2], [RED, 2.4]) },
        { id: 'red', name: 'Red', base: RED, stripe: sym([W, 1.2], [R, 2.4]) },
        { id: 'ice', name: 'Cold Front', tag: 'Rivalries', base: ICE, stripe: sym([SILVER, 1], [W, 1]) },
        { id: 'gray', name: 'Nickel City Gray', tag: 'New 2026', debut: '2026-09-27', base: GRAY, stripe: sym([R, 1.2], [RED, 2]) },
      ],
      socks: [
        { id: 'royal', name: 'Royal', base: R, stripes: [[RED, 2], [null, 1.5], [W, 2]] },
        { id: 'red', name: 'Red', base: RED, stripes: [[R, 2], [null, 1.5], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[R, 2], [null, 1.5], [RED, 2]] },
        { id: 'gray', name: 'Gray', base: GRAY },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'royal', p: 'white', s: 'royal', status: 'worn' },
        { name: 'All Royal', h: 'white', j: 'royal', p: 'royal', s: 'royal', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'royal', s: 'royal', status: 'worn' },
        { name: 'Road All White', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Red Alternate', h: 'white', j: 'red', p: 'white', s: 'red', status: 'worn', note: 'Also scheduled Jan 10 vs NYJ' },
        { name: 'Classic', h: 'red', j: 'royal', p: 'white', s: 'royal', status: 'worn' },
        { name: 'Cold Front', h: 'white', j: 'coldfront', p: 'ice', s: 'white', status: 'worn', note: 'Rivalries set, 2025 debut' },
        { name: 'Nickel City', h: 'charge', j: 'nickel', p: 'gray', s: 'gray', debut: '2026-09-27', note: 'vs LAC, Sep 27 and vs CHI, Dec 19' },
        { name: 'Christmas Road', h: 'red', j: 'white', p: 'white', s: 'white', debut: '2026-12-25', note: 'Red helmet with road whites at DEN' },
      ],
    };
  })(),

  (() => {
    const AQUA = '#008E97', OR = '#FC4C02', BLUE = '#005778', DARK = '#111418';
    return {
      id: 'MIA', city: 'Miami', name: 'Dolphins', conf: 'AFC', div: 'East',
      colors: [AQUA, OR, BLUE], font: 'modern',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: BLUE, stripe: null,
          logo: { t: 'sun', fill: OR, ring: AQUA, stroke: BLUE } },
        { id: 'throwback', name: '1966 Throwback', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#9EA2A2',
          stripe: sym([AQUA, 1.2], [OR, 2.4]), logo: { t: 'sun', fill: OR, ring: AQUA, stroke: AQUA, classic: true } },
      ],
      jerseys: [
        { id: 'aqua', name: 'Aqua', tag: 'Home', base: AQUA, num: [W, BLUE], sleeve: { stripes: sym([W, 1], [OR, 2]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [AQUA, BLUE], sleeve: { stripes: sym([AQUA, 1], [OR, 2]) } },
        { id: 'tbaqua', name: '1966 Aqua', tag: 'Throwback', base: AQUA, num: [W, OR], font: 'block', sleeve: { stripes: sym([W, 1.5], [OR, 2.5]) } },
        { id: 'tbwhite', name: '1966 White', tag: 'Throwback · New', debut: '2026-12-13', base: W, num: [AQUA, OR], font: 'block', sleeve: { stripes: sym([AQUA, 1.5], [OR, 2.5]) } },
        { id: 'darkwater', name: 'Dark Water', tag: 'Rivalries', base: DARK, num: [AQUA, OR], sleeve: { stripes: sym([OR, 0.8], [AQUA, 1.6]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([AQUA, 1], [OR, 2]) },
        { id: 'aqua', name: 'Aqua', base: AQUA, stripe: sym([W, 1], [OR, 2]) },
        { id: 'tbwhite', name: '1966 White', tag: 'Throwback', base: W, stripe: sym([AQUA, 1.5], [OR, 2.5]) },
        { id: 'black', name: 'Dark Water', tag: 'Rivalries', base: DARK, stripe: sym([OR, 0.8], [AQUA, 1.6]) },
      ],
      socks: [
        { id: 'aqua', name: 'Aqua', base: AQUA, stripes: [[W, 2], [null, 1], [OR, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[AQUA, 2], [null, 1], [OR, 2]] },
        { id: 'orange', name: 'Orange', base: OR },
        { id: 'black', name: 'Black', base: DARK, stripes: [[AQUA, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'aqua', p: 'white', s: 'aqua', status: 'worn' },
        { name: 'All Aqua', h: 'white', j: 'aqua', p: 'aqua', s: 'aqua', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'white', s: 'aqua', status: 'worn' },
        { name: 'Road Aqua Pants', h: 'white', j: 'white', p: 'aqua', s: 'aqua', status: 'worn' },
        { name: '1966 Home', h: 'throwback', j: 'tbaqua', p: 'tbwhite', s: 'aqua', status: 'worn', note: 'Back Oct 25 vs NYJ' },
        { name: '1966 Road', h: 'throwback', j: 'tbwhite', p: 'tbwhite', s: 'white', debut: '2026-12-13', note: 'First road version, Dec 13 vs CHI' },
        { name: 'Dark Water', h: 'white', j: 'darkwater', p: 'black', s: 'black', status: 'worn', note: 'Rivalries set; Jan 3 vs BUF' },
      ],
    };
  })(),

  (() => {
    const NAVY = '#002244', RED = '#C60C30', SIL = '#B0B7BC', STORM = '#4A5968';
    return {
      id: 'NE', city: 'New England', name: 'Patriots', conf: 'AFC', div: 'East',
      colors: [NAVY, RED, SIL], font: 'block',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: SIL, finish: 'metallic', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'NE', fill: NAVY, stroke: RED, font: 'italic', streak: RED } },
        { id: 'pat', name: 'Pat Patriot White', tag: 'Throwback', shell: W, finish: 'gloss', mask: W,
          stripe: sym([NAVY, 0.8], [RED, 2.6]), logo: { t: 'text', s: 'PAT', fill: RED, stroke: NAVY, font: 'serif' } },
      ],
      jerseys: [
        { id: 'navy', name: 'Navy', tag: 'Home', base: NAVY, num: [W, RED], sleeve: { stripes: sym([RED, 1.2], [W, 1.2], [RED, 1.2]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, RED], sleeve: { stripes: sym([NAVY, 1.2], [RED, 1.2], [NAVY, 1.2]) } },
        { id: 'red', name: 'Pat Patriot Red', tag: 'Throwback', base: RED, num: [W, NAVY], sleeve: { stripes: sym([W, 1.8], [NAVY, 1.8]) } },
        { id: 'noreaster', name: "Nor'easter", tag: 'Rivalries', base: STORM, num: [W, '#9DA9B3'], collar: RED, loop: sym(['#C9D1D8', 1.2], [null, 0.8]) },
      ],
      pants: [
        { id: 'navy', name: 'Navy', base: NAVY, stripe: sym([RED, 1.2], [W, 1.2], [RED, 1.2]) },
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 1.2], [RED, 1.2], [NAVY, 1.2]) },
        { id: 'tbwhite', name: 'Throwback White', tag: 'Throwback', base: W, stripe: sym([RED, 1.5], [NAVY, 1.5]) },
        { id: 'storm', name: 'Storm Blue', tag: 'Rivalries', base: STORM, stripe: sym(['#C9D1D8', 1.2], [null, 0.8]) },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY, stripes: [[RED, 2], [null, 1], [W, 2]] },
        { id: 'red', name: 'Red', base: RED, stripes: [[W, 2], [null, 1], [NAVY, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[NAVY, 2], [null, 1], [RED, 2]] },
        { id: 'storm', name: 'Storm', base: STORM },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'navy', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Home White Pants', h: 'silver', j: 'navy', p: 'white', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Road All White', h: 'silver', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Pat Patriot', h: 'pat', j: 'red', p: 'tbwhite', s: 'red', status: 'worn', note: 'Back Oct 11 vs LV and Dec 10 vs MIN' },
        { name: "Nor'easter", h: 'silver', j: 'noreaster', p: 'storm', s: 'storm', status: 'worn', note: 'Rivalries set; Dec 6 vs BUF' },
      ],
    };
  })(),

  (() => {
    const G = '#115740', K2 = '#111111', GOTHAM = '#18342A', GR = '#8A8D8F';
    return {
      id: 'NYJ', city: 'New York', name: 'Jets', conf: 'AFC', div: 'East',
      colors: [G, W, K2], font: 'block',
      helmets: [
        { id: 'green', name: 'Legacy Green', tag: 'Primary', shell: G, finish: 'gloss', mask: W, stripe: null,
          logo: { t: 'text', s: 'JETS', fill: W, stroke: K2, font: 'italic', streak: W } },
        { id: 'black', name: 'Stealth Black', tag: 'Alternate', shell: K2, finish: 'matte', mask: K2, stripe: null,
          logo: { t: 'text', s: 'JETS', fill: G, stroke: W, font: 'italic', streak: G } },
        { id: 'white', name: 'White Out', tag: 'New 2026', debut: '2026-09-20', shell: W, finish: 'gloss', mask: G, stripe: null,
          logo: { t: 'text', s: 'JETS', fill: G, stroke: K2, font: 'italic', streak: G } },
        { id: 'classic', name: 'Classic', tag: 'Throwback', shell: W, finish: 'gloss', mask: '#9EA2A2',
          stripe: [[G, 3]], logo: { t: 'text', s: 'JETS', fill: W, stroke: G, font: 'block', bg: { shape: 'oval', fill: G, stroke: G } } },
      ],
      jerseys: [
        { id: 'green', name: 'Legacy Green', tag: 'Home', base: G, num: [W, K2], sleeve: { stripes: sym([W, 1.6], [K2, 0.8], [W, 1.6]) } },
        { id: 'white', name: 'Spotlight White', tag: 'Road', base: W, num: [G, K2], sleeve: { stripes: sym([G, 1.6], [K2, 0.8], [G, 1.6]) } },
        { id: 'black', name: 'Stealth Black', tag: 'Alternate', base: K2, num: [W, G], sleeve: { stripes: sym([G, 1.6], [W, 0.8], [G, 1.6]) } },
        { id: 'classic', name: 'Classic', tag: 'Throwback', base: G, num: [W], font: 'varsity', sleeve: { stripes: sym([W, 2], [null, 1.5]) } },
        { id: 'gotham', name: 'Gotham City FC', tag: 'Rivalries', base: GOTHAM, num: [W, K2, GR], sleeve: { stripes: sym([K2, 1], [GR, 1.4]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([G, 1.6], [K2, 0.8]) },
        { id: 'green', name: 'Green', base: G, stripe: sym([W, 1.6], [K2, 0.8]) },
        { id: 'black', name: 'Black', base: K2, stripe: sym([G, 1.6], [W, 0.8]) },
        { id: 'gotham', name: 'Gotham Green', tag: 'Rivalries', base: GOTHAM, stripe: sym([K2, 1], [GR, 1.4]) },
      ],
      socks: [
        { id: 'green', name: 'Green', base: G, stripes: [[W, 2], [null, 1], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[G, 2], [null, 1], [G, 2]] },
        { id: 'black', name: 'Black', base: K2, stripes: [[G, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'green', j: 'green', p: 'white', s: 'green', status: 'worn' },
        { name: 'All Green', h: 'green', j: 'green', p: 'green', s: 'green', status: 'worn' },
        { name: 'Road', h: 'green', j: 'white', p: 'green', s: 'green', status: 'worn' },
        { name: 'White Out', h: 'white', j: 'white', p: 'white', s: 'white', debut: '2026-09-20', note: 'Home opener vs GB' },
        { name: 'Stealth', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Classic', h: 'classic', j: 'classic', p: 'white', s: 'green', status: 'worn', note: 'Back Oct 25 at MIA' },
        { name: 'Gotham City FC', h: 'black', j: 'gotham', p: 'gotham', s: 'black', status: 'worn', note: 'Rivalries set; Dec 27 vs NE' },
      ],
    };
  })(),

  // ───────────────────────────── AFC NORTH ─────────────────────────────
  (() => {
    const P = '#241773', MID = '#1A1238', GOLD = '#9E7C0C', PURPLE_M = '#3B2A8C';
    return {
      id: 'BAL', city: 'Baltimore', name: 'Ravens', conf: 'AFC', div: 'North',
      colors: [P, K, GOLD], font: 'modern',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: K, finish: 'gloss', mask: K, stripe: null,
          logo: { t: 'text', s: 'B', fill: P, stroke: GOLD, font: 'block', bg: { shape: 'shield', fill: K, stroke: GOLD } } },
        { id: 'rising', name: 'Purple Rising', tag: 'Alternate', shell: PURPLE_M, finish: 'metallic', mask: GOLD, stripe: talon(GOLD),
          logo: { t: 'text', s: 'B', fill: K, stroke: GOLD, font: 'block', bg: { shape: 'shield', fill: P, stroke: GOLD } } },
        { id: 'darkness', name: 'Darkness', tag: 'New 2026', debut: '2026-11-16', shell: K, finish: 'matte', mask: K, stripe: talon('#050506'),
          logo: { t: 'text', s: 'B', fill: '#2A2A2E', stroke: '#C8102E', font: 'block' } },
      ],
      jerseys: [
        { id: 'purple', name: 'Purple', tag: 'Home · New 2026', base: P, num: [W, MID], collar: MID },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [P, MID], collar: MID, word: { s: 'BALTIMORE', c: P } },
        { id: 'darkness', name: 'Darkness', tag: 'New 2026', debut: '2026-11-16', base: '#0A0A0C', num: [W, MID], collar: MID },
        { id: 'rising', name: 'Purple Rising', tag: 'Alternate · Updated', debut: '2026-11-05', base: PURPLE_M, num: [W, GOLD], collar: GOLD, sleeve: { stripes: talon(GOLD) } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: talon(MID) },
        { id: 'black', name: 'Black', tag: 'New 2026', base: K, stripe: talon(P) },
        { id: 'purple', name: 'Purple', tag: 'New 2026', base: P, stripe: talon(MID) },
        { id: 'midnight', name: 'Midnight Purple', tag: 'New 2026', base: MID, stripe: talon(GOLD) },
      ],
      socks: [
        { id: 'purple', name: 'Purple', base: P },
        { id: 'black', name: 'Black', base: K },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'purple', p: 'white', s: 'purple', status: 'worn' },
        { name: 'Home Black Pants', h: 'black', j: 'purple', p: 'black', s: 'black', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'black', s: 'black', status: 'worn' },
        { name: 'White Noise', h: 'rising', j: 'white', p: 'white', s: 'white', debut: '2026-09-20', note: 'Purple helmet with road whites vs NO' },
        { name: 'Purple Rising', h: 'rising', j: 'rising', p: 'purple', s: 'purple', debut: '2026-11-05', note: 'Thursday night vs JAX' },
        { name: 'Darkness Falls', h: 'darkness', j: 'darkness', p: 'black', s: 'black', debut: '2026-11-16', note: 'vs LAC' },
      ],
    };
  })(),

  (() => {
    const OR = '#FB4F14', BK = '#0B0B0B';
    return {
      id: 'CIN', city: 'Cincinnati', name: 'Bengals', conf: 'AFC', div: 'North',
      colors: [OR, BK, W], font: 'modern',
      helmets: [
        { id: 'tiger', name: 'Tiger Stripe', tag: 'Primary', shell: OR, finish: 'gloss', mask: BK, pattern: { t: 'tiger', c: BK }, logo: { t: 'none' } },
        { id: 'white', name: 'White Bengal', tag: 'Alternate', shell: W, finish: 'gloss', mask: BK, pattern: { t: 'tiger', c: BK }, logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W, OR], sleeve: { cap: OR, pattern: { t: 'tiger', c: BK } } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, OR], sleeve: { pattern: { t: 'tiger', c: BK } } },
        { id: 'orange', name: 'Orange', tag: 'Alternate', base: OR, num: [W, BK], sleeve: { pattern: { t: 'tiger', c: BK } } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, pattern: { t: 'tiger', c: BK } },
        { id: 'whiteor', name: 'White (Orange Stripe)', base: W, pattern: { t: 'tiger', c: OR } },
        { id: 'black', name: 'Black', base: BK, pattern: { t: 'tiger', c: OR } },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'orange', name: 'Orange', base: OR },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'tiger', j: 'black', p: 'white', s: 'black', status: 'worn' },
        { name: 'All Black', h: 'tiger', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Road', h: 'tiger', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road Black Pants', h: 'tiger', j: 'white', p: 'black', s: 'black', status: 'worn' },
        { name: 'Open in Orange', h: 'tiger', j: 'orange', p: 'white', s: 'orange', debut: '2026-09-13', note: 'Home opener vs TB' },
        { name: 'White Bengal', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'Back Nov 15 vs PIT and Dec 31 vs BAL' },
      ],
    };
  })(),

  (() => {
    const BR = '#311D00', OR = '#FF3C00';
    return {
      id: 'CLE', city: 'Cleveland', name: 'Browns', conf: 'AFC', div: 'North',
      colors: [BR, OR, W], font: 'block',
      helmets: [
        { id: 'orange', name: 'Orange', tag: 'Primary', shell: OR, finish: 'gloss', mask: BR, stripe: sym([BR, 1.2], [W, 1.6]), logo: { t: 'none' } },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: BR, stripe: sym([BR, 1.2], [OR, 1.6]), logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'brown', name: 'Brown', tag: 'Home', base: BR, num: [W, OR], sleeve: { stripes: sym([OR, 1.6], [W, 1.2], [OR, 1.6]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [OR, BR], sleeve: { stripes: sym([OR, 1.6], [BR, 1.2], [OR, 1.6]) } },
        { id: 'orange', name: 'Orange', tag: 'Color Rush', base: OR, num: [W, BR], sleeve: { stripes: sym([BR, 1.6], [W, 1.2], [BR, 1.6]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([OR, 1.2], [BR, 1.6]) },
        { id: 'brown', name: 'Brown', base: BR, stripe: sym([OR, 1.2], [W, 1.6]) },
        { id: 'orange', name: 'Orange', base: OR, stripe: sym([BR, 1.2], [W, 1.6]) },
      ],
      socks: [
        { id: 'brown', name: 'Brown', base: BR, stripes: [[OR, 2], [null, 1], [W, 2]] },
        { id: 'orange', name: 'Orange', base: OR, stripes: [[BR, 2], [null, 1], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[OR, 2], [null, 1], [BR, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'orange', j: 'brown', p: 'white', s: 'brown', status: 'worn' },
        { name: 'Home Orange Pants', h: 'orange', j: 'brown', p: 'orange', s: 'brown', status: 'worn' },
        { name: 'Alpha Dawg (All Brown)', h: 'orange', j: 'brown', p: 'brown', s: 'brown', status: 'worn' },
        { name: 'Road', h: 'orange', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road Brown Pants', h: 'orange', j: 'white', p: 'brown', s: 'brown', status: 'worn' },
        { name: 'White Helmet', h: 'white', j: 'white', p: 'orange', s: 'orange', status: 'worn' },
        { name: 'Color Rush', h: 'orange', j: 'orange', p: 'white', s: 'orange', status: 'worn' },
      ],
    };
  })(),

  (() => {
    const GOLD = '#FFB612', BK = '#101820', KHAKI = '#C8B88A';
    return {
      id: 'PIT', city: 'Pittsburgh', name: 'Steelers', conf: 'AFC', div: 'North',
      colors: [BK, GOLD, W], font: 'block',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: BK, stripe: [[GOLD, 1.8]], logo: { t: 'steelmark', side: 'right' } },
        { id: 'gold1933', name: '1933 Gold', tag: 'Throwback', shell: '#C9A227', finish: 'matte', mask: '#6E6E6E', stripe: null, logo: { t: 'none' } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [GOLD], sleeve: { stripes: [[GOLD, 1.4], [null, 1], [GOLD, 1.4], [null, 1], [GOLD, 1.4]] } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK], sleeve: { stripes: [[BK, 1.4], [GOLD, 1], [BK, 1.4], [GOLD, 1], [BK, 1.4]] } },
        { id: 'rush', name: 'Color Rush', tag: 'Color Rush', base: BK, num: [GOLD, W], sleeve: { stripes: [[GOLD, 1.4], [W, 1], [GOLD, 1.4]] } },
        { id: 'y1933', name: '1933', tag: 'Throwback', base: BK, num: [GOLD], font: 'varsity', collar: GOLD, sleeve: { cap: BK } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: sym([BK, 1.2], [W, 1], [BK, 1.2]) },
        { id: 'white', name: 'White', base: W, stripe: sym([BK, 1.2], [GOLD, 1], [BK, 1.2]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([GOLD, 1.2], [W, 1]) },
        { id: 'khaki', name: '1933 Khaki', tag: 'Throwback', base: KHAKI },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK, stripes: [[GOLD, 1.6], [null, 1], [GOLD, 1.6], [null, 1], [GOLD, 1.6]] },
        { id: 'white', name: 'White', base: W, stripes: [[BK, 1.6], [GOLD, 1], [BK, 1.6]] },
        { id: 'bee', name: '1933 Striped', base: BK, stripes: [[GOLD, 3], [null, 3], [GOLD, 3], [null, 3], [GOLD, 3], [null, 3], [GOLD, 3]] },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'black', p: 'gold', s: 'black', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'gold', s: 'black', status: 'worn' },
        { name: 'Road All White', h: 'black', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Color Rush', h: 'black', j: 'rush', p: 'black', s: 'black', status: 'worn', note: 'Late-season return in 2026' },
        { name: '1933 Throwback', h: 'gold1933', j: 'y1933', p: 'khaki', s: 'bee', status: 'worn', note: 'Returns in 2026 (date TBA)' },
      ],
    };
  })(),

  // ───────────────────────────── AFC SOUTH ─────────────────────────────
  (() => {
    const NAVY = '#03202F', RED = '#A6192E', LB = '#4FA5D6';
    return {
      id: 'HOU', city: 'Houston', name: 'Texans', conf: 'AFC', div: 'South',
      colors: [NAVY, RED, LB], font: 'modern',
      helmets: [
        { id: 'navy', name: 'Deep Steel Blue', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'H', fill: RED, stroke: W, font: 'block', star: W } },
        { id: 'red', name: 'Battle Red', tag: 'Alternate', shell: RED, finish: 'gloss', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'H', fill: NAVY, stroke: W, font: 'block', star: W } },
        { id: 'htown', name: 'H-Town Blue', tag: 'Color Rush', shell: LB, finish: 'gloss', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'H', fill: NAVY, stroke: RED, font: 'block', star: W } },
        { id: 'riv', name: 'Rivalries Chrome', tag: 'New 2026', debut: '2026-11-19', shell: '#E9ECEF', finish: 'chrome', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'H', fill: LB, stroke: NAVY, font: 'modern' } },
      ],
      jerseys: [
        { id: 'navy', name: 'Deep Steel Blue', tag: 'Home', base: NAVY, num: [W, RED] },
        { id: 'white', name: 'Liberty White', tag: 'Road', base: W, num: [NAVY, RED] },
        { id: 'red', name: 'Battle Red', tag: 'Alternate', base: RED, num: [W, NAVY] },
        { id: 'htown', name: 'H-Town Blue', tag: 'Color Rush', base: LB, num: [NAVY, W] },
        { id: 'riv', name: 'Rivalries White', tag: 'New 2026', debut: '2026-11-19', base: '#F4F5F6', num: [LB, NAVY, '#C9CED3'], font: 'modern', sleeve: { stripes: sym([LB, 1.2], ['#C9CED3', 1]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([RED, 1], [NAVY, 2]) },
        { id: 'navy', name: 'Deep Steel Blue', base: NAVY, stripe: sym([RED, 1], [W, 2]) },
        { id: 'red', name: 'Battle Red', base: RED, stripe: sym([NAVY, 1], [W, 2]) },
        { id: 'htown', name: 'H-Town Blue', base: LB, stripe: sym([NAVY, 1], [W, 2]) },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'red', name: 'Red', base: RED },
        { id: 'white', name: 'White', base: W },
        { id: 'lb', name: 'H-Town Blue', base: LB },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'navy', p: 'white', s: 'navy', status: 'worn' },
        { name: 'All Navy', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Liberty White', h: 'navy', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Battle Red', h: 'red', j: 'red', p: 'navy', s: 'red', status: 'worn', note: 'Oct 25 vs NYG' },
        { name: 'H-Town Blue', h: 'htown', j: 'htown', p: 'htown', s: 'lb', status: 'worn', note: 'Jan 10 vs TEN' },
        { name: 'Rivalries', h: 'riv', j: 'riv', p: 'white', s: 'white', debut: '2026-11-19', note: 'Debut vs IND' },
      ],
    };
  })(),

  (() => {
    const B = '#002C5F', GRAY = '#A2AAAD', ANV = '#3A3D42', MB = '#1D4E9E', NIGHT = '#15171B';
    return {
      id: 'IND', city: 'Indianapolis', name: 'Colts', conf: 'AFC', div: 'South',
      colors: [B, W, GRAY], font: 'block',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: GRAY, stripe: [[B, 3.2]], logo: { t: 'horseshoe', fill: B } },
        { id: 'nights', name: 'Indiana Nights', tag: 'Alternate', shell: NIGHT, finish: 'gloss', mask: NIGHT, stripe: null, logo: { t: 'horseshoe', fill: B, stroke: W } },
        { id: 'anvil', name: 'Anvil Metallic Blue', tag: 'New 2026', debut: '2026-09-27', shell: MB, finish: 'metallic', mask: ANV, stripe: null, logo: { t: 'horseshoe', fill: '#D5DADF' } },
      ],
      jerseys: [
        { id: 'blue', name: 'Blue', tag: 'Home', base: B, num: [W], loop: sym([W, 2], [null, 1.6]) },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [B], loop: sym([B, 2], [null, 1.6]) },
        { id: 'nights', name: 'Indiana Nights', tag: 'Alternate', base: NIGHT, num: [B, W], loop: sym([B, 2], [null, 1.6]) },
        { id: 'anvil', name: 'Anvil Strike', tag: 'Rivalries · New', debut: '2026-09-27', base: ANV, num: ['#C8D0D8', MB], loop: sym([MB, 2], [null, 1], ['#C8D0D8', 0.8]) },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[B, 3]] },
        { id: 'blue', name: 'Blue', base: B, stripe: [[W, 3]] },
        { id: 'nights', name: 'Indiana Nights', base: NIGHT, stripe: [[B, 3]] },
        { id: 'anvil', name: 'Anvil Gray', base: ANV, stripe: sym([MB, 1.6], [GRAY, 0.8]) },
      ],
      socks: [
        { id: 'blue', name: 'Blue', base: B, stripes: [[W, 2], [null, 1], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[B, 2], [null, 1], [B, 2]] },
        { id: 'black', name: 'Night', base: NIGHT },
        { id: 'anvil', name: 'Anvil', base: ANV },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'blue', p: 'white', s: 'blue', status: 'worn' },
        { name: 'All Blue', h: 'white', j: 'blue', p: 'blue', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'white', s: 'blue', status: 'worn' },
        { name: 'White Out', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'Nov 8 vs DAL' },
        { name: 'Indiana Nights', h: 'nights', j: 'nights', p: 'nights', s: 'black', status: 'worn', note: 'Dec 27 vs CIN' },
        { name: 'Anvil Strike', h: 'anvil', j: 'anvil', p: 'anvil', s: 'anvil', debut: '2026-09-27', note: 'Rivalries debut vs HOU' },
      ],
    };
  })(),

  (() => {
    const T = '#006778', BK = '#101820', GOLD = '#D7A22A', ALB = '#EFE8DA';
    return {
      id: 'JAX', city: 'Jacksonville', name: 'Jaguars', conf: 'AFC', div: 'South',
      colors: [T, BK, GOLD], font: 'modern',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: BK, stripe: null,
          logo: { t: 'text', s: 'J', fill: GOLD, stroke: T, font: 'italic' } },
        { id: 'prowler', name: 'Prowler', tag: 'Throwback', shell: BK, finish: 'gloss', mask: T, stripe: sym([T, 1], [GOLD, 1.4]),
          logo: { t: 'text', s: 'J', fill: T, stroke: GOLD, font: 'italic' } },
        { id: 'teal', name: 'Rivalries Teal', tag: 'New 2026', debut: '2026-11-01', shell: T, finish: 'gloss', mask: BK, stripe: null,
          logo: { t: 'text', s: 'J', fill: ALB, stroke: BK, font: 'script' } },
      ],
      jerseys: [
        { id: 'teal', name: 'Teal', tag: 'Home', base: T, num: [W, BK] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [T, BK] },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [W, T] },
        { id: 'prowler', name: 'Prowler Teal', tag: 'Throwback', base: T, num: [W, BK, GOLD], font: 'block', sleeve: { stripes: sym([BK, 1.2], [GOLD, 1]) } },
        { id: 'riv', name: 'Rivalries Alabaster', tag: 'New 2026', debut: '2026-11-01', base: ALB, num: [T, BK], word: { s: 'Jaguars', c: T, script: true } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([T, 1], [BK, 2]) },
        { id: 'teal', name: 'Teal', base: T, stripe: sym([BK, 1], [W, 2]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([T, 1], [GOLD, 2]) },
      ],
      socks: [
        { id: 'teal', name: 'Teal', base: T },
        { id: 'black', name: 'Black', base: BK },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'teal', p: 'white', s: 'teal', status: 'worn' },
        { name: 'All Teal', h: 'black', j: 'teal', p: 'teal', s: 'teal', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road Black Pants', h: 'black', j: 'white', p: 'black', s: 'black', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Prowler', h: 'prowler', j: 'prowler', p: 'white', s: 'teal', status: 'worn', note: 'Not confirmed for 2026' },
        { name: 'Rivalries', h: 'teal', j: 'riv', p: 'black', s: 'black', debut: '2026-11-01', note: 'Debut vs IND; first teal helmet' },
      ],
    };
  })(),

  (() => {
    const LB = '#4B92DB', RED = '#C8102E', NAVY = '#0C2340';
    return {
      id: 'TEN', city: 'Tennessee', name: 'Titans', conf: 'AFC', div: 'South',
      colors: [LB, RED, NAVY], font: 'modern',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary · New 2026', shell: W, finish: 'gloss', mask: W, stripe: strings(LB, NAVY, RED),
          logo: { t: 'text', s: 'T', fill: RED, stroke: W, font: 'block', bg: { shape: 'shield', fill: LB, stroke: NAVY }, stars: W } },
        { id: 'blue', name: 'Music City Blue', tag: 'Rivalries · New', debut: '2026-11-15', shell: LB, finish: 'gloss', mask: NAVY, stripe: strings(NAVY, W),
          logo: { t: 'text', s: 'T', fill: RED, stroke: W, font: 'block', bg: { shape: 'shield', fill: NAVY, stroke: W }, stars: W } },
      ],
      jerseys: [
        { id: 'blue', name: 'Titans Blue', tag: 'Home · New 2026', base: LB, num: [W, RED], word: { s: 'TITANS', c: W }, loop: strings(LB, NAVY) },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [LB, RED], word: { s: 'TENNESSEE', c: LB }, loop: strings(W, NAVY) },
        { id: 'music', name: 'Music City', tag: 'Rivalries · New', debut: '2026-11-15', base: NAVY, num: [LB, RED], word: { s: 'MUSIC CITY', c: W }, sleeve: { stripes: strings(NAVY, LB) } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: strings(LB, NAVY) },
        { id: 'blue', name: 'Titans Blue', tag: 'New 2026', base: LB, stripe: strings(W, NAVY) },
        { id: 'navy', name: 'Navy', tag: 'Rivalries', debut: '2026-11-15', base: NAVY, stripe: strings(NAVY, LB) },
      ],
      socks: [
        { id: 'blue', name: 'Titans Blue', base: LB, stripes: [[RED, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[LB, 2]] },
        { id: 'navy', name: 'Navy', base: NAVY },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'blue', p: 'white', s: 'blue', status: 'worn' },
        { name: 'All Blue', h: 'white', j: 'blue', p: 'blue', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'blue', s: 'blue', status: 'worn' },
        { name: 'Road All White', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Music City', h: 'blue', j: 'music', p: 'navy', s: 'navy', debut: '2026-11-15', note: 'Rivalries debut vs JAX' },
      ],
    };
  })(),

  // ───────────────────────────── AFC WEST ─────────────────────────────
  (() => {
    const OR = '#FB4F14', NAVY = '#0A2343', RB = '#1F3A93';
    return {
      id: 'DEN', city: 'Denver', name: 'Broncos', conf: 'AFC', div: 'West',
      colors: [OR, NAVY, W], font: 'modern',
      helmets: [
        { id: 'navy', name: 'Midnight Navy', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: sym([W, 1], [OR, 2]),
          logo: { t: 'text', s: 'D', fill: OR, stroke: W, font: 'italic', streak: OR } },
        { id: 'white', name: 'Snowcapped White', tag: 'Alternate', shell: W, finish: 'gloss', mask: NAVY, stripe: sym([NAVY, 1], [OR, 2]),
          logo: { t: 'text', s: 'D', fill: OR, stroke: NAVY, font: 'italic', streak: OR } },
        { id: 'crush', name: 'Orange Crush Blue', tag: 'Throwback', shell: RB, finish: 'gloss', mask: W, stripe: sym([W, 1], [OR, 2.4]),
          logo: { t: 'text', s: 'D', fill: OR, stroke: W, font: 'block' } },
      ],
      jerseys: [
        { id: 'orange', name: 'Sunset Orange', tag: 'Home', base: OR, num: [NAVY, W], sleeve: { cap: NAVY } },
        { id: 'white', name: 'Summit White', tag: 'Road', base: W, num: [OR, NAVY], sleeve: { cap: NAVY } },
        { id: 'navy', name: 'Midnight Navy', tag: 'Alternate', base: NAVY, num: [OR, W], sleeve: { cap: OR } },
        { id: 'crush', name: 'Orange Crush', tag: 'Throwback', base: OR, num: [RB, W], font: 'block', sleeve: { stripes: sym([RB, 1.4], [W, 1.4]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 1], [OR, 2.4]) },
        { id: 'navy', name: 'Navy', base: NAVY, stripe: sym([OR, 1], [W, 2.4]) },
        { id: 'orange', name: 'Orange', base: OR, stripe: sym([NAVY, 1], [W, 2.4]) },
        { id: 'crush', name: 'Orange Crush White', tag: 'Throwback', base: W, stripe: sym([OR, 1.6], [RB, 1.6]) },
      ],
      socks: [
        { id: 'orange', name: 'Orange', base: OR },
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'white', name: 'White', base: W },
        { id: 'blue', name: 'Throwback Blue', base: RB, stripes: [[W, 2], [null, 1.5], [OR, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'orange', p: 'white', s: 'orange', status: 'worn' },
        { name: 'Home Navy Pants', h: 'navy', j: 'orange', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Snowcapped', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'Opener vs KC, Sep 14' },
        { name: 'Midnight Navy', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn', note: 'Sep 26 vs LAR' },
        { name: 'White Helmet / Navy', h: 'white', j: 'navy', p: 'white', s: 'navy', debut: '2026-12-25', note: 'Christmas vs BUF' },
        { name: 'Orange Crush', h: 'crush', j: 'crush', p: 'crush', s: 'blue', status: 'worn', note: 'Oct 15 vs SEA, Jan 10 vs LAC' },
      ],
    };
  })(),

  (() => {
    const R = '#E31837', GOLD = '#FFB81C';
    return {
      id: 'KC', city: 'Kansas City', name: 'Chiefs', conf: 'AFC', div: 'West',
      colors: [R, GOLD, W], font: 'block',
      helmets: [
        { id: 'red', name: 'Red', tag: 'Primary', shell: R, finish: 'gloss', mask: W, stripe: null,
          logo: { t: 'text', s: 'KC', fill: R, stroke: K, font: 'block', bg: { shape: 'arrowhead', fill: W, stroke: K } } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home', base: R, num: [W, GOLD], sleeve: { stripes: sym([W, 1.4], [GOLD, 1], [W, 1.4]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, GOLD], sleeve: { stripes: sym([R, 1.4], [GOLD, 1], [R, 1.4]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([R, 1.4], [GOLD, 1], [R, 1.4]) },
        { id: 'red', name: 'Red', base: R, stripe: sym([W, 1.4], [GOLD, 1], [W, 1.4]) },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R, stripes: [[W, 2], [GOLD, 1], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[R, 2], [GOLD, 1], [R, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'red', j: 'red', p: 'white', s: 'red', status: 'worn' },
        { name: 'Road', h: 'red', j: 'white', p: 'red', s: 'red', status: 'worn' },
        { name: 'Road All White', h: 'red', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Red', h: 'red', j: 'red', p: 'red', s: 'red', status: 'worn', note: 'Color Rush look' },
      ],
    };
  })(),

  (() => {
    const SIL = '#A5ACAF', BK = '#000000';
    return {
      id: 'LV', city: 'Las Vegas', name: 'Raiders', conf: 'AFC', div: 'West',
      colors: [BK, SIL, W], font: 'block',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: SIL, finish: 'metallic', mask: BK, stripe: [[BK, 2.6]],
          logo: { t: 'text', s: 'R', fill: SIL, stroke: W, font: 'block', bg: { shape: 'shield', fill: BK, stroke: W } } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [W, SIL] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, SIL] },
        { id: 'classic', name: 'Silver Numbers', tag: 'Throwback', base: W, num: [SIL, BK] },
        { id: 'rush', name: 'Color Rush', tag: 'Color Rush', base: BK, num: [SIL, W] },
      ],
      pants: [
        { id: 'silver', name: 'Silver', base: SIL, stripe: [[BK, 2.6]] },
        { id: 'black', name: 'Black', base: BK, stripe: [[SIL, 2.6]] },
        { id: 'white', name: 'White', base: W, stripe: [[BK, 2.6]] },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'silver', name: 'Silver', base: SIL },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'black', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Color Rush', h: 'silver', j: 'rush', p: 'black', s: 'black', status: 'worn' },
        { name: 'Classic Silver Numbers', h: 'silver', j: 'classic', p: 'silver', s: 'black', status: 'worn', note: 'Oct at NE' },
      ],
    };
  })(),

  (() => {
    const PB = '#0080C6', GOLD = '#FFC20E', NAVY = '#0B2A56';
    return {
      id: 'LAC', city: 'Los Angeles', name: 'Chargers', conf: 'AFC', div: 'West',
      colors: [PB, GOLD, NAVY], font: 'modern',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: GOLD, stripe: null,
          logo: { t: 'bolt', fill: GOLD, stroke: PB }, numbers: PB },
        { id: 'navy', name: 'Navy', tag: 'Alternate', shell: NAVY, finish: 'gloss', mask: GOLD, stripe: null,
          logo: { t: 'bolt', fill: W, stroke: GOLD }, numbers: W },
      ],
      jerseys: [
        { id: 'powder', name: 'Powder Blue', tag: 'Home', base: PB, num: [W, NAVY], loop: [[GOLD, 2.6]], loopPattern: 'bolt' },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [PB, NAVY], loop: [[GOLD, 2.6]], loopPattern: 'bolt' },
        { id: 'navy', name: 'Super Chargers Navy', tag: 'Alternate', base: NAVY, num: [W, NAVY, GOLD], loop: [[W, 2.6]], loopPattern: 'bolt' },
        { id: 'gold', name: 'Charger Power Gold', tag: 'Alternate', base: GOLD, num: [PB, W], loop: [[PB, 2.6]], loopPattern: 'bolt' },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: [[GOLD, 3]], pattern: { t: 'bolt', c: GOLD } },
        { id: 'gold', name: 'Gold', base: GOLD, stripe: [[PB, 3]], pattern: { t: 'bolt', c: PB } },
        { id: 'powder', name: 'Powder Blue', base: PB, pattern: { t: 'bolt', c: GOLD } },
        { id: 'navy', name: 'Navy', base: NAVY, pattern: { t: 'bolt', c: W } },
      ],
      socks: [
        { id: 'powder', name: 'Powder Blue', base: PB },
        { id: 'gold', name: 'Gold', base: GOLD },
        { id: 'white', name: 'White', base: W },
        { id: 'navy', name: 'Navy', base: NAVY },
      ],
      looks: [
        { name: 'Home', h: 'white', j: 'powder', p: 'white', s: 'powder', status: 'worn' },
        { name: 'Home Gold Pants', h: 'white', j: 'powder', p: 'gold', s: 'powder', status: 'worn' },
        { name: 'All Powder', h: 'white', j: 'powder', p: 'powder', s: 'powder', status: 'worn' },
        { name: 'Road', h: 'white', j: 'white', p: 'powder', s: 'powder', status: 'worn' },
        { name: 'Road Gold Pants', h: 'white', j: 'white', p: 'gold', s: 'gold', status: 'worn' },
        { name: 'Super Chargers', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn', note: 'Nov 8, Nov 29, Jan 3' },
        { name: 'Charger Power', h: 'white', j: 'gold', p: 'white', s: 'gold', debut: '2026-12-06', note: 'Gold over white pants vs TB' },
        { name: 'Charger Power (All Gold)', h: 'white', j: 'gold', p: 'gold', s: 'gold', status: 'worn' },
      ],
    };
  })(),

  // ───────────────────────────── NFC EAST ─────────────────────────────
  (() => {
    const NAVY = '#041E42', ROY = '#003594', SB = '#8A9AAB', GR = '#869397';
    return {
      id: 'DAL', city: 'Dallas', name: 'Cowboys', conf: 'NFC', div: 'East',
      colors: [NAVY, SB, W], font: 'block',
      helmets: [
        { id: 'silver', name: 'Metallic Silver-Blue', tag: 'Primary', shell: SB, finish: 'metallic', mask: NAVY, stripe: sym([NAVY, 1.2], [W, 1], [ROY, 1.4]),
          logo: { t: 'star', fill: ROY, stroke: W, stroke2: NAVY } },
        { id: 'white', name: 'White', tag: 'Throwback', shell: W, finish: 'gloss', mask: GR, stripe: sym([ROY, 1.2], [NAVY, 2]),
          logo: { t: 'star', fill: ROY, stroke: ROY } },
      ],
      jerseys: [
        { id: 'white', name: 'White', tag: 'Home', base: W, num: [ROY, NAVY], sleeve: { stripes: sym([NAVY, 1.4], [ROY, 1.4]) } },
        { id: 'navy', name: 'Navy', tag: 'Road', base: NAVY, num: [W, GR], sleeve: { stripes: sym([W, 1.2], [GR, 1.4]) } },
        { id: 'arctic', name: 'Arctic Cowboy', tag: 'Color Rush', base: W, num: [NAVY, SB], sleeve: { stripes: sym([NAVY, 2], [SB, 1]) } },
        { id: '60s', name: '1960s', tag: 'Throwback', base: W, num: [ROY], sleeve: { stripes: sym([ROY, 1.8], [null, 1.2]) } },
      ],
      pants: [
        { id: 'silver', name: 'Silver-Blue', base: '#AFBCC8', stripe: sym([NAVY, 1.2], [W, 1], [ROY, 1.4]) },
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 1.4], [SB, 1.4]) },
        { id: 'tbwhite', name: '1960s White', tag: 'Throwback', base: W, stripe: sym([ROY, 1.4], [NAVY, 1.4]) },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY, stripes: [[W, 1.4], [ROY, 1.4], [W, 1.4]] },
        { id: 'white', name: 'White', base: W, stripes: [[NAVY, 2]] },
        { id: 'royal', name: 'Royal', base: ROY, stripes: [[W, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'white', p: 'silver', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'navy', p: 'silver', s: 'navy', status: 'worn' },
        { name: 'Arctic Cowboy', h: 'silver', j: 'arctic', p: 'white', s: 'white', status: 'worn', note: 'Also Oct 26 at PHI, Dec 27 vs JAX' },
        { name: 'White Helmet / Navy', h: 'white', j: 'navy', p: 'white', s: 'navy', debut: '2026-11-08', note: 'At IND' },
        { name: '1960s Thanksgiving', h: 'white', j: '60s', p: 'tbwhite', s: 'royal', status: 'worn', note: 'Thanksgiving vs PHI' },
      ],
    };
  })(),

  (() => {
    const B = '#0B2265', RED = '#A71930', GR = '#A5ACAF';
    return {
      id: 'NYG', city: 'New York', name: 'Giants', conf: 'NFC', div: 'East',
      colors: [B, RED, GR], font: 'block',
      helmets: [
        { id: 'blue', name: 'Blue', tag: 'Primary', shell: B, finish: 'gloss', mask: GR, stripe: null,
          logo: { t: 'text', s: 'ny', fill: W, stroke: RED, font: 'block' } },
        { id: 'legacy', name: 'Legacy', tag: 'Throwback', shell: B, finish: 'gloss', mask: GR, stripe: sym([RED, 1.2], [W, 1.6]),
          logo: { t: 'text', s: 'GIANTS', fill: W, stroke: RED, font: 'italic', underline: RED } },
      ],
      jerseys: [
        { id: 'blue', name: 'Blue', tag: 'Home', base: B, num: [W, RED] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [B, RED] },
        { id: 'legacy', name: 'Legacy Blue', tag: 'Throwback', base: B, num: [W, RED], sleeve: { stripes: sym([W, 1.4], [RED, 1.8]) } },
        { id: 'vintage', name: 'Vintage White', tag: 'Color Rush', base: W, num: [B, RED], sleeve: { stripes: sym([B, 1.4], [RED, 1.8]) } },
      ],
      pants: [
        { id: 'gray', name: 'Gray', base: '#B9BDC0', stripe: sym([RED, 1], [B, 1.6]) },
        { id: 'white', name: 'White', base: W, stripe: sym([B, 1], [RED, 1.6]) },
        { id: 'legacy', name: 'Legacy Gray', tag: 'Throwback', base: '#B9BDC0', stripe: sym([RED, 1.4], [B, 1.4]) },
      ],
      socks: [
        { id: 'blue', name: 'Blue', base: B, stripes: [[RED, 1.6], [W, 1.2], [RED, 1.6]] },
        { id: 'red', name: 'Red', base: RED, stripes: [[B, 1.6], [W, 1.2], [B, 1.6]] },
        { id: 'white', name: 'White', base: W, stripes: [[B, 1.6], [RED, 1.2], [B, 1.6]] },
      ],
      looks: [
        { name: 'Home', h: 'blue', j: 'blue', p: 'gray', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'blue', j: 'white', p: 'gray', s: 'red', status: 'worn' },
        { name: 'Legacy', h: 'legacy', j: 'legacy', p: 'legacy', s: 'red', status: 'worn', note: 'Super Bowl XXI 40th: Oct 4 and Dec 6' },
        { name: 'Vintage White', h: 'blue', j: 'vintage', p: 'white', s: 'white', status: 'worn', note: 'Nov 8 at PHI, Nov 12 vs WAS' },
      ],
    };
  })(),

  (() => {
    const MG = '#004C54', SIL = '#A5ACAF', KG = '#3F9C35', BK = '#111111';
    return {
      id: 'PHI', city: 'Philadelphia', name: 'Eagles', conf: 'NFC', div: 'East',
      colors: [MG, SIL, BK], font: 'block',
      helmets: [
        { id: 'green', name: 'Midnight Green', tag: 'Primary', shell: MG, finish: 'metallic', mask: BK, stripe: null, logo: { t: 'wing', fill: SIL, stroke: W } },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { t: 'wing', fill: SIL, stroke: MG } },
        { id: 'kelly', name: 'Kelly Green', tag: 'Throwback', shell: KG, finish: 'gloss', mask: '#9EA2A2', stripe: null, logo: { t: 'wing', fill: W, stroke: W } },
      ],
      jerseys: [
        { id: 'green', name: 'Midnight Green', tag: 'Home', base: MG, num: [W, BK], sleeve: { stripes: sym([BK, 1], [SIL, 1.4]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [MG, BK], sleeve: { stripes: sym([BK, 1], [MG, 1.4]) } },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [W, MG], sleeve: { stripes: sym([MG, 1], [SIL, 1.4]) } },
        { id: 'kelly', name: 'Kelly Green', tag: 'Throwback', base: KG, num: [W, SIL], sleeve: { stripes: sym([W, 1.4], [SIL, 1.4]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([MG, 1], [BK, 1.4]) },
        { id: 'green', name: 'Midnight Green', base: MG, stripe: sym([W, 1], [BK, 1.4]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([MG, 1], [SIL, 1.4]) },
        { id: 'silver', name: 'Kelly Silver', tag: 'Throwback', base: SIL, stripe: sym([KG, 1.4], [W, 1.4]) },
      ],
      socks: [
        { id: 'green', name: 'Midnight Green', base: MG },
        { id: 'black', name: 'Black', base: BK },
        { id: 'white', name: 'White', base: W },
        { id: 'kelly', name: 'Kelly', base: KG, stripes: [[W, 2], [null, 1], [W, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'green', j: 'green', p: 'white', s: 'green', status: 'worn' },
        { name: 'All Green', h: 'green', j: 'green', p: 'green', s: 'green', status: 'worn' },
        { name: 'Road', h: 'green', j: 'white', p: 'green', s: 'green', status: 'worn' },
        { name: 'Road All White', h: 'green', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn', note: 'Dec 19 vs SEA' },
        { name: 'Kelly Green', h: 'kelly', j: 'kelly', p: 'silver', s: 'kelly', status: 'worn', note: 'Nov 8 vs NYG, Dec 24 vs HOU' },
      ],
    };
  })(),

  (() => {
    const BUR = '#5A1414', GOLD = '#FFB612', BK = '#0E0E0E';
    return {
      id: 'WAS', city: 'Washington', name: 'Commanders', conf: 'NFC', div: 'East',
      colors: [BUR, GOLD, W], font: 'block',
      helmets: [
        { id: 'burgundy', name: 'Burgundy', tag: 'Primary · New 2026', shell: BUR, finish: 'gloss', mask: GOLD, stripe: sym([GOLD, 1], [W, 1.2], [GOLD, 1]),
          logo: { t: 'text', s: 'W', fill: GOLD, stroke: W, font: 'block' } },
        { id: 'black', name: 'Hail Raiser Black', tag: 'New 2026', debut: '2026-11-23', shell: BK, finish: 'gloss', mask: BK, stripe: null,
          logo: { t: 'text', s: 'W', fill: BUR, stroke: GOLD, font: 'block', spear: GOLD } },
      ],
      jerseys: [
        { id: 'burgundy', name: 'Burgundy', tag: 'Home · New 2026', base: BUR, num: [W, GOLD], sleeve: { stripes: sym([GOLD, 1.2], [W, 1.2], [GOLD, 1.2]) } },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [BUR, GOLD], sleeve: { stripes: sym([BUR, 1.2], [GOLD, 1.2], [BUR, 1.2]) } },
        { id: 'hail', name: 'Hail Raiser', tag: 'New 2026', debut: '2026-11-23', base: BK, num: [BUR, GOLD], sleeve: { stripes: sym([BUR, 1.2], [GOLD, 1]) } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: sym([BUR, 1.4], [null, 0.8]) },
        { id: 'white', name: 'White', base: W, stripe: sym([BUR, 1.4], [GOLD, 0.8]) },
        { id: 'burgundy', name: 'Burgundy', base: BUR, stripe: sym([GOLD, 1.4], [W, 0.8]) },
        { id: 'black', name: 'Hail Raiser Black', debut: '2026-11-23', base: BK, stripe: sym([BUR, 1.4], [GOLD, 0.8]) },
      ],
      socks: [
        { id: 'burgundy', name: 'Burgundy', base: BUR, stripes: [[GOLD, 1.6], [W, 1], [GOLD, 1.6]] },
        { id: 'white', name: 'White', base: W, stripes: [[BUR, 1.6], [GOLD, 1], [BUR, 1.6]] },
        { id: 'black', name: 'Black', base: BK, stripes: [[BUR, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'burgundy', j: 'burgundy', p: 'gold', s: 'burgundy', status: 'worn' },
        { name: 'Home White Pants', h: 'burgundy', j: 'burgundy', p: 'white', s: 'burgundy', status: 'worn' },
        { name: 'Road', h: 'burgundy', j: 'white', p: 'gold', s: 'burgundy', status: 'worn' },
        { name: 'Road Burgundy Pants', h: 'burgundy', j: 'white', p: 'burgundy', s: 'burgundy', status: 'worn' },
        { name: 'Hail Raiser', h: 'black', j: 'hail', p: 'black', s: 'black', debut: '2026-11-23', note: 'vs CIN, then Dec 20 vs ATL' },
      ],
    };
  })(),

  // ───────────────────────────── NFC NORTH ─────────────────────────────
  (() => {
    const NAVY = '#0B162A', OR = '#C83803';
    return {
      id: 'CHI', city: 'Chicago', name: 'Bears', conf: 'NFC', div: 'North',
      colors: [NAVY, OR, W], font: 'block',
      helmets: [
        { id: 'navy', name: 'Navy', tag: 'Primary', shell: NAVY, finish: 'gloss', mask: NAVY, stripe: sym([OR, 1], [W, 1], [OR, 1.2]),
          logo: { t: 'text', s: 'C', fill: OR, stroke: W, font: 'serif' } },
        { id: 'orange', name: 'Orange', tag: 'New 2026', debut: '2026-12-25', shell: OR, finish: 'gloss', mask: NAVY, stripe: sym([NAVY, 1], [W, 1], [NAVY, 1.2]),
          logo: { t: 'text', s: 'C', fill: NAVY, stroke: W, font: 'serif' } },
      ],
      jerseys: [
        { id: 'navy', name: 'Navy', tag: 'Home', base: NAVY, num: [W, OR], sleeve: { stripes: sym([OR, 1.6], [W, 1], [OR, 1.6]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, OR], sleeve: { stripes: sym([NAVY, 1.6], [OR, 1], [NAVY, 1.6]) } },
        { id: 'orange', name: 'Orange', tag: 'Alternate', base: OR, num: [NAVY, W], sleeve: { stripes: sym([NAVY, 1.6], [W, 1], [NAVY, 1.6]) } },
        { id: 'monsters', name: 'Monsters Rivalries', tag: 'Rivalries · New', debut: '2026-12-25', base: NAVY, num: [OR, W], font: 'varsity', sleeve: { stripes: [[OR, 1.4], [null, 1], [OR, 1.4], [null, 1], [OR, 1.4]] } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 1.4], [OR, 1.4]) },
        { id: 'navy', name: 'Navy', base: NAVY, stripe: sym([OR, 1.4], [W, 1.4]) },
        { id: 'orange', name: 'Orange', tag: 'New 2026', debut: '2026-12-25', base: OR, stripe: sym([NAVY, 1.4], [W, 1.4]) },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY, stripes: [[OR, 1.6], [W, 1], [OR, 1.6]] },
        { id: 'white', name: 'White', base: W, stripes: [[NAVY, 1.6], [OR, 1], [NAVY, 1.6]] },
        { id: 'orange', name: 'Orange', base: OR, stripes: [[NAVY, 2], [null, 1], [NAVY, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'navy', p: 'white', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Road All White', h: 'navy', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Orange Alternate', h: 'navy', j: 'orange', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Monsters Rivalries', h: 'orange', j: 'monsters', p: 'orange', s: 'navy', debut: '2026-12-25', note: 'Christmas vs GB' },
      ],
    };
  })(),

  (() => {
    const HB = '#0076B6', SIL = '#B0B7BC', BK = '#0D0D0D', CON = '#7B7F83';
    return {
      id: 'DET', city: 'Detroit', name: 'Lions', conf: 'NFC', div: 'North',
      colors: [HB, SIL, BK], font: 'modern',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: SIL, finish: 'metallic', mask: HB, stripe: null, logo: { t: 'text', s: 'D', fill: HB, stroke: W, font: 'italic' } },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { t: 'text', s: 'D', fill: HB, stroke: SIL, font: 'italic' } },
        { id: 'blue', name: 'Honolulu Blue', tag: 'Alternate', shell: HB, finish: 'gloss', mask: HB, stripe: null, logo: { t: 'text', s: 'D', fill: SIL, stroke: W, font: 'italic' } },
      ],
      jerseys: [
        { id: 'blue', name: 'Honolulu Blue', tag: 'Home', base: HB, num: [W, SIL] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [HB, SIL] },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [HB, SIL] },
        { id: 'concrete', name: 'Concrete Rivalries', tag: 'Rivalries · New', debut: '2026-11-01', base: CON, num: ['#2A2C2F', HB], font: 'modern', loop: sym([HB, 1.4], [BK, 1]) },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([HB, 1.2], [SIL, 1]) },
        { id: 'blue', name: 'Honolulu Blue', base: HB, stripe: sym([W, 1.2], [SIL, 1]) },
        { id: 'silver', name: 'Silver', base: SIL, stripe: sym([HB, 1.2], [W, 1]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([HB, 1.2], [SIL, 1]) },
        { id: 'concrete', name: 'Concrete', tag: 'Rivalries', debut: '2026-11-01', base: CON, stripe: sym([HB, 1.4], [BK, 1]) },
      ],
      socks: [
        { id: 'blue', name: 'Blue', base: HB },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
        { id: 'gray', name: 'Concrete', base: CON },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'blue', p: 'white', s: 'blue', status: 'worn' },
        { name: 'All Blue', h: 'silver', j: 'blue', p: 'blue', s: 'blue', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'blue', s: 'blue', status: 'worn' },
        { name: 'Road Silver Pants', h: 'silver', j: 'white', p: 'silver', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Concrete Rivalries', h: 'blue', j: 'concrete', p: 'concrete', s: 'gray', debut: '2026-11-01', note: 'Debut vs MIN' },
      ],
    };
  })(),

  (() => {
    const G = '#203731', GOLD = '#FFB612', DS = '#556B57', ALB = '#EEE7D5', NAVY = '#1E2A4A', LEATHER = '#6B4A2B';
    return {
      id: 'GB', city: 'Green Bay', name: 'Packers', conf: 'NFC', div: 'North',
      colors: [G, GOLD, W], font: 'block',
      helmets: [
        { id: 'gold', name: 'Gold', tag: 'Primary', shell: GOLD, finish: 'gloss', mask: G, stripe: sym([G, 1.2], [W, 1.2], [G, 1.2]),
          logo: { t: 'text', s: 'G', fill: W, stroke: W, font: 'block', bg: { shape: 'oval', fill: G, stroke: W } } },
        { id: 'leather', name: '1923 Leather', tag: 'Throwback · New', debut: '2026-12-13', shell: LEATHER, finish: 'matte', mask: null, stripe: [[ '#4A331E', 5 ]], logo: { t: 'none' } },
        { id: 'alabaster', name: 'Alabaster', tag: 'Rivalries · New', debut: '2026-10-11', shell: ALB, finish: 'gloss', mask: DS, stripe: sym([DS, 1], [GOLD, 1]),
          logo: { t: 'text', s: 'G', fill: ALB, stroke: ALB, font: 'block', bg: { shape: 'oval', fill: DS, stroke: GOLD } } },
      ],
      jerseys: [
        { id: 'green', name: 'Green', tag: 'Home', base: G, num: [W], sleeve: { stripes: sym([GOLD, 1.2], [W, 1.2], [GOLD, 1.2]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [G], sleeve: { stripes: sym([G, 1.2], [GOLD, 1.2], [G, 1.2]) } },
        { id: 'y1923', name: '1923', tag: 'Throwback · New', debut: '2026-12-13', base: NAVY, num: [GOLD], font: 'varsity', collar: GOLD },
        { id: 'riv', name: 'Stock Certificate', tag: 'Rivalries · New', debut: '2026-10-11', base: DS, num: [ALB, GOLD], font: 'varsity', sleeve: { stripes: sym([GOLD, 0.8], [ALB, 1.4]) } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: sym([G, 1.2], [W, 1.2], [G, 1.2]) },
        { id: 'white', name: 'White', base: W, stripe: sym([G, 1.2], [GOLD, 1.2], [G, 1.2]) },
        { id: 'khaki', name: '1923 Khaki', tag: 'Throwback', debut: '2026-12-13', base: '#C8B88A' },
        { id: 'alabaster', name: 'Alabaster', tag: 'Rivalries', debut: '2026-10-11', base: ALB, stripe: sym([DS, 1], [GOLD, 1]) },
      ],
      socks: [
        { id: 'green', name: 'Green', base: G, stripes: [[GOLD, 1.4], [W, 1.2], [GOLD, 1.4]] },
        { id: 'white', name: 'White', base: W, stripes: [[G, 1.4], [GOLD, 1.2], [G, 1.4]] },
        { id: 'navy', name: '1923 Navy', base: NAVY, stripes: [[GOLD, 2.4], [null, 2.4], [GOLD, 2.4]] },
        { id: 'ds', name: 'Rivalries Green', base: DS, stripes: [[GOLD, 1.4]] },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'green', p: 'gold', s: 'green', status: 'worn' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'green', status: 'worn' },
        { name: 'Road All White', h: 'gold', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Stock Certificate', h: 'alabaster', j: 'riv', p: 'alabaster', s: 'ds', debut: '2026-10-11', note: 'Rivalries debut vs CHI' },
        { name: '1923 Throwback', h: 'leather', j: 'y1923', p: 'khaki', s: 'navy', debut: '2026-12-13', note: 'vs BUF, hand-painted leather-look helmet' },
      ],
    };
  })(),

  (() => {
    const P = '#4F2683', GOLD = '#FFC62F', DP = '#2A1552';
    return {
      id: 'MIN', city: 'Minnesota', name: 'Vikings', conf: 'NFC', div: 'North',
      colors: [P, GOLD, W], font: 'modern',
      helmets: [
        { id: 'purple', name: 'Purple', tag: 'Primary', shell: P, finish: 'gloss', mask: P, stripe: null, logo: { t: 'horn', fill: W, stroke: GOLD } },
        { id: 'winter', name: 'Winter Warrior', tag: 'Alternate', shell: W, finish: 'gloss', mask: '#C9CED3', stripe: null, logo: { t: 'horn', fill: '#C9CED3', stroke: P } },
        { id: 'classic', name: 'Purple People Eater', tag: 'Throwback', shell: P, finish: 'gloss', mask: '#9EA2A2', stripe: null, logo: { t: 'horn', fill: W, stroke: W } },
        { id: 'riv', name: 'Rivalries', tag: 'New 2026', debut: '2026-12-20', shell: DP, finish: 'metallic', mask: GOLD, stripe: sym([GOLD, 0.8], ['#EFE6CF', 1.4]), logo: { t: 'horn', fill: '#EFE6CF', stroke: GOLD } },
      ],
      jerseys: [
        { id: 'purple', name: 'Purple', tag: 'Home', base: P, num: [W, GOLD] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [P, GOLD] },
        { id: 'winter', name: 'Winter Warrior', tag: 'Alternate', base: W, num: ['#C9CED3', P] },
        { id: 'classic', name: 'Purple People Eater', tag: 'Throwback', base: P, num: [W], font: 'block', sleeve: { stripes: sym([W, 1.4], [GOLD, 1.4]) } },
        { id: 'riv', name: 'Rivalries Deep Purple', tag: 'Rivalries · New', debut: '2026-12-20', base: DP, num: ['#EFE6CF', GOLD], sleeve: { stripes: sym([GOLD, 1], ['#EFE6CF', 1.4]) } },
      ],
      pants: [
        { id: 'white', name: 'White', base: W, stripe: sym([P, 1.4], [GOLD, 1]) },
        { id: 'purple', name: 'Purple', base: P, stripe: sym([W, 1.4], [GOLD, 1]) },
        { id: 'classicw', name: 'Throwback White', tag: 'Throwback', base: W, stripe: sym([P, 1.6], [GOLD, 1.6]) },
        { id: 'winter', name: 'Winter White', base: W, stripe: sym(['#C9CED3', 1.4], [P, 1]) },
        { id: 'riv', name: 'Rivalries Purple', debut: '2026-12-20', base: DP, stripe: sym([GOLD, 1], ['#EFE6CF', 1.4]) },
      ],
      socks: [
        { id: 'purple', name: 'Purple', base: P, stripes: [[GOLD, 2], [null, 1], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[P, 2], [null, 1], [GOLD, 2]] },
        { id: 'deep', name: 'Deep Purple', base: DP, stripes: [[GOLD, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'purple', j: 'purple', p: 'white', s: 'purple', status: 'worn' },
        { name: 'All Purple', h: 'purple', j: 'purple', p: 'purple', s: 'purple', status: 'worn' },
        { name: 'Road', h: 'purple', j: 'white', p: 'white', s: 'purple', status: 'worn' },
        { name: 'Road Purple Pants', h: 'purple', j: 'white', p: 'purple', s: 'purple', status: 'worn' },
        { name: 'Purple People Eater', h: 'classic', j: 'classic', p: 'classicw', s: 'purple', status: 'worn', note: 'Opener vs GB, Sep 13' },
        { name: 'Winter Warrior', h: 'winter', j: 'winter', p: 'winter', s: 'white', status: 'worn', note: 'Dec 27 vs WAS' },
        { name: 'Rivalries', h: 'riv', j: 'riv', p: 'riv', s: 'deep', debut: '2026-12-20', note: 'Debut vs DET' },
      ],
    };
  })(),

  // ───────────────────────────── NFC SOUTH ─────────────────────────────
  (() => {
    const R = '#A71930', BK = '#0F0F0F', SIL = '#A5ACAF';
    return {
      id: 'ATL', city: 'Atlanta', name: 'Falcons', conf: 'NFC', div: 'South',
      colors: [R, BK, SIL], font: 'modern',
      helmets: [
        { id: 'black', name: 'Black', tag: 'Primary', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { t: 'text', s: 'F', fill: R, stroke: W, font: 'italic', streak: SIL } },
        { id: 'red', name: '1966 Red', tag: 'Throwback', shell: R, finish: 'gloss', mask: '#9EA2A2', stripe: sym([W, 0.8], [BK, 2.2]), logo: { t: 'text', s: 'F', fill: BK, stroke: W, font: 'italic' } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home · New 2026', base: R, num: [W, BK], word: { s: 'FALCONS', c: W }, sleeve: { stripes: sym([BK, 1], [SIL, 0.8]) } },
        { id: 'white', name: 'White', tag: 'Road · New 2026', base: W, num: [R, BK], word: { s: 'ATLANTA', c: R }, sleeve: { stripes: sym([BK, 1], [SIL, 0.8]) } },
        { id: 'y1966', name: '1966 Black', tag: 'Throwback', base: BK, num: [W, R], font: 'block', sleeve: { stripes: sym([R, 1.4], [W, 1.4]) } },
      ],
      pants: [
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: sym([BK, 1], [SIL, 0.8], [R, 1.8]) },
        { id: 'black', name: 'Black', tag: 'New 2026', base: BK, stripe: sym([R, 1], [SIL, 0.8], [W, 1.8]) },
        { id: 'tb', name: '1966 White', tag: 'Throwback', base: W, stripe: sym([R, 1.4], [BK, 1.4]) },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK, stripes: [[R, 2], [null, 1], [W, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'black', j: 'red', p: 'white', s: 'red', status: 'worn' },
        { name: 'Road', h: 'black', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Road Black Pants', h: 'black', j: 'white', p: 'black', s: 'white', status: 'worn' },
        { name: '1966 Throwback', h: 'red', j: 'y1966', p: 'tb', s: 'black', debut: '2026-10-25', note: 'vs SF, then Dec 6 vs DET' },
      ],
    };
  })(),

  (() => {
    const BLUE = '#0085CA', BK = '#101820', SIL = '#BFC0BF';
    return {
      id: 'CAR', city: 'Carolina', name: 'Panthers', conf: 'NFC', div: 'South',
      colors: [BLUE, BK, SIL], font: 'modern',
      helmets: [
        { id: 'silver', name: 'Silver', tag: 'Primary', shell: SIL, finish: 'metallic', mask: BK, stripe: sym([BK, 1], [BLUE, 1.6]), logo: { t: 'text', s: 'P', fill: BLUE, stroke: BK, font: 'italic', streak: BK } },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: sym([SIL, 1], [BLUE, 1.6]), logo: { t: 'text', s: 'P', fill: BLUE, stroke: SIL, font: 'italic', streak: SIL } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [BLUE, W] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BLUE, BK] },
        { id: 'blue', name: 'Process Blue', tag: 'Alternate', base: BLUE, num: [BK, W], sleeve: { stripes: sym([BK, 1], [SIL, 1]) } },
      ],
      pants: [
        { id: 'silver', name: 'Silver', base: SIL, stripe: sym([BK, 1], [BLUE, 1.6]) },
        { id: 'white', name: 'White', base: W, stripe: sym([BK, 1], [BLUE, 1.6]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([SIL, 1], [BLUE, 1.6]) },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK },
        { id: 'blue', name: 'Blue', base: BLUE },
        { id: 'white', name: 'White', base: W },
      ],
      looks: [
        { name: 'Home', h: 'silver', j: 'black', p: 'silver', s: 'black', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn' },
        { name: 'Road', h: 'silver', j: 'white', p: 'silver', s: 'black', status: 'worn' },
        { name: 'Road All White', h: 'silver', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'Process Blue', h: 'black', j: 'blue', p: 'white', s: 'blue', status: 'worn', note: 'Sep 13 vs CHI' },
        { name: 'Process Blue (Silver Helmet)', h: 'silver', j: 'blue', p: 'silver', s: 'blue', status: 'worn' },
      ],
    };
  })(),

  (() => {
    const GOLD = '#D3BC8D', BK = '#101820';
    return {
      id: 'NO', city: 'New Orleans', name: 'Saints', conf: 'NFC', div: 'South',
      colors: [GOLD, BK, W], font: 'block',
      helmets: [
        { id: 'gold', name: 'Old Gold', tag: 'Primary', shell: GOLD, finish: 'metallic', mask: BK, stripe: sym([BK, 1], [W, 1.2]), logo: { t: 'fleur', fill: BK, stroke: W } },
        { id: 'white', name: 'White', tag: 'Alternate', shell: W, finish: 'gloss', mask: BK, stripe: sym([BK, 1], [GOLD, 1.2]), logo: { t: 'fleur', fill: GOLD, stroke: BK } },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: sym([GOLD, 1], [W, 1.2]), logo: { t: 'fleur', fill: GOLD, stroke: W } },
      ],
      jerseys: [
        { id: 'black', name: 'Black', tag: 'Home', base: BK, num: [GOLD, W] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [BK, GOLD] },
        { id: 'rush', name: 'Color Rush White', tag: 'Color Rush', base: W, num: [GOLD, BK], sleeve: { stripes: sym([GOLD, 1.4], [BK, 1]) } },
        { id: 'gold', name: 'Gold', tag: 'Alternate', base: GOLD, num: [BK, W] },
      ],
      pants: [
        { id: 'gold', name: 'Old Gold', base: GOLD, stripe: sym([BK, 1], [W, 1.2]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([GOLD, 1], [W, 1.2]) },
        { id: 'white', name: 'White', base: W, stripe: sym([GOLD, 1.4], [BK, 1]) },
      ],
      socks: [
        { id: 'black', name: 'Black', base: BK, stripes: [[GOLD, 2], [null, 1], [W, 2]] },
        { id: 'white', name: 'White', base: W, stripes: [[GOLD, 2], [null, 1], [BK, 2]] },
        { id: 'gold', name: 'Gold', base: GOLD },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'black', p: 'gold', s: 'black', status: 'worn' },
        { name: 'Home White Out', h: 'gold', j: 'white', p: 'white', s: 'white', status: 'worn', note: 'White at home twice in 2026' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'black', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn', note: 'Nov 15 vs CAR (Paris)' },
        { name: 'Color Rush', h: 'white', j: 'rush', p: 'white', s: 'white', status: 'worn', note: 'Oct 18, Nov 29, Dec 27' },
        { name: 'Gold Alternate', h: 'black', j: 'gold', p: 'black', s: 'black', debut: '2026-11-08', note: 'Black helmet with gold jersey vs CLE' },
      ],
    };
  })(),

  (() => {
    const R = '#D50A0A', PEW = '#34302B', BK = '#0A0A08', OR = '#FF7900', CREAM = '#F58426';
    return {
      id: 'TB', city: 'Tampa Bay', name: 'Buccaneers', conf: 'NFC', div: 'South',
      colors: [R, PEW, OR], font: 'block',
      helmets: [
        { id: 'pewter', name: 'Pewter', tag: 'Primary', shell: PEW, finish: 'metallic', mask: BK, stripe: null, logo: { t: 'flag', fill: R, stroke: BK } },
        { id: 'creamsicle', name: 'Creamsicle White', tag: 'Throwback', shell: W, finish: 'gloss', mask: OR, stripe: sym([OR, 1], [R, 2.2]), logo: { t: 'text', s: 'B', fill: OR, stroke: R, font: 'serif' } },
      ],
      jerseys: [
        { id: 'red', name: 'Red', tag: 'Home', base: R, num: [W, PEW] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, PEW] },
        { id: 'pewter', name: 'Pewter', tag: 'Alternate', debut: '2026-12-20', base: PEW, num: [R, W] },
        { id: 'creamsicle', name: 'Creamsicle Orange', tag: 'Throwback', base: CREAM, num: [W, R], sleeve: { stripes: sym([R, 1.4], [W, 1.4]) } },
        { id: 'creamwhite', name: 'Creamsicle White', tag: 'Throwback', debut: '2026-12-06', base: W, num: [CREAM, R], sleeve: { stripes: sym([R, 1.4], [CREAM, 1.4]) } },
      ],
      pants: [
        { id: 'pewter', name: 'Pewter', base: PEW, stripe: sym([R, 1], [BK, 1.4]) },
        { id: 'white', name: 'White', base: W, stripe: sym([R, 1], [PEW, 1.4]) },
        { id: 'red', name: 'Red', base: R, stripe: sym([PEW, 1], [W, 1.4]) },
        { id: 'creamsicle', name: 'Creamsicle White', tag: 'Throwback', base: W, stripe: sym([OR, 1.2], [R, 2]) },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'pewter', name: 'Pewter', base: PEW },
        { id: 'white', name: 'White', base: W },
        { id: 'orange', name: 'Orange', base: CREAM, stripes: [[R, 2], [null, 1], [W, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'pewter', j: 'red', p: 'pewter', s: 'red', status: 'worn' },
        { name: 'Road', h: 'pewter', j: 'white', p: 'pewter', s: 'red', status: 'worn' },
        { name: 'Road All White', h: 'pewter', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Red', h: 'pewter', j: 'red', p: 'red', s: 'red', status: 'worn' },
        { name: 'Creamsicle', h: 'creamsicle', j: 'creamsicle', p: 'creamsicle', s: 'orange', status: 'worn', note: 'Sidelined for 2026' },
        { name: 'Creamsicle Road', h: 'creamsicle', j: 'creamwhite', p: 'creamsicle', s: 'orange', debut: '2026-12-06', note: 'At LAC' },
        { name: 'All Pewter', h: 'pewter', j: 'pewter', p: 'pewter', s: 'pewter', debut: '2026-12-20', note: 'vs NO' },
      ],
    };
  })(),

  // ───────────────────────────── NFC WEST ─────────────────────────────
  (() => {
    const R = '#97233F', BK = '#101010', SAND = '#E8DCC6', CLAY = '#B8643C';
    return {
      id: 'ARI', city: 'Arizona', name: 'Cardinals', conf: 'NFC', div: 'West',
      colors: [R, BK, W], font: 'modern',
      helmets: [
        { id: 'white', name: 'White', tag: 'Primary', shell: W, finish: 'gloss', mask: BK, stripe: null, logo: { t: 'text', s: 'A', fill: R, stroke: BK, font: 'italic', streak: '#FFB612' } },
        { id: 'black', name: 'Black', tag: 'Alternate', shell: BK, finish: 'gloss', mask: BK, stripe: null, logo: { t: 'text', s: 'A', fill: R, stroke: W, font: 'italic', streak: '#FFB612' } },
      ],
      jerseys: [
        { id: 'red', name: 'Cardinal Red', tag: 'Home', base: R, num: [W, BK] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [R, BK] },
        { id: 'black', name: 'Black', tag: 'Alternate', base: BK, num: [R, W] },
        { id: 'desert', name: 'Desert Rivalries', tag: 'Rivalries', base: SAND, num: [R, CLAY], pattern: { t: 'spots', c: CLAY } },
      ],
      pants: [
        { id: 'red', name: 'Red', base: R, stripe: sym([BK, 1], [W, 1]) },
        { id: 'white', name: 'White', base: W, stripe: sym([R, 1], [BK, 1]) },
        { id: 'black', name: 'Black', base: BK, stripe: sym([R, 1], [W, 1]) },
        { id: 'sand', name: 'Desert Sand', tag: 'Rivalries', base: SAND, stripe: sym([CLAY, 1.2], [R, 1.2]) },
      ],
      socks: [
        { id: 'red', name: 'Red', base: R },
        { id: 'white', name: 'White', base: W },
        { id: 'black', name: 'Black', base: BK },
        { id: 'sand', name: 'Sand', base: SAND, stripes: [[CLAY, 2]] },
      ],
      looks: [
        { name: 'All Red', h: 'white', j: 'red', p: 'red', s: 'red', status: 'worn' },
        { name: 'All White', h: 'white', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: 'All Black', h: 'black', j: 'black', p: 'black', s: 'black', status: 'worn', note: 'Oct 11 vs DET, Nov 29 vs WAS' },
        { name: 'Desert Rivalries', h: 'white', j: 'desert', p: 'sand', s: 'sand', status: 'worn', note: 'Sep 20 vs SEA' },
      ],
    };
  })(),

  (() => {
    const ROY = '#003594', SOL = '#FFA300', NAVY = '#0E1A33', BLUE60 = '#123B7A';
    return {
      id: 'LAR', city: 'Los Angeles', name: 'Rams', conf: 'NFC', div: 'West',
      colors: [ROY, SOL, W], font: 'modern',
      helmets: [
        { id: 'royal', name: 'Royal Horns', tag: 'Primary', shell: ROY, finish: 'gloss', mask: ROY, stripe: null, logo: { t: 'ramhorn', fill: SOL, stroke: SOL } },
        { id: 'fearsome', name: 'Fearsome White Horns', tag: 'New 2026', debut: '2026-11-25', shell: BLUE60, finish: 'gloss', mask: '#9EA2A2', stripe: null, logo: { t: 'ramhorn', fill: W, stroke: W } },
      ],
      jerseys: [
        { id: 'royal', name: 'Royal', tag: 'Home · Updated 2026', base: ROY, num: [SOL, W], loop: [[SOL, 4]], loopPattern: 'horn', sleeve: { cap: ROY } },
        { id: 'white', name: 'White', tag: 'Road · Updated 2026', base: W, num: [ROY, SOL], loop: [[SOL, 4]], loopPattern: 'horn', sleeve: { cap: ROY } },
        { id: 'sol', name: 'Classic Sol', tag: '75th Anniversary', base: W, num: [SOL, ROY], font: 'block', sleeve: { stripes: [[SOL, 1.4], [null, 1], [SOL, 1.4], [null, 1], [SOL, 1.4]] } },
        { id: 'fearsome', name: 'Fearsome White', tag: 'New 2026', debut: '2026-11-25', base: '#F6F8FA', num: [BLUE60], font: 'block', loop: [[BLUE60, 4]], loopPattern: 'horn' },
        { id: 'midnight', name: 'Midnight Mode', tag: 'Rivalries', base: NAVY, num: [W, SOL], sleeve: { cap: NAVY, stripes: [[SOL, 2.4]] } },
      ],
      pants: [
        { id: 'sol', name: 'Sol', base: SOL, stripe: sym([ROY, 1.2], [null, 0.6]) },
        { id: 'royal', name: 'Royal', base: ROY, stripe: sym([SOL, 1.2], [null, 0.6]) },
        { id: 'white', name: 'White', tag: 'New 2026', base: W, stripe: sym([SOL, 1.2], [ROY, 0.6]) },
        { id: 'fearsome', name: 'Fearsome White', debut: '2026-11-25', base: '#F6F8FA', stripe: sym([BLUE60, 1.6], [null, 0.8]) },
        { id: 'navy', name: 'Midnight Navy', tag: 'Rivalries', base: NAVY, stripe: [[SOL, 2.4]] },
      ],
      socks: [
        { id: 'royal', name: 'Royal', base: ROY },
        { id: 'sol', name: 'Sol', base: SOL },
        { id: 'white', name: 'White', base: W },
        { id: 'navy', name: 'Navy', base: NAVY },
      ],
      looks: [
        { name: 'Home', h: 'royal', j: 'royal', p: 'sol', s: 'royal', status: 'worn' },
        { name: 'All Royal', h: 'royal', j: 'royal', p: 'royal', s: 'royal', status: 'worn' },
        { name: 'Royal / White Pants', h: 'royal', j: 'royal', p: 'white', s: 'royal', status: 'worn' },
        { name: 'Road', h: 'royal', j: 'white', p: 'royal', s: 'royal', status: 'worn' },
        { name: 'Road Sol Pants', h: 'royal', j: 'white', p: 'sol', s: 'royal', status: 'worn' },
        { name: 'Classic Sol', h: 'royal', j: 'sol', p: 'sol', s: 'sol', status: 'worn', note: 'Sep 21 vs NYG, Dec 3 vs KC' },
        { name: 'Fearsome White', h: 'fearsome', j: 'fearsome', p: 'fearsome', s: 'white', debut: '2026-11-25', note: 'Thanksgiving Eve vs GB' },
        { name: 'Midnight Mode', h: 'royal', j: 'midnight', p: 'navy', s: 'navy', status: 'worn', note: 'Rivalries set; Christmas vs SEA' },
      ],
    };
  })(),

  (() => {
    const SC = '#AA0000', GOLD = '#B3995D', BK = '#0B0B0B', TBGOLD = '#C4A76A';
    return {
      id: 'SF', city: 'San Francisco', name: '49ers', conf: 'NFC', div: 'West',
      colors: [SC, GOLD, BK], font: 'block',
      helmets: [
        { id: 'gold', name: 'Metallic Gold', tag: 'Primary', shell: GOLD, finish: 'metallic', mask: SC, stripe: sym([BK, 0.6], [W, 0.8], [SC, 2]),
          logo: { t: 'text', s: 'SF', fill: W, stroke: W, font: 'block', bg: { shape: 'oval', fill: SC, stroke: W } } },
        { id: 'tb94', name: '1994 Gold', tag: 'Throwback', shell: TBGOLD, finish: 'gloss', mask: '#9EA2A2', stripe: sym([W, 0.8], [SC, 2.2]),
          logo: { t: 'text', s: 'SF', fill: W, stroke: W, font: 'block', bg: { shape: 'oval', fill: SC, stroke: BK } } },
      ],
      jerseys: [
        { id: 'scarlet', name: 'Scarlet', tag: 'Home', base: SC, num: [W, BK], sleeve: { stripes: sym([BK, 0.8], [W, 1.8]) } },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [SC, BK], sleeve: { stripes: sym([BK, 0.8], [SC, 1.8]) } },
        { id: 'tb94', name: '1994 Scarlet', tag: 'Throwback', base: SC, num: [W, BK], sleeve: { stripes: sym([W, 1.4], [BK, 1.4]) } },
        { id: 'tb94w', name: '1994 White', tag: 'Throwback · New', debut: '2026-12-17', base: W, num: [SC, BK], sleeve: { stripes: sym([SC, 1.4], [BK, 1.4]) } },
        { id: 'faithful', name: 'Faithful (All Black)', tag: 'Rivalries', base: BK, num: [BK, GOLD, SC], font: 'slab', word: { s: 'FAITHFUL', c: GOLD }, sleeve: { stripes: sym([SC, 1.2], [null, 0.8]) } },
      ],
      pants: [
        { id: 'gold', name: 'Gold', base: GOLD, stripe: sym([BK, 0.6], [W, 0.8], [SC, 2]) },
        { id: 'white', name: 'White', base: W, stripe: sym([SC, 1.4], [BK, 1]) },
        { id: 'tb94', name: '1994 Gold', tag: 'Throwback', base: TBGOLD, stripe: sym([SC, 1.4], [W, 1], [SC, 1.4]) },
        { id: 'black', name: 'Black', tag: 'Rivalries', base: BK, stripe: sym([SC, 1.2], [null, 0.8]) },
      ],
      socks: [
        { id: 'red', name: 'Scarlet', base: SC, stripes: [[W, 1.6], [BK, 1], [W, 1.6]] },
        { id: 'white', name: 'White', base: W, stripes: [[SC, 1.6], [BK, 1], [SC, 1.6]] },
        { id: 'black', name: 'Black', base: BK, stripes: [[SC, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'gold', j: 'scarlet', p: 'gold', s: 'red', status: 'worn' },
        { name: 'Road', h: 'gold', j: 'white', p: 'gold', s: 'red', status: 'worn' },
        { name: '1994 Home', h: 'tb94', j: 'tb94', p: 'tb94', s: 'red', status: 'worn', note: 'Nov 15 vs DAL, Jan 3 vs PHI' },
        { name: '1994 Road', h: 'tb94', j: 'tb94w', p: 'tb94', s: 'red', debut: '2026-12-17', note: 'First road version, at LAC' },
        { name: 'Faithful', h: 'gold', j: 'faithful', p: 'black', s: 'black', status: 'worn', note: 'Rivalries set; Dec 13 vs LAR' },
      ],
    };
  })(),

  (() => {
    const NAVY = '#002244', G = '#69BE28', WG = '#A5ACAF', ROY = '#1B4D9E', CHROME_G = '#3E8E2B';
    return {
      id: 'SEA', city: 'Seattle', name: 'Seahawks', conf: 'NFC', div: 'West',
      colors: [NAVY, G, WG], font: 'modern',
      helmets: [
        { id: 'navy', name: 'Navy', tag: 'Primary', shell: NAVY, finish: 'metallic', mask: NAVY, stripe: sym([WG, 0.6], [G, 0.8]),
          logo: { t: 'text', s: 'S', fill: WG, stroke: G, font: 'italic', streak: G } },
        { id: 'silver', name: '90s Silver', tag: 'Throwback', shell: '#B6BDC2', finish: 'gloss', mask: ROY, stripe: sym([ROY, 1.2], [W, 0.8], [G, 1.2]),
          logo: { t: 'text', s: 'S', fill: ROY, stroke: W, font: 'italic', streak: G } },
        { id: 'chrome', name: 'Chrome Green', tag: 'Rivalries', shell: CHROME_G, finish: 'chrome', mask: NAVY, stripe: null,
          logo: { t: 'text', s: 'S', fill: WG, stroke: NAVY, font: 'italic' } },
      ],
      jerseys: [
        { id: 'navy', name: 'College Navy', tag: 'Home', base: NAVY, num: [W, G, WG] },
        { id: 'white', name: 'White', tag: 'Road', base: W, num: [NAVY, G] },
        { id: 'royal', name: '90s Royal', tag: 'Throwback', base: ROY, num: [W, G], font: 'block', sleeve: { stripes: sym([W, 1.2], [G, 1.2]) } },
        { id: 'wolf', name: 'Wolf Grey Rivalries', tag: 'Rivalries', base: WG, num: [G, NAVY], loop: sym([G, 1], [null, 0.6], [NAVY, 0.8]) },
      ],
      pants: [
        { id: 'navy', name: 'Navy', base: NAVY, stripe: sym([WG, 0.8], [G, 1.2]) },
        { id: 'white', name: 'White', base: W, stripe: sym([NAVY, 0.8], [G, 1.2]) },
        { id: 'gray', name: 'Wolf Grey', base: WG, stripe: sym([G, 1.2], [NAVY, 0.8]) },
        { id: 'tb', name: '90s Silver', tag: 'Throwback', base: '#B6BDC2', stripe: sym([ROY, 1.2], [G, 1.2]) },
      ],
      socks: [
        { id: 'navy', name: 'Navy', base: NAVY },
        { id: 'white', name: 'White', base: W },
        { id: 'gray', name: 'Wolf Grey', base: WG },
        { id: 'royal', name: 'Royal', base: ROY, stripes: [[W, 2], [null, 1], [G, 2]] },
      ],
      looks: [
        { name: 'Home', h: 'navy', j: 'navy', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Home White Pants', h: 'navy', j: 'navy', p: 'white', s: 'navy', status: 'worn' },
        { name: 'Home Grey Pants', h: 'navy', j: 'navy', p: 'gray', s: 'navy', status: 'worn' },
        { name: 'Road', h: 'navy', j: 'white', p: 'navy', s: 'navy', status: 'worn' },
        { name: 'Road All White', h: 'navy', j: 'white', p: 'white', s: 'white', status: 'worn' },
        { name: '90s Throwback', h: 'silver', j: 'royal', p: 'tb', s: 'royal', status: 'worn', note: 'Oct 15 at DEN, Oct 25, Dec 7' },
        { name: 'Wolf Grey Rivalries', h: 'chrome', j: 'wolf', p: 'gray', s: 'gray', status: 'worn', note: 'Christmas vs LAR' },
      ],
    };
  })(),
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

export const DIVISIONS = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];
