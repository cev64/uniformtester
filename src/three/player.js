import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { paintFabricNormal, paintLogo, shade, luminance } from './paint.js';
import { paintTorso, paintSleeveTex, paintPantsTex, paintSocksTex, paintCollar, letteringCanvas, eyeCanvas, swooshCanvas } from './garments.js';
import { Helmet } from './helmet.js';
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
const MODEL_URL = 'public/models/player.glb';
const META_URL = 'public/models/player.json';
const LOGO_URL = (key) => asset(`public/logos/${key}.png`);

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

function fabric(repeat, { sheen = 0.35, roughness = 0.78, normal = 0.35 } = {}) {
  const n = getFabricNormal().clone();
  n.repeat.set(repeat[0], repeat[1]);
  n.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({
    roughness, metalness: 0, sheen, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.2, 0.2, 0.2),
    normalMap: n, normalScale: new THREE.Vector2(normal, normal), side: THREE.DoubleSide,
  });
}

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

const logoCache = new Map();
// 'KEY@white' gives a single-colour silhouette of a logo (e.g. a white "ny" on a blue jersey)
function loadLogo(key) {
  if (!logoCache.has(key)) {
    const [file, tint] = key.split('@');
    logoCache.set(key, new Promise((resolve) => {
      new THREE.TextureLoader().load(LOGO_URL(file), (t) => {
        if (tint) {
          const img = t.image;
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          ctx.globalCompositeOperation = 'source-in';
          ctx.fillStyle = tint === 'white' ? '#ffffff' : tint;
          ctx.fillRect(0, 0, c.width, c.height);
          t.dispose();
          t = new THREE.CanvasTexture(c);
        }
        t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      }, undefined, () => resolve(null));
    }));
  }
  return logoCache.get(key);
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
    this.mats = {
      jersey: fabric([40, 20]),
      collar: fabric([90, 3], { roughness: 0.85, normal: 0.6 }),
      sleeve: fabric([14, 6]),
      pants: fabric([14, 18], { roughness: 0.55, sheen: 0.7, normal: 0.25 }),
      socks: fabric([8, 10], { roughness: 0.9, sheen: 0.3 }),
      skin: new THREE.MeshPhysicalMaterial({ roughness: 0.48, sheen: 0.3, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.3, 0.18, 0.12), clearcoat: 0.08, clearcoatRoughness: 0.5 }),
      cleat: new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      glove: new THREE.MeshPhysicalMaterial({ roughness: 0.5, sheen: 0.4, sheenRoughness: 0.5 }),
      eye: new THREE.MeshPhysicalMaterial({ roughness: 0.08, clearcoat: 1, map: tex(eyeCanvas(), this.aniso) }),
    };
    this.meshes = {};
    root.traverse((o) => {
      if (!o.isMesh) return;
      const key = o.material.name.split('.')[0];
      if (this.mats[key]) o.material = this.mats[key];
      o.castShadow = true;
      o.receiveShadow = true;
      (this.meshes[key] ||= []).push(o);
    });
    this.group.add(root);

    // Joints (three.js space)
    this.J = Object.fromEntries(Object.entries(meta.joints).map(([k, v]) => [k, B2T(v)]));
    // helmet: brow just above the eyes, shell centred over the skull
    const eyes = this.J['eye.L'].clone().add(this.J['eye.R']).multiplyScalar(0.5);
    this.helmet.group.position.set(0, eyes.y + 0.004, eyes.z - 0.078);
    this.loaded = true;
    if (this.pending) this.setUniform(...this.pending);
  }

  disposeUniform() {
    for (const t of this.textures) t.dispose();
    this.textures = [];
    for (const d of this.decals) { d.geometry.dispose(); d.material.dispose(); d.parent?.remove(d); }
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
    const logoKeys = [jersey.chestLogo, jersey.sleeveLogo, jersey.centerLogo, jersey.shoulder?.img, pants.hipLogo, 'NFL_shield'].filter(Boolean);
    const logos = Object.fromEntries(await Promise.all(logoKeys.map(async (k) => [k, await loadLogo(k)])));
    if (token !== this.token) return;

    this.disposeUniform();
    const T = (c) => { const t = tex(c, this.aniso); this.textures.push(t); return t; };
    const m = this.mats, meta = this.meta;

    m.jersey.map = T(paintTorso(jersey, meta));
    m.sleeve.map = T(paintSleeveTex(jersey, meta));
    m.pants.map = T(paintPantsTex(pants, meta));
    m.socks.map = T(paintSocksTex(socks, meta));
    for (const k of ['jersey', 'sleeve', 'pants', 'socks']) { m[k].color.set('#ffffff'); m[k].needsUpdate = true; }

    m.collar.map = T(paintCollar(jersey, meta));
    m.collar.color.set('#ffffff');
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

    this.placeDecals(team, jersey, pants, player, logos, cleat);
    this.helmet.set(helmet, player);
  }

  // ─── decals ─────────────────────────────────────────────────────────

  raycast(meshes, origin, dir) {
    const rc = new THREE.Raycaster(origin, dir.clone().normalize(), 0, 2);
    const hits = rc.intersectObjects(meshes, false);
    return hits[0] || null;
  }

  decal(meshes, hit, width, height, texture, { up = new THREE.Vector3(0, 1, 0), depth = 0.1, rough = 0.6 } = {}) {
    if (!hit || !texture) return;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const helper = new THREE.Object3D();
    helper.position.copy(hit.point);
    helper.up.copy(up);
    helper.lookAt(hit.point.clone().add(n));
    const mat = new THREE.MeshPhysicalMaterial({
      map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
      roughness: rough, sheen: 0.2,
    });
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    for (const mesh of meshes) {
      const geo = facing(new DecalGeometry(mesh, hit.point, helper.rotation, new THREE.Vector3(width, height, depth)), n);
      if (!geo) continue;
      geo.applyMatrix4(inv);   // DecalGeometry is in world space
      const d = new THREE.Mesh(geo, mat);
      d.renderOrder = 2;
      d.receiveShadow = true;
      this.group.add(d);
      this.decals.push(d);
    }
  }

  lettering(meshes, hit, text, heightM, colors, font, opts = {}) {
    if (!text || !hit) return;
    const L = letteringCanvas(text, colors, font, opts);
    const t = new THREE.CanvasTexture(L.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = this.aniso;
    this.textures.push(t);
    const h = heightM / (L.inkHeight || 0.7);
    this.decal(meshes, hit, h * L.aspect, h, t, opts);
  }

  image(meshes, hit, widthM, texture, opts = {}) {
    if (!texture?.image || !hit) return;
    const a = texture.image.width / texture.image.height;
    this.decal(meshes, hit, widthM, widthM / a, texture, opts);
  }

  placeDecals(team, jersey, pants, player, logos, cleatColor) {
    this.group.updateMatrixWorld(true);
    const torso = this.meshes.jersey || [];
    const sleeves = this.meshes.sleeve || [];
    const pantsM = this.meshes.pants || [];
    const cleats = this.meshes.cleat || [];
    const neckY = this.J.neck01.y;
    const font = jersey.font || team.font;
    const num = String(player.number ?? '');
    const colors = jersey.num;
    const front = (y, x = 0) => this.raycast(torso, new THREE.Vector3(x, y, 0.6), new THREE.Vector3(0, 0, -1));
    const back = (y, x = 0) => this.raycast(torso, new THREE.Vector3(x, y, -0.6), new THREE.Vector3(0, 0, 1));

    // Front: wordmark, number, NFL shield at the collar V
    const w = jersey.word;
    if (w) {
      this.lettering(torso, front(neckY - 0.165), w.s, 0.034, [w.c, w.o].filter(Boolean), w.script ? 'script' : (w.font || font), { tracking: w.script ? 0 : 0.12, o1: 0.08 });
    }
    const top = w || jersey.centerLogo;
    this.lettering(torso, front(neckY - (top ? 0.3 : 0.28)), num, 0.18, colors, font);
    if (jersey.centerLogo) this.image(torso, front(neckY - 0.17), 0.06, logos[jersey.centerLogo]);
    this.image(torso, front(neckY - 0.105), 0.036, logos.NFL_shield);
    // chest patch sits on the player's left chest (viewer's right)
    if (jersey.chestLogo) this.image(torso, front(neckY - 0.16, 0.11), 0.07, logos[jersey.chestLogo]);

    // Back collar tag just under the neckline
    if (jersey.neckTag) {
      const t = jersey.neckTag;
      this.lettering(torso, back(neckY - 0.045), t.s, t.s.length > 12 ? 0.012 : 0.016, [t.c], 'block', { tracking: 0.08 });
    }

    // Back: nameplate and number
    if (player.name) this.lettering(torso, back(neckY - 0.1), player.name.toUpperCase(), 0.052, [colors[0]], font === 'script' ? 'block' : font, { tracking: 0.06 });
    this.lettering(torso, back(neckY - 0.29), num, 0.23, colors, font);

    // TV numbers: on top of the shoulders, or on the outside of the sleeves
    for (const s of ['L', 'R']) {
      const sh = this.J[`upperarm01.${s}`];
      const el = this.J[`lowerarm01.${s}`];
      const sx = Math.sign(sh.x);
      if (jersey.tv === 'shoulder') {
        const hit = this.raycast([...sleeves, ...torso], new THREE.Vector3(sh.x - sx * 0.035, 2.3, sh.z), new THREE.Vector3(0, -1, 0));
        this.lettering([...sleeves, ...torso], hit, num, 0.075, colors.slice(0, 2), font, { up: new THREE.Vector3(0, 0, -1) });
      } else if (jersey.tv === 'sleeve') {
        const p = sh.clone().lerp(el, 0.28);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        this.lettering(sleeves, hit, num, 0.07, colors.slice(0, 2), font);
      }
      if (jersey.shoulder) {
        // shoulder graphic (bolts, stars, horns) on the front of each shoulder, aimed from above and in front
        const sp = jersey.shoulder;
        const at = sh.clone().add(new THREE.Vector3(-sx * 0.02, 0.05, 0.0));
        const dir = new THREE.Vector3(sx * 0.35, 0.55, 1).normalize();
        const hit = this.raycast([...sleeves, ...torso], at.clone().add(dir.clone().multiplyScalar(0.6)), dir.clone().negate());
        let t = sp.img ? logos[sp.img] : null;
        if (!t) {
          const c = paintLogo(sp, sx > 0 ? 'right' : 'left');
          if (c) { t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; this.textures.push(t); }
        }
        if (t) this.decal([...sleeves, ...torso], hit, sp.size || 0.1, sp.size || 0.1, t, { depth: 0.14 });
      }
      if (jersey.sleeveLogo) {
        const p = sh.clone().lerp(el, 0.18);
        const hit = this.raycast(sleeves, p.clone().add(new THREE.Vector3(sx * 0.4, 0, 0)), new THREE.Vector3(-sx, 0, 0));
        this.image(sleeves, hit, 0.075, logos[jersey.sleeveLogo]);
      }
    }

    // Pants: NFL shield on the player's right hip, swoosh on the left, team logos on the hip sides
    const hipL = this.J['upperleg01.L'], hipR = this.J['upperleg01.R'];
    const hipY = hipL.y + 0.12;
    this.image(pantsM, this.raycast(pantsM, new THREE.Vector3(hipR.x - 0.02, hipY, 0.6), new THREE.Vector3(0, 0, -1)), 0.034, logos.NFL_shield);
    const sw = new THREE.CanvasTexture(swooshCanvas(pants.swoosh || shade(pants.base, luminance(pants.base) > 0.5 ? -0.75 : 0.8)));
    sw.colorSpace = THREE.SRGBColorSpace; this.textures.push(sw);
    this.decal(pantsM, this.raycast(pantsM, new THREE.Vector3(hipL.x + 0.02, hipY, 0.6), new THREE.Vector3(0, 0, -1)), 0.06, 0.03, sw);
    if (pants.hipLogo && logos[pants.hipLogo]) {
      for (const h of [hipL, hipR]) {
        const sx = Math.sign(h.x);
        const hit = this.raycast(pantsM, new THREE.Vector3(sx * 0.6, hipY + 0.02, h.z), new THREE.Vector3(-sx, 0, 0));
        this.image(pantsM, hit, 0.07, logos[pants.hipLogo]);
      }
    }

    // Cleats: a contrasting swoosh on the outside of each shoe
    const cs = new THREE.CanvasTexture(swooshCanvas(luminance(cleatColor) > 0.5 ? '#161616' : '#f2f2f2'));
    cs.colorSpace = THREE.SRGBColorSpace; this.textures.push(cs);
    for (const s of ['L', 'R']) {
      const f = this.J[`foot.${s}`];
      const sx = Math.sign(f.x);
      const hit = this.raycast(cleats, new THREE.Vector3(sx * 0.6, 0.035, f.z + 0.03), new THREE.Vector3(-sx, 0, 0));
      this.decal(cleats, hit, 0.1, 0.05, cs);
    }
  }
}
