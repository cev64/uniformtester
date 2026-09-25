// Number fonts, loaded from Google Fonts in index.html.
export const NUMBER_FONTS = {
  block: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 700 },
  modern: { family: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', weight: 900 },
  varsity: { family: '"Graduate", "Rockwell", Georgia, serif', weight: 400 },
  slab: { family: '"Alfa Slab One", "Rockwell", Georgia, serif', weight: 400 },
  script: { family: '"Yellowtail", "Brush Script MT", cursive', weight: 400 },
  serif: { family: '"Alfa Slab One", "Rockwell", Georgia, serif', weight: 400 },
  italic: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 700, skew: -0.22 },
  // nameplate lettering to go with the numeral styles in numerals.js
  plate: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 600 },
  squareSans: { family: '"Saira Condensed", "Arial Narrow", Impact, sans-serif', weight: 700 },
  roundSans: { family: '"Barlow Condensed", "Arial Narrow", Impact, sans-serif', weight: 700 },
  geometric: { family: '"Jost", "Futura", "Century Gothic", sans-serif', weight: 700 },
  condensed: { family: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', weight: 800 },
  serifNum: { family: '"Abril Fatface", "Bodoni 72", Didot, Georgia, serif', weight: 400 },
  western: { family: '"Rye", "Rosewood Std", Georgia, serif', weight: 400 },
  roman: { family: '"Cinzel", "Trajan Pro", Georgia, serif', weight: 800 },
};

// Letters that go with each numeral style (nameplates, TV-number fallbacks)
const LETTERS = {
  block: 'plate', blockRound: 'plate', square: 'squareSans', chamfer: 'squareSans', titans: 'plate', chiefs: 'plate', cowboys: 'slab', vikings: 'squareSans', rams: 'roundSans', chargers: 'italic', angular: 'squareSans',
  round: 'roundSans', bengals: 'roundSans', bears: 'condensed', futura: 'geometric', steelers: 'geometric', eagles: 'squareSans', ravens: 'plate', italic: 'italic',
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
