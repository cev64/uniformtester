import * as THREE from 'three';
import { asset } from '../assets.js';

// Team marks from public/logos. 'KEY@#hex' (or '@white') gives a one-colour
// silhouette of a mark, e.g. a white "ny" on a blue jersey or the silver
// buffalo on the Bills' Cold Front helmet.
const cache = new Map();
export function loadLogo(key) {
  if (!cache.has(key)) {
    const [file, tint] = key.split('@');
    cache.set(key, new Promise((resolve) => {
      new THREE.TextureLoader().load(asset(`public/logos/${file}.png`), (t) => {
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
  return cache.get(key);
}
