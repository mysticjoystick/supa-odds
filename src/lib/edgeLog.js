// Edge-detection log — the model-validation dataset.
// Every +EV observation is stored as:
// { match, market, book, taken(odds_at_detection), fair, ev, ts(detectedAt),
//   close(closing_odds), result, leagueId }
// Lifecycle: Value board / Match page (+Track) → detection row (pending)
// → Tracker-style grading (update close, mark won/lost) → Performance calibration
// (EV range → n → win rate → ROI → CLV). Device-local, exportable via Tracker CSV.
export const EDGE_KEY = 'oddslens-edge-log';

export function readEdges() {
  try {
    const raw = JSON.parse(localStorage.getItem(EDGE_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeEdges(rows) {
  try {
    localStorage.setItem(EDGE_KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
}

const keyOf = (e) => `${e.matchId || e.match}|${e.pick || e.market}|${e.book}`;

export function logEdge({ matchId, match, pick, market = '1X2', book, taken, fair, ev, leagueId, source = 'value-board' }) {
  if (!match || !taken || taken <= 1) return null;
  const rows = readEdges();
  const ts = Date.now();
  // Dedupe: same outcome+book within 6h refreshes the detection price, no duplicate row.
  const dup = rows.find((r) => keyOf(r) === `${matchId || match}|${pick || market}|${book}` && ts - (r.ts || 0) < 6 * 3600 * 1000);
  if (dup) {
    dup.taken = +taken;
    dup.fair = fair != null ? +fair : dup.fair;
    dup.ev = ev != null ? +ev : dup.ev;
    dup.detectedAt = new Date(ts).toISOString();
    writeEdges(rows);
    return dup;
  }
  const row = {
    id: ts,
    ts,
    matchId: matchId || null,
    match,
    pick: pick || `${match} (${market})`,
    market,
    book: book || 'unknown',
    leagueId: leagueId || 'unknown',
    taken: +taken,
    fair: fair != null ? +fair : null,
    ev: ev != null ? +ev : null,
    close: +taken, // placeholder — update to the true close before grading
    detectedAt: new Date(ts).toISOString(),
    graded: false,
    won: false,
    void: false,
    source,
  };
  writeEdges([row, ...rows].slice(0, 2000));
  return row;
}

export function gradeEdge(id, patch) {
  writeEdges(readEdges().map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

export function deleteEdge(id) {
  writeEdges(readEdges().filter((r) => r.id !== id));
}

// Ledger-compatible shape so Performance can slice edges with journal+tips.
export function fromEdge(r) {
  if (!r || !r.graded || r.void) return null;
  if (!Number.isFinite(+r.taken) || +r.taken <= 1) return null;
  const market = String(r.market || '1X2').toLowerCase() === '1x2' ? '1X2' : (r.market || '1X2');
  return {
    id: `edge-${r.id}`,
    ts: r.ts || r.id,
    source: 'edge-log',
    tipster: r.source || 'edge-log',
    leagueId: r.leagueId || 'unknown',
    market,
    pick: r.pick || r.match,
    book: r.book || 'unknown',
    stake: 1,
    taken: +r.taken,
    fair: r.fair != null ? +r.fair : null,
    ev: r.ev != null ? +r.ev : null,
    close: +r.close || +r.taken,
    result: r.won ? 'won' : 'lost',
    origin: 'edge',
  };
}
