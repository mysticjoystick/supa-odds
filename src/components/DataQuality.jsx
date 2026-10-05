// Data-quality / confidence readout derived from snapshot metadata.
// Research framing: tells users how fresh each input is.

function age(ts) {
  if (!ts) return '—';
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function Dot({ ok, warn }) {
  return <span className={`h-2 w-2 rounded-full ${ok ? 'bg-lime-400' : warn ? 'bg-amber-400' : 'bg-slate-600'}`} />;
}

export default function DataQuality({ snap, match, compact = false }) {
  const md = snap?.metadata || {};
  const oddsLive = md.mode === 'live' || (md.mode === 'hybrid' && !!md.oddsUpdatedAt);
  const scoreLive = !!(match?.live && match?.score);
  const rows = [
    { label: 'Odds', state: oddsLive ? 'Live feed' : 'Waiting for feed', sub: age(md.oddsUpdatedAt), ok: oddsLive, warn: !oddsLive },
    { label: 'Score', state: scoreLive ? 'Live' : match?.live ? 'Delayed' : 'Pre-match', sub: age(md.scoresUpdatedAt) || '—', ok: scoreLive, warn: match?.live && !scoreLive },
    { label: 'Team stats', state: match?.stats ? 'Available' : 'Unavailable', sub: match?.stats ? 'snapshot' : '—', ok: !!match?.stats, warn: !match?.stats },
    { label: 'Injuries', state: match?.stats?.injuries?.length ? 'Partial' : 'Unavailable', sub: 'manual', ok: false, warn: !!match?.stats?.injuries?.length },
  ];
  const score = rows.filter((r) => r.ok).length * 2 + rows.filter((r) => r.warn).length;
  const overall = score >= 5 ? 'High' : score >= 3 ? 'Medium' : 'Low';
  const color = overall === 'High' ? 'text-lime-300' : overall === 'Medium' ? 'text-amber-300' : 'text-slate-400';

  if (compact) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-slate-400" title="Data confidence from snapshot metadata">
        <Dot ok={overall === 'High'} warn={overall === 'Medium'} />
        data: <b className={color}>{overall}</b>
      </span>
    );
  }
  return (
    <div className="sticker p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="panel-title">DATA QUALITY</span>
        <span className={`text-xs font-extrabold ${color}`}>{overall} confidence</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <Dot ok={r.ok} warn={r.warn} />
            <span className="w-20 text-slate-400">{r.label}</span>
            <span className="font-semibold text-slate-200">{r.state}</span>
            <span className="tabular ml-auto text-slate-500">{r.sub}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 footnote">Sources: {(md.dataSources || ['ESPN scoreboards']).join(' • ')}</div>
    </div>
  );
}
