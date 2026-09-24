import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Player } from './player.js';
import { paintTurf } from './paint.js';

const TARGET = new THREE.Vector3(0, 0.98, 0);

export const VIEWS = {
  front: { theta: 0, phi: 1.43, r: 5.3, target: TARGET },
  side: { theta: Math.PI / 2, phi: 1.43, r: 5.3, target: TARGET },
  back: { theta: Math.PI, phi: 1.43, r: 5.3, target: TARGET },
  three: { theta: 0.62, phi: 1.36, r: 5.3, target: TARGET },
  helmet: { theta: 0.75, phi: 1.45, r: 1.25, target: new THREE.Vector3(0, 1.72, 0) },
};

// One self-contained 3D viewport: renderer, lights, turf, player, camera.
export class Stage {
  constructor(container, { mirrorStart = false } = {}) {
    this.container = container;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.42;

    // Stadium-light rig: warm key, cool rim, soft fill
    const key = new THREE.DirectionalLight(0xfff3e2, 1.9);
    key.position.set(2.2, 4.2, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 2.2, bottom: -0.3, near: 0.5, far: 12 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.5);
    rim.position.set(-2.8, 3.2, -3.4);
    scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffffff, 0.5);
    rim2.position.set(3, 2, -3);
    scene.add(rim2);
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1d2a18, 0.3));

    // Turf disc that fades into the dark
    const turf = new THREE.CanvasTexture(paintTurf());
    turf.colorSpace = THREE.SRGBColorSpace;
    turf.anisotropy = 8;
    const fade = document.createElement('canvas');
    fade.width = fade.height = 256;
    const fctx = fade.getContext('2d');
    const grad = fctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.55, '#bbb'); grad.addColorStop(1, '#000');
    fctx.fillStyle = grad; fctx.fillRect(0, 0, 256, 256);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 96),
      new THREE.MeshStandardMaterial({ map: turf, alphaMap: new THREE.CanvasTexture(fade), transparent: true, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Contact shadow under the feet
    const blob = document.createElement('canvas');
    blob.width = blob.height = 128;
    const bctx = blob.getContext('2d');
    const bg = bctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    bg.addColorStop(0, 'rgba(0,0,0,0.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = bg; bctx.fillRect(0, 0, 128, 128);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(0, 0.002, 0.03);
    scene.add(contact);

    this.player = new Player(renderer);
    scene.add(this.player.group);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
    this.camera = camera;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.0;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.autoRotateSpeed = 1.6;
    controls.addEventListener('start', () => { this.tween = null; this.onInteract?.(); });
    this.controls = controls;

    this.tween = null;
    this.setView(mirrorStart ? { ...VIEWS.three, theta: -VIEWS.three.theta } : VIEWS.three, true);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.timer = new THREE.Timer();
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  setView(v, instant = false) {
    const target = v.target.isVector3 ? v.target.clone() : new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3().setFromSphericalCoords(v.r, v.phi, v.theta).add(target);
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.tween = { fromPos: this.camera.position.clone(), fromT: this.controls.target.clone(), pos, target, t: 0 };
  }

  setAutoRotate(on) { this.controls.autoRotate = on; }

  frame() {
    this.timer.update();
    const dt = Math.min(0.05, this.timer.getDelta());
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / 0.7);
      const e = 1 - (1 - tw.t) ** 3;
      // move along an arc around the player rather than cutting through him
      const a = new THREE.Spherical().setFromVector3(tw.fromPos.clone().sub(tw.fromT));
      const b = new THREE.Spherical().setFromVector3(tw.pos.clone().sub(tw.target));
      let dTheta = b.theta - a.theta;
      if (dTheta > Math.PI) dTheta -= Math.PI * 2;
      if (dTheta < -Math.PI) dTheta += Math.PI * 2;
      const s = new THREE.Spherical(a.radius + (b.radius - a.radius) * e, a.phi + (b.phi - a.phi) * e, a.theta + dTheta * e);
      const tgt = tw.fromT.clone().lerp(tw.target, e);
      this.camera.position.setFromSpherical(s).add(tgt);
      this.controls.target.copy(tgt);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the whole player in frame on tall, narrow viewports
    this.camera.fov = w / h < 0.62 ? 28 * Math.min(1.5, 0.62 / (w / h)) : 28;
    this.camera.updateProjectionMatrix();
  }

  setUniform(team, sel, player) {
    this.player.setUniform(team, sel, player);
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    this.running = false;
    this.resizeObserver.disconnect();
    this.player.disposeUniform();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
