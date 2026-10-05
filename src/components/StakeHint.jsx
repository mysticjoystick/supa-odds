import { suggestedStake } from '../lib/math';
import { useBankroll } from '../lib/bankroll';
import { MIN_EDGE } from '../lib/value';

// Re-exported from lib/math so all pages share one capped sizing helper.
export { suggestedStake };

export default function StakeHint({ fairProb, market, ev }) {
  const { bank } = useBankroll();
  if ((ev ?? 0) < MIN_EDGE) return null;
  const amt = suggestedStake({ fairProb, market, bank });
  if (amt < 1) return null;
  return (
    <span
      className="text-[11px] text-slate-400"
      title={`Quarter-Kelly off your GH₵${bank} bankroll (capped at 5%). Set your bankroll in the calculator — never bet more than you can afford to lose.`}
    >
      Suggested <b className="tabular text-slate-200">GH₵{Math.round(amt)}</b>{' '}
      <span title="Quarter-Kelly: a cautious fraction of the full Kelly stake">¼ Kelly</span>
    </span>
  );
}
