// Cloth for the uniform: procedural knit textures and the fabric material.
//
// Every garment material samples three things on top of its colour map:
//   - a MACRO normal map in the garment's own UV space (seams, cover-stitch
//     rows, hem bindings, belt loops) painted at real centimetres from
//     player.json, like the colour maps in garments.js;
//   - two tiling MICRO normal maps (e.g. the Vapor body knit and the
//     laser-perforated mesh) repeated at their real size in cm, blended by
//   - a ZONE map in the same UV space: R = second micro weave (perforated
//     panels), G = ambient occlusion (seams, under the collar), B = smooth
//     stretch panels (micro relief turned down, a little more sheen).
// Micro maps carry a cavity term in alpha that darkens the pores/holes.
//
// The same material drives the number/letter/logo decals ('applique' mode):
// macro = the appliqué's own bevel + stitching normal map, micro = tackle
// twill, satin embroidery or the jersey knit showing through a heat press.

import * as THREE from 'three';
import { makeCanvas } from './paint.js';

// ─── height-field helpers ─────────────────────────────────────────────

// Separable box blur, repeated for a near-gaussian falloff.
export function blur(src, W, H, r, passes = 3, wrap = false) {
  r = Math.max(0, Math.round(r));
  if (!r) return Float32Array.from(src);
  let a = Float32Array.from(src), b = new Float32Array(W * H);
  const n = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[row + (wrap ? (k + W) % W : Math.min(W - 1, Math.max(0, k)))];
      for (let x = 0; x < W; x++) {
        b[row + x] = s / n;
        const xo = x - r, xi = x + r + 1;
        s += a[row + (wrap ? (xi % W) : Math.min(W - 1, xi))] - a[row + (wrap ? ((xo + W) % W) : Math.max(0, xo))];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += b[(wrap ? (k + H) % H : Math.min(H - 1, Math.max(0, k))) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = s / n;
        const yo = y - r, yi = y + r + 1;
        s += b[(wrap ? (yi % H) : Math.min(H - 1, yi)) * W + x] - b[(wrap ? ((yo + H) % H) : Math.max(0, yo)) * W + x];
      }
    }
  }
  return a;
}

// Tangent-space normal map from a height field (height in pixels of the map).
// flipY: whether the texture will be uploaded with flipY (canvas row 0 = v 1).
export function heightToNormal(h, W, H, { strength = 1, wrap = false, flipY = false, cavity = null } = {}) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const sy = flipY ? 0.5 : -0.5;
  for (let y = 0; y < H; y++) {
    const ya = wrap ? (y - 1 + H) % H : Math.max(0, y - 1), yb = wrap ? (y + 1) % H : Math.min(H - 1, y + 1);
    const r0 = y * W, ra = ya * W, rb = yb * W;
    for (let x = 0; x < W; x++) {
      const xa = x ? x - 1 : (wrap ? W - 1 : 0), xb = x < W - 1 ? x + 1 : (wrap ? 0 : W - 1);
      const nx = -(h[r0 + xb] - h[r0 + xa]) * 0.5 * strength;
      const ny = sy * (h[rb + x] - h[ra + x]) * strength;
      const l = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const i = (r0 + x) * 4;
      d[i] = (nx * l * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * l * 0.5 + 0.5) * 255;
      d[i + 2] = (l * 0.5 + 0.5) * 255;
      d[i + 3] = cavity ? Math.max(0, Math.min(255, cavity[r0 + x] * 255)) : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Height field drawn with canvas strokes: 128 grey = 0, white up, black down.
export function heightCanvas(W, H) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, W, H);
  return { c, ctx };
}
export function readHeight(c, scale = 1) {
  const { width: W, height: H } = c;
  const d = c.getContext('2d').getImageData(0, 0, W, H).data;
  const h = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) h[i] = ((d[i * 4] - 128) / 127) * scale;
  return h;
}

// tileable value noise
function hash(x, y, s) {
  let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const P = (v) => ((v % period) + period) % period;
  const a = hash(P(xi), P(yi), seed), b = hash(P(xi + 1), P(yi), seed);
  const c = hash(P(xi), P(yi + 1), seed), d = hash(P(xi + 1), P(yi + 1), seed);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ─── micro weaves (tileable, 512 px) ──────────────────────────────────
// Each returns { h, cav } at N×N. Sizes in comments are on the real garment.

const N = 512;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Jersey knit: columns ("wales") of V-shaped loops with tiny pores between
// them. cells: loops across the tile; pores: pore strength.
function knit(cells, { pores = 0.5, seed = 1, rows = cells } = {}) {
  const h = new Float32Array(N * N), cav = new Float32Array(N * N).fill(1);
  const cw = N / cells, ch = N / rows;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const gx = x / cw, gy = y / ch;
      const ci = Math.floor(gx), cj = Math.floor(gy);
      const lx = gx - ci - 0.5, ly = gy - cj - 0.5;
      // two slanted legs of the loop
      let v = 0;
      for (const s of [-1, 1]) {
        const px = lx - s * 0.22, py = ly;
        const ca = Math.cos(s * 0.5), sa = Math.sin(s * 0.5);
        const rx = (px * ca - py * sa) / 0.2, ry = (px * sa + py * ca) / 0.5;
        v = Math.max(v, 1 - (rx * rx + ry * ry));
      }
      const jitter = noise(gx * 2, gy * 2, cells * 2, seed) * 0.25;
      h[y * N + x] = Math.max(0, v) ** 0.6 * (0.85 + jitter);
      // pores where four loops meet
      const pd = Math.hypot(Math.abs(lx) - 0.5, ly - 0.5 * Math.sign(ly || 1));
      if (pores && pd < 0.18) cav[y * N + x] = 1 - pores * (1 - pd / 0.18);
    }
  }
  return { h, cav };
}

// Laser-perforated mesh: the knit with a staggered grid of round holes.
function perforated(cells, holes, rHole) {
  const { h, cav } = knit(cells, { pores: 0.35, seed: 5 });
  const step = N / holes;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const row = Math.floor(y / step);
      const ox = (row % 2) * step / 2;
      const lx = ((x - ox) % step + step) % step - step / 2, ly = (y % step) - step / 2;
      const d = Math.hypot(lx, ly) / (step * rHole);
      const i = y * N + x;
      if (d < 1.35) {
        // a raised lip round the hole, the hole itself sinks away
        const lip = d > 1 ? (1 - (d - 1) / 0.35) * 0.6 : 0;
        h[i] = d < 1 ? -1.2 * (1 - d * d) : h[i] + lip;
        if (d < 1) cav[i] = Math.min(cav[i], 0.12 + 0.88 * smooth(d));
      }
    }
  }
  return { h, cav };
}

// Twill: diagonal ribs. lines: ribs across the tile; dir: slope (integer for tiling)
function twill(lines, { dir = 2, yarn = 0.35, seed = 3, sharp = 1 } = {}) {
  const h = new Float32Array(N * N), cav = new Float32Array(N * N).fill(1);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = ((x + y * dir) / N) * lines;
      const f = t - Math.floor(t);
      let v = Math.sin(f * Math.PI) ** sharp;
      // yarn floats: bumps along each rib
      const along = ((x * dir - y) / N) * lines * 1.5;
      v *= 1 - yarn + yarn * (0.5 + 0.5 * Math.cos(along * Math.PI * 2));
      v += (noise(x / 8, y / 8, N / 8, seed) - 0.5) * 0.3;
      h[y * N + x] = v;
      cav[y * N + x] = 0.82 + 0.18 * Math.min(1, v * 1.4);
    }
  }
  return { h, cav };
}

// Rib knit: raised columns (socks, collar), knit loops inside the ribs.
function rib(ribs, loops) {
  const k = knit(ribs * 2, { pores: 0.15, seed: 9, rows: loops });
  const h = k.h;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = (x / N) * ribs;
      const f = t - Math.floor(t);
      const r = smooth(Math.abs(Math.sin(f * Math.PI)) * 1.6 - 0.3);
      h[y * N + x] = r * 2.2 + h[y * N + x] * 0.35 * r;
      k.cav[y * N + x] *= 0.72 + 0.28 * r;
    }
  }
  return k;
}

// Satin stitch embroidery: tightly packed parallel threads with staggered ends.
function satin(threads) {
  const h = new Float32Array(N * N), cav = new Float32Array(N * N).fill(1);
  const tw = N / threads;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // threads run at 30 degrees (rows advance 1 px in x per 2 px in y)
      const t = (x + y * 2) / tw;
      const ti = Math.floor(t), f = t - ti;
      const len = 0.28;
      const along = ((x * 2 - y) / N) / len + hash(((ti % threads) + threads) % threads, 0, 4);
      const g = along - Math.floor(along);
      const end = Math.min(g, 1 - g) * 12;
      const v = Math.sin(f * Math.PI) ** 0.7 * Math.min(1, end);
      h[y * N + x] = v;
      cav[y * N + x] = 0.78 + 0.22 * v;
    }
  }
  return { h, cav };
}

const MICRO_DEFS = {
  // Vapor body: fine double knit, ~1 mm loops; tile = 1.6 cm
  knit: { cm: 1.6, make: () => knit(16, { pores: 0.45 }), strength: 3.2 },
  // laser-perforated vent panels: knit + 1.2 mm holes on a 4 mm stagger
  perf: { cm: 2.0, make: () => perforated(16, 4, 0.2), strength: 3.2 },
  // sleeves / shoulder stretch panels: finer, flatter knit
  stretch: { cm: 1.2, make: () => knit(20, { pores: 0.2, seed: 2 }), strength: 2.0 },
  // game pants: stretch twill, ~0.8 mm ribs
  pantsTwill: { cm: 1.2, make: () => twill(14, { dir: 2, yarn: 0.25, sharp: 0.8 }), strength: 2.4 },
  // socks: 2x2 rib, 3 mm columns
  rib: { cm: 1.2, make: () => rib(4, 12), strength: 1.6 },
  // collar: finer 1x1 rib
  collarRib: { cm: 0.6, make: () => rib(4, 8), strength: 1.4 },
  // tackle twill appliqué: coarse 2/1 twill, the other diagonal
  tackle: { cm: 1.8, make: () => twill(9, { dir: -1, yarn: 0.45, sharp: 1.2, seed: 7 }), strength: 3.0 },
  // satin-stitch embroidery (logos, the collar shield)
  satin: { cm: 0.8, make: () => satin(14), strength: 2.5 },
};

const microCache = {};
export function microTexture(key, aniso = 8) {
  if (!microCache[key]) {
    const def = MICRO_DEFS[key];
    const { h, cav } = def.make();
    const c = heightToNormal(h, N, N, { strength: def.strength, wrap: true, cavity: cav });
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.flipY = false;
    t.anisotropy = aniso;
    t.colorSpace = THREE.NoColorSpace;
    t.userData.cm = def.cm;
    microCache[key] = t;
  }
  return microCache[key];
}

let flatNormal = null, neutralZone = null;
function flatNormalTex() {
  if (!flatNormal) {
    flatNormal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
    flatNormal.needsUpdate = true;
  }
  return flatNormal;
}
function neutralZoneTex() {
  if (!neutralZone) {
    neutralZone = new THREE.DataTexture(new Uint8Array([0, 255, 0, 255]), 1, 1);
    neutralZone.needsUpdate = true;
  }
  return neutralZone;
}

// ─── the material ─────────────────────────────────────────────────────

const FRAG_MAPS = /* glsl */`
#ifdef USE_NORMALMAP_TANGENTSPACE
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	vec4 fzone = texture2D( uZone, vNormalMapUv );
	vec2 fcm = vNormalMapUv * uCm;
	vec4 fmA = texture2D( uMicroA, fcm / uTile.x );
	vec4 fmB = texture2D( uMicroB, fcm / uTile.y );
	vec4 fm = mix( fmA, fmB, fzone.r );
	vec3 fmN = fm.xyz * 2.0 - 1.0;
	fmN.xy *= uMicro * ( 1.0 - uSmooth * fzone.b );
	// whiteout blend of macro and micro detail
	vec3 fN = normalize( vec3( mapN.xy + fmN.xy, mapN.z * fmN.z ) );
	normal = normalize( tbn * fN );
	float fcav = mix( 1.0, fm.a, uCavity ) * mix( 1.0, fzone.g, uAO );
	diffuseColor.rgb *= fcav;
	roughnessFactor = clamp( roughnessFactor + fzone.r * uPerfRough - fzone.b * uSmoothGloss + ( 1.0 - fm.a ) * uCavity * 0.15, 0.04, 1.0 );
#endif
`;

/**
 * A cloth material. Options:
 *   micro: [keyA, keyB]   micro weaves (MICRO_DEFS keys); B is used where zone.r = 1
 *   cm: [u, v]            real size of the UV square in cm (sets the weave scale)
 *   macro: texture        UV-space normal map (or null for flat)
 *   zone: texture         UV-space zone map (or null)
 *   microStrength, cavity, ao, smooth, smoothGloss, perfRough
 * plus any MeshPhysicalMaterial parameters.
 */
export function fabricMaterial({
  micro = ['knit', 'perf'], cm = [100, 70], macro = null, zone = null, macroScale = 1,
  microStrength = 0.6, cavity = 0.5, ao = 1, smooth = 0.6, smoothGloss = 0.08, perfRough = 0.06, aniso = 8,
  ...params
} = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.8, metalness: 0, sheen: 0.4, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.22, 0.22, 0.22),
    side: THREE.DoubleSide, ...params,
  });
  mat.normalMap = macro || flatNormalTex();
  mat.normalScale = new THREE.Vector2(macroScale, macroScale);
  const A = microTexture(micro[0], aniso), B = microTexture(micro[1] || micro[0], aniso);
  const U = {
    uMicroA: { value: A }, uMicroB: { value: B }, uZone: { value: zone || neutralZoneTex() },
    uCm: { value: new THREE.Vector2(...cm) }, uTile: { value: new THREE.Vector2(A.userData.cm, B.userData.cm) },
    uMicro: { value: microStrength }, uCavity: { value: cavity }, uAO: { value: ao },
    uSmooth: { value: smooth }, uSmoothGloss: { value: smoothGloss }, uPerfRough: { value: perfRough },
  };
  mat.userData.fabric = U;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <normalmap_pars_fragment>', `#include <normalmap_pars_fragment>
uniform sampler2D uMicroA; uniform sampler2D uMicroB; uniform sampler2D uZone;
uniform vec2 uCm; uniform vec2 uTile;
uniform float uMicro; uniform float uCavity; uniform float uAO; uniform float uSmooth; uniform float uSmoothGloss; uniform float uPerfRough;`)
      .replace('#include <normal_fragment_maps>', FRAG_MAPS);
  };
  mat.customProgramCacheKey = () => 'fabric1';
  return mat;
}

// Swap the micro weaves / scale of an existing fabric material.
export function setFabric(mat, { micro, cm, microStrength, cavity } = {}) {
  const U = mat.userData.fabric;
  if (!U) return;
  if (micro) {
    const A = microTexture(micro[0]), B = microTexture(micro[1] || micro[0]);
    U.uMicroA.value = A; U.uMicroB.value = B;
    U.uTile.value.set(A.userData.cm, B.userData.cm);
  }
  if (cm) U.uCm.value.set(...cm);
  if (microStrength != null) U.uMicro.value = microStrength;
  if (cavity != null) U.uCavity.value = cavity;
}

// ─── garment construction maps (UV space) ─────────────────────────────

const circAt = (region, v) => {
  const c = region.circumference;
  const f = Math.min(1, Math.max(0, v)) * (c.length - 1);
  const i = Math.floor(f);
  return c[i] + (c[Math.min(c.length - 1, i + 1)] - c[i]) * (f - i);
};

// A sewn seam along a canvas path: the folded seam allowance is a raised
// strip, the join itself a groove, with a row of cover stitches each side.
// pxPerCm: scale; path(g) traces the seam.
function seam(ctx, path, pxPerCm, { rows = 2, gap = 0.55, ridge = 0.9 } = {}) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // raised allowance
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = ridge * pxPerCm;
  ctx.beginPath(); path(ctx); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = ridge * 0.6 * pxPerCm;
  ctx.beginPath(); path(ctx); ctx.stroke();
  // the join
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = Math.max(1, 0.1 * pxPerCm);
  ctx.beginPath(); path(ctx); ctx.stroke();
  ctx.restore();
  // stitch rows: drawn as dashes offset from the join (shadowBlur-free offset via lineDash on a wide stroke)
  if (rows) {
    for (const s of rows === 2 ? [-1, 1] : [1]) {
      ctx.save();
      ctx.setLineDash([0.32 * pxPerCm, 0.16 * pxPerCm]);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = Math.max(1, 0.06 * pxPerCm);
      ctx.beginPath();
      ctx.translate(0, 0);
      path(ctx, s * gap * pxPerCm * 0.5);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// polyline helper with a sideways offset (for stitch rows beside a seam)
function polyPath(pts) {
  return (g, off = 0) => {
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [xa, ya] = pts[Math.max(0, i - 1)], [xb, yb] = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(yb - ya), ny = xb - xa;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      const X = x + nx * off, Y = y + ny * off;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    }
  };
}
const curve = (a, b, c, n = 24) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, s = 1 - t;
  return [s * s * a[0] + 2 * s * t * b[0] + t * t * c[0], s * s * a[1] + 2 * s * t * b[1] + t * t * c[1]];
});

function finish(hc, W, H, strength, aniso, blurPx = 1, extra = null) {
  let h = readHeight(hc);
  if (blurPx) h = blur(h, W, H, blurPx, 2, true);
  if (extra) extra(h);
  const t = new THREE.CanvasTexture(heightToNormal(h, W, H, { strength, wrap: true }));
  t.flipY = false; t.anisotropy = aniso; t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
function zoneTex(c, aniso) {
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; t.anisotropy = aniso; t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Torso panel layout shared by the macro and zone maps.
// Returns canvas-space paths for a W×H map (row = (1 - v) * H).
function torsoLayout(meta, W, H) {
  const gs = meta.ground_shift || 0, z0 = meta.jersey.z0 + gs, z1 = meta.jersey.z1 + gs;
  const V = (z) => (z - z0) / (z1 - z0);
  const sh = meta.joints['upperarm01.L'];
  const top = V(meta.constants.neck_z - 0.03), bot = V(sh[2] - 0.09);
  const P = (u, v) => [u * W, (1 - v) * H];
  const raglans = [];
  for (const [ua, ub] of [[0.572, 0.672], [0.885, 0.8]]) {
    for (const m of [false, true]) {
      const f = (u) => (m ? 1 - u : u);
      raglans.push(curve(P(f(ua), top), P(f((ua + ub) / 2 + (ub - ua) * 0.08), (top + bot) / 2), P(f(ub), bot)));
    }
  }
  // side vent panels between the armpit and the hem, ~7 cm wide
  // bottom of the armhole (the sleeve covers the torso above it)
  const armpit = V(sh[2] - 0.2);
  const sides = [0.25, 0.75].map((u) => ({ u, half: 0.034, top: armpit }));
  return { V, top, bot, armpit, raglans, sides, P };
}

export function torsoDetail(meta, aniso = 8) {
  const W = 2048, H = 1024;
  const R = meta.regions.jersey;
  const pxPerCm = H / (R.length * 100);
  const L = torsoLayout(meta, W, H);
  const { c: hc, ctx } = heightCanvas(W, H);
  // raglan seams
  for (const pts of L.raglans) seam(ctx, polyPath(pts), pxPerCm);
  // vent panels: seams down both edges, from the armpit to the hem
  for (const s of L.sides) {
    for (const e of [-1, 1]) {
      const pts = [];
      for (let v = 0; v <= s.top; v += 0.02) {
        const k = (circAt(R, 0.45) / circAt(R, v));
        pts.push(L.P(s.u + e * s.half * k, v));
      }
      seam(ctx, polyPath(pts), pxPerCm, { rows: 1 });
    }
  }
  // hem: folded edge with a twin-needle cover stitch
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, H - 2.2 * pxPerCm, W, 2.2 * pxPerCm);
  for (const cm of [1.4, 2.0]) {
    ctx.save(); ctx.setLineDash([0.32 * pxPerCm, 0.16 * pxPerCm]);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.08 * pxPerCm;
    ctx.beginPath(); ctx.moveTo(0, H - cm * pxPerCm); ctx.lineTo(W, H - cm * pxPerCm); ctx.stroke(); ctx.restore();
  }
  // neckline: the collar is sewn on with a cover stitch just below it
  if (meta.collar?.front_uv) {
    const pts = meta.collar.front_uv.map(([u, v]) => [u * W, (1 - v) * H + 0.9 * pxPerCm]);
    seam(ctx, polyPath(pts), pxPerCm, { rows: 1, ridge: 0.6 });
  }
  return finish(hc, W, H, 3.0, aniso, 1, (h) => torsoWrinkles(h, W, H, meta, L));
}

// Soft folds where a game jersey really creases: ripples round the waist
// where it is tucked and belted, and drape folds fanning down from under
// the arms. Heights in the same units as the seam map.
function torsoWrinkles(h, W, H, meta, L) {
  const R = meta.regions.jersey;
  const Lcm = R.length * 100;
  const cells = 24;
  for (let y = 0; y < H; y++) {
    const v = 1 - y / H, vcm = v * Lcm;
    const circ = circAt(R, v) * 100;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let z = 0;
      // waist: soft, irregular ripples where the jersey is tucked and belted
      if (v < 0.24) {
        const env = smooth((0.24 - v) / 0.12) * (0.2 + 0.8 * noise(u * cells, v * 5, cells, 11) ** 2);
        const ph = noise(u * cells * 0.5, v * 3, cells / 2, 12) * 7;
        z += env * 0.55 * Math.sin((vcm / (2.4 + noise(u * cells, 1.7, cells, 14) * 1.6)) * Math.PI * 2 + ph);
      }
      // under the arms: folds fanning down and out from the bottom of the armhole
      for (const su of [0.265, 0.735]) {
        let du = u - su;
        du = du - Math.round(du);
        const dx = du * circ, dy = vcm - L.armpit * Lcm;
        const r = Math.hypot(dx, dy);
        if (r > 24 || dy > 1) continue;
        const ang = Math.atan2(dy, dx);
        const env = smooth(r / 4) * Math.exp(-r / 9) * smooth((24 - r) / 8) * smooth((1 - dy) / 3);
        z += env * 0.9 * Math.sin(ang * 6 + noise(r * 0.25, ang * 2, 64, 13) * 2.5);
      }
      h[y * W + x] += z;
    }
  }
}

export function torsoZones(meta, aniso = 8) {
  const W = 1024, H = 512;
  const R = meta.regions.jersey;
  const pxPerCm = H / (R.length * 100);
  const L = torsoLayout(meta, W, H);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(0,255,0)';
  ctx.fillRect(0, 0, W, H);
  // R: perforated vent panels at the sides and the lower back
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgb(255,0,0)';
  for (const s of L.sides) {
    for (let y = Math.floor((1 - s.top) * H); y < H; y += 2) {
      const v = 1 - y / H;
      const k = circAt(R, 0.45) / circAt(R, v);
      const x0 = (s.u - s.half * k) * W, x1 = (s.u + s.half * k) * W;
      ctx.fillRect(x0, y, x1 - x0, 2);
    }
  }
  // centre back: a tall perforated panel down the spine
  for (const cu of [0, 1]) {
    ctx.beginPath();
    ctx.ellipse(cu * W, (1 - 0.36) * H, 0.07 * W, 0.26 * H, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // B: smooth stretch over the shoulders, between the front and back raglan seams
  ctx.fillStyle = 'rgb(0,0,255)';
  for (const m of [0, 1]) {
    const f = m ? L.raglans[1] : L.raglans[0];
    const b = m ? L.raglans[3] : L.raglans[2];
    ctx.beginPath();
    f.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    [...b].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // soften panel edges a touch so the knit change isn't a hard line
  const d = ctx.getImageData(0, 0, W, H);
  void d;
  // G: occlusion along seams and under the collar
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = 'rgb(255,200,255)';
  ctx.lineWidth = 0.6 * pxPerCm;
  for (const pts of L.raglans) { ctx.beginPath(); polyPath(pts)(ctx); ctx.stroke(); }
  if (meta.collar?.front_uv) {
    ctx.strokeStyle = 'rgb(255,170,255)';
    ctx.lineWidth = 1.6 * pxPerCm;
    ctx.beginPath();
    meta.collar.front_uv.forEach(([u, v], i) => (i ? ctx.lineTo(u * W, (1 - v) * H) : ctx.moveTo(u * W, (1 - v) * H)));
    ctx.stroke();
  }
  // under the arms
  ctx.fillStyle = 'rgb(255,215,255)';
  for (const u of [0.25, 0.75]) {
    const g = ctx.createRadialGradient(u * W, (1 - L.armpit) * H, 0, u * W, (1 - L.armpit) * H, 0.08 * W);
    g.addColorStop(0, 'rgb(255,190,255)'); g.addColorStop(1, 'rgb(255,255,255)');
    ctx.fillStyle = g;
    ctx.fillRect(u * W - 0.08 * W, (1 - L.armpit) * H - 0.08 * W, 0.16 * W, 0.16 * W);
  }
  ctx.globalCompositeOperation = 'source-over';
  return zoneTex(c, aniso);
}

export function sleeveDetail(meta, aniso = 8) {
  const W = 1024, H = 512;
  const R = meta.regions.sleeve;
  const pxPerCm = H / (R.length * 100);
  const { c: hc, ctx } = heightCanvas(W, H);
  // hem: turned-back edge and a twin-needle cover stitch
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0, H - 2.4 * pxPerCm, W, 2.4 * pxPerCm);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, H - 0.5 * pxPerCm, W, 0.5 * pxPerCm);
  for (const cm of [1.5, 2.1]) {
    ctx.save(); ctx.setLineDash([0.3 * pxPerCm, 0.15 * pxPerCm]);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 0.09 * pxPerCm;
    ctx.beginPath(); ctx.moveTo(0, H - cm * pxPerCm); ctx.lineTo(W, H - cm * pxPerCm); ctx.stroke(); ctx.restore();
  }
  return finish(hc, W, H, 2.5, aniso);
}

export function sleeveZones(meta, aniso = 8) {
  const W = 256, H = 128;
  const R = meta.regions.sleeve;
  const pxPerCm = H / (R.length * 100);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(0,255,255)';         // smooth stretch everywhere
  ctx.fillRect(0, 0, W, H);
  // occlusion in the hem fold
  ctx.fillStyle = 'rgb(0,225,255)';
  ctx.fillRect(0, H - 2.4 * pxPerCm, W, 0.35 * pxPerCm);
  return zoneTex(c, aniso);
}

// Pants: waistband with belt loops, knee band, inseam
export function pantsDetail(meta, aniso = 8, loops = [0.3, 0.7]) {
  const W = 1024, H = 1024;
  const R = meta.regions.pants;
  const pxPerCm = H / (R.length * 100);
  const { c: hc, ctx } = heightCanvas(W, H);
  const pxX = (v) => W / (circAt(R, v) * 100);
  // waistband
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 0, W, 3.6 * pxPerCm);
  for (const cm of [0.5, 3.4]) {
    ctx.save(); ctx.setLineDash([0.3 * pxPerCm, 0.15 * pxPerCm]);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.08 * pxPerCm;
    ctx.beginPath(); ctx.moveTo(0, cm * pxPerCm); ctx.lineTo(W, cm * pxPerCm); ctx.stroke(); ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.12 * pxPerCm;
  ctx.beginPath(); ctx.moveTo(0, 3.65 * pxPerCm); ctx.lineTo(W, 3.65 * pxPerCm); ctx.stroke();
  // belt loops: 1.3 cm wide, from the top of the band down 5 cm, stitched at both ends
  const lw = 1.3 * pxX(0.97);
  for (const u of loops) {
    const x = u * W - lw / 2;
    const g = ctx.createLinearGradient(x, 0, x + lw, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.2, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 2, 0, lw + 4, 5.3 * pxPerCm);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, lw, 5 * pxPerCm);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (const cm of [0.6, 4.4]) ctx.fillRect(x + lw * 0.1, cm * pxPerCm, lw * 0.8, 0.12 * pxPerCm);
  }
  // knee band: elastic hem
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, H - 2.4 * pxPerCm, W, 2.4 * pxPerCm);
  ctx.save(); ctx.setLineDash([0.3 * pxPerCm, 0.15 * pxPerCm]);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.08 * pxPerCm;
  for (const cm of [1.8, 2.3]) { ctx.beginPath(); ctx.moveTo(0, H - cm * pxPerCm); ctx.lineTo(W, H - cm * pxPerCm); ctx.stroke(); }
  ctx.restore();
  // inseam (u = 0 / 1) and a seam down the back of the leg
  for (const u of [0, 1]) seam(ctx, (g, off = 0) => { g.moveTo(u * W + off, 4 * pxPerCm); g.lineTo(u * W + off, H); }, pxPerCm, { rows: 2, gap: 0.6 });
  // soft drape wrinkles behind the knee and across the hip
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 6; i++) {
    const y = H - (6 + i * 1.8) * pxPerCm;
    const g = ctx.createLinearGradient(0, y - pxPerCm, 0, y + pxPerCm);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    for (const cu of [0.0, 1.0]) ctx.fillRect(cu * W - 0.18 * W, y - pxPerCm, 0.36 * W, 2 * pxPerCm);
  }
  ctx.restore();
  return finish(hc, W, H, 2.4, aniso);
}

export function collarDetail(meta, aniso = 8) {
  const W = 1024, H = 64;
  const { c: hc, ctx } = heightCanvas(W, H);
  // the band is folded at the neck edge and sewn down at the outer edge
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgb(90,90,90)'); g.addColorStop(0.12, 'rgb(150,150,150)'); g.addColorStop(0.85, 'rgb(135,135,135)'); g.addColorStop(1, 'rgb(100,100,100)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.setLineDash([3, 2]);
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1;
  for (const y of [0.8, 0.9]) { ctx.beginPath(); ctx.moveTo(0, y * H); ctx.lineTo(W, y * H); ctx.stroke(); }
  ctx.restore();
  return finish(hc, W, H, 2, aniso, 0);
}
