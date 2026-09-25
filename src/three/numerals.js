// Jersey numerals drawn as geometry rather than set in a web font.
//
// NFL numbers are cut from tackle twill, not typed, and each team's set is a
// variation on a few shapes: the pro block (squared counters, softened
// corners), round block, chamfered block, condensed round, Futura-like rounds
// and slab-serif varsity. Every digit here is built from rounded (or
// chamfered) rectangles and polygons in a unit box — height 1, y up — so a
// style is just a set of proportions: width, stroke weights, how far the waist
// sits, corner radii, how the 1 and 4 are cut, slant, serifs and notches.
//
// Outlines are made the way twill layers are: the digit mask grown by the
// outline width (so corners follow the digit), stacked under the fill.

import { makeCanvas } from './paint.js';

// ─── styles ────────────────────────────────────────────────────────────
// W: digit width, th / tv: horizontal / vertical stroke, m: waist height,
// hook: terminal length on 2 3 5 6 9, ro / ri: outer / counter corner radius,
// rt: terminal corner radius, cut: 'round' | 'chamfer', slant (x per y),
// one: { flag, base }, four: 'closed' | 'open', seven: 'diag' | 'stem',
// notch: waist notches on 3 and 8, gap: spacing between digits.
const BASE = {
  W: 0.6, th: 0.165, tv: 0.19, m: 0.53, hook: 0.2, ro: 0.1, ri: 0.04, rt: 0.02, cut: 'round',
  slant: 0, one: { flag: 0.16, base: true }, four: 'closed', seven: 'diag', notch: 0.35, gap: 0.08, twoWaist: 0.44,
};

export const NUMERAL_STYLES = {
  // Pro block: Packers, Chiefs, Bills, Cowboys, Giants, Raiders, 49ers, Colts, Bucs, Browns
  block: {},
  // Softer pro block (Patriots, Lions, Colts' rounder cut)
  blockRound: { ro: 0.16, ri: 0.07, rt: 0.04 },
  // Squared, tight corners (Jaguars, Seahawks)
  square: { ro: 0.035, ri: 0.015, rt: 0.01, W: 0.62, one: { flag: 0.14, base: false }, seven: 'stem' },
  // Chamfered block (Jets, Falcons, Commanders)
  chamfer: { cut: 'chamfer', ro: 0.13, ri: 0.05, rt: 0.03, one: { flag: 0.16, base: false } },
  // Chiefs: squared block with clipped corners and a footed 1
  chiefs: { cut: 'chamfer', ro: 0.09, ri: 0.035, rt: 0.02, one: { flag: 0.17, base: true } },
  // Cowboys road/Color Rush: square block with a footed 1
  cowboys: { ro: 0.05, ri: 0.02, rt: 0.01, W: 0.56, one: { flag: 0.17, base: true } },
  // Vikings: wide and heavy with square counters and a footed 1
  vikings: { W: 0.64, th: 0.2, tv: 0.25, ro: 0.1, ri: 0.02, rt: 0.02, notch: 0.4, one: { flag: 0.18, base: true } },
  // Rams 2020s: heavy rounded set with a slight lean
  rams: { W: 0.56, th: 0.2, tv: 0.23, ro: 0.22, ri: 0.1, rt: 0.06, slant: 0.07, one: { flag: 0.17, base: false } },
  // Titans 2026 (Oilers lineage): octagonal block, based 1
  titans: { cut: 'chamfer', ro: 0.12, ri: 0.05, rt: 0.02, one: { flag: 0.16, base: true } },
  // Round block: big round bowls, rounded terminals (Dolphins, Chargers, Bengals)
  round: { ro: 0.27, ri: 0.13, rt: 0.07, th: 0.2, tv: 0.21, one: { flag: 0.15, base: false } },
  // Bengals: tall, narrow, oval bowls
  bengals: { W: 0.52, th: 0.16, tv: 0.2, ro: 0.26, ri: 0.15, rt: 0.03, one: { flag: 0.16, base: false } },
  // Chargers: round block set italic
  chargers: { ro: 0.2, ri: 0.1, rt: 0.05, th: 0.19, tv: 0.21, one: { flag: 0.17, base: false }, slant: 0.17 },
  // Bears: condensed with round corners
  bears: { W: 0.5, th: 0.17, tv: 0.18, ro: 0.2, ri: 0.1, rt: 0.05, hook: 0.18, one: { flag: 0.13, base: false }, gap: 0.07 },
  // Steelers: Futura-like, fully round bowls
  futura: { W: 0.55, th: 0.19, tv: 0.21, ro: 0.275, ri: 0.18, rt: 0.1, one: { flag: 0.12, base: false }, four: 'open', notch: 0 },
  // Steelers: the same rounds, set italic and a touch narrower
  steelers: { W: 0.52, th: 0.19, tv: 0.21, ro: 0.26, ri: 0.17, rt: 0.1, one: { flag: 0.12, base: false }, four: 'open', notch: 0, slant: 0.16 },
  // Sharp, angular sets with notched waists (Vikings, Titans, Panthers, Broncos, Cardinals)
  angular: { cut: 'chamfer', ro: 0.17, ri: 0.03, rt: 0.02, notch: 0.6, one: { flag: 0.2, base: false }, slant: 0.04 },
  // Eagles: angular, slightly italic
  eagles: { cut: 'chamfer', ro: 0.1, ri: 0.03, rt: 0.02, slant: 0.03, one: { flag: 0.18, base: true } },
  // Ravens: tall, narrow, angular cuts
  ravens: { W: 0.5, th: 0.16, tv: 0.2, ro: 0.25, ri: 0.14, rt: 0.02, notch: 0, one: { flag: 0.16, base: false } },
  // Italic pro block (Chargers powder-blue era, Bucs throwback)
  italic: { slant: 0.2, ro: 0.1, ri: 0.04 },
};

export function numeralStyle(key) {
  const s = NUMERAL_STYLES[key];
  return s ? { ...BASE, ...s, one: { ...BASE.one, ...(s.one || {}) } } : null;
}

// ─── primitives (glyph units, y up) ────────────────────────────────────

function corner(g, cx, cy, r, a0, a1, kind) {
  if (r <= 0) { g.lineTo(cx, cy); return; }
  if (kind === 'chamfer') {
    g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
  }
}

// rounded / chamfered rectangle; radii [tl, tr, br, bl]
function rrect(x, y, w, h, radii, kind = 'round') {
  const [tl, tr, br, bl] = (Array.isArray(radii) ? radii : [radii, radii, radii, radii])
    .map((r) => Math.max(0, Math.min(r, w / 2, h / 2)));
  return (g) => {
    const x1 = x + w, y1 = y + h;
    if (kind === 'chamfer') {
      g.moveTo(x + bl, y);
      g.lineTo(x1 - br, y); g.lineTo(x1, y + br);
      g.lineTo(x1, y1 - tr); g.lineTo(x1 - tr, y1);
      g.lineTo(x + tl, y1); g.lineTo(x, y1 - tl);
      g.lineTo(x, y + bl); g.closePath();
      return;
    }
    g.moveTo(x + bl, y);
    g.lineTo(x1 - br, y); if (br) g.arc(x1 - br, y + br, br, -Math.PI / 2, 0);
    g.lineTo(x1, y1 - tr); if (tr) g.arc(x1 - tr, y1 - tr, tr, 0, Math.PI / 2);
    g.lineTo(x + tl, y1); if (tl) g.arc(x + tl, y1 - tl, tl, Math.PI / 2, Math.PI);
    g.lineTo(x, y + bl); if (bl) g.arc(x + bl, y + bl, bl, Math.PI, Math.PI * 1.5);
    g.closePath();
  };
}
const rect = (x, y, w, h) => rrect(x, y, w, h, 0);
const poly = (pts) => (g) => { pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };

// ─── digits ────────────────────────────────────────────────────────────
// Each digit is a list of [+/-, shape] operations applied in order, plus its
// advance width.

function digit(d, S) {
  const { W, th, tv, m, ro, ri, rt, cut: k } = S;
  // terminals never close more than half of the counter they sit on
  const cu = 1 - th - m - th / 2, cl = m - th / 2 - th;
  const hook = Math.min(S.hook, cu * 0.5), hookL = Math.min(S.hook, cl * 0.5);
  const R = (x, y, w, h, r) => rrect(x, y, w, h, r, k);
  const ops = [];
  const add = (s) => ops.push(['+', s]);
  const sub = (s) => ops.push(['-', s]);
  const e = 0.02; // overshoot so erasers cut cleanly through edges
  const notch = S.notch * tv;
  let width = W;
  switch (d) {
    case '0':
      add(R(0, 0, W, 1, ro));
      sub(R(tv, th, W - 2 * tv, 1 - 2 * th, ri));
      break;
    case '1': {
      const { flag, base } = S.one;
      const bw = base ? tv + 0.2 : 0;
      const xc = Math.max(flag + tv / 2, bw / 2);
      width = Math.max(xc + tv / 2, xc + bw / 2);
      add(R(xc - tv / 2, 0, tv, 1, [0, rt, base ? 0 : rt, base ? 0 : rt]));
      if (flag) add(poly([[xc - tv / 2 + 0.01, 1], [xc - tv / 2 - flag, 1 - flag * 0.85], [xc - tv / 2 - flag, 1 - flag * 0.85 - th * 0.8], [xc - tv / 2 + 0.01, 1 - th * 1.25]]));
      if (base) add(R(xc - bw / 2, 0, bw, th * 0.85, [rt, rt, rt, rt]));
      break;
    }
    case '2': {
      const w0 = S.twoWaist;
      add(R(0, w0, W, 1 - w0, [ro, ro, 0, 0]));
      sub(R(tv, w0 - e, W - 2 * tv, 1 - th - w0 + e, [ri, ri, 0, 0]));
      sub(rect(-e, w0 - e, tv + 2 * e, 1 - th - Math.min(S.hook, (1 - th - w0) * 0.45) - w0 + e));
      add(poly([[W - tv, w0 + 0.05], [W, w0 + 0.05], [W, w0 - 0.02], [tv * 1.35, th - 0.005], [0, th - 0.005], [0, th + 0.06]]));
      add(R(0, 0, W, th, [0, 0, rt, rt]));
      break;
    }
    case '3':
      add(R(0, 0, W, 1, ro));
      sub(R(tv, m + th / 2, W - 2 * tv, 1 - th - m - th / 2, ri));
      sub(R(tv, th, W - 2 * tv, m - th / 2 - th, ri));
      sub(rect(-e, m + th / 2, tv + ri + e, 1 - th - hook - m - th / 2));
      sub(rect(-e, th + hookL, tv + ri + e, m - th / 2 - th - hookL));
      sub(rect(-e, m - th / 2 - e, W * 0.3 + e, th + 2 * e));
      if (notch) sub(poly([[W + e, m + notch], [W - notch, m], [W + e, m - notch]]));
      break;
    case '4': {
      const sx = W - tv - W * 0.1, cb = 0.25;
      add(R(sx, 0, tv, 1, [rt, rt, rt, rt]));
      add(R(0, cb, W, th, [0, rt, rt, rt]));
      if (S.four === 'open') add(R(0, cb, tv, 1 - cb, [rt, rt, 0, 0]));
      else add(poly([[sx, 1], [sx + tv, 1], [tv * 1.3, cb + th - 0.005], [0, cb + th - 0.005], [0, cb + th + 0.04]]));
      break;
    }
    case '5':
      add(R(0, 1 - th, W, th, [rt, rt * 2, rt, 0]));
      add(rect(0, m - th / 2, tv, 1 - m + th / 2));
      add(R(0, 0, W, m + th / 2, [0, ro, ro, ro]));
      sub(R(-e, th, W - tv + e, m - th / 2 - th, [0, ri, ri, 0]));
      add(R(0, th - 0.005, tv, hookL, [rt, rt, 0, 0]));
      break;
    case '6':
    case '9':
      add(R(0, 0, W, 1, ro));
      sub(R(tv, m + th / 2, W - tv + e, 1 - th - m - th / 2, [ri, 0, 0, ri]));
      add(R(W - tv, 1 - th - hook, tv, hook + 0.01, [0, 0, rt, rt]));
      sub(R(tv, th, W - 2 * tv, m - th / 2 - th, ri));
      break;
    case '7':
      add(R(0, 1 - th, W, th, [rt, rt, 0, rt]));
      if (S.seven === 'stem') add(poly([[W - tv, 1 - th], [W, 1 - th], [W * 0.62 + tv, 0], [W * 0.62, 0]]));
      else add(poly([[W - tv * 1.1, 1 - th + 0.005], [W, 1 - th + 0.005], [W, 1 - th - 0.05], [W * 0.34 + tv * 1.12, 0], [W * 0.34, 0]]));
      break;
    case '8':
      add(R(0, 0, W, 1, ro));
      sub(R(tv, m + th / 2, W - 2 * tv, 1 - th - m - th / 2, ri));
      sub(R(tv, th, W - 2 * tv, m - th / 2 - th, ri));
      if (notch) {
        sub(poly([[-e, m + notch], [notch, m], [-e, m - notch]]));
        sub(poly([[W + e, m + notch], [W - notch, m], [W + e, m - notch]]));
      }
      break;
    default:
      return null;
  }
  return { ops, width, rotate: d === '9' };
}

// ─── rendering ─────────────────────────────────────────────────────────

function drawDigitMask(ctx, D, S, x0, baseY, px) {
  ctx.save();
  ctx.translate(x0, baseY);
  ctx.scale(px, -px);
  if (S.slant) ctx.transform(1, 0, S.slant, 1, 0, 0);
  if (D.rotate) { ctx.translate(D.width, 1); ctx.scale(-1, -1); }
  for (const [op, shape] of D.ops) {
    ctx.globalCompositeOperation = op === '+' ? 'source-over' : 'destination-out';
    ctx.beginPath();
    shape(ctx);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

// grow an alpha mask by r pixels (round kernel)
function dilate(src, r) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  if (r <= 0) return c;
  const rings = Math.max(1, Math.ceil(r / 6));
  for (let k = 1; k <= rings; k++) {
    const rr = (r * k) / rings;
    const n = Math.max(12, Math.ceil(rr * 1.6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.drawImage(src, Math.cos(a) * rr, Math.sin(a) * rr);
    }
  }
  return c;
}

function tint(mask, color) {
  const c = makeCanvas(mask.width, mask.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * Renders a number in a numeral style.
 * colors: [fill, outline, outer outline]; o1/o2: outline widths as a fraction
 * of the digit height; shadow: { color, dx, dy } (fractions of height).
 * Returns { canvas, aspect, inkHeight } like letteringCanvas.
 */
// Textures printed into the face of the numbers on some sets
export function numeralPattern(p) {
  if (!p) return null;
  return (ctx, W, H, px) => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = p.c;
    if (p.t === 'dots') {
      // perforated / dotted face (Patriots Nor'easter, Rams)
      const step = px * (p.step || 0.035), r = step * (p.r || 0.22);
      for (let y = step / 2; y < H; y += step) for (let x = ((y / step) % 2) * step / 2; x < W; x += step) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.t === 'feathers') {
      // rows of small feather chevrons (Seahawks)
      const step = px * (p.step || 0.07);
      ctx.strokeStyle = p.c; ctx.lineWidth = step * 0.18;
      for (let y = 0, r = 0; y < H + step; y += step * 0.55, r++) {
        for (let x = (r % 2) * step / 2; x < W + step; x += step) {
          ctx.beginPath();
          ctx.moveTo(x - step * 0.3, y - step * 0.18); ctx.lineTo(x, y + step * 0.1); ctx.lineTo(x + step * 0.3, y - step * 0.18);
          ctx.stroke();
        }
      }
    } else if (p.t === 'lines') {
      const step = px * (p.step || 0.05);
      for (let y = 0; y < H; y += step) ctx.fillRect(0, y, W, step * (p.w || 0.35));
    } else if (p.t === 'spots') {
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 260; i++) {
        const x = rnd() * W, y = rnd() * H, r = px * (0.012 + rnd() * 0.03);
        ctx.globalAlpha = 0.5 + rnd() * 0.5;
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.t === 'gradient') {
      const g = ctx.createLinearGradient(0, H * 0.2, 0, H * 0.8);
      g.addColorStop(0, p.c + '00'); g.addColorStop(1, p.c);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  };
}

export function numeralCanvas(text, colors, styleKey, { o1 = 0.05, o2 = 0.045, shadow = null, fillPattern = null, px = 300 } = {}) {
  const S = numeralStyle(styleKey) || numeralStyle('block');
  const digits = [...String(text)].map((ch) => digit(ch, S)).filter(Boolean);
  if (!digits.length) return null;
  const [fill, c1, c2] = colors;
  const w1 = c1 ? o1 * px : 0, w2 = c2 ? o2 * px : 0;
  const sh = shadow ? { dx: shadow.dx * px, dy: shadow.dy * px } : { dx: 0, dy: 0 };
  const pad = Math.ceil(w1 + w2 + Math.abs(sh.dx) + Math.abs(sh.dy) + px * 0.06);
  const adv = digits.reduce((a, D) => a + D.width, 0) + S.gap * (digits.length - 1);
  const slantPad = Math.abs(S.slant) * px;
  const W = Math.ceil(adv * px + slantPad + pad * 2), H = Math.ceil(px + pad * 2);

  const mask = makeCanvas(W, H);
  const mctx = mask.getContext('2d');
  mctx.fillStyle = '#000';
  let x = pad + (S.slant < 0 ? slantPad : 0);
  const one = makeCanvas(W, H);
  const octx = one.getContext('2d');
  octx.fillStyle = '#000';
  for (const D of digits) {
    // each digit on its own layer so one digit's erasers can't bite a neighbour
    octx.clearRect(0, 0, W, H);
    drawDigitMask(octx, D, S, x, pad + px, px);
    mctx.drawImage(one, 0, 0);
    x += (D.width + S.gap) * px;
  }

  const out = makeCanvas(W, H);
  const ctx = out.getContext('2d');
  const outer = w2 ? dilate(mask, w1 + w2) : w1 ? dilate(mask, w1) : mask;
  if (shadow) ctx.drawImage(tint(outer, shadow.color), sh.dx, sh.dy);
  if (w2) ctx.drawImage(tint(outer, c2), 0, 0);
  if (w1) ctx.drawImage(tint(dilate(mask, w1), c1), 0, 0);
  const face = tint(mask, fill);
  if (fillPattern) fillPattern(face.getContext('2d'), W, H, px);
  ctx.drawImage(face, 0, 0);
  return { canvas: out, aspect: W / H, inkHeight: px / H };
}
