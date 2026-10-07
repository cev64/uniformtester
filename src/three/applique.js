// Appliqués: numbers, letters, patches and logos as the pieces of cloth (or
// heat-pressed film) they are on a real jersey.
//
// Input is a stack of layer masks, bottom to top, all the same canvas size
// (e.g. outer outline, inner outline, number face). The builder returns a
// colour canvas and a matching tangent-space normal map:
//   twill       tackle twill: each layer is a piece of cloth ~0.7 mm thick
//               with a soft cut edge, sewn down with a zig-zag stitch that
//               straddles its edge; each layer shades the one under it.
//   pressed     heat-applied: thin film with a hairline edge, no stitching,
//               the knit underneath printing through (set in the material).
//   embroidered satin-stitched patches/logos: puffy rounded edges.
//   print       sublimated/screen print: no relief at all.
// Both canvases are meant for textures uploaded with flipY = true (the
// default for decals), so canvas row 0 is the top of the decal.

import { heightToNormal } from './fabric.js';
import { signedDistance, alphaOf, cpuCanvas, grow } from './sdf.js';

const STYLE = {
  // thick: relief per layer; bevel: cut-edge width (mm); pillow: the cloth's
  // gentle doming over `pillowMm`; ao/halo: shading cast on the layer below /
  // on the jersey within aoMm, dropped by `drop` mm (light from above).
  twill: { thick: 1, bevel: 0.6, pillow: 0.6, pillowMm: 3, stitch: true, ao: 0.4, aoMm: 0.8, halo: 0.32, drop: 0.45 },
  pressed: { thick: 0.22, bevel: 0.2, pillow: 0, pillowMm: 0, stitch: false, ao: 0.25, aoMm: 0.5, halo: 0.22, drop: 0.15 },
  embroidered: { thick: 1, bevel: 1.0, pillow: 0.5, pillowMm: 1.5, stitch: false, ao: 0.35, aoMm: 0.9, halo: 0.45, drop: 0.3, edge: true },
  print: { thick: 0, bevel: 0, pillow: 0, pillowMm: 0, stitch: false, ao: 0, aoMm: 0, halo: 0, drop: 0 },
};
export const APPLIQUE_STYLES = Object.keys(STYLE);

function tintMask(mask, color) {
  const c = cpuCanvas(mask.width, mask.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ─── contours (marching squares) ──────────────────────────────────────

// Iso-lines of an alpha field at 0.5, sampled every `step` px, chained into
// polylines. Returns arrays of [x, y] in pixel coordinates.
export function contours(a, W, H, step = 2) {
  const gw = Math.floor((W - 1) / step), gh = Math.floor((H - 1) / step);
  const val = (gx, gy) => a[Math.min(H - 1, gy * step) * W + Math.min(W - 1, gx * step)];
  const T = 0.5;
  const pts = new Map();       // edge key -> [x, y]
  const adj = new Map();       // edge key -> [neighbour keys]
  const edgePt = (key, x0, y0, x1, y1, v0, v1) => {
    if (!pts.has(key)) {
      const t = (T - v0) / ((v1 - v0) || 1e-6);
      pts.set(key, [(x0 + (x1 - x0) * t) * step, (y0 + (y1 - y0) * t) * step]);
    }
    return key;
  };
  const link = (k1, k2) => {
    (adj.get(k1) || adj.set(k1, []).get(k1)).push(k2);
    (adj.get(k2) || adj.set(k2, []).get(k2)).push(k1);
  };
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const v0 = val(x, y), v1 = val(x + 1, y), v2 = val(x + 1, y + 1), v3 = val(x, y + 1);
      const idx = (v0 > T ? 1 : 0) | (v1 > T ? 2 : 0) | (v2 > T ? 4 : 0) | (v3 > T ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      // edges: top (0-1), right (1-2), bottom (3-2), left (0-3)
      const top = () => edgePt(`h${x},${y}`, x, y, x + 1, y, v0, v1);
      const right = () => edgePt(`v${x + 1},${y}`, x + 1, y, x + 1, y + 1, v1, v2);
      const bottom = () => edgePt(`h${x},${y + 1}`, x, y + 1, x + 1, y + 1, v3, v2);
      const left = () => edgePt(`v${x},${y}`, x, y, x, y + 1, v0, v3);
      switch (idx) {
        case 1: case 14: link(left(), top()); break;
        case 2: case 13: link(top(), right()); break;
        case 3: case 12: link(left(), right()); break;
        case 4: case 11: link(right(), bottom()); break;
        case 6: case 9: link(top(), bottom()); break;
        case 7: case 8: link(left(), bottom()); break;
        case 5: link(left(), top()); link(right(), bottom()); break;
        case 10: link(top(), right()); link(left(), bottom()); break;
        default: break;
      }
    }
  }
  const seen = new Set();
  const lines = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const line = [];
    let cur = start, prev = null;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      line.push(pts.get(cur));
      const nb = adj.get(cur) || [];
      const next = nb.find((k) => k !== prev && !seen.has(k));
      prev = cur; cur = next;
    }
    if (line.length > 4) lines.push(line);
  }
  return lines;
}

// Zig-zag (or satin) stitch along a polyline: amplitude/pitch in px.
function zigzag(ctx, line, amp, pitch) {
  // resample by arc length
  const n = line.length;
  const acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const L = acc[n - 1] + Math.hypot(line[0][0] - line[n - 1][0], line[0][1] - line[n - 1][1]);
  if (L < pitch * 3) return;
  const at = (s) => {
    s = ((s % L) + L) % L;
    let lo = 0, hi = n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (acc[m] <= s) lo = m; else hi = m - 1; }
    const a = line[lo], b = line[(lo + 1) % n];
    const seg = (lo + 1 < n ? acc[lo + 1] : L) - acc[lo] || 1;
    const t = (s - acc[lo]) / seg;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const steps = Math.max(6, Math.round(L / (pitch / 2)));
  const ds = L / steps;
  ctx.beginPath();
  for (let k = 0; k <= steps; k++) {
    const s = k * ds;
    const p = at(s), pa = at(s - pitch), pb = at(s + pitch);
    let nx = -(pb[1] - pa[1]), ny = pb[0] - pa[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const side = k % 2 ? 1 : -1;
    const x = p[0] + nx * amp * side, y = p[1] + ny * amp * side;
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

// ─── builder ──────────────────────────────────────────────────────────

/**
 * layers: [{ mask: canvas, color?: css, face?: canvas }], bottom to top.
 *   mask's alpha is the piece's shape; face (optional) is drawn instead of
 *   a flat colour (patterned faces, logo artwork).
 * pxPerMm: canvas pixels per millimetre on the garment.
 * Returns { color, normal } canvases.
 */
export function buildApplique(layers, { style = 'twill', pxPerMm = 2, halo = true } = {}) {
  const S = STYLE[style] || STYLE.twill;
  const W = layers[0].mask.width, H = layers[0].mask.height;
  const N = W * H;
  const alphas = layers.map((l) => l.alpha || alphaOf(l.mask));
  const need = S.thick || S.ao;
  const sds = need ? alphas.map((a, i) => layers[i].sd || signedDistance(a, W, H)) : [];
  const out = cpuCanvas(W, H);
  const ctx = out.getContext('2d');

  // stitch thread relief
  const thread = S.stitch ? cpuCanvas(W, H) : null;
  const tctx = thread?.getContext('2d');

  // composite colours, with each layer's stitching drawn on top of it
  layers.forEach((l, i) => {
    ctx.drawImage(l.face || tintMask(l.mask, l.color || '#fff'), 0, 0);
    if (S.stitch && l.stitch === 'straight' && sds[i]) {
      // a straight lock stitch a few mm inside the edge (nameplate strips)
      const inset = 3 * pxPerMm, lw = Math.max(0.6, 0.3 * pxPerMm);
      const lines = contours(grow(sds[i], -inset), W, H, Math.max(1, Math.round(pxPerMm * 0.6)));
      for (const g of [ctx, tctx]) {
        g.save();
        g.setLineDash([2.2 * pxPerMm, 0.9 * pxPerMm]);
        g.strokeStyle = g === ctx ? (l.thread || l.color || '#fff') : '#fff';
        g.lineWidth = lw;
        if (g === ctx) g.filter = 'brightness(1.08)';
        for (const ln of lines) { g.beginPath(); ln.forEach((q, k) => (k ? g.lineTo(...q) : g.moveTo(...q))); g.closePath(); g.stroke(); }
        g.restore();
      }
    } else if (S.stitch && l.stitch !== false) {
      const amp = Math.max(1, 0.85 * pxPerMm), pitch = Math.max(2, 0.95 * pxPerMm);
      const lw = Math.max(0.6, 0.26 * pxPerMm);
      const lines = contours(alphas[i], W, H, Math.max(1, Math.round(pxPerMm * 0.6)));
      // the thread: layer colour, a hair lighter, with a faint shadow under it
      ctx.save();
      ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = lw * 1.7;
      for (const ln of lines) zigzag(ctx, ln, amp, pitch);
      ctx.strokeStyle = l.thread || l.color || '#fff'; ctx.lineWidth = lw;
      for (const ln of lines) zigzag(ctx, ln, amp, pitch);
      ctx.globalAlpha = 0.18; ctx.strokeStyle = '#fff'; ctx.lineWidth = lw * 0.45;
      for (const ln of lines) zigzag(ctx, ln, amp, pitch);
      ctx.restore();
      tctx.save();
      // this piece covers the stitching of the pieces under it
      tctx.globalCompositeOperation = 'destination-out';
      tctx.drawImage(l.mask, 0, 0);
      tctx.globalCompositeOperation = 'source-over';
      tctx.strokeStyle = '#fff'; tctx.lineWidth = lw; tctx.lineJoin = 'miter';
      for (const ln of lines) zigzag(tctx, ln, amp, pitch);
      tctx.restore();
    }
  });

  // height field: each piece has a cut edge (bevel) and domes a little
  // (pillow); occlusion: each piece shades what's just outside it (the
  // layer below, or the jersey), dropped a little toward the bottom.
  const h = new Float32Array(N);
  const occl = new Float32Array(N);
  const bevelPx = Math.max(0.75, S.bevel * pxPerMm), pillowPx = Math.max(1, S.pillowMm * pxPerMm);
  const aoPx = Math.max(0.75, S.aoMm * pxPerMm), dy = Math.round(S.drop * pxPerMm);
  // how much of each piece is hidden under the pieces above it: a piece only
  // shades what is actually visible next to it
  const above = alphas.map(() => null);
  if (S.ao) {
    let acc = new Float32Array(N);
    for (let i = alphas.length - 1; i >= 0; i--) {
      above[i] = acc;
      const next = new Float32Array(N), a = alphas[i];
      for (let p = 0; p < N; p++) next[p] = acc[p] > a[p] ? acc[p] : a[p];
      acc = next;
    }
  }
  sds.forEach((sd, i) => {
    const a = alphas[i];
    if (S.thick) {
      // a piece lies over the stack below it: it sits on top of what's there
      // (the layers under it, which it hides apart from a faint show-through
      // of their edges) and adds its own cut edge and doming
      const t = S.thick * (layers[i].thick ?? 1);
      const floor = S.thick * i * 0.9;
      for (let p = 0; p < N; p++) {
        const ap = a[p];
        if (ap <= 0) continue;
        const d = Math.max(0, -sd[p]);
        const edge = S.edge ? Math.sqrt(sstep(-0.5, bevelPx, d)) : sstep(-0.5, bevelPx, d);
        const top = Math.max(floor, h[p]) * 0.9 + h[p] * 0.1 + t * (0.75 * edge + 0.25 + S.pillow * sstep(0, pillowPx, d));
        const covered = floor + t * (0.75 * edge + 0.25 + S.pillow * sstep(0, pillowPx, d)) + (h[p] - floor) * 0.12;
        h[p] = h[p] * (1 - ap) + ap * (i ? covered : top);
      }
    }
    if (S.ao) {
      const k = (i === 0 ? S.halo : S.ao) * (layers[i].halo ?? 1);
      for (let y = 0; y < H; y++) {
        const ys = Math.max(0, y - dy) * W;
        for (let x = 0; x < W; x++) {
          const p = y * W + x;
          if (a[p] >= 1) continue;
          const d = Math.max(0, sd[ys + x]);
          const o = k * Math.exp(-d / aoPx) * (1 - a[p]) * (1 - above[i][p]);
          if (o > occl[p]) occl[p] = o;
        }
      }
    }
  });
  if (thread) {
    const ta = alphaOf(thread);
    for (let p = 0; p < N; p++) h[p] += ta[p] * S.thick * 0.6;
  }

  // apply occlusion: darken covered pixels, add a soft contact shadow outside
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let p = 0; p < N; p++) {
    const o = occl[p];
    if (o < 0.004) continue;
    const q = p * 4;
    const al = d[q + 3] / 255;
    // shade the colour, and fill in transparent surroundings with shadow
    const f = 1 - o;
    d[q] *= f; d[q + 1] *= f; d[q + 2] *= f;
    if (halo && al < 1) {
      const sa = o * (1 - al);
      const na = al + sa;
      d[q] = (d[q] * al) / na; d[q + 1] = (d[q + 1] * al) / na; d[q + 2] = (d[q + 2] * al) / na;
      d[q + 3] = na * 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const normal = heightToNormal(h, W, H, { strength: 1.4, flipY: true });
  return { color: out, normal };
}

// Single-layer appliqué from artwork (a logo image or a drawn canvas).
export function imageApplique(img, { style = 'embroidered', pxPerMm = 2, maxPx = 1024 } = {}) {
  const k = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.max(4, Math.round(img.width * k)), h = Math.max(4, Math.round(img.height * k));
  const pad = Math.ceil(4 * pxPerMm * k) + 2;
  const face = cpuCanvas(w + pad * 2, h + pad * 2);
  face.getContext('2d').drawImage(img, pad, pad, w, h);
  const res = buildApplique([{ mask: face, face }], { style, pxPerMm: pxPerMm * k });
  return { ...res, padFrac: [pad / face.width, pad / face.height] };
}
