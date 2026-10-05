import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TeamCrest from './TeamCrest';
import { Odds } from '../lib/oddsFormat';
import { allValueRows, MIN_EDGE, SAFE_PROB } from '../lib/value';
import { useSlip } from '../lib/slip';
import { leg1X2 } from '../lib/markets';
import { EdgeMeter, Verdict } from './EdgeMeter';
import StakeHint from './StakeHint';
import PlacedBtn from './PlacedBtn';
import { rise } from '../lib/motion';

// Today's Top 3 value bets — the instant-answer feed for casual browsers.
// Strictly +EV, best first, honest labels. Hides entirely when nothing qualifies.
function TopCard({ r, rank }) {
  const { toggle, has } = useSlip();
  const leg = leg1X2(r.m, r.key);
  const pinned = leg ? { ...leg, price: r.market, book: r.book } : null;
  const active = has(r.m.id, r.key, '1X2');
  return (
    <motion.div
      {...rise(rank - 1, 0.07, 0.25)}
      className="halftone rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-400/[0.07] to-transparent p-4 shadow-[4px_4px_0_#e63329]"
    >
      <div className="flex flex-wrap items-center gap-2">
        {rank === 1 ? (
          <span className="burst inline-grid h-9 w-9 shrink-0 place-items-center bg-gold text-sm font-black text-ink" title="Top value #1">
            1
          </span>
        ) : (
          <span className="tabular grid h-7 w-7 place-items-center rounded-full bg-amber-400 text-sm font-black text-black" title={`Top value #${rank}`}>
            {rank}
          </span>
        )}
        <EdgeMeter ev={r.ev} />
        <button
          onClick={() => pinned && toggle(pinned)}
          aria-pressed={active}
          title={active ? 'In slip — tap to remove' : `Add ${r.label} @ ${r.market} (${r.book}) to slip`}
          className={`ml-auto inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-extrabold ${active ? 'bg-lime-400 text-black' : 'bg-lime-400/15 text-lime-300 hover:bg-lime-400/25'}`}
        >
          {active ? '✓ In slip' : '+ Slip'}
        </button>
      </div>
      <Link to={`/match/${r.m.id}`} className="mt-2 flex items-center gap-2 font-bold text-white hover:underline">
        <TeamCrest name={r.m.home} size={22} src={r.m.crestHome} />
        <span className="truncate">{r.m.home} <span className="font-normal text-slate-500">vs</span> {r.m.away}</span>
        <TeamCrest name={r.m.away} size={22} src={r.m.crestAway} />
      </Link>
      <div className="tabular mt-1 text-sm text-slate-200">
        {r.label} <b className="text-white">@ <Odds v={r.market} /></b> <span className="text-xs text-slate-400">{r.book}</span>
      </div>
      <Verdict row={r} className="mt-1.5" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StakeHint fairProb={r.fairProb} market={r.market} ev={r.ev} />
        <span className="ml-auto">
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
            source="top-3"
          />
        </span>
      </div>
    </motion.div>
  );
}

export default function TopValue({ matches }) {
  // Safest +EV only — same bar as the Hot deals board.
  const rows = allValueRows(matches, MIN_EDGE).filter((r) => (r.fairProb ?? 0) >= SAFE_PROB).slice(0, 3);
  if (!rows.length) return null;
  return (
    <section aria-label="Today's top value bets" className="halftone sticker p-4">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <h2 className="font-display text-base font-normal tracking-wide text-white">Today&apos;s top value</h2>
        <span className="footnote">Best-priced lines right now — value, not tips. No outcome is guaranteed.</span>
        <Link to="/builder" className="comic-btn ml-auto inline-flex min-h-[44px] items-center rounded-xl bg-gold px-3 py-1.5 text-[11px] font-extrabold text-ink">✦ Auto-build ticket →</Link>
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <TopCard key={`${r.m.id}-${r.key}`} r={r} rank={i + 1} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
