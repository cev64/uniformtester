// Resolves model/logo files. On a normal host they are fetched from ./public/.
// The single-file preview build embeds them as data URLs in window.__UL_ASSETS.

const EMBED = (typeof window !== 'undefined' && window.__UL_ASSETS) || null;

export const isEmbedded = Boolean(EMBED);

export function asset(path) {
  return EMBED?.[path] ?? `./${path}`;
}

function dataToBuffer(dataUrl) {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export function loadGLB(loader, path) {
  if (EMBED?.[path]) return new Promise((resolve, reject) => loader.parse(dataToBuffer(EMBED[path]), '', resolve, reject));
  return loader.loadAsync(asset(path));
}

export async function loadJSON(path) {
  if (EMBED?.[path]) return JSON.parse(new TextDecoder().decode(dataToBuffer(EMBED[path])));
  return (await fetch(asset(path))).json();
}
