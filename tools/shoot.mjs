// Screenshots of the 3D stage for reviewing changes without a browser.
//
//   node tools/shoot.mjs --team BUF --look Home --views front,three,back,helmet --out /tmp/shots
//   node tools/shoot.mjs --team PIT --sel white,black,gold,black --number 7 --name SMITH
//
// Starts `vite` on a free port (or uses --url), loads the page with ?debug,
// dresses the player through window.__stage0 and saves one PNG per view as
// <out>/<TEAM>_<look>_<view>.png. Needs Playwright (resolved from the project
// or /opt/node-tools) and a Chromium build.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));

function loadPlaywright() {
  for (const base of [process.cwd(), '/opt/node-tools']) {
    try { return createRequire(path.join(base, 'package.json'))('playwright'); } catch { /* next */ }
  }
  throw new Error('playwright not found (npm i -D playwright, or use /opt/node-tools)');
}

const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

const VIEWS = {
  front: { theta: 0, phi: 1.43, r: 5.3, target: [0, 0.98, 0] },
  three: { theta: 0.62, phi: 1.36, r: 5.3, target: [0, 0.98, 0] },
  side: { theta: Math.PI / 2, phi: 1.43, r: 5.3, target: [0, 0.98, 0] },
  back: { theta: Math.PI, phi: 1.43, r: 5.3, target: [0, 0.98, 0] },
  helmet: { theta: 0.75, phi: 1.45, r: 1.25, target: [0, 1.72, 0] },
  helmetside: { theta: Math.PI / 2, phi: 1.5, r: 1.1, target: [0, 1.72, 0] },
  helmetfront: { theta: 0, phi: 1.5, r: 1.1, target: [0, 1.72, 0] },
  helmetback: { theta: Math.PI * 0.8, phi: 1.35, r: 1.1, target: [0, 1.72, 0] },
  chest: { theta: 0.2, phi: 1.5, r: 2.0, target: [0, 1.35, 0] },
  backtop: { theta: Math.PI, phi: 1.5, r: 2.0, target: [0, 1.35, 0] },
  shoulder: { theta: 1.1, phi: 1.2, r: 1.6, target: [0.15, 1.45, 0] },
  pants: { theta: 0.5, phi: 1.5, r: 2.4, target: [0, 0.75, 0] },
  feet: { theta: 0.7, phi: 1.3, r: 1.5, target: [0, 0.2, 0] },
};

const out = args.out || 'shots';
fs.mkdirSync(out, { recursive: true });
const views = String(args.views || 'front,three,back,helmet').split(',');
const W = Number(args.w || 900), H = Number(args.h || 1100);

let server = null;
let url = args.url;
if (!url) {
  const port = await freePort();
  server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
  url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) break; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: W + 380, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url + '?debug', { waitUntil: 'networkidle' });
  // hide the UI chrome over the canvas
  await page.addStyleTag({ content: '.stage-label,.stage-tools{display:none!important}' });
  await page.waitForFunction(() => window.__stage0?.player?.loaded && window.__stage0.player.helmet.loaded, null, { timeout: 120000 });

  const teams = String(args.team || 'BUF').split(',');
  for (const teamId of teams) {
    const looks = await page.evaluate(([id]) => window.__teams[id].looks.map((l) => l.name), [teamId]);
    const wanted = args.sel ? ['custom'] : args.look === 'all' ? looks : [args.look || looks[0]];
    for (const lookName of wanted) {
      await page.evaluate(async ([id, lookName, sel, number, name, skin]) => {
        const team = window.__teams[id];
        const st = window.__stage0;
        st.setAutoRotate(false);
        st.running = false;   // render on demand: software GL is slow
        let s;
        if (sel) { const [h, j, p, so] = sel.split(','); s = { h, j, p, s: so }; } else {
          const l = team.looks.find((x) => x.name === lookName) || team.looks[0];
          s = { h: l.h, j: l.j, p: l.p, s: l.s };
        }
        await st.player.setUniform(team, s, { number, name, skin: Number(skin), gloves: 'jersey', cleats: 'auto' });
        await st.player.helmet.ready;
      }, [teamId, lookName, args.sel || null, String(args.number ?? '12'), String(args.name ?? 'PLAYER'), args.skin ?? 0]);
      await page.waitForTimeout(Number(args.settle || 1200));
      for (const v of views) {
        const view = VIEWS[v];
        if (!view) { console.warn('unknown view', v); continue; }
        await page.evaluate((view) => {
          const THREE_V = window.__stage0.controls.target.constructor;
          window.__stage0.tween = null;
          window.__stage0.setView({ ...view, target: new THREE_V(...view.target) }, true);
          window.__stage0.frame();
        }, view);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => { window.__stage0.frame(); requestAnimationFrame(r); })));
        const file = path.join(out, `${teamId}_${lookName.replace(/[^a-z0-9]+/gi, '-')}_${v}.png`);
        const box = await page.locator('#stage-0').boundingBox();
        await page.screenshot({ path: file, clip: box, animations: 'disabled', timeout: 120000 });
        console.log(file);
      }
    }
  }
  if (errors.length) console.error('page errors:\n' + errors.join('\n'));
} finally {
  await browser.close();
  if (server) try { process.kill(-server.pid); } catch { /* gone */ }
}
