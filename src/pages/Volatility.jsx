import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TeamCrest from '../components/TeamCrest';
import LeagueBadge from '../components/LeagueBadge';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES, LEAGUES } from '../lib/mock';
import { ProGate, ProTeaser } from '../lib/pro';
import MarketIntel from '../components/MarketIntel';
import { slideRow } from '../lib/motion';

export default function Volatility() {
  const snap = useSnapshot();
  const matches = snap?.matches?.length ? snap.matches : MATCHES;
  const leagues = snap?.leagues?.length ? snap.leagues : LEAGUES;
  const [league, setLeague] = useState('all');
  const rows = useMemo(() => {
    const pool = league === 'all' ? matches : matches.filter((m) => m.leagueId === league);
    return pool
      .map((m) => {
        // Home-price trail (open → now). Per-book direction can differ — see match page.
        const o = m.movement?.length > 1 ? ((m.movement[m.movement.length - 1] - m.movement[0]) / m.movement[0]) * 100 : 0;
        return { m, move: o, abs: Math.abs(o) };
      })
      .sort((a, b) => b.abs - a.abs);
  }, [matches, league]);
  const max = Math.max(1, ...rows.map((r) => r.abs));

  return (
    <ProGate title="Market volatility" blurb="Every board ranked by line movement since open — see where the money flowed, live.">
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-normal text-white">Market intelligence</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Which boards moved, where books disagree, how often gaps appear. Analytics, not advice — <b className="text-slate-300">big moves show where money flowed, not who wins.</b>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProTeaser />
            <Link to="/compare" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10">Compare prices →</Link>
            <Link to="/builder" className="inline-flex min-h-[44px] items-center rounded-xl bg-lime-400 px-3 text-xs font-extrabold text-black hover:bg-lime-300">✦ Build a ticket →</Link>
          </div>
        </div>
        {!!leagues.length && (
          <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label="Filter by league"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>
      <MarketIntel matches={matches} leagues={leagues} />
      <div className="sticker p-4">
        {!rows.length && (
          <div className="p-6 text-center text-sm text-slate-400">No boards in this view yet — try All leagues or check back when the feed syncs.</div>
        )}
        {rows.map(({ m, move, abs }, i) => (
          <motion.div key={m.id} {...slideRow(i)}>
          <Link to={`/match/${m.id}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06] sm:gap-3">
            <TeamCrest name={m.home} size={26} src={m.crestHome} />
            <div className="w-28 min-w-0 min-[420px]:w-40 sm:w-52">
              <div className="truncate text-sm font-semibold text-white">{m.home} vs {m.away}</div>
              <div className="footnote"><LeagueBadge id={m.leagueId} name={leagues.find((l) => l.id === m.leagueId)?.name || m.leagueId} size="sm" /></div>
            </div>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${m.home} moved ${abs.toFixed(1)} percent`}>
              <div className={`h-full rounded-full ${move <= 0 ? 'bg-gradient-to-r from-lime-500 to-lime-300' : 'bg-gradient-to-r from-red-500 to-amber-400'}`} style={{ width: `${Math.sqrt(abs / max) * 100}%` }} />
            </div>
            <span className={`tabular w-16 shrink-0 text-right text-xs font-bold sm:w-20 sm:text-sm ${move <= 0 ? 'text-lime-300' : 'text-red-300'}`} title={move <= 0 ? 'Home price shortened' : 'Home price drifted'}>
              {move <= 0 ? '▼' : '▲'} {abs.toFixed(1)}%
            </span>
          </Link>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-slate-400">▼ = home price shortened (money for home) • ▲ = drifted. Color shows direction only, not who will win. Full per-book trails live on each match page and in History.</p>
    </div>
    </ProGate>
  );
}
