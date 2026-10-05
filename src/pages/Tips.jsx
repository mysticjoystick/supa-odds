import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TIPS } from '../lib/mock';
import { clvPercent } from '../lib/math';
import { slideRow } from '../lib/motion';

function clvOf(t) {
  if (!Number.isFinite(+t.taken) || !Number.isFinite(+t.close) || +t.taken <= 1 || +t.close <= 1) return null;
  const v = clvPercent(+t.taken, +t.close);
  return Number.isFinite(v) ? v : null;
}

function TipCard({ t }) {
  const clv = clvOf(t);
  const result = (t.result || 'pending').toLowerCase();
  return (
    <div className="sticker p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.type === 'algo' ? 'bg-sky-400/15 text-sky-300' : 'bg-violet-400/15 text-violet-300'}`}>{t.type === 'algo' ? 'ALGO' : `HUMAN • ${t.tipster || 'guest'}`}</span>
        <span className={`tabular text-xs font-bold ${clv == null ? 'text-slate-500' : clv >= 0 ? 'text-lime-300' : 'text-red-300'}`}>{clv == null ? 'CLV —' : `CLV ${clv >= 0 ? '+' : ''}${clv.toFixed(1)}%`}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${result === 'won' ? 'bg-lime-400/15 text-lime-300' : result === 'lost' ? 'bg-red-500/15 text-red-300' : 'bg-white/10 text-slate-400'}`}>{t.result || 'pending'}</span>
      </div>
      <div className="mt-2 font-semibold text-white">{t.pick}</div>
      <div className="mt-1 text-xs text-slate-400">{t.note}</div>
      <div className="tabular mt-1 text-xs text-slate-400">
        taken {Number.isFinite(+t.taken) ? (+t.taken).toFixed(2) : '—'} / close {Number.isFinite(+t.close) ? (+t.close).toFixed(2) : '—'}
        {t.fair ? ` • fair ${Number(t.fair).toFixed(2)}` : ''}{t.ev != null ? ` • EV ${(Number(t.ev) * 100).toFixed(1)}%` : ''}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {t.matchId && <Link to={`/match/${t.matchId}`} className="inline-block rounded px-1 py-2 text-xs font-bold text-lime-300 hover:underline">Open match →</Link>}
        {(!t.result || String(t.result).toLowerCase() === 'pending') && (
          <Link
            to="/tracker"
            state={{ prefill: { match: t.matchId || t.pick, pick: t.pick, taken: t.taken, close: t.close ?? t.taken, fair: t.fair ?? '', ev: t.ev ?? '', source: 'Tips' } }}
            title="Log this tip to your journal — grade it Won/Lost in Tracker"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-white/10 px-3 text-[11px] font-bold text-white hover:bg-white/15"
          >
            + Track
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Tips() {
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('clv');
  const live = useMemo(() => {
    let pool = TIPS.filter((t) => t.id < 100);
    if (kind !== 'all') pool = pool.filter((t) => t.type === kind);
    return [...pool].sort((a, b) => {
      const ca = clvOf(a) ?? -Infinity;
      const cb = clvOf(b) ?? -Infinity;
      if (sort === 'clv') return cb - ca;
      return (b.id || 0) - (a.id || 0);
    });
  }, [kind, sort]);
  const archive = useMemo(() => {
    let pool = TIPS.filter((t) => t.id >= 100);
    if (kind !== 'all') pool = pool.filter((t) => t.type === kind);
    return pool;
  }, [kind]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="hero-grid halftone relative overflow-hidden rounded-2xl border-2 border-white/15 bg-void px-5 py-4 shadow-[4px_4px_0_#e63329]">
        <div className="relative flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-normal text-white">Tips</h1>
          <span className="burst inline-grid h-10 w-10 shrink-0 place-items-center bg-gold text-sm font-black text-ink" title={`${live.length} live tips`}>
            {live.length > 99 ? '99+' : live.length}
          </span>
          <p className="w-full text-sm text-slate-400">Algo + human, fully tracked. Every tip logs the odds taken vs the final odds. <span title="Closing-line value: did the tip beat the final price? Positive over 100+ bets means a real edge, even if short-term results wobble">Positive CLV</span> over 100+ bets = real edge, even if short-term ROI wobbles.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by tip type"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
          <option value="all">All tips</option>
          <option value="algo">Algo only</option>
          <option value="human">Human only</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tips" title="Best value = biggest line move vs the final odds"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
          <option value="clv">Best value first</option>
          <option value="newest">Newest first</option>
        </select>
        <span className="footnote">{live.length} live • {archive.length} graded</span>
      </div>
      {!live.length && !archive.length && (
        <div className="sticker p-6 text-sm text-slate-400">
          No tips yet. Tips appear here when published and graded — meanwhile your own graded journal rows in Tracker feed Tools → Calibration and Performance.
        </div>
      )}
      {!!live.length && (
        <div className="grid gap-3 md:grid-cols-2">
          {live.map((t) => <TipCard key={t.id} t={t} />)}
        </div>
      )}
      {!!archive.length && (
        <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" open={live.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-slate-300">Graded archive ({archive.length}) — feeds calibration research</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {archive.map((t, i) => {
              const clv = clvOf(t);
              return (
                <motion.div key={t.id} {...slideRow(i)} className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-slate-400 transition-shadow hover:bg-white/[0.05] hover:shadow-[3px_3px_0_#e63329]">
                  <span className="font-semibold text-slate-200">{t.pick}</span> • taken {Number.isFinite(+t.taken) ? (+t.taken).toFixed(2) : '—'} / close {Number.isFinite(+t.close) ? (+t.close).toFixed(2) : '—'} •{' '}
                  <span className={t.result === 'won' ? 'text-lime-300' : t.result === 'lost' ? 'text-red-300' : 'text-slate-500'}>{t.result || 'pending'}</span>
                  {clv != null && <span className={clv >= 0 ? 'text-lime-300' : 'text-red-300'}> • CLV {clv >= 0 ? '+' : ''}{clv.toFixed(1)}%</span>}
                </motion.div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
