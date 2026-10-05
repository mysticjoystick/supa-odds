import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { refreshLeg } from './markets';
import { DEFAULT_STAKE, parseStakeText } from './math';

export { DEFAULT_STAKE, parseStakeText };

const KEY = 'oddslens-slip';
const STAKE_KEY = 'oddslens-slip-stake';

const Ctx = createContext(null);

function loadSlip() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(raw)) return raw;
  } catch { /* ignore */ }
  return [];
}

export function SlipProvider({ children }) {
  const [legs, setLegs] = useState(loadSlip);
  const [stake, setStake] = useState(() => {
    try { return Number(localStorage.getItem(STAKE_KEY)) || 50; } catch { return 50; }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(legs)); } catch { /* ignore */ }
  }, [legs]);
  useEffect(() => {
    try { localStorage.setItem(STAKE_KEY, String(stake)); } catch { /* ignore */ }
  }, [stake]);

  const add = (leg) => {
    if (!leg) return;
    const norm = { ...leg, market: normMarket(leg.market) };
    setLegs((prev) => {
      // Multi-pick: one leg per match + market + outcome. Tapping the same
      // outcome updates it (latest best book/price); different outcomes and
      // markets coexist — nothing is ever silently wiped.
      const k = legKey(norm);
      const without = prev.filter((l) => legKey(l) !== k);
      return [...without, { ...norm, addedAt: Date.now() }];
    });
  };
  // Precise remove: match + market + outcome. Accepts a leg object or parts.
  const remove = (a, b, c) => {
    const key = typeof a === 'object' && a !== null
      ? legKey(a)
      : [a, normMarket(b), c].map((x) => String(x ?? '')).join('|');
    setLegs((prev) => prev.filter((l) => legKey(l) !== key));
  };
  const clear = () => setLegs([]);
  const has = (matchId, outcome, market) => {
    const nm = normMarket(market);
    return legs.some((l) => String(l.matchId) === String(matchId) && l.outcome === outcome && normMarket(l.market) === nm);
  };
  // Which book currently holds this outcome (for per-book cells).
  const heldBook = (matchId, outcome, market) => {
    const nm = normMarket(market);
    return legs.find((l) => String(l.matchId) === String(matchId) && l.outcome === outcome && normMarket(l.market) === nm)?.book || null;
  };
  const toggle = (leg) => {
    if (!leg) return;
    if (has(leg.matchId, leg.outcome, leg.market)) remove(leg);
    else add(leg);
  };

  const value = useMemo(() => ({ legs, add, remove, clear, has, heldBook, toggle, stake, setStake }), [legs, stake]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSlip = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSlip must be used inside SlipProvider');
  return v;
};

// Stable identity for a leg: match + market + outcome. The book is an
// attribute (always the latest best), never part of the identity.
// Market is normalized so legacy `1x2` rows match `1X2` legs.
export function normMarket(market) {
  if (String(market || '').toLowerCase() === '1x2') return '1X2';
  return market;
}

export function legKey(l) {
  return [l?.matchId, normMarket(l?.market), l?.outcome].map((x) => String(x ?? '')).join('|');
}

// Total odds per book = product of that book's price on every leg.
// A book counts only if it prices ALL legs (otherwise "missing leg").
export function totalsPerBook(legs) {
  const books = new Set();
  legs.forEach((l) => Object.keys(l.prices || {}).forEach((b) => books.add(b)));
  return [...books].map((book) => {
    let total = 1;
    for (const l of legs) {
      const p = l.prices?.[book];
      if (!p || p <= 1) return { book, total: 0, missing: true };
      total *= p;
    }
    return { book, total: +total.toFixed(2), missing: false };
  }).sort((a, b) => b.total - a.total);
}

export function bestTotal(legs) {
  const rows = totalsPerBook(legs).filter((r) => !r.missing);
  return rows[0] || null;
}

// Refresh saved legs against the latest snapshot (live prices).
export function useLiveLegs(matches) {
  const { legs } = useSlip();
  return useMemo(() => {
    if (!matches?.length) return legs;
    const byId = new Map(matches.map((m) => [String(m.id), m]));
    return legs.map((l) => refreshLeg(l, byId));
  }, [legs, matches]);
}

function legLine(l) {
  const fixture = `${l.home} vs ${l.away}`;
  return `${fixture} — ${l.pick} @ ${Number(l.price).toFixed(2)} (${l.book})`;
}

export function slipShareText(legs, stake, total) {
  const lines = legs.map((l, i) => `${i + 1}. ${legLine(l)}`);
  const head = `My Supa Odds slip (${legs.length} legs)`;
  const tail = total
    ? `Total @ ${total.total.toFixed(2)} (${total.book}) — GH₵${stake} pays GH₵${(stake * total.total).toFixed(2)}`
    : `GH₵${stake} stake`;
  return `${head}\n${lines.join('\n')}\n${tail}\nConfirm odds on the book's site before paying. 18+. Play responsibly.`;
}

export function whatsappUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
