import { devig3Way, devig2Way, evPercent, suggestedStake, flatStake } from '../lib/math';
import { formatOdds, useOddsFormat, Odds } from '../lib/oddsFormat';
import { bestPerMatch, MIN_EDGE, predictedOutcome, breakdownAll } from '../lib/value';
import { useBankroll } from '../lib/bankroll';
import { EdgeMeter } from './EdgeMeter';

// Rule-based "why" — explains the bet from numbers already on screen. Zero AI.
export function whyReasons(m, fmt = (v) => (v != null ? Number(v).toFixed(2) : '—')) {
  const out = [];
  const books = Object.values(m.prices || {});
  if (!books.length || !m.fair) {
    return {
      reasons: [{ icon: 'ℹ️', text: 'No prices on this fixture yet — the full breakdown appears when the odds feed syncs.' }],
      best: { ev: -1, label: '', price: 0, book: '', fair: 0 },
    };
  }
  const probs = m.fair?.d
    ? devig3Way(m.fair.h, m.fair.d, m.fair.a)
    : [...devig2Way(m.fair?.h || 2, m.fair?.a || 2), 0];
  const labels = [
    ['h', m.home, probs[0]],
    ['d', 'Draw', probs[1]],
    ['a', m.away, probs[2]],
  ];
  let best = { ev: -1, label: '', price: 0, book: '', fair: 0 };
  for (const [k, label, p] of labels) {
    if (!m.fair?.[k]) continue;
    let bp = 0;
    let bb = '';
    for (const [book, pr] of Object.entries(m.prices)) {
      if ((pr[k] || 0) > bp) {
        bp = pr[k];
        bb = book;
      }
    }
    const ev = evPercent(p, bp);
    if (ev > best.ev) best = { ev, label, price: bp, book: bb, fair: m.fair[k] };
  }
  if (best.ev > 0.005) {
    out.push({
      icon: '💰',
      text: `${best.label} @ ${fmt(best.price)} (${best.book}) vs fair ${fmt(best.fair)} = +${(best.ev * 100).toFixed(1)}% EV. The book is paying more than the sharp price implies.`,
      ev: best.ev,
    });
  }
  if (m.movement?.length > 1) {
    const drift = ((m.movement[0] - m.movement[m.movement.length - 1]) / m.movement[0]) * 100;
    if (drift > 2)
      out.push({ icon: '📉', text: `Steam on the home side: ${fmt(m.movement[0])} → ${fmt(m.movement[m.movement.length - 1])} (${drift.toFixed(1)}% drop). Sharp money arrived before you — still value if your price beats the close.` });
    else if (drift < -2)
      out.push({ icon: '📈', text: `Line drifting out: ${fmt(m.movement[0])} → ${fmt(m.movement[m.movement.length - 1])}. Wait — a better price may come closer to kickoff.` });
    else out.push({ icon: '➖', text: `Line stable (${fmt(m.movement[0])} → ${fmt(m.movement[m.movement.length - 1])}). No steam either way; the EV edge is purely price vs fair.` });
  }
  const s = m.stats;
  if (s) {
    const hw = (s.home.form || []).filter((x) => x === 'W').length;
    const aw = (s.away.form || []).filter((x) => x === 'W').length;
    if (hw >= aw + 2) out.push({ icon: '🔥', text: `${m.home} won ${hw}/5 vs ${m.away}'s ${aw}/5. Form gap backs the home lean.` });
    else if (aw >= hw + 2) out.push({ icon: '🔥', text: `${m.away} won ${aw}/5 vs ${m.home}'s ${hw}/5. Away form is the story here.` });
    if (s.home.xg && s.away.xg) {
      if (s.home.xg >= s.away.xg + 0.4) out.push({ icon: '📊', text: `xG gap: ${m.home} ${s.home.xg} vs ${m.away} ${s.away.xg}. Underlying chances favor home.` });
      else if (s.away.xg >= s.home.xg + 0.4) out.push({ icon: '📊', text: `xG gap: ${m.away} ${s.away.xg} vs ${m.home} ${s.home.xg}. Underlying chances favor away.` });
    }
    if (s.injuries?.length) out.push({ icon: '🏥', text: `Team news priced in: ${s.injuries.join(' • ')}.` });
    out.push({ icon: '⚔️', text: s.h2h });
  }
  if (!out.length) out.push({ icon: 'ℹ️', text: 'No edge detected — markets look sharp. Best move is no bet.' });
  return { reasons: out, best };
}

export default function WhyBet({ match }) {
  const { format } = useOddsFormat();
  const fmt = (v) => formatOdds(v, format);
  const { reasons } = whyReasons(match, fmt);
  const { bank } = useBankroll();
  const best = bestPerMatch(match);
  const hasEdge = !!best && best.ev >= MIN_EDGE;
  // Recommended pick = the most likely winner (highest true chance).
  // Simple cash first: favorites over longshots.
  const pick = predictedOutcome(match);
  const fav = pick ? breakdownAll(match).find((r) => r.key === pick.key) : null;
  const favEdge = fav ? fav.ev : -1;
  const favHasEdge = favEdge >= MIN_EDGE;
  const stake = fav
    ? favHasEdge
      ? suggestedStake({ fairProb: fav.fairProb, market: fav.market, bank })
      : flatStake(bank)
    : 0;
  const stakeLabel = favHasEdge ? '¼ Kelly' : 'flat 1%';
  const risk = !fav
    ? null
    : fav.market >= 5
      ? { label: 'Longshot — high risk', cls: 'text-red-300' }
      : fav.market >= 2.5
        ? { label: 'Moderate risk', cls: 'text-amber-300' }
        : { label: 'Shorter price — lower risk', cls: 'text-lime-300' };
  // Header already states the price-vs-true case — drop the duplicate bullet.
  const extra = reasons.filter((r) => !(hasEdge && r.ev != null)).slice(0, 4);
  return (
    <div className="halftone rounded-2xl border-2 border-lime-400/40 bg-lime-400/[0.04] p-4 shadow-[4px_4px_0_#e63329]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold tracking-wide text-lime-300">BET SUMMARY</span>
        {hasEdge && best.key === fav?.key && <EdgeMeter ev={best.ev} showLabel={false} />}
      </div>
      {fav ? (
        <ul className="space-y-1.5 text-sm leading-snug">
          <li className="flex gap-2 text-slate-200">
            <span aria-hidden>🎯</span>
            <span>Recommended pick: <b className="text-white">{fav.label} @ <Odds v={fav.market} /></b> <span className="text-slate-400">({fav.book})</span> <span className="tabular footnote">· wins about {Math.round(pick.prob * 100)}% of the time</span></span>
          </li>
          <li className="flex gap-2 text-slate-200">
            <span aria-hidden>💰</span>
            {favHasEdge ? (
              <span>Bookie paying <b className="tabular text-white"><Odds v={fav.market} /></b> — overpaying by <b className="tabular text-lime-300">{((fav.market / fav.fair - 1) * 100).toFixed(1)}%</b> vs the true <Odds v={fav.fair} /></span>
            ) : (
              <span>Bookie paying <b className="tabular text-white"><Odds v={fav.market} /></b> vs a true <Odds v={fav.fair} /> — fair price, no extra edge, just the likely winner</span>
            )}
          </li>
          {risk && (
            <li className="flex gap-2 text-slate-200">
              <span aria-hidden>📊</span>
              <span>Risk level: <b className={risk.cls}>{risk.label}</b></span>
            </li>
          )}
          <li className="flex gap-2 text-slate-200">
            <span aria-hidden>💸</span>
            <span>
              Suggested bet:{' '}
              {stake >= 1 ? (
                <b className="tabular text-white">GH₵{Math.round(stake)}</b>
              ) : (
                <b className="text-slate-400">under GH₵1 — too thin to size</b>
              )}{' '}
              <span className="footnote" title={favHasEdge ? `Quarter-Kelly off your GH₵${bank} bankroll (capped at 5%)` : `Flat 1% of your GH₵${bank} bankroll — steady staking for favorites`}>({stakeLabel} · GH₵{bank} bankroll)</span>
            </span>
          </li>
        </ul>
      ) : (
        <div className="mb-3 text-sm font-bold text-slate-300">No bet here — prices look fair. Best move is to skip.</div>
      )}
      <ul className="mt-3 space-y-2 border-t border-white/5 pt-3">
        {extra.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug text-slate-300">
            <span>{r.icon}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 footnote">Numbers, not tips — verify before staking.</div>
    </div>
  );
}
