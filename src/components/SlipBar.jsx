import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSlip, totalsPerBook, bestTotal, slipShareText, whatsappUrl, useLiveLegs, parseStakeText } from '../lib/slip';
import { useSnapshot } from '../hooks/useSnapshot';
import { useMyBooks } from '../lib/myBooks';
import { Odds } from '../lib/oddsFormat';
import BetNow from './BetNow';
import { sheet, backdrop } from '../lib/motion';

// Sticky bottom slip bar: leg count, best total, GH₵ payout, share.
// Sits above the mobile nav — the SportyBet-style thumb zone.
export default function SlipBar() {
  const { legs, stake, setStake, remove, clear } = useSlip();
  const snap = useSnapshot();
  const { myBooks } = useMyBooks();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Dismiss hides the bar; a slim pill reopens it. A newly added leg
  // un-dismisses (fresh info), removals don't nag.
  const [dismissed, setDismissed] = useState(false);
  const prevCount = useRef(legs.length);
  useEffect(() => {
    if (legs.length > prevCount.current) setDismissed(false);
    prevCount.current = legs.length;
  }, [legs.length]);
  // Editable stake text: lets the user clear the field to retype (the old
  // Math.max-on-every-keystroke snapped it back to 1 mid-edit).
  const [stakeText, setStakeText] = useState(String(stake));
  useEffect(() => setStakeText(String(stake)), [stake]);
  const commitStake = () => {
    setStake(parseStakeText(stakeText, stake));
  };

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open ]);

  const liveLegs = useLiveLegs(snap?.matches || []);
  const totals = useMemo(() => totalsPerBook(liveLegs), [liveLegs]);
  const mine = useMemo(
    () => (myBooks?.length ? totals.filter((t) => myBooks.includes(t.book)) : totals),
    [totals, myBooks]
  );
  const best = bestTotal(liveLegs);
  const bestMine = useMemo(() => (mine.filter((t) => !t.missing)[0] || best), [mine, best]);

  if (!legs.length) return null;
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        aria-label={`Show slip, ${liveLegs.length} legs`}
        title="Show slip"
        className="tabular fixed bottom-16 right-3 z-40 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-lime-400/40 bg-void/95 px-3 text-xs font-extrabold text-white shadow-2xl backdrop-blur md:bottom-6"
      >
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-lime-400 px-1 text-[11px] text-black">{liveLegs.length}</span>
        Slip ↑
      </button>
    );
  }
  const payout = bestMine && !bestMine.missing ? stake * bestMine.total : 0;
  const text = slipShareText(liveLegs, stake, bestMine?.missing === false ? bestMine : null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div key="backdrop" {...backdrop} className="fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-2xl px-3 md:bottom-20" role="dialog" aria-modal="true" aria-label="Bet slip">
            <motion.div {...sheet} className="halftone max-h-[60vh] overflow-y-auto rounded-2xl border-2 border-white/15 bg-void p-4 shadow-[6px_6px_0_#e63329]">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">My slip ({liveLegs.length})</span>
              <button onClick={clear} className="ml-auto rounded-lg px-3 py-2.5 text-xs text-slate-400 hover:text-red-300">Clear all</button>
              <button onClick={() => setOpen(false)} className="rounded-lg bg-white/10 px-3 py-2.5 text-xs font-bold text-white">Close</button>
            </div>
            <div className="space-y-1.5">
              {liveLegs.map((l) => (
                <div key={`${l.matchId}-${l.market}-${l.outcome}`} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 text-slate-200">
                    <b className="text-white">{l.pick}</b>
                    <span className="block truncate footnote">{l.home} vs {l.away} • {l.market}</span>
                  </span>
                  <span className="tabular font-bold text-white">@ <Odds v={l.price} /></span>
                  <span className="footnote">{l.book}</span>
                  <button onClick={() => remove(l)} className="grid h-8 min-w-8 place-items-center rounded-lg bg-white/10 px-2 text-base leading-none text-white" aria-label={`Remove ${l.pick}`}>×</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-1.5">
              {totals.slice(0, 5).map((t) => (
                <div key={t.book} className={`tabular flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${bestMine?.book === t.book && !t.missing ? 'bg-lime-400/15 font-bold text-lime-200' : 'bg-white/[0.03] text-slate-400'}`}>
                        <span>{t.book}{bestMine?.book === t.book && !t.missing ? <><span className="burst ml-1 inline-grid h-5 w-5 place-items-center bg-gold align-middle text-[10px] font-black text-ink">★</span>best</> : ''}</span>
                  <span className="ml-auto">{t.missing ? <span title="This book has no price on every leg — the total only counts books pricing all of them">missing leg</span> : <span>@ <Odds v={t.total} /> → GH₵{(stake * t.total).toFixed(2)}</span>}</span>
                </div>
              ))}
              {totals.length > 5 && (
                <div className="px-3 footnote">+{totals.length - 5} more books in the full slip →</div>
              )}
            </div>
            {bestMine && !bestMine.missing && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <BetNow book={bestMine.book} label="Bet this slip" />
                <span className="footnote">Odds change fast — confirm on {bestMine.book} before placing.</span>
              </div>
            )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="fixed inset-x-0 bottom-14 z-40 px-3 pb-2 md:bottom-0 md:pb-3">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border-2 border-white/15 bg-void/95 px-3 py-2 shadow-[4px_4px_0_#e63329] backdrop-blur">
          <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Hide slip' : `Show slip, ${liveLegs.length} legs`} className="flex min-h-[44px] items-center gap-2 text-left">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-lime-400 px-1.5 text-sm font-extrabold tabular-nums text-black">{liveLegs.length}</span>
            <span>
              <span className="tabular block text-sm font-extrabold text-white">
                {bestMine && !bestMine.missing ? <span>@ <Odds v={bestMine.total} /></span> : 'Slip'} <span className="text-xs font-normal text-slate-400">{bestMine && !bestMine.missing ? `best @ ${bestMine.book}` : 'tap to view'}</span>
              </span>
              <span className="tabular block text-xs font-bold text-lime-300">
                {bestMine && !bestMine.missing ? `GH₵${stake} pays GH₵${payout.toFixed(2)}` : 'add picks to see payout'}
              </span>
            </span>
          </button>
          <label className="tabular ml-auto flex min-h-[44px] items-center gap-1.5 text-xs text-slate-400">
            GH₵
            <input
              type="number" min="1" step="1" value={stakeText}
              onChange={(e) => setStakeText(e.target.value)}
              onBlur={commitStake}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className="w-20 rounded-lg bg-white/10 px-2 py-2 text-sm font-bold text-white" aria-label="Slip stake in cedis"
            />
          </label>
          <button onClick={copy} className="min-h-[44px] rounded-lg bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" title="Share slip on WhatsApp"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#25D366]/50 px-3 text-xs font-extrabold text-[#4ce080] hover:bg-[#25D366]/10">
            WhatsApp
          </a>
          <Link to="/slip" className="inline-flex min-h-[44px] items-center rounded-lg bg-lime-400 px-3 text-xs font-extrabold text-black">Open →</Link>
          <button
            onClick={() => { setOpen(false); setDismissed(true); }}
            aria-label="Hide slip bar"
            title="Hide slip bar (reopens from the Slip pill)"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lg leading-none text-slate-500 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
