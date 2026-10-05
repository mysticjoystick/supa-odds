import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ValueBadge from './ValueBadge';
import LeagueBadge from './LeagueBadge';
import TeamCrest from './TeamCrest';
import LiveBadge from './LiveBadge';
import { FavStar } from './Favorites';
import { LEAGUES } from '../lib/mock';
import { Odds } from '../lib/oddsFormat';
import WinChance from './WinChance';
import { bestPerMatch, MIN_EDGE, predictedOutcome } from '../lib/value';
import { useSlip } from '../lib/slip';
import { leg1X2 } from '../lib/markets';
import { kickoffLabel, fullDateLabel } from '../lib/dates';

// One tappable odds cell (1 / X / 2). Tap toggles the leg in the slip.
// star = the model's most likely outcome (highest true chance).
function OddsCell({ leg, label, highlight, star }) {
  const { toggle, has } = useSlip();
  if (!leg) return null;
  const price = leg.price;
  if (!price || price <= 1) {
    return (
      <span className="tabular min-w-[52px] rounded-lg bg-white/[0.03] px-2 py-1.5 text-center text-xs text-slate-400" title="No price yet">
        {label} —
      </span>
    );
  }
  const active = has(leg.matchId, leg.outcome, leg.market);
  return (
    <button
      onClick={() => toggle(leg)}
      aria-pressed={active}
      title={(star ? "Model's most likely outcome. " : '') + (active ? `Remove ${leg.pick} @ ${price} (${leg.book}) from slip` : `Add ${leg.pick} @ ${price} (${leg.book}) to slip`)}
      className={`tabular inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-lg px-2 text-center transition-all ${
        active
          ? 'bg-lime-400 font-extrabold text-black shadow-[0_0_14px_rgba(163,230,53,0.35)]'
          : highlight
            ? 'border border-lime-400/40 bg-lime-400/10 font-bold text-lime-200 hover:bg-lime-400/20'
            : 'bg-white/[0.06] font-bold text-slate-100 hover:bg-white/[0.12]'
      }`}
    >
      {active ? (
        <span className="font-extrabold">✓ <Odds v={price} /></span>
      ) : (
        <span>{star && <span className="mr-0.5 text-[10px] text-amber-300" aria-hidden>★</span>}<span className="mr-1 text-[10px] font-semibold text-slate-500">{label}</span><Odds v={price} /></span>
      )}
    </button>
  );
}

function MatchRow({ m, index }) {
  const best = bestPerMatch(m);
  const bestKey = best?.key;
  const predictedKey = predictedOutcome(m)?.key;
  const h = leg1X2(m, 'h');
  const d = leg1X2(m, 'd');
  const a = leg1X2(m, 'a');
  const hasPrices = !!(h || d || a);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-white/[0.05]"
    >
      {/* kickoff */}
      <div className="tabular w-11 shrink-0 text-xs" title={fullDateLabel(m)}>
        {m.live ? (
          <LiveBadge minute={m.minute} />
        ) : (
          <span className="font-semibold text-slate-400">{kickoffLabel(m)}</span>
        )}
      </div>
      {/* teams + win % */}
      <div className="min-w-[190px] flex-1">
        <Link to={`/match/${m.id}`} className="flex items-center gap-2 font-semibold text-white hover:underline">
          <TeamCrest name={m.home} size={24} src={m.crestHome} />
          <span className="truncate">{m.home} <span className="font-normal text-slate-500">vs</span> {m.away}</span>
          <TeamCrest name={m.away} size={24} src={m.crestAway} />
          <FavStar team={m.home} size={12} /><FavStar team={m.away} size={12} />
        </Link>
        {m.fair && (
          <div className="mt-1 max-w-[340px]">
            <WinChance match={m} variant="compact" />
          </div>
        )}
      </div>
      {/* 1X2 + value */}
      <div className="flex items-center gap-1.5">
        {best && best.ev >= MIN_EDGE && <ValueBadge ev={best.ev} />}
        {hasPrices ? (
          <>
            <OddsCell leg={h} label="1" highlight={bestKey === 'h'} star={predictedKey === 'h'} />
            <OddsCell leg={d} label="X" highlight={bestKey === 'd'} star={predictedKey === 'd'} />
            <OddsCell leg={a} label="2" highlight={bestKey === 'a'} star={predictedKey === 'a'} />
          </>
        ) : (
          <span className="tabular rounded-lg bg-white/[0.03] px-2.5 py-2 footnote" title={m.oddsStatus === 'needs-key' ? 'Real fixture — prices need an odds key for this league' : 'Real fixture — prices appear when the feed syncs'}>
            Odds soon
          </span>
        )}
        <Link
          to={`/match/${m.id}`}
          title="Open match detail"
          aria-label={`Open ${m.home} vs ${m.away} detail`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-slate-400 hover:bg-white/[0.12] hover:text-white"
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </motion.div>
  );
}

function LeagueSection({ title, icon, matches, edgeCount, defaultOpen = true, tone }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="halftone sticker overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03]"
      >
        {icon}
        <span className="font-display text-sm font-normal tracking-wide text-white">{title}</span>
        {tone === 'live' ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-extrabold text-red-300">
            {matches.length} live
          </span>
        ) : (
          <span className="text-xs font-normal text-slate-500">
            {matches.length} match{matches.length === 1 ? '' : 'es'}
            {edgeCount > 0 && (
              <> • <b className="rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 font-bold text-gold">{edgeCount} value</b></>
            )}
          </span>
        )}
        <span className="ml-auto text-slate-500">
          <ChevronDown size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        </span>
      </button>
      {open && (
        <div className="divide-y divide-white/5 border-t border-white/5">
          {matches.map((m, i) => (
            <MatchRow key={m.id} m={m} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function OddsTable({ matches, leagues }) {
  const leagueById = useMemo(() => {
    const map = new Map((leagues?.length ? leagues : LEAGUES).map((l) => [l.id, l]));
    for (const l of LEAGUES) if (!map.has(l.id)) map.set(l.id, l);
    return map;
  }, [leagues]);

  const groups = useMemo(() => {
    const live = (matches || []).filter((m) => m.live);
    const rest = (matches || []).filter((m) => !m.live);
    const byLeague = new Map();
    for (const m of rest) {
      const id = m.leagueId || 'other';
      if (!byLeague.has(id)) byLeague.set(id, []);
      byLeague.get(id).push(m);
    }
    const sections = [...byLeague.entries()].map(([id, ms]) => {
      const meta = leagueById.get(id) || { id, name: ms[0]?.tournament || id, sport: '' };
      const edgeCount = ms.filter((m) => (bestPerMatch(m)?.ev ?? -1) >= MIN_EDGE).length;
      return { id, meta, matches: ms, edgeCount };
    });
    // Popular leagues first, then the rest alphabetically — like a real board.
    sections.sort((a, b) => ((a.meta.tier || 9) - (b.meta.tier || 9)) || b.matches.length - a.matches.length || a.meta.name.localeCompare(b.meta.name));
    return { live, sections };
  }, [matches, leagueById]);

  if (!matches?.length) {
    return (
      <div className="sticker px-4 py-8 text-center text-sm text-slate-500">
        No matches in this view right now — try another day or league.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.live.length > 0 && (
        <LeagueSection
          title="Live now"
          tone="live"
          matches={groups.live}
          edgeCount={0}
          icon={<span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />}
        />
      )}
      {groups.sections.map((s) => (
        <LeagueSection
          key={s.id}
          title={s.meta.name}
          matches={s.matches}
          edgeCount={s.edgeCount}
          icon={<LeagueBadge id={s.id} name="" size="sm" />}
        />
      ))}
    </div>
  );
}
