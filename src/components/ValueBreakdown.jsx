import { Link } from 'react-router-dom';
import ValueBadge from './ValueBadge';
import { Odds } from '../lib/oddsFormat';
import { breakdownAll } from '../lib/value';
import { logEdge } from '../lib/edgeLog';

export function HelpTip({ text }) {
  return (
    <span title={text} className="ml-0.5 inline-grid h-4 w-4 cursor-help place-items-center rounded-full bg-white/10 align-middle text-[10px] font-bold text-slate-400">
      ?
    </span>
  );
}

// Answers "is the market price different from fair?" — not "who will win".
// Chain per outcome: market odds → implied % → fair odds → fair % → EV → gap.
export default function ValueBreakdown({ match, compact = false }) {
  const rows = breakdownAll(match);
  if (!rows.length) {
    return <div className="text-xs text-slate-400">No priced outcomes yet — value chain appears when the feed syncs.</div>;
  }
  return (
    <div className="overflow-x-auto sticker">
      <table className="tabular w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left footnote">
            <th className="px-3 py-2.5">Outcome</th>
            <th className="px-3 py-2.5" title="Best available book price">Market</th>
            <th className="px-3 py-2.5" title="Chance implied by the book price (1 divided by the odds)">Implied <HelpTip text="Chance implied by the book price: 1 divided by the odds." /></th>
            <th className="px-3 py-2.5" title="True price from the sharp books">True</th>
            <th className="px-3 py-2.5" title="True probability (sums to 100%)">True %</th>
            <th className="px-3 py-2.5" title="Edge = how far the book pays above the true price">Edge <HelpTip text="How far the book pays above the true price. Positive means value." /></th>
            {!compact && <th className="px-3 py-2.5" title="Market − fair in odds points">Gap</th>}
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`border-t border-white/5 ${r.actionable ? '' : 'opacity-70'}`}>
              <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-white">
                {r.label}
                <span className="ml-1.5 text-[11px] font-normal text-slate-400">@ {r.book}</span>
              </td>
              <td className="px-3 py-2.5 font-bold text-white"><Odds v={r.market} /></td>
              <td className="px-3 py-2.5 text-slate-400">{(r.impliedProb * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-slate-400"><Odds v={r.fair} /></td>
              <td className="px-3 py-2.5 font-semibold text-slate-200">{(r.fairProb * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5"><ValueBadge ev={r.ev} /></td>
              {!compact && (
                <td className={`px-3 py-2.5 text-xs ${r.oddsGap >= 0 ? 'text-lime-300' : 'text-red-300'}`}>
                  {r.oddsGap >= 0 ? '+' : ''}{r.oddsGap.toFixed(2)}
                </td>
              )}
              <td className="px-3 py-2.5 text-right">
                {r.actionable ? (
                  <Link
                    to="/tracker"
                    onClick={() => logEdge({ matchId: match.id, match: `${match.home} vs ${match.away}`, pick: `${r.label} @ ${r.book}`, market: '1X2', book: r.book, taken: r.market, fair: r.fair, ev: r.ev, leagueId: match.leagueId, source: 'value-chain' })}
                    state={{ prefill: { match: `${match.home} vs ${match.away}`, pick: `${r.label} @ ${r.book}`, taken: r.market, close: r.market, fair: r.fair, ev: r.ev, book: r.book, leagueId: match.leagueId, market: '1X2', source: 'Value chain' } }}
                    className="rounded-lg bg-lime-400/15 px-2 py-1 text-[11px] font-bold text-lime-300 hover:bg-lime-400/25"
                    title="Log detection → close → result for calibration"
                  >
                    + Track
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-400" title="Below +0.5% edge threshold — no bet">no edge</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
        e.g. true chance 65% → true price {`1 / 0.65 = 1.54`}; a book paying 1.71 is above it → edge. Negative rows are <b className="text-slate-400">below the true price</b>, never “value”.
      </div>
    </div>
  );
}
