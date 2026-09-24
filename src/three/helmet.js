import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { paintHelmet, paintLogo, paintHelmetNumber } from './paint.js';

// Procedural helmet: shell with jaw flaps, facemask and logo decals.
// Built around its own centre; the player places it on the head.

const HELMET_CENTER = new THREE.Vector3(0, 0, 0);
const HELMET_SCALE = new THREE.Vector3(0.9, 0.95, 1.08);
const HELMET_BASE_R = 0.154;

// Helmet shell cut-outs are done in the fragment shader so edges stay smooth.
function helmetCut(material, inner = false) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float cut;\nvarying float vCut;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = cut;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCut;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vCut < 0.0) discard;');
  };
  material.customProgramCacheKey = () => (inner ? 'helmet-cut-inner' : 'helmet-cut');
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function buildHelmetGeometry() {
  const g = new THREE.SphereGeometry(1, 160, 96);
  g.rotateZ(-Math.PI / 2);
  g.rotateX(Math.PI);
  const p = g.attributes.position;
  const nrm = g.attributes.normal;
  const sphereNormals = nrm.array.slice();
  const cut = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const bottom = y + 0.6;
    const face = Math.max(y - 0.2, 0.3 - z, Math.abs(x) - 0.64);
    const back = Math.max(z + 0.22, y + 0.4);
    cut[i] = Math.min(bottom, face, back);
    // Real shells aren't spheres: the jaw flaps sweep forward toward the facemask
    const jaw = smooth(0.25, -0.5, y) * smooth(-0.1, 0.55, z);
    p.setZ(i, z + 0.3 * jaw);
  }
  g.setAttribute('cut', new THREE.BufferAttribute(cut, 1));
  g.computeVertexNormals();
  // Sphere poles (the logo spots) get unreliable computed normals; keep the originals there
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getX(i)) > 0.93) nrm.setXYZ(i, sphereNormals[i * 3], sphereNormals[i * 3 + 1], sphereNormals[i * 3 + 2]);
  }
  return g;
}

function tube(points, radius, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, 64, radius, 10, closed);
}

function mirrorPts(pts) {
  const right = pts.map(([x, y, z]) => [-x, y, z]).reverse();
  return [...right, ...pts.slice(1)];
}


export class Helmet {
  constructor() {
    this.group = new THREE.Group();
    this.decals = [];
    this.mats = {
      helmet: new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide }),
      helmetInner: new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: '#1b1c1f', roughness: 0.9 }),
      mask: new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }),
      strap: new THREE.MeshStandardMaterial({ color: '#f1f1f1', roughness: 0.5 }),
    };
    helmetCut(this.mats.helmet);
    helmetCut(this.mats.helmetInner, true);
    const G = this.group;
    // ── Helmet ──
    const hg = buildHelmetGeometry();
    const shell = new THREE.Mesh(hg, this.mats.helmet);
    shell.castShadow = true;
    const inner = new THREE.Mesh(hg, this.mats.helmetInner);
    inner.scale.setScalar(0.985);
    const helmet = new THREE.Group();
    helmet.add(shell, inner);
    helmet.position.copy(HELMET_CENTER);
    helmet.scale.copy(HELMET_SCALE).multiplyScalar(HELMET_BASE_R);
    G.add(helmet);
    this.helmetShell = shell;
    this.helmetGroup = helmet;

    // facemask (in metres relative to the helmet centre)
    const mask = new THREE.Group();
    const R = 0.0055;
    const bars = [
      [[0.104, 0.024, 0.112], [0.094, 0.025, 0.152], [0.056, 0.026, 0.184], [0, 0.027, 0.194]],
      [[0.1, -0.034, 0.138], [0.09, -0.035, 0.166], [0.056, -0.037, 0.197], [0, -0.038, 0.207]],
      [[0.094, -0.082, 0.138], [0.082, -0.09, 0.166], [0.048, -0.098, 0.184], [0, -0.1, 0.19]],
    ];
    for (const b of bars) mask.add(new THREE.Mesh(tube(mirrorPts(b), R), this.mats.mask));
    for (const s of [1, -1]) {
      // verticals
      mask.add(new THREE.Mesh(tube([[s * 0.056, 0.026, 0.184], [s * 0.056, -0.037, 0.197], [s * 0.048, -0.098, 0.184]], R), this.mats.mask));
    }
    mask.add(new THREE.Mesh(tube([[0, -0.038, 0.207], [0, -0.07, 0.2], [0, -0.1, 0.19]], R), this.mats.mask));
    // chin strap cup
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.027, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.mats.strap);
    chin.rotation.x = Math.PI * 0.62;
    chin.scale.set(1, 1, 0.55);
    chin.position.set(0, -0.122, 0.12);
    mask.add(chin);
    for (const s of [1, -1]) {
      mask.add(new THREE.Mesh(tube([[s * 0.024, -0.128, 0.112], [s * 0.07, -0.11, 0.1], [s * 0.1, -0.075, 0.1]], 0.004), this.mats.strap));
    }
    mask.position.copy(HELMET_CENTER);
    mask.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    G.add(mask);
    this.maskGroup = mask;

  }

  set(helmet, player, T) {
    for (const d of this.decals) { d.geometry.dispose(); d.material.dispose(); d.parent?.remove(d); }
    this.decals = [];
    this.applyHelmet(helmet, player, T);
  }

  applyHelmet(helmet, player, T) {
    const m = this.mats.helmet;
    const { canvas } = paintHelmet(helmet);
    m.map = T(canvas);
    m.color.set('#ffffff');
    const fin = helmet.finish;
    m.roughness = fin === 'matte' ? 0.62 : fin === 'metallic' ? 0.28 : fin === 'chrome' ? 0.08 : 0.2;
    m.metalness = fin === 'metallic' ? 0.55 : fin === 'chrome' ? 0.95 : 0.0;
    m.clearcoat = fin === 'matte' ? 0.0 : 1.0;
    m.clearcoatRoughness = fin === 'metallic' ? 0.12 : 0.06;
    m.needsUpdate = true;

    this.maskGroup.visible = Boolean(helmet.mask);
    if (helmet.mask) {
      this.mats.mask.color.set(helmet.mask);
      this.mats.mask.metalness = 0.1;
    }

    // Decals: logo on both sides, plus sideline numbers where the team wears them
    const shell = this.helmetShell;
    shell.updateWorldMatrix(true, false);
    const logo = helmet.logo || { t: 'none' };
    const sides = logo.side === 'right' ? [-1] : [1, -1]; // player's right is -x
    const finish = { roughness: m.roughness, metalness: m.metalness * 0.3, clearcoat: m.clearcoat, clearcoatRoughness: 0.06 };

    const place = (canvas, side, dirLocal, size) => {
      if (!canvas) return;
      // hit point on the ellipsoid in world space
      const d = dirLocal.clone().normalize();
      const local = new THREE.Vector3(d.x * HELMET_SCALE.x, d.y * HELMET_SCALE.y, d.z * HELMET_SCALE.z).multiplyScalar(HELMET_BASE_R);
      const world = local.clone().add(HELMET_CENTER).applyMatrix4(this.group.matrixWorld);
      const normal = new THREE.Vector3(d.x / HELMET_SCALE.x, d.y / HELMET_SCALE.y, d.z / HELMET_SCALE.z).normalize();
      const helper = new THREE.Object3D();
      helper.position.copy(world);
      helper.lookAt(world.clone().add(normal));
      const geo = new DecalGeometry(shell, world, helper.rotation, new THREE.Vector3(size, size, 0.12));
      const mat = new THREE.MeshPhysicalMaterial({
        map: T(canvas), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, ...finish,
      });
      const decal = new THREE.Mesh(geo, mat);
      // Decal geometry is in world space; move it into the player's frame
      decal.geometry.applyMatrix4(new THREE.Matrix4().copy(this.group.matrixWorld).invert());
      this.group.add(decal);
      this.decals.push(decal);
    };

    const big = { wing: 0.24, ramhorn: 0.26, horn: 0.15, bolt: 0.17, horseshoe: 0.12 };
    for (const side of sides) {
      // side +1 is +x: seen from outside, the front of the helmet is on the left
      const facing = side > 0 ? 'left' : 'right';
      const canvas = logo.t === 'none' ? null : paintLogo(logo, facing);
      const size = big[logo.t] || (logo.t === 'steelmark' ? 0.085 : 0.105);
      const dir = logo.t === 'wing' ? new THREE.Vector3(side, 0.35, 0.18)
        : logo.t === 'ramhorn' ? new THREE.Vector3(side, 0.25, 0.15)
          : new THREE.Vector3(side, 0.06, -0.04);
      place(canvas, side, dir, size);
      if (helmet.numbers) {
        place(paintHelmetNumber(player.number, helmet.numbers), side, new THREE.Vector3(side, -0.12, -0.72), 0.06);
      }
    }
  }
}
