import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { paintHelmet, paintLogo, paintHelmetNumber } from './paint.js';

// SpeedFlex-style helmet (tools/build_helmet.py → public/models/helmet.glb).
// The shell is painted per team (base colour + stripe), the flex-panel groove
// and vents come from a baked bump map, logos are projected decals.

const URL = './public/models/helmet.glb';
const DETAIL_URL = './public/models/helmet_detail.png';
const LOGO_URL = (key) => `./public/logos/${key}.png`;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let modelPromise = null;
const logoCache = new Map();
function loadLogo(key) {
  if (!logoCache.has(key)) {
    logoCache.set(key, new Promise((resolve) => {
      new THREE.TextureLoader().load(LOGO_URL(key), (t) => { t.colorSpace = THREE.SRGBColorSpace; resolve(t); }, undefined, () => resolve(null));
    }));
  }
  return logoCache.get(key);
}

export class Helmet {
  constructor() {
    this.group = new THREE.Group();
    this.decals = [];
    this.textures = [];
    this.mats = {
      shell: new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.06, roughness: 0.2 }),
      liner: new THREE.MeshStandardMaterial({ color: '#1a1b1e', roughness: 0.9, side: THREE.DoubleSide }),
      trim: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.65 }),
      mask: new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
      clip: new THREE.MeshPhysicalMaterial({ color: '#2a2c30', roughness: 0.3, clearcoat: 0.5 }),
      cup: new THREE.MeshPhysicalMaterial({ color: '#f2f2f2', roughness: 0.35, clearcoat: 0.4 }),
      strap: new THREE.MeshStandardMaterial({ color: '#efefef', roughness: 0.6 }),
      pad: new THREE.MeshStandardMaterial({ color: '#232428', roughness: 0.95 }),
    };
    modelPromise ||= Promise.all([
      loader.loadAsync(URL),
      new THREE.TextureLoader().loadAsync(DETAIL_URL).catch(() => null),
    ]);
    this.ready = modelPromise.then(([gltf, detail]) => {
      const root = gltf.scene.clone(true);
      this.parts = {};
      root.traverse((o) => {
        if (!o.isMesh) return;
        const key = o.material.name.split('.')[0];
        if (this.mats[key]) o.material = this.mats[key];
        o.castShadow = true;
        o.receiveShadow = true;
        (this.parts[key] ||= []).push(o);
      });
      if (detail) {
        detail.flipY = false;
        detail.wrapS = THREE.RepeatWrapping;
        this.mats.shell.bumpMap = detail;
        this.mats.shell.bumpScale = 1.2;
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
    const img = logo.img ? await loadLogo(logo.img) : null;
    if (token !== this.token) return;
    this.clear();

    const m = this.mats.shell;
    const { canvas } = paintHelmet(helmet);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 8;
    this.textures.push(map);
    m.map = map;
    const fin = helmet.finish;
    m.roughness = fin === 'matte' ? 0.6 : fin === 'metallic' ? 0.3 : fin === 'chrome' ? 0.08 : 0.18;
    m.metalness = fin === 'metallic' ? 0.55 : fin === 'chrome' ? 0.95 : 0;
    m.clearcoat = fin === 'matte' ? 0 : 1;
    m.clearcoatRoughness = fin === 'metallic' ? 0.14 : 0.05;
    m.needsUpdate = true;

    const hasMask = Boolean(helmet.mask);
    for (const k of ['mask', 'clip']) for (const o of this.parts[k] || []) o.visible = hasMask;
    if (hasMask) this.mats.mask.color.set(helmet.mask);
    this.mats.cup.color.set(helmet.chinstrap || '#f2f2f2');
    this.mats.strap.color.set(helmet.chinstrap || '#efefef');

    this.group.updateMatrixWorld(true);
    const shell = this.parts.shell || [];
    const finish = { roughness: m.roughness, metalness: m.metalness * 0.4, clearcoat: m.clearcoat, clearcoatRoughness: 0.05 };
    const sides = logo.side === 'right' ? [-1] : [1, -1];   // the player's right is -x
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
          const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; this.textures.push(t);
          const size = { wing: 0.23, ramhorn: 0.25, horn: 0.15, bolt: 0.17, horseshoe: 0.12, steelmark: 0.085 }[logo.t] || 0.11;
          const at = logo.t === 'wing' ? [0.35, 0.25] : logo.t === 'ramhorn' ? [0.25, 0.2] : logo.at;
          this.decal(shell, this.hitSide(sx, at), size, size, t, finish, false);
        }
      }
      if (helmet.numbers) {
        const c = paintHelmetNumber(player.number ?? '', helmet.numbers);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; this.textures.push(t);
        this.decal(shell, this.hitSide(sx, [-0.2, -0.7]), 0.06, 0.06, t, finish, false);
      }
    }
  }

  // point on the shell side: at = [up, back] offsets of the aim direction
  hitSide(sx, at = [0.2, 0.06]) {
    const [up, back] = at;
    const dir = new THREE.Vector3(sx, up, -back).normalize();
    const center = new THREE.Vector3().setFromMatrixPosition(this.group.matrixWorld);
    const origin = center.clone().add(dir.clone().multiplyScalar(0.6));
    const rc = new THREE.Raycaster(origin, dir.clone().negate(), 0, 1);
    return rc.intersectObjects(this.parts.shell || [], false)[0] || null;
  }

  decal(meshes, hit, w, h, texture, finish, flip) {
    if (!hit || !texture) return;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const helper = new THREE.Object3D();
    helper.position.copy(hit.point);
    helper.lookAt(hit.point.clone().add(n));
    const mat = new THREE.MeshPhysicalMaterial({
      map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, ...finish,
    });
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    for (const mesh of meshes) {
      const geo = new DecalGeometry(mesh, hit.point, helper.rotation, new THREE.Vector3(w, h, 0.08));
      if (!geo.attributes.position.count) { geo.dispose(); continue; }
      // keep only triangles facing the projector (avoids smearing at the rim)
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
      this.group.add(d);
      this.decals.push(d);
    }
  }
}
