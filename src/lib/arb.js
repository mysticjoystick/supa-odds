// Arbitrage math — pure, zero AI.
// If sum(1/bestPrice) < 1 across books, a guaranteed-profit split exists (before fees/limits).
// Small margins in practice; shown for education.

export function arbForMatch(m) {
  const keys = ['h', 'd', 'a'].filter((k) => m.fair?.[k]);
  if (keys.length < 2) return null;
  const best = {};
  const bestBook = {};
  for (const k of keys) {
    let bp = 0;
    let bb = '';
    for (const [book, p] of Object.entries(m.prices || {})) {
      if (p?.[k] > bp) {
        bp = p[k];
        bb = book;
      }
    }
    if (!bp) return null;
    best[k] = bp;
    bestBook[k] = bb;
  }
  const sumInv = keys.reduce((s, k) => s + 1 / best[k], 0);
  const margin = (1 - sumInv) * 100;
  if (margin <= 0) return null;
  // stake split for GH₵100 total
  const total = 100;
  const stakes = Object.fromEntries(keys.map((k) => [k, (total / best[k] / sumInv).toFixed(2)]));
  return { keys, best, bestBook, margin, stakes, payout: (total / sumInv).toFixed(2) };
}

export function allArbs(matches) {
  return matches
    .map((m) => ({ m, arb: arbForMatch(m) }))
    .filter((x) => x.arb)
    .sort((a, b) => b.arb.margin - a.arb.margin);
}
