import { useEffect, useState } from 'react';
import HistoryChart from './HistoryChart';
import { getHistory, seriesFor, summarize, fmtTime } from '../lib/history';

// Full movement timeline for one series: chart + hourly table + biggest move.
export default function MovementTimeline({ matchId, book = 'Pinnacle', outcome = 'h', label }) {
  const [series, setSeries] = useState([]);
  useEffect(() => {
    getHistory().then((h) => setSeries(seriesFor(h, matchId, book, outcome))).catch(() => {});
  }, [matchId, book, outcome]);
  const sum = summarize(series);
  if (!sum) return null;
  return (
    <div className="sticker p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-bold tracking-wide text-slate-400">MOVEMENT TIMELINE — {label} @ {book}</span>
        <span className="text-slate-500">{sum.points} ticks</span>
      </div>
      <HistoryChart series={series} height={110} />
      <div className="tabular mt-2 max-h-40 overflow-y-auto text-xs">
        {sum.hourly.map(([t, v], i) => (
          <div key={i} className="flex justify-between border-t border-white/5 py-1">
            <span className="text-slate-500">{fmtTime(t)}</span>
            <span className="font-bold text-slate-200">{v.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
        Biggest single jump: <b className="text-white">{sum.biggest.from.toFixed(2)} → {sum.biggest.to.toFixed(2)}</b> ({sum.biggest.pct >= 0 ? '+' : ''}{sum.biggest.pct.toFixed(1)}%) at {fmtTime(sum.biggest.at)}
      </div>
    </div>
  );
}
