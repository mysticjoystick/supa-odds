export default function ValueBadge({ ev }) {
  const pct = ev * 100;
  const color =
    pct >= 4 ? 'bg-gold text-ink border-2 border-ink shadow-[2px_2px_0_#e63329]' :
    pct >= 2 ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40' :
    pct > 0 ? 'bg-white/5 text-slate-300 border border-white/10' :
    'bg-red-500/10 text-red-300 border border-red-500/30';
  const tier = pct >= 4 ? 'Prime' : pct >= 2 ? 'Good' : pct > 0 ? 'Fair' : null;
  const text = tier ? `${tier} +${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
  return (
    <span className={`tabular whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`} title={tier ? `${tier} value — pays ${pct.toFixed(1)}% above the true price` : 'Below the true price — no edge here'}>
      {text}
    </span>
  );
}
