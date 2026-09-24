import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { cpSync } from 'node:fs';

// Models and logos live in public/ and are referenced as ./public/... so the
// unbuilt source works straight from GitHub Pages. Vite's own public-dir
// handling is turned off and the folder is copied into the build as-is.
const copyPublic = (outDir) => ({
  name: 'copy-public',
  closeBundle() { cpSync('public', `${outDir}/public`, { recursive: true }); },
});

// `npm run build` → normal static site in dist/ (works on any static host).
// `npm run build:single` → one self-contained HTML file in dist-single/.
export default defineConfig(({ mode }) => {
  const outDir = mode === 'single' ? 'dist-single' : 'dist';
  return {
    base: './',
    publicDir: false,
    plugins: mode === 'single' ? [viteSingleFile()] : [copyPublic(outDir)],
    build: { outDir, chunkSizeWarningLimit: 1600 },
  };
});
