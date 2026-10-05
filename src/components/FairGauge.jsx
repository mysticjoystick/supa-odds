import { Odds } from '../lib/oddsFormat';

// Visual price-vs-true card: what the book pays against the true price.
// Lime reserved strictly for +EV. No edge → quiet neutral card.
export default function FairGauge({ pick, book, market, fair, hasEdge }) {
  if (!market || !fair) return null;
  const over = (market / fair - 1) * 100;
  const pill = (label, v, strong) => (
    <span className={`tabular inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${strong ? 'bg-lime-400 font-extrabold text-black' : 'bg-white/[0.06] font-bold text-slate-200'}`}>
      {label} <b><Odds v={v} /></b>
    </span>
  );
  return (
    <div className={`halftone rounded-2xl border-2 p-4 ${hasEdge ? 'border-gold/60 bg-gold/[0.06] shadow-[4px_4px_0_#ffb800]' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="panel-title mb-2 truncate">
        Best price: <b className="text-white">{pick}</b>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {pill(`${book} pays`, market, hasEdge)}
        {pill('True price', fair, false)}
        <span className={`tabular inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ${hasEdge ? 'bg-lime-400/15 text-lime-300' : 'bg-white/[0.06] text-slate-400'}`} title={hasEdge ? 'The book pays above the true price' : 'At or below the true price — no edge here'}>
          {hasEdge ? `Edge +${over.toFixed(1)}%` : `Edge ${over.toFixed(1)}% (no value)`}
        </span>
      </div>
    </div>
  );
}
