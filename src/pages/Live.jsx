import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TeamCrest from '../components/TeamCrest';
import LiveBadge from '../components/LiveBadge';
import SampleBadge from '../components/SampleBadge';
import LeagueBadge from '../components/LeagueBadge';
import ValueBadge from '../components/ValueBadge';
import LiveCenter from '../components/LiveCenter';
import { FavStar } from '../components/Favorites';
import { useSnapshot, refreshAllSnapshots } from '../hooks/useSnapshot';
import { MATCHES } from '../lib/mock';
import { devig3Way, devig2Way, evPercent, bestPrice } from '../lib/math';
import { Odds } from '../lib/oddsFormat';
import { WinChanceInline } from '../components/WinChance';
import { shortKickoff } from '../lib/dates';

function bestEv(m) {
  const books = Object.values(m.prices || {});
  if (!books.length) return { ev: 0, price: 0, label: '' };
  const probs = m.fair?.d ? devig3Way(m.fair.h, m.fair.d, m.fair.a) : [...devig2Way(m.fair?.h || 2, m.fair?.a || 2), 0];
  let out = { ev: -1, price: 0, label: '' };
  [['h', m.home, probs[0]], ['d', 'Draw', probs[1]], ['a', m.away, probs[2]]].forEach(([k, label, p]) => {
    if (!m.fair?.[k]) return;
    const price = bestPrice(books.map((b) => b[k]));
    const ev = evPercent(p, price);
    if (ev > out.ev) out = { ev, price, label };
  });
  return out;
}

export default function Live() {
  const snap = useSnapshot();
  const matches = snap ? (snap.matches || []) : MATCHES;
  const leagues = snap?.leagues?.length ? snap.leagues : [];
  const leagueName = (id) => leagues.find((l) => l.id === id)?.name || id;
  const [league, setLeague] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const updatedDate = snap?.updatedAt ? new Date(snap.updatedAt) : null;
  const updatedLabel = updatedDate && !Number.isNaN(updatedDate.getTime()) ? updatedDate.toLocaleTimeString() : null;
  const feedLabel = snap?.metadata?.mode === 'live' ? 'LIVE' : snap?.metadata?.mode === 'hybrid' ? 'Real fixtures' : 'Demo sample';

  const live = useMemo(() => matches.filter((m) => m.live), [matches]);
  const upcoming = useMemo(() => {
    const base = matches.filter((m) => !m.live);
    const pool = league === 'all' ? base : base.filter((m) => m.leagueId === league);
    return [...pool].sort((a, b) => String(a.startsIn || '').localeCompare(String(b.startsIn || '')));
  }, [matches, league]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await refreshAllSnapshots(); } catch { /* keep old data */ }
    setRefreshing(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div className="hero-grid halftone relative overflow-hidden rounded-2xl border-2 border-white/15 bg-void px-5 py-4 shadow-[4px_4px_0_#e63329]">
        <div className="relative flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-normal text-white">Live now</h1>
          <span className="burst inline-grid h-11 w-11 shrink-0 place-items-center bg-supa text-sm font-black text-white" title={`${live.length} matches in play`}>
            {live.length}
          </span>
          <span className="text-[11px] font-bold tracking-widest text-red-300">IN PLAY</span>
          <span className="ml-auto flex items-center gap-2 footnote">
            <span>auto-refresh 60s • {feedLabel}{updatedLabel ? ` • ${updatedLabel}` : ''}</span>
            <button onClick={onRefresh} disabled={refreshing}
              className="comic-btn min-h-[44px] rounded-xl bg-gold px-3 text-[11px] font-extrabold text-ink disabled:opacity-50">
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </span>
        </div>
      </div>

      {!live.length && (
        <div className="sticker p-6 text-sm text-slate-400">
          No live matches right now. Upcoming fixtures are below — check back during match hours.
        </div>
      )}

      {!!live.length && <LiveCenter matches={live} />}

      <div className="grid gap-3 md:grid-cols-2">
        {live.map((m, i) => {
          const ev = bestEv(m);
          const meta = [m.leagueId ? leagueName(m.leagueId) : '', m.news].filter(Boolean).join(' • ');
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }}
              className="halftone rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-500/[0.07] to-transparent p-4 shadow-[4px_4px_0_#e63329]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LeagueBadge id={m.leagueId} name={leagueName(m.leagueId)} size="sm" />
                  <SampleBadge match={m} />
                </span>
                <LiveBadge minute={m.minute} score={m.score} />
              </div>
              <Link to={`/match/${m.id}`} className="mt-3 flex min-w-0 items-center gap-3 hover:underline">
                <TeamCrest name={m.home} size={38} src={m.crestHome} />
                <span className="min-w-0 flex-1 truncate font-bold text-white">{m.home} <span className="text-slate-500">vs</span> {m.away}</span>
                <TeamCrest name={m.away} size={38} src={m.crestAway} />
                <FavStar team={m.home} size={14} /><FavStar team={m.away} size={14} />
              </Link>
              {!!meta && <div className="tabular mt-2 text-xs text-slate-400">{meta}</div>}
              {m.fair && (
                <div className="mt-1.5">
                  <WinChanceInline match={m} />
                </div>
              )}
              {m.fair ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-lg bg-white/10 px-2 py-1 text-sm font-bold text-white"><Odds v={ev.price} /></span>
                  <span className="text-xs text-slate-400">{ev.label}</span>
                  <ValueBadge ev={ev.ev} />
                  <Link to={`/match/${m.id}`} className="comic-btn ml-auto inline-flex min-h-[44px] items-center rounded-xl bg-gold px-3 text-[11px] font-extrabold text-ink">Open →</Link>
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-400">Real fixture — prices appear when the feed syncs.</div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <h2 className="text-lg font-bold text-white">Upcoming ({upcoming.length})</h2>
        {!!leagues.length && (
          <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label="Filter upcoming by league"
            className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>
      {!upcoming.length && (
        <div className="sticker p-6 text-sm text-slate-400">
          Nothing scheduled in this view — try All leagues or check back soon.
        </div>
      )}
      <div className="grid gap-2">
        {upcoming.map((m) => (
          <Link key={m.id} to={`/match/${m.id}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06] sm:gap-3">
            <TeamCrest name={m.home} size={24} src={m.crestHome} />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200"><b className="text-white">{m.home}</b> vs <b className="text-white">{m.away}</b></span>
            <span className="hidden shrink-0 min-[420px]:inline"><SampleBadge match={m} /></span>
            <span className="flex shrink-0 items-center gap-0.5">
              <FavStar team={m.home} size={13} /><FavStar team={m.away} size={13} />
            </span>
            {m.fair && <WinChanceInline match={m} className="ml-auto hidden md:inline" />}
            <span className="tabular ml-auto shrink-0 truncate text-[11px] text-slate-400 md:ml-2 md:text-xs" title={m.startsIn}>{shortKickoff(m) || m.startsIn}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
