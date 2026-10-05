import { clvPercent } from './math.js';

// Unified results ledger — one record shape for model tips, human tips and
// the user's own journal, so report cards can slice across everything.
// result: 'pending' | 'won' | 'lost' | 'void' (voids = refunded, excluded).

export const MIN_N = 30; // below this, stats are shown greyed as "too early"

export function fromTip(t) {
  return {
    id: `tip-${t.id}`,
    ts: null,
    source: t.type === 'algo' ? 'algo' : 'human',
    tipster: t.tipster || (t.type === 'algo' ? 'Supa Odds algo' : 'human'),
    leagueId: leagueOf(t.matchId),
    market: marketOf(t),
    pick: t.pick,
    book: bookOf(t.pick),
    stake: 1, // tips tracked as 1u flat
    taken: t.taken,
    fair: t.fair,
    ev: t.ev,
    close: t.close,
    result: t.result === 'won' || t.result === 'lost' ? t.result : 'pending',
    origin: 'tips',
  };
}

export function fromJournal(r) {
  if (!r.graded || r.void) return null;
  const market = String(r.market || 'unknown').toLowerCase() === '1x2' ? '1X2' : (r.market || 'unknown');
  return {
    id: `you-${r.id}`,
    ts: r.id, // Date.now() at log time
    source: r.source || 'you',
    tipster: r.source && r.source !== 'you' ? r.source : 'you',
    leagueId: r.leagueId || 'unknown',
    market,
    pick: r.pick,
    book: r.book || 'unknown',
    stake: +r.stake || 0,
    taken: +r.taken,
    fair: r.fair != null ? +r.fair : null,
    ev: r.ev != null ? +r.ev : null,
    close: +r.close,
    result: r.won ? 'won' : 'lost',
    origin: 'journal',
  };
}

function leagueOf(matchId) {
  if (!matchId) return 'unknown';
  return String(matchId).split('-')[0] || 'unknown';
}

function marketOf(t) {
  const p = (t.pick || '').toLowerCase();
  if (p.includes('over') || p.includes('under') || /o\/u|total/.test(p)) return 'totals';
  if (p.includes('btts') || p.includes('both teams')) return 'btts';
  return '1X2';
}

function bookOf(pick) {
  const m = /@\s*(.+?)\s*$/.exec(pick || '');
  return m ? m[1] : 'unknown';
}

export function graded(rows) {
  return rows.filter((r) => r && (r.result === 'won' || r.result === 'lost'));
}

export function summarize(rows) {
  const g = graded(rows);
  const n = g.length;
  const wins = g.filter((r) => r.result === 'won').length;
  const stakes = g.reduce((s, r) => s + (+r.stake || 0), 0);
  const profit = g.reduce(
    (s, r) => s + (r.result === 'won' ? (+r.stake || 0) * ((+r.taken || 0) - 1) : -(+r.stake || 0)),
    0
  );
  const clvs = g.map((r) => clvPercent(+r.taken, +r.close)).filter((v) => Number.isFinite(v));
  return {
    n,
    wins,
    hitRate: n ? (wins / n) * 100 : null,
    yield: stakes ? (profit / stakes) * 100 : null,
    roi: stakes ? (profit / stakes) * 100 : null,
    profit,
    stakes,
    avgClv: clvs.length ? clvs.reduce((s, v) => s + v, 0) / clvs.length : null,
    solid: n >= MIN_N,
  };
}

export function slice(rows, keyFn) {
  const map = new Map();
  for (const r of graded(rows)) {
    const k = keyFn(r) || 'unknown';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return [...map.entries()]
    .map(([key, rs]) => ({ key, ...summarize(rs) }))
    .sort((a, b) => (b.yield ?? -Infinity) - (a.yield ?? -Infinity));
}

export const EV_BUCKETS = ['<0%', '0–2%', '2–5%', '5–8%', '8–12%', '12%+'];

export const evBucket = (ev) => {
  if (ev == null || !Number.isFinite(+ev)) return 'unknown';
  const p = +ev * 100;
  if (p < 0) return '<0%';
  if (p < 2) return '0–2%';
  if (p < 5) return '2–5%';
  if (p < 8) return '5–8%';
  if (p < 12) return '8–12%';
  return '12%+';
};

const expectedProbOf = (r) => {
  const fair = +r.fair;
  if (Number.isFinite(fair) && fair > 1) return 1 / fair;
  const taken = +r.taken;
  const ev = +r.ev;
  if (Number.isFinite(taken) && taken > 1 && Number.isFinite(ev)) return (ev + 1) / taken;
  return null;
};

// Model-validation dataset: per EV bucket — bets, win rate, ROI, CLV,
// plus EXPECTED hit rate (avg model prob) vs ACTUAL. If +8% rows hit ~57%
// the edge is calibrated; if +12% rows hit 48% the EV number is noise.
export function evCalibration(rows) {
  const g = graded(rows);
  const order = EV_BUCKETS;
  return order.map((bucket) => {
    const rs = g.filter((r) => evBucket(r.ev) === bucket);
    const s = summarize(rs);
    const exps = rs.map(expectedProbOf).filter((v) => Number.isFinite(v));
    const expected = exps.length ? (exps.reduce((a, b) => a + b, 0) / exps.length) * 100 : null;
    return { bucket, ...s, key: bucket, expected, actual: s.hitRate };
  });
}

// Cumulative actual profit vs CLV-implied profit, in graded order.
export function convergence(rows) {
  const g = graded(rows).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  let actual = 0;
  let implied = 0;
  return g.map((r, i) => {
    const stake = +r.stake || 0;
    actual += r.result === 'won' ? stake * ((+r.taken || 0) - 1) : -stake;
    const clv = clvPercent(+r.taken, +r.close) / 100;
    if (Number.isFinite(clv)) implied += stake * clv;
    return { i: i + 1, actual, implied, label: r.pick };
  });
}
