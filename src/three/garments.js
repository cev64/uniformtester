// Painters for the sculpted player model's garments.
//
// UV layouts come from tools/build_player.py:
//   jersey torso: u around the body (0.5 = front centre, seam at the back), v up the torso
//   sleeve:       u around the arm (0.5 = outer side), v from the hem (0) to the shoulder top (1)
//   pants/socks:  u around the leg (0.5 = outer side), v from the hem (0) up
// player.json gives each region's length and circumference so everything is
// drawn in real centimetres. Canvas y runs top-down, so row = (1 - v) * H.

import { makeCanvas, rng, stripeTotal, strokeStripes, drawLettering, wedge, spots, grain, shade } from './paint.js';

const circAt = (region, v) => {
  const c = region.circumference;
  const f = Math.min(1, Math.max(0, v)) * (c.length - 1);
  const i = Math.floor(f);
  return c[i] + (c[Math.min(c.length - 1, i + 1)] - c[i]) * (f - i);
};

// ─── jersey torso ──────────────────────────────────────────────────────

export function paintTorso(jersey, meta) {
  const W = 2048, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const R = meta.regions.jersey;
  const pxPerCmY = H / (R.length * 100);
  ctx.fillStyle = jersey.base;
  ctx.fillRect(0, 0, W, H);

  const p = jersey.panels || {};
  if (p.vstripes) {
    // e.g. the Steelers 1933 throwback: vertical bars across the body
    const [col, wCm, gapCm] = p.vstripes;
    const circ = circAt(R, 0.4) * 100;
    for (let x = 0; x < circ; x += wCm + gapCm) {
      ctx.fillStyle = col;
      ctx.fillRect((x / circ) * W, 0, (wCm / circ) * W, H);
    }
  }
  if (p.yoke) {
    // shoulder yoke: colour everything above a line across the chest and back
    const [col, fromTopCm, vDepthCm = 0] = [].concat(p.yoke);
    const y = fromTopCm * pxPerCmY;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, y);
    ctx.lineTo(W * 0.5 + W * 0.12, y);
    ctx.lineTo(W * 0.5, y + vDepthCm * pxPerCmY);
    ctx.lineTo(W * 0.5 - W * 0.12, y);
    ctx.lineTo(0, y);
    ctx.fill();
  }
  if (p.sides) {
    // side panels running from the hem to the armpit
    const [col, wCm] = [].concat(p.sides, 8).slice(0, 2);
    for (const u of [0.25, 0.75]) {
      for (let y = 0; y < H; y += 4) {
        const v = 1 - y / H;
        if (v > 0.72) continue;
        const w = (wCm / (circAt(R, v) * 100)) * W;
        ctx.fillStyle = col;
        ctx.fillRect(u * W - w / 2, y, w, 4);
      }
    }
  }
  if (jersey.pattern?.t === 'spots') spots(ctx, W, H, jersey.pattern.c, 11);
  grain(ctx, W, H, 0.03, 3);
  return c;
}

// ─── sleeves ───────────────────────────────────────────────────────────

export function paintSleeveTex(jersey, meta) {
  const W = 1024, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const R = meta.regions.sleeve;
  const Lcm = R.length * 100;
  const pxPerCmY = H / Lcm;
  const rowCm = (cm) => H - cm * pxPerCmY;          // cm measured up from the hem
  const sl = jersey.sleeve || {};
  const base = sl.cap || jersey.base;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  if (jersey.pattern?.t === 'spots') spots(ctx, W, H, jersey.pattern.c, 5);

  if (sl.pattern?.t === 'tiger') {
    // Bengals: claw-like stripes sweeping down from the top of the shoulder
    ctx.fillStyle = sl.pattern.c;
    const r = rng(3);
    for (let i = 0; i < 7; i++) {
      const x = (0.2 + i * 0.1 + r() * 0.02) * W;
      wedge(ctx, x, -6, H * (0.5 + r() * 0.25), 46 + r() * 20, Math.PI / 2 + 0.28, 26);
    }
  }

  // Stripes at the hem
  const from = sl.from ?? 2.5;
  if (sl.stripes) {
    let y = rowCm(from);
    for (const [col, w] of sl.stripes) {
      const h = w * pxPerCmY;
      if (col) { ctx.fillStyle = col; ctx.fillRect(0, y - h, W, h); }
      y -= h;
    }
  }

  // Shoulder loop: a ring round the top of the arm that reads as a UCLA stripe
  if (jersey.loop) {
    const at = jersey.loopAt ?? (Lcm - 7);
    const total = stripeTotal(jersey.loop);
    if (jersey.loopPattern === 'bolt') {
      const amp = 2.4 * pxPerCmY, y = rowCm(at);
      strokeStripes(ctx, (g) => {
        g.moveTo(-20, y + amp);
        for (let k = 0; k <= 6; k++) g.lineTo((k / 6) * W, y + (k % 2 ? -amp : amp));
      }, jersey.loop, pxPerCmY, base, 'butt', 'miter');
    } else if (jersey.loopPattern === 'horn') {
      // Rams: a horn that sweeps over the shoulder and thins toward the back
      ctx.fillStyle = jersey.loop[0][0];
      ctx.beginPath();
      const y0 = rowCm(at), w = total * pxPerCmY;
      for (let x = 0; x <= W; x += 8) {
        const t = x / W;
        const thick = w * (0.25 + 0.9 * Math.sin(Math.PI * t) ** 2);
        const yy = y0 - Math.sin(Math.PI * t) * w * 0.35;
        x ? ctx.lineTo(x, yy - thick / 2) : ctx.moveTo(x, yy - thick / 2);
      }
      for (let x = W; x >= 0; x -= 8) {
        const t = x / W;
        const thick = w * (0.25 + 0.9 * Math.sin(Math.PI * t) ** 2);
        const yy = y0 - Math.sin(Math.PI * t) * w * 0.35;
        ctx.lineTo(x, yy + thick / 2);
      }
      ctx.fill();
    } else {
      let y = rowCm(at - total / 2);
      for (const [col, w] of jersey.loop) {
        const h = w * pxPerCmY;
        if (col) { ctx.fillStyle = col; ctx.fillRect(0, y - h, W, h); }
        y -= h;
      }
    }
  }

  // hem binding
  ctx.fillStyle = shade(base, -0.12);
  ctx.fillRect(0, H - 0.8 * pxPerCmY, W, 0.8 * pxPerCmY);
  grain(ctx, W, H, 0.03, 9);
  return c;
}

// ─── pants ─────────────────────────────────────────────────────────────

export function paintPantsTex(pants, meta) {
  const W = 1024, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const R = meta.regions.pants;
  const Lcm = R.length * 100;
  const pxPerCmY = H / Lcm;
  ctx.fillStyle = pants.base;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2; // outer side of each leg

  const stripeRow = (stripes, y, h, v, offsetCm = 0) => {
    const circ = circAt(R, v) * 100;
    const pxPerCmX = W / circ;
    let x = cx - (stripeTotal(stripes) / 2 - offsetCm) * pxPerCmX;
    for (const [col, w] of stripes) {
      const ww = w * pxPerCmX;
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, ww + 0.5, h); }
      x += ww;
    }
  };

  const pat = pants.pattern?.t;
  if (pat === 'tiger') {
    ctx.fillStyle = pants.pattern.c;
    const r = rng(21);
    for (let i = 0; i < 8; i++) {
      const y = (0.08 + i * 0.105) * H;
      const pxPerCmX = W / (circAt(R, 1 - y / H) * 100);
      const len = (7 + r() * 4) * pxPerCmX;
      wedge(ctx, cx - 3 * pxPerCmX, y, len, 2.6 * pxPerCmY, Math.PI + 0.35, 10);
      wedge(ctx, cx + 3 * pxPerCmX, y + 3 * pxPerCmY, len * 0.9, 2.6 * pxPerCmY, -0.35, -10);
    }
  } else if (pat === 'bolt') {
    const stripes = pants.stripe || [[pants.pattern.c, 3]];
    const pxPerCmX = W / (circAt(R, 0.5) * 100);
    const amp = 1.8 * pxPerCmX;
    strokeStripes(ctx, (g) => {
      g.moveTo(cx, -10); g.lineTo(cx, H * 0.12); g.lineTo(cx + amp, H * 0.34); g.lineTo(cx - amp, H * 0.5);
      g.lineTo(cx + amp, H * 0.68); g.lineTo(cx - amp * 0.4, H * 0.88); g.lineTo(cx - amp * 0.4, H + 10);
    }, stripes, pxPerCmX, pants.base, 'butt', 'miter');
  } else if (pants.stripe) {
    // stripes run from the waistband down to the hem, drawn row by row so the
    // width stays true while the leg narrows toward the knee
    const stopV = pants.stripeStop ?? 0.02;
    for (let y = 0; y < H; y += 3) {
      const v = 1 - y / H;
      if (v < stopV) break;
      stripeRow(pants.stripe, y, 3, v);
    }
  }
  // waistband and knee hem
  ctx.fillStyle = shade(pants.base, -0.16);
  ctx.fillRect(0, 0, W, 3.2 * pxPerCmY);
  ctx.fillStyle = shade(pants.base, -0.1);
  ctx.fillRect(0, H - 1.2 * pxPerCmY, W, 1.2 * pxPerCmY);
  grain(ctx, W, H, 0.025, 13);
  return c;
}

// ─── socks ─────────────────────────────────────────────────────────────

export function paintSocksTex(socks, meta) {
  const W = 512, H = 512;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const R = meta.regions.socks;
  const Lcm = R.length * 100;
  const pxPerCmY = H / Lcm;
  ctx.fillStyle = socks.base;
  ctx.fillRect(0, 0, W, H);
  if (socks.lower) {
    // e.g. Browns: striped top, white lower
    const [col, fromTopCm] = socks.lower;
    ctx.fillStyle = col;
    ctx.fillRect(0, fromTopCm * pxPerCmY, W, H);
  }
  // the top ~6 cm hide under the pants
  let y = (socks.stripesFrom ?? 9) * pxPerCmY;
  for (const [col, w] of socks.stripes || []) {
    const h = w * pxPerCmY;
    if (col) { ctx.fillStyle = col; ctx.fillRect(0, y, W, h); }
    y += h;
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let x = 0; x < W; x += 6) ctx.fillRect(x, 0, 2, H);
  ctx.restore();
  return c;
}

// ─── decal canvases ────────────────────────────────────────────────────

// Returns a tight canvas holding outlined lettering and its width/height ratio.
// Outline widths are given as fractions of the lettering height.
export function letteringCanvas(text, colors, font, { o1 = 0.055, o2 = 0.045, tracking = 0.02, px = 256 } = {}) {
  const pad = px * 0.2;
  const probe = makeCanvas(8, 8).getContext('2d');
  // measure at the target size to size the canvas
  const tmp = makeCanvas(px * Math.max(1, text.length) * 1.2 + pad * 2, px + pad * 2);
  const ctx = tmp.getContext('2d');
  drawLettering(ctx, text, tmp.width / 2, tmp.height / 2, px, 1, colors, font, colors[1] ? o1 * px : 0, colors[2] ? o2 * px : 0, tracking);
  // crop horizontally to the inked area
  const data = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
  let minX = tmp.width, maxX = 0;
  for (let x = 0; x < tmp.width; x += 2) {
    for (let y = 0; y < tmp.height; y += 4) {
      if (data[(y * tmp.width + x) * 4 + 3] > 8) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); break; }
    }
  }
  if (maxX <= minX) return { canvas: tmp, aspect: tmp.width / tmp.height };
  const w = maxX - minX + 8, h = tmp.height;
  const out = makeCanvas(w, h);
  out.getContext('2d').drawImage(tmp, minX - 4, 0, w, h, 0, 0, w, h);
  void probe;
  return { canvas: out, aspect: w / h, inkHeight: px / h };
}

export function eyeCanvas() {
  const W = 256, H = 128;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe9e2';
  ctx.fillRect(0, 0, W, H);
  // iris and pupil around the forward pole (top rows)
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  g.addColorStop(0, '#0b0806'); g.addColorStop(0.35, '#0b0806'); g.addColorStop(0.4, '#3b2415'); g.addColorStop(0.9, '#5a3a22'); g.addColorStop(1, '#2a1a10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H * 0.3);
  return c;
}

export function swooshCanvas(color, px = 256) {
  const c = makeCanvas(px * 2, px);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  const S = px;
  ctx.moveTo(0.18 * S, 0.62 * S);
  ctx.bezierCurveTo(0.02 * S, 0.9 * S, 0.3 * S, 0.98 * S, 0.62 * S, 0.84 * S);
  ctx.lineTo(1.95 * S, 0.22 * S);
  ctx.lineTo(0.6 * S, 0.68 * S);
  ctx.bezierCurveTo(0.34 * S, 0.76 * S, 0.14 * S, 0.76 * S, 0.18 * S, 0.62 * S);
  ctx.fill();
  return c;
}
