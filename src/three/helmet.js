import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { paintHelmet, paintLogo } from './paint.js';
import { numeralCanvas, numeralStyle } from './numerals.js';
import { asset, loadGLB } from '../assets.js';
import { loadLogo } from './logos.js';

// Riddell SpeedFlex (tools/build_helmet.py → public/models/helmet.glb).
// The shell is painted per team (base colour + stripe) under a clear coat; the
// Flex-panel hinge step comes from a baked bump map; logos, numbers and the NFL
// shield are vinyl decals that sit under the same clear coat.
//
// Helmet data used here (src/data/teams.js):
//   shell, finish ('gloss' | 'matte' | 'metallic' | 'chrome'), stripe, pattern,
//   mask (facemask colour, null = no mask), maskStyle ('2BD' | '2EG' | '3BD'),
//   chinstrap (strap colour),
//   logo, numbers, numAt, nameplate: { bg, fg } (Riddell bumper colours,
//   default black plate with a white wordmark), cup (chin cup colour).

const URL = 'public/models/helmet.glb';
const DETAIL_URL = asset('public/models/helmet_detail.png');

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// SF-2BD-SW (skill players, the default), SF-2EG-SW (eye guards), SF-3BD (lineman cage)
const MASK_STYLES = ['2BD', '2EG', '3BD'];
let modelPromise = null;

// glTF UVs have v down, so canvases map unflipped
function canvasTexture(c, { srgb = true, flipY = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = flipY;
  t.anisotropy = 8;
  return t;
}

// The Riddell wordmark: heavy upright geometric sans with a dotless i.
function wordmark(ctx, x, y, h, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.font = `900 ${h}px "Helvetica Neue", "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(x, y);
  ctx.scale(1.02, 1);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${-h * 0.02}px`;
  ctx.fillText('Rıddell', 0, 0);
  ctx.restore();
}

// Nameplate bumper: UV u runs across the plate, v from its bottom to its top.
function nameplateTexture(bg = '#141517', fg = '#f4f4f4') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 224;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  // faint moulded sheen toward the top edge
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  wordmark(ctx, 256, 118, 104, fg);
  return canvasTexture(c);
}

// Brow pad inside the front of the shell, "SPEEDFLEX" in grey on black vinyl.
function browTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#18191b';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#8d9096';
  ctx.font = '700 46px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(512, 100); ctx.scale(1.05, 1); ctx.fillText('SPEEDFLEX', 0, 0); ctx.restore();
  ctx.fillStyle = '#b5352d';
  ctx.font = '800 22px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Rıddell', 512, 64);
  return canvasTexture(c);
}

// Rear bumper: black rubber with the SPEEDFLEX name moulded in, a shade
// lighter. UV u runs around the back from the player's right side, so seen from
// behind it is mirrored.
function backplateTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141517';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.translate(512, 52); ctx.scale(-1, 1);
  ctx.fillStyle = '#26282b';
  ctx.font = '800 40px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillText('SPEEDFLEX', 0, 0);
  ctx.restore();
  return canvasTexture(c);
}

// Metallic paint: fine flake as roughness / metalness noise in the shell UVs
// (~0.4 mm per texel), under a smooth clear coat.
let flakeMaps = null;
function flake() {
  if (flakeMaps) return flakeMaps;
  const W = 1024, H = 512;
  const mk = (lo, hi, seed) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    let s = seed;
    for (let i = 0; i < W * H; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const r = s / 4294967296;
      const v = Math.round(255 * (lo + (hi - lo) * (r * r)));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = canvasTexture(c, { srgb: false, flipY: false });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  };
  flakeMaps = { rough: mk(0.55, 1.0, 7), metal: mk(0.6, 1.0, 11) };
  return flakeMaps;
}

// Vinyl decal: a hair of darker edge where the film meets the paint.
const vinylCache = new WeakMap();
function vinyl(tex) {
  const img = tex?.image;
  if (!img || !img.width) return tex;
  if (vinylCache.has(img)) return vinylCache.get(img);
  const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const w = Math.max(2, Math.round(img.width * s)), h = Math.max(2, Math.round(img.height * s));
  const pad = 4;
  const c = document.createElement('canvas');
  c.width = w + pad * 2; c.height = h + pad * 2;
  const ctx = c.getContext('2d');
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.max(1, w / 400);
  ctx.drawImage(img, pad, pad, w, h);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, pad, pad, w, h);
  const t = canvasTexture(c, { flipY: tex.flipY });
  t.colorSpace = tex.colorSpace;
  t.userData.padFrac = [pad / c.width, pad / c.height];
  vinylCache.set(img, t);
  return t;
}

export class Helmet {
  constructor() {
    this.group = new THREE.Group();
    this.decals = [];
    this.textures = [];
    this.mats = {
      shell: new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.04, roughness: 0.22 }),
      liner: new THREE.MeshStandardMaterial({ color: '#141517', roughness: 0.92, side: THREE.DoubleSide }),
      trim: new THREE.MeshPhysicalMaterial({ color: '#101113', roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.5 }),
      // powder-coated steel: satin with a soft sheen
      mask: new THREE.MeshPhysicalMaterial({ roughness: 0.38, metalness: 0.0, clearcoat: 0.55, clearcoatRoughness: 0.28 }),
      // SpeedFlex quick-release clips: clear polycarbonate, chrome release buttons
      clip: new THREE.MeshPhysicalMaterial({
        color: '#e4ecf0', roughness: 0.08, metalness: 0, transmission: 0.6, thickness: 0.006, ior: 1.58,
        clearcoat: 1, transparent: true, opacity: 0.78, depthWrite: false,
      }),
      button: new THREE.MeshStandardMaterial({ color: '#d9dcdf', roughness: 0.16, metalness: 1 }),
      clipscrew: new THREE.MeshStandardMaterial({ color: '#a7abb0', roughness: 0.3, metalness: 1 }),
      screw: new THREE.MeshStandardMaterial({ color: '#9a9ea3', roughness: 0.3, metalness: 1 }),
      buckle: new THREE.MeshPhysicalMaterial({ color: '#141416', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
      ratchet: new THREE.MeshPhysicalMaterial({ color: '#c9ced3', roughness: 0.25, transparent: true, opacity: 0.75, depthWrite: false }),
      bumper: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      backplate: new THREE.MeshPhysicalMaterial({ color: '#141517', roughness: 0.55, clearcoat: 0.15 }),
      cup: new THREE.MeshPhysicalMaterial({ color: '#f2f2f2', roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
      strap: new THREE.MeshStandardMaterial({ color: '#18191b', roughness: 0.75 }),
      pad: new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.9, side: THREE.DoubleSide }),
      cuppad: new THREE.MeshStandardMaterial({ color: '#d9dadc', roughness: 0.85, side: THREE.DoubleSide }),
      browpad: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
    };
    modelPromise ||= Promise.all([
      loadGLB(loader, URL),
      new THREE.TextureLoader().loadAsync(DETAIL_URL).catch(() => null),
    ]);
    this.ready = modelPromise.then(([gltf, detail]) => {
      const root = gltf.scene.clone(true);
      this.parts = {};
      root.traverse((o) => {
        if (!o.isMesh) return;
        const key = o.material.name.split('.')[0];
        if (this.mats[key]) o.material = this.mats[key];
        // clear plastic and thin hardware: no shadow acne from the shell
        o.castShadow = !['clip', 'ratchet', 'liner', 'pad', 'browpad'].includes(key);
        o.receiveShadow = true;
        if (key === 'clip' || key === 'ratchet') o.renderOrder = 3;
        // facemask meshes are named after their style (M2BD_, M2EG_, M3BD_)
        let n = o; let style = null;
        while (n && !style) { style = /^M(2BD|2EG|3BD)_/.exec(n.name || '')?.[1]; n = n.parent; }
        if (style) o.userData.maskStyle = style;
        (this.parts[key] ||= []).push(o);
      });
      this.mats.browpad.map = browTexture();
      this.mats.backplate.map = backplateTexture();
      this.mats.backplate.color.set('#ffffff');
      if (detail) {
        detail.flipY = false;
        detail.wrapS = THREE.RepeatWrapping;
        this.mats.shell.bumpMap = detail;
        this.mats.shell.bumpScale = 1.6;
      }
      this.group.add(root);
      this.loaded = true;
      if (this.pending) this.set(...this.pending);
    });
  }

  clear() {
    for (const d of this.decals) { d.geometry.dispose(); d.material.dispose(); d.parent?.remove(d); }
    this.decals = [];
    for (const t of this.textures) t.dispose();
    this.textures = [];
  }

  async set(helmet, player) {
    this.pending = [helmet, player];
    if (!this.loaded) return;
    const token = (this.token = Symbol('helmet'));
    const logo = helmet.logo || { t: 'none' };
    const [img, shield] = await Promise.all([logo.img ? loadLogo(logo.img) : null, loadLogo('NFL_shield')]);
    if (token !== this.token) return;
    this.clear();

    const m = this.mats.shell;
    const { canvas } = paintHelmet(helmet);
    const map = canvasTexture(canvas, { flipY: false });
    map.wrapS = THREE.RepeatWrapping;
    this.textures.push(map);
    m.map = map;
    const fin = helmet.finish;
    // gloss: urethane clear coat over pigmented shell; matte: flat clear, no
    // coat; metallic: flake under the coat; chrome: vacuum-metallised film
    m.roughness = fin === 'matte' ? 0.62 : fin === 'metallic' ? 0.34 : fin === 'chrome' ? 0.06 : 0.3;
    m.metalness = fin === 'metallic' ? 0.75 : fin === 'chrome' ? 1 : 0;
    m.clearcoat = fin === 'matte' ? 0 : 1;
    m.clearcoatRoughness = fin === 'metallic' ? 0.06 : 0.035;
    m.sheen = fin === 'matte' ? 0.25 : 0;
    m.sheenRoughness = 0.6;
    const fl = fin === 'metallic' ? flake() : null;
    m.roughnessMap = fl ? fl.rough : null;
    m.metalnessMap = fl ? fl.metal : null;
    m.needsUpdate = true;

    const hasMask = Boolean(helmet.mask);
    const style = MASK_STYLES.includes(helmet.maskStyle) ? helmet.maskStyle : '2BD';
    for (const k of ['clip', 'button', 'clipscrew']) for (const o of this.parts[k] || []) o.visible = hasMask;
    for (const o of this.parts.mask || []) o.visible = hasMask && o.userData.maskStyle === style;
    if (hasMask) this.mats.mask.color.set(helmet.mask);
    this.mats.cup.color.set(helmet.cup || '#f2f2f2');
    this.mats.strap.color.set(helmet.chinstrap || '#18191b');
    const np = helmet.nameplate || {};
    this.mats.bumper.map?.dispose();
    this.mats.bumper.map = nameplateTexture(np.bg, np.fg);
    this.mats.bumper.needsUpdate = true;

    this.group.updateMatrixWorld(true);
    const shell = this.parts.shell || [];
    // decals take the shell's clear coat (but not its flake)
    const finish = {
      roughness: fin === 'matte' ? 0.5 : 0.3, metalness: fin === 'chrome' ? 0.2 : 0,
      clearcoat: m.clearcoat, clearcoatRoughness: 0.04,
    };
    const sides = logo.side === 'right' ? [-1] : [1, -1];   // the player's right is -x
    this.shieldDecal(shield, finish);
    for (const sx of sides) {
      // +x side: seen from outside, the front of the helmet is on the viewer's left
      const facing = sx > 0 ? 'left' : 'right';
      if (img) {
        const flip = logo.faces && logo.faces !== facing;
        const a = img.image.width / img.image.height;
        const w = logo.size || 0.125;
        this.decal(shell, this.hitSide(sx, logo.at), w, w / a, img, finish, flip);
      } else if (logo.t && logo.t !== 'none') {
        const c = paintLogo(logo, facing);
        if (c) {
          const t = canvasTexture(c, { flipY: true }); this.textures.push(t);
          const size = { wing: 0.23, ramhorn: 0.25, horn: 0.15, bolt: 0.17, horseshoe: 0.12, steelmark: 0.085 }[logo.t] || 0.11;
          const at = logo.t === 'wing' ? [0.35, 0.25] : logo.t === 'ramhorn' ? [0.25, 0.2] : logo.at;
          this.decal(shell, this.hitSide(sx, at), size, size, t, finish, false);
        }
      }
      if (helmet.numbers) {
        const N = numeralCanvas(String(player.number ?? ''), [helmet.numbers], numeralStyle(player.font) ? player.font : 'block', { px: 160 });
        if (N) {
          const t = canvasTexture(N.canvas, { flipY: true }); this.textures.push(t);
          const h = 0.045 / N.inkHeight;
          this.decal(shell, this.hitSide(sx, helmet.numAt || [-0.25, -0.75]), h * N.aspect, h, t, finish, false);
        }
      }
    }
  }

  // NFL shield decal, low on the back of the shell above the rear bumper
  shieldDecal(shield, finish) {
    if (!shield?.image) return;
    const dir = new THREE.Vector3(0, -0.36, -1).normalize();
    const center = new THREE.Vector3().setFromMatrixPosition(this.group.matrixWorld);
    const rc = new THREE.Raycaster(center.clone().add(dir.clone().multiplyScalar(0.6)), dir.clone().negate(), 0, 1);
    const hit = rc.intersectObjects(this.parts.shell || [], false)[0];
    const a = shield.image.width / shield.image.height;
    this.decal(this.parts.shell || [], hit, 0.026 * a, 0.026, shield, finish, false);
  }

  // point on the shell side: at = [up, back] offsets of the aim direction. The
  // default centres a mark about 6 cm above eye level, just behind the ear line,
  // where NFL decals sit on a SpeedFlex (clear of the strap rocker below).
  hitSide(sx, at = [0.5, 0.08]) {
    const [up, back] = at;
    const dir = new THREE.Vector3(sx, up, -back).normalize();
    const center = new THREE.Vector3().setFromMatrixPosition(this.group.matrixWorld);
    const origin = center.clone().add(dir.clone().multiplyScalar(0.6));
    const rc = new THREE.Raycaster(origin, dir.clone().negate(), 0, 1);
    return rc.intersectObjects(this.parts.shell || [], false)[0] || null;
  }

  decal(meshes, hit, w, h, texture, finish, flip) {
    if (!hit || !texture) return;
    // vinyl edge; the padded canvas is a little larger than the mark
    const tex = vinyl(texture);
    if (tex !== texture) {
      const [px, py] = tex.userData.padFrac;
      w /= 1 - 2 * px; h /= 1 - 2 * py;
    }
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const helper = new THREE.Object3D();
    helper.position.copy(hit.point);
    helper.lookAt(hit.point.clone().add(n));
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, ...finish,
    });
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    for (const mesh of meshes) {
      const geo = new DecalGeometry(mesh, hit.point, helper.rotation, new THREE.Vector3(w, h, 0.08));
      if (!geo.attributes.position.count) { geo.dispose(); continue; }
      // keep only triangles facing the projector (avoids smearing at the rim
      // and onto the vent walls)
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
      const idx = [];
      const tmp = new THREE.Vector3();
      for (let t = 0; t < pos.count; t += 3) {
        tmp.set(0, 0, 0);
        for (let k = 0; k < 3; k++) tmp.add(new THREE.Vector3().fromBufferAttribute(nor, t + k));
        if (tmp.normalize().dot(n) > 0.3) idx.push(t, t + 1, t + 2);
      }
      if (flip) for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - uv.getX(k));
      geo.setIndex(idx);
      geo.applyMatrix4(inv);
      const d = new THREE.Mesh(geo, mat);
      d.renderOrder = 2;
      d.receiveShadow = true;
      this.group.add(d);
      this.decals.push(d);
    }
  }
}
