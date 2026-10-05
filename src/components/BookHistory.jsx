import { useEffect, useState } from 'react';
import { getHistory, seriesFor, summarize } from '../lib/history';
import { Odds } from '../lib/oddsFormat';

// Per-book open / high / now table for one match outcome.
export default function BookHistory({ match, outcome = 'h', books }) {
  const [hist, setHist] = useState(null);
  useEffect(() => {
    getHistory().then(setHist).catch(() => {});
  }, []);
  const label = outcome === 'h' ? match.home : outcome === 'a' ? match.away : 'Draw';
  const rows = (books || Object.keys(match.prices || {}))
    .map((b) => {
      const s = hist ? summarize(seriesFor(hist, match.id, b, outcome)) : null;
      const now = match.prices?.[b]?.[outcome];
      return { b, open: s?.open, high: s?.high, now: now ?? s?.now, move: s ? s.changePct : null };
    })
    .filter((r) => r.now != null);
  if (!rows.length) return null;
  const best = Math.max(...rows.map((r) => r.now));
  return (
    <div className="overflow-x-auto sticker">
      <div className="border-b border-white/10 px-4 py-3 panel-title">
        BOOK PRICE HISTORY — {label.toUpperCase()}
      </div>
      <table className="tabular w-full min-w-[480px] text-sm">
        <thead><tr className="text-left text-xs text-slate-400">
          <th className="px-4 py-2">Book</th><th>Open</th><th>High</th><th>Now</th><th>Move</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.b} className="border-t border-white/5">
              <td className="px-4 py-2 font-semibold text-slate-200">{r.b}</td>
              <td className="py-2 text-slate-400"><Odds v={r.open} /></td>
              <td className="py-2 text-slate-400"><Odds v={r.high} /></td>
              <td className={`py-2 font-bold ${r.now === best ? 'text-lime-300' : 'text-white'}`}><Odds v={r.now} /></td>
              <td className={`py-2 ${r.move == null ? 'text-slate-500' : r.move <= 0 ? 'text-lime-300' : 'text-red-300'}`}>
                {r.move == null ? '—' : `${r.move <= 0 ? '▼' : '▲'} ${Math.abs(r.move).toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
