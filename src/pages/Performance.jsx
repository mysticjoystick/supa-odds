import { useMemo, useState } from 'react';
import { useSnapshot } from '../hooks/useSnapshot';
import { TIPS, LEAGUES } from '../lib/mock';
import { readJournal } from './Tracker';
import { readEdges, fromEdge } from '../lib/edgeLog';
import { fromTip, fromJournal, summarize, slice, evBucket, evCalibration, convergence, MIN_N } from '../lib/ledger';
import Pipeline from '../components/Pipeline';

function fmt(v, digits = 1, suffix = '') {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}${suffix}`;
}

function StatTable({ rows, keyLabel = 'Slice' }) {
  if (!rows.length) return <div className="sticker p-6 text-sm text-slate-500">No graded outcomes in this slice yet — grade tips or journal rows to fill it.</div>;
  return (
    <div className="overflow-x-auto sticker">
      <table className="tabular w-full min-w-[620px] text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="px-4 py-2">{keyLabel}</th><th>n</th><th>Hit%</th><th>Yield</th><th>Avg CLV</th><th>Profit (u)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={`border-t border-white/5 ${r.solid ? '' : 'opacity-55'}`}>
              <td className="px-4 py-2 font-semibold text-white">
                {r.key}
                {!r.solid && <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">too early</span>}
              </td>
              <td className="py-2 text-slate-300">{r.n}</td>
              <td className="py-2 text-slate-300">{r.hitRate == null ? '—' : `${r.hitRate.toFixed(0)}%`}</td>
              <td className={`py-2 font-bold ${r.yield == null ? 'text-slate-500' : r.yield >= 0 ? 'text-lime-300' : 'text-red-300'}`}>{fmt(r.yield, 1, '%')}</td>
              <td className={`py-2 ${r.avgClv == null ? 'text-slate-500' : r.avgClv >= 0 ? 'text-lime-300' : 'text-red-300'}`}>{fmt(r.avgClv, 2, '%')}</td>
              <td className={`py-2 ${r.profit >= 0 ? 'text-slate-300' : 'text-red-300'}`}>{fmt(r.profit, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConvergenceChart({ data }) {
  if (data.length < 2) return <div className="sticker p-6 text-sm text-slate-500">Grade at least 2 outcomes to draw the convergence curve.</div>;
  const w = 560;
  const h = 160;
  const pad = 12;
  const vals = data.flatMap((d) => [d.actual, d.implied]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return <div className="sticker p-6 text-sm text-slate-500">Not enough numeric results to chart yet.</div>;
  if (min === max) { min -= 1; max += 1; }
  const padV = (max - min) * 0.08;
  min -= padV; max += padV;
  const rng = max - min || 1;
  const X = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const Y = (v) => pad + (1 - (v - min) / rng) * (h - pad * 2);
  const line = (k) => data.map((d, i) => `${X(i).toFixed(1)},${Y(d[k]).toFixed(1)}`).join(' ');
  const y0 = 0 >= min && 0 <= max ? Y(0) : null;
  return (
    <div className="sticker p-4">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-bold tracking-wide text-slate-400">CLV vs ACTUAL (CUMULATIVE UNITS)</span>
        <span className="text-slate-500">n={data.length}</span>
        <span className="ml-auto flex items-center gap-1.5 text-slate-400"><span className="h-0.5 w-5 bg-lime-400" /> actual</span>
        <span className="flex items-center gap-1.5 text-slate-400"><span className="h-0.5 w-5 bg-sky-400" /> CLV-implied</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Convergence over ${data.length} graded outcomes. Actual ${data[data.length - 1].actual.toFixed(1)} units, implied ${data[data.length - 1].implied.toFixed(1)} units.`}>
        {y0 != null && <line x1={pad} y1={y0} x2={w - pad} y2={y0} stroke="#334155" strokeDasharray="4 3" />}
        <polyline points={line('implied')} fill="none" stroke="#38bdf8" strokeWidth="2"><title>CLV-implied cumulative</title></polyline>
        <polyline points={line('actual')} fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round"><title>Actual cumulative</title></polyline>
        <circle cx={X(data.length - 1)} cy={Y(data[data.length - 1].actual)} r="4" fill="#a3e635"><title>actual {data[data.length - 1].actual.toFixed(2)}u</title></circle>
      </svg>
      <div className="tabular mt-1 flex justify-between footnote">
        <span>min {min.toFixed(1)}u</span>
        <span>If process is sound, actual tracks implied over volume. Gaps = variance, not verdicts — read with n in mind.</span>
        <span>max {max.toFixed(1)}u</span>
      </div>
    </div>
  );
}

const leagueName = (id, leagues) => {
  if (!id || id === 'unknown') return 'Unknown league';
  return leagues.find((l) => l.id === id)?.name || String(id);
};
const prettyKey = (v, fallback = 'Unknown') => {
  if (v == null || String(v).trim() === '' || v === 'unknown') return fallback;
  return String(v);
};

function EvCalibrationTable({ rows }) {
  if (!rows.some((r) => r.n > 0)) {
    return <div className="sticker p-6 text-sm text-slate-500">No graded edges yet — track +EV rows from Value, then grade them in Tracker (taken → close → won/lost). Calibration fills up as volume grows.</div>;
  }
  return (
    <div className="overflow-x-auto sticker">
      <table className="tabular w-full min-w-[680px] text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="px-4 py-2">EV range</th><th>n</th><th title="Average model probability (1/fair)">Expected</th><th>Win rate</th><th>ROI</th><th>Avg CLV</th><th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const gap = r.actual != null && r.expected != null ? r.actual - r.expected : null;
            const verdict =
              r.n === 0 ? <span className="text-slate-500">—</span>
              : r.n < MIN_N ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">TOO EARLY (n&lt;{MIN_N})</span>
              : gap == null ? <span className="text-slate-500">—</span>
              : Math.abs(gap) < 6 ? <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold text-lime-300">CALIBRATED</span>
              : gap > 0 ? <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">BEATING MODEL</span>
              : <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">EDGE FADING</span>;
            return (
              <tr key={r.bucket} className={`border-t border-white/5 ${r.n >= MIN_N ? '' : 'opacity-55'}`}>
                <td className="px-4 py-2 font-bold text-white">{r.bucket}</td>
                <td className="py-2 text-slate-300">{r.n}</td>
                <td className="py-2 text-slate-400">{r.expected == null ? '—' : `${r.expected.toFixed(0)}%`}</td>
                <td className="py-2 text-slate-200">{r.actual == null ? '—' : `${r.actual.toFixed(0)}%`}</td>
                <td className={`py-2 font-bold ${r.roi == null ? 'text-slate-500' : r.roi >= 0 ? 'text-lime-300' : 'text-red-300'}`}>{fmt(r.roi, 1, '%')}</td>
                <td className={`py-2 ${r.avgClv == null ? 'text-slate-500' : r.avgClv >= 0 ? 'text-lime-300' : 'text-red-300'}`}>{fmt(r.avgClv, 2, '%')}</td>
                <td className="py-2">{verdict}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Performance() {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('oddslens-perf-tab') || 'sources'; } catch { return 'sources'; }
  });
  const snap = useSnapshot();
  const tips = snap?.tips?.length ? snap.tips : TIPS;
  const leagues = snap?.leagues?.length ? snap.leagues : LEAGUES;

  const records = useMemo(() => {
    let journal = [];
    try {
      journal = readJournal().map(fromJournal).filter(Boolean);
    } catch { /* ignore */ }
    let edges = [];
    try {
      edges = readEdges().map(fromEdge).filter(Boolean);
    } catch { /* ignore */ }
    return [...tips.map(fromTip).filter(Boolean), ...journal, ...edges];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tips]);

  const overall = summarize(records);
  const bySource = slice(records, (r) => (r.source === 'human' ? `human · ${r.tipster}` : r.source));
  const conv = convergence(records);
  const calib = useMemo(() => evCalibration(records), [records]);

  const tabs = [
    ['sources', 'Sources'],
    ['league', 'League'],
    ['market', 'Market'],
    ['ev', 'EV bucket'],
    ['book', 'Book'],
  ];
  const sliceRows =
    tab === 'sources' ? bySource
    : tab === 'league' ? slice(records, (r) => leagueName(r.leagueId, leagues))
    : tab === 'market' ? slice(records, (r) => prettyKey(r.market, 'Unknown market'))
    : tab === 'ev' ? slice(records, (r) => evBucket(r.ev))
    : slice(records, (r) => prettyKey(r.book, 'Unknown book'));

  const pickTab = (id) => {
    setTab(id);
    try { localStorage.setItem('oddslens-perf-tab', id); } catch { /* ignore */ }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Performance</h1>
      <p className="max-w-2xl text-sm text-slate-400">
        Every graded outcome — model tips, human tips, your journal — in one ledger. Slices need {MIN_N}+ graded outcomes before they mean anything; smaller samples stay greyed.
      </p>

      <Pipeline snap={snap} />

      <div className="tabular grid grid-cols-2 gap-2 md:grid-cols-5">
        {[['Graded', overall.n, 'text-white'], ['Hit rate', overall.hitRate == null ? '—' : `${overall.hitRate.toFixed(0)}%`, 'text-white'], ['Yield', fmt(overall.yield, 1, '%'), (overall.yield ?? 0) >= 0 ? 'text-lime-300' : 'text-red-300'], ['Avg CLV', fmt(overall.avgClv, 2, '%'), (overall.avgClv ?? 0) >= 0 ? 'text-lime-300' : 'text-red-300'], ['Profit (u)', fmt(overall.profit, 2), overall.profit >= 0 ? 'text-slate-200' : 'text-red-300']].map(([l, v, c]) => (
          <div key={l} className="sticker p-3 text-center">
            <div className="footnote">{l}</div>
            <div className={`text-xl font-extrabold ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <ConvergenceChart data={conv} />

      <div className="rounded-2xl border border-lime-400/25 bg-lime-400/[0.04] p-4">
        <div className="mb-1 text-xs font-bold tracking-wide text-lime-300">EDGE CALIBRATION — DOES +EV PREDICT WINS?</div>
        <p className="mb-3 max-w-3xl text-xs text-slate-400">
          EV range → bets → win rate → ROI → CLV. Expected = avg model prob (1/fair). If +5–8% rows hit ≈57% with +CLV, the edge is real;
          if +12% rows hit 48% with flat CLV, the “value” is noise. Needs {MIN_N}+ per bucket before the verdict means anything.
        </p>
        <EvCalibrationTable rows={calib} />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Performance slices">
        {tabs.map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => pickTab(id)} className={`rounded-full px-4 py-1.5 text-sm ${tab === id ? 'bg-lime-400 font-bold text-black' : 'bg-white/10 text-slate-300'}`}>{l}</button>
        ))}
      </div>
      <StatTable rows={sliceRows} keyLabel={tab === 'sources' ? 'Source' : tab === 'league' ? 'League' : tab === 'market' ? 'Market' : tab === 'ev' ? 'EV bucket' : 'Book'} />

      <p className="text-xs text-slate-400">
        Voids and pending excluded. Tips count as 1u flat; your journal uses your stakes. Past performance doesn't predict future outcomes — this page describes, it doesn't recommend.
      </p>
    </div>
  );
}
