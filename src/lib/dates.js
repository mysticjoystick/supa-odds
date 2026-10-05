// Date helpers for the board: group fixtures by local day, label rails/tabs.

export function dateKeyOf(match) {
  if (match?.commenceISO) {
    const d = new Date(match.commenceISO);
    if (!Number.isNaN(d)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
  return 'tba';
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// "Today" / "Tomorrow" / "Sat 10 Oct" — rail labels with live counts.
export function dayLabel(key, now = new Date()) {
  if (key === 'tba') return 'Date TBA';
  const [y, mo, da] = key.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  const today = startOfDay(now);
  const diff = Math.round((startOfDay(d) - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function shortDate(key) {
  if (key === 'tba') return '';
  const [y, mo, da] = key.split('-').map(Number);
  return new Date(y, mo - 1, da).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// "19:30" local kickoff for the time column.
export function kickoffLabel(match) {
  if (match?.live) return 'LIVE';
  if (match?.commenceISO) {
    const d = new Date(match.commenceISO);
    if (!Number.isNaN(d)) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }
  return match?.startsIn || '–';
}

export function fullDateLabel(match) {
  if (match?.commenceISO) {
    const d = new Date(match.commenceISO);
    if (!Number.isNaN(d)) {
      return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  }
  return match?.startsIn || '';
}

// Compact kickoff for tight hero layouts: "Sat 16:30".
export function shortKickoff(match) {
  if (match?.commenceISO) {
    const d = new Date(match.commenceISO);
    if (!Number.isNaN(d)) {
      const wd = d.toLocaleDateString(undefined, { weekday: 'short' });
      const hm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${wd} ${hm}`;
    }
  }
  return match?.startsIn || '';
}

// Ordered unique date keys present in the pool (TBA last).
export function dateKeysOf(matches) {
  const counts = new Map();
  for (const m of matches || []) {
    const k = dateKeyOf(m);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] === 'tba' ? 1 : b[0] === 'tba' ? -1 : a[0] < b[0] ? -1 : 1))
    .map(([key, count]) => ({ key, count }));
}

export function sortByKickoff(a, b) {
  const ta = a?.commenceISO ? new Date(a.commenceISO).getTime() : Infinity;
  const tb = b?.commenceISO ? new Date(b.commenceISO).getTime() : Infinity;
  return ta - tb;
}
