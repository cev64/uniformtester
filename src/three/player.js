import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { buildTube, interpProfile } from './tube.js';
import {
  paintJersey, paintSleeve, paintPantsHips, paintPantsThigh, paintSocks, paintHelmet,
  paintLogo, paintHelmetNumber, paintFabricNormal, shade, luminance,
} from './paint.js';

// A procedurally modelled player in a relaxed stance, facing +z.
// Units are metres; feet on y = 0, top of helmet ≈ 1.9 m.

const SKIN_TONES = ['#8D5A3B', '#5C3A24', '#C68B5E', '#E5B895'];
export { SKIN_TONES };

const ARM_ANGLE = THREE.MathUtils.degToRad(17);
const SHOULDER = new THREE.Vector3(0.285, 1.44, 0);
const SLEEVE_LEN = 0.24;
const HELMET_CENTER = new THREE.Vector3(0, 1.755, 0.005);
const HELMET_SCALE = new THREE.Vector3(0.9, 0.95, 1.08);
const HELMET_BASE_R = 0.154;

let fabricNormal = null;
function getFabricNormal() {
  if (!fabricNormal) {
    fabricNormal = new THREE.CanvasTexture(paintFabricNormal());
    fabricNormal.wrapS = fabricNormal.wrapT = THREE.RepeatWrapping;
  }
  return fabricNormal;
}

function tex(canvas, anisotropy) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function fabric(repeat, { sheen = 0.5, roughness = 0.82 } = {}) {
  const n = getFabricNormal().clone();
  n.repeat.set(repeat[0], repeat[1]);
  n.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({
    roughness, metalness: 0, sheen, sheenRoughness: 0.7, sheenColor: new THREE.Color(0.18, 0.18, 0.18),
    normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide,
  });
}

// Orient a mesh built along +y so its local -y runs along `dir` from `origin`.
function alongDir(obj, origin, dir) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  obj.quaternion.copy(q);
  obj.position.copy(origin);
}

function limbRings(len, radii, n = 2) {
  // radii: [[t (0 = far end, 1 = near end), rx, rz]]
  return interpProfile(radii.map(([t, rx, rz]) => ({ y: t * len, rx, rz, n })), 28);
}

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

export class Player {
  constructor(renderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.group = new THREE.Group();
    this.textures = [];
    this.decals = [];
    this.build();
  }

  build() {
    const G = this.group;
    this.mats = {
      jersey: fabric([34, 16]),
      sleeve: fabric([10, 6]),
      collar: fabric([12, 2]),
      hips: fabric([18, 8], { roughness: 0.55, sheen: 0.8 }),
      thigh: fabric([12, 12], { roughness: 0.55, sheen: 0.8 }),
      socks: fabric([6, 18], { roughness: 0.9, sheen: 0.4 }),
      skin: new THREE.MeshStandardMaterial({ roughness: 0.55, color: SKIN_TONES[0] }),
      glove: new THREE.MeshPhysicalMaterial({ roughness: 0.6, sheen: 0.3 }),
      cleat: new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      sole: new THREE.MeshStandardMaterial({ roughness: 0.8, color: '#e8e8e8' }),
      belt: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      helmet: new THREE.MeshPhysicalMaterial({ side: THREE.FrontSide }),
      helmetInner: new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: '#1b1c1f', roughness: 0.9 }),
      mask: new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 }),
      strap: new THREE.MeshStandardMaterial({ color: '#f1f1f1', roughness: 0.5 }),
    };
    helmetCut(this.mats.helmet);
    helmetCut(this.mats.helmetInner, true);

    const add = (geo, mat, cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast; m.receiveShadow = true;
      G.add(m);
      return m;
    };

    // ── Torso / jersey ──
    const torsoTable = [
      { y: 0.93, rx: 0.176, rz: 0.128, n: 2.2 },
      { y: 1.02, rx: 0.182, rz: 0.132, n: 2.2 },
      { y: 1.12, rx: 0.198, rz: 0.14, n: 2.3 },
      { y: 1.22, rx: 0.214, rz: 0.15, n: 2.4 },
      { y: 1.31, rx: 0.238, rz: 0.158, n: 2.6 },
      { y: 1.38, rx: 0.272, rz: 0.165, n: 2.9 },
      { y: 1.45, rx: 0.3, rz: 0.168, n: 3.2 },
      { y: 1.505, rx: 0.294, rz: 0.158, n: 3.2 },
      { y: 1.545, rx: 0.255, rz: 0.142, n: 3.0 },
      { y: 1.577, rx: 0.19, rz: 0.118, n: 2.6 },
      { y: 1.6, rx: 0.095, rz: 0.082, n: 2.0 },
    ];
    const torso = buildTube(interpProfile(torsoTable, 72), { segments: 128 });
    this.torsoMeta = torso.meta;
    add(torso.geometry, this.mats.jersey);

    // Collar ring
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.089, 0.012, 12, 48), this.mats.collar);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1.05, 0.88, 1);
    collar.position.set(0, 1.598, 0.004);
    this.collar = collar;
    G.add(collar);

    // ── Arms ──
    // Sleeve tube runs cuff → shoulder joint, then domes over the shoulder pad,
    // so shoulder stripes (UCLA loops, horns, bolts) can wrap the shoulder.
    const sleeveRings = limbRings(SLEEVE_LEN, [[0, 0.083, 0.078], [0.5, 0.09, 0.085], [1, 0.102, 0.097]], 2);
    const DOME = 0.104;
    for (let k = 1; k <= 10; k++) {
      const a = (k / 10) * (Math.PI / 2) * 0.97;
      sleeveRings.push({ y: SLEEVE_LEN + Math.sin(a) * DOME * 0.92, rx: Math.cos(a) * DOME, rz: Math.cos(a) * DOME * 0.95, n: 2 });
    }
    this.sleeveMeta = null;
    for (const side of [1, -1]) {
      const dir = new THREE.Vector3(side * Math.sin(ARM_ANGLE), -Math.cos(ARM_ANGLE), 0.04).normalize();
      const origin = SHOULDER.clone().multiply(new THREE.Vector3(side, 1, 1));

      const sl = buildTube(sleeveRings, { segments: 96, a0: side > 0 ? 0 : Math.PI });
      this.sleeveMeta = { ...sl.meta, joint: SLEEVE_LEN };
      const sleeve = add(sl.geometry, this.mats.sleeve);
      // tube runs y: 0 (cuff) → joint → dome; shift so the joint sits at the shoulder
      sleeve.geometry.translate(0, -SLEEVE_LEN, 0);
      alongDir(sleeve, origin.clone().add(dir.clone().multiplyScalar(-0.02)), dir);

      // skin: upper arm + forearm
      const elbow = origin.clone().add(dir.clone().multiplyScalar(0.3));
      const upper = add(new THREE.CapsuleGeometry(0.064, 0.2, 8, 20), this.mats.skin);
      alongDir(upper, origin.clone().add(dir.clone().multiplyScalar(0.15)), dir);
      upper.position.copy(origin.clone().add(dir.clone().multiplyScalar(0.17)));

      const dir2 = new THREE.Vector3(side * 0.16, -0.95, 0.26).normalize();
      const fore = add(new THREE.CapsuleGeometry(0.052, 0.19, 8, 20), this.mats.skin);
      fore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      fore.position.copy(elbow.clone().add(dir2.clone().multiplyScalar(0.13)));
      fore.scale.set(1, 1, 0.92);

      // glove
      const wrist = elbow.clone().add(dir2.clone().multiplyScalar(0.25));
      const hand = add(new THREE.CapsuleGeometry(0.036, 0.07, 6, 16), this.mats.glove);
      hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      hand.position.copy(wrist.clone().add(dir2.clone().multiplyScalar(0.07)));
      hand.scale.set(1.25, 1, 0.68);
      const thumb = add(new THREE.CapsuleGeometry(0.014, 0.04, 4, 10), this.mats.glove);
      thumb.position.copy(wrist.clone().add(new THREE.Vector3(-side * 0.012, -0.03, 0.035)));
      thumb.rotation.set(0.6, 0, side * 0.3);
      const cuff = add(new THREE.CylinderGeometry(0.043, 0.041, 0.035, 20), this.mats.glove);
      cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      cuff.position.copy(wrist.clone().add(dir2.clone().multiplyScalar(0.008)));
    }

    // ── Neck & head ──
    const neck = add(new THREE.CylinderGeometry(0.058, 0.066, 0.2, 24), this.mats.skin);
    neck.position.set(0, 1.63, 0.0);
    const head = add(new THREE.SphereGeometry(0.106, 40, 28), this.mats.skin);
    head.scale.set(0.86, 1.06, 1.0);
    head.position.set(0, 1.742, 0.012);
    // eyes, just deep enough to catch a glint through the facemask
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#15110e', roughness: 0.2 });
    for (const s of [1, -1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 16, 12), eyeMat);
      e.position.set(s * 0.031, 1.755, 0.107);
      G.add(e);
    }
    const nose = add(new THREE.SphereGeometry(0.02, 16, 12), this.mats.skin);
    nose.scale.set(0.8, 1.1, 1);
    nose.position.set(0, 1.733, 0.114);

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

    // ── Pants ──
    const hipsTable = [
      { y: 0.79, rx: 0.07, rz: 0.06, n: 2 },
      { y: 0.83, rx: 0.155, rz: 0.12, n: 2.3 },
      { y: 0.9, rx: 0.186, rz: 0.138, n: 2.4 },
      { y: 0.97, rx: 0.192, rz: 0.14, n: 2.4 },
      { y: 1.04, rx: 0.19, rz: 0.139, n: 2.3 },
    ];
    const hips = buildTube(interpProfile(hipsTable, 28), { segments: 128 });
    this.hipsMeta = hips.meta;
    add(hips.geometry, this.mats.hips);
    const belt = add(new THREE.TorusGeometry(1, 0.012, 10, 64), this.mats.belt);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(0.192, 0.141, 1);
    belt.position.y = 1.035;

    const THIGH_LEN = 0.54;
    const thighRings = limbRings(THIGH_LEN, [[0, 0.07, 0.074], [0.25, 0.08, 0.086], [0.6, 0.098, 0.104], [1, 0.108, 0.11]], 2.2);
    for (const side of [1, -1]) {
      const hip = new THREE.Vector3(side * 0.098, 1.0, 0.005);
      const knee = new THREE.Vector3(side * 0.128, 0.49, 0.03);
      const dir = knee.clone().sub(hip).normalize();
      const th = buildTube(thighRings, { segments: 96, a0: side > 0 ? 0 : Math.PI });
      this.thighMeta = th.meta;
      th.geometry.translate(0, -THIGH_LEN, 0);
      const m = add(th.geometry, this.mats.thigh);
      alongDir(m, hip, dir);

      // knee hem ring
      const hem = add(new THREE.TorusGeometry(0.071, 0.008, 8, 32), this.mats.thigh);
      hem.position.copy(hip.clone().add(dir.clone().multiplyScalar(THIGH_LEN - 0.002)));
      hem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

      // ── Socks / lower leg ──
      const SOCK_LEN = 0.44;
      const ankle = new THREE.Vector3(side * 0.152, 0.085, 0.0);
      const top = new THREE.Vector3(side * 0.13, 0.525, 0.028);
      const ldir = ankle.clone().sub(top).normalize();
      const sockRings = limbRings(SOCK_LEN, [[0, 0.043, 0.045], [0.18, 0.047, 0.05], [0.55, 0.066, 0.07], [0.78, 0.069, 0.066], [1, 0.064, 0.064]], 2);
      const sk = buildTube(sockRings, { segments: 64, a0: side > 0 ? 0 : Math.PI });
      this.sockMeta = sk.meta;
      sk.geometry.translate(0, -SOCK_LEN, 0);
      const sock = add(sk.geometry, this.mats.socks);
      alongDir(sock, top, ldir);

      // ── Cleat ──
      const shoe = add(new THREE.CapsuleGeometry(0.048, 0.17, 8, 24), this.mats.cleat);
      shoe.rotation.x = Math.PI / 2;
      shoe.scale.set(1.0, 1, 0.72);
      shoe.position.set(side * 0.158, 0.048, 0.055);
      shoe.rotation.y = side * 0.08;
      const sole = add(new THREE.BoxGeometry(0.094, 0.014, 0.27), this.mats.sole);
      sole.position.set(side * 0.158, 0.009, 0.055);
      sole.rotation.y = side * 0.08;
      const collarShoe = add(new THREE.CylinderGeometry(0.05, 0.052, 0.05, 24), this.mats.cleat);
      collarShoe.position.set(side * 0.153, 0.1, 0.008);
    }
  }

  disposeUniform() {
    for (const t of this.textures) t.dispose();
    this.textures = [];
    for (const d of this.decals) { d.geometry.dispose(); d.material.map?.dispose(); d.material.dispose(); d.parent?.remove(d); }
    this.decals = [];
  }

  setUniform(team, sel, player) {
    this.disposeUniform();
    const helmet = team.helmets.find((x) => x.id === sel.h) || team.helmets[0];
    const jersey = team.jerseys.find((x) => x.id === sel.j) || team.jerseys[0];
    const pants = team.pants.find((x) => x.id === sel.p) || team.pants[0];
    const socks = team.socks.find((x) => x.id === sel.s) || team.socks[0];
    const T = (c) => { const t = tex(c, this.aniso); this.textures.push(t); return t; };

    const m = this.mats;
    m.jersey.map = T(paintJersey(jersey, team, player, this.torsoMeta));
    m.sleeve.map = T(paintSleeve(jersey, team, player, this.sleeveMeta));
    m.collar.color.set(jersey.collar || jersey.sleeve?.stripes?.[0]?.[0] || shade(jersey.base, -0.25));
    m.hips.map = T(paintPantsHips(pants, this.hipsMeta));
    m.thigh.map = T(paintPantsThigh(pants, this.thighMeta));
    m.socks.map = T(paintSocks(socks, this.sockMeta));
    m.belt.color.set(shade(pants.base, -0.35));
    m.skin.color.set(SKIN_TONES[player.skin ?? 0]);

    const glove = player.gloves === 'white' ? '#F4F4F4' : player.gloves === 'black' ? '#141414' : jersey.base;
    m.glove.color.set(glove);
    const cleat = player.cleats === 'auto'
      ? (luminance(socks.base) > 0.5 || luminance(pants.base) > 0.6 ? '#F2F2F2' : '#151515')
      : player.cleats === 'white' ? '#F2F2F2' : player.cleats === 'black' ? '#151515' : team.colors[0];
    m.cleat.color.set(cleat);
    m.sole.color.set(luminance(cleat) > 0.5 ? '#d9d9d9' : '#2a2a2a');

    for (const k of ['jersey', 'sleeve', 'hips', 'thigh', 'socks']) { m[k].color.set('#ffffff'); m[k].needsUpdate = true; }

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
