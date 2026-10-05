import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSlip, totalsPerBook, bestTotal, slipShareText, whatsappUrl, useLiveLegs, parseStakeText } from '../lib/slip';
import { useSnapshot } from '../hooks/useSnapshot';
import { useMyBooks } from '../lib/myBooks';
import { Odds } from '../lib/oddsFormat';
import MyBooksPicker from '../components/MyBooksPicker';
import BetNow from '../components/BetNow';
import { rise } from '../lib/motion';

export default function Slip() {
  const { legs, stake, setStake, remove, clear } = useSlip();
  const snap = useSnapshot();
  const matches = snap?.matches || [];
  const { myBooks } = useMyBooks();
  const [copied, setCopied] = useState(false);
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [stakeText, setStakeText] = useState(String(stake));
  useEffect(() => setStakeText(String(stake)), [stake]);
  const commitStake = () => {
    setStake(parseStakeText(stakeText, stake));
  };
  const liveLegs = useLiveLegs(matches);
  const totals = useMemo(() => totalsPerBook(liveLegs), [liveLegs]);
  const visibleTotals = useMemo(() => {
    const mine = totals.filter((t) => myBooks.includes(t.book));
    return mine.length ? mine : totals;
  }, [totals, myBooks]);
  const best = bestTotal(liveLegs);

  const text = slipShareText(liveLegs, stake, best?.missing === false ? best : null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="hero-grid halftone relative overflow-hidden rounded-2xl border-2 border-white/15 bg-void px-5 py-4 shadow-[4px_4px_0_#e63329]">
        <div className="relative flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-normal text-white">My slip</h1>
          {!!legs.length && (
            <span className="burst inline-grid h-10 w-10 shrink-0 place-items-center bg-supa text-sm font-black text-white" title={`${legs.length} legs on the slip`}>
              {legs.length > 99 ? '99+' : legs.length}
            </span>
          )}
          <p className="w-full text-sm text-slate-400">
            Build your acca here, then confirm it on the book&apos;s site. Best payout wins — green marks the highest total odds.
          </p>
        </div>
      </div>
      {!legs.length ? (
        <div className="halftone rounded-2xl border-2 border-white/15 bg-panel p-6 text-center text-sm text-slate-400 shadow-[4px_4px_0_#e63329]">
          <div className="font-display text-xl font-normal text-white">EMPTY SLIP!</div>
          <p className="mx-auto mt-1 max-w-md">Slip is empty. Tap any <b className="text-white">1 X 2</b> price — Today, Compare or Match page — and it lands here.</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Link to="/" className="inline-flex min-h-[44px] items-center rounded-lg bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15">Find matches →</Link>
            <Link to="/builder" className="inline-flex min-h-[44px] items-center rounded-lg bg-lime-400 px-4 text-sm font-extrabold text-black hover:bg-lime-300">✦ Auto-build for me →</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {liveLegs.map((l, i) => (
                  <motion.div key={`${l.matchId}-${l.market}-${l.outcome}`} {...rise(i, 0.04, 0.25)} className="flex flex-wrap items-center gap-2 sticker px-4 py-3 transition-shadow hover:border-white/20 hover:shadow-[3px_3px_0_#e63329]">
                    <div className="min-w-[200px] flex-1">
                      <div className="text-sm font-bold text-white">{l.pick} <span className="tabular">@ <Odds v={l.price} /></span></div>
                      <div className="text-xs text-slate-400">{l.home} vs {l.away} • {l.market}{l.line ? ` ${l.line}` : ''} • best @ {l.book}</div>
                      <Link to={`/match/${l.matchId}`} className="inline-block rounded px-1 py-2 text-[11px] font-bold text-lime-300 hover:underline">Open match →</Link>
                    </div>
                    <button onClick={() => remove(l)} aria-label={`Remove ${l.pick}`} className="comic-btn inline-flex min-h-[44px] items-center rounded-xl bg-red-500/15 px-3 text-xs font-bold text-red-200">Remove</button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={clear} className="rounded px-2 py-2 text-xs text-slate-400 hover:text-red-300">Clear slip</button>
            </div>
            <div className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl border-2 border-lime-400/40 bg-panel p-4 shadow-[4px_4px_0_#e63329]">
                <div className="panel-title mb-2">STAKE + PAYOUT (GH₵)</div>
                <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-300">
                  Stake GH₵
                    <input type="number" min="1" step="1" value={stakeText}
                      onChange={(e) => setStakeText(e.target.value)}
                      onBlur={commitStake}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="field tabular w-24 font-bold text-white" aria-label="Slip stake in cedis" />
                </label>
                <div className="mt-3 space-y-1.5">
                  {(showAllBooks ? visibleTotals : visibleTotals.slice(0, 3)).map((t) => (
                    <div key={t.book} className={`tabular flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${best?.book === t.book && !t.missing ? 'bg-lime-400/15 font-bold text-lime-200' : 'bg-white/[0.03] text-slate-300'}`}>
                      <span>{t.book} {best?.book === t.book && !t.missing ? <><span className="burst mr-1 inline-grid h-5 w-5 place-items-center bg-gold align-middle text-[10px] font-black text-ink">★</span>best</> : ''}</span>
                      <span className="ml-auto">{t.missing ? <span title={`${t.book} has no price on every leg — switch books or drop the leg`}>missing leg</span> : <span>@ <Odds v={t.total} /> → GH₵{(stake * t.total).toFixed(2)}</span>}</span>
                    </div>
                  ))}
                  {visibleTotals.length > 3 && (
                    <button
                      onClick={() => setShowAllBooks(!showAllBooks)}
                      aria-expanded={showAllBooks}
                      className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-3 text-[11px] font-bold text-slate-300 hover:text-white"
                    >
                      {showAllBooks ? 'Show fewer books' : `Show all ${visibleTotals.length} books`}
                    </button>
                  )}
                </div>
                {best && !best.missing && (
                  <div className="mt-3">
                    <BetNow book={best.book} label="Bet this acca" className="w-full text-center" />
                    <div className="mt-1 footnote">Odds move — confirm every leg on {best.book} before placing. 18+ only.</div>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={copy} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15">{copied ? '✓ Copied!' : 'Copy slip'}</button>
                  <a href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-[#25D366]/50 px-3 text-center text-xs font-extrabold text-[#4ce080] hover:bg-[#25D366]/10">Share on WhatsApp</a>
                </div>
                <button
                  onClick={() => setShowShare(!showShare)}
                  aria-expanded={showShare}
                  className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl px-3 text-[11px] font-bold text-slate-400 hover:text-white"
                >
                  {showShare ? 'Hide share text' : 'Preview share text'}
                </button>
                {showShare && (
                  <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-[11px] leading-relaxed text-slate-400">{text}</pre>
                )}
              </div>
              <MyBooksPicker compact />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
