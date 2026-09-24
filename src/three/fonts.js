// Number fonts, loaded from Google Fonts in index.html.
export const NUMBER_FONTS = {
  block: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 700 },
  modern: { family: '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif', weight: 900 },
  varsity: { family: '"Graduate", "Rockwell", Georgia, serif', weight: 400 },
  slab: { family: '"Alfa Slab One", "Rockwell", Georgia, serif', weight: 400 },
  script: { family: '"Yellowtail", "Brush Script MT", cursive', weight: 400 },
  serif: { family: '"Alfa Slab One", "Rockwell", Georgia, serif', weight: 400 },
  italic: { family: '"Oswald", "Arial Narrow", Impact, sans-serif', weight: 700, skew: -0.22 },
};

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
