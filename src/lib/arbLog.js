// Arb history — answers how often discrepancies occur, in which leagues,
// for how long, and which books create them. Device-local (like the journal).
// Lifecycle: Arb page computes live opps via arb.js → recordArbs() merges into
// history (same match+books refreshes lastSeen → duration) → stats answer
// frequency/league/book/duration. Educational: margins are pre-fee, books limit fast.
export const ARB_KEY = 'oddslens-arb-log';

export function readArbs() {
  try {
    const raw = JSON.parse(localStorage.getItem(ARB_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeArbs(rows) {
  try {
    localStorage.setItem(ARB_KEY, JSON.stringify(rows.slice(0, 500)));
  } catch { /* ignore */ }
}

// opps: [{ m, arb }] from allArbs(). Merges repeats into duration windows.
export function recordArbs(opps) {
  if (!opps?.length) return readArbs();
  const now = Date.now();
  const rows = readArbs();
  let changed = false;
  for (const { m, arb } of opps) {
    const books = arb.keys.map((k) => arb.bestBook[k]).sort().join('+');
    const sig = `${m.id}|${books}`;
    const open = rows.find((r) => r.sig === sig && now - (r.lastSeen || 0) < 30 * 60 * 1000);
    if (open) {
      open.lastSeen = now;
      open.margin = Math.max(open.margin, arb.margin);
      open.lastMargin = arb.margin;
      changed = true;
    } else {
      rows.unshift({
        sig,
        matchId: m.id,
        match: `${m.home} vs ${m.away}`,
        leagueId: m.leagueId || 'unknown',
        books,
        bookList: arb.keys.map((k) => arb.bestBook[k]),
        margin: arb.margin,
        firstSeen: now,
        lastSeen: now,
        firstSeenISO: new Date(now).toISOString(),
      });
      changed = true;
    }
  }
  if (changed) writeArbs(rows);
  return readArbs();
}

export function arbStats(rows, leagueName = (id) => id) {
  const n = rows.length;
  const margins = rows.map((r) => r.margin).filter(Number.isFinite);
  const avgMargin = margins.length ? margins.reduce((s, v) => s + v, 0) / margins.length : null;
  const durations = rows.map((r) => ((r.lastSeen || r.firstSeen) - r.firstSeen) / 60000);
  const avgMins = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : null;
  const byLeague = new Map();
  const byBook = new Map();
  for (const r of rows) {
    byLeague.set(r.leagueId, (byLeague.get(r.leagueId) || 0) + 1);
    for (const b of r.bookList || []) byBook.set(b, (byBook.get(b) || 0) + 1);
  }
  const leagues = [...byLeague.entries()]
    .map(([id, c]) => ({ league: leagueName(id), count: c, share: n ? (c / n) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
  const books = [...byBook.entries()]
    .map(([book, c]) => ({ book, count: c, share: n ? (c / n) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
  return { n, avgMargin, avgMins, leagues, books };
}

export function clearArbs() {
  try {
    localStorage.removeItem(ARB_KEY);
  } catch { /* ignore */ }
}
