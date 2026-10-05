import { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { getWinProbs } from './WinChance';
import { ratingColor, teamOverall } from '../lib/ratings';
import { teamInk } from '../lib/teamColor';
import Stars, { starsOf } from './Stars';
import Headshot from './Headshot';
import PlayerCard from './PlayerCard';
import DuelStats from './DuelStats';
import TeamPower from './TeamPower';
import SquadBattle from './SquadBattle';
import FormBattle from './FormBattle';
import ScoutsTake from './ScoutsTake';

// Ratings tab composer — Supa-Strikas scouting-screen order:
// showdown → team power → squad battle → squad ratings → form battle → take.
// Post-match ratings win; otherwise season averages keep it alive. Labeled.
function toList(arr, team, kind) {
  return (arr || []).map((p) => ({ ...p, team, kind }));
}

function Pill({ p, rank, onOpen }) {
  const c = ratingColor(p.rating);
  const bits = [
    p.pos || null,
    p.goals ? `${p.goals}⚽` : null,
    p.assists ? `${p.assists}🅰` : null,
    p.minutes != null ? `${p.minutes}’` : null,
  ].filter(Boolean);
  return (
    <button
      onClick={onOpen}
      aria-label={`Open ${p.name} player card`}
      title={`${p.name} — tap for player card`}
      className="flex w-full items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/20"
    >
      <span className="tabular grid h-6 min-w-6 shrink-0 place-items-center rounded-md bg-white/[0.07] px-1 text-[11px] font-black text-slate-300">#{rank}</span>
      <span
        className="tabular grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-black"
        style={{ backgroundColor: `${c}1f`, color: c, border: `1px solid ${c}55`, boxShadow: `0 0 14px ${c}22` }}
      >
        {p.rating != null ? Number(p.rating).toFixed(1) : '–'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white">{p.name}</span>
        <Stars value={starsOf(p.rating)} size={12} />
        {!!bits.length && (
          <span className="tabular mt-0.5 block truncate footnote">{bits.join(' • ')}</span>
        )}
      </span>
    </button>
  );
}

function isHomeTeam(p, match) {
  const homeNames = [match.lineups?.home?.name, match.home].filter(Boolean).map((n) => n.toLowerCase());
  const s = String(p.team || '').toLowerCase();
  if (!s) return false;
  return homeNames.some((nn) => s === nn || s.includes(nn) || nn.includes(s));
}

export default function RatingsPanel({ match }) {
  const [card, setCard] = useState(null);
  const probs = getWinProbs(match);
  // Post-match ratings win; otherwise season averages keep the tab alive.
  let home = [];
  let away = [];
  let kind = null;
  if (match?.topPlayers?.length) {
    kind = 'match';
    const hs = [];
    const as = [];
    for (const p of match.topPlayers) {
      (isHomeTeam(p, match) ? hs : as).push({ ...p, team: p.team || match.away, kind });
    }
    home = hs;
    away = as;
  } else if (match?.squadRatings && (match.squadRatings.home?.length || match.squadRatings.away?.length)) {
    kind = 'season';
    home = toList(match.squadRatings.home, match.home, kind);
    away = toList(match.squadRatings.away, match.away, kind);
  }
  if (!kind) {
    const soccer = ['epl', 'laliga', 'seriea', 'bundes', 'ligue1', 'ucl', 'championship', 'eredivisie', 'brazil'].includes(match?.leagueId);
    return (
      <div className="sticker p-6 text-center text-sm text-slate-500">
        <div className="text-lg font-bold text-slate-300">No ratings yet</div>
        <p className="mt-1 text-xs">
          {soccer
            ? 'Season ratings are syncing for this fixture — check back soon. Match ratings land at full time.'
            : 'Player ratings cover soccer leagues for now — this competition is next on the list.'}
        </p>
      </div>
    );
  }
  const duel = home[0] && away[0] ? [home[0], away[0]] : [...home, ...away].slice(0, 2);
  const inkH = teamInk(match.home);
  const inkA = teamInk(match.away);
  const ovH = teamOverall(match.form?.home, probs?.h);
  const ovA = teamOverall(match.form?.away, probs?.a);
  const avgOf = (list) => {
    const rs = list.map((p) => p.rating).filter((r) => r != null);
    return rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null;
  };
  const avgH = avgOf(home);
  const avgA = avgOf(away);
  const openCard = (p, rank, side) => {
    const list = side === 'h' ? home : away;
    setCard({
      p,
      team: side === 'h' ? match.home : match.away,
      kind,
      rank,
      total: list.length,
      avg: side === 'h' ? avgH : avgA,
    });
  };
  const ratingsGrid = [];
  const duelCard = (p, ink, side) => {
    const rc = ratingColor(p.rating);
    return (
      <button
        onClick={() => openCard(p, 1, side)}
        aria-label={`Open ${p.name} player card`}
        title={`${p.name} — tap for player card`}
        className="rounded-2xl transition-transform hover:scale-[1.03]"
      >
        <Headshot id={p.id} name={p.name} size={52} className="mx-auto" />
        <div
          className="tabular mx-auto mt-1.5 grid h-16 w-16 place-items-center rounded-2xl text-xl font-black"
          style={{ backgroundColor: `${ink}1e`, color: rc, border: `2px solid ${ink}66`, boxShadow: `0 0 24px ${ink}44` }}
        >
          {p.rating != null ? Number(p.rating).toFixed(1) : '–'}
        </div>
        <Stars value={starsOf(p.rating)} size={13} className="mt-1.5 justify-center" />
        <div className="mt-1 truncate text-sm font-bold text-white">{p.name}</div>
        <div className="truncate footnote">{p.team}</div>
      </button>
    );
  };
  const sections = [];
  if (duel.length === 2) {
    sections.push(
      <div key="duel" className="overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.08] to-transparent p-4">
        <div className="mb-1 text-center text-[11px] font-bold tracking-widest text-amber-300">★ STAR-MEN SHOWDOWN</div>
        <div className="mb-3 text-center footnote">
          {kind === 'match' ? 'Best on the day' : 'Best this season'}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
          {duelCard(duel[0], inkH, 'h')}
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-sm font-black text-slate-300 shadow-[0_0_18px_rgba(163,230,53,0.25)] ring-1 ring-lime-400/40">
            VS
          </div>
          {duelCard(duel[1], inkA, 'a')}
        </div>
        <DuelStats h={duel[0]} a={duel[1]} homeName={match.home} awayName={match.away} />
      </div>
    );
  }
  sections.push(
    <TeamPower key="power" match={match} overall={{ home: ovH, away: ovA }} fairH={probs?.h} fairA={probs?.a} />
  );
  sections.push(
    <SquadBattle key="battle" home={home} away={away} homeName={match.home} awayName={match.away} />
  );
  for (const [key, title, ink, list] of [
    ['h', match.home, inkH, home],
    ['a', match.away, inkA, away],
  ]) {
    ratingsGrid.push(
      <div key={key} className="sticker p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ink }} />
          <span className="text-xs font-bold tracking-wide text-slate-300">{title.toUpperCase()} — {kind === 'match' ? 'MATCH RATINGS' : 'SEASON RATINGS'}</span>
        </div>
        <div className="grid gap-1.5">{list.slice(0, 5).map((p, i) => <Pill key={p.name} p={p} rank={i + 1} onOpen={() => openCard(p, i + 1, key)} />)}</div>
      </div>
    );
  }
  sections.push(
    <div key="lists" className="grid gap-4 md:grid-cols-2">
      {ratingsGrid}
    </div>
  );
  sections.push(<FormBattle key="form" match={match} />);
  sections.push(<ScoutsTake key="take" match={match} home={home} away={away} kind={kind} />);
  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4">
        {sections.filter(Boolean).map((s, i) => (
          <motion.section
            key={s.key || i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.07, 0.4), duration: 0.35 }}
          >
            {s}
          </motion.section>
        ))}
        <div className="text-center text-[11px] text-slate-400">
          {kind === 'match' ? 'FotMob match ratings — full time' : 'FotMob season averages — match ratings land at full time'}
        </div>
      </div>
      {card && (
        <PlayerCard
          p={card.p}
          team={card.team}
          kind={kind}
          rank={card.rank}
          total={card.total}
          avg={card.avg}
          onClose={() => setCard(null)}
        />
      )}
    </MotionConfig>
  );
}
