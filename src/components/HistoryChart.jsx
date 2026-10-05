import { fmtTime } from '../lib/history';

export default function HistoryChart({ series, height = 120 }) {
  if (!series?.length) return <div className="halftone rounded-xl bg-white/5 p-4 text-center text-xs text-slate-400">No tick history for this selection yet — the archive fills as the feed ticks. Try another book or outcome.</div>;
  const w = 560;
  const h = height;
  const pad = 10;
  const vals = series.map((p) => p[1]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return <div className="text-xs text-slate-400">Not enough numeric history to chart.</div>;
  if (min === max) { min -= 0.05; max += 0.05; }
  const rng = max - min || 0.01;
  const t0 = series[0][0];
  let t1 = series[series.length - 1][0];
  if (!Number.isFinite(t1) || t1 === t0) t1 = t0 + 1;
  const X = (t) => pad + ((t - t0) / (t1 - t0)) * (w - pad * 2);
  const Y = (v) => pad + (1 - (v - min) / rng) * (h - pad * 2);
  const pts = series.map(([t, v]) => `${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const down = vals[vals.length - 1] < vals[0];
  const color = down ? '#a3e635' : '#f87171';
  const ticks = series.length > 2 ? [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]] : [series[0], series[series.length - 1]];
  const last = vals[vals.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label={`Price trail from ${vals[0].toFixed(2)} to ${last.toFixed(2)} over ${series.length} ticks.`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <title>{`open ${vals[0].toFixed(2)} → now ${last.toFixed(2)} (${series.length} ticks)`}</title>
        </polyline>
        {series.map(([t, v], i) =>
          i === 0 || i === series.length - 1 ? <circle key={i} cx={X(t)} cy={Y(v)} r="4" fill={color}><title>{v.toFixed(2)}</title></circle> : null
        )}
        {ticks.map(([t], i) => (
          <text key={i} x={X(t)} y={h + 14} fontSize="10" fill="#64748b" textAnchor="middle">
            {fmtTime(t)}
          </text>
        ))}
      </svg>
      <div className="tabular mt-1 flex justify-between text-xs text-slate-400">
        <span>open {vals[0].toFixed(2)}</span>
        <span className="text-slate-500">low {min.toFixed(2)} • high {max.toFixed(2)}</span>
        <span className="font-bold text-white">now {last.toFixed(2)}</span>
      </div>
    </div>
  );
}
