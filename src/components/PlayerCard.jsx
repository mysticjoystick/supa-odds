import { useEffect, useRef } from 'react';
import Headshot from './Headshot';
import Stars, { starsOf } from './Stars';
import { ratingColor } from '../lib/ratings';
import { teamInk } from '../lib/teamColor';

// FC-style player card modal. Tap anywhere on a rated player to open.
// 3D tilt on fine pointers only; honors reduced motion.
export default function PlayerCard({ p, team, kind, rank, total, avg, onClose }) {
  const cardRef = useRef(null);
  const ink = teamInk(team);
  const c = ratingColor(p.rating);
  const delta = p.rating != null && avg != null ? p.rating - avg : null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const tilt = (e) => {
    const el = cardRef.current;
    if (!el || e.pointerType !== 'mouse') return;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch { /* ignore */ }
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
    el.style.transform = `perspective(700px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg)`;
  };
  const untilt = () => {
    if (cardRef.current) cardRef.current.style.transform = '';
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`${p.name} player card`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={cardRef}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className="relative w-full max-w-[300px] overflow-hidden rounded-3xl border p-5 text-center transition-transform duration-150"
        style={{ borderColor: `${ink}55`, background: `linear-gradient(165deg, ${ink}26 0%, #111827 55%)`, boxShadow: `0 24px 80px -12px ${ink}55` }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl" style={{ backgroundColor: `${ink}33` }} />
        <button
          onClick={onClose}
          autoFocus
          aria-label="Close player card"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg leading-none text-white hover:bg-white/20"
        >
          ×
        </button>
        <div className="tabular text-[11px] font-bold tracking-widest" style={{ color: ink }}>
          {kind === 'match' ? 'MATCH RATING' : 'SEASON RATING'}
        </div>
        <div className="tabular mt-1 text-6xl font-black" style={{ color: c, textShadow: `0 0 32px ${c}66` }}>
          {p.rating != null ? Number(p.rating).toFixed(1) : '–'}
        </div>
        <Stars value={starsOf(p.rating)} size={16} className="mt-1 justify-center" />
        <div className="mx-auto mt-3 w-fit">
          <Headshot id={p.id} name={p.name} size={88} className="ring-2" />
        </div>
        <div className="mt-2 truncate text-xl font-extrabold text-white">{p.name}</div>
        <div className="tabular text-xs text-slate-400">
          {[p.pos, p.shirt ? `#${p.shirt}` : null, team].filter(Boolean).join(' • ')}
        </div>
        <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-left text-xs leading-relaxed text-slate-300">
          <div>Ranked <b className="text-white">#{rank} of {total}</b> rated at {team}.</div>
          {(p.goals || p.assists) ? (
            <div>⚽ {p.goals || 0} goals • 🅰 {p.assists || 0} assists {kind === 'match' ? 'in this match' : 'this season'}.</div>
          ) : (
            <div>No goals or assists {kind === 'match' ? 'in this match' : 'yet this season'} — rating built on all-round play.</div>
          )}
          {delta != null && (
            <div>
              {delta >= 0 ? '+' : ''}{delta.toFixed(2)} vs the rated squad average ({avg.toFixed(2)})
              {rank === 1 ? <> — <b className="text-amber-300">highest-rated at the club</b>.</> : '.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
