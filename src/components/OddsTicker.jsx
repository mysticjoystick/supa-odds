import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TeamCrest from './TeamCrest';
import ValueBadge from './ValueBadge';
import LiveBadge from './LiveBadge';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES } from '../lib/mock';
import { devig3Way, devig2Way, evPercent, bestPrice } from '../lib/math';
import { Odds } from '../lib/oddsFormat';

function topMoves(matches) {
  return matches.map((m) => {
    const books = Object.values(m.prices || {});
    if (!books.length) return { m, best: { ev: 0, price: 0 }, move: 0 };
    const probs = m.fair?.d ? devig3Way(m.fair.h, m.fair.d, m.fair.a) : [...devig2Way(m.fair?.h || 2, m.fair?.a || 2), 0];
    const keys = ['h', 'd', 'a'];
    let best = { ev: -1, key: 'h', price: 0 };
    keys.forEach((k, i) => {
      if (!m.fair?.[k]) return;
      const p = bestPrice(books.map((b) => b[k]));
      const ev = evPercent(probs[i], p);
      if (ev > best.ev) best = { ev, key: k, price: p };
    });
    const mv = m.movement?.length > 1 ? ((m.movement[0] - m.movement[m.movement.length - 1]) / m.movement[0]) * 100 : 0;
    return { m, best, move: mv };
  }).sort((a, b) => b.best.ev - a.best.ev);
}

export default function OddsTicker() {
  const snap = useSnapshot();
  const matches = snap?.matches?.length ? snap.matches : MATCHES;
  // Highlight reel only: below-zero edges stay off the banner. Fair lines
  // (0 to MIN_EDGE) keep their muted gray badge; real value glows green.
  const items = useMemo(() => topMoves(matches).filter((x) => x.best.ev >= 0), [matches]);
  const [paused, setPaused] = useState(false);
  const row = [...items, ...items]; // loop seam
  if (!items.length) return null;
  // Constant travel speed no matter how many pills are on the board.
  const duration = Math.max(24, items.length * 4);
  return (
    <div className={`ticker-wrap overflow-hidden border-b border-white/10 bg-void ${paused ? 'ticker-paused' : ''}`}>
      <div className="flex items-stretch">
        <button
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
          aria-label={paused ? 'Resume odds ticker' : 'Pause odds ticker'}
          title={paused ? 'Resume' : 'Pause'}
          className="z-10 grid w-10 shrink-0 place-items-center border-r border-white/10 bg-void text-sm text-slate-400 hover:text-white"
        >
          {paused ? '▶' : '⏸'}
        </button>
        <div className="overflow-hidden">
          <div className="ticker-track flex w-max items-center gap-3 px-4 py-2" style={{ animationDuration: `${duration}s` }} role="marquee" aria-label="Top value moves">
            {row.map(({ m, best, move }, i) => (
              <Link key={`${m.id}-${i}`} to={`/match/${m.id}`} aria-hidden={i >= items.length} tabIndex={i >= items.length ? -1 : 0}
                title={`${m.home} vs ${m.away} — open match`} className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs whitespace-nowrap hover:border-lime-400/40 hover:bg-white/[0.07]">
                {m.live ? <LiveBadge minute={m.minute} /> : <TeamCrest name={m.home} size={20} src={m.crestHome} />}
                <span className="font-semibold text-white">{m.home} vs {m.away}</span>
                {best.price ? (
                  <>
                    <span className="text-slate-300"><Odds v={best.price} /></span>
                    <ValueBadge ev={best.ev} />
                  </>
                ) : (
                  <span className="text-slate-500">odds soon</span>
                )}
                <span className={`tabular font-bold ${move >= 0 ? 'text-lime-300' : 'text-red-300'}`} title={move >= 0 ? 'Home price shortening (steam)' : 'Home price drifting'} aria-label={move >= 0 ? `Shortening ${Math.abs(move).toFixed(1)} percent` : `Drifting ${Math.abs(move).toFixed(1)} percent`}>
                  {move >= 0 ? '▼' : '▲'} {Math.abs(move).toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
