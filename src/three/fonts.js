// Lettering fonts (Google Fonts, linked in index.html).
//
// NFL lettering is custom-drawn per team; these are the closest free faces.
// Each entry: family, weight, and optional skew (italic shear), scaleX
// (condense / extend the face to match the real proportions) and tracking
// (extra letter spacing, fraction of the font size, added to the caller's).
export const NUMBER_FONTS = {
  block: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 700 },
  modern: { family: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', weight: 900 },
  varsity: { family: '"Graduate", "Rockwell", Georgia, serif', weight: 400 },
  slab: { family: '"Alfa Slab One", "Rockwell", Georgia, serif', weight: 400 },
  script: { family: '"Yellowtail", "Brush Script MT", cursive', weight: 400 },
  serif: { family: '"Alfa Slab One", "Rockwell", Georgia, serif', weight: 400 },
  italic: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 700, skew: -0.22 },
  // Standard NFL nameplate block: squared, even strokes, moderately wide
  // (Packers, Chiefs, Bills, Giants, Raiders ... ).
  plate: { family: '"Saira Semi Condensed", "Arial Narrow", Impact, sans-serif', weight: 700 },
  squareSans: { family: '"Saira Condensed", "Arial Narrow", Impact, sans-serif', weight: 700 },
  roundSans: { family: '"Barlow Condensed", "Arial Narrow", Impact, sans-serif', weight: 700 },
  geometric: { family: '"Jost", "Futura", "Century Gothic", sans-serif', weight: 700 },
  condensed: { family: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', weight: 800 },
  serifNum: { family: '"Abril Fatface", "Bodoni 72", Didot, Georgia, serif', weight: 400 },
  western: { family: '"Rye", "Rosewood Std", Georgia, serif', weight: 400 },
  roman: { family: '"Cinzel", "Trajan Pro", Georgia, serif', weight: 800 },
  // ─── nameplate / wordmark faces ───
  // classic heavy athletic block, wide (Bears, Browns, Colts style plates)
  heavyBlock: { family: '"Saira Semi Condensed", "Arial Narrow", Impact, sans-serif', weight: 800, scaleX: 1.06 },
  // Futura Condensed style (Steelers, Bengals' and Dolphins' geometric plates)
  futuraCond: { family: '"Jost", "Futura", "Century Gothic", sans-serif', weight: 800, scaleX: 0.68 },
  // sharp, condensed angular sets (Broncos, Seahawks, Titans, Jaguars)
  angular: { family: '"Teko", "Arial Narrow", Impact, sans-serif', weight: 600, scaleX: 1.08 },
  // squared techno block (Texans, Vikings, Falcons)
  squareBlock: { family: '"Russo One", "Arial Black", Impact, sans-serif', weight: 400, scaleX: 0.86 },
  // tall heavy condensed (Buccaneers, Raiders wordmarks, Chargers plates)
  tall: { family: '"Anton", "Impact", sans-serif', weight: 400 },
  // collegiate slab-serif (Cowboys/49ers wordmarks, throwback plates)
  collegeSlab: { family: '"Graduate", "Rockwell", Georgia, serif', weight: 400, scaleX: 0.92 },
  // clarendon-like serif (Saints, Browns throwbacks)
  clarendon: { family: '"Bree Serif", "Clarendon", Georgia, serif', weight: 700 },
  // rounded condensed (Bears, Rams, Dolphins plates)
  roundBlock: { family: '"Barlow Condensed", "Arial Narrow", Impact, sans-serif', weight: 800, scaleX: 1.04 },
  // AFC East + AFC North fonts
  // Dolphins nameplate: wide, slanted geometric sans (matches the MIAMI collar wordmark)
  dolphinsPlate: { family: '"Jost", "Futura", "Century Gothic", sans-serif', weight: 700, skew: -0.2, scaleX: 1.12 },

  // AFC South + AFC West fonts
  // blackletter H (Texans H-Town helmet)
  blackletter: { family: '"UnifrakturCook", "Old English Text MT", Georgia, serif', weight: 700 },

  // NFC East + NFC North fonts

  // NFC South + NFC West fonts
  // Falcons 2026 nameplate: tall, narrow, squared-off block (club type specimen)
  falconsPlate: { family: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', weight: 800, scaleX: 0.96 },

};

// Letters that go with each numeral style (nameplates, TV-number fallbacks)
const LETTERS = {
  block: 'plate', blockRound: 'plate', square: 'squareSans', chamfer: 'squareSans', titans: 'angular', chiefs: 'plate', cowboys: 'plate', vikings: 'squareBlock', rams: 'roundBlock', chargers: 'italic', angular: 'angular',
  round: 'roundBlock', bengals: 'roundSans', bears: 'roundBlock', futura: 'futuraCond', steelers: 'futuraCond', eagles: 'squareSans', ravens: 'plate', italic: 'italic',
  // AFC East + AFC North team styles
  jets: 'squareBlock', gotham: 'roundBlock',
  dolphins: 'dolphinsPlate',
  patriots: 'plate', browns: 'squareSans',

  // AFC South + AFC West team styles
  colts: 'plate', jaguars: 'squareSans', broncos: 'angular', raiders: 'plate', titansNeon: 'angular', texans: 'squareBlock', texansRiv: 'squareBlock',

  // NFC East + NFC North team styles
  giants: 'plate', commanders: 'plate', packers: 'plate', lions: 'plate',

  // NFC South + NFC West team styles
  falcons: 'falconsPlate',
  saints: 'plate',
  bucs: 'plate',
  panthers: 'plate', cardinals: 'roundBlock', niners: 'plate', seahawks: 'plate',

};
export function letterFont(style) {
  return LETTERS[style] || (NUMBER_FONTS[style] ? style : 'plate');
}

export function fontCss(key, px) {
  const f = NUMBER_FONTS[key] || NUMBER_FONTS.block;
  return `${f.weight} ${px}px ${f.family}`;
}

let ready = null;
export function fontsReady() {
  if (ready) return ready;
  if (typeof document === 'undefined' || !document.fonts) return (ready = Promise.resolve());
  const loads = Object.values(NUMBER_FONTS).map((f) =>
    document.fonts.load(`${f.weight} 64px ${f.family}`).catch(() => null));
  // Never block rendering for more than a couple of seconds on slow networks.
  ready = Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 2500))]);
  return ready;
}
