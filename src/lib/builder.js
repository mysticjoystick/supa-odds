// Daily Bet Builder — pure logic for surest-picks accas.
// Reuses the value engine (allValueRows) + slip totals so the Builder,
// Hot deals and Slip pages always agree on EV, probability and payout.

import { allValueRows, breakdownAll, predictedOutcome, MIN_EDGE, SAFE_PROB, MIN_SAFE_PROB, riskTag } from './value';
import { leg1X2 } from './markets';
import { totalsPerBook, bestTotal } from './slip';
import { dateKeyOf, todayKey, dayLabel } from './dates';

export const MODES = {
  safe: {
    id: 'safe',
    label: 'Safe',
    minProb: 0.5, // 50%+ win rate — coin-flip or better, genuine favorites only
    maxPrice: 2.5, // short prices only; anything longer is never "safe"
    maxLegs: 5,
    blurb: 'First-XI certainties — 50%+ win chance at short odds. Trim the squad with ×, the total recalculates live.',
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    minProb: SAFE_PROB, // 0.2 — 1-in-5 or better, never a longshot price
    maxPrice: 5,
    maxLegs: 8,
    blurb: 'Super-sub value — winnable lines (1-in-5 or better). Bench what you distrust, watch the win chance move.',
  },
  bold: {
    id: 'bold',
    label: 'Longshots',
    minProb: 0,
    maxPrice: Infinity,
    maxLegs: 12,
    blurb: '89th-minute hail marys — up to 12 low win-rate lines. Fun only, tiny stakes, never "surest".',
  },
};

export function modeConfig(mode) {
  return MODES[mode] || MODES.safe;
}

// Per-day availability: fixtures, priced fixtures (book prices + fair),
// and +EV deal counts. Powers the date rail and the auto-day picker.
export function dateOptions(matches) {
  const all = matches || [];
  const map = new Map();
  for (const m of all) {
    const k = dateKeyOf(m);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  const opts = [...map.entries()].map(([key, ms]) => {
    const priced = ms.filter((m) => Object.keys(m.prices || {}).length > 0 && !!m.fair).length;
    const deals = allValueRows(ms, MIN_EDGE).length;
    return { key, count: ms.length, priced, deals, label: dayLabel(key) };
  });
  opts.sort((a, b) => (a.key === 'tba' ? 1 : b.key === 'tba' ? -1 : a.key < b.key ? -1 : 1));
  return opts;
}

// Auto-day: today when it has priced fixtures, else the priced day with the
// most deals (nearest on ties), else today when it has fixtures, else all.
// The old version locked to today even when today's 15 games had zero prices.
export function dayPool(matches, wantedKey = null) {
  const all = matches || [];
  if (!all.length) return { pool: [], dayKey: null, isToday: false, options: [], best: null };
  const options = dateOptions(all);
  const tk = todayKey();
  if (wantedKey) {
    const opt = options.find((o) => o.key === wantedKey);
    if (opt) {
      const pool = all.filter((m) => dateKeyOf(m) === wantedKey);
      return { pool, dayKey: wantedKey, isToday: wantedKey === tk, options, best: bestOption(options, tk) };
    }
  }
  const todayOpt = options.find((o) => o.key === tk);
  if (todayOpt && todayOpt.priced > 0) {
    return { pool: all.filter((m) => dateKeyOf(m) === tk), dayKey: tk, isToday: true, options, best: bestOption(options, tk) };
  }
  const best = bestOption(options, tk);
  if (best && best.priced > 0) {
    return { pool: all.filter((m) => dateKeyOf(m) === best.key), dayKey: best.key, isToday: best.key === tk, options, best };
  }
  if (todayOpt) {
    return { pool: all.filter((m) => dateKeyOf(m) === tk), dayKey: tk, isToday: true, options, best };
  }
  return { pool: all, dayKey: null, isToday: false, options, best };
}

function bestOption(options, tk) {
  const priced = options.filter((o) => o.priced > 0);
  if (!priced.length) return null;
  priced.sort((a, b) => (b.deals - a.deals) || (Math.abs(a.key.localeCompare(tk)) - Math.abs(b.key.localeCompare(tk))));
  // Prefer most deals; on ties prefer the nearest date to today.
  const byDeals = Math.max(...priced.map((o) => o.deals));
  const top = priced.filter((o) => o.deals === byDeals);
  top.sort((a, b) => (a.key < b.key ? -1 : 1));
  // If today is among the top, keep today.
  return top.find((o) => o.key === tk) || top[0];
}

function toLeg(row) {
  const base = leg1X2(row.m, row.key);
  if (!base) return null;
  // Keep the full per-book map (never single-book) — pin the row's best on top.
  return { ...base, price: row.market, book: row.book, row };
}

// Top high-chance favorites regardless of edge: each priced match's most
// likely outcome, gated by the mode's win-rate + price bars, best chance first.
// What the ticket shows when value is dry — playable, honest, never +EV-claimed.
function favoritesFallback(pool, cfg, ceiling, myBooks = []) {
  const cands = [];
  for (const m of pool || []) {
    let pick = null;
    try { pick = predictedOutcome(m); } catch { pick = null; }
    if (!pick) continue;
    let row = null;
    try { row = breakdownAll(m).find((x) => x.key === pick.key) || null; } catch { row = null; }
    if (!row || !row.market || row.market <= 1) continue;
    cands.push({ m, ...row, fallback: true });
  }
  let usableFavs = cands;
  let fellBack = false;
  if (myBooks?.length) {
    const mine = cands.filter((r) => myBooks.includes(r.book));
    if (mine.length) usableFavs = mine;
    else if (cands.length) fellBack = true;
  }
  const rows = usableFavs
    .filter((r) => (r.fairProb ?? 0) >= cfg.minProb && (r.market ?? Infinity) < (cfg.maxPrice ?? Infinity) && (r.market ?? Infinity) <= ceiling)
    .sort((a, b) => (b.fairProb ?? 0) - (a.fairProb ?? 0));
  return { rows, fellBack };
}

// Stable row identity for benching: one pick per match + outcome.
export function rowKey(r) {
  return `${r.m.id}-${r.key}`;
}

export function buildDailyPicks(matches, mode = 'safe', myBooks = [], wantedKey = null, maxOdds = null, opts = {}) {
  const cfg = modeConfig(mode);
  const { pool, dayKey, isToday, options, best: bestDay } = dayPool(matches, wantedKey);
  const pricedCount = pool.filter((m) => Object.keys(m.prices || {}).length > 0 && !!m.fair).length;
  const needsKeyCount = pool.filter((m) => (m.oddsStatus === 'needs-key' || (!m.prices || !Object.keys(m.prices).length)) && !m.fair).length;
  const all = allValueRows(pool, MIN_EDGE);
  // User-facing odds ceiling sits on top of the mode gate — "never show me
  // anything above 2.00" filters the list and the total recalculates live.
  const ceiling = Number.isFinite(maxOdds) && maxOdds > 1 ? maxOdds : (cfg.maxPrice ?? Infinity);

  // Prefer the user's books; fall back honestly when they price nothing.
  let usable = all;
  let fellBack = false;
  if (myBooks?.length) {
    const mine = all.filter((r) => myBooks.includes(r.book));
    if (mine.length) usable = mine;
    else fellBack = myBooks.length > 0 && all.length > 0;
  }

  const eligible = usable.filter(
    (r) => (r.fairProb ?? 0) >= cfg.minProb && (r.market ?? Infinity) < (cfg.maxPrice ?? Infinity) && (r.market ?? Infinity) <= ceiling
  );
  let rows = eligible;
  let isFallback = false;
  // Favorites fallback — Safe/Balanced must always hand over a playable
  // ticket: top high-chance favorites at short prices, even with no +EV edge.
  // Never in Longshots mode (that tab owns low-chance lines already).
  if (!rows.length && pricedCount > 0 && (mode === 'safe' || mode === 'balanced')) {
    const favs = favoritesFallback(pool, cfg, ceiling, myBooks);
    if (favs.rows.length) {
      rows = favs.rows;
      isFallback = true;
      if (favs.fellBack) fellBack = true;
    }
  }
  // Cap the candidate list so the deck stays editable (Longshots: up to 15).
  rows = rows.slice(0, 15);
  // Deck editing — bench distrusted legs, dial the leg count up/down.
  const excluded = new Set(opts.excluded || []);
  const avail = rows.filter((r) => !excluded.has(rowKey(r)));
  const benched = rows.filter((r) => excluded.has(rowKey(r)));
  const wantCount = Number.isFinite(opts.legCount) && opts.legCount >= 1 ? Math.floor(opts.legCount) : cfg.maxLegs;
  const legCount = avail.length ? Math.max(1, Math.min(wantCount, avail.length)) : 0;
  const picks = avail.slice(0, legCount);
  // True when the user's own ceiling (not the mode gate) hid qualifying rows.
  const cappedByUser = Number.isFinite(maxOdds) && maxOdds > 1 && usable.some(
    (r) => (r.fairProb ?? 0) >= cfg.minProb && (r.market ?? Infinity) < (cfg.maxPrice ?? Infinity) && (r.market ?? Infinity) > ceiling
  );

  const legs = picks.map(toLeg).filter(Boolean);
  const totals = totalsPerBook(legs);
  const bestBook = bestTotal(legs);
  const mineTotals = myBooks?.length ? totals.filter((t) => myBooks.includes(t.book)) : totals;
  const bestMine = (mineTotals.filter((t) => !t.missing)[0] || bestBook) || null;

  // Watchlist — risky lines the user should think twice about.
  const pickedIds = new Set(picks.map((r) => rowKey(r)));
  const longshots = all
    .filter((r) => !pickedIds.has(rowKey(r)) && (r.fairProb ?? 0) < MIN_SAFE_PROB)
    .slice(0, 3);
  const steam = all
    .filter((r) => {
      if (pickedIds.has(rowKey(r))) return false;
      const tag = riskTag(r.market);
      return tag.label !== 'Safer pick' && (r.fairProb ?? 0) >= MIN_SAFE_PROB;
    })
    .slice(0, 3);
  // Everything benched — not a dead market, just an empty deck. The ticket
  // area renders the re-add list instead of an empty-state panel.
  const deckEmpty = rows.length > 0 && !avail.length;

  return {
    mode: cfg.id,
    cfg,
    pool,
    dayKey,
    isToday,
    options,
    bestDay,
    poolSize: pool.length,
    pricedCount,
    needsKeyCount,
    dealCount: all.length,
    fellBack,
    cappedByUser,
    ceiling,
    picks,
    legs,
    totals,
    bestBook,
    bestMine,
    total: bestMine && !bestMine.missing ? bestMine.total : 0,
    isFallback,
    // Deck-editing state for the UI stepper + bench.
    availCount: avail.length,
    benched,
    legCount,
    defaultLegs: cfg.maxLegs,
    longshots,
    moderates: steam,
    emptyReason: !pool.length
      ? 'empty'
      : !pricedCount
        ? 'no-prices'
        : isFallback
          ? null
          : deckEmpty
            ? null
            : !all.length
              ? 'no-edge'
              : !eligible.length
                ? 'no-safe'
                : null,
  };
}

// Forward: stake → payout. Reverse: target payout → required stake.
export const payoutFor = (stake, total) =>
  Number.isFinite(stake) && Number.isFinite(total) && stake > 0 && total > 1
    ? stake * total
    : 0;

export const profitFor = (stake, total) => {
  const p = payoutFor(stake, total);
  return p ? p - stake : 0;
};

export const stakeForTarget = (target, total) =>
  Number.isFinite(target) && Number.isFinite(total) && target > 0 && total > 1
    ? target / total
    : 0;

export { riskTag };
