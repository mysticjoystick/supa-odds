import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logBet, hasPendingBet } from '../lib/journal';
import { suggestedStake, flatStake } from '../lib/math';
import { MIN_EDGE } from '../lib/value';
import { useBankroll } from '../lib/bankroll';

// "I placed this" — one tap logs the bet to the Tracker journal as pending.
// Grade it Won/Lost there later; profit shows up in your record.
export default function PlacedBtn({ match, pick, price, book, leagueId, market, fair, ev, fairProb, source }) {
  const { bank } = useBankroll();
  const [done, setDone] = useState(() => hasPendingBet(match, pick));
  if (done) {
    return (
      <Link
        to="/tracker"
        title="Already in your journal — open Tracker to grade it"
        className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg bg-white/10 px-3 text-[11px] font-bold text-slate-200 hover:bg-white/15"
      >
        ✓ Tracking
      </Link>
    );
  }
  return (
    <button
      onClick={() => {
        const hasEdge = (ev ?? 0) >= MIN_EDGE;
        const raw = hasEdge ? suggestedStake({ fairProb, market: price, bank }) : flatStake(bank);
        const stake = Math.max(1, Math.round(raw) || 1);
        if (logBet({ match, pick: `${pick} @ ${book}`, stake, taken: price, book, leagueId, market, fair, ev, source })) {
          setDone(true);
        }
      }}
      title="Log this bet to your journal — grade it Won/Lost in Tracker"
      className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg bg-white/10 px-3 text-[11px] font-bold text-slate-200 hover:bg-white/15"
    >
      I placed this
    </button>
  );
}
