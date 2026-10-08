import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { paintFabricNormal, paintLogo, shade, luminance } from './paint.js';
import { paintTorso, paintSleeveTex, paintPantsTex, paintSocksTex, paintCollar, letteringLayers, eyeCanvas, swooshCanvas, jockTagCanvas } from './garments.js';
import { fabricMaterial, torsoDetail, torsoZones, sleeveDetail, sleeveZones, pantsDetail, collarDetail } from './fabric.js';
import { buildApplique, imageApplique } from './applique.js';
import { Helmet } from './helmet.js';
import { loadLogo } from './logos.js';
import { numeralLayers, numeralStyle, numeralPattern } from './numerals.js';
import { letterFont } from './fonts.js';
import { asset, loadGLB, loadJSON } from '../assets.js';

// The player: a sculpted athlete (tools/build_player.py → public/models/player.glb)
// dressed with painted garments and decals for numbers, names and logos.

// Photographic skin (MakeHuman CC0 textures) with a tint for in-between tones.
// SKIN_TONES are the swatch colours shown in the UI.
export const SKIN_TONES = ['#7A4B30', '#4E2F1E', '#B98563', '#E2B896'];
const SKIN = [
  { tex: 'dark', tint: '#ffffff' },
  { tex: 'dark', tint: '#9c8a7e' },
  { tex: 'light', tint: '#c9a080' },
  { tex: 'light', tint: '#ffffff' },
];
const skinTex = {};
function skinTexture(kind, aniso) {
  if (!skinTex[kind]) {
    const t = new THREE.TextureLoader().load(asset(`public/models/skin_${kind}.jpg`));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.flipY = false;   // glTF UVs have their origin at the top left
    skinTex[kind] = t;
  }
  return skinTex[kind];
}
// Tiling skin micro-normal: pores and fine creases from layered periodic
// value noise, repeated many times over the MakeHuman UV layout.
let skinNormalTex = null;
function skinNormal() {
  if (skinNormalTex) return skinNormalTex;
  const N = 256;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const h = new Float32Array(N * N);
  for (const [cells, amp] of [[64, 0.55], [32, 0.3], [16, 0.15]]) {
    const g = Array.from({ length: cells * cells }, rnd);
    const at = (i, j) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = (x / N) * cells, fy = (y / N) * cells;
      const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
      const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
      const a = at(i, j) + (at(i + 1, j) - at(i, j)) * su;
      const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * su;
      h[y * N + x] += (a + (b - a) * sv) * amp;
    }
  }
  // pores: small pits
  for (let k = 0; k < 2600; k++) {
    const x = Math.floor(rnd() * N), y = Math.floor(rnd() * N);
    h[y * N + x] -= 0.5;
  }
  const c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);
  const H = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 1.5, dy = (H(x, y + 1) - H(x, y - 1)) * 1.5;
    const l = Math.hypot(dx, dy, 1);
    const o = (y * N + x) * 4;
    img.data[o] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255;
    img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  skinNormalTex = new THREE.CanvasTexture(c);
  skinNormalTex.wrapS = skinNormalTex.wrapT = THREE.RepeatWrapping;
  skinNormalTex.repeat.set(40, 40);
  skinNormalTex.flipY = false;
  return skinNormalTex;
}

const MODEL_URL = 'public/models/player.glb';
const META_URL = 'public/models/player.json';

// Blender (z-up, facing -y) → three.js (y-up, facing +z)
const B2T = ([x, y, z]) => new THREE.Vector3(x, z, -y);

let fabricNormal = null;
function getFabricNormal() {
  if (!fabricNormal) {
    fabricNormal = new THREE.CanvasTexture(paintFabricNormal());
    fabricNormal.wrapS = fabricNormal.wrapT = THREE.RepeatWrapping;
  }
  return fabricNormal;
}

// Garment cloth: see fabric.js. cm = real size of the UV square, so the
// knit is drawn at its true scale on every garment.
function fabric(opts) {
  return fabricMaterial(opts);
}

const ALBEDO = '#EAEAEA';

// Appliqué finishes: the micro weave and sheen of each kind of decal.
const FINISH = {
  twill: { micro: ['tackle'], microStrength: 1.0, roughness: 0.9, sheen: 0.6, sheenRoughness: 0.6, cavity: 0.55 },
  pressed: { micro: ['knit'], microStrength: 0.22, roughness: 0.4, sheen: 0, clearcoat: 0.25, clearcoatRoughness: 0.45, cavity: 0.15 },
  embroidered: { micro: ['satin'], microStrength: 0.8, roughness: 0.55, sheen: 0.7, sheenRoughness: 0.35, cavity: 0.5 },
  print: { micro: ['knit'], microStrength: 0.45, roughness: 0.8, sheen: 0.3, cavity: 0.4 },
};

// Built appliqués are cached: repainting the same uniform is instant.
const appliqueCache = new Map();
function cached(key, make) {
  if (appliqueCache.has(key)) {
    const v = appliqueCache.get(key);
    appliqueCache.delete(key); appliqueCache.set(key, v);
    return v;
  }
  const v = make();
  appliqueCache.set(key, v);
  if (appliqueCache.size > 48) appliqueCache.delete(appliqueCache.keys().next().value);
  return v;
}

// a tiling normal map at its own repeat (for materials outside fabric())
function repeatNormal(base, repeat) {
  const n = base.clone();
  n.wrapS = n.wrapT = THREE.RepeatWrapping;
  n.repeat.set(repeat[0], repeat[1]);
  n.needsUpdate = true;
  return n;
}

// Optional gear modelled as separate meshes (by material name) and whether
// each is shown by default. Toggle with player.setAccessory(name, on).
export const ACCESSORIES = { belt: true, towel: false, wristband: true, eyeblack: true, armsleeve: false };

function tex(canvas, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.flipY = false;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = Promise.all([
      loadGLB(loader, MODEL_URL),
      loadJSON(META_URL),
    ]);
  }
  return modelPromise;
}

// DecalGeometry keeps every triangle inside the projector box, including ones
// that run edge-on to it, which smear the texture into streaks. Keep only
// triangles that face the projector.
function facing(geo, dir, minDot = 0.35) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  const keep = [];
  const n = new THREE.Vector3();
  for (let t = 0; t < pos.count; t += 3) {
    n.set(0, 0, 0);
    for (let k = 0; k < 3; k++) n.add(new THREE.Vector3().fromBufferAttribute(nor, t + k));
    if (n.normalize().dot(dir) >= minDot) keep.push(t);
  }
  if (!keep.length) { geo.dispose(); return null; }
  const out = new THREE.BufferGeometry();
  const P = new Float32Array(keep.length * 9), N = new Float32Array(keep.length * 9), U = new Float32Array(keep.length * 6);
  keep.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      P.set([pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k)], (i * 3 + k) * 3);
      N.set([nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k)], (i * 3 + k) * 3);
      U.set([uv.getX(t + k), uv.getY(t + k)], (i * 3 + k) * 2);
    }
  });
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  geo.dispose();
  return out;
}

export class Player {
  constructor(renderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.group = new THREE.Group();
    this.textures = [];
    this.decals = [];
    this.loaded = false;
    this.helmet = new Helmet();
    this.group.add(this.helmet.group);
    this.ready = loadModel().then(([gltf, meta]) => this.install(gltf.scene.clone(true), meta));
  }

  install(root, meta) {
    this.meta = meta;
    const A = this.aniso;
    const reg = meta.regions;
    const cm = (r, k = 1) => [r.circumference.reduce((x, y) => Math.max(x, y), 0) * 100 * 0.85 * k, r.length * 100];
    this.mats = {
      // Vapor body knit, perforated vent panels, smooth stretch shoulders
      jersey: fabric({ micro: ['knit', 'perf'], cm: cm(reg.jersey), macro: torsoDetail(meta, A), zone: torsoZones(meta, A),
        microStrength: 0.45, cavity: 0.6, roughness: 0.78, sheen: 0.45, aniso: A }),
      collar: fabric({ micro: ['collarRib'], cm: [(meta.collar?.perimeter || 0.67) * 100, (meta.collar?.width || 0.03) * 100], macro: collarDetail(meta, A),
        microStrength: 0.9, roughness: 0.85, sheen: 0.35, aniso: A }),
      sleeve: fabric({ micro: ['stretch'], cm: cm(reg.sleeve, 1.4), macro: sleeveDetail(meta, A), zone: sleeveZones(meta, A),
        microStrength: 0.8, smooth: 0.3, roughness: 0.66, sheen: 0.55, aniso: A }),
      // game pants: glossy stretch twill
      pants: fabric({ micro: ['pantsTwill'], cm: cm(reg.pants), macro: pantsDetail(meta, A), microStrength: 0.45, cavity: 0.3,
        roughness: 0.4, sheen: 0.8, sheenRoughness: 0.35, sheenColor: new THREE.Color(0.32, 0.32, 0.32), aniso: A }),
      socks: fabric({ micro: ['rib'], cm: cm(reg.socks), microStrength: 0.9, cavity: 0.6, roughness: 0.9, sheen: 0.35, aniso: A }),
      // matte skin with a fine pore/crease normal map so it doesn't read as plastic
      skin: new THREE.MeshPhysicalMaterial({ roughness: 0.6, sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.3, 0.18, 0.12), clearcoat: 0.06, clearcoatRoughness: 0.55, normalMap: skinNormal(), normalScale: new THREE.Vector2(0.22, 0.22) }),
      // synthetic knit upper: soft sheen rather than a patent-leather shine
      cleat: new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.3, sheenRoughness: 0.5, normalMap: repeatNormal(getFabricNormal(), [1, 1]), normalScale: new THREE.Vector2(0.45, 0.45) }),
      sole: new THREE.MeshPhysicalMaterial({ roughness: 0.38, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
      // molded TPU studs: a little glossier than the plate
      stud: new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.3 }),
      // round laces and pull loops: matte braided cord
      lace: new THREE.MeshPhysicalMaterial({ roughness: 0.88, sheen: 0.5, sheenRoughness: 0.6 }),
      // knit sock collar of the cleat
      // (sheen colour set per uniform from the cleat colour)
      cleatknit: new THREE.MeshPhysicalMaterial({ roughness: 0.9, sheen: 0.5, sheenRoughness: 0.55, normalMap: repeatNormal(getFabricNormal(), [2, 1]), normalScale: new THREE.Vector2(0.8, 0.8) }),
      glove: new THREE.MeshPhysicalMaterial({ roughness: 0.5, sheen: 0.4, sheenRoughness: 0.5 }),
      eye: new THREE.MeshPhysicalMaterial({ roughness: 0.08, clearcoat: 1, map: tex(eyeCanvas(), this.aniso) }),
      // accessories (separate meshes, see ACCESSORIES)
      belt: new THREE.MeshPhysicalMaterial({ color: '#1c1d20', roughness: 0.62, sheen: 0.4, sheenRoughness: 0.5, normalMap: repeatNormal(getFabricNormal(), [60, 2]), normalScale: new THREE.Vector2(0.3, 0.3) }),
      towel: new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', roughness: 0.96, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(1, 1, 1), normalMap: repeatNormal(getFabricNormal(), [10, 22]), normalScale: new THREE.Vector2(1.2, 1.2), side: THREE.DoubleSide }),
      wristband: new THREE.MeshPhysicalMaterial({ color: '#f2f2f0', roughness: 0.95, sheen: 0.8, sheenRoughness: 0.7, sheenColor: new THREE.Color(1, 1, 1), normalMap: repeatNormal(getFabricNormal(), [3, 1]), normalScale: new THREE.Vector2(0.9, 0.9) }),
      armsleeve: new THREE.MeshPhysicalMaterial({ color: '#161618', roughness: 0.7, sheen: 0.6, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.35, 0.35, 0.35), normalMap: repeatNormal(getFabricNormal(), [6, 14]), normalScale: new THREE.Vector2(0.3, 0.3) }),
      eyeblack: new THREE.MeshPhysicalMaterial({ color: '#0d0d0e', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }),
    };
    this.mats.beltloop = this.mats.pants;   // belt loops are pants fabric (UVs sit on the waistband)
    this.meshes = {};
    root.traverse((o) => {
      if (!o.isMesh) return;
      const key = o.material.name.split('.')[0];
      if (this.mats[key]) o.material = this.mats[key];
      o.castShadow = key !== 'eyeblack';
      o.receiveShadow = true;
      (this.meshes[key] ||= []).push(o);
    });
    for (const [k, on] of Object.entries(ACCESSORIES)) this.setAccessory(k, on);
    this.group.add(root);

    // Joints (three.js space)
    this.J = Object.fromEntries(Object.entries(meta.joints).map(([k, v]) => [k, B2T(v)]));
    // helmet: brow just above the eyes, shell centred over the skull
    const eyes = this.J['eye.L'].clone().add(this.J['eye.R']).multiplyScalar(0.5);
    this.helmet.group.position.set(0, eyes.y + 0.004, eyes.z - 0.078);
    this.loaded = true;
    if (this.pending) this.setUniform(...this.pending);
  }

  setAccessory(name, on) {
    for (const k of name === 'belt' ? ['belt', 'beltloop'] : [name]) {
      for (const m of this.meshes?.[k] || []) m.visible = !!on;
    }
  }

  // colours for the accessories that follow the uniform
  dressAccessories(team, pants) {
    const m = this.mats;
    if (!m?.belt) return;
    // a belt in the team's primary colour unless the pants say otherwise
    m.belt.color.set(pants.belt || team.colors?.[0] || '#1c1d20');
  }

  disposeUniform() {
    for (const t of this.textures) t.dispose();
    this.textures = [];
    const mats = new Set();
    for (const d of this.decals) { d.geometry.dispose(); mats.add(d.material); d.parent?.remove(d); }
    for (const m of mats) m.dispose();
    this.decals = [];
  }

  async setUniform(team, sel, player) {
    this.pending = [team, sel, player];
    if (!this.loaded) return;
    const token = (this.token = Symbol('uniform'));
    const helmet = team.helmets.find((x) => x.id === sel.h) || team.helmets[0];
    const jersey = team.jerseys.find((x) => x.id === sel.j) || team.jerseys[0];
    const pants = team.pants.find((x) => x.id === sel.p) || team.pants[0];
    const socks = team.socks.find((x) => x.id === sel.s) || team.socks[0];

    // Logos load asynchronously; fetch them before tearing down the current look
    const logoKeys = [jersey.chestLogo, jersey.sleeveLogo, jersey.centerLogo, jersey.shoulder?.img, jersey.word?.img, pants.hipLogo, 'NFL_shield'].filter(Boolean);
    const logos = Object.fromEntries(await Promise.all(logoKeys.map(async (k) => [k, await loadLogo(k)])));
    if (token !== this.token) return;

    this.disposeUniform();
    const T = (c) => { const t = tex(c, this.aniso); this.textures.push(t); return t; };
    const m = this.mats, meta = this.meta;

    m.jersey.map = T(paintTorso(jersey, meta));
    m.sleeve.map = T(paintSleeveTex(jersey, meta));
    m.pants.map = T(paintPantsTex(pants, meta));
    m.socks.map = T(paintSocksTex(socks, meta));
    // cloth never reflects all the light: keep whites a touch below 1 so shading reads on them
    for (const k of ['jersey', 'sleeve', 'pants', 'socks']) { m[k].color.set(ALBEDO); m[k].needsUpdate = true; }

    m.collar.map = T(paintCollar(jersey, meta));
    m.collar.color.set(ALBEDO);
    m.collar.needsUpdate = true;

    const sk = SKIN[player.skin ?? 0] || SKIN[0];
    m.skin.map = skinTexture(sk.tex, this.aniso);
    m.skin.color.set(sk.tint);
    m.skin.needsUpdate = true;
    const glove = player.gloves === 'white' ? '#F4F4F4' : player.gloves === 'black' ? '#141414' : jersey.base;
    m.glove.color.set(glove);
    const cleat = player.cleats === 'auto'
      ? (luminance(socks.base) > 0.5 ? '#F2F2F2' : '#151515')
      : player.cleats === 'white' ? '#F2F2F2' : player.cleats === 'black' ? '#151515' : team.colors[0];
    m.cleat.color.set(cleat);
    // light cleats get a silver plate (as Nike's white Vapors), dark ones a near-black plate
    m.sole.color.set(luminance(cleat) > 0.5 ? '#B9BCC1' : '#1E1F21');
    m.stud.color.set(luminance(cleat) > 0.5 ? '#A9ACB2' : '#18191B');
    // laces and the knit sock collar are dyed to match the upper: their sheen
    // follows the cleat colour (a fixed grey sheen washed black knit out to grey)
    const dark = luminance(cleat) < 0.5;
    for (const k of ['lace', 'cleatknit']) {
      m[k].color.set(cleat);
      m[k].sheenColor.set(cleat).lerp(new THREE.Color(1, 1, 1), dark ? 0.06 : 0);
    }

    this.dressAccessories(team, pants);
    this.placeDecals(team, jersey, pants, player, logos, cleat);
    this.helmet.set(helmet, { ...player, font: helmet.numFont || jersey.font || team.font });
  }

  // ─── decals ─────────────────────────────────────────────────────────

  raycast(meshes, origin, dir) {
    const rc = new THREE.Raycaster(origin, dir.clone().normalize(), 0, 2);
    const hits = rc.intersectObjects(meshes, false);
    return hits[0] || null;
  }

  // Projects a decal onto the meshes at a hit. With `finish` (an appliqué
  // style) the decal gets the cloth material for that finish and `normal`
  // as its relief map; otherwise a plain printed material.
  decal(meshes, hit, width, height, texture, { up = new THREE.Vector3(0, 1, 0), depth = 0.1, rough = 0.6, minDot = 0.35, finish = null, normal = null } = {}) {
    if (!hit || !texture) return;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const helper = new THREE.Object3D();
    helper.position.copy(hit.point);
    helper.up.copy(up);
    helper.lookAt(hit.point.clone().add(n));
    const F = FINISH[finish] || null;
    const common = { map: texture, color: F ? ALBEDO : '#ffffff', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
    const mat = F
      ? fabricMaterial({ ...F, ...common, macro: normal, macroScale: 1, cm: [width * 100, height * 100], side: THREE.FrontSide, aniso: this.aniso })
      : new THREE.MeshPhysicalMaterial({ ...common, roughness: rough, sheen: 0.2 });
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    let used = false;
    for (const mesh of meshes) {
      const geo = facing(new DecalGeometry(mesh, hit.point, helper.rotation, new THREE.Vector3(width, height, depth)), n, minDot);
      if (!geo) continue;
      geo.applyMatrix4(inv);   // DecalGeometry is in world space
      const d = new THREE.Mesh(geo, mat);
      used = true;
      d.renderOrder = 2;
      d.receiveShadow = true;
      this.group.add(d);
      this.decals.push(d);
    }
    if (!used) mat.dispose();
  }

  // An appliqué built by applique.js → textures, tracked for disposal
  appliqueTextures(built) {
    const map = new THREE.CanvasTexture(built.color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = this.aniso;
    const normal = new THREE.CanvasTexture(built.normal);
    normal.colorSpace = THREE.NoColorSpace;
    normal.anisotropy = this.aniso;
    this.textures.push(map, normal);
    return { map, normal };
  }

  // Numbers and letters. style: 'twill' | 'pressed' | 'embroidered' | 'print'
  lettering(meshes, hit, text, heightM, colors, font, opts = {}) {
    if (!text || !hit) return;
    const style = opts.style || 'twill';
    const isNum = !!numeralStyle(font) && /^\d+$/.test(text);
    const key = JSON.stringify([text, heightM, colors, font, style, isNum, { ...opts, up: null, fillPattern: !!opts.fillPattern }]);
    const built = cached(key, () => {
      // ~2.6 px per mm keeps zig-zag stitches resolvable at close range
      const px = Math.round(Math.min(600, Math.max(160, heightM * 1000 * 2.6)));
      const L = (isNum && numeralLayers(text, colors, font, { ...opts, px }))
        || letteringLayers(text, colors, numeralStyle(font) ? letterFont(font) : font, { ...opts, px });
      const res = buildApplique(L.layers, { style, pxPerMm: L.px / (heightM * 1000) });
      return { ...res, aspect: L.aspect, inkHeight: L.inkHeight };
    });
    const { map, normal } = this.appliqueTextures(built);
    const h = heightM / (built.inkHeight || 0.7);
    this.decal(meshes, hit, h * built.aspect, h, map, { ...opts, finish: style, normal });
  }

  // Logo artwork as a patch: embroidered by default. Sized by width, or by
  // height with opts.heightM.
  image(meshes, hit, widthM, texture, opts = {}) {
    if (!texture?.image || !hit) return;
    const img = texture.image;
    const style = opts.style || 'embroidered';
    const a = img.width / img.height;
    const wM = opts.heightM ? opts.heightM * a : widthM, hM = wM / a;
    const key = `img|${texture.uuid}|${style}|${Math.round(wM * 1000)}`;
    const built = cached(key, () => imageApplique(img, { style, pxPerMm: img.width / (wM * 1000), maxPx: wM > 0.12 ? 1024 : 512 }));
    const { map, normal } = this.appliqueTextures(built);
    const [px, py] = built.padFrac;
    this.decal(meshes, hit, wM / (1 - 2 * px), hM / (1 - 2 * py), map, { ...opts, finish: style, normal });
  }

  // A drawn canvas (swoosh, jock tag, patches) as an appliqué
  canvasDecal(meshes, hit, widthM, canvas, opts = {}) {
    if (!hit || !canvas) return;
    const style = opts.style || 'embroidered';
    const make = () => imageApplique(canvas, { style, pxPerMm: canvas.width / (widthM * 1000), maxPx: 512 });
    const built = opts.key ? cached(`cv|${opts.key}|${style}|${widthM}`, make) : make();
    const { map, normal } = this.appliqueTextures(built);
    const [px, py] = built.padFrac;
    const hM = (widthM * canvas.height) / canvas.width;
    this.decal(meshes, hit, widthM / (1 - 2 * px), hM / (1 - 2 * py), map, { ...opts, finish: style, normal });
  }

  placeDecals(team, jersey, pants, player, logos, cleatColor) {
    this.group.updateMatrixWorld(true);
    const torso = this.meshes.jersey || [];
    const sleeves = this.meshes.sleeve || [];
    const collar = this.meshes.collar || [];
    const pantsM = this.meshes.pants || [];
    const cleats = this.meshes.cleat || [];
    const meta = this.meta;
    const neckY = this.J.neck01.y;
    const font = jersey.font || team.font;
    const num = String(player.number ?? '');
    const colors = jersey.num;
    // tackle twill unless the set is heat-pressed (the default for printed/patterned numbers)
    const numStyle = jersey.numStyle || (jersey.numPattern ? 'pressed' : 'twill');
    const patchStyle = numStyle === 'pressed' ? 'pressed' : 'twill';
    const front = (y, x = 0) => this.raycast(torso, new THREE.Vector3(x, y, 0.6), new THREE.Vector3(0, 0, -1));
    const back = (y, x = 0) => this.raycast(torso, new THREE.Vector3(x, y, -0.6), new THREE.Vector3(0, 0, 1));

    // the point of the V-neck, from the collar's neckline in UV space
    const gs = meta.ground_shift || 0, z0 = meta.jersey.z0 + gs, z1 = meta.jersey.z1 + gs;
    const vV = meta.collar?.front_uv ? Math.min(...meta.collar.front_uv.map(([, v]) => v)) : null;
    const yV = vV != null ? z0 + vV * (z1 - z0) : neckY - 0.08;

    // Front: wordmark, number, NFL shield at the collar V
    const w = jersey.word;
    if (w) {
      const at = w.at === 'left' ? front(neckY - 0.14, 0.12) : front(neckY - 0.165);
      if (w.img) {
        // image wordmark from public/logos, sized by its height (or width) in metres
        const t = logos[w.img];
        if (t?.image) {
          const a = t.image.width / t.image.height;
          const hM = w.h || (w.w ? w.w / a : 0.045);
          this.image(torso, at, hM * a, t, { style: w.style || patchStyle });
        }
      } else {
        this.lettering(torso, at, w.s, w.h || 0.034, [w.c, w.o].filter(Boolean), w.script ? 'script' : (w.font || font),
          { tracking: w.script ? 0 : (w.tracking ?? 0.12), o1: 0.08, skew: w.italic ? -0.2 : null, arch: w.arch || 0, scaleX: w.scaleX || 1, style: w.style || numStyle });
      }
    }
    const top = (w && w.at !== 'left') || jersey.centerLogo;
    const numOpts = {
      o1: jersey.numO?.[0] ?? 0.05, o2: jersey.numO?.[1] ?? 0.045, shadow: jersey.numShadow || null,
      fillPattern: numeralPattern(jersey.numPattern), patternKey: jersey.numPattern ? JSON.stringify(jersey.numPattern) : null, style: numStyle,
    };
    this.lettering(torso, front(neckY - (top ? 0.31 : 0.29)), num, 0.2, colors, font, numOpts);
    if (jersey.centerLogo) this.image(torso, front(neckY - 0.17), 0.06, logos[jersey.centerLogo], { style: patchStyle });
    if (jersey.numMarks) {
      // small arrowhead triangles stacked either side of the front number (Broncos)
      const { c, n = 3 } = jersey.numMarks;
      const tri = document.createElement('canvas'); tri.width = tri.height = 64;
      const tctx = tri.getContext('2d'); tctx.fillStyle = c;
      tctx.beginPath(); tctx.moveTo(32, 6); tctx.lineTo(58, 56); tctx.lineTo(6, 56); tctx.fill();
      const y0 = neckY - (top ? 0.31 : 0.29);
      for (const sx of [-1, 1]) for (let k = 0; k < n; k++) {
        this.canvasDecal(torso, front(y0 + 0.03 - k * 0.028, sx * 0.165), 0.016, tri, { style: patchStyle, key: `tri${c}` });
      }
    }
    // NFL shield: embroidered at the bottom of the V-neck, its top tucked into the collar point
    if (logos.NFL_shield) {
      const sw = 0.034, a = logos.NFL_shield.image.width / logos.NFL_shield.image.height;
      this.image([...torso, ...collar], front(yV - (sw / a) * 0.38), sw, logos.NFL_shield, { style: 'embroidered', depth: 0.06 });
    }
    // chest patch sits on the player's left chest (viewer's right)
    if (jersey.chestLogo) this.image(torso, front(neckY - 0.16, 0.11), 0.07, logos[jersey.chestLogo]);
    if (jersey.chestPatch) {
      // drawn patch on the player's left chest (e.g. the Browns' 1946 football)
      const c = paintLogo(jersey.chestPatch, 'right');
      if (c) this.canvasDecal(torso, front(neckY - 0.16, 0.11), 0.075, c, { key: JSON.stringify(jersey.chestPatch) });
    }
    // Jock tag: the woven label on the front hem, just left of centre (the
    // player's left). Shown where it peeks out above the pants.
    if (jersey.jockTag !== false && logos.NFL_shield) {
      const jt = jersey.jockTag || {};
      const bg = jt.bg || '#121314', fg = jt.fg || '#D9DBDE';
      const c = jockTagCanvas(logos.NFL_shield.image, { size: jt.size || null, bg, fg });
      this.canvasDecal(torso, front(meta.constants.waist + 0.022, 0.055), 0.07, c, { style: 'print', key: `jock${jt.size}${bg}${fg}` });
    }

    // Back collar tag just under the neckline
    if (jersey.neckTag) {
      const t = jersey.neckTag;
      this.lettering(torso, back(neckY - 0.045), t.s, t.s.length > 12 ? 0.012 : 0.016, [t.c], t.font || 'block',
        { tracking: 0.08, bg: t.bg || null, style: t.style || 'pressed' });
    }

    // Back: nameplate and number
    const plate = jersey.plateFont || jersey.plate || (font === 'script' ? 'plate' : letterFont(font));
    if (player.name) {
      this.lettering(torso, back(neckY - 0.1), player.name.toUpperCase(), jersey.plateH || 0.05,
        [jersey.plateColor || colors[0], ...(jersey.plateOutline || [])], plate,
        { tracking: jersey.plateTracking ?? 0.05, arch: jersey.plateArch || 0, scaleX: jersey.plateScaleX || 1, o1: 0.07, o2: 0.05, style: jersey.plateStyle || numStyle,
          bar: jersey.plateBar ? (jersey.plateBar === true ? jersey.base : jersey.plateBar) : null });
    }
    this.lettering(torso, back(neckY - 0.3), num, 0.25, colors, font, numOpts);

    // TV numbers: on top of the shoulders, or on the outside of the sleeves
    for (const s of ['L', 'R']) {
      const sh = this.J[`upperarm01.${s}`];
      const el = this.J[`lowerarm01.${s}`];
      const sx = Math.sign(sh.x);
      if (jersey.tv === 'shoulder') {
        const hit = this.raycast([...sleeves, ...torso], new THREE.Vector3(sh.x - sx * 0.035, 2.3, sh.z), new THREE.Vector3(0, -1, 0));
        this.lettering([...sleeves, ...torso], hit, num, 0.085, colors.slice(0, 2), font, { ...numOpts, o1: 0.06, o2: 0, up: new THREE.Vector3(0, 0, -1), minDot: 0.2 });
      } else if (jersey.tv === 'sleeve') {
        const p = sh.clone().lerp(el, 0.28);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        this.lettering(sleeves, hit, num, 0.08, colors.slice(0, 2), font, { ...numOpts, o1: 0.06, o2: 0, minDot: 0.2 });
      }
      if (jersey.shoulder) {
        // shoulder graphic (bolts, stars, horns) on the front of each shoulder, aimed from above and in front
        const sp = jersey.shoulder;
        const at = sh.clone().add(new THREE.Vector3(-sx * 0.02, 0.05, 0.0));
        const dir = new THREE.Vector3(sx * 0.35, 0.55, 1).normalize();
        const hit = this.raycast([...sleeves, ...torso], at.clone().add(dir.clone().multiplyScalar(0.6)), dir.clone().negate());
        const size = sp.size || 0.1;
        if (sp.img && logos[sp.img]) this.image([...sleeves, ...torso], hit, size, logos[sp.img], { depth: 0.14, style: patchStyle });
        else {
          const c = paintLogo(sp, sx > 0 ? 'right' : 'left');
          if (c) this.canvasDecal([...sleeves, ...torso], hit, size, c, { depth: 0.14, style: patchStyle, key: JSON.stringify(sp) + sx });
        }
      }
      if (jersey.sleeveText) {
        // letters on the outside of each sleeve (e.g. "N" and "E" on the Patriots Nor'easter)
        const st = jersey.sleeveText;
        const p = sh.clone().lerp(el, 0.2);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        this.lettering(sleeves, hit, sx > 0 ? st.L : st.R, 0.065, st.c, st.font || 'slab', { o1: 0.08, style: numStyle });
      }
      if (jersey.sleevePatch) {
        // drawn patch on the outside of each sleeve (state flags, shields)
        const c = paintLogo(jersey.sleevePatch, sx > 0 ? 'left' : 'right');
        const p = sh.clone().lerp(el, 0.18);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        if (c) this.canvasDecal(sleeves, hit, 0.075, c, { key: JSON.stringify(jersey.sleevePatch) + sx });
      }
      if (jersey.sleeveLogo) {
        const p = sh.clone().lerp(el, 0.18);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        this.image(sleeves, hit, 0.075, logos[jersey.sleeveLogo]);
      }
      // Nike swoosh on each sleeve, pointing forward on both sides
      if (jersey.swoosh !== false) {
        const col = jersey.swoosh || (luminance(jersey.base) > 0.55 ? (colors[0] || '#111111') : '#FFFFFF');
        const p = sh.clone().lerp(el, 0.02).add(new THREE.Vector3(0, 0.015, 0.01));
        const dir = new THREE.Vector3(sx * 0.9, 0.35, 0.3).normalize();
        const hit = this.raycast(sleeves, p.clone().add(dir.clone().multiplyScalar(0.4)), dir.clone().negate());
        this.canvasDecal(sleeves, hit, 0.058, swooshCanvas(col, 192, { mirror: sx > 0 }), { style: 'embroidered', key: `sw${col}${sx}`, minDot: 0.2 });
      }
    }

    // Pants: NFL shield on the player's right hip, swoosh on the left, team logos on the hip sides
    const hipL = this.J['upperleg01.L'], hipR = this.J['upperleg01.R'];
    const hipY = this.meta.constants.waist - 0.05;
    this.image(pantsM, this.raycast(pantsM, new THREE.Vector3(hipR.x - 0.02, hipY, 0.6), new THREE.Vector3(0, 0, -1)), 0.03, logos.NFL_shield, { style: 'embroidered' });
    const swc = pants.swoosh || shade(pants.base, luminance(pants.base) > 0.5 ? -0.75 : 0.8);
    this.canvasDecal(pantsM, this.raycast(pantsM, new THREE.Vector3(hipL.x + 0.02, hipY, 0.6), new THREE.Vector3(0, 0, -1)), 0.06,
      swooshCanvas(swc, 192), { style: 'embroidered', key: `psw${swc}` });
    if (pants.hipLogo && logos[pants.hipLogo]) {
      for (const h of [hipL, hipR]) {
        const sx = Math.sign(h.x);
        const hit = this.raycast(pantsM, new THREE.Vector3(sx * 0.6, hipY + 0.02, h.z), new THREE.Vector3(-sx, 0, 0));
        this.image(pantsM, hit, 0.07, logos[pants.hipLogo], { style: pants.hipStyle || 'pressed' });
      }
    }

    // Cleats: a contrasting swoosh on the outside of each shoe
    const cs = new THREE.CanvasTexture(swooshCanvas(luminance(cleatColor) > 0.5 ? '#161616' : '#f2f2f2'));
    cs.colorSpace = THREE.SRGBColorSpace; this.textures.push(cs);
    for (const s of ['L', 'R']) {
      const f = this.J[`foot.${s}`];
      const sx = Math.sign(f.x);
      const hit = this.raycast(cleats, new THREE.Vector3(sx * 0.6, 0.05, f.z + 0.03), new THREE.Vector3(-sx, 0, 0));
      this.decal(cleats, hit, 0.1, 0.05, cs, { minDot: 0.2 });
    }
  }
}
