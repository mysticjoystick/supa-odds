import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import OddsTable from '../components/OddsTable';
import TopValue from '../components/TopValue';
import MyBooksPicker from '../components/MyBooksPicker';
import BankrollCalc from '../components/BankrollCalc';
import TeamCrest from '../components/TeamCrest';
import { useFavorites } from '../components/Favorites';
import { useSnapshot } from '../hooks/useSnapshot';
import { LEAGUES, MATCHES, BOOKS } from '../lib/mock';
import { bestPerMatch, MIN_EDGE } from '../lib/value';
import { dateKeysOf, dateKeyOf, dayLabel, shortDate, todayKey, sortByKickoff } from '../lib/dates';

export default function Dashboard() {
  const snap = useSnapshot();
  const matches = snap ? (snap.matches || []) : MATCHES;
  const leagues = snap ? (snap.leagues?.length ? snap.leagues : LEAGUES) : LEAGUES;
  const books = snap ? (snap.books?.length ? snap.books : BOOKS) : BOOKS;

  const [dateKey, setDateKey] = useState(null);
  const [league, setLeague] = useState('all');
  const [edgeOnly, setEdgeOnly] = useState(false);
  const [sort, setSort] = useState('kickoff'); // 'kickoff' | 'value'
  const [myAll, setMyAll] = useState(false);
  const { favs } = useFavorites();

  const dates = useMemo(() => dateKeysOf(matches), [matches]);
  const activeDate =
    (dateKey && dates.some((d) => d.key === dateKey) && dateKey) ||
    dates.find((d) => d.key === todayKey())?.key ||
    dates[0]?.key;

  const dayMatches = useMemo(
    () => matches.filter((m) => dateKeyOf(m) === activeDate),
    [matches, activeDate]
  );

  const leagueOpts = useMemo(() => {
    const counts = new Map();
    for (const m of dayMatches) counts.set(m.leagueId, (counts.get(m.leagueId) || 0) + 1);
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, meta: leagues.find((l) => l.id === id) }))
      .sort((a, b) => ((a.meta?.tier || 9) - (b.meta?.tier || 9)) || b.count - a.count);
  }, [dayMatches, leagues]);

  const filtered = useMemo(() => {
    const pool = league === 'all' ? [...dayMatches] : dayMatches.filter((m) => m.leagueId === league);
    if (sort === 'value') {
      pool.sort((a, b) => (bestPerMatch(b)?.ev ?? -Infinity) - (bestPerMatch(a)?.ev ?? -Infinity));
    } else {
      pool.sort(sortByKickoff);
    }
    return edgeOnly ? pool.filter((m) => (bestPerMatch(m)?.ev ?? -1) >= MIN_EDGE) : pool;
  }, [dayMatches, league, sort, edgeOnly]);

  const edgeCount = useMemo(
    () => dayMatches.filter((m) => (bestPerMatch(m)?.ev ?? -1) >= MIN_EDGE).length,
    [dayMatches]
  );
  const liveCount = useMemo(() => matches.filter((m) => m.live).length, [matches]);
  const myMatches = useMemo(
    () => dayMatches.filter((m) => favs.has(m.home) || favs.has(m.away)),
    [dayMatches, favs]
  );

  const pickDate = (k) => {
    setDateKey(k);
    setLeague('all');
  };

  // Loading — skeleton before the first snapshot lands.
  if (!snap) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="shimmer h-24 rounded-2xl" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer h-14 w-24 shrink-0 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-16 rounded-2xl" />
            ))}
          </div>
          <div className="shimmer h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
      {/* slim hero */}
      <div className="hero-grid halftone relative overflow-hidden rounded-2xl border-2 border-white/15 bg-void px-5 py-4 shadow-[4px_4px_0_#e63329]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-lime-400/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-xl font-normal text-white md:text-2xl">
            Find value. <span className="text-supa">Beat the close.</span>
          </h1>
          {snap && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${snap.metadata?.mode === 'live' ? 'bg-lime-400/15 text-lime-300' : snap.metadata?.mode === 'hybrid' ? 'bg-sky-400/15 text-sky-300' : 'bg-white/10 text-slate-400'}`}>
              {snap.metadata?.mode === 'live' ? '● LIVE DATA' : snap.metadata?.mode === 'hybrid' ? '● REAL FIXTURES' : '○ DEMO SAMPLE'}
            </span>
          )}
          <span className="tabular text-xs text-slate-400">
            {leagues.length} leagues • {books.length} books • {matches.length} fixtures
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {liveCount > 0 && (
              <Link to="/live" className="rounded-full border border-red-500/40 bg-red-500/20 px-3.5 py-2 text-xs font-bold text-red-200 hover:bg-red-500/30">
                ● Live ({liveCount})
              </Link>
            )}
            <Link to="/builder" className="rounded-full bg-lime-400 px-3.5 py-2 text-xs font-extrabold text-black hover:bg-lime-300">
              ✦ Auto-build ticket
            </Link>
            <Link to="/value" className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">
              Today&apos;s value
            </Link>
            <Link to="/arb" className="hidden text-xs text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-slate-200 sm:inline">
              Arb
            </Link>
          </span>
        </div>
      </div>

      <TopValue matches={dayMatches} />

      {/* date rail */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Matchdays">        {dates.map((d) => {
          const active = d.key === activeDate;
          return (
            <button
              key={d.key}
              role="tab"
              aria-selected={active}
              onClick={() => pickDate(d.key)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-center transition-all ${
                active
                  ? 'bg-lime-400 font-extrabold text-black shadow-[0_0_18px_rgba(163,230,53,0.35)]'
                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">{shortDate(d.key)}</span>
              <span className="tabular block text-sm leading-tight">{dayLabel(d.key)} <span className="opacity-70">· {d.count}</span></span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          {/* one combined control row: league + sort + value filter */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              aria-label="Filter by league"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white [&>option]:bg-panel"
            >
              <option value="all">All leagues · {dayMatches.length}</option>
              {leagueOpts.map((l) => (
                <option key={l.id} value={l.id}>{l.meta?.name || l.id} · {l.count}</option>
              ))}
            </select>
            <div className="flex rounded-full bg-white/[0.06] p-0.5 text-xs" role="group" aria-label="Sort matches">
              {([['kickoff', 'Kickoff'], ['value', 'Top value']]).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setSort(v)}
                  aria-pressed={sort === v}
                  className={`min-h-[40px] rounded-full px-3 transition-all ${sort === v ? 'bg-lime-400 font-bold text-black' : 'text-slate-400 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setEdgeOnly(!edgeOnly)}
              aria-pressed={edgeOnly}
              className={`min-h-[44px] whitespace-nowrap rounded-full px-3 text-xs font-bold transition-all ${edgeOnly ? 'bg-lime-400 text-black' : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'}`}
              title="Hide below-fair rows"
            >
              {edgeOnly ? `✓ +EV only (${edgeCount})` : `+EV only (${edgeCount})`}
            </button>
          </div>
          <p className="footnote">Win % is the market's true chance — not a prediction. Tap a 1 X 2 price to build your slip.</p>

          {/* my teams */}
          {myMatches.length > 0 ? (
            <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-400/[0.04] px-4 py-3 shadow-[4px_4px_0_#e63329]">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold tracking-wide text-amber-300">
                <span className="burst inline-grid h-5 w-5 shrink-0 place-items-center bg-gold text-[10px] text-ink">★</span>
                <span className="font-display tracking-widest">MY TEAMS — {dayLabel(activeDate).toUpperCase()}</span>
                <span className="tabular ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-200">{myMatches.length}</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {(myAll ? myMatches : myMatches.slice(0, 4)).map((m) => (
                  <Link key={m.id} to={`/match/${m.id}`} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 transition-shadow hover:bg-white/[0.06] hover:shadow-[3px_3px_0_#e63329]">
                    <TeamCrest name={m.home} size={22} src={m.crestHome} />
                    <span className="flex-1 truncate text-sm text-slate-200"><b className="text-white">{m.home}</b> vs <b className="text-white">{m.away}</b></span>
                    {m.live && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400" />}
                  </Link>
                ))}
              </div>
              {myMatches.length > 4 && (
                <button onClick={() => setMyAll(!myAll)} className="mt-1.5 rounded-lg px-2 py-2 text-xs font-bold text-amber-200/90 hover:text-amber-100">
                  {myAll ? 'Show less' : `Show all ${myMatches.length} matches`}
                </button>
              )}
            </div>
          ) : favs.size === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
              ★ Tip: tap the star next to any team to pin its matches here for quick access.
            </div>
          ) : null}

          <OddsTable matches={filtered} leagues={leagues} />
          {!filtered.length && !!dayMatches.length && (
            <div className="sticker p-6 text-center text-sm text-slate-400">
              No matches pass these filters.
              <div className="mt-3">
                <button
                  onClick={() => { setLeague('all'); setEdgeOnly(false); }}
                  className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <MyBooksPicker compact />
          <BankrollCalc />
        </div>
      </div>
    </div>
  );
}
