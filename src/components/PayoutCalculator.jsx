import { useEffect, useMemo, useState } from 'react';
import { useSlip, parseStakeText } from '../lib/slip';
import { leg1X2 } from '../lib/markets';
import { breakdownAll, MIN_EDGE } from '../lib/value';
import { useBankroll } from '../lib/bankroll';
import { suggestedStake } from '../lib/math';
import { flatStake } from '../lib/math';
import { Odds } from '../lib/oddsFormat';
import BetNow from './BetNow';

// Payout calculator: pick an outcome, enter a stake, see the return —
// plus a suggested stake sized to the bet (Kelly on value, flat otherwise).
// Lives on the match page instead of pushing users straight to a book.
export default function PayoutCalculator({ match }) {
  const { legs, stake, setStake, toggle, has } = useSlip();
  const { bank } = useBankroll();
  const rows = useMemo(() => breakdownAll(match), [match]);
  const mine = legs.find((l) => String(l.matchId) === String(match.id) && String(l.market || '').toLowerCase() === '1x2');
  const [outcome, setOutcome] = useState(mine?.outcome || rows.find((r) => r.ev >= MIN_EDGE)?.key || rows[0]?.key);
  // Follow slip picks made on the outcome cards above.
  useEffect(() => {
    if (mine && mine.outcome !== outcome) setOutcome(mine.outcome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.outcome]);
  const [stakeText, setStakeText] = useState(String(stake));
  useEffect(() => setStakeText(String(stake)), [stake]);

  const leg = leg1X2(match, outcome);
  const row = rows.find((r) => r.key === outcome);
  const active = leg ? has(leg.matchId, leg.outcome, leg.market) : false;
  const price = leg?.price || 0;
  const staked = Number(stakeText);
  const validStake = Number.isFinite(staked) && staked > 0 ? staked : 0;
  const returns = validStake * price;
  const profit = returns - validStake;
  const sugg = row && row.ev >= MIN_EDGE
    ? suggestedStake({ fairProb: row.fairProb, market: price, bank })
    : flatStake(bank);
  const suggLabel = row && row.ev >= MIN_EDGE ? '¼ Kelly' : 'flat 1%';

  if (!rows.length || !leg) return null;
  const commitStake = () => {
    setStake(parseStakeText(stakeText, stake));
  };
  const label = (k) => (k === 'h' ? `1 · ${match.home}` : k === 'a' ? `2 · ${match.away}` : 'X · Draw');
  return (
    <div className="sticker p-4 sm:p-5">
      <div className="mb-2 panel-title">PAYOUT CALCULATOR — WHAT COULD YOU WIN?</div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose outcome">
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={() => setOutcome(r.key)}
            aria-pressed={outcome === r.key}
            className={`comic-btn min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
              outcome === r.key ? 'bg-gold text-ink' : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
            }`}
          >
            {label(r.key)} <span className="tabular">@ <Odds v={r.market} /></span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-400">
          Your stake (GH₵)
          <input
            type="number" min="1" step="1" value={stakeText}
            onChange={(e) => setStakeText(e.target.value)}
            onBlur={commitStake}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="field tabular mt-1 block w-28 text-sm font-bold text-white"
            aria-label="Stake in cedis"
          />
        </label>
        <div className="min-w-[140px] flex-1 rounded-xl border border-gold/40 bg-gold/[0.07] px-3 py-2">
          <div className="text-[11px] text-slate-400">Profit</div>
          <div className="tabular text-xl font-black text-lime-300">
            GH₵{validStake ? profit.toFixed(2) : '—'}
            {!!validStake && <span className="ml-1 text-[11px] font-normal text-slate-400">(GH₵{returns.toFixed(2)} payout)</span>}
          </div>
        </div>
        <button
          onClick={() => toggle(leg)}
          aria-pressed={active}
          className={`inline-flex min-h-[44px] items-center rounded-lg px-4 text-xs font-extrabold ${active ? 'bg-lime-400 text-black' : 'bg-lime-400/15 text-lime-300 hover:bg-lime-400/25'}`}
        >
          {active ? '✓ In slip' : '+ Slip'}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 footnote">
        <span>
          Suggested <b className="tabular text-slate-200">GH₵{Math.max(1, Math.round(sugg))}</b> ({suggLabel} · GH₵{bank} bankroll)
        </span>
        <button onClick={() => { setStakeText(String(Math.max(1, Math.round(sugg)))); setStake(Math.max(1, Math.round(sugg))); }} className="field font-bold text-white hover:bg-white/15">
          Use suggested
        </button>
        {leg.book && (
          <span className="ml-auto">
            <BetNow book={leg.book} label="View" variant="ghost" />
          </span>
        )}
      </div>
    </div>
  );
}
