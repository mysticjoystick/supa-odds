import { useSlip } from '../lib/slip';
import { Odds } from '../lib/oddsFormat';
import { legDC, legOver, legUnder, legBtts } from '../lib/markets';

// Quick-add buttons for the markets casuals actually play:
// 1X2 + Double Chance + Over/Under + Both-score. One tap -> slip.
function AddBtn({ leg, small = false }) {
  const { toggle, has } = useSlip();
  if (!leg) return null;
  const active = has(leg.matchId, leg.outcome, leg.market);
  return (
    <button
      onClick={() => toggle(leg)}
      aria-pressed={active}
      title={active ? 'Tap to remove from slip' : `Add ${leg.pick} @ ${leg.price} (${leg.book}) to slip`}
      className={`${small ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'} tabular rounded-lg font-bold transition-all ${active ? 'bg-lime-400 text-black' : 'bg-white/10 text-white hover:bg-lime-400/25 hover:text-lime-200'}`}
    >
      {active ? '✓ ' : '+ '}<Odds v={leg.price} />
    </button>
  );
}

export function MarketRow({ label, sub, leg }) {
  if (!leg) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {sub && <span className="block truncate footnote">{sub} @ {leg.book}</span>}
      </span>
      <AddBtn leg={leg} small />
    </div>
  );
}

// Full popular-markets panel for MatchDetail (1X2 lives in OutcomeCards).
export default function PopularMarkets({ match }) {
  if (!match) return null;
  const dc1x = legDC(match, '1X');
  const dc12 = legDC(match, '12');
  const dcX2 = legDC(match, 'X2');
  const over = legOver(match);
  const under = legUnder(match);
  const yes = legBtts(match, true);
  const no = legBtts(match, false);

  return (
    <div className="space-y-4">
      <div className="sticker p-4">
        <div className="mb-2 panel-title">DOUBLE CHANCE — SAFER, SMALLER PRICE</div>
        <div className="grid gap-2">
          <MarketRow label={`1X — ${match.home} or Draw`} sub="Est. from 1X2" leg={dc1x} />
          <MarketRow label="12 — Either team wins" sub="Est. from 1X2" leg={dc12} />
          <MarketRow label={`X2 — Draw or ${match.away}`} sub="Est. from 1X2" leg={dcX2} />
        </div>
        <div className="mt-1 footnote">Double Chance odds are estimated from each book's 1X2 — confirm the exact price on the book.</div>
      </div>
      {(over || under) && (
        <div className="sticker p-4">
          <div className="mb-2 panel-title">GOALS — OVER / UNDER {match.totals?.line}</div>
          <div className="grid gap-2">
            <MarketRow label={`Over ${match.totals?.line}`} sub="Best price" leg={over} />
            <MarketRow label={`Under ${match.totals?.line}`} sub="Best price" leg={under} />
          </div>
        </div>
      )}
      {(yes || no) && (
        <div className="sticker p-4">
          <div className="mb-2 panel-title">BOTH TEAMS TO SCORE</div>
          <div className="grid gap-2">
            <MarketRow label="Yes — both score" sub="Best price" leg={yes} />
            <MarketRow label="No — at least one blanks" sub="Best price" leg={no} />
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline strip for list rows (Dashboard / Compare): Over, GG, DC 1X/X2.
export function PopularStrip({ match }) {
  const over = legOver(match);
  const yes = legBtts(match, true);
  const dc1x = legDC(match, '1X');
  const dcX2 = legDC(match, 'X2');
  if (!over && !yes && !dc1x && !dcX2) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {over && (
        <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
          O{over.line} <AddBtn leg={over} small />
        </span>
      )}
      {yes && (
        <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
          GG <AddBtn leg={yes} small />
        </span>
      )}
      {dc1x && (
        <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
          1X <AddBtn leg={dc1x} small />
        </span>
      )}
      {dcX2 && (
        <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
          X2 <AddBtn leg={dcX2} small />
        </span>
      )}
    </div>
  );
}
