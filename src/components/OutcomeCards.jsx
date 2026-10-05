import { useSlip } from '../lib/slip';
import { leg1X2 } from '../lib/markets';
import { bestPerMatch, MIN_EDGE, predictedOutcome } from '../lib/value';
import { Odds } from '../lib/oddsFormat';
import { fmtPct } from '../lib/math';
import { fairProbsFor } from '../lib/value';

// Three tappable outcome cards replacing the technical stacked bar.
// Lime glow = best value; ★ chip = model's most likely outcome.
function Card({ leg, label, sub, prob, isBest, ev, isPick }) {
  const { toggle, has } = useSlip();
  if (!leg) return null;
  const active = has(leg.matchId, leg.outcome, leg.market);
  return (
    <button
      onClick={() => toggle(leg)}
      aria-pressed={active}
      title={active ? `Remove ${leg.pick} @ ${leg.price} (${leg.book}) from slip` : `Add ${leg.pick} @ ${leg.price} (${leg.book}) to slip`}
      className={`min-h-[76px] flex-1 rounded-2xl border p-3 text-left transition-all ${
        active
          ? 'border-lime-400 bg-lime-400 font-extrabold text-black shadow-[0_0_22px_rgba(163,230,53,0.4)]'
          : isBest
            ? 'border-lime-400/60 bg-lime-400/[0.07] hover:bg-lime-400/[0.12]'
            : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[3px_3px_0_#e63329]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-bold ${active ? 'text-black/80' : 'text-slate-400'}`}>{label}</span>
        {isPick && (
          <span title="Model's most likely outcome (highest true chance)" className={`text-[10px] font-black ${active ? 'text-black' : 'text-amber-300'}`}>★ pick</span>
        )}
        {isBest && !active && (
          <span className="rounded-full bg-lime-400 px-1.5 py-0.5 text-[10px] font-black text-black">+{(ev * 100).toFixed(1)}% value</span>
        )}
        {active && <span className="text-xs font-black">✓</span>}
      </div>
      <div className={`tabular mt-0.5 text-xl font-black ${active ? '' : 'text-white'}`}>
        <Odds v={leg.price} />
      </div>
      <div className={`tabular text-[11px] ${active ? 'text-black/80' : 'text-slate-500'}`}>
        {sub} • {leg.book}
      </div>
      {prob != null && (
        <div className={`tabular text-[11px] font-bold ${active ? 'text-black/80' : 'text-slate-400'}`}>
          True chance {fmtPct(prob, 0)}
        </div>
      )}
    </button>
  );
}

export default function OutcomeCards({ match }) {
  const probs = fairProbsFor(match);
  const best = bestPerMatch(match);
  const pick = predictedOutcome(match)?.key;
  const defs = [
    { key: 'h', label: '1' },
    ...(probs?.hasDraw ? [{ key: 'd', label: 'X' }] : []),
    { key: 'a', label: '2' },
  ];
  const cards = defs
    .map((d) => ({ ...d, leg: leg1X2(match, d.key) }))
    .filter((d) => d.leg);
  if (!cards.length) {
    return (
      <div className="halftone rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-400">
        No win prices yet — cards appear once the odds feed syncs.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 text-xs text-slate-400" title="Tap a card to add it to your slip. Glowing card = best value.">
        Pick an outcome — tap to add to slip
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {cards.map((d) => (
          <Card
            key={d.key}
            leg={d.leg}
            label={d.label}
            sub={d.key === 'h' ? match.home : d.key === 'a' ? match.away : 'Draw'}
            prob={probs?.[d.key]}
            isBest={!!best && best.key === d.key && best.ev >= MIN_EDGE}
            ev={best?.ev ?? 0}
            isPick={pick === d.key}
          />
        ))}
      </div>
    </div>
  );
}
