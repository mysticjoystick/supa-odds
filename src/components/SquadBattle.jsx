import { teamInk } from '../lib/teamColor';

// Squad battle: top-rated head-to-head by rank, with a scored tally.
// Uses whichever ratings source is live (match or season) — labeled upstream.
function Row({ rank, h, a }) {
  const hw = (h?.rating ?? -1) >= (a?.rating ?? -1);
  const cell = (p, ink, align) => (
    <div className={`min-w-0 flex-1 ${align === 'right' ? 'text-right' : ''}`}>
      <div className="truncate text-sm font-bold text-white">{p?.name || '—'}</div>
      <div className="tabular text-[11px] font-bold" style={{ color: p?.rating != null ? ink : '#64748b' }}>
        {p?.rating != null ? Number(p.rating).toFixed(1) : '–'}
      </div>
    </div>
  );
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
      <span className="tabular w-4 shrink-0 text-[11px] font-bold text-slate-400">{rank}</span>
      {cell(h, teamInk(h?._team || ''), 'left')}
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${hw ? 'bg-lime-400 text-black' : 'bg-white/10 text-slate-300'}`} title={hw ? 'Home wins this row' : 'Away wins this row'}>
        {hw ? '‹' : '›'}
      </span>
      {cell(a, teamInk(a?._team || ''), 'right')}
    </div>
  );
}

export default function SquadBattle({ home, away, homeName, awayName }) {
  const n = Math.max(0, Math.min(5, Math.min(home?.length || 0, away?.length || 0)));
  if (!n) return null;
  const hs = (home || []).slice(0, n).map((p) => ({ ...p, _team: homeName }));
  const as = (away || []).slice(0, n).map((p) => ({ ...p, _team: awayName }));
  let tallyH = 0;
  hs.forEach((p, i) => {
    if ((p.rating ?? -1) >= (as[i]?.rating ?? -1)) tallyH++;
  });
  return (
    <div className="sticker p-4">
      <div className="mb-1 text-center text-[11px] font-bold tracking-widest text-amber-300">⚔️ SQUAD BATTLE — TOP {n} BY RATING</div>
      <div className="tabular mb-2 text-center text-sm font-black text-white" title="Rows won on rating, top-rated players only">
        {tallyH} – {n - tallyH} <span className="text-[11px] font-normal text-slate-400">({homeName} – {awayName})</span>
      </div>
      <div className="grid gap-1.5">
        {hs.map((p, i) => (
          <Row key={p.name} rank={i + 1} h={p} a={as[i]} />
        ))}
      </div>
      <div className="mt-2 text-center text-[11px] text-slate-400">Higher rating takes the row — ties go home.</div>
    </div>
  );
}
