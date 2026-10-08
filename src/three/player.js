import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { paintFabricNormal, paintLogo, shade, luminance } from './paint.js';
import { paintTorso, paintSleeveTex, paintPantsTex, paintSocksTex, paintCollar, letteringLayers, eyeCanvas, swooshCanvas, jockTagCanvas, wingCanvas } from './garments.js';
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
  // `axis` projects along a fixed world direction instead of the hit face's normal; `order` is the renderOrder.
  // `inside` draws on the inner face of the cloth (seen through the neck opening): the decal is
  // oriented along `axis` but kept on triangles facing the other way, and rendered back-side.
  decal(meshes, hit, width, height, texture, { up = new THREE.Vector3(0, 1, 0), depth = 0.1, rough = 0.6, minDot = 0.35, finish = null, normal = null, axis = null, order = 2, inside = false } = {}) {
    if (!hit || !texture) return;
    const n = axis ? axis.clone().normalize() : hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const helper = new THREE.Object3D();
    helper.position.copy(hit.point);
    helper.up.copy(up);
    helper.lookAt(hit.point.clone().add(n));
    const F = FINISH[finish] || null;
    const common = { map: texture, color: F ? ALBEDO : '#ffffff', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
    const mat = F
      ? fabricMaterial({ ...F, ...common, macro: normal, macroScale: 1, cm: [width * 100, height * 100], side: inside ? THREE.BackSide : THREE.FrontSide, aniso: this.aniso })
      : new THREE.MeshPhysicalMaterial({ ...common, roughness: rough, sheen: 0.2, side: inside ? THREE.BackSide : THREE.FrontSide });
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    let used = false;
    for (const mesh of meshes) {
      const geo = facing(new DecalGeometry(mesh, hit.point, helper.rotation, new THREE.Vector3(width, height, depth)), inside ? n.clone().negate() : n, minDot);
      if (!geo) continue;
      geo.applyMatrix4(inv);   // DecalGeometry is in world space
      const d = new THREE.Mesh(geo, mat);
      used = true;
      d.renderOrder = order;
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
      return { ...res, aspect: L.aspect, inkHeight: L.inkHeight, inkAspect: L.inkW ? L.inkW / L.px : null };
    });
    // maxW: cap on the letters' width in metres; wider text is condensed (scaleX), as real nameplates are
    const wide = opts.maxW && built.inkAspect ? built.inkAspect * heightM : 0;
    if (wide > opts.maxW) {
      return this.lettering(meshes, hit, text, heightM, colors, font, { ...opts, maxW: 0, scaleX: (opts.scaleX || 1) * (opts.maxW / wide) * 0.985 });
    }
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

  // The Seahawks-style wing panel (garments.js wingCanvas), fitted to the
  // model: the chest band sits at the V-neck, and the sleeve part ends on the
  // front of the hem (found from the sleeve mesh, whose exported UVs put the
  // hem at v = 1). Projected straight from the front over torso and sleeves.
  wingPanel(colors, yV, torso, sleeves) {
    const sh = this.J['upperarm01.L'];
    const v = new THREE.Vector3(), hem = [];
    for (const m of sleeves) {
      const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        if (uv.getY(i) < 0.97) continue;
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
        if (v.x > 0) hem.push(v.clone());
      }
    }
    if (!hem.length) return;
    const zc = hem.reduce((a, q) => a + q.z, 0) / hem.length;
    const fr = hem.filter((q) => q.z >= zc);
    const xi = Math.min(...fr.map((q) => q.x)), xo = Math.max(...fr.map((q) => q.x));
    const yh = fr.reduce((a, q) => a + q.y, 0) / fr.length;
    const yT = yV + 0.012, yB = yT - 0.062;
    const g = { hx: xo + 0.08, yTop: yT + 0.01, yBot: yh - 0.04, x0: [0.05, 0.024], yT, yB, xbT: sh.x + 0.025, xbB: sh.x - 0.015, xi, xo, yh };
    const t = new THREE.CanvasTexture(wingCanvas(colors, g));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.aniso;
    this.textures.push(t);
    const hit = { point: new THREE.Vector3(0, (g.yTop + g.yBot) / 2, 0.05) };
    this.decal([...torso, ...sleeves], hit, 2 * g.hx, g.yTop - g.yBot, t,
      { axis: new THREE.Vector3(0, 0, 1), depth: 0.4, finish: 'print', minDot: 0.2, order: 1 });
  }

  // Shoulder sweeps that cross the torso/sleeve seam, drawn per side in front-view world metres
  // (+x = the player's left) and projected from the front, angled out so they reach the outer sleeve:
  //   { t: 'raglan', c, edge }: a tapered panel along the raglan seam from the collar to the underarm (Panthers)
  //   { t: 'horn', c }: a horn from the collar over the cap, curling down the outer sleeve to a point (Rams)
  //   lift (either): upward tilt of the projection (default 0.12); higher lays it over the top of the shoulder
  //   ({ t: 'bullhorn' } is painted into the sleeve texture with the loop band: garments.js)
  sweepPanel(spec, torso, sleeves) {
    if (spec.t === 'bullhorn') return;
    const sh = this.J['upperarm01.L'], neckY = this.J.neck01.y;
    const v = new THREE.Vector3(), hem = [];
    for (const m of sleeves) {
      const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        if (uv.getY(i) < 0.97) continue;
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
        if (v.x > 0) hem.push(v.clone());
      }
    }
    if (!hem.length) return;
    const zc = hem.reduce((a, q) => a + q.z, 0) / hem.length;
    const fr = hem.filter((q) => q.z >= zc);
    const xi = Math.min(...fr.map((q) => q.x)), xo = Math.max(...fr.map((q) => q.x));
    const yh = fr.reduce((a, q) => a + q.y, 0) / fr.length;
    const x0 = 0.03, x1 = xo + 0.07, yT = neckY + 0.02, yB = yh - 0.04, ppm = 2600;
    for (const sx of [1, -1]) {
      const W = Math.round((x1 - x0) * ppm), H = Math.round((yT - yB) * ppm);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      // left-side metres → canvas pixels (mirrored for the right side)
      const P = ([x, y]) => [(sx > 0 ? x - x0 : x1 - x) * ppm, (yT - y) * ppm];
      const M = (q) => ctx.moveTo(...P(q)), L = (q) => ctx.lineTo(...P(q)), Q = (k, q) => ctx.quadraticCurveTo(...P(k), ...P(q));
      if (spec.t === 'raglan') {
        const C = [0.125, neckY - 0.035], A = [xi + 0.004, yh + 0.004];
        const d = [A[0] - C[0], A[1] - C[1]], len = Math.hypot(...d), n = [-d[1] / len, d[0] / len];
        const at = (t, off) => [C[0] + d[0] * t + n[0] * off, C[1] + d[1] * t + n[1] * off];
        const shape = (grow) => {
          ctx.beginPath();
          M(at(0, -grow)); Q(at(0.5, -0.008 - grow), at(1, -grow * 0.5));
          L(at(1.02, 0.004 + grow)); Q(at(0.45, 0.032 + grow), at(0, 0.058 + grow));
          ctx.closePath(); ctx.fill();
        };
        if (spec.edge) { ctx.fillStyle = spec.edge; shape(0.005); }
        ctx.fillStyle = spec.c; shape(0);
      } else if (spec.t === 'horn') {
        ctx.fillStyle = spec.c;
        ctx.beginPath();
        M([0.13, neckY - 0.025]);
        Q([sh.x + 0.03, sh.y + 0.07], [xo + 0.012, sh.y - 0.015]);
        Q([xo + 0.026, yh + 0.04], [xo - 0.012, yh + 0.01]);
        Q([xo - 0.012, sh.y - 0.03], [0.19, neckY - 0.06]);
        Q([0.145, neckY - 0.045], [0.13, neckY - 0.025]);
        ctx.closePath(); ctx.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.aniso;
      this.textures.push(t);
      const hit = { point: new THREE.Vector3(sx * (x0 + x1) / 2, (yT + yB) / 2, 0.05) };
      this.decal([...torso, ...sleeves], hit, x1 - x0, yT - yB, t,
        { axis: new THREE.Vector3(sx * (spec.t === 'horn' ? 0.6 : 0.35), spec.lift ?? 0.12, 1), depth: 0.5, finish: 'print', minDot: 0.12, order: 1 });
    }
  }

  // Shoulder graphics seen from behind, drawn per side in back-view world metres and projected
  // from behind, tilted out and up so they wrap over the pad cap and the outside of the sleeve.
  // jersey.backShoulder: { shapes: [[colour, [[x, y], ...], round], ...], out, lift }
  //   x: metres out from the spine, y: metres above the shoulder joint (upperarm01; the top of the
  //   cap is about +0.09 at x 0.18 and +0.06 at x 0.29, the sleeve's outer edge is x 0.33 at y 0);
  //   the player's left shoulder, mirrored for the right. round: corner radius in metres.
  // A Seahawks wing (panels.wing: [band, accent]) adds its back view by default: the accent wedge
  // over the outer cap and the band where it wraps the outside of the sleeve.
  backShoulderPanel(jersey, torso, sleeves) {
    const sh = this.J['upperarm01.L'];
    let spec = jersey.backShoulder;
    if (!spec) {
      const [band, accent] = jersey.panels.wing;
      spec = { shapes: [
        [band, [[0.27, -0.005], [0.37, -0.02], [0.37, -0.075], [0.285, -0.06]]],
        [accent || band, [[0.235, 0.12], [0.37, 0.12], [0.37, 0.0], [0.29, 0.01]], 0.01],
      ] };
    }
    const x0 = 0.1, x1 = 0.42, yT = sh.y + 0.16, yB = sh.y - 0.14, ppm = 2600;
    const W = Math.round((x1 - x0) * ppm), H = Math.round((yT - yB) * ppm);
    for (const sx of [1, -1]) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      // seen from behind the decal's +u runs toward world -x: the left shoulder's outer end is at u = 0
      const P = ([x, y]) => [(sx > 0 ? x1 - x : x - x0) * ppm, (yT - sh.y - y) * ppm];
      for (const [col, pts, r = 0] of spec.shapes) {
        ctx.fillStyle = col;
        ctx.beginPath();
        const Q = pts.map(P), n = Q.length, rad = r * ppm;
        for (let i = 0; i < n; i++) {
          const a = Q[(i + n - 1) % n], b = Q[i], d = Q[(i + 1) % n];
          if (!rad) { ctx[i ? 'lineTo' : 'moveTo'](...b); continue; }
          const k1 = Math.min(rad, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1);
          const k2 = Math.min(rad, Math.hypot(d[0] - b[0], d[1] - b[1]) / 2) / (Math.hypot(d[0] - b[0], d[1] - b[1]) || 1);
          ctx[i ? 'lineTo' : 'moveTo'](b[0] + (a[0] - b[0]) * k1, b[1] + (a[1] - b[1]) * k1);
          ctx.quadraticCurveTo(...b, b[0] + (d[0] - b[0]) * k2, b[1] + (d[1] - b[1]) * k2);
        }
        ctx.closePath(); ctx.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.aniso;
      this.textures.push(t);
      const hit = { point: new THREE.Vector3(sx * (x0 + x1) / 2, (yT + yB) / 2, -0.05) };
      this.decal([...torso, ...sleeves], hit, x1 - x0, yT - yB, t,
        { axis: new THREE.Vector3(sx * (spec.out ?? 0.45), spec.lift ?? 0.35, -1), depth: 0.5, finish: 'print', minDot: 0.12, order: 1 });
    }
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

    // shoulder wing panel across the chest and down the sleeves, under the other decals
    if (jersey.panels?.wing) this.wingPanel(jersey.panels.wing, yV, torso, sleeves);
    if (jersey.sweep) this.sweepPanel(jersey.sweep, torso, sleeves);

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
    // chestLogoAt: [across toward the player's left, down from neckY] in metres; chestLogoSize: width
    const [clx, cly] = jersey.chestLogoAt || [0.11, 0.16];
    if (jersey.chestLogo) this.image(torso, front(neckY - cly, clx), jersey.chestLogoSize || 0.07, logos[jersey.chestLogo]);
    if (jersey.chestPatch) {
      // drawn patch on the player's left chest (e.g. the Browns' 1946 football)
      const c = paintLogo(jersey.chestPatch, 'right');
      if (c) this.canvasDecal(torso, front(neckY - cly, clx), jersey.chestLogoSize || 0.075, c, { key: JSON.stringify(jersey.chestPatch) });
    }
    // Jock tag: the woven label on the front hem, just left of centre (the
    // player's left). A game jersey is tucked, so the tag sits under the pants
    // and isn't seen: it's drawn only when a jersey opts in (jockTag: true or
    // { size, bg, fg }), placed where it peeks out above the belt.
    if (jersey.jockTag && logos.NFL_shield) {
      const jt = jersey.jockTag || {};
      const bg = jt.bg || '#121314', fg = jt.fg || '#D9DBDE';
      const c = jockTagCanvas(logos.NFL_shield.image, { size: jt.size || null, bg, fg });
      this.canvasDecal(torso, front(meta.constants.waist + 0.022, 0.055), 0.07, c, { style: 'print', key: `jock${jt.size}${bg}${fg}` });
    }

    // Back layout, measured from straight-on photos (research/backs.md) as fractions of the back
    // number height H: name top 0.10 H below the back neck seam, name letters 0.21 H, name bottom
    // to number top 0.07 H. The seam (top edge of the back collar seen from behind) is at
    // neckY - 0.03 on this model (probed: collar band -0.044..-0.034, cloth edge -0.027).
    const seam = neckY - 0.03;
    const numH = jersey.numBackH || 0.25, plateH = jersey.plateH || 0.05;
    const backColors = jersey.numBack || colors;
    const tag = jersey.neckTag, tagOut = tag && !tag.at;
    // Back collar tag. Default: on the outside just under the seam (real only for BUF, LAR, WAS, HOU);
    // at: 'inside' prints it on the inner back neck (most phrase tags); at: 'hidden' leaves it off.
    if (tag && tag.at !== 'hidden') {
      const th = tag.h || (tag.s.length > 12 ? 0.012 : 0.016);
      const lopts = { tracking: 0.08, bg: tag.bg || null, style: tag.style || 'pressed' };
      if (tagOut) this.lettering(torso, back(seam - 0.006 - th / 2), tag.s, th, [tag.c], tag.font || 'block', lopts);
      else if (tag.at === 'inside') {
        // aim from inside the neck at the inner face of the back, reading from the front
        const hit = this.raycast(torso, new THREE.Vector3(0, seam - 0.008 - th / 2, 0), new THREE.Vector3(0, 0, -1));
        this.lettering(torso, hit, tag.s, th, [tag.c], tag.font || 'block', { ...lopts, axis: new THREE.Vector3(0, 0, 1), inside: true, depth: 0.06 });
      }
    }

    // Back: nameplate and number. plateAt = name top below the seam (m); an outside tag pushes it down.
    const plate = jersey.plateFont || jersey.plate || (font === 'script' ? 'plate' : letterFont(font));
    const arch = jersey.plateArch || 0;
    const plateTop = seam - (jersey.plateAt ?? (tagOut ? Math.max(0.025, (tag.h || 0.016) + 0.022) : 0.1 * numH));
    const plateBot = plateTop - plateH * (1 + Math.max(0, arch));
    if (player.name) {
      this.lettering(torso, back((plateTop + plateBot) / 2), player.name.toUpperCase(), plateH,
        [jersey.plateColor || backColors[0], ...(jersey.plateOutline || [])], plate,
        { tracking: jersey.plateTracking ?? 0.05, arch, scaleX: jersey.plateScaleX || 1, maxW: jersey.plateMaxW ?? 0.235, o1: 0.07, o2: 0.05, style: jersey.plateStyle || numStyle,
          bar: jersey.plateBar ? (jersey.plateBar === true ? jersey.base : jersey.plateBar) : null });
    }
    const numTop = plateBot - 0.07 * numH;
    this.lettering(torso, back(numTop - numH / 2), num, numH, backColors, font, numOpts);
    if (jersey.backShoulder || jersey.panels?.wing) this.backShoulderPanel(jersey, torso, sleeves);

    // TV numbers: on top of the shoulders, or on the outside of the sleeves
    for (const s of ['L', 'R']) {
      const sh = this.J[`upperarm01.${s}`];
      const el = this.J[`lowerarm01.${s}`];
      const sx = Math.sign(sh.x);
      if (jersey.tv === 'shoulder') {
        // on the crown of the pad cap, which slopes down and out from the neck: aim from above and outside
        const d = new THREE.Vector3(sx * 0.45, 1, 0).normalize();
        const crown = sh.clone().add(new THREE.Vector3(sx * 0.005, 0.07, 0));
        const hit = this.raycast([...sleeves, ...torso], crown.clone().add(d.clone().multiplyScalar(0.6)), d.clone().negate());
        this.lettering([...sleeves, ...torso], hit, num, 0.085, colors.slice(0, 2), font, { ...numOpts, o1: 0.06, o2: 0, up: new THREE.Vector3(0, 0, -1), minDot: 0.2 });
      } else if (jersey.tv === 'sleeve') {
        const p = sh.clone().lerp(el, 0.28);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        this.lettering(sleeves, hit, num, 0.08, colors.slice(0, 2), font, { ...numOpts, o1: 0.06, o2: 0, minDot: 0.2 });
      }
      if (jersey.shoulder) {
        // shoulder graphic (bolts, stars, UCLA bars, peaks); `at` picks where it sits on the rounded pad cap:
        //   'front' (default): down the front of the shoulder from the cap to the armpit, upright
        //   'top':   on the crown of the cap like the shoulder TV numbers, its vertical axis running front to back
        //   'outer': on the outside of the upper sleeve under the cap, upright; `lift` tilts the
        //            projection up (default 0.12) so a mark can wrap over the top of the cap, and
        //            `minDot` (default 0.2) lets it run onto more steeply angled cloth
        //   'cuff':  on the outside of the sleeve at the hem, the mark's outer edge toward the hem
        const sp = jersey.shoulder;
        const where = sp.at || 'front';
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        let at, dir, up = V(0, 1, 0), facing = sx > 0 ? 'right' : 'left';
        if (where === 'top') {
          at = sh.clone().add(V(sx * 0.005, 0.07, 0)); dir = V(sx * 0.45, 1, 0); up = V(0, 0, -1);
        } else if (where === 'outer') {
          at = sh.clone().lerp(el, sp.along ?? 0.2); dir = V(sx, sp.lift ?? 0.12, 0.2);
        } else if (where === 'cuff') {
          // the decal's +x runs down the arm with the 'left' artwork on the left arm, so the outer edge meets the hem
          at = sh.clone().lerp(el, 0.25); dir = V(sx, 0, 0.25); up = V(0, 0, 1); facing = sx > 0 ? 'left' : 'right';
        } else {
          at = sh.clone().add(V(-sx * 0.035, -0.005, 0)); dir = V(sx * 0.25, 0.45, 1);
        }
        dir.normalize();
        const meshes = [...sleeves, ...torso];
        const hit = this.raycast(meshes, at.clone().add(dir.clone().multiplyScalar(0.6)), dir.clone().negate());
        const size = sp.size || 0.1;
        const opts = { depth: where === 'top' ? 0.2 : 0.14, style: patchStyle, up, minDot: sp.minDot ?? 0.2 };
        if (sp.img && logos[sp.img]) this.image(meshes, hit, size, logos[sp.img], opts);
        else {
          const c = paintLogo(sp, facing);
          if (c) this.canvasDecal(meshes, hit, size, c, { ...opts, key: JSON.stringify(sp) + sx });
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
        this.image(sleeves, hit, jersey.sleeveLogoSize || 0.075, logos[jersey.sleeveLogo]);
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

    // Cleats: a contrasting swoosh on the outside of each shoe. On a Nike
    // Vapor the lateral swoosh is ~14 cm long (about 45% of the outsole): the
    // hook sits low at the midfoot just above the plate, leading toward the
    // toe, and the tail sweeps back and up toward the heel counter. The
    // artwork is mirrored on the right shoe so it reads that way on both feet.
    const csCol = luminance(cleatColor) > 0.5 ? '#161616' : '#f2f2f2';
    const studs = this.meshes.stud || [];
    const v = new THREE.Vector3();
    for (const s of ['L', 'R']) {
      const sx = Math.sign(this.J[`foot.${s}`].x);
      // heel, toe and turf of this shoe from its vertices (the feet toe out a little)
      let heel = null, toe = null, turf = Infinity;
      for (const mesh of [...cleats, ...studs]) {
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
          if (Math.sign(v.x) !== sx) continue;
          turf = Math.min(turf, v.y);
          if (!cleats.includes(mesh)) continue;
          if (!heel || v.z < heel.z) heel = v.clone();
          if (!toe || v.z > toe.z) toe = v.clone();
        }
      }
      if (!heel) continue;
      const fwd = new THREE.Vector3(toe.x - heel.x, 0, toe.z - heel.z);
      const len = fwd.length();
      fwd.normalize();
      const out = new THREE.Vector3(fwd.z, 0, -fwd.x);   // lateral side
      if (out.x * sx < 0) out.negate();
      const artLen = 0.45 * len;                 // tip of the tail to the front of the hook
      const canvas = swooshCanvas(csCol, 256, { mirror: sx < 0 });
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.aniso; this.textures.push(t);
      // the artwork spans 24/26 of the canvas's 2.08 × px width (see swooshCanvas)
      const wM = artLen / ((2 * 24 / 26) / 2.08), hM = wM * canvas.height / canvas.width;
      // centre ~36% of the way from the heel, hook ~1 cm above the plate lip
      const at = heel.clone().addScaledVector(fwd, 0.36 * len);
      at.y = turf + 0.033 + hM / 2;
      const hit = this.raycast(cleats, at.clone().addScaledVector(out, 0.4), out.clone().negate());
      this.decal(cleats, hit, wM, hM, t, { minDot: 0.15, depth: 0.08 });
    }
  }
}
