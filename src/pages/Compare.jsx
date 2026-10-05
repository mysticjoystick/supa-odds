import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MATCHES, BOOKS } from '../lib/mock';
import BookBadge from '../components/BookBadge';
import LiveBadge from '../components/LiveBadge';
import TeamCrest from '../components/TeamCrest';
import MyBooksPicker from '../components/MyBooksPicker';
import BetNow from '../components/BetNow';
import { PopularStrip } from '../components/MarketButtons';
import { useSnapshot } from '../hooks/useSnapshot';
import { useMyBooks, filterToMyBooks } from '../lib/myBooks';
import { useSlip } from '../lib/slip';
import { Odds } from '../lib/oddsFormat';
import { WinChanceInline } from '../components/WinChance';
import { leg1X2 } from '../lib/markets';
import { slideRow } from '../lib/motion';

function SlipCell({ match, book, outcome }) {
  const { toggle, heldBook } = useSlip();
  const price = match.prices?.[book]?.[outcome];
  if (!price || price <= 1) return <span className="text-slate-400">—</span>;
  const leg = leg1X2({ ...match }, outcome);
  // Keep the full per-book map (never single-book) — pin this cell's price/book on top.
  const mine = leg ? { ...leg, price, book } : null;
  const held = heldBook(match.id, outcome, '1X2');
  const isMine = held === book;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Odds v={price} />
      {held && !isMine ? (
        <span className="text-[10px] text-slate-400" title={`In slip @ ${held} — tap + to switch to ${book}`}>@{held}</span>
      ) : null}
      <button
        onClick={() => mine && toggle(mine)}
        title={isMine ? `In slip @ ${book} — tap to remove` : held ? `In slip @ ${held} — tap to switch to ${book} @ ${price}` : `Add @ ${price} (${book}) to slip`}
        aria-pressed={isMine}
        className={`grid min-h-[44px] min-w-[44px] place-items-center rounded-lg px-2 text-xs font-extrabold ${isMine ? 'bg-lime-400 text-black' : 'bg-white/10 text-lime-300 hover:bg-lime-400/25'}`}
      >
        {isMine ? '✓' : '+'}
      </button>
    </span>
  );
}

function MatchBlock({ m, visibleBooks, fresh, index }) {
  // Progressive disclosure — top 3 pricing books first, rest behind a tap.
  const [showAll, setShowAll] = useState(false);
  const priced = visibleBooks.filter((b) => m.prices?.[b]);
  const shown = showAll ? priced : priced.slice(0, 3);
  const vals = Object.values(m.prices || {});
  const bestH = vals.length ? Math.max(...vals.map((x) => x.h || 0)) : 0;
  const bestD = vals.length ? Math.max(...vals.map((x) => x.d || 0)) : 0;
  const bestA = vals.length ? Math.max(...vals.map((x) => x.a || 0)) : 0;
  return (
    <motion.div {...slideRow(index)} className="overflow-x-auto rounded-2xl border-2 border-white/15 bg-panel shadow-[4px_4px_0_#e63329]">
      <div className="halftone flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 font-semibold text-white">
        <Link to={`/match/${m.id}`} className="flex min-h-[44px] flex-wrap items-center gap-2 hover:underline">
          <TeamCrest name={m.home} size={24} src={m.crestHome} /> {m.home} vs {m.away} <TeamCrest name={m.away} size={24} src={m.crestAway} />
        </Link>
        <span className="ml-1 text-xs font-normal text-slate-400">{m.startsIn}</span>
        {m.live && <LiveBadge minute={m.minute} score={m.score} />}
        {m.fair && <WinChanceInline match={m} className="ml-1 hidden sm:inline" />}
        <Link to={`/match/${m.id}`} className="ml-auto rounded-lg px-2 py-2 text-xs font-bold text-lime-300 hover:underline">More →</Link>
      </div>
      <div className="px-4 pt-2"><PopularStrip match={m} /></div>
      <table className="tabular w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="sticky left-0 bg-panel px-4 py-2">Book</th><th>1 (Home)</th><th>X (Draw)</th><th>2 (Away)</th><th></th>
          </tr>
        </thead>
        <tbody>
          {!Object.keys(m.prices || {}).length && (
            <tr className="border-t border-white/5">
              <td colSpan={5} className="px-4 py-4 text-center text-xs text-slate-400">
                Real fixture, no odds yet — prices appear when the feed syncs. Check back soon.
              </td>
            </tr>
          )}
          {shown.map((b) => {
            const p = m.prices[b];
            return (
              <tr key={b} className={`border-t border-white/5 ${b === 'Pinnacle' ? 'bg-amber-400/[0.04]' : ''}`}>
                <td className="sticky left-0 bg-panel px-4 py-2 font-semibold text-slate-200"><BookBadge name={b} sharp={b === 'Pinnacle'} />{fresh(b)}</td>
                <td className={`py-2 ${p.h && p.h === bestH ? 'text-lime-300 font-bold' : 'text-slate-300'}`}><SlipCell match={m} book={b} outcome="h" /></td>
                <td className={`py-2 ${p.d && bestD > 0 && p.d === bestD ? 'text-lime-300 font-bold' : 'text-slate-300'}`}>{p.d ? <SlipCell match={m} book={b} outcome="d" /> : '—'}</td>
                <td className={`py-2 ${p.a && p.a === bestA ? 'text-lime-300 font-bold' : 'text-slate-300'}`}><SlipCell match={m} book={b} outcome="a" /></td>
                <td className="py-2 pr-3 text-right"><BetNow book={b} label="Bet" /></td>
              </tr>
            );
          })}
          {!priced.length && !!Object.keys(m.prices || {}).length && (
            <tr className="border-t border-white/5">
              <td colSpan={5} className="px-4 py-4 text-center text-xs text-slate-400">
                None of your books price this match yet — toggle All books to see who does.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {priced.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          className="flex min-h-[44px] w-full items-center justify-center gap-1 border-t border-white/5 text-xs font-bold text-slate-300 hover:text-white"
        >
          {showAll ? 'Show fewer books' : `Show all ${priced.length} books`}
        </button>
      )}
    </motion.div>
  );
}

export default function Compare() {
  const snap = useSnapshot();
  const matches = snap?.matches?.length ? snap.matches : MATCHES;
  const leagues = snap?.leagues?.length ? snap.leagues : [];
  const [league, setLeague] = useState('all');
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const { myBooks } = useMyBooks();
  const bookMeta = snap?.metadata?.books || {};
  const visibleBooks = useMemo(
    () => (mineOnly ? filterToMyBooks(BOOKS, myBooks) : BOOKS),
    [mineOnly, myBooks]
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return matches.filter((m) => {
      if (league !== 'all' && m.leagueId !== league) return false;
      if (needle && !`${m.home} ${m.away}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [matches, league, q]);
  const fresh = (b) => {
    const meta = bookMeta[b] || {};
    const s = meta.source;
    if (s === 'live feed') return <span className="ml-1 rounded-full bg-lime-400/15 px-1.5 py-0.5 text-[10px] font-bold text-lime-300" title={`Updated ${meta.updatedAt}`}>LIVE</span>;
    if (s === 'stale feed') return <span className="ml-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300" title={`Feed down — last good prices from ${meta.updatedAt}`}>STALE</span>;
    return null;
  };
  // Loading — skeleton tables before the first snapshot lands.
  if (!snap) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="shimmer h-4 w-96 rounded-lg" />
        <div className="shimmer h-16 rounded-2xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-40 rounded-2xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Compare prices — same match, every book</h1>
      <p className="text-sm text-slate-400">Green = best price. Tap + to add any price to your slip. <span className="text-lime-300">LIVE</span> = fresh — always confirm on the book before paying.</p>
      <MyBooksPicker compact />
      <div className="flex flex-wrap items-center gap-2">
        {!!leagues.length && (
          <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label="Filter by league"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams… e.g. Hearts"
          aria-label="Filter teams"
          className="field rounded-full px-3 py-1.5 text-xs placeholder:text-slate-400" />
        <button onClick={() => setMineOnly(!mineOnly)} aria-pressed={mineOnly}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${mineOnly ? 'bg-lime-400 text-black' : 'bg-white/10 text-slate-300'}`}>
          {mineOnly ? `✓ My books (${visibleBooks.length})` : 'All books'}
        </button>
        <span className="footnote">{filtered.length} matches</span>
      </div>
      {!filtered.length && (
        <div className="sticker p-6 text-center text-sm text-slate-400">
          No matches match these filters — try clearing the search or picking All leagues.
        </div>
      )}
      {filtered.map((m, i) => (
        <MatchBlock key={m.id} m={m} visibleBooks={visibleBooks} fresh={fresh} index={i} />
      ))}
    </div>
  );
}
