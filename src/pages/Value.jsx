import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import TeamCrest from '../components/TeamCrest';
import LiveBadge from '../components/LiveBadge';
import MyBooksPicker from '../components/MyBooksPicker';
import { EdgeMeter, Verdict } from '../components/EdgeMeter';
import StakeHint from '../components/StakeHint';
import PlacedBtn from '../components/PlacedBtn';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES } from '../lib/mock';
import { fmtPct } from '../lib/math';
import { Odds } from '../lib/oddsFormat';
import { allValueRows, MIN_EDGE, MIN_SAFE_PROB, SAFE_PROB, riskTag } from '../lib/value';
import { useMyBooks } from '../lib/myBooks';
import { useSlip } from '../lib/slip';
import { leg1X2 } from '../lib/markets';

function SlipBtn({ m, label, book, market }) {
  const { toggle, has, heldBook } = useSlip();
  // Build directly from row to keep the exact book/price shown.
  const key = label === m.home ? 'h' : label === m.away ? 'a' : 'd';
  const active = has(m.id, key, '1X2');
  const held = heldBook(m.id, key, '1X2');
  const onClick = () => {
    if (active) return toggle({ matchId: m.id, outcome: key, market: '1X2' });
    const l = leg1X2(m, key);
    // Keep the full per-book price map so other books don't show
    // "missing leg" — only pin the displayed best price/book on top.
    if (l) toggle({ ...l, price: market, book });
  };
  return (
    <button
      onClick={onClick}
      title={active && held ? `In slip @ ${held} — tap to remove` : `Add ${label} @ ${market} (${book}) to slip`}
      className={`min-h-[44px] whitespace-nowrap rounded-lg px-3 text-[11px] font-extrabold ${active ? 'bg-lime-400 text-black' : 'bg-lime-400/15 text-lime-300 hover:bg-lime-400/25'}`}
    >
      {active ? `✓ In slip${held ? ` @ ${held}` : ''}` : '+ Slip'}
    </button>
  );
}

export default function Value() {
  const snap = useSnapshot();
  const matches = snap ? (snap.matches || []) : MATCHES;
  const leagues = snap?.leagues?.length ? snap.leagues : [];
  const isDemo = (snap?.metadata?.mode === 'demo' || snap?.isDemo || snap?.metadata?.isDemo || snap?.source === 'demo-sample') && matches.length > 0;
  const [league, setLeague] = useState('all');
  const [minEv, setMinEv] = useState(MIN_EDGE);
  const [mineOnly, setMineOnly] = useState(true);
  const [safeOnly, setSafeOnly] = useState(true);
  const { myBooks } = useMyBooks();
  const rows = useMemo(() => {
    const pool = league === 'all' ? matches : matches.filter((m) => m.leagueId === league);
    const all = allValueRows(pool, minEv);
    if (mineOnly && myBooks?.length) {
      const mine = all.filter((r) => myBooks.includes(r.book));
      // Honest fallback: say so when none of the user's books price anything.
      if (mine.length) return { rows: mine, fellBack: false };
      return { rows: all, fellBack: true };
    }
    return { rows: all, fellBack: false };
  }, [matches, league, minEv, mineOnly, myBooks]);
  // Loading — skeleton deal cards before the first snapshot lands.
  if (!snap) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="shimmer h-4 w-96 rounded-lg" />
        <div className="shimmer h-16 rounded-2xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  const { rows: dealRows, fellBack } = rows;
  // Safe board: winnable lines (1-in-5 or better) lead. Wilder longshots
  // sit collapsed below — or hidden entirely until toggled on.
  const safeRows = dealRows.filter((r) => (r.fairProb ?? 0) >= SAFE_PROB);
  const midRows = dealRows.filter((r) => (r.fairProb ?? 0) >= MIN_SAFE_PROB && (r.fairProb ?? 0) < SAFE_PROB);
  const longRows = dealRows.filter((r) => (r.fairProb ?? 0) < MIN_SAFE_PROB);
  const mainRows = safeOnly ? safeRows : [...safeRows, ...midRows];
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="hero-grid halftone relative overflow-hidden rounded-2xl border-2 border-white/15 bg-void px-5 py-4 shadow-[4px_4px_0_#e63329]">
        <div className="relative flex flex-wrap items-end gap-3">
          <div>
            <h1 className="font-display text-2xl font-normal text-white">Hot deals <span className="burst ml-1 inline-grid h-8 w-8 place-items-center bg-gold align-middle text-[11px] font-black text-ink" title={`${dealRows.length} live deals`}>{dealRows.length > 99 ? '99+' : dealRows.length}</span></h1>
            <p className="mt-1 text-sm text-slate-400">
              Winnable lines first (1-in-5 chance or better). Wilder longshots stay tucked away — small stakes only.
              {!matches.length ? ' No fixtures right now — check back soon.' : isDemo ? ' Showing sample fixtures.' : ` From ${matches.length} matches.`} Confirm odds on the book before placing. 18+.
            </p>
          </div>
          <Link to="/builder" className="comic-btn ml-auto inline-flex min-h-[44px] items-center rounded-xl bg-gold px-3.5 py-2 text-xs font-extrabold text-ink">✦ Build my ticket →</Link>
        </div>
      </div>
      <MyBooksPicker compact />
      <div className="sticky top-[64px] z-20 -mx-4 bg-void/90 px-4 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {!!leagues.length && (
          <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label="Filter by league"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <select value={String(minEv)} onChange={(e) => setMinEv(Number(e.target.value))} aria-label="Minimum edge"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
          <option value="0.005">Any deal ≥ 0.5%</option>
          <option value="0.02">Bigger ≥ 2%</option>
          <option value="0.05">Hottest ≥ 5%</option>
        </select>
        <button onClick={() => setMineOnly(!mineOnly)} aria-pressed={mineOnly}
          title={fellBack ? 'None of your books price these deals — showing all books' : mineOnly ? 'Showing only your books' : 'Showing all books'}
          className={`whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold ${mineOnly ? 'bg-lime-400 text-black' : 'bg-white/10 text-slate-300'}`}>
          {mineOnly ? (fellBack ? 'My books · showing all' : '✓ My books') : 'All books'}
        </button>
        <button onClick={() => setSafeOnly(!safeOnly)} aria-pressed={safeOnly}
          title={safeOnly ? 'Showing winnable lines only (1-in-5 chance or better)' : 'Including longer shots down to 8% chance'}
          className={`whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-bold ${safeOnly ? 'bg-lime-400 text-black' : 'bg-white/10 text-slate-300'}`}>
          {safeOnly ? '✓ Safe only' : 'Longer shots too'}
        </button>
        <span className="tabular rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1 text-[11px] font-extrabold text-gold">{dealRows.length} deals</span>
      </div>
      </div>
      {!dealRows.length && (
        <div className="sticker p-6 text-sm text-slate-400">No deals match these filters. Markets look fair — loosen the filter or try another league.</div>
      )}
      {safeOnly && !mainRows.length && !!dealRows.length && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-6 text-center text-sm text-slate-300">
          <div className="font-extrabold text-amber-300">No safe value right now</div>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">Every +EV line today is a longshot (under 1-in-5). Nothing here is a safe bet — or peek at the longshots below with tiny stakes.</p>
          <button onClick={() => setSafeOnly(false)} className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15">Show longer shots</button>
        </div>
      )}
      <div className="grid gap-3">
        {mainRows.map((r, i) => (
          <DealCard key={`${r.m.id}-${r.label}`} r={r} index={i} />
        ))}
      </div>
      {!!longRows.length && (
        <details className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-slate-300 hover:text-white">
            <span aria-hidden>🎲</span> Longshots ({longRows.length}) — still +EV, tiny stakes only
            <span className="ml-auto text-[11px] font-normal text-slate-400">under {(MIN_SAFE_PROB * 100).toFixed(0)}% true chance</span>
          </summary>
          <div className="grid gap-3 border-t border-white/5 p-3">
            {longRows.map((r, i) => (
              <DealCard key={`${r.m.id}-${r.label}`} r={r} index={i} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function DealCard({ r, index }) {
  const { stake } = useSlip();
  const risk = riskTag(r.market);
  const tier = r.ev >= 0.05 ? 'prime' : r.ev >= 0.02 ? 'hot' : 'deal';
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.3 }}
      className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-panel p-4 ${tier === 'prime' ? 'halftone border-gold shadow-[4px_4px_0_#ffb800]' : tier === 'hot' ? 'border-lime-400/50 shadow-[4px_4px_0_#a3e635]' : 'border-white/10 hover:border-white/20'}`}>
            <TeamCrest name={r.m.home} size={28} src={r.m.crestHome} />
              <div className="min-w-[220px] flex-1">
                <Link to={`/match/${r.m.id}`} className="font-semibold text-white hover:underline">
                  {r.label} <Odds v={r.market} /> <span className="text-xs font-normal text-slate-400">@ {r.book}</span>
                  <span className={`ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold ${risk.cls}`} title={`Price ${r.market} — ${risk.label.toLowerCase()} territory`}>{risk.label}</span>
                </Link>
                <div className="text-xs text-slate-400">{r.m.home} vs {r.m.away} • true price <Odds v={r.fair} /> • {r.m.startsIn || (r.m.live ? 'live' : '')}</div>
                <div className="tabular mt-1 flex flex-wrap items-center gap-x-2 footnote">
                  <span>Win chance <b className="text-white">{fmtPct(r.fairProb, 0)}</b></span>
                  <span>GH₵{stake} pays <b className="text-slate-200">GH₵{(stake * r.market).toFixed(2)}</b></span>
                </div>
                <details>
                  <summary className="inline-flex min-h-[36px] cursor-pointer items-center text-[11px] font-bold text-slate-400 hover:text-white">Why value?</summary>
                  <div className="mt-1 space-y-1">
                    <Verdict row={r} />
                    <div><StakeHint fairProb={r.fairProb} market={r.market} ev={r.ev} /></div>
                  </div>
                </details>
              </div>
            {r.m.live && <LiveBadge minute={r.m.minute} score={r.m.score} />}
            <EdgeMeter ev={r.ev} />
            <SlipBtn m={r.m} label={r.label} book={r.book} market={r.market} />
            <PlacedBtn
              match={`${r.m.home} vs ${r.m.away}`}
              pick={r.label}
              price={r.market}
              book={r.book}
              leagueId={r.m.leagueId}
              market="1X2"
              fair={r.fair}
              ev={r.ev}
              fairProb={r.fairProb}
              source="Hot deals"
            />
            <Link to={`/match/${r.m.id}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-white/10 px-3 text-[11px] font-bold text-white hover:bg-white/15">More →</Link>
    </motion.div>
  );
}
