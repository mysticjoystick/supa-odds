import { teamInk } from '../lib/teamColor';

// Duel stat face-off: raw numbers only (no invented indexes), each row
// self-scaled to the pair max so bars stay honest. Zero-zero rows hide.
function FaceRow({ label, hv, av, hint, max }) {
  const h = hv ?? 0;
  const a = av ?? 0;
  const m = max ?? Math.max(h, a);
  if (m <= 0) return null;
  const fmt = (v) => (label === 'RATING' ? Number(v).toFixed(1) : String(v));
  return (
    <div title={hint}>
      <div className="flex items-baseline justify-between text-xs">
        <b className="tabular text-sm text-white">{fmt(h)}</b>
        <span className="font-bold tracking-widest text-slate-400">{label}</span>
        <b className="tabular text-sm text-white">{fmt(a)}</b>
      </div>
      <div className="mt-1 flex gap-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div className="ml-auto h-full rounded-full" style={{ width: `${Math.max(6, (h / m) * 100)}%`, background: 'var(--duel-h)' }} />
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full" style={{ width: `${Math.max(6, (a / m) * 100)}%`, background: 'var(--duel-a)' }} />
        </div>
      </div>
    </div>
  );
}

export default function DuelStats({ h, a, homeName, awayName }) {
  if (!h || !a) return null;
  const defs = [
    { key: 'r', label: 'RATING', hv: h.rating, av: a.rating, max: 10, hint: 'FotMob rating, out of 10' },
    { key: 'g', label: 'GOALS', hv: h.goals || 0, av: a.goals || 0, hint: h.kind === 'match' ? 'Goals in this match' : 'Goals this season' },
    { key: 's', label: 'ASSISTS', hv: h.assists || 0, av: a.assists || 0, hint: h.kind === 'match' ? 'Assists in this match' : 'Assists this season' },
  ];
  const rows = defs.filter((d) => (d.max ?? Math.max(d.hv, d.av)) > 0);
  if (!rows.length) return null;
  return (
    <div
      className="mt-3 space-y-2 border-t border-white/5 pt-3"
      style={{ '--duel-h': teamInk(homeName), '--duel-a': teamInk(awayName) }}
    >
      {rows.map((d) => (
        <FaceRow key={d.key} label={d.label} hv={d.hv} av={d.av} max={d.max} hint={d.hint} />
      ))}
    </div>
  );
}
