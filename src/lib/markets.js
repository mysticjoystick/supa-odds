// Popular-markets helpers — 1X2, Double Chance (computed per book),
// Over/Under + BTTS (single best price from the feed).
// Every helper returns legs with a per-book price map so the slip can
// compare total payouts book-by-book.

export function dcPriceFor(prices, side) {
  const h = prices?.h || 0;
  const d = prices?.d || 0;
  const a = prices?.a || 0;
  const inv = (x) => (x > 1 ? 1 / x : 0);
  if (side === '1X') {
    const s = inv(h) + inv(d);
    return s > 0 ? +(1 / s).toFixed(2) : 0;
  }
  if (side === '12') {
    const s = inv(h) + inv(a);
    return s > 0 ? +(1 / s).toFixed(2) : 0;
  }
  const s = inv(d) + inv(a);
  return s > 0 ? +(1 / s).toFixed(2) : 0;
}

// Per-book prices for one 1X2 outcome, e.g. { SportyBet: 2.65, DraftKings: 2.6 }
export function pricesForOutcome(match, key) {
  const out = {};
  for (const [book, p] of Object.entries(match?.prices || {})) {
    if (p?.[key] > 1) out[book] = p[key];
  }
  return out;
}

// Per-book Double Chance prices derived from each book's own 1X2.
export function pricesForDC(match, side) {
  const out = {};
  for (const [book, p] of Object.entries(match?.prices || {})) {
    const v = dcPriceFor(p, side);
    if (v > 1) out[book] = v;
  }
  return out;
}

export function bestOf(map) {
  let book = '';
  let price = 0;
  for (const [b, v] of Object.entries(map || {})) {
    if (v > price) { price = v; book = b; }
  }
  return { book, price };
}

// Build a slip leg for a 1X2 outcome.
export function leg1X2(match, key) {
  const prices = pricesForOutcome(match, key);
  const { book, price } = bestOf(prices);
  if (!price) return null;
  return {
    matchId: match.id,
    home: match.home,
    away: match.away,
    leagueId: match.leagueId,
    market: '1X2',
    outcome: key,
    pick: key === 'h' ? `${match.home} win` : key === 'a' ? `${match.away} win` : 'Draw',
    prices,
    price,
    book,
    line: null,
  };
}

export function legDC(match, side) {
  const prices = pricesForDC(match, side);
  const { book, price } = bestOf(prices);
  if (!price) return null;
  const label = side === '1X' ? `${match.home} or Draw` : side === '12' ? `${match.home} or ${match.away}` : `Draw or ${match.away}`;
  return {
    matchId: match.id, home: match.home, away: match.away, leagueId: match.leagueId,
    market: 'Double Chance', outcome: side, pick: label,
    prices, price, book, line: null, estimated: true,
  };
}

export function legOver(match) {
  const t = match?.totals;
  if (!t?.over?.o) return null;
  return {
    matchId: match.id, home: match.home, away: match.away, leagueId: match.leagueId,
    market: 'Totals', outcome: 'over', pick: `Over ${t.line}`,
    prices: { [t.over.b]: t.over.o }, price: t.over.o, book: t.over.b, line: t.line,
  };
}

export function legUnder(match) {
  const t = match?.totals;
  if (!t?.under?.o) return null;
  return {
    matchId: match.id, home: match.home, away: match.away, leagueId: match.leagueId,
    market: 'Totals', outcome: 'under', pick: `Under ${t.line}`,
    prices: { [t.under.b]: t.under.o }, price: t.under.o, book: t.under.b, line: t.line,
  };
}

export function legBtts(match, yes = true) {
  const b = match?.btts;
  const side = yes ? b?.yes : b?.no;
  if (!side?.o) return null;
  return {
    matchId: match.id, home: match.home, away: match.away, leagueId: match.leagueId,
    market: 'BTTS', outcome: yes ? 'yes' : 'no', pick: yes ? 'Both score: Yes' : 'Both score: No',
    prices: { [side.b]: side.o }, price: side.o, book: side.b, line: null,
  };
}

// Re-resolve a saved leg against fresh matches so the slip always shows live prices.
export function refreshLeg(leg, matchesById) {
  const m = matchesById?.get(String(leg.matchId));
  if (!m) return leg;
  const market = String(leg.market || '').toLowerCase() === '1x2' ? '1X2' : leg.market;
  let fresh = null;
  if (market === '1X2') fresh = leg1X2(m, leg.outcome);
  else if (market === 'Double Chance') fresh = legDC(m, leg.outcome);
  else if (market === 'Totals') fresh = leg.outcome === 'over' ? legOver(m) : legUnder(m);
  else if (market === 'BTTS') fresh = legBtts(m, leg.outcome === 'yes');
  if (!fresh) return leg;
  return { ...leg, market, prices: fresh.prices, price: fresh.price, book: fresh.book, home: m.home, away: m.away };
}
