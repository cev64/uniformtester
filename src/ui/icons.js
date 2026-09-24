// Small SVG swatches for the option cards, drawn from the same data as the 3D model.

let uid = 0;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EDGE = 'rgba(0,0,0,0.35)';

function stripeStroke(d, stripes, base, scale = 0.55) {
  if (!stripes?.length) return '';
  let width = stripes.reduce((a, [, w]) => a + w, 0);
  let out = '';
  for (let k = 0; k < Math.ceil(stripes.length / 2); k++) {
    out += `<path d="${d}" fill="none" stroke="${stripes[k][0] ?? base}" stroke-width="${(width * scale).toFixed(2)}"/>`;
    width -= 2 * stripes[k][1];
    if (width <= 0) break;
  }
  return out;
}

export function helmetIcon(h) {
  const id = `hc${uid++}`;
  const shell = 'M9 33 C7 15 21 5 36 5 C50 5 58 15 58 27 L57 31 L47 31 L45 38 L35 39 L31 45 L17 45 C12 42 9 38 9 33 Z';
  const logo = h.logo || {};
  const logoFill = logo.img ? null : (logo.bg?.fill || logo.fill || null);
  const logoImg = logo.img
    ? `<image href="./public/logos/${logo.img}.png" x="17" y="14" width="24" height="22" preserveAspectRatio="xMidYMid meet"${logo.faces === 'right' ? ' transform="translate(58 0) scale(-1 1)"' : ''}/>`
    : '';
  const stripe = h.stripe ? stripeStroke('M12 24 C13 11 27 5.5 37 5.8 C48 6.2 56 13 57.5 22', h.stripe, h.shell, 0.9) : '';
  const tri = h.pattern?.t === 'triangles'
    ? [14, 20, 26, 32].map((x) => `<path d="M${x} ${9 - x * 0.1} l4 1 l-4 2 z" fill="${h.pattern.c}"/>`).join('')
    : '';
  const tiger = h.pattern?.t === 'tiger'
    ? [18, 26, 34, 42, 50].map((x, i) => `<path d="M${x} 6 Q${x - 4} 16 ${x - 8 + i} ${22 + (i % 2) * 4} L${x - 3} 6 Z" fill="${h.pattern.c}"/>`).join('')
    : '';
  const mask = h.mask ? `<path d="M50 20 L62 22 L61 38 L47 39 M50 29 L62 30 M55 21 L54 39" fill="none" stroke="${h.mask}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  return `<svg viewBox="0 0 64 48" aria-hidden="true"><defs><clipPath id="${id}"><path d="${shell}"/></clipPath></defs>
    <path d="${shell}" fill="${h.shell}" stroke="${EDGE}" stroke-width="1"/>
    <g clip-path="url(#${id})">${stripe}${tiger}${tri}</g>
    ${logoImg}
    ${logoFill ? `<ellipse cx="28" cy="26" rx="7" ry="6" fill="${logoFill}" stroke="${logo.stroke || EDGE}" stroke-width="1.2"/>` : ''}
    ${mask}</svg>`;
}

export function jerseyIcon(j, team, number = '12') {
  const id = `jc${uid++}`;
  const body = 'M18 7 L26 4 C28 9 36 9 38 4 L46 7 L60 17 L54 28 L47 23 L47 58 L17 58 L17 23 L10 28 L4 17 Z';
  const cap = j.sleeve?.cap || j.base;
  const sleeves = cap !== j.base
    ? `<path d="M18 7 L4 17 L10 28 L17 23 Z M46 7 L60 17 L54 28 L47 23 Z" fill="${cap}"/>` : '';
  const st = j.sleeve?.stripes
    ? stripeStroke('M5.5 21 L11.5 16.5', j.sleeve.stripes, cap, 0.7) + stripeStroke('M52.5 16.5 L58.5 21', j.sleeve.stripes, cap, 0.7)
    : '';
  const loop = j.loop ? stripeStroke('M17 22 C17 10 24 7 26 5 M47 22 C47 10 40 7 38 5', j.loop, j.base, 0.6) : '';
  const [f, o1, o2] = j.num;
  const font = { modern: 'Big Shoulders Display', varsity: 'Graduate', slab: 'Alfa Slab One', block: 'Oswald', italic: 'Oswald' }[j.font || team.font] || 'Oswald';
  const weight = (j.font || team.font) === 'modern' ? 900 : 700;
  const outline = o2 ? `stroke="${o2}" stroke-width="3.2"` : o1 ? `stroke="${o1}" stroke-width="2"` : '';
  const spots = j.pattern?.t === 'spots'
    ? Array.from({ length: 16 }, (_, i) => `<circle cx="${10 + ((i * 37) % 44)}" cy="${10 + ((i * 23) % 46)}" r="1.4" fill="${j.pattern.c}" opacity="0.5"/>`).join('')
    : '';
  return `<svg viewBox="0 0 64 62" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${j.base}" stroke="${EDGE}" stroke-width="1"/>
    <g clip-path="url(#${id})">${sleeves}${spots}${st}${loop}</g>
    <path d="M26 4 C28 9 36 9 38 4" fill="none" stroke="${(Array.isArray(j.collar) ? j.collar[0][0] : j.collar) || EDGE}" stroke-width="2"/>
    <text x="32" y="47" text-anchor="middle" font-family="${font}, Impact, sans-serif" font-weight="${weight}" font-size="22" fill="${f}" ${outline} paint-order="stroke" stroke-linejoin="round">${esc(number)}</text>
    </svg>`;
}

export function pantsIcon(p) {
  const id = `pc${uid++}`;
  const body = 'M14 4 L50 4 L55 56 L38 58 L32 22 L26 58 L9 56 Z';
  const sc = p.stripe || (p.pattern ? [[p.pattern.c, 3]] : null);
  const stripes = sc ? stripeStroke('M13.4 4 L8.8 56', sc, p.base, 0.8) + stripeStroke('M50.6 4 L55.2 56', sc, p.base, 0.8) : '';
  return `<svg viewBox="0 0 64 62" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${p.base}" stroke="${EDGE}" stroke-width="1"/>
    <g clip-path="url(#${id})">${stripes}<rect x="14" y="4" width="36" height="3" fill="rgba(0,0,0,0.22)"/></g></svg>`;
}

export function socksIcon(s) {
  const id = `sc${uid++}`;
  const body = 'M22 3 L40 3 L40 40 L53 47 C59 50 58 60 50 60 L27 60 C21 60 20 55 22 50 Z';
  let y = 10;
  const bands = (s.stripes || []).map(([c, w]) => {
    const h = w * 1.3;
    const r = c ? `<rect x="0" y="${y.toFixed(1)}" width="64" height="${h.toFixed(1)}" fill="${c}"/>` : '';
    y += h;
    return r;
  }).join('');
  return `<svg viewBox="0 0 64 62" aria-hidden="true"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${s.base}" stroke="${EDGE}" stroke-width="1"/>
    <g clip-path="url(#${id})">${bands}</g></svg>`;
}
