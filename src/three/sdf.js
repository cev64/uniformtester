// Distance fields for appliqué shapes.
//
// Outlines, bevels, stitch lines and contact shadows all depend on how far a
// pixel is from the edge of a shape. An exact Euclidean distance transform
// (Felzenszwalb & Huttenlocher) gives that in two linear passes, which is
// both more accurate (truly round outline corners) and far cheaper than
// stamping a canvas hundreds of times.

const INF = 1e20;

// 1-D squared distance transform of f (length n) into d; scratch v, z.
function dt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

// Euclidean distance (px) from every pixel to the nearest pixel where
// inside(i) is true.
function edt(W, H, inside) {
  const g = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = inside(i) ? 0 : INF;
  const n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = g[y * W + x];
    dt1(f, H, d, v, z);
    for (let y = 0; y < H; y++) g[y * W + x] = d[y];
  }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = g[y * W + x];
    dt1(f, W, d, v, z);
    for (let x = 0; x < W; x++) out[y * W + x] = Math.sqrt(d[x]);
  }
  return out;
}

// Signed distance to the 0.5 iso-line of an alpha field: < 0 inside.
export function signedDistance(a, W, H) {
  const dOut = edt(W, H, (i) => a[i] >= 0.5);
  const dIn = edt(W, H, (i) => a[i] < 0.5);
  const s = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) s[i] = a[i] >= 0.5 ? -(dIn[i] - 0.5) : dOut[i] - 0.5;
  return s;
}

// Alpha of the shape grown by r px (antialiased).
export function grow(sd, r) {
  const a = new Float32Array(sd.length);
  for (let i = 0; i < sd.length; i++) a[i] = Math.min(1, Math.max(0, r - sd[i] + 0.5));
  return a;
}

export function cpuCanvas(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d', { willReadFrequently: true });
  return c;
}

export function alphaOf(c) {
  const { width: W, height: H } = c;
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  const a = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
  return a;
}

// A canvas filled with `color` (default black) where alpha a is set.
export function maskCanvas(a, W, H, color = [0, 0, 0]) {
  const c = cpuCanvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let i = 0; i < W * H; i++) {
    d[i * 4] = color[0]; d[i * 4 + 1] = color[1]; d[i * 4 + 2] = color[2];
    d[i * 4 + 3] = a[i] * 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
