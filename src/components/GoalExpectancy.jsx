import { getWinProbs } from './WinChance';
import { goalExpectancy } from '../lib/goals';
import { teamInk } from '../lib/teamColor';

// Goal expectancy, derived honestly from the totals market only:
// Poisson mean inverted from the fair over-probability, split home/away
// by win expectation. Labeled illustrative — renders nothing without a line.
export default function GoalExpectancy({ match }) {
  const probs = getWinProbs(match);
  const g = goalExpectancy(match, probs);
  if (!g) return null;
  const inkH = teamInk(match.home);
  const inkA = teamInk(match.away);
  const f = (x) => (x == null ? '–' : x.toFixed(1));
  const row = (ln) => (
    <div key={ln.line} className="grid grid-cols-[52px_1fr_1fr] items-center gap-2 text-xs">
      <span className="tabular shrink-0 text-slate-400">Over {ln.line.toFixed(1)}</span>
      <span className="flex min-w-0 items-center gap-1.5" title={`${match.home} over ${ln.line.toFixed(1)}: ${Math.round(ln.homeOver * 100)}%`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: inkH }} />
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
          <span className="block h-full rounded-full" style={{ width: `${ln.homeOver * 100}%`, background: inkH }} />
        </span>
        <b className="tabular w-9 shrink-0 text-right" style={{ color: inkH }}>{Math.round(ln.homeOver * 100)}%</b>
      </span>
      <span className="flex min-w-0 items-center gap-1.5" title={`${match.away} over ${ln.line.toFixed(1)}: ${Math.round(ln.awayOver * 100)}%`}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: inkA }} />
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5">
          <span className="block h-full rounded-full" style={{ width: `${ln.awayOver * 100}%`, background: inkA }} />
        </span>
        <b className="tabular w-9 shrink-0 text-right" style={{ color: inkA }}>{Math.round(ln.awayOver * 100)}%</b>
      </span>
    </div>
  );
  return (
    <div className="sticker p-4 sm:p-5">
      <div className="mb-1 panel-title" title="Fitted to the fair over-probability on the totals line">
        GOAL EXPECTANCY — FROM THE {g.line} LINE
      </div>
      <div className="mb-3 flex items-baseline justify-center gap-3 text-center">
        <span className="tabular text-3xl font-black" style={{ color: inkH }} title={`Expected ${match.home} goals`}>{f(g.home)}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">home • total {f(g.total)} • away</span>
        <span className="tabular text-3xl font-black" style={{ color: inkA }} title={`Expected ${match.away} goals`}>{f(g.away)}</span>
      </div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-[52px_1fr_1fr] gap-2 text-[10px] font-bold uppercase tracking-wide">
          <span />
          <span className="truncate" style={{ color: inkH }}>{match.home}</span>
          <span className="truncate" style={{ color: inkA }}>{match.away}</span>
        </div>
        {g.lines.map(row)}
      </div>
      <div className="mt-2 footnote">
        Poisson fit to the fair over-probability; home/away split by win expectation — illustrative, not a tip.
      </div>
    </div>
  );
}
