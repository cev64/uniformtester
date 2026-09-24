// Works out whether a helmet/jersey/pants/socks combination has actually
// been worn, is announced for a future date, or is a fantasy combo.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// A piece (or look) with a debut date in the future has been announced but not worn.
export function isUpcoming(item) {
  return Boolean(item?.debut && item.debut > today());
}

export function pieceBadge(item) {
  if (isUpcoming(item)) return { kind: 'announced', text: `Debuts ${fmtDate(item.debut)}` };
  return null;
}

export function lookStatus(look) {
  if (look.debut) return look.debut > today() ? 'announced' : 'worn';
  return look.status || 'worn';
}

export function findLook(team, sel) {
  return team.looks.find((l) => l.h === sel.h && l.j === sel.j && l.p === sel.p && l.s === sel.s)
    || null;
}

// Returns { kind: 'worn'|'announced'|'fantasy', title, detail, look }
export function comboStatus(team, sel) {
  const exact = findLook(team, sel);
  const near = exact || team.looks.find((l) => l.h === sel.h && l.j === sel.j && l.p === sel.p);
  const pieces = [
    ['helmet', team.helmets.find((x) => x.id === sel.h)],
    ['jersey', team.jerseys.find((x) => x.id === sel.j)],
    ['pants', team.pants.find((x) => x.id === sel.p)],
    ['socks', team.socks.find((x) => x.id === sel.s)],
  ];
  const upcoming = pieces.filter(([, it]) => isUpcoming(it));

  if (near) {
    const st = lookStatus(near);
    const sockNote = exact ? '' : ' Sock color differs from the documented look.';
    if (st === 'announced') {
      return {
        kind: 'announced',
        title: `Announced: ${near.name}`,
        detail: `Scheduled debut ${fmtDate(near.debut)}. ${near.note ? near.note + '.' : ''}${sockNote}`.trim(),
        look: near,
      };
    }
    return {
      kind: 'worn',
      title: `Worn in a game: ${near.name}`,
      detail: `${near.note ? near.note + '.' : 'A documented game-day combination.'}${sockNote}`,
      look: near,
    };
  }

  if (upcoming.length) {
    const names = upcoming.map(([k, it]) => `${it.name} ${k} (${fmtDate(it.debut)})`).join(', ');
    return {
      kind: 'announced',
      title: 'Includes pieces not worn yet',
      detail: `Announced but not debuted: ${names}. This exact combination isn't on the schedule.`,
      look: null,
    };
  }

  return {
    kind: 'fantasy',
    title: 'Fantasy combo',
    detail: 'Every piece is real, but this combination is not in our game-day records.',
    look: null,
  };
}
