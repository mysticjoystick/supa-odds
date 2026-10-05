// Market-intelligence math — descriptive analytics over the snapshot board.
// Opening = movement[0], current = movement[last], closing ≈ current
// (true close locks when status=final; until then "now" is the proxy).
// Leagues that move most, books that disagree most, discrepancy frequency.
export function moveOf(m) {
  if (!m?.movement?.length || m.movement.length < 2) return 0;
  const open = m.movement[0];
  const now = m.movement[m.movement.length - 1];
  if (!open) return 0;
  return ((now - open) / open) * 100;
}

export function spreadOf(m, outcome = 'h') {
  const vals = Object.entries(m.prices || {})
    .map(([book, p]) => ({ book, v: p?.[outcome] }))
    .filter((x) => x.v > 1);
  if (vals.length < 2) return null;
  const prices = vals.map((x) => x.v);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
  return {
    max,
    min,
    avg,
    spreadPct: avg ? ((max - min) / avg) * 100 : 0,
    best: vals.find((x) => x.v === max),
    worst: vals.find((x) => x.v === min),
    books: vals.length,
  };
}

export function leagueMovers(matches) {
  const map = new Map();
  for (const m of matches || []) {
    const mdef = { move: moveOf(m), abs: Math.abs(moveOf(m)) };
    if (!map.has(m.leagueId)) map.set(m.leagueId, { leagueId: m.leagueId, n: 0, absSum: 0, max: 0 });
    const r = map.get(m.leagueId);
    r.n += 1;
    r.absSum += mdef.abs;
    r.max = Math.max(r.max, mdef.abs);
  }
  return [...map.values()]
    .map((r) => ({ ...r, avg: r.n ? r.absSum / r.n : 0 }))
    .sort((a, b) => b.avg - a.avg);
}

export function divergenceStats(matches, threshold = 5) {
  const rows = [];
  for (const m of matches || []) {
    const s = spreadOf(m, 'h');
    if (!s) continue;
    rows.push({ m, ...s, discrep: s.spreadPct >= threshold });
  }
  const n = rows.length;
  const discrepN = rows.filter((r) => r.discrep).length;
  const avgSpread = n ? rows.reduce((s, r) => s + r.spreadPct, 0) / n : 0;
  const top = [...rows].sort((a, b) => b.spreadPct - a.spreadPct).slice(0, 5);
  return { n, discrepN, freq: n ? (discrepN / n) * 100 : 0, avgSpread, top };
}

export function steamList(matches, threshold = 8) {
  return (matches || [])
    .map((m) => ({ m, move: moveOf(m), abs: Math.abs(moveOf(m)) }))
    .filter((r) => r.abs >= threshold)
    .sort((a, b) => b.abs - a.abs);
}
