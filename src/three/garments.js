// Painters for the sculpted player model's garments.
//
// UV layouts come from tools/build_player.py:
//   jersey torso: u around the body (0.5 = front centre, seam at the back), v up the torso
//   sleeve:       u around the arm (0.5 = outer side), v from the hem (0) to the shoulder top (1)
//   pants/socks:  u around the leg (0.5 = outer side), v from the hem (0) up
// player.json gives each region's length and circumference so everything is
// drawn in real centimetres. Canvas y runs top-down, so row = (1 - v) * H.

import { makeCanvas, rng, stripeTotal, strokeStripes, drawLettering, wedge, spots, grain, shade } from './paint.js';
import { NUMBER_FONTS, fontCss } from './fonts.js';
import { signedDistance, grow, cpuCanvas, alphaOf, maskCanvas } from './sdf.js';

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
  if (p.vband) {
    // a V-shaped band from the shoulders to a point on the chest and back
    // (Steelers 1933); anything that was painted above it goes back to base
    const [col, wCm, depthCm, halfU = 0.14] = p.vband;
    const y = depthCm * pxPerCmY;
    for (const cu of [0.5, 0, 1]) {
      ctx.fillStyle = jersey.base;
      ctx.beginPath();
      ctx.moveTo((cu - halfU) * W, 0); ctx.lineTo(cu * W, y); ctx.lineTo((cu + halfU) * W, 0);
      ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = wCm * pxPerCmY; ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo((cu - halfU - 0.03) * W, -wCm * pxPerCmY); ctx.lineTo(cu * W, y); ctx.lineTo((cu + halfU + 0.03) * W, -wCm * pxPerCmY);
      ctx.stroke();
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
  if (p.raglan) {
    // a band along each raglan seam, from the collar over the front (and back)
    // of the shoulder down to the armpit (Panthers), with an optional edge line
    const [col, wCm, edge] = p.raglan;
    const gs = meta.ground_shift || 0, z0 = meta.jersey.z0 + gs, z1 = meta.jersey.z1 + gs;
    const V = (z) => (z - z0) / (z1 - z0);
    const sh = meta.joints['upperarm01.L'];
    const top = V(meta.constants.neck_z - 0.03), bot = V(sh[2] - 0.09);
    // [u at the collar, u at the armpit] for the front and back of the player's left side
    const lines = [[0.572, 0.672], [0.885, 0.8]];
    const wPx = (cm, v) => (cm / (circAt(R, v) * 100)) * W;
    for (const [ua, ub] of lines) {
      for (const mirror of [false, true]) {
        const pts = [[ua, top], [(ua + ub) / 2 + (ub - ua) * 0.08, (top + bot) / 2], [ub, bot]]
          .map(([u, v]) => [(mirror ? 1 - u : u) * W, (1 - v) * H]);
        const draw = (width, color) => {
          ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt';
          ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.quadraticCurveTo(...pts[1], ...pts[2]); ctx.stroke();
        };
        if (edge) draw(wPx(wCm + edge[1] * 2, 0.8), edge[0]);
        draw(wPx(wCm, 0.8), col);
      }
    }
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
  if (jersey.feathers && meta.collar?.front_uv) {
    // feathers fanning out from both sides of the V-neck (Ravens "wings" collar)
    const pts = meta.collar.front_uv.map(([u, v]) => [u * W, (1 - v) * H]);
    const n = pts.length, mid = (n - 1) / 2;
    ctx.fillStyle = jersey.feathers;
    const lenPx = 6 * pxPerCmY, wPx = 1.0 * pxPerCmY;
    for (let i = 1; i < n - 1; i += 1) {
      const k = Math.abs(i - mid) / mid;          // 0 at the V point, 1 at the shoulders
      if (k < 0.04 || k > 0.62) continue;
      const [x, y] = pts[i];
      const side = i < mid ? -1 : 1;              // viewer's left / right of the V
      const [xa, ya] = pts[Math.max(0, i - 1)], [xb, yb] = pts[Math.min(n - 1, i + 1)];
      // outward normal to the neckline, then swept up toward the shoulder
      let nx = yb - ya, ny = -(xb - xa);
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (nx * side < 0) { nx = -nx; ny = -ny; }
      const ang = Math.atan2(ny, nx) - side * 0.35;
      const L = lenPx * (0.55 + 0.6 * Math.sin(Math.min(1, k / 0.5) * Math.PI * 0.6));
      const tipX = x + Math.cos(ang) * L, tipY = y + Math.sin(ang) * L;
      const px = -Math.sin(ang) * wPx, py = Math.cos(ang) * wPx;
      ctx.beginPath();
      ctx.moveTo(x - px, y - py);
      ctx.quadraticCurveTo((x + tipX) / 2 + px * 0.6, (y + tipY) / 2 + py * 0.6, tipX, tipY);
      ctx.lineTo(x + px, y + py);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (jersey.fade) {
    // colour fading down from the shoulders (e.g. Bills Cold Front)
    const g = ctx.createLinearGradient(0, 0, 0, jersey.fade.cm * pxPerCmY);
    g.addColorStop(0, jersey.fade.c); g.addColorStop(0.25, jersey.fade.c); g.addColorStop(1, jersey.fade.c + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, jersey.fade.cm * pxPerCmY);
  }
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
  if (jersey.fade) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, jersey.fade.c); g.addColorStop(1, jersey.fade.c + '40');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (sl.top) {
    // upper part of the sleeve in another colour (shoulder panels)
    ctx.fillStyle = sl.top[0];
    ctx.fillRect(0, 0, W, rowCm(sl.top[1]));
  }

  if (sl.pattern?.t === 'feathers') {
    // feather chevrons over the shoulder cap (Seahawks Rivalries)
    ctx.strokeStyle = sl.pattern.c; ctx.lineWidth = 0.45 * pxPerCmY;
    const step = 2.6 * pxPerCmY;
    for (let y = 0; y < H * 0.55; y += step * 0.7) {
      for (let x = ((y / step) % 2) * step / 2; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x - step * 0.35, y); ctx.lineTo(x, y + step * 0.35); ctx.lineTo(x + step * 0.35, y); ctx.stroke();
      }
    }
  }
  if (sl.pattern?.t === 'diamondplate') {
    // raised diamond-plate steel texture (Jets Gotham City FC sleeves)
    ctx.strokeStyle = sl.pattern.c;
    ctx.lineWidth = 0.28 * pxPerCmY;
    ctx.lineCap = 'round';
    const step = 1.3 * pxPerCmY;
    for (let y = 0, row = 0; y < H + step; y += step / 2, row++) {
      for (let x = (row % 2) * step / 2; x < W + step; x += step) {
        const d = row % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x - step * 0.22, y - d * step * 0.1);
        ctx.lineTo(x + step * 0.22, y + d * step * 0.1);
        ctx.stroke();
      }
    }
  }
  if (sl.pattern?.t === 'tiger') {
    // Bengals: claw-like stripes sweeping down from the top of the shoulder
    ctx.fillStyle = sl.pattern.c;
    const r = rng(3);
    for (let i = 0; i < 7; i++) {
      const x = (0.2 + i * 0.1 + r() * 0.02) * W;
      wedge(ctx, x, -6, H * (0.5 + r() * 0.25), 46 + r() * 20, Math.PI / 2 + 0.28, 26);
    }
  }

  if (sl.fin) {
    // a fin-shaped panel on the outside of the sleeve rising from the hem toward the back
    // (Dolphins Dark Water), with an accent stripe inside it
    const { c: col, stripe } = sl.fin;
    const fin = (inset) => {
      ctx.beginPath();
      ctx.moveTo(W * (0.36 + inset), H);
      ctx.bezierCurveTo(W * 0.46, H * (0.62 + inset), W * 0.58, H * (0.42 + inset * 2), W * (0.74 - inset), H * (0.3 + inset * 2));
      ctx.lineTo(W * (0.72 - inset), H * (0.55 + inset));
      ctx.bezierCurveTo(W * 0.62, H * 0.72, W * 0.56, H * 0.86, W * (0.58 - inset), H);
      ctx.closePath();
    };
    ctx.fillStyle = col; fin(0); ctx.fill();
    if (stripe) {
      ctx.strokeStyle = stripe; ctx.lineWidth = 0.7 * pxPerCmY;
      ctx.beginPath();
      ctx.moveTo(W * 0.47, H * 0.98);
      ctx.bezierCurveTo(W * 0.52, H * 0.74, W * 0.6, H * 0.56, W * 0.72, H * 0.44);
      ctx.stroke();
    }
  }

  if (sl.knot) {
    // Norse knotwork band on the outside of the sleeve (Vikings Rivalries)
    const circ = circAt(R, 0.3) * 100, pxPerCmX = W / circ;
    const bw = 9 * pxPerCmX, bh = 3.6 * pxPerCmY, x0 = W / 2 - bw / 2, y0 = H - 3 * pxPerCmY - bh;
    ctx.save();
    ctx.strokeStyle = sl.knot.c; ctx.lineWidth = 0.3 * pxPerCmY; ctx.lineCap = 'round';
    ctx.strokeRect(x0, y0, bw, bh);
    const n = 5, step = bw / n;
    for (let i = 0; i < n; i++) {
      const cx = x0 + step * (i + 0.5), cy = y0 + bh / 2, r = Math.min(step, bh) * 0.36;
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.bezierCurveTo(cx + r * 1.6, cy - r * 0.2, cx - r * 1.6, cy + r * 0.2, cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx + r * 1.6, cy + r * 0.2, cx - r, cy + r);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (sl.vbars) {
    // vertical bars on the outside of the sleeve rising from the hem (Bears Rivalries)
    const { stripes: vb, len = 9 } = sl.vbars;
    const circ = circAt(R, 0.2) * 100, pxPerCmX = W / circ;
    let x = W / 2 - (stripeTotal(vb) / 2) * pxPerCmX;
    for (const [col, w] of vb) {
      if (col) { ctx.fillStyle = col; ctx.fillRect(x, H - len * pxPerCmY, w * pxPerCmX, len * pxPerCmY); }
      x += w * pxPerCmX;
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

  if (sl.textBand) {
    // lettering wrapped round the sleeve inside the stripes (Cardinals)
    const { s: text, c: col, at = 4.8, h = 2.4 } = sl.textBand;
    const circ = circAt(R, 0.15) * 100, pxPerCmX = W / circ;
    drawLettering(ctx, text, W / 2, rowCm(at), h * pxPerCmY, pxPerCmX / pxPerCmY, [col], 'squareSans', 0, 0, 0.12);
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
  if (pat === 'spots') spots(ctx, W, H, pants.pattern.c, 17);
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
    // Chargers: a lightning bolt on the outside of the thigh, from mid-thigh
    // down to the knee, outlined, pointing toward the back
    const { c: fill, o: outline } = pants.pattern;
    const pxPerCmX = W / (circAt(R, 0.35) * 100);
    // [cm across (+ = toward the back), v] from the top of the bolt
    const pts = [[-3.2, 0.6], [2.8, 0.6], [0.4, 0.4], [2.6, 0.41], [-1.2, 0.06], [0.2, 0.3], [-2.2, 0.29]];
    const path = (g) => pts.forEach(([x, v], i) => { const X = cx + x * pxPerCmX, Y = (1 - v) * H; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    ctx.lineJoin = 'miter';
    if (outline) {
      ctx.beginPath(); path(ctx); ctx.closePath();
      ctx.strokeStyle = outline; ctx.lineWidth = 1.0 * pxPerCmX; ctx.stroke();
    }
    ctx.beginPath(); path(ctx); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  if (pat === 'feather') {
    // a column of feather chevrons down the side seam (Seahawks)
    const { c: col, w = 2.2, gap = 3 } = pants.pattern;
    for (let yCm = 3; yCm < Lcm - 1; yCm += gap) {
      const v = 1 - yCm / Lcm, y = yCm * pxPerCmY;
      const pxPerCmX = W / (circAt(R, v) * 100);
      const hw = (w / 2) * pxPerCmX, d = 1.3 * pxPerCmY, t = 0.7 * pxPerCmY;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx - hw, y); ctx.lineTo(cx, y + d); ctx.lineTo(cx + hw, y);
      ctx.lineTo(cx + hw, y + t); ctx.lineTo(cx, y + d + t); ctx.lineTo(cx - hw, y + t);
      ctx.closePath(); ctx.fill();
    }
  }
  if (pat !== 'tiger' && pat !== 'bolt' && pants.stripe) {
    // stripes run from the waistband down to the hem, drawn row by row so the
    // width stays true while the leg narrows toward the knee. stripeTaper
    // [atWaist, atHem] scales the widths for stripes that flare down the leg.
    const stopV = pants.stripeStop ?? 0.02;
    const startV = pants.stripeStart ?? 1;         // e.g. 0.8: stripe begins below the hip
    const [t0, t1] = pants.stripeTaper || [1, 1];
    for (let y = 0; y < H; y += 3) {
      const v = 1 - y / H;
      if (v < stopV) break;
      if (v > startV) continue;
      const k = t1 + (t0 - t1) * v;
      stripeRow(k === 1 ? pants.stripe : pants.stripe.map(([c, w]) => [c, w * k]), y, 3, v);
    }
  }
  if (pants.band) {
    // a wide accent band down the side seam over the upper leg only, cut off
    // at an angle (Broncos 2024)
    const { stripe, stop = 0.6 } = pants.band;
    for (let y = 0; y < H; y += 3) {
      const v = 1 - y / H;
      const pxPerCmX = W / (circAt(R, v) * 100);
      const edge = stop + (v - stop) * 0;
      if (v < stop - 0.06) break;
      // diagonal cut: the front edge ends higher than the back edge
      const total = stripeTotal(stripe) * pxPerCmX;
      const cut = Math.max(0, Math.min(1, (v - (stop - 0.06)) / 0.06));
      let x = cx - total / 2;
      for (const [col, w] of stripe) {
        const ww = w * pxPerCmX;
        if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, ww * (v > stop ? 1 : cut) + 0.5, 3); }
        x += ww;
      }
      void edge;
    }
  }
  if (pants.fade) {
    // colour fading in toward the side seams (e.g. Bills Cold Front)
    const pxPerCmX = W / (circAt(R, 0.5) * 100);
    const w = pants.fade.cm * pxPerCmX;
    for (const dir of [-1, 1]) {
      const g = ctx.createLinearGradient(cx, 0, cx + dir * w, 0);
      g.addColorStop(0, pants.fade.c); g.addColorStop(1, pants.fade.c + '00');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(cx, cx + dir * w), 0, w, H);
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

// Lettering as a stack of layer masks (outer outline, inner outline, face),
// like numeralLayers, so it can be built as twill or pressed film.
// Outline widths are fractions of the cap height.
//   tracking: extra space between letters (fraction of the font size)
//   arch: vertical arch, the rise of the middle letters as a fraction of the
//         cap height (letters stay upright, the baseline bends; < 0 sags)
//   scaleX: horizontal scale of the letters (condense / extend a font)
//   skew: shear for italics (x per y)
//   bg: a rounded patch behind the lettering (neck-tag labels)
export function letteringLayers(text, colors, font, { o1 = 0.055, o2 = 0.045, tracking = 0.02, px = 256, skew = null, bg = null, arch = 0, scaleX = 1 } = {}) {
  const f = NUMBER_FONTS[font] || NUMBER_FONTS.block;
  const [fill, c1, c2] = colors;
  const w1 = c1 ? o1 * px : 0, w2 = c2 ? o2 * px : 0;
  const k = skew ?? f.skew ?? 0;
  const sx = scaleX * (f.scaleX || 1);
  // size the font so the cap height of this text is `px`
  const probe = makeCanvas(8, 8).getContext('2d');
  probe.font = fontCss(font, 100);
  const m = probe.measureText(text);
  const capH = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || 72;
  const size = (100 * px) / capH;
  probe.font = fontCss(font, size);
  const track = (tracking + (f.tracking || 0)) * size;
  const chars = [...text];
  const adv = chars.map((ch) => probe.measureText(ch).width + track);
  const whole = probe.measureText(text).width + track * chars.length;
  const totalW = (arch ? adv.reduce((s, x) => s + x, 0) : whole) * sx;
  const rise = Math.abs(arch) * px;
  const pad = Math.ceil(w1 + w2 + px * 0.12 + Math.abs(k) * px * 0.5);
  const W = Math.ceil(totalW + Math.abs(k) * px + pad * 2), H = Math.ceil(px + rise + pad * 2);
  const asc = (m.actualBoundingBoxAscent / capH) * px;
  const baseY = pad + (arch > 0 ? rise : 0) + asc;

  const draw = (ctx, strokeW) => {
    ctx.save();
    ctx.font = fontCss(font, size);
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineWidth = strokeW * 2;
    const put = (str, x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, 1);
      if (k) ctx.transform(1, 0, k, 1, 0, 0);
      if (strokeW) ctx.strokeText(str, 0, 0);
      ctx.fillText(str, 0, 0);
      ctx.restore();
    };
    const x0 = pad + Math.max(0, k) * px;
    if (!arch) {
      ctx.textAlign = 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${track}px`;
      put(text, x0, baseY);
    } else {
      ctx.textAlign = 'center';
      let x = 0;
      chars.forEach((ch, i) => {
        const cx = x + adv[i] / 2;
        const t = (cx / (totalW / sx)) * 2 - 1;          // -1 .. 1 across the plate
        put(ch, x0 + cx * sx, baseY - arch * px * (1 - t * t));
        x += adv[i];
      });
    }
    ctx.restore();
  };
  // the face is set in the font; outlines grow from it like stacked twill
  const faceC = cpuCanvas(W, H);
  draw(faceC.getContext('2d'), 0);
  const a0 = alphaOf(faceC);
  const sd = (w1 || w2) ? signedDistance(a0, W, H) : null;
  const layers = [];
  if (bg) {
    const c = cpuCanvas(W, H);
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    const r = H * 0.18;
    g.beginPath();
    g.roundRect ? g.roundRect(pad * 0.4, H * 0.1, W - pad * 0.8, H * 0.8, r) : g.rect(pad * 0.4, H * 0.1, W - pad * 0.8, H * 0.8);
    g.fill();
    layers.push({ mask: c, color: bg });
  }
  const offset = (r) => { const o = new Float32Array(W * H); for (let i = 0; i < W * H; i++) o[i] = sd[i] - r; return o; };
  if (w2) { const a = grow(sd, w1 + w2); layers.push({ alpha: a, sd: offset(w1 + w2), mask: maskCanvas(a, W, H), color: c2 }); }
  if (w1) { const a = grow(sd, w1); layers.push({ alpha: a, sd: offset(w1), mask: maskCanvas(a, W, H), color: c1 }); }
  layers.push({ alpha: a0, sd: sd || undefined, mask: faceC, color: fill });
  return { layers, W, H, aspect: W / H, inkHeight: px / H, px };
}

// Flattened lettering canvas (kept for callers that just want the picture).
export function letteringCanvas(text, colors, font, opts = {}) {
  const L = letteringLayers(text, colors, font, opts);
  const out = makeCanvas(L.W, L.H);
  const ctx = out.getContext('2d');
  for (const l of L.layers) {
    const t = makeCanvas(L.W, L.H);
    const g = t.getContext('2d');
    g.drawImage(l.mask, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = l.color; g.fillRect(0, 0, L.W, L.H);
    ctx.drawImage(t, 0, 0);
  }
  return { canvas: out, aspect: L.aspect, inkHeight: L.inkHeight, layers: L.layers, px: L.px };
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

// The Nike swoosh (24-unit artwork), pointing right; mirror for the other side.
const SWOOSH = 'M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.28 1.195-.028 2.072.756 2.632.373.261.886.392 1.54.392.522 0 1.11-.084 1.764-.252L24 7.8z';
export function swooshCanvas(color, px = 256, { mirror = false } = {}) {
  // artwork spans x 0..24, y 7.8..16.2
  const s = (px * 2) / 26, pad = px * 0.04;
  const c = makeCanvas(px * 2 + pad * 2, Math.ceil(8.6 * s + pad * 2));
  const ctx = c.getContext('2d');
  ctx.translate(pad, pad - 7.7 * s);
  if (mirror) { ctx.translate(24 * s, 0); ctx.scale(-1, 1); }
  ctx.scale(s, s);
  ctx.fillStyle = color;
  if (typeof Path2D !== 'undefined') ctx.fill(new Path2D(SWOOSH));
  return c;
}

// Jock tag: the woven label at the lower left front of every Nike NFL
// jersey with the NFL shield, the size and the swoosh.
export function jockTagCanvas(shieldImg, { size = '44', bg = '#2B2D30', fg = '#E9EAEC', px = 256 } = {}) {
  const W = px, H = Math.round(px * 1.18);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = W * 0.08;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(W * 0.02, H * 0.02, W * 0.96, H * 0.96, r) : ctx.rect(W * 0.02, H * 0.02, W * 0.96, H * 0.96);
  ctx.fill();
  // woven border
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = W * 0.018;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(W * 0.07, H * 0.06, W * 0.86, H * 0.88, r * 0.7) : ctx.rect(W * 0.07, H * 0.06, W * 0.86, H * 0.88);
  ctx.stroke();
  if (shieldImg) {
    const h = H * 0.42, w = h * (shieldImg.width / shieldImg.height);
    ctx.drawImage(shieldImg, (W - w) / 2, H * 0.1, w, h);
  }
  ctx.fillStyle = fg;
  ctx.font = `700 ${Math.round(H * 0.2)}px "Saira Condensed", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(size, W / 2, H * 0.76);
  const sw = swooshCanvas(fg, 64);
  const sh = W * 0.28;
  ctx.drawImage(sw, (W - sh) / 2, H * 0.8, sh, sh * (sw.height / sw.width));
  // woven texture
  ctx.globalAlpha = 0.08; ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;
  return c;
}

// ─── knit collar band ─────────────────────────────────────────────────
// u runs around the neckline, v across the band (0 = rolled neck edge, 1 = outer edge).
export function paintCollar(jersey, meta) {
  const W = 1024, H = 64;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const wCm = (meta.collar?.width || 0.03) * 100;
  const bands = Array.isArray(jersey.collar) ? jersey.collar
    : [[jersey.collar || jersey.base, wCm]];
  const v0 = 0.08, v1 = 0.95;
  ctx.fillStyle = bands[0][0] || jersey.base;
  ctx.fillRect(0, 0, W, H);
  let acc = 0;
  const total = Math.max(wCm, bands.reduce((a, [, w]) => a + w, 0));
  for (const [col, w] of bands) {
    const y0 = (v0 + (acc / total) * (v1 - v0)) * H;
    acc += w;
    const y1 = (v0 + (acc / total) * (v1 - v0)) * H;
    ctx.fillStyle = col || jersey.base;
    ctx.fillRect(0, y0, W, y1 - y0 + 0.5);
  }
  // anything past the last band is jersey colour
  const yEnd = (v0 + (acc / total) * (v1 - v0)) * H;
  ctx.fillStyle = jersey.base;
  ctx.fillRect(0, yEnd, W, H - yEnd);
  if (jersey.collarStars) {
    // small stars set into the front of the collar either side of the V (Patriots Nor'easter)
    const { c: col, n = 3 } = jersey.collarStars;
    const vu = meta.collar?.v_point_u ?? 0.5;
    ctx.fillStyle = col;
    for (const side of [-1, 1]) {
      for (let k = 0; k < n; k++) {
        const u = vu + side * (0.05 + k * 0.065);
        const x = u * W, y = H * 0.52, R = H * 0.3;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.42 : R;
          i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.fill();
      }
    }
  }
  // knit ribs
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#000';
  for (let x = 0; x < W; x += 4) ctx.fillRect(x, 0, 1.5, H);
  ctx.globalAlpha = 1;
  return c;
}
