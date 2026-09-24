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
export function drawLettering(ctx, text, cx, cy, heightPx, sx, colors, fontKey, o1px = 0, o2px = 0, tracking = 0) {
  if (!text) return;
  const f = NUMBER_FONTS[fontKey] || NUMBER_FONTS.block;
  const m = glyphMetrics(ctx, fontKey, text);
  const px = (100 * heightPx) / m.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, 1);
  if (f.skew) ctx.transform(1, 0, f.skew, 1, 0, 0);
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

// ─── jersey torso ──────────────────────────────────────────────────────

const JERSEY_W = 2048, JERSEY_H = 1024;
const FRONT = 0.75, BACK = 0.25;

function numOutlines(num) {
  return [num[1] ? 1.0 : 0, num[2] ? 0.8 : 0];
}

export function paintJersey(jersey, team, player, meta) {
  const W = JERSEY_W, H = JERSEY_H;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const base = jersey.base;
  const font = jersey.font || team.font;
  const rowAt = (y) => (1 - meta.vAt(y)) * H;
  const pxPerCmY = (y) => Math.abs(rowAt(y - 0.005) - rowAt(y + 0.005));
  const pxPerCmX = (y) => W / (meta.perimAt(y) * 100);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  if (jersey.pattern?.t === 'spots') spots(ctx, W, H, jersey.pattern.c, 11);
  grain(ctx, W, H);

  // Collar: a trim along the neck plus a V at the front
  const collar = jersey.collar || jersey.sleeve?.stripes?.[0]?.[0] || shade(base, -0.25);
  const neckRow = rowAt(1.6);
  const vDepth = rowAt(1.548) - neckRow;
  const vHalf = (0.06 / meta.perimAt(1.56)) * W;
  ctx.fillStyle = collar;
  ctx.fillRect(0, 0, W, neckRow + 0.012 * 100 * pxPerCmY(1.59));
  ctx.beginPath();
  ctx.moveTo(FRONT * W - vHalf, 0);
  ctx.lineTo(FRONT * W, neckRow + vDepth);
  ctx.lineTo(FRONT * W + vHalf, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = base;
  const inset = 1.3 * pxPerCmX(1.56);
  ctx.beginPath();
  ctx.moveTo(FRONT * W - vHalf + inset * 1.2, 0);
  ctx.lineTo(FRONT * W, neckRow + vDepth - inset * 1.8);
  ctx.lineTo(FRONT * W + vHalf - inset * 1.2, 0);
  ctx.closePath();
  ctx.fillStyle = shade(base, -0.45);
  ctx.fill();

  const num = jersey.num;
  const number = String(player.number ?? '');
  const [o1, o2] = numOutlines(num);

  // Chest wordmark
  let frontCenterY = 1.255;
  if (jersey.word) {
    const wy = 1.405;
    const h = 3.4 * pxPerCmY(wy);
    drawLettering(ctx, jersey.word.s, FRONT * W, rowAt(wy), h, pxPerCmX(wy) / pxPerCmY(wy),
      [jersey.word.c], jersey.word.script ? 'script' : font, 0, 0, jersey.word.script ? 0 : 0.08);
    frontCenterY = 1.24;
  }

  // Front number (8 in / 20 cm tall)
  const fy = frontCenterY;
  drawLettering(ctx, number, FRONT * W, rowAt(fy), 19 * pxPerCmY(fy), pxPerCmX(fy) / pxPerCmY(fy),
    num, font, o1 * pxPerCmX(fy), o2 * pxPerCmX(fy), 0.02);

  // Nameplate and back number (larger)
  const by = 1.27;
  if (player.name) {
    const ny = 1.465;
    drawLettering(ctx, player.name.toUpperCase(), BACK * W, rowAt(ny), 4.2 * pxPerCmY(ny), pxPerCmX(ny) / pxPerCmY(ny),
      [num[0]], font === 'script' ? 'block' : (font === 'modern' ? 'modern' : 'block'), 0, 0, 0.06);
  }
  drawLettering(ctx, number, BACK * W, rowAt(by), 24 * pxPerCmY(by), pxPerCmX(by) / pxPerCmY(by),
    num, font, o1 * pxPerCmX(by), o2 * pxPerCmX(by), 0.02);

  return c;
}

// ─── sleeves ───────────────────────────────────────────────────────────

export function paintSleeve(jersey, team, player, meta) {
  const W = 1024, H = 768;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const sl = jersey.sleeve || {};
  const base = sl.cap || jersey.base;
  const L = meta.length; // metres of surface, cuff → top of the shoulder dome
  const jointCm = meta.joint * 100;
  const pxPerCmY = H / (L * 100);
  const pxPerCmX = W / (meta.perimAt(meta.joint * 0.5) * 100);
  const rowCm = (cm) => H - cm * pxPerCmY;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  if (jersey.pattern?.t === 'spots') spots(ctx, W, H, jersey.pattern.c, 5);

  if (sl.pattern?.t === 'tiger') {
    ctx.fillStyle = sl.pattern.c;
    const r = rng(3);
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * W + r() * 30;
      wrapped(W, (off) => wedge(ctx, x + off, rowCm(jointCm + 6), (jointCm - 2) * pxPerCmY * (0.6 + r() * 0.3), 42 + r() * 25, Math.PI / 2 + 0.35, 30));
    }
  }

  grain(ctx, W, H, 0.03, 9);

  // Stripes start a few cm above the cuff
  const from = sl.from ?? 3;
  const stripeTop = from + stripeTotal(sl.stripes);
  if (sl.stripes) bandsH(ctx, sl.stripes, rowCm(from), pxPerCmY, 0, W, -1);

  // Shoulder loop: a ring around the top of the arm, over the shoulder pad
  const loopW = stripeTotal(jersey.loop);
  const loopCenter = jointCm + 1;
  if (jersey.loop) {
    if (jersey.loopPattern === 'bolt') {
      const amp = 2.2 * pxPerCmY, y = rowCm(loopCenter);
      const path = (g) => {
        g.moveTo(-20, y);
        for (let k = 0; k <= 8; k++) g.lineTo((k / 8) * W, y + (k % 2 ? -amp : amp));
        g.lineTo(W + 20, y + amp);
      };
      strokeStripes(ctx, path, jersey.loop, pxPerCmY, base, 'butt', 'miter');
    } else if (jersey.loopPattern === 'horn') {
      // horn: a sweeping band that thickens over the top of the shoulder
      ctx.fillStyle = jersey.loop[0][0];
      ctx.beginPath();
      const y0 = rowCm(loopCenter), w = loopW * pxPerCmY;
      ctx.moveTo(0, y0 + w * 0.2);
      for (let x = 0; x <= W; x += 16) {
        const t = x / W;
        const thick = w * (0.35 + 0.85 * Math.abs(Math.cos(Math.PI * t)));
        ctx.lineTo(x, y0 - thick / 2 + Math.sin(Math.PI * 2 * t) * w * 0.25);
      }
      for (let x = W; x >= 0; x -= 16) {
        const t = x / W;
        const thick = w * (0.35 + 0.85 * Math.abs(Math.cos(Math.PI * t)));
        ctx.lineTo(x, y0 + thick / 2 + Math.sin(Math.PI * 2 * t) * w * 0.25);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      bandsH(ctx, jersey.loop, rowCm(loopCenter - loopW / 2), pxPerCmY, 0, W, -1);
    }
  }

  // Cuff hem
  ctx.fillStyle = shade(base, -0.18);
  ctx.fillRect(0, H - 0.9 * pxPerCmY, W, 0.9 * pxPerCmY);

  // TV number on the outer side (u = 0): between the stripes and the loop,
  // or up on the shoulder when the sleeve is too busy.
  const number = String(player.number ?? '');
  const lo = stripeTop + 1.2;
  const hi = jersey.loop ? loopCenter - loopW / 2 - 1 : jointCm + 3;
  let hCm = Math.min(7.5, hi - lo);
  let centerCm = (lo + hi) / 2;
  if (hCm < 4.5) {
    hCm = 6;
    centerCm = jersey.loop ? loopCenter + loopW / 2 + 4.5 : jointCm + 4;
  }
  const [o1] = numOutlines(jersey.num);
  const numColors = sl.cap && sl.cap !== jersey.base ? [jersey.num[1] || jersey.num[0], jersey.num[0]] : jersey.num.slice(0, 2);
  wrapped(W, (off) => drawLettering(ctx, number, off, rowCm(centerCm), hCm * pxPerCmY, pxPerCmX / pxPerCmY,
    numColors, jersey.font || team.font, o1 * 0.6 * pxPerCmX, 0, 0.02));

  return c;
}

// ─── pants ─────────────────────────────────────────────────────────────

function pantsPattern(ctx, pants, W, H, xs, pxPerCmX, pxPerCmY) {
  const base = pants.base;
  if (pants.pattern?.t === 'tiger') {
    ctx.fillStyle = pants.pattern.c;
    const r = rng(21);
    for (const x0 of xs) {
      for (let i = 0; i < 7; i++) {
        const y = (i + 0.4) * (H / 7);
        const len = (6 + r() * 5) * pxPerCmX;
        wrapped(W, (off) => {
          wedge(ctx, x0 + off, y, len, 2.2 * pxPerCmY, Math.PI + 0.25, 8);
          wedge(ctx, x0 + off, y + 0.3 * H / 7, len * 0.9, 2.2 * pxPerCmY, 0.25, -8);
        });
      }
    }
  } else if (pants.pattern?.t === 'bolt') {
    const amp = 1.6 * pxPerCmX;
    for (const x0 of xs) {
      wrapped(W, (off) => {
        const cx = x0 + off;
        const path = (g) => {
          g.moveTo(cx, -10);
          g.lineTo(cx, H * 0.18);
          g.lineTo(cx + amp, H * 0.38);
          g.lineTo(cx - amp, H * 0.5);
          g.lineTo(cx + amp, H * 0.66);
          g.lineTo(cx - amp * 0.4, H * 0.84);
          g.lineTo(cx - amp * 0.4, H + 10);
        };
        strokeStripes(ctx, path, pants.stripe || [[pants.pattern.c, 3]], pxPerCmX, base, 'butt', 'miter');
      });
    }
    return;
  }
  if (pants.stripe) {
    for (const x0 of xs) {
      wrapped(W, (off) => strokeStripes(ctx, (g) => { g.moveTo(x0 + off, -10); g.lineTo(x0 + off, H + 10); }, pants.stripe, pxPerCmX, base));
    }
  }
}

export function paintPantsHips(pants, meta) {
  const W = 1024, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = pants.base;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03, 13);
  const pxPerCmX = W / (meta.perimAt(0.95) * 100);
  const pxPerCmY = H / (meta.length * 100);
  pantsPattern(ctx, pants, W, H, [0, 0.5 * W], pxPerCmX, pxPerCmY);
  return c;
}

export function paintPantsThigh(pants, meta) {
  const W = 1024, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = pants.base;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03, 17);
  const pxPerCmX = W / (meta.perimAt(meta.length * 0.5) * 100);
  const pxPerCmY = H / (meta.length * 100);
  pantsPattern(ctx, pants, W, H, [0], pxPerCmX, pxPerCmY);
  // Knee hem
  ctx.fillStyle = shade(pants.base, -0.15);
  ctx.fillRect(0, H - 1.2 * pxPerCmY, W, 1.2 * pxPerCmY);
  return c;
}

// ─── socks ─────────────────────────────────────────────────────────────

export function paintSocks(socks, meta) {
  const W = 512, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = socks.base;
  ctx.fillRect(0, 0, W, H);
  const pxPerCmY = H / (meta.length * 100);
  // ribbed knit
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 3, H);
  ctx.restore();
  // top of the sock hides under the pants, so stripes start a little lower
  if (socks.stripes) bandsH(ctx, socks.stripes, 9 * pxPerCmY, pxPerCmY, 0, W, 1);
  return c;
}

// ─── helmet shell ──────────────────────────────────────────────────────
// Canvas x = around the head (0.25 back, 0.5 crown, 0.75 front)
// Canvas y = side to side (top row = right-hand +x side, middle = centre line)

export const HELMET_R = { x: 0.135, yz: 0.152 };

export function paintHelmet(helmet) {
  const W = 2048, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = helmet.shell;
  ctx.fillRect(0, 0, W, H);

  const pxPerCmX = W / (2 * Math.PI * HELMET_R.yz * 100);
  const pxPerCmY = H / (Math.PI * HELMET_R.x * 100);

  if (helmet.finish === 'matte' && helmet.id === 'leather') {
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
    const x0 = 0.1 * W, x1 = 0.725 * W;
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
    case 'star':
      fillStroke(ctx, (g) => starPath(g, cx, cy + S * 0.03, S * 0.44, S * 0.18), logo.fill, logo.stroke, S * 0.04, logo.stroke2, S * 0.02);
      break;
    case 'bolt': {
      const pts = [[-0.46, -0.1], [0.06, -0.2], [0.02, -0.06], [0.46, -0.12], [-0.08, 0.16], [-0.02, 0.02], [-0.46, 0.08]];
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

export function paintHelmetNumber(number, color, size = 256) {
  const c = makeCanvas(size, size);
  drawLettering(c.getContext('2d'), String(number), size / 2, size / 2, size * 0.7, 1, [color], 'modern');
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
