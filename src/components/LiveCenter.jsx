import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Volume2 } from 'lucide-react';
import TeamCrest from './TeamCrest';
import LiveBadge from './LiveBadge';
import LeagueBadge from './LeagueBadge';
import ValueBadge from './ValueBadge';
import { FavStar } from './Favorites';
import { LEAGUES } from '../lib/mock';
import { devig3Way, devig2Way, evPercent, bestPrice } from '../lib/math';
import { Odds } from '../lib/oddsFormat';
import { buildFeed, momentum } from '../lib/commentary';

const EV_ICON = { goal: '⚽', chance: '🎯', card: '🟨', info: 'ℹ️', note: '💬' };

function ProbBars({ match }) {
  const probs = match.fair?.d
    ? devig3Way(match.fair.h, match.fair.d, match.fair.a)
    : [...devig2Way(match.fair?.h || 2, match.fair?.a || 2)];
  const rows = [
    [match.home, probs[0], '#a3e635'],
    ...(match.fair?.d ? [['Draw', probs[1], '#94a3b8']] : []),
    [match.away, probs[probs.length - 1], '#38bdf8'],
  ];
  return (
    <div className="space-y-1.5">
      {rows.map(([label, p, c]) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-24 truncate text-slate-400">{label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p * 100}%`, background: c }} />
          </div>
          <span className="tabular w-11 text-right font-bold text-white">{(p * 100).toFixed(0)}%</span>
        </div>
      ))}
      <div className="text-[10px] text-slate-400">Live-implied from the sharp fair price — descriptive, not predictive.</div>
    </div>
  );
}

export default function LiveCenter({ matches }) {
  const [selId, setSelId] = useState(matches[0]?.id);
  const match = matches.find((m) => m.id === selId) || matches[0];
  const feed = useMemo(() => (match ? buildFeed(match) : []), [match?.id]);
  const [shown, setShown] = useState(3);
  const boxRef = useRef(null);

  useEffect(() => setShown(3), [match?.id]);
  useEffect(() => {
    if (shown >= feed.length) return;
    const id = setInterval(() => setShown((s) => Math.min(feed.length, s + 1)), 9000);
    return () => clearInterval(id);
  }, [shown, feed.length]);
  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [shown]);

  if (!match) return null;
  const mom = momentum(match);
  const books = Object.values(match.prices || {});
  const probs = match.fair?.d
    ? devig3Way(match.fair.h, match.fair.d, match.fair.a)
    : [...devig2Way(match.fair?.h || 2, match.fair?.a || 2), 0];
  const bestHome = books.length ? bestPrice(books.map((b) => b.h)) : 0;
  const homeEv = evPercent(probs[0], bestHome);

  return (
    <div className="halftone overflow-hidden rounded-3xl border-2 border-red-500/40 bg-gradient-to-b from-red-500/[0.08] via-void to-void shadow-[4px_4px_0_#e63329]">
      {/* channel bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="font-display flex items-center gap-1.5 text-xs font-normal tracking-wider text-red-300">
          <Radio size={14} className="animate-pulse" /> SUPA LENS
        </span>
        <div className="flex flex-wrap gap-1.5">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelId(m.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${m.id === match.id ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
            >
              {m.home.slice(0, 3).toUpperCase()} v {m.away.slice(0, 3).toUpperCase()}
              {m.score && <span className="tabular">{m.score.home}-{m.score.away}</span>}
            </button>
          ))}
        </div>
        <span className="ml-auto hidden footnote md:block">auto-commentary • new lines drop in live</span>
      </div>

      {/* scoreboard */}
      <div className="px-4 pt-4 md:px-6">
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <LeagueBadge id={match.leagueId} name={LEAGUES.find((l) => l.id === match.leagueId)?.name} size="sm" />
          <LiveBadge minute={match.minute} />
        </div>
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          <div>
            <TeamCrest name={match.home} size={64} src={match.crestHome} />
            <div className="mt-1.5 flex items-center justify-center gap-1 font-bold text-white">{match.home} <FavStar team={match.home} size={14} /></div>
          </div>
          <div>
            <div className="tabular text-5xl font-black tracking-tight text-white md:text-6xl">
              {match.score ? `${match.score.home} – ${match.score.away}` : 'vs'}
            </div>
            <div className="tabular mt-1 text-sm font-bold text-red-300">{match.minute}</div>
          </div>
          <div>
            <TeamCrest name={match.away} size={64} src={match.crestAway} />
            <div className="mt-1.5 flex items-center justify-center gap-1 font-bold text-white">{match.away} <FavStar team={match.away} size={14} /></div>
          </div>
        </div>

        {/* momentum */}
        <div className="mx-auto mt-4 max-w-xl">
          <div className="mb-1 flex justify-between text-[11px] font-bold">
            <span className="text-lime-300">◀ {match.home} {mom}%</span>
            <span className="text-slate-500">MOMENTUM</span>
            <span className="text-sky-300">{100 - mom}% {match.away} ▶</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lime-500 to-lime-300" style={{ width: `${mom}%` }} />
            <div className="momentum-marker absolute inset-y-0 w-8 rounded-full bg-white/40 blur-[3px]" style={{ left: `calc(${mom}% - 16px)` }} />
          </div>
        </div>

        <div className="mx-auto mt-4 grid max-w-3xl gap-3 md:grid-cols-[1fr_220px]">
          {/* commentary */}
          <div className="sticker p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400">
              <Volume2 size={12} /> LIVE BLOG
            </div>
            <div ref={boxRef} className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {feed.slice(0, shown).map((l, i) => (
                <div key={i} className={`flex gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-snug ${l.type === 'goal' ? 'bg-lime-400/10 text-white' : 'bg-white/[0.03] text-slate-300'}`}>
                  <span className="tabular shrink-0 font-bold text-slate-500">{l.min}</span>
                  <span>{EV_ICON[l.type] || '•'}</span>
                  <span>{l.text}</span>
                </div>
              ))}
              {shown < feed.length && <div className="flex gap-1 px-2 py-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
            </div>
          </div>
          {/* side stack */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-shadow hover:border-white/20 hover:shadow-[3px_3px_0_#e63329]">
              <div className="panel-title mb-2">LIVE PROBS</div>
              {match.fair ? <ProbBars match={match} /> : <div className="text-xs text-slate-400">Win chances appear once prices sync.</div>}
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm transition-shadow hover:border-white/20 hover:shadow-[3px_3px_0_#e63329]">
              <span className="text-slate-400">Best {match.home}</span>
              {match.fair ? (
                <span className="flex items-center gap-2 font-bold text-white"><Odds v={bestHome} /><ValueBadge ev={homeEv} /></span>
              ) : (
                <span className="text-xs text-slate-400">odds soon</span>
              )}
            </div>
            <Link to={`/match/${match.id}`} className="comic-btn block rounded-xl bg-gold px-3 py-2 text-center text-xs font-extrabold text-ink">
              Full match hub →
            </Link>
          </div>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
