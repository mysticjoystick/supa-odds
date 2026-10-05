import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TeamCrest from '../components/TeamCrest';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES, LEAGUES } from '../lib/mock';
import { allArbs } from '../lib/arb';
import { recordArbs, readArbs, arbStats, clearArbs } from '../lib/arbLog';
import { Odds } from '../lib/oddsFormat';
import { ProGate, ProTeaser } from '../lib/pro';

const LABEL = { h: 'Home', d: 'Draw', a: 'Away' };

export default function Arb() {
  const snap = useSnapshot();
  const matches = snap ? (snap.matches || []) : MATCHES;
  const opps = allArbs(matches);
  const [total, setTotal] = useState(100);
  const [hist, setHist] = useState(readArbs);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 100;
  const updatedAt = snap?.updatedAt ? new Date(snap.updatedAt) : null;
  const updatedLabel = updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt.toLocaleTimeString() : null;
  const leagueName = (id) => LEAGUES.find((l) => l.id === id)?.name || id;

  // Historical record: every live sighting extends firstSeen→lastSeen,
  // answering how often, where, how long, and which books.
  useEffect(() => {
    if (opps.length) setHist(recordArbs(opps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.updatedAt]);
  const stats = useMemo(() => arbStats(hist, leagueName), [hist]);

  return (
    <ProGate title="Arbitrage scanner" blurb="Cross-book guarantees, stake splits and margins — computed live across every board.">
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-normal text-white">Arbitrage scanner</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Best price on every outcome across books. If combined implied prob {'<'} 100%, a split stake locks profit before fees.
            Rare, small, and books limit fast — educational, not a promise.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProTeaser />
            <Link to="/compare" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10">Compare prices →</Link>
            <Link to="/history" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10">Price history →</Link>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Total stake GH₵
          <input type="number" min={1} max={100000} value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
            className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white" />
        </label>
      </div>
      {updatedLabel && <div className="footnote">Prices as of {updatedLabel} — confirm on each book before acting. Pre-fee.</div>}
      {!opps.length && (
        <div className="sticker p-6 text-sm text-slate-400">
          No arbs in the current snapshot. They appear when books disagree — usually right after team news. Check back soon.
        </div>
      )}
      <div className="grid gap-3">
        {opps.map(({ m, arb }) => {
          const scale = safeTotal / 100;
          const payout = (Number(arb.payout) * scale).toFixed(2);
          return (
          <div key={m.id} className="rounded-2xl border border-lime-400/25 bg-lime-400/[0.04] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <TeamCrest name={m.home} size={26} src={m.crestHome} />
              <Link to={`/match/${m.id}`} className="font-bold text-white hover:underline">{m.home} vs {m.away}</Link>
              <TeamCrest name={m.away} size={26} src={m.crestAway} />
              <span className="tabular ml-auto rounded-full bg-lime-400 px-2.5 py-0.5 text-xs font-extrabold text-black">
                +{arb.margin.toFixed(2)}%
              </span>
            </div>
            <div className="tabular mt-3 grid gap-1.5 text-sm">
              {arb.keys.map((k) => (
                <div key={k} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="text-slate-300">{LABEL[k]} @ <b className="text-white"><Odds v={arb.best[k]} /></b> <span className="text-xs text-slate-400">({arb.bestBook[k]})</span></span>
                  <span className="text-slate-300">stake <b className="text-lime-300">GH₵{(Number(arb.stakes[k]) * scale).toFixed(2)}</b></span>
                </div>
              ))}
            </div>
            <div className="tabular mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>GH₵{safeTotal} split → pays GH₵{payout} either way (pre-fee).</span>
              <Link to={`/match/${m.id}`} className="ml-auto rounded-lg bg-white/10 px-2.5 py-1 font-bold text-white hover:bg-white/15">Open match →</Link>
            </div>
          </div>
          );
        })}
      </div>
      <div className="sticker p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2 panel-title">
          ARB HISTORY — HOW OFTEN, WHERE, HOW LONG, WHICH BOOKS
          {!!hist.length && (
            <button onClick={() => { clearArbs(); setHist([]); }} className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/15">clear</button>
          )}
        </div>
        {!hist.length ? (
          <div className="text-xs text-slate-400">
            No recorded arbs on this device yet — history builds as the scanner sees live snapshots.
            Formula checked per match: <span className="tabular">1/best(H) + 1/best(D) + 1/best(A) &lt; 1</span>.
          </div>
        ) : (
          <>
            <div className="tabular mb-3 grid grid-cols-2 gap-2 text-center md:grid-cols-4">
              {[
                ['Sightings', `${stats.n}`],
                ['Avg margin', stats.avgMargin != null ? `+${stats.avgMargin.toFixed(2)}%` : '—'],
                ['Avg window', stats.avgMins != null ? `${stats.avgMins.toFixed(0)} min` : '—'],
                ['Top league', stats.leagues[0]?.league || '—'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/5 p-2">
                  <div className="footnote">{l}</div>
                  <div className="font-extrabold text-white">{v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-bold text-slate-500">BY LEAGUE (share of sightings)</div>
                {stats.leagues.slice(0, 5).map((r) => (
                  <div key={r.league} className="flex items-center gap-2 py-1 text-xs">
                    <span className="w-36 truncate text-slate-300">{r.league}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-lime-400" style={{ width: `${r.share}%` }} />
                    </div>
                    <span className="tabular w-16 text-right text-slate-400">{r.count} · {r.share.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold text-slate-500">BY BOOK (legs it supplied)</div>
                {stats.books.slice(0, 5).map((r) => (
                  <div key={r.book} className="flex items-center gap-2 py-1 text-xs">
                    <span className="w-36 truncate text-slate-300">{r.book}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-sky-400" style={{ width: `${r.share}%` }} />
                    </div>
                    <span className="tabular w-16 text-right text-slate-400">{r.count} · {r.share.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {hist.slice(0, 8).map((r) => (
                <div key={r.sig} className="tabular flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{r.match}</span>
                  <span>{r.books}</span>
                  <b className="text-lime-300">+{r.margin.toFixed(2)}%</b>
                  <span className="ml-auto">{new Date(r.firstSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • {(((r.lastSeen - r.firstSeen) / 60000).toFixed(0))} min window</span>
                </div>
              ))}
            </div>
            <div className="mt-2 footnote">Windows merge sightings of the same match+books within 30 min — duration ≈ how long the disagreement survived. Pre-fee; books limit fast.</div>
          </>
        )}
      </div>
    </div>
    </ProGate>
  );
}
