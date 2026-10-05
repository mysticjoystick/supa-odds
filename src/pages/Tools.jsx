import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TIPS } from '../lib/mock';
import { readJournal } from './Tracker';
import { slideRow } from '../lib/motion';

// --- Tab 1: educational probability vs odds explorer (no stakes, no picks) ---
function Calculator() {
  const [odds, setOdds] = useState('2.50');
  const [yours, setYours] = useState(45);
  const parsed = Number(odds);
  const valid = Number.isFinite(parsed) && parsed > 1;
  const implied = valid ? (1 / parsed) * 100 : 0;
  const diff = yours - implied;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="sticker p-5">
        <div className="mb-3 panel-title">YOUR INPUTS</div>
        <label className="mb-3 block text-sm text-slate-300">Decimal odds
          <input type="number" step="0.01" min="1.01" value={odds} onChange={(e) => setOdds(e.target.value)} aria-label="Decimal odds"
            className={`tabular mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-white ${odds !== '' && !valid ? 'border border-red-500/60' : ''}`} />
        </label>
        {!valid && <div role="alert" className="mb-3 text-xs text-red-300">Enter odds above 1.01 (e.g. 2.50).</div>}
        <label className="block text-sm text-slate-300">Your estimated chance (%)
          <input type="range" min="1" max="99" value={yours} onChange={(e) => setYours(+e.target.value)} aria-label="Your estimated chance percent" className="mt-2 w-full accent-lime-400" />
          <span className="tabular text-lg font-extrabold text-white">{yours}%</span>
        </label>
      </div>
      <div className="sticker p-5">
        <div className="mb-3 panel-title">WHAT THE NUMBERS SAY</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2"><span className="text-slate-400">Implied chance</span><b className="tabular text-white">{valid ? `${implied.toFixed(1)}%` : '—'}</b></div>
          <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2"><span className="text-slate-400">Your estimate</span><b className="tabular text-white">{yours}%</b></div>
          <div className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-slate-400">Gap</span>
            <b className={`tabular ${!valid ? 'text-slate-500' : diff > 0 ? 'text-lime-300' : diff < 0 ? 'text-red-300' : 'text-white'}`}>{valid ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pts` : '—'}</b>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          A positive gap means the price looks generous <i>relative to your estimate</i> — but your estimate is uncertain
          and this does not establish that any wager is profitable. Estimates need hundreds of graded outcomes before they mean anything.
          Example: 2.50 implies 40% — if you truly believe 45%, that&apos;s +5 pts. If you can&apos;t explain why you disagree with the market, don&apos;t bet it.
        </p>
        {valid && diff >= 5 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/value" className="inline-flex min-h-[44px] items-center rounded-xl bg-lime-400 px-3 text-xs font-extrabold text-black hover:bg-lime-300">See it on the Value board →</Link>
            <Link to="/tracker" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10">Log it in Tracker →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tab 2: are the model's probabilities calibrated? ---
const BUCKETS = [[1, 40], [40, 50], [50, 60], [60, 70], [70, 80], [80, 100]];

function Calibration() {
  // Model archive (prob from fair price) + the user's own graded journal (prob from taken price).
  const gradedTips = TIPS.filter((t) => t.result === 'won' || t.result === 'lost').map((t) => ({
    p: t.fair > 1 ? (1 / t.fair) * 100 : null,
    won: t.result === 'won',
    src: 'model',
  })).filter((t) => t.p != null);
  let journal = [];
  try {
    // Only explicitly graded rows count — untouched logs stay out of the stats.
    journal = readJournal()
      .filter((r) => r.graded && !r.void && +r.taken > 1)
      .map((r) => ({ p: (1 / +r.taken) * 100, won: !!r.won, src: 'you' }));
  } catch { /* ignore */ }
  const graded = [...gradedTips, ...journal];
  const rows = BUCKETS.map(([lo, hi]) => {
    const inB = graded.filter((t) => t.p >= lo && (hi === 100 ? t.p <= hi : t.p < hi));
    const wins = inB.filter((t) => t.won).length;
    const yours = inB.filter((t) => t.src === 'you').length;
    return { lo, hi, n: inB.length, yours, hit: inB.length ? (wins / inB.length) * 100 : null, mid: (lo + hi) / 2 };
  });
  const totalN = graded.length;
  const yoursTotal = journal.length;
  const NEED = 200;
  return (
    <div className="space-y-3">
      <p className="max-w-2xl text-sm text-slate-400">
        Calibration asks: when the model said ~60%, did it happen ~60% of the time? Green bars near the diagonal = honest probabilities.
        Sample: {totalN} graded outcomes{yoursTotal ? ` (including ${yoursTotal} of yours)` : ''} — far below the 200+ needed for firm conclusions.
      </p>
      <div className="halftone sticker max-w-2xl p-4">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-bold text-white">Your calibration sample: {yoursTotal} of {NEED}</span>
          <span className="tabular text-slate-400">{Math.min(100, Math.round((yoursTotal / NEED) * 100))}%</span>
        </div>
        <div className="bar-track" role="img" aria-label={`${yoursTotal} of ${NEED} graded bets needed for calibration`}>
          <div className="bar-fill" style={{ width: `${Math.min(100, (yoursTotal / NEED) * 100)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Every graded bet in your journal feeds this.</span>
          <Link to="/tracker" className="inline-flex min-h-[44px] items-center rounded-xl bg-lime-400 px-3 text-xs font-extrabold text-black hover:bg-lime-300">Log a bet →</Link>
        </div>
      </div>
      <p className="max-w-2xl footnote">Model uses the fair price as its probability; your rows use the price you took. Different bases, same question: do the numbers line up?</p>
      {rows.map((r, i) => (
        <motion.div key={r.lo} {...slideRow(i)} className="sticker p-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-bold text-slate-300">Said {r.lo}–{r.hi}% (mid {r.mid}%)</span>
            <span className="text-slate-500">n={r.n}{r.yours ? ` • including ${r.yours} of yours` : ''}</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`Predicted ${r.mid} percent, observed ${r.hit == null ? 'no data' : `${r.hit.toFixed(0)} percent`} over ${r.n} outcomes`}>
            <div className="absolute h-full rounded-full bg-white/20" style={{ width: `${r.mid}%` }} title="predicted" />
            {r.hit != null && <div className={`absolute h-full rounded-full ${Math.abs(r.hit - r.mid) < 12 ? 'bg-lime-400/80' : 'bg-amber-400/80'}`} style={{ width: `${r.hit}%` }} title="actual" />}
          </div>
          <div className="tabular mt-1 flex justify-between footnote">
            <span>predicted {r.mid}%</span>
            <span>{r.hit == null ? 'no graded outcomes in this range yet' : `actually hit ${r.hit.toFixed(0)}%`}</span>
          </div>
        </motion.div>
      ))}
      <p className="text-xs text-slate-400">Grey = predicted rate, color = observed rate. Small samples swing wildly — one result can move a bucket 20+ points.</p>
    </div>
  );
}

export default function Tools() {
  const [tab, setTab] = useState('calc');
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Research tools</h1>
      <p className="text-sm text-slate-400">Education, not recommendations. No stakes, no picks.</p>
      <div className="flex gap-2">
        {[['calc', 'Odds checker'], ['calib', 'Is the model honest?']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} data-active={tab === id} title={id === 'calc' ? 'Odds vs your estimated chance — the gap tells you if a price looks generous' : 'Do the model’s probabilities match reality? Needs 200+ graded outcomes'} className="tab-pill">{l}</button>
        ))}
      </div>
      {tab === 'calc' ? <Calculator /> : <Calibration />}
    </div>
  );
}
