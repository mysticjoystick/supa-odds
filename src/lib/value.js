// Value-detection engine — single source of truth for:
// market odds → implied prob → fair prob → EV → price gap.
// Pure functions, decimal odds. Fair = devigged sharp ref (Pinnacle).
import { implied, devig3Way, devig2Way, fairOdds, evPercent } from './math.js';

export const MIN_EDGE = 0.005; // +0.5% = actionable; below = noise / no bet

export function fairProbsFor(m) {
  if (!m?.fair?.h || !m?.fair?.a) return null;
  if (m.fair?.d) {
    const [h, d, a] = devig3Way(m.fair.h, m.fair.d, m.fair.a);
    return { h, d, a, hasDraw: true };
  }
  const [h, a] = devig2Way(m.fair.h, m.fair.a);
  return { h, d: 0, a, hasDraw: false };
}

function bestForOutcome(m, key) {
  let price = 0;
  let book = '';
  for (const [b, p] of Object.entries(m.prices || {})) {
    const v = p?.[key] || 0;
    if (v > price) {
      price = v;
      book = b;
    }
  }
  return { price, book };
}

// Full chain for ONE outcome across best available book.
export function breakdownFor(m, key, label) {
  const probs = fairProbsFor(m);
  if (!probs || !m?.fair?.[key]) return null;
  const fairProb = probs[key];
  const fair = m.fair[key];
  const { price: market, book } = bestForOutcome(m, key);
  if (!market) return null;
  const impliedProb = implied(market);
  const ev = evPercent(fairProb, market);
  const fairFromModel = fairOdds(fairProb);
  return {
    key,
    label,
    book,
    market,
    impliedProb,
    fair,
    fairProb,
    fairFromModel,
    ev,
    // price gap in odds points + probability points — answers
    // "is the market price different from fair?" without predicting winners.
    oddsGap: market - fair,
    probGapPts: (fairProb - impliedProb) * 100,
    actionable: ev >= MIN_EDGE,
  };
}

export function breakdownAll(m) {
  const labels = { h: m.home, d: 'Draw', a: m.away };
  return ['h', 'd', 'a']
    .map((k) => breakdownFor(m, k, labels[k]))
    .filter(Boolean);
}

// Every actionable (+EV) row across matches, ranked SAFEST first —
// highest true chance on top. This board is for safe +EV bets, so a
// 70% chance at +2% outranks a 6% chance at +20%. Longshots sink.
export function allValueRows(matches, minEv = MIN_EDGE) {
  const rows = [];
  for (const m of matches || []) {
    if (!Object.keys(m.prices || {}).length || !m.fair) continue;
    for (const b of breakdownAll(m)) {
      if (b.ev >= minEv) rows.push({ m, ...b });
    }
  }
  return rows.sort((x, y) => y.fairProb - x.fairProb);
}

// Best EV outcome per match EVEN when negative — caller decides how to label it.
// Never call a negative number "value": surface as "no edge".
export function bestPerMatch(m) {
  const all = breakdownAll(m);
  if (!all.length) return null;
  return all.sort((x, y) => y.ev - x.ev)[0];
}

// Model's most likely outcome (highest true probability) — NOT the value
// pick. Labeled "most likely", never "will win".
export function predictedOutcome(m) {
  const probs = fairProbsFor(m);
  if (!probs) return null;
  const entries = [['h', probs.h], ['d', probs.d], ['a', probs.a]].filter(([, p]) => p > 0);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { key: entries[0][0], prob: entries[0][1] };
}

// Natural-language value tiers — "Prime value", never "HOT DEAL".
// Stars come from valueStars() so the tier label and the /5 display
// always agree: Prime=5, Good=3-4, Fair=1-2.
export function valueTier(ev) {
  if (ev >= 0.05) return { label: 'Prime value', stars: 5 };
  if (ev >= 0.02) return { label: 'Good value', stars: 3 };
  if (ev >= MIN_EDGE) return { label: 'Fair value', stars: 1 };
  return null;
}

// 5-star scale for value, matching player/club stars everywhere else.
// Bands by edge size so every star display in the app reads /5.
export function valueStars(ev) {
  if (ev >= 0.05) return 5;
  if (ev >= 0.03) return 4;
  if (ev >= 0.02) return 3;
  if (ev >= 0.01) return 2;
  if (ev >= MIN_EDGE) return 1;
  return 0;
}

// Minimum true chance to lead the board — below this, lines sit in the
// collapsed Longshots section (still +EV, just tiny stakes only).
export const MIN_SAFE_PROB = 0.08;

// Default board bar: only lines with a real winning chance lead.
// 1-in-5 or better — anything wilder is a longshot, not a safe bet.
export const SAFE_PROB = 0.2;

// Risk tag from the price alone — scans instantly, no math needed.
export function riskTag(market) {
  if (market >= 5) return { label: 'Longshot', cls: 'text-red-300' };
  if (market >= 2.5) return { label: 'Moderate', cls: 'text-amber-300' };
  return { label: 'Safer pick', cls: 'text-lime-300' };
}

// One-sentence plain-English verdict for a flagged opportunity.
// Row shape: { label, book, market, fair, ev }.
export function verdictFor(r) {
  if (!r || r.ev < MIN_EDGE) return '';
  const over = (r.market / r.fair - 1) * 100;
  return `${r.book} pays ${Number(r.market).toFixed(2)} on ${r.label} — true price is ${Number(r.fair).toFixed(2)}, about ${over.toFixed(0)}% above it.`;
}
