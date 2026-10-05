import Stars from './Stars';
import { valueTier, valueStars, verdictFor } from '../lib/value';

// Visual edge meter: 5 gold stars (same scale as player/club stars) +
// natural tier label instead of raw "+x% EV".
export function EdgeMeter({ ev, showLabel = true }) {
  const tier = valueTier(ev);
  if (!tier) return null;
  return (
    <span className="inline-flex items-center gap-1.5" title={`Edge +${(ev * 100).toFixed(1)}% over the true price`}>
      <Stars value={valueStars(ev)} size={14} />
      {showLabel && <b className="whitespace-nowrap text-xs text-amber-300">{tier.label} <span className="tabular font-normal text-amber-200/80">+{(ev * 100).toFixed(1)}%</span></b>}
    </span>
  );
}

// One-sentence plain-English verdict for a flagged deal.
export function Verdict({ row, className = '' }) {
  const text = verdictFor(row);
  if (!text) return null;
  return <p className={`text-xs leading-relaxed text-slate-300 ${className}`}>{text}</p>;
}
