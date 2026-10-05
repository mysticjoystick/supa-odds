import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TeamCrest from '../components/TeamCrest';
import { EdgeMeter, Verdict } from '../components/EdgeMeter';
import StakeHint from '../components/StakeHint';
import MyBooksPicker from '../components/MyBooksPicker';
import BetNow from '../components/BetNow';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES } from '../lib/mock';
import { Odds } from '../lib/oddsFormat';
import { fmtPct } from '../lib/math';
import { useMyBooks } from '../lib/myBooks';
import { useSlip, slipShareText, whatsappUrl, parseStakeText } from '../lib/slip';
import { buildDailyPicks, rowKey, MODES, payoutFor, profitFor, stakeForTarget } from '../lib/builder';
import { dayLabel, shortDate, shortKickoff } from '../lib/dates';

const MODE_ORDER = ['safe', 'balanced', 'bold'];
const ODDS_CAPS = [1.5, 2.0, 2.5];

function loadMode() {
  try {
    const m = localStorage.getItem('oddslens-builder-mode');
    if (m && MODES[m]) return m;
  } catch { /* ignore */ }
  return 'safe';
}

export default function Builder() {
  const snap = useSnapshot();
  const matches = snap ? (snap.matches || []) : MATCHES;
  const { myBooks } = useMyBooks();
  const { stake, setStake, add, has } = useSlip();

  const [mode, setMode] = useState(loadMode);
  const [dayKey, setDayKey] = useState(null); // null = auto (today if priced, else best priced day)
  const [maxOdds, setMaxOdds] = useState(null); // null = Any — mode gate still applies
  // Deck editing — bench distrusted legs, dial the leg count. Resets when the
  // candidate pool changes (mode/day/cap), never on background refreshes.
  const [excluded, setExcluded] = useState([]);
  const [legCount, setLegCount] = useState(null); // null = mode default
  const [building, setBuilding] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stakeText, setStakeText] = useState(String(stake));
  const [targetText, setTargetText] = useState('');
  const [targetFocused, setTargetFocused] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('oddslens-builder-mode', mode); } catch { /* ignore */ }
  }, [mode]);

  const built = useMemo(
    () => buildDailyPicks(matches, mode, myBooks, dayKey, maxOdds, { excluded, legCount }),
    [matches, mode, myBooks, dayKey, maxOdds, excluded, legCount]
  );
  const { picks, legs, bestMine, total, totals } = built;

  // Fresh candidate pool → fresh deck.
  useEffect(() => {
    setExcluded([]);
    setLegCount(null);
  }, [mode, dayKey, maxOdds]);

  // Combined ticket win chance = product of each leg's true chance.
  // This is the "how safe is this acca" number — it always precedes the payout.
  const combinedProb = useMemo(
    () => (legs.length ? legs.reduce((acc, l) => acc * ((l.row?.fairProb) ?? 1), 1) : 0),
    [legs]
  );
  const combinedPct = Math.round(combinedProb * 100);
  const oneInN = combinedProb > 0 ? Math.max(1, Math.round(1 / combinedProb)) : null;

  // Building shimmer on mode / pool change — smooth, no page reload.
  useEffect(() => {
    setBuilding(true);
    const id = setTimeout(() => setBuilding(false), 550);
    return () => clearTimeout(id);
  }, [mode, built.poolSize, built.dayKey, dayKey, maxOdds]);

  useEffect(() => setStakeText(String(stake)), [stake]);

  // Keep the reverse field in sync unless the user is typing a target.
  const payout = payoutFor(stake, total);
  const profit = profitFor(stake, total);
  useEffect(() => {
    if (!targetFocused) setTargetText(payout ? payout.toFixed(0) : '');
  }, [payout, targetFocused]);

  const commitStakeInput = () => setStake(parseStakeText(stakeText, stake));
  const commitTargetInput = () => {
    const t = Number(targetText);
    if (Number.isFinite(t) && t > 0 && total > 1) {
      const s = Math.max(1, Math.floor(stakeForTarget(t, total)));
      setStake(s);
      setStakeText(String(s));
    } else if (!targetFocused) {
      setTargetText(payout ? payout.toFixed(0) : '');
    }
  };

  const onStakeChange = (v) => {
    setStakeText(v);
    const n = Number(v);
    if (Number.isFinite(n) && n >= 1 && total > 1) {
      const s = Math.floor(n);
      setStake(s);
      if (!targetFocused) setTargetText((s * total).toFixed(0));
    }
  };

  const onTargetChange = (v) => {
    setTargetText(v);
    const t = Number(v);
    if (Number.isFinite(t) && t > 0 && total > 1) {
      const s = Math.max(1, Math.floor(stakeForTarget(t, total)));
      setStake(s);
      setStakeText(String(s));
    }
  };

  const addAll = () => legs.forEach((l) => add({ ...l }));
  const addedCount = legs.filter((l) => has(l.matchId, l.outcome, l.market)).length;
  const allAdded = legs.length > 0 && addedCount === legs.length;

  // Deck editing — bench a leg (×) or bring it back (+). Totals, win chance
  // and payout all recalculate from the remaining legs.
  const benchRow = (r) => setExcluded((prev) => (prev.includes(rowKey(r)) ? prev : [...prev, rowKey(r)]));
  const readdRow = (r) => setExcluded((prev) => prev.filter((k) => k !== rowKey(r)));
  const stepLegs = (d) => setLegCount((built.legCount || built.defaultLegs) + d);

  const shareText = slipShareText(legs, stake, bestMine?.missing === false ? bestMine : null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const feedMode = snap?.metadata?.mode;
  const isDemo = feedMode === 'demo' || snap?.isDemo;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="hero-grid relative overflow-hidden rounded-2xl border border-white/10 bg-void px-5 py-5">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-lime-400/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
          <div>
            <h1 className="font-display text-xl font-normal text-white md:text-2xl">
              Bet Builder <span className="text-supa">— today&apos;s surest picks</span>
            </h1>
            <p className="mt-1 max-w-xl text-xs text-slate-400 md:text-sm">
              We scan {built.pricedCount || built.poolSize} priced {built.pricedCount === 1 ? 'fixture' : 'fixtures'}
              {built.dayKey ? ` on ${dayLabel(built.dayKey)}` : ''} for winnable +EV lines,
              stack them into one acca and show exactly what it pays. Numbers, not tips — no outcome is guaranteed.
            </p>
          </div>
          <span className="ml-auto flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${feedMode === 'live' ? 'bg-lime-400/15 text-lime-300' : feedMode === 'hybrid' ? 'bg-sky-400/15 text-sky-300' : 'bg-white/10 text-slate-400'}`}>
              {feedMode === 'live' ? '● LIVE DATA' : feedMode === 'hybrid' ? '● REAL FIXTURES' : '○ DEMO SAMPLE'}
            </span>
            {built.dayKey && (
              <span className="tabular rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-300">
                {dayLabel(built.dayKey)} • {built.pricedCount}/{built.poolSize} priced
              </span>
            )}
          </span>
        </div>

        {/* Day rail — today is often unpriced (NBA/NFL need a key); jump to the priced day */}
        {!!built.options?.length && (
          <div className="relative mt-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Builder dates">
            {built.options.map((o) => {
              const active = o.key === built.dayKey;
              return (
                <button
                  key={o.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDayKey(o.key === built.dayKey && dayKey ? null : o.key)}
                  title={`${o.count} fixtures • ${o.priced} priced • ${o.deals} +EV`}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-center transition-all ${
                    active
                      ? 'bg-lime-400 font-extrabold text-black shadow-[0_0_18px_rgba(163,230,53,0.35)]'
                      : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                  }`}
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">{shortDate(o.key)}</span>
                  <span className="tabular block text-sm leading-tight">{o.label} <span className="opacity-70">· {o.priced}/{o.count}</span></span>
                </button>
              );
            })}
          </div>
        )}

        {/* Risk mode tabs with sliding pill */}
        <div className="relative mt-4 flex rounded-2xl bg-white/[0.05] p-1" role="tablist" aria-label="Risk level">
          {MODE_ORDER.map((id) => {
            const m = MODES[id];
            const active = mode === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(id)}
                className={`relative min-h-[44px] flex-1 rounded-xl px-3 text-sm transition-colors ${active ? 'text-black' : 'text-slate-400 hover:text-white'}`}
              >
                {active && (
                  <motion.span
                    layoutId="builder-mode-pill"
                    className="absolute inset-0 rounded-xl bg-lime-400 shadow-[0_0_18px_rgba(163,230,53,0.35)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative font-extrabold">{m.label}</span>
                <span className={`relative ml-1.5 hidden text-[11px] sm:inline ${active ? 'text-black/80' : 'text-slate-500'}`}>
                  {m.id === 'safe' ? '50%+ only' : m.id === 'balanced' ? '1-in-5+ only' : 'longshots'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="relative mt-2 footnote">{MODES[mode].blurb} {built.fellBack && '• none of your books priced the top lines — showing best available.'}</p>
        <p className="relative mt-1 text-[11px] leading-relaxed text-slate-500">
          Higher odds = less likely to win — books pay more precisely because it happens less often. Big payouts are the least likely outcomes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Picks column */}
        <div className="min-w-0 space-y-3">
          <MyBooksPicker compact />
          {/* Max-odds ceiling — you set it, list + total recalculate live */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Maximum odds">
            <span className="text-[11px] font-bold tracking-wide text-slate-500" title="Hide anything priced above this — higher odds means less likely to win">MAX ODDS</span>
            {[null, ...ODDS_CAPS].map((cap) => {
              const active = (maxOdds ?? null) === cap;
              return (
                <button
                  key={cap ?? 'any'}
                  onClick={() => setMaxOdds(cap)}
                  aria-pressed={active}
                  title={cap == null ? 'No extra cap — mode gate only' : `Hide anything above ${cap.toFixed(2)}`}
                  className={`comic-btn min-h-[40px] rounded-full px-3 text-xs font-bold transition-all ${active ? 'bg-gold text-ink' : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'}`}
                >
                  {cap == null ? 'Any' : `≤ ${cap.toFixed(2)}`}
                </button>
              );
            })}
            {built.cappedByUser && (
              <span className="text-[11px] text-amber-300">hiding pricier lines above {maxOdds.toFixed(2)}</span>
            )}
          </div>
          <AnimatePresence mode="wait">
            {building ? (
              <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  <span className="ml-1">Scanning {built.poolSize} fixtures for {MODES[mode].label.toLowerCase()} value…</span>
                </div>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="shimmer h-24 rounded-2xl" />
                ))}
              </motion.div>
            ) : built.emptyReason ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="halftone rounded-2xl border-2 border-white/15 bg-panel p-6 text-center shadow-[4px_4px_0_#e63329]">
                {built.emptyReason === 'empty' && (
                  <>
                    <div className="text-lg font-extrabold text-white">No fixtures today</div>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">Nothing scheduled in the feed right now — check Live or Compare, or come back at match hours.</p>
                  </>
                )}
                {built.emptyReason === 'no-prices' && (
                  <>
                    <div className="text-lg font-extrabold text-white">No prices on this day yet</div>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                      {built.poolSize} real {built.poolSize === 1 ? 'fixture' : 'fixtures'} on {built.dayKey ? dayLabel(built.dayKey) : 'this day'}
                      {built.needsKeyCount ? ` — ${built.needsKeyCount} need an odds key (NBA/NFL)` : ''}.
                      Prices land first on soccer days. Best ticket right now:
                      {built.bestDay ? ` ${built.bestDay.label} (${built.bestDay.deals} deals, ${built.bestDay.priced}/${built.bestDay.count} priced)` : ' —'}.
                    </p>
                    {!!built.bestDay && (
                      <button onClick={() => setDayKey(built.bestDay.key)} className="mt-3 rounded-lg bg-lime-400 px-4 py-2 text-xs font-extrabold text-black hover:bg-lime-300">
                        Show {built.bestDay.label}&apos;s ticket →
                      </button>
                    )}
                  </>
                )}
                {built.emptyReason === 'no-edge' && (
                  <>
                    <div className="text-lg font-extrabold text-white">Full time on {built.dayKey ? dayLabel(built.dayKey) : 'this day'} — markets look sharp</div>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">No +EV lines in {built.pricedCount} priced fixtures. Best move is no bet — or check the best day.</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <button onClick={() => setMode('bold')} className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15">View Longshots ticket</button>
                      {!!built.bestDay && built.bestDay.key !== built.dayKey && built.bestDay.deals > 0 && (
                        <button onClick={() => setDayKey(built.bestDay.key)} className="rounded-lg bg-lime-400 px-4 py-2 text-xs font-extrabold text-black hover:bg-lime-300">
                          {built.bestDay.label} has {built.bestDay.deals} deals →
                        </button>
                      )}
                    </div>
                  </>
                )}
                {built.emptyReason === 'no-safe' && (
                  <>
                    <div className="text-lg font-extrabold text-amber-300">No {MODES[mode].label.toLowerCase()} value right now</div>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
                      {built.cappedByUser
                        ? `Your max-odds cap (≤ ${maxOdds.toFixed(2)}) is hiding the pricier qualifiers — loosen it or try Longshots.`
                        : mode === 'safe'
                          ? 'Nothing at 50%+ win chance with short odds. The remaining +EV is all longer shots — not surest-pick material.'
                          : 'Nothing at 1-in-5 or better outside longshot prices. The remaining +EV is all wild — not surest-pick material.'}
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {mode === 'safe' && (
                        <button onClick={() => setMode('balanced')} className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15">Try Balanced (1-in-5+)</button>
                      )}
                      <button onClick={() => setMode('bold')} className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15">View Longshots</button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key={`picks-${mode}-${built.dayKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ticket-assembled space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11px] font-bold tracking-wide text-slate-500">
                    {mode === 'bold'
                      ? `LONGSHOT TICKET • ${picks.length} LOW-WIN-RATE LINES — NOT SUREST ${isDemo ? '• SAMPLE' : ''}`
                      : built.isFallback
                        ? `FAVORITES ${picks.length} • HIGH CHANCE, NO EDGE CONFIRMED — PLAY SMALL ${isDemo ? '• SAMPLE' : ''}`
                        : `SUREST ${picks.length} • HIGH WIN RATE FIRST ${isDemo ? '• SAMPLE' : ''}`}
                  </div>
                  {built.availCount > 1 && (
                    <div className="ml-auto flex items-center gap-1" role="group" aria-label="Ticket legs">
                      <span className="text-[10px] font-bold tracking-wide text-slate-500" title="How many legs ride on this ticket — fewer legs win more often">LEGS</span>
                      <button onClick={() => stepLegs(-1)} disabled={built.legCount <= 1} aria-label="Fewer legs"
                        className="comic-btn grid h-9 w-9 place-items-center rounded-lg bg-gold text-base font-black text-ink disabled:opacity-30">−</button>
                      <span className="tabular min-w-[52px] text-center text-xs font-extrabold text-white" title={`${built.legCount} of ${built.availCount} shortlisted legs on the ticket`}>{built.legCount} of {built.availCount}</span>
                      <button onClick={() => stepLegs(1)} disabled={built.legCount >= built.availCount} aria-label="More legs"
                        className="comic-btn grid h-9 w-9 place-items-center rounded-lg bg-gold text-base font-black text-ink disabled:opacity-30">+</button>
                    </div>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {picks.map((r, i) => {
                    const leg = legs.find((l) => String(l.matchId) === String(r.m.id) && l.outcome === r.key);
                    const gate = built.isFallback ? null : mode === 'bold' ? null : mode === 'safe'
                      ? `Safe — ${Math.round((r.fairProb ?? 0) * 100)}% ≥ 50%, ${Number(r.market).toFixed(2)} ≤ 2.50`
                      : `Balanced — ${Math.round((r.fairProb ?? 0) * 100)}% ≥ 20%, ${Number(r.market).toFixed(2)} ≤ 5.00`;
                    return <PickCard key={`${r.m.id}-${r.key}`} r={r} rank={i + 1} leg={leg} gate={gate} fallback={built.isFallback} onRemove={() => benchRow(r)} />;
                  })}
                </AnimatePresence>
                {!!built.benched?.length && (
                  <div className="halftone rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="mb-2 text-[11px] font-bold tracking-wide text-slate-400">
                      BENCHED ({built.benched.length}) — you removed these, tap + to bring one back
                    </div>
                    <div className="space-y-1.5">
                      {built.benched.map((r) => (
                        <BenchRow key={`bench-${r.m.id}-${r.key}`} r={r} onReadd={() => readdRow(r)} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Watchlist */}
          {!building && (built.longshots.length > 0 || built.moderates.length > 0) && (
            <details className="halftone overflow-hidden rounded-2xl border-2 border-red-400/40 bg-red-400/[0.03] shadow-[4px_4px_0_#e63329]">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-red-200 hover:text-white">
                <span aria-hidden>⚠️</span> Risky ones to watch out for ({built.longshots.length + built.moderates.length})
                <span className="ml-auto text-[11px] font-normal text-slate-400">longshots + drifting lines — tiny stakes or skip</span>
              </summary>
              <div className="space-y-2 border-t border-white/5 p-3">
                {built.moderates.map((r) => (
                  <WatchRow key={`mod-${r.m.id}-${r.key}`} r={r} tone="amber" />
                ))}
                {built.longshots.map((r) => (
                  <WatchRow key={`long-${r.m.id}-${r.key}`} r={r} tone="red" />
                ))}
                <p className="px-1 footnote">These are still +EV on price but hard to win. If they&apos;re in your ticket, halve the stake. 18+ only.</p>
              </div>
            </details>
          )}
        </div>

        {/* Summary column */}
        <div className="min-w-0">
          <div className={`halftone rounded-2xl border-2 p-4 lg:sticky lg:top-20 ${mode === 'bold' ? 'border-red-400/40 bg-panel shadow-[4px_4px_0_#e63329]' : 'border-lime-400/40 bg-panel shadow-[4px_4px_0_#e63329]'}`}>
            <div className="mb-1 panel-title">
              {mode === 'bold' ? `YOUR LONGSHOT TICKET • HIGH RISK (${legs.length})` : `YOUR TICKET • ${MODES[mode].label.toUpperCase()} (${legs.length})`}
            </div>
            {mode === 'bold' && (
              <p className="mb-2 rounded-lg bg-red-400/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-red-200">
                Low win-rate lines — most of these lose. Tiny stakes only, never the “surest” ticket.
              </p>
            )}
            {!legs.length || !total ? (
              <div className="py-4 text-center text-sm text-slate-500">
                {built.benched?.length
                  ? 'Ticket is empty — every leg is benched. Bring one back below.'
                  : 'Ticket builds here once picks qualify.'}
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-3xl font-black text-white">@ <Odds v={total} /></span>
                  <span className="text-xs text-slate-400">best {bestMine?.missing === false ? `@ ${bestMine.book}` : ''} • {legs.length} legs</span>
                </div>
                {!!totals.length && (
                  <div className="mt-2 space-y-1">
                    {totals.slice(0, 3).map((t) => (
                      <div key={t.book} className={`tabular flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${bestMine?.book === t.book && !t.missing ? 'bg-lime-400/15 font-bold text-lime-200' : 'bg-white/[0.03] text-slate-400'}`}>
                        <span>{t.book}{bestMine?.book === t.book && !t.missing ? ' ★ best' : ''}</span>
                        <span className="ml-auto">{t.missing ? 'missing leg' : <span>@ <Odds v={t.total} /></span>}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Combined win chance — always before the payout, equal weight */}
                <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[11px] text-slate-400">TICKET WIN CHANCE</div>
                  <div className="tabular text-2xl font-black text-white">
                    {combinedPct}%{oneInN ? <span className="ml-2 text-[11px] font-normal text-slate-400">≈ 1 in {oneInN} tickets land</span> : null}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" title={`All ${legs.length} legs must win — true chance ${combinedPct}%`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, combinedPct)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${mode === 'bold' ? 'bg-gradient-to-r from-red-500 to-red-300' : 'bg-gradient-to-r from-lime-500 to-lime-300'}`}
                    />
                  </div>
                  <div className="mt-1 footnote">all {legs.length} legs must win — long accas lose far more often than any single leg</div>
                </div>

                {/* Dual calculator: stake ⇄ target, both live */}
                <div className="mt-3 grid gap-2 rounded-xl bg-white/[0.03] p-3">
                  <label className="flex min-h-[44px] items-center justify-between gap-2 text-sm text-slate-300">
                    Stake GH₵
                    <input
                      type="number" min="1" step="1" value={stakeText}
                      onChange={(e) => onStakeChange(e.target.value)}
                      onBlur={commitStakeInput}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="field tabular w-28 font-bold text-white" aria-label="Stake in cedis"
                    />
                  </label>
                  <label className="flex min-h-[44px] items-center justify-between gap-2 text-sm text-slate-300">
                    <span title="Type what you want to win — we work out the stake">Want to win GH₵</span>
                    <input
                      type="number" min="1" step="1" value={targetText}
                      onFocus={() => setTargetFocused(true)}
                      onBlur={() => { setTargetFocused(false); commitTargetInput(); }}
                      onChange={(e) => onTargetChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="field tabular w-28 font-bold text-white" aria-label="Target payout in cedis"
                    />
                  </label>
                  <div className="rounded-xl bg-lime-400/[0.07] px-3 py-2.5 text-center">
                    <div className="text-[11px] text-slate-400">PAYOUT</div>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={payout.toFixed(2)}
                        initial={{ scale: 0.92, opacity: 0.4 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        className="tabular text-2xl font-black text-lime-300"
                      >
                        GH₵{payout ? payout.toFixed(2) : '—'}
                      </motion.div>
                    </AnimatePresence>
                    <div className="tabular text-[11px] text-slate-400">
                      {payout ? <>profit GH₵{profit.toFixed(2)} • GH₵{stake} × {total.toFixed(2)}</> : 'enter a stake above'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    onClick={addAll}
                    disabled={!legs.length}
                    title={mode === 'bold' ? 'These are low win-rate lines — most longshot tickets lose' : undefined}
                    className={`min-h-[44px] rounded-xl text-sm font-extrabold transition-all ${allAdded ? 'bg-white/10 text-slate-300' : mode === 'bold' ? 'border border-red-400/50 bg-transparent text-red-200 hover:bg-red-400/10' : 'bg-lime-400 text-black hover:bg-lime-300 brand-glow'}`}
                  >
                    {allAdded ? `✓ In slip (${addedCount}/${legs.length})` : mode === 'bold' ? `Add longshots anyway (${legs.length})` : `Add all ${legs.length} to slip${addedCount ? ` (${addedCount} added)` : ''}`}
                  </button>
                  {bestMine && !bestMine.missing && <BetNow book={bestMine.book} label="Bet this ticket" className="w-full text-center" />}
                  <div className="flex gap-2">
                    <button onClick={copy} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15">{copied ? '✓ Copied!' : 'Copy ticket'}</button>
                    <a href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-[#25D366]/50 px-3 text-center text-xs font-extrabold text-[#4ce080] hover:bg-[#25D366]/10">WhatsApp</a>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-500">Odds move — confirm every leg on {bestMine?.book} before placing. No profit guaranteed. 18+ only.</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        Supa Odds — analytics only. No real-money betting here. Bet only what you can afford to lose. <Link to="/responsible" className="underline hover:text-slate-300">Play safe</Link>
      </p>
    </div>
  );
}

// Traffic light — green = good (high chance, short price), yellow = not so
// sure (winnable but thinner), red = longshot (low chance, high odds).
function legTone(r) {
  const fp = r.fairProb ?? 0;
  const m = r.market ?? Infinity;
  if (fp >= 0.5 && m < 2.5) return 'green';
  if (fp >= 0.2 && m < 5) return 'yellow';
  return 'red';
}

const TONE = {
  green: {
    border: 'border-lime-400/40 bg-lime-400/[0.04] hover:border-lime-400/60',
    badge: 'bg-lime-400 text-black',
    bar: 'bg-gradient-to-r from-lime-500 to-lime-300',
    tag: 'bg-lime-400/15 text-lime-300',
    tagLabel: 'Good — high chance',
  },
  yellow: {
    border: 'border-amber-400/40 bg-amber-400/[0.04] hover:border-amber-400/60',
    badge: 'bg-amber-400 text-black',
    bar: 'bg-gradient-to-r from-amber-500 to-amber-300',
    tag: 'bg-amber-400/15 text-amber-200',
    tagLabel: 'Not so sure — thinner',
  },
  red: {
    border: 'border-red-400/40 bg-red-400/[0.04] hover:border-red-400/60',
    badge: 'bg-red-400 text-black',
    bar: 'bg-gradient-to-r from-red-500 to-red-300',
    tag: 'bg-red-400/15 text-red-200',
    tagLabel: 'High odds = low chance',
  },
};

function PickCard({ r, rank, leg, gate, fallback, onRemove }) {
  const { toggle, has, heldBook } = useSlip();
  const active = has(r.m.id, r.key, '1X2');
  const held = heldBook(r.m.id, r.key, '1X2');
  const conf = Math.round((r.fairProb ?? 0) * 100);
  // Chance leads, price follows — high odds must never look like the headline.
  const impliedPct = r.market > 1 ? Math.round((1 / r.market) * 100) : 0;
  const tone = legTone(r);
  const t = TONE[tone];
  const border = active ? 'border-lime-400/40 bg-lime-400/[0.05]' : t.border;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(rank * 0.06, 0.3), type: 'spring', stiffness: 320, damping: 28 }}
      className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${border}`}
    >
      <span className={rank === 1 ? 'burst tabular grid h-9 w-9 shrink-0 place-items-center bg-gold text-sm font-black text-ink' : `tabular grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${t.badge}`} title={fallback ? `Favorite #${rank} — high chance, no edge` : rank === 1 ? 'Top pick of the matchday' : `Pick #${rank}`}>
        {rank}
      </span>
      <TeamCrest name={r.m.home} size={28} src={r.m.crestHome} />
      <div className="min-w-[220px] flex-1">
        {/* Win chance leads — the pick, not the price, is the headline */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular text-lg font-black text-white">{conf}%</span>
          <span className="text-xs font-bold text-slate-300">win chance</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.tag}`}>
            {t.tagLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10" title={`True win chance ${conf}%`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${conf}%` }}
              transition={{ delay: 0.2 + rank * 0.06, duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${t.bar}`}
            />
          </div>
          <span className="footnote">book implies {impliedPct}% · true {conf}%</span>
        </div>
        <Link to={`/match/${r.m.id}`} className="mt-1.5 block text-sm font-semibold text-white hover:underline">
          {r.label} <span className="tabular font-normal text-slate-400">@ <Odds v={r.market} /> · {r.book} · true <Odds v={r.fair} /></span>
        </Link>
        <div className="footnote">{r.m.home} vs {r.m.away}{r.m.leagueId ? ` • ${r.m.leagueId}` : ''}{shortKickoff(r.m) ? ` • ${shortKickoff(r.m)}` : ''}</div>
        {fallback ? (
          <div className="mt-1 text-[11px] font-semibold text-amber-200/90" title="Top favorite by win chance — books aren't overpaying, so no edge confirmed">
            ★ Favorite by win chance — no edge confirmed, keep stakes small
          </div>
        ) : gate ? (
          <div className="mt-1 text-[11px] font-semibold text-lime-300/90" title="Why this leg made the ticket">
            ✓ Passes {gate}
          </div>
        ) : null}
        <Verdict row={r} className="mt-1" />
        <div className="tabular mt-1 footnote">
          <StakeHint fairProb={r.fairProb} market={r.market} ev={r.ev} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-1.5">
        <div className="flex items-center gap-2">
          <EdgeMeter ev={r.ev} />
          {!!onRemove && (
            <button
              onClick={onRemove}
              title="Remove from ticket — it waits on the bench below, nothing is lost"
              aria-label={`Remove ${r.label} from ticket`}
              className="grid h-11 w-11 place-items-center rounded-lg text-lg leading-none text-slate-500 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={() => toggle(leg || { matchId: r.m.id, home: r.m.home, away: r.m.away, leagueId: r.m.leagueId, market: '1X2', outcome: r.key, pick: r.label, prices: r.m.prices, price: r.market, book: r.book })}
          aria-pressed={active}
          title={active && held ? `In slip @ ${held} — tap to remove` : `Add ${r.label} @ ${r.market} to slip`}
          className={`min-h-[44px] whitespace-nowrap rounded-lg px-3 text-[11px] font-extrabold transition-all ${active ? 'bg-lime-400 text-black' : 'bg-lime-400/15 text-lime-300 hover:bg-lime-400/25'}`}
        >
          {active ? `✓ In slip${held ? ` @ ${held}` : ''}` : '+ Slip'}
        </button>
      </div>
    </motion.div>
  );
}

function BenchRow({ r, onReadd }) {
  const conf = Math.round((r.fairProb ?? 0) * 100);
  const tone = legTone(r);
  const dot = tone === 'green' ? 'bg-lime-400' : tone === 'yellow' ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
        <b className="text-white">{r.label}</b> <span className="tabular">@ <Odds v={r.market} /></span>
        <span className="block truncate footnote">{r.m.home} vs {r.m.away} • {conf}% win chance</span>
      </span>
      <button
        onClick={onReadd}
        title={`Bring ${r.label} back onto the ticket`}
        aria-label={`Re-add ${r.label} to ticket`}
        className="inline-flex min-h-[44px] items-center rounded-lg bg-lime-400/15 px-3 text-[11px] font-extrabold text-lime-300 hover:bg-lime-400/25"
      >
        + Re-add
      </button>
    </div>
  );
}

function WatchRow({ r, tone }) {  const conf = fmtPct(r.fairProb ?? 0, 0);
  return (
    <Link
      to={`/match/${r.m.id}`}
      className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs hover:bg-white/[0.05] ${tone === 'red' ? 'bg-red-400/[0.04]' : 'bg-amber-400/[0.04]'}`}
    >
      <span aria-hidden>{tone === 'red' ? '🔴' : '🟡'}</span>
      <span className="min-w-0 flex-1 truncate text-slate-200">
        <b className="text-white">{r.label}</b> <Odds v={r.market} /> <span className="text-slate-500">@ {r.book}</span>
        <span className="block truncate footnote">{r.m.home} vs {r.m.away} • wins {conf} of the time</span>
      </span>
      <EdgeMeter ev={r.ev} />
    </Link>
  );
}
