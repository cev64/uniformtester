import * as THREE from 'three';

// Builds a lofted tube from a stack of (super)elliptical rings.
//
// Vertices on every ring are spaced evenly by arc length, so a texture's u
// axis is proportional to real distance around the garment. That lets the
// painters draw numbers and stripes in centimetres without distortion.
//
// Winding: t runs clockwise seen from above, starting at angle a0 (0 = +x).
// With a0 = 0: u=0 → right side (+x), 0.25 → back, 0.5 → left, 0.75 → front.
// Text painted on the canvas reads correctly from outside the tube.

const SAMPLES = 256;

function superPoint(a, rx, rz, n) {
  const c = Math.cos(a), s = Math.sin(a);
  const e = 2 / n;
  return [rx * Math.sign(c) * Math.abs(c) ** e, rz * Math.sign(s) * Math.abs(s) ** e];
}

// Catmull-Rom through a table of rows, evaluated on a dense y grid.
export function interpProfile(table, count) {
  const keys = Object.keys(table[0]);
  const out = [];
  const y0 = table[0].y, y1 = table[table.length - 1].y;
  for (let i = 0; i < count; i++) {
    const y = y0 + (y1 - y0) * (i / (count - 1));
    let k = 0;
    while (k < table.length - 2 && ((y1 > y0) ? y > table[k + 1].y : y < table[k + 1].y)) k++;
    const p0 = table[Math.max(0, k - 1)], p1 = table[k], p2 = table[k + 1], p3 = table[Math.min(table.length - 1, k + 2)];
    const t = (y - p1.y) / (p2.y - p1.y);
    const row = {};
    for (const key of keys) {
      const a = p0[key] ?? p1[key], b = p1[key], c = p2[key], d = p3[key] ?? c;
      row[key] = 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    }
    row.y = y;
    out.push(row);
  }
  return out;
}

/**
 * rings: [{ y, rx, rz, n?, cx?, cz? }] ordered from v=0 to v=1
 * returns { geometry, meta } where meta can map y → v and y → perimeter
 */
export function buildTube(rings, { segments = 96, a0 = 0 } = {}) {
  const nr = rings.length;
  const positions = new Float32Array(nr * (segments + 1) * 3);
  const uvs = new Float32Array(nr * (segments + 1) * 2);
  const perims = [];
  const vs = [];

  // v by cumulative arc length along the profile
  let acc = 0;
  for (let i = 0; i < nr; i++) {
    if (i > 0) {
      const a = rings[i - 1], b = rings[i];
      const dr = ((b.rx + b.rz) - (a.rx + a.rz)) / 2;
      acc += Math.hypot(b.y - a.y, dr, (b.cx || 0) - (a.cx || 0), (b.cz || 0) - (a.cz || 0));
    }
    vs.push(acc);
  }
  const total = acc || 1;

  const sx = new Float64Array(SAMPLES + 1), sz = new Float64Array(SAMPLES + 1), cum = new Float64Array(SAMPLES + 1);
  for (let i = 0; i < nr; i++) {
    const r = rings[i];
    const n = r.n ?? 2;
    for (let k = 0; k <= SAMPLES; k++) {
      const a = a0 - (2 * Math.PI * k) / SAMPLES;
      const [x, z] = superPoint(a, r.rx, r.rz, n);
      sx[k] = x; sz[k] = z;
      cum[k] = k === 0 ? 0 : cum[k - 1] + Math.hypot(x - sx[k - 1], z - sz[k - 1]);
    }
    const per = cum[SAMPLES];
    perims.push(per);
    let s = 0;
    for (let j = 0; j <= segments; j++) {
      const target = (per * j) / segments;
      while (s < SAMPLES - 1 && cum[s + 1] < target) s++;
      const f = (target - cum[s]) / Math.max(1e-9, cum[s + 1] - cum[s]);
      const x = sx[s] + (sx[s + 1] - sx[s]) * f;
      const z = sz[s] + (sz[s + 1] - sz[s]) * f;
      const idx = i * (segments + 1) + j;
      positions[idx * 3] = x + (r.cx || 0);
      positions[idx * 3 + 1] = r.y;
      positions[idx * 3 + 2] = z + (r.cz || 0);
      uvs[idx * 2] = j / segments;
      uvs[idx * 2 + 1] = vs[i] / total;
    }
  }

  const index = [];
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      // clockwise ring order → this winding faces outward
      if (rings[i + 1].y > rings[i].y) index.push(a, b, c, b, d, c);
      else index.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();

  // Weld the normals across the u seam so there is no lighting crease.
  const nrm = g.attributes.normal;
  for (let i = 0; i < nr; i++) {
    const a = i * (segments + 1), b = a + segments;
    const x = nrm.getX(a) + nrm.getX(b), y = nrm.getY(a) + nrm.getY(b), z = nrm.getZ(a) + nrm.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    nrm.setXYZ(a, x / l, y / l, z / l);
    nrm.setXYZ(b, x / l, y / l, z / l);
  }

  const ys = rings.map((r) => r.y);
  const lookup = (arr) => (y) => {
    const asc = ys[ys.length - 1] > ys[0];
    for (let i = 0; i < ys.length - 1; i++) {
      const lo = ys[i], hi = ys[i + 1];
      if ((asc && y >= lo && y <= hi) || (!asc && y <= lo && y >= hi)) {
        const f = (y - lo) / (hi - lo);
        return arr[i] + (arr[i + 1] - arr[i]) * f;
      }
    }
    return (asc ? y < ys[0] : y > ys[0]) ? arr[0] : arr[arr.length - 1];
  };

  const vNorm = vs.map((v) => v / total);
  const meta = {
    length: total,
    vAt: lookup(vNorm),
    perimAt: lookup(perims),
  };
  return { geometry: g, meta };
}
