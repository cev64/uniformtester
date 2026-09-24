import { TEAMS, TEAM_BY_ID, DIVISIONS } from './data/teams.js';
import { comboStatus, pieceBadge, lookStatus, findLook } from './data/status.js';
import { Stage, VIEWS } from './three/stage.js';
import { SKIN_TONES } from './three/player.js';
import { fontsReady } from './three/fonts.js';
import { luminance } from './three/paint.js';
import { helmetIcon, jerseyIcon, pantsIcon, socksIcon } from './ui/icons.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORE = 'uniform-lab:v1';

// ─── state ────────────────────────────────────────────────────────────

function lookFor(team, prefer) {
  const re = prefer === 'road' ? /^road/i : /^home/i;
  const l = team.looks.find((x) => re.test(x.name) && lookStatus(x) === 'worn') || team.looks[0];
  return { h: l.h, j: l.j, p: l.p, s: l.s };
}

function defaultSide(teamId, prefer, number) {
  const team = TEAM_BY_ID[teamId];
  return { team: teamId, sel: lookFor(team, prefer), player: { number, name: '', skin: 0, gloves: 'jersey', cleats: 'auto' } };
}

function initialState() {
  const pick = () => TEAMS[Math.floor(Math.random() * TEAMS.length)].id;
  const a = pick();
  let b = pick();
  while (b === a) b = pick();
  return { mode: 'single', active: 0, spin: false, view: 'three', sides: [defaultSide(a, 'home', '12'), defaultSide(b, 'home', '8')] };
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (s && s.sides?.length === 2 && s.sides.every((x) => TEAM_BY_ID[x.team])) return s;
  } catch { /* storage unavailable */ }
  return initialState();
}

function saveState() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* ignore */ }
}

const state = loadState();
const stages = [null, null];

// ─── helpers ──────────────────────────────────────────────────────────

const teamOf = (i) => TEAM_BY_ID[state.sides[i].team];

// Pick the team color that reads best against the dark UI
function accentFor(team) {
  const ranked = [...team.colors].sort((x, y) => {
    const score = (c) => { const l = luminance(c); return l > 0.85 ? 0.3 : l; };
    return score(y) - score(x);
  });
  return luminance(ranked[0]) < 0.04 ? '#e8ece6' : ranked[0];
}

function chipbar(team) {
  return `<span class="chipbar">${team.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</span>`;
}

// ─── 3D ───────────────────────────────────────────────────────────────

function ensureStage(i) {
  if (stages[i]) return stages[i];
  try {
    const st = new Stage($(`#stage-${i}`), { mirrorStart: i === 1 });
    st.onInteract = () => setView(null);
    stages[i] = st;
    st.setAutoRotate(state.spin);
    return st;
  } catch (err) {
    console.error(err);
    $('#webgl-error').hidden = false;
    return null;
  }
}

const pending = new Set();
let raf = 0;
function refresh3D(i) {
  pending.add(i);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    for (const k of pending) {
      const st = ensureStage(k);
      if (!st) continue;
      const side = state.sides[k];
      st.setUniform(teamOf(k), side.sel, side.player);
    }
    pending.clear();
  });
}

// ─── rendering: stage labels ──────────────────────────────────────────

function renderLabels() {
  for (const i of [0, 1]) {
    const team = teamOf(i);
    const side = state.sides[i];
    const st = comboStatus(team, side.sel);
    const slot = document.querySelector(`.stage-slot[data-side="${i}"]`);
    slot.style.setProperty('--glow', team.colors[0]);
    slot.classList.toggle('editing', state.mode === 'matchup' && state.active === i);
    const lookName = st.look ? st.look.name : st.kind === 'fantasy' ? 'Fantasy combo' : 'Custom combo';
    const role = state.mode === 'matchup' ? (i === 0 ? 'Away' : 'Home') : '';
    const sub = !role ? lookName : lookName.toLowerCase().startsWith(role.toLowerCase()) ? lookName : `${role} · ${lookName}`;
    $(`#label-${i}`).innerHTML = `<div class="abbr">${esc(team.name)}</div><div class="sub">${esc(sub)}</div>`;
  }
}

// ─── rendering: panel ─────────────────────────────────────────────────

const SLOTS = [
  { key: 'h', list: 'helmets', label: 'Helmet', icon: (x) => helmetIcon(x) },
  { key: 'j', list: 'jerseys', label: 'Jersey', icon: (x, t, n) => jerseyIcon(x, t, n) },
  { key: 'p', list: 'pants', label: 'Pants', icon: (x) => pantsIcon(x) },
  { key: 's', list: 'socks', label: 'Socks', icon: (x) => socksIcon(x) },
];

function renderPanel() {
  const i = state.active;
  const side = state.sides[i];
  const team = teamOf(i);
  const st = comboStatus(team, side.sel);
  const current = findLook(team, side.sel);
  document.documentElement.style.setProperty('--team', accentFor(team));

  const sideTabs = state.mode === 'matchup' ? `
    <div class="side-tabs">
      ${[0, 1].map((k) => {
        const t = teamOf(k);
        return `<button class="side-tab" data-side="${k}" aria-pressed="${k === i}">
          ${chipbar(t)}<span><span class="who">${k === 0 ? 'Away' : 'Home'}</span><br><span class="tn">${esc(t.name)}</span></span>
        </button>${k === 0 ? `<button class="swap" id="swap" title="Swap home and away" aria-label="Swap home and away">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7h12l-3-3M16 13H4l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}`;
      }).join('')}
    </div>` : '';

  const looks = team.looks.map((l, idx) => {
    const ls = lookStatus(l);
    const on = current === l;
    return `<button class="look" data-look="${idx}" aria-pressed="${on}" title="${esc(l.note || (ls === 'worn' ? 'Worn in a game' : 'Announced'))}">
      <span class="dot ${ls}"></span>${esc(l.name)}</button>`;
  }).join('');

  const slots = SLOTS.map((slot) => {
    const items = team[slot.list];
    const cards = items.map((it) => {
      const badge = pieceBadge(it);
      return `<button class="opt" data-slot="${slot.key}" data-id="${esc(it.id)}" aria-pressed="${side.sel[slot.key] === it.id}">
        ${slot.icon(it, team, side.player.number || '')}
        <span class="n">${esc(it.name)}</span>
        ${it.tag ? `<span class="t">${esc(it.tag)}</span>` : ''}
        ${badge ? `<span class="badge">${esc(badge.text)}</span>` : ''}
      </button>`;
    }).join('');
    return `<section><h3 class="section-h">${slot.label}<span class="count">${items.length} option${items.length > 1 ? 's' : ''}</span></h3>
      <div class="options">${cards}</div></section>`;
  }).join('');

  const p = side.player;
  const seg = (name, value, opts) => opts.map(([v, label]) =>
    `<button data-${name}="${v}" aria-pressed="${value === v}">${label}</button>`).join('');

  $('#panel').innerHTML = `
    ${sideTabs}
    <button class="team-head" id="team-head" aria-label="Change team">
      <span class="team-flag">${team.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span><span class="city">${esc(team.city)} · ${team.conf} ${team.div}</span><div class="name">${esc(team.name)}</div></span>
      <span class="change">Change team</span>
    </button>

    <div class="status" role="status">
      <span class="pill ${st.kind}">${st.kind === 'worn' ? 'Worn' : st.kind === 'announced' ? 'Announced' : 'Fantasy'}</span>
      <span class="title">${esc(st.title)}</span>
      <span class="detail">${esc(st.detail)}</span>
    </div>

    <section>
      <h3 class="section-h">Game-day looks<span class="count">${team.looks.length}</span></h3>
      <div class="looks">${looks}</div>
    </section>

    ${slots}

    <section>
      <h3 class="section-h">Player</h3>
      <div class="player-grid">
        <div class="field"><label for="num-input">Number</label>
          <input id="num-input" inputmode="numeric" maxlength="2" value="${esc(p.number)}" /></div>
        <div class="field"><label for="name-input">Name on back</label>
          <input id="name-input" maxlength="14" placeholder="Optional" value="${esc(p.name)}" /></div>
        <div class="field full"><span class="lbl">Skin tone</span>
          <div class="mini-seg">${SKIN_TONES.map((c, k) => `<button class="skin" data-skin="${k}" aria-pressed="${p.skin === k}" style="background:${c}" aria-label="Skin tone ${k + 1}"></button>`).join('')}</div></div>
        <div class="field full"><span class="lbl">Gloves</span>
          <div class="mini-seg">${seg('gloves', p.gloves, [['jersey', 'Match jersey'], ['white', 'White'], ['black', 'Black']])}</div></div>
        <div class="field full"><span class="lbl">Cleats</span>
          <div class="mini-seg">${seg('cleats', p.cleats, [['auto', 'Auto'], ['white', 'White'], ['black', 'Black'], ['team', 'Team color']])}</div></div>
      </div>
    </section>

    <p class="fineprint">Uniform data reflects the 2026 season as announced by the teams. "Worn" means the combination appears in our game-day records; "Announced" pieces haven't debuted yet. Logos are simplified stand-ins, not official artwork.</p>
  `;
}

function renderAll() {
  const app = $('#app');
  app.dataset.mode = state.mode;
  for (const b of document.querySelectorAll('.modes button')) b.setAttribute('aria-selected', String(b.dataset.mode === state.mode));
  $('#spin').setAttribute('aria-pressed', String(state.spin));
  for (const b of document.querySelectorAll('[data-view]')) b.classList.toggle('on', b.dataset.view === state.view);
  renderLabels();
  renderPanel();
  saveState();
}

// ─── team picker ──────────────────────────────────────────────────────

function renderPicker(filter = '') {
  const q = filter.trim().toLowerCase();
  const cur = state.sides[state.active].team;
  $('#picker-grid').innerHTML = DIVISIONS.map((d) => {
    const teams = TEAMS.filter((t) => `${t.conf} ${t.div}` === d)
      .filter((t) => !q || `${t.city} ${t.name} ${t.id}`.toLowerCase().includes(q));
    if (!teams.length) return '';
    return `<div class="div"><h3>${d}</h3><div class="list">${teams.map((t) => `
      <button class="team-btn" data-team="${t.id}" aria-current="${t.id === cur}">${chipbar(t)}
        <span><span class="tb-name">${esc(t.name)}</span><br><span class="tb-city">${esc(t.city)}</span></span></button>`).join('')}
    </div></div>`;
  }).join('') || '<p class="fineprint">No teams match that search.</p>';
}

function openPicker() {
  renderPicker();
  $('#picker').hidden = false;
  $('#picker-search').value = '';
  setTimeout(() => $('#picker-search').focus(), 30);
}
function closePicker() {
  $('#picker').hidden = true;
  $('#team-head')?.focus();
}

// ─── actions ──────────────────────────────────────────────────────────

function setTeam(id) {
  const i = state.active;
  const prev = state.sides[i].player;
  const prefer = state.mode === 'matchup' && i === 0 ? 'road' : 'home';
  state.sides[i] = { ...defaultSide(id, prefer, prev.number), player: { ...prev } };
  refresh3D(i);
  renderAll();
}

function setView(v) {
  state.view = v;
  if (v) for (const st of stages) st?.setView(VIEWS[v]);
  for (const b of document.querySelectorAll('[data-view]')) b.classList.toggle('on', b.dataset.view === v);
}

function setMode(mode) {
  state.mode = mode;
  if (mode === 'single') state.active = Math.min(state.active, 0);
  if (mode === 'matchup') {
    // Classic presentation: away team in road whites on the left
    const away = teamOf(0);
    const cur = findLook(away, state.sides[0].sel);
    if (!cur || /^home/i.test(cur.name)) state.sides[0].sel = lookFor(away, 'road');
    ensureStage(1);
    refresh3D(0);
    refresh3D(1);
  }
  renderAll();
  // stage sizes change with the layout
  requestAnimationFrame(() => stages.forEach((s) => s?.resize()));
}

function shuffle() {
  const i = state.active;
  const team = teamOf(i);
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)].id;
  state.sides[i].sel = { h: r(team.helmets), j: r(team.jerseys), p: r(team.pants), s: r(team.socks) };
  refresh3D(i);
  renderAll();
}

let typing = 0;
function onPlayerInput() {
  const i = state.active;
  const num = $('#num-input').value.replace(/\D/g, '').slice(0, 2);
  if ($('#num-input').value !== num) $('#num-input').value = num;
  state.sides[i].player.number = num;
  state.sides[i].player.name = $('#name-input').value.slice(0, 14);
  clearTimeout(typing);
  typing = setTimeout(() => {
    refresh3D(i);
    // refresh jersey swatches without stealing focus from the input
    const active = document.activeElement?.id;
    const caret = document.activeElement?.selectionStart;
    renderPanel();
    if (active) { const el = document.getElementById(active); el?.focus(); try { el.setSelectionRange(caret, caret); } catch { /* not a text input */ } }
    saveState();
  }, 160);
}

// ─── events ───────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) {
    if (e.target.id === 'picker') closePicker();
    return;
  }
  const i = state.active;
  const side = state.sides[i];
  if (t.dataset.mode) return setMode(t.dataset.mode);
  if (t.dataset.view) return setView(t.dataset.view);
  if (t.id === 'spin') {
    state.spin = !state.spin;
    stages.forEach((s) => s?.setAutoRotate(state.spin));
    t.setAttribute('aria-pressed', String(state.spin));
    return saveState();
  }
  if (t.id === 'shuffle') return shuffle();
  if (t.id === 'team-head') return openPicker();
  if (t.id === 'picker-close') return closePicker();
  if (t.dataset.team) { closePicker(); return setTeam(t.dataset.team); }
  if (t.classList.contains('side-tab')) { state.active = Number(t.dataset.side); return renderAll(); }
  if (t.id === 'swap') {
    state.sides.reverse();
    // keep road/home convention after the swap
    state.sides[0].sel = lookFor(teamOf(0), 'road');
    state.sides[1].sel = lookFor(teamOf(1), 'home');
    refresh3D(0); refresh3D(1);
    return renderAll();
  }
  if (t.dataset.look) {
    const l = teamOf(i).looks[Number(t.dataset.look)];
    side.sel = { h: l.h, j: l.j, p: l.p, s: l.s };
    refresh3D(i);
    return renderAll();
  }
  if (t.dataset.slot) {
    side.sel = { ...side.sel, [t.dataset.slot]: t.dataset.id };
    refresh3D(i);
    return renderAll();
  }
  if (t.dataset.skin) { side.player.skin = Number(t.dataset.skin); refresh3D(i); return renderAll(); }
  if (t.dataset.gloves) { side.player.gloves = t.dataset.gloves; refresh3D(i); return renderAll(); }
  if (t.dataset.cleats) { side.player.cleats = t.dataset.cleats; refresh3D(i); return renderAll(); }
});

// Clicking a stage in matchup mode edits that side
for (const i of [0, 1]) {
  $(`#stage-${i}`).addEventListener('pointerdown', () => {
    if (state.mode === 'matchup' && state.active !== i) { state.active = i; renderAll(); }
  });
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'num-input' || e.target.id === 'name-input') onPlayerInput();
  if (e.target.id === 'picker-search') renderPicker(e.target.value);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#picker').hidden) closePicker();
  if (e.key === 'Enter' && e.target.id === 'picker-search') {
    const first = $('#picker-grid .team-btn');
    if (first) { closePicker(); setTeam(first.dataset.team); }
  }
});

// ─── boot ─────────────────────────────────────────────────────────────

renderAll();
fontsReady().then(() => {
  ensureStage(0);
  if (state.mode === 'matchup') ensureStage(1);
  refresh3D(0);
  if (state.mode === 'matchup') refresh3D(1);
  if (state.view) setView(state.view);
  // repaint swatches once number fonts are in
  renderPanel();
});
