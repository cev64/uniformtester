// Canvas painters for every uniform surface.
//
// Each painter works in real-world units: the tube metadata tells it how many
// canvas pixels make up a centimetre around and along the garment, so a 2 cm
// stripe or a 20 cm number comes out the right size on the 3D model.

import { fontCss, NUMBER_FONTS } from './fonts.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Deterministic RNG so patterns don't shimmer between repaints
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const stripeTotal = (stripes) => (stripes || []).reduce((a, [, w]) => a + w, 0);

// Nested strokes: widest band first, each inner band narrower.
// Works for symmetric stripe lists, which is how every stripe set is stored.
export function strokeStripes(ctx, path, stripes, pxPerCm, base, cap = 'butt', join = 'round') {
  if (!stripes?.length) return;
  const n = stripes.length;
  let width = stripeTotal(stripes);
  ctx.save();
  ctx.lineCap = cap; ctx.lineJoin = join;
  for (let k = 0; k < Math.ceil(n / 2); k++) {
    ctx.beginPath(); path(ctx);
    ctx.strokeStyle = stripes[k][0] ?? base;
    ctx.lineWidth = width * pxPerCm;
    ctx.stroke();
    width -= 2 * stripes[k][1];
    if (width <= 0) break;
  }
  ctx.restore();
}

// Horizontal bands stacked from a start row. dir = -1 paints upward.
export function bandsH(ctx, stripes, y, pxPerCm, x0, x1, dir) {
  let cur = y;
  for (const [c, w] of stripes || []) {
    const h = w * pxPerCm;
    if (c) {
      ctx.fillStyle = c;
      if (dir < 0) ctx.fillRect(x0, cur - h, x1 - x0, h);
      else ctx.fillRect(x0, cur, x1 - x0, h);
    }
    cur += dir * h;
  }
  return cur;
}

// Draw something twice when it straddles the u seam
export function wrapped(W, fn) { fn(0); fn(W); fn(-W); }

// ─── numbers & lettering ───────────────────────────────────────────────

const measureCache = new Map();
function glyphMetrics(ctx, fontKey, text) {
  const key = fontKey + '|' + text;
  if (measureCache.has(key)) return measureCache.get(key);
  ctx.save();
  ctx.font = fontCss(fontKey, 100);
  const m = ctx.measureText(text);
  ctx.restore();
  const r = { h: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || 72, asc: m.actualBoundingBoxAscent || 72, desc: m.actualBoundingBoxDescent || 0 };
  // Don't cache fallback metrics taken before the web font arrived
  if (document.fonts?.check?.(fontCss(fontKey, 100))) measureCache.set(key, r);
  return r;
}

/**
 * Draws outlined text whose cap height is `heightPx`, centred at (cx, cy).
 * sx squashes horizontally to undo the texture's aspect ratio.
 * colors: [fill, outline1?, outline2?]; outlines in px.
 */
export function drawLettering(ctx, text, cx, cy, heightPx, sx, colors, fontKey, o1px = 0, o2px = 0, tracking = 0, skew = null) {
  if (!text) return;
  const f = NUMBER_FONTS[fontKey] || NUMBER_FONTS.block;
  const m = glyphMetrics(ctx, fontKey, text);
  const px = (100 * heightPx) / m.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, 1);
  const k = skew ?? f.skew;
  if (k) ctx.transform(1, 0, k, 1, 0, 0);
  ctx.font = fontCss(fontKey, px);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${tracking * px}px`;
  const by = ((m.asc - m.desc) / 2) * (px / 100);
  ctx.lineJoin = 'round';
  const [fill, c1, c2] = colors;
  if (c2) { ctx.strokeStyle = c2; ctx.lineWidth = 2 * (o1px + o2px); ctx.strokeText(text, 0, by); }
  if (c1) { ctx.strokeStyle = c1; ctx.lineWidth = 2 * o1px; ctx.strokeText(text, 0, by); }
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, by);
  ctx.restore();
}

// ─── patterns ──────────────────────────────────────────────────────────

// A tapered, slightly curved claw-like stripe
export function wedge(ctx, x, y, len, width, angle, bend) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const nx = -dy, ny = dx;
  const tipX = x + dx * len + nx * bend, tipY = y + dy * len + ny * bend;
  const midX = x + dx * len * 0.5 + nx * bend * 0.6, midY = y + dy * len * 0.5 + ny * bend * 0.6;
  ctx.beginPath();
  ctx.moveTo(x + nx * width / 2, y + ny * width / 2);
  ctx.quadraticCurveTo(midX + nx * width * 0.35, midY + ny * width * 0.35, tipX, tipY);
  ctx.quadraticCurveTo(midX - nx * width * 0.35, midY - ny * width * 0.35, x - nx * width / 2, y - ny * width / 2);
  ctx.closePath();
  ctx.fill();
}

export function spots(ctx, W, H, color, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 900; i++) {
    ctx.globalAlpha = 0.1 + r() * 0.22;
    const x = r() * W, y = r() * H, s = 2 + r() * 7;
    ctx.beginPath();
    ctx.ellipse(x, y, s * (0.8 + r()), s, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Subtle fabric weave so flat colors don't read as plastic
export function grain(ctx, W, H, strength = 0.035, seed = 7) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < (W * H) / 900; i++) {
    ctx.globalAlpha = strength * r();
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(r() * W, r() * H, 2, 2);
  }
  ctx.restore();
}

// ─── helmet shell ──────────────────────────────────────────────────────
// Canvas x = around the head (0.25 back, 0.5 crown, 0.75 front)
// Canvas y = side to side (top row = right-hand +x side, middle = centre line)

export const HELMET_R = { x: 0.126, yz: 0.14 };

export function paintHelmet(helmet) {
  const W = 2048, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = helmet.shell;
  ctx.fillRect(0, 0, W, H);

  const pxPerCmX = W / (2 * Math.PI * HELMET_R.yz * 100);
  const pxPerCmY = H / (Math.PI * HELMET_R.x * 100);

  if (helmet.pattern?.t === 'triangles') {
    // Broncos: a line of small arrowheads running down the back of the crown
    ctx.fillStyle = helmet.pattern.c;
    const s = 1.5 * pxPerCmX;
    for (let u = 0.2; u < 0.5; u += 0.022) {
      const x = u * W, y = H / 2;
      ctx.beginPath();
      ctx.moveTo(x + s, y); ctx.lineTo(x - s * 0.6, y - s * 0.75); ctx.lineTo(x - s * 0.6, y + s * 0.75);
      ctx.fill();
    }
  }
  if (helmet.pattern?.t === 'halftone') {
    // dots that grow toward the back of the shell (Saints black alternate)
    ctx.fillStyle = helmet.pattern.c;
    const step = 1.1 * pxPerCmX;
    for (let x = 0.12 * W; x < 0.5 * W; x += step) {
      const k = 1 - (x - 0.12 * W) / (0.38 * W);           // 1 at the back, 0 at the crown
      const r = step * 0.42 * Math.max(0, k) ** 0.8;
      if (r < 0.6) continue;
      for (let y = step / 2 + ((x / step) % 2) * step / 2; y < H; y += step) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  if (helmet.pattern?.t === 'leather') {
    // 1920s leather: panel seams running front to back, with stitching
    ctx.strokeStyle = 'rgba(40,22,10,0.8)';
    ctx.lineWidth = 0.35 * pxPerCmY;
    for (const v of [0.2, 0.33, 0.44, 0.5, 0.56, 0.67, 0.8]) {
      ctx.beginPath(); ctx.moveTo(0.1 * W, v * H); ctx.lineTo(0.74 * W, v * H); ctx.stroke();
    }
    ctx.setLineDash([0.5 * pxPerCmX, 0.5 * pxPerCmX]);
    ctx.strokeStyle = 'rgba(230,200,160,0.55)';
    ctx.lineWidth = 0.15 * pxPerCmY;
    for (const v of [0.2, 0.33, 0.44, 0.56, 0.67, 0.8]) {
      ctx.beginPath(); ctx.moveTo(0.1 * W, v * H + 0.5 * pxPerCmY); ctx.lineTo(0.74 * W, v * H + 0.5 * pxPerCmY); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  if (helmet.finish === 'matte' && (helmet.id === 'leather' || helmet.pattern?.t === 'leather')) {
    const r = rng(4);
    ctx.save();
    for (let i = 0; i < 5000; i++) {
      ctx.globalAlpha = 0.05 + r() * 0.08;
      ctx.fillStyle = r() > 0.5 ? '#2b1a0c' : '#9a7650';
      ctx.fillRect(r() * W, r() * H, 3 + r() * 10, 2);
    }
    ctx.restore();
  }

  if (helmet.stripe) {
    const total = stripeTotal(helmet.stripe);
    let y = H / 2 - (total * pxPerCmY) / 2;
    // stripeSpan: [start, end] around the shell (0.25 back, 0.5 crown, 0.72 brow)
    const [s0, s1] = helmet.stripeSpan || [0.1, 0.725];
    const x0 = s0 * W, x1 = s1 * W;
    for (const [col, w] of helmet.stripe) {
      const h = w * pxPerCmY;
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x0, y, x1 - x0, h);
      }
      y += h;
    }
  }

  if (helmet.pattern?.t === 'tiger') {
    ctx.fillStyle = helmet.pattern.c;
    const xs = [0.2, 0.27, 0.34, 0.41, 0.475, 0.54, 0.6, 0.655, 0.7];
    xs.forEach((u, i) => {
      const x = u * W;
      const len = H * (0.34 + 0.08 * Math.sin(i * 1.7));
      const w = W * (0.03 + 0.007 * Math.cos(i * 1.3));
      // stripes sweep backward as they run down each side
      wedge(ctx, x, H / 2 - 4, len, w, -Math.PI / 2 - 0.35, -20);
      wedge(ctx, x, H / 2 + 4, len, w, Math.PI / 2 + 0.35, 20);
    });
  }
  return { canvas: c, pxPerCmX, pxPerCmY };
}

// ─── logos (decals) ────────────────────────────────────────────────────
// facing: which way the front of the helmet points in the decal image.
// Directional marks (horns, wings, bolts) are mirrored; lettering never is.

function starPath(g, cx, cy, R, r, points = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rad = i % 2 ? r : R;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

function fillStroke(ctx, path, fill, stroke, lw, stroke2, lw2) {
  ctx.lineJoin = 'round';
  if (stroke2) { ctx.beginPath(); path(ctx); ctx.strokeStyle = stroke2; ctx.lineWidth = lw + lw2 * 2; ctx.stroke(); }
  if (stroke) { ctx.beginPath(); path(ctx); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.beginPath(); path(ctx); ctx.fillStyle = fill; ctx.fill();
}

export function paintLogo(logo, facing, size = 512) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const S = size, cx = S / 2, cy = S / 2;
  const mirror = facing === 'left';
  const dirX = mirror ? -1 : 1; // +1 means front is to the right

  switch (logo.t) {
    case 'football': {
      // an American football with laces and lettering across it
      ctx.save();
      ctx.translate(cx, cy);
      const fb = (g) => { g.ellipse(0, 0, S * 0.46, S * 0.27, 0, 0, Math.PI * 2); };
      fillStroke(ctx, fb, logo.fill, logo.stroke || logo.text, S * 0.03);
      ctx.fillStyle = logo.text;
      for (const x of [-0.3, 0.3]) ctx.fillRect(x * S - S * 0.012, -S * 0.2, S * 0.024, S * 0.4);
      ctx.restore();
      drawLettering(ctx, logo.s, cx, cy, S * 0.2, 0.9, [logo.text], 'plate');
      break;
    }
    case 'azflag': {
      // Arizona state flag: 13 red and gold rays over blue, copper star
      const w = S * 0.9, h = w * 2 / 3, x0 = cx - w / 2, y0 = cy - h / 2;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
      ctx.fillStyle = '#002868'; ctx.fillRect(x0, y0 + h / 2, w, h / 2);
      for (let i = 0; i < 13; i++) {
        const a0 = Math.PI + (i / 13) * Math.PI, a1 = Math.PI + ((i + 1) / 13) * Math.PI;
        ctx.fillStyle = i % 2 ? '#FED700' : '#BF0A30';
        ctx.beginPath(); ctx.moveTo(cx, y0 + h / 2);
        ctx.lineTo(cx + Math.cos(a0) * w, y0 + h / 2 + Math.sin(a0) * w);
        ctx.lineTo(cx + Math.cos(a1) * w, y0 + h / 2 + Math.sin(a1) * w);
        ctx.fill();
      }
      ctx.fillStyle = '#CE5C17';
      ctx.beginPath(); starPath(ctx, cx, y0 + h / 2, h * 0.3, h * 0.12); ctx.fill();
      ctx.restore();
      break;
    }
    case 'mdshield': {
      // Ravens sleeve shield: Maryland flag quarters under a purple band
      ctx.save();
      ctx.translate(cx, cy);
      const shield = (g) => {
        g.moveTo(-0.34 * S, -0.42 * S); g.lineTo(0.34 * S, -0.42 * S); g.lineTo(0.34 * S, 0.02 * S);
        g.quadraticCurveTo(0.32 * S, 0.3 * S, 0, 0.46 * S); g.quadraticCurveTo(-0.32 * S, 0.3 * S, -0.34 * S, 0.02 * S); g.closePath();
      };
      fillStroke(ctx, shield, '#241773', '#FFFFFF', S * 0.05);
      ctx.save(); ctx.beginPath(); shield(ctx); ctx.clip();
      const cal = (x, y, w, h) => {
        // Calvert: gold and black vertical bars with a counterchanged diagonal
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#000' : '#FFC72C'; ctx.fillRect(x + (i * w) / 6, y, w / 6 + 1, h); }
        ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#FFC72C';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y); ctx.fill(); ctx.restore();
      };
      const cro = (x, y, w, h) => {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#C8102E'; ctx.fillRect(x, y + h * 0.4, w, h * 0.2); ctx.fillRect(x + w * 0.4, y, w * 0.2, h);
      };
      const top = -0.12 * S, q = 0.34 * S;
      cal(-q, top, q, 0.3 * S); cro(0, top, q, 0.3 * S); cro(-q, top + 0.3 * S, q, 0.3 * S); cal(0, top + 0.3 * S, q, 0.3 * S);
      ctx.restore();
      drawLettering(ctx, 'RAVENS', 0, -0.27 * S, S * 0.1, 1, ['#FFFFFF'], 'roman', 0, 0, 0.05);
      ctx.restore();
      break;
    }
    case 'star':
      fillStroke(ctx, (g) => starPath(g, cx, cy + S * 0.03, S * 0.44, S * 0.18), logo.fill, logo.stroke, S * 0.04, logo.stroke2, S * 0.02);
      break;
    case 'streak': {
      // Bills "Charge": a long red streak sweeping from the brow to the back
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dirX, 1);
      const path = (g) => {
        g.moveTo(0.5 * S, -0.1 * S);
        g.lineTo(-0.5 * S, -0.02 * S);
        g.lineTo(-0.5 * S, 0.1 * S);
        g.lineTo(0.5 * S, 0.06 * S);
        g.closePath();
      };
      fillStroke(ctx, path, logo.fill, logo.stroke, S * 0.03);
      ctx.restore();
      break;
    }
    case 'bolt': {
      const pts = logo.vertical
        ? [[-0.05, -0.48], [0.14, -0.48], [0.02, -0.12], [0.14, -0.14], [-0.1, 0.48], [-0.02, 0.04], [-0.14, 0.06]]
        : [[-0.46, -0.1], [0.06, -0.2], [0.02, -0.06], [0.46, -0.12], [-0.08, 0.16], [-0.02, 0.02], [-0.46, 0.08]];
      const path = (g) => pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x * S * dirX, cy + y * S) : g.moveTo(cx + x * S * dirX, cy + y * S)));
      fillStroke(ctx, (g) => { path(g); g.closePath(); }, logo.fill, logo.stroke, S * 0.035);
      break;
    }
    case 'wing': {
      // Sweeps from the forehead back over the ear with feather cuts
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dirX, 1);
      const path = (g) => {
        g.moveTo(0.46 * S, -0.02 * S);
        g.bezierCurveTo(0.2 * S, -0.34 * S, -0.3 * S, -0.36 * S, -0.48 * S, -0.1 * S);
        g.lineTo(-0.3 * S, -0.06 * S);
        g.lineTo(-0.46 * S, 0.06 * S);
        g.lineTo(-0.26 * S, 0.06 * S);
        g.lineTo(-0.38 * S, 0.2 * S);
        g.lineTo(-0.16 * S, 0.14 * S);
        g.lineTo(-0.2 * S, 0.3 * S);
        g.bezierCurveTo(0.02 * S, 0.12 * S, 0.24 * S, 0.02 * S, 0.46 * S, -0.02 * S);
        g.closePath();
      };
      fillStroke(ctx, path, logo.fill, logo.stroke, S * 0.028);
      ctx.restore();
      break;
    }
    case 'horn': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dirX, 1);
      const path = (g) => {
        g.moveTo(0.3 * S, 0.2 * S);
        g.bezierCurveTo(0.05 * S, 0.25 * S, -0.28 * S, 0.1 * S, -0.4 * S, -0.3 * S);
        g.bezierCurveTo(-0.18 * S, -0.02 * S, 0.1 * S, 0.02 * S, 0.34 * S, -0.04 * S);
        g.closePath();
      };
      fillStroke(ctx, path, logo.fill, logo.stroke, S * 0.035);
      ctx.restore();
      break;
    }
    case 'ramhorn': {
      // Big curling horn that starts at the forehead and wraps the ear
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dirX, 1);
      ctx.fillStyle = logo.fill;
      ctx.beginPath();
      ctx.moveTo(0.5 * S, -0.3 * S);
      ctx.bezierCurveTo(0.1 * S, -0.5 * S, -0.44 * S, -0.34 * S, -0.4 * S, 0.02 * S);
      ctx.bezierCurveTo(-0.36 * S, 0.36 * S, 0.02 * S, 0.42 * S, 0.1 * S, 0.14 * S);
      ctx.bezierCurveTo(0.14 * S, -0.02 * S, -0.06 * S, -0.08 * S, -0.08 * S, 0.06 * S);
      ctx.bezierCurveTo(-0.1 * S, 0.2 * S, -0.22 * S, 0.14 * S, -0.22 * S, 0.02 * S);
      ctx.bezierCurveTo(-0.22 * S, -0.22 * S, 0.1 * S, -0.3 * S, 0.5 * S, -0.16 * S);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'fleur': {
      ctx.save();
      ctx.translate(cx, cy);
      const f = logo.fill, s = logo.stroke;
      const petal = (g) => {
        g.moveTo(0, -0.44 * S);
        g.bezierCurveTo(0.16 * S, -0.26 * S, 0.12 * S, -0.02 * S, 0, 0.06 * S);
        g.bezierCurveTo(-0.12 * S, -0.02 * S, -0.16 * S, -0.26 * S, 0, -0.44 * S);
      };
      const side = (k) => (g) => {
        g.moveTo(0.04 * S * k, 0.04 * S);
        g.bezierCurveTo(0.2 * S * k, -0.08 * S, 0.44 * S * k, -0.2 * S, 0.34 * S * k, -0.32 * S);
        g.bezierCurveTo(0.46 * S * k, -0.22 * S, 0.42 * S * k, 0.06 * S, 0.12 * S * k, 0.12 * S);
      };
      const band = (g) => { g.rect(-0.2 * S, 0.06 * S, 0.4 * S, 0.08 * S); };
      const foot = (g) => {
        g.moveTo(-0.06 * S, 0.14 * S);
        g.bezierCurveTo(-0.14 * S, 0.3 * S, -0.26 * S, 0.34 * S, -0.3 * S, 0.44 * S);
        g.lineTo(0.3 * S, 0.44 * S);
        g.bezierCurveTo(0.26 * S, 0.34 * S, 0.14 * S, 0.3 * S, 0.06 * S, 0.14 * S);
      };
      for (const p of [petal, side(1), side(-1), foot, band]) fillStroke(ctx, p, f, s, S * 0.03);
      ctx.restore();
      break;
    }
    case 'flag': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(-dirX, 1); // flag streams toward the back
      ctx.fillStyle = logo.stroke;
      ctx.fillRect(-0.34 * S, -0.42 * S, 0.035 * S, 0.84 * S);
      const path = (g) => {
        g.moveTo(-0.3 * S, -0.4 * S);
        g.bezierCurveTo(-0.05 * S, -0.48 * S, 0.12 * S, -0.3 * S, 0.42 * S, -0.38 * S);
        g.lineTo(0.42 * S, 0.1 * S);
        g.bezierCurveTo(0.12 * S, 0.18 * S, -0.05 * S, 0.0, -0.3 * S, 0.08 * S);
        g.closePath();
      };
      fillStroke(ctx, path, logo.fill, logo.stroke, S * 0.03);
      ctx.fillStyle = '#F4F1E8';
      ctx.beginPath(); ctx.arc(0.05 * S, -0.16 * S, 0.09 * S, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#F4F1E8'; ctx.lineWidth = S * 0.025;
      ctx.beginPath(); ctx.moveTo(-0.1 * S, -0.02 * S); ctx.lineTo(0.2 * S, 0.02 * S); ctx.moveTo(-0.1 * S, 0.02 * S); ctx.lineTo(0.2 * S, -0.02 * S); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'sun': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dirX, 1);
      ctx.fillStyle = logo.fill;
      ctx.beginPath(); ctx.arc(0, 0, S * 0.26, 0, Math.PI * 2); ctx.fill();
      if (logo.classic) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.save(); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(-0.04 * S, -0.3 * S); ctx.lineTo(0, -0.4 * S); ctx.lineTo(0.04 * S, -0.3 * S); ctx.fill();
          ctx.restore();
        }
      }
      // leaping dolphin arc
      const path = (g) => {
        g.moveTo(-0.42 * S, 0.22 * S);
        g.bezierCurveTo(-0.3 * S, -0.34 * S, 0.3 * S, -0.36 * S, 0.44 * S, 0.02 * S);
        g.bezierCurveTo(0.26 * S, -0.16 * S, -0.12 * S, -0.16 * S, -0.26 * S, 0.24 * S);
        g.closePath();
      };
      fillStroke(ctx, path, logo.ring, logo.stroke, S * 0.02);
      ctx.restore();
      break;
    }
    case 'horseshoe': {
      ctx.save();
      ctx.translate(cx, cy + S * 0.02);
      const path = (g) => {
        g.arc(0, 0, S * 0.36, Math.PI * 0.85, Math.PI * 0.15, true);
        g.lineTo(Math.cos(Math.PI * 0.15) * S * 0.22 + 0.02 * S, Math.sin(Math.PI * 0.15) * S * 0.22);
        g.arc(0, 0, S * 0.22, Math.PI * 0.15, Math.PI * 0.85, false);
        g.closePath();
      };
      ctx.rotate(Math.PI);
      fillStroke(ctx, path, logo.fill, logo.stroke, S * 0.03);
      ctx.fillStyle = logo.stroke || '#FFFFFF';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.22 + (i / 6) * 0.56) + Math.PI;
        ctx.beginPath(); ctx.arc(Math.cos(a) * S * 0.29, -Math.sin(a) * S * 0.29, S * 0.022, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'steelmark': {
      ctx.fillStyle = '#F2F2F2';
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.44, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = S * 0.035; ctx.strokeStyle = '#101820'; ctx.stroke();
      const hypo = (x, y, r, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const t = (i / 64) * Math.PI * 2;
          const px = x + r * Math.cos(t) ** 3, py = y + r * Math.sin(t) ** 3;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.fill();
      };
      hypo(cx + S * 0.2, cy - S * 0.17, S * 0.12, '#FFB612');
      hypo(cx + S * 0.28, cy, S * 0.12, '#C60C30');
      hypo(cx + S * 0.2, cy + S * 0.17, S * 0.12, '#00539B');
      drawLettering(ctx, 'Steelers', cx - S * 0.1, cy, S * 0.09, 1, ['#101820'], 'block');
      break;
    }
    case 'text': {
      const bg = logo.bg;
      const font = logo.font || 'block';
      if (bg) {
        ctx.save();
        ctx.translate(cx, cy);
        const shape = (g) => {
          if (bg.shape === 'oval') g.ellipse(0, 0, S * 0.46, S * 0.32, 0, 0, Math.PI * 2);
          else if (bg.shape === 'circle') g.arc(0, 0, S * 0.42, 0, Math.PI * 2);
          else if (bg.shape === 'shield') {
            g.moveTo(-0.36 * S, -0.4 * S); g.lineTo(0.36 * S, -0.4 * S); g.lineTo(0.36 * S, 0.02 * S);
            g.quadraticCurveTo(0.34 * S, 0.3 * S, 0, 0.46 * S);
            g.quadraticCurveTo(-0.34 * S, 0.3 * S, -0.36 * S, 0.02 * S); g.closePath();
          } else if (bg.shape === 'arrowhead') {
            g.moveTo(0.48 * S * dirX, 0);
            g.quadraticCurveTo(0.1 * S * dirX, -0.3 * S, -0.42 * S * dirX, -0.3 * S);
            g.quadraticCurveTo(-0.3 * S * dirX, 0, -0.42 * S * dirX, 0.3 * S);
            g.quadraticCurveTo(0.1 * S * dirX, 0.3 * S, 0.48 * S * dirX, 0);
            g.closePath();
          }
        };
        fillStroke(ctx, shape, bg.fill, bg.stroke, S * 0.035);
        ctx.restore();
      }
      if (logo.streak) {
        // speed lines trail toward the back of the helmet
        ctx.fillStyle = logo.streak;
        for (let i = 0; i < 3; i++) {
          const y = cy + (i - 1) * S * 0.1 + S * 0.08;
          const x0 = cx - dirX * S * 0.06, x1 = cx - dirX * S * (0.44 - i * 0.05);
          ctx.beginPath();
          ctx.moveTo(x0, y - S * 0.028); ctx.lineTo(x1, y); ctx.lineTo(x0, y + S * 0.028);
          ctx.fill();
        }
      }
      const len = logo.s.length;
      const h = bg ? (len > 2 ? S * 0.22 : S * 0.42) : (len > 3 ? S * 0.26 : len > 1 ? S * 0.5 : S * 0.66);
      const sx = len > 3 && !bg ? 0.62 : len > 3 ? 0.55 : 1;
      drawLettering(ctx, logo.s, cx, cy + (logo.stars ? -S * 0.06 : 0), h, sx,
        [logo.fill, logo.stroke, logo.stroke2], font, S * 0.022, logo.stroke2 ? S * 0.016 : 0);
      if (logo.underline) {
        ctx.fillStyle = logo.underline;
        ctx.fillRect(cx - S * 0.4, cy + h * 0.62, S * 0.8, S * 0.04);
      }
      if (logo.stars) {
        ctx.fillStyle = logo.stars;
        [-1, 0, 1].forEach((k) => { ctx.beginPath(); starPath(ctx, cx + k * S * 0.12, cy + S * 0.25, S * 0.05, S * 0.02); ctx.fill(); });
      }
      if (logo.star) {
        ctx.fillStyle = logo.star;
        ctx.beginPath(); starPath(ctx, cx + S * 0.02, cy - S * 0.02, S * 0.08, S * 0.035); ctx.fill();
      }
      if (logo.spear) {
        ctx.strokeStyle = logo.spear; ctx.lineWidth = S * 0.03;
        ctx.beginPath(); ctx.moveTo(cx - dirX * S * 0.46, cy + S * 0.18); ctx.lineTo(cx + dirX * S * 0.4, cy - S * 0.2); ctx.stroke();
        ctx.fillStyle = logo.spear;
        ctx.beginPath();
        ctx.moveTo(cx + dirX * S * 0.48, cy - S * 0.24);
        ctx.lineTo(cx + dirX * S * 0.34, cy - S * 0.24);
        ctx.lineTo(cx + dirX * S * 0.42, cy - S * 0.12);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    default:
      return null;
  }
  return c;
}

// ─── ground ────────────────────────────────────────────────────────────

export function paintTurf(size = 1024) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2f5e2b';
  ctx.fillRect(0, 0, size, size);
  // mowing stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, (i * size) / 8, size, size / 8);
  }
  const r = rng(99);
  for (let i = 0; i < 60000; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(120,170,90,0.18)' : 'rgba(10,30,10,0.2)';
    ctx.fillRect(r() * size, r() * size, 1.4, 3 + r() * 3);
  }
  // a yard line under the player
  ctx.fillStyle = 'rgba(245,245,240,0.82)';
  ctx.fillRect(size * 0.495, 0, size * 0.012, size);
  return c;
}

export function paintFabricNormal(size = 128) {
  // Height map of a mesh knit, converted to a tangent-space normal map
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2 * 8, v = (y / size) * Math.PI * 2 * 8;
      h[y * size + x] = Math.sin(u) * Math.sin(v) * 0.5 + Math.sin(u * 2 + v) * 0.15;
    }
  }
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
      const d = h[((y - 1 + size) % size) * size + x], u = h[((y + 1) % size) * size + x];
      const nx = (l - r) * 1.5, ny = (d - u) * 1.5, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ─── color helpers ─────────────────────────────────────────────────────

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
