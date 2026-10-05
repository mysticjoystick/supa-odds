import { devig3Way, devig2Way, fmtPct } from '../lib/math';
import { useTeamStyle } from '../lib/teamColor';

export function getWinProbs(m) {
  if (!m?.fair?.h || !m?.fair?.a) return null;
  if (m.fair?.d) {
    const [h, d, a] = devig3Way(m.fair.h, m.fair.d, m.fair.a);
    return { h, d, a, hasDraw: true };
  }
  const [h, a] = devig2Way(m.fair.h, m.fair.a);
  return { h, d: 0, a, hasDraw: false };
}

const DRAW_BAR = '#64748b';
const DRAW_INK = '#cbd5e1';

function Dot({ color }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}88` }}
    />
  );
}

// Compact inline readout: "● Home 45% • Draw 25% • ● Away 30%" — % numbers
// tinted with each club's logo colour.
export function WinChanceInline({ match, className = '' }) {
  const home = useTeamStyle(match?.home || '');
  const away = useTeamStyle(match?.away || '');
  const p = getWinProbs(match);
  if (!p) return null;
  return (
    <span className={`tabular text-xs text-slate-400 ${className}`} title="Win chance from the true price (sums to 100%)">
      <span className="inline-flex items-center gap-1">
        <Dot color={home.ink} />
        <b style={{ color: home.ink }}>{fmtPct(p.h, 0)}</b>
      </span>{' '}
      {match.home.slice(0, 14)}
      {p.hasDraw && (
        <> <span className="text-slate-400">•</span> <b style={{ color: DRAW_INK }}>{fmtPct(p.d, 0)}</b> Draw</>
      )}{' '}
      <span className="text-slate-400">•</span>{' '}
      <span className="inline-flex items-center gap-1">
        <Dot color={away.ink} />
        <b style={{ color: away.ink }}>{fmtPct(p.a, 0)}</b>
      </span>{' '}
      {match.away.slice(0, 14)}
    </span>
  );
}

// Compact stacked bar + rows. variant="compact" (lists/detail) or "inline".
export default function WinChance({ match, variant = 'compact' }) {
  const home = useTeamStyle(match?.home || '');
  const away = useTeamStyle(match?.away || '');
  const p = getWinProbs(match);
  if (!p) {
    return (
      <div className="text-xs text-slate-400" title="Chances appear once the sharp fair price syncs">
        No win % yet — prices still syncing.
      </div>
    );
  }
  return (
    <div className={variant === 'compact' ? '' : 'space-y-1.5'}>
      {/* stacked bar — always shown */}
      <div
        className="flex h-2 overflow-hidden rounded-full bg-white/5"
        title={`Win chance (true price): ${match.home} ${fmtPct(p.h, 0)}${p.hasDraw ? ` • Draw ${fmtPct(p.d, 0)}` : ''} • ${match.away} ${fmtPct(p.a, 0)}`}
        aria-label={`Win chances: ${match.home} ${fmtPct(p.h, 0)}, ${p.hasDraw ? `draw ${fmtPct(p.d, 0)}, ` : ''}${match.away} ${fmtPct(p.a, 0)}`}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${p.h * 100}%`, background: home.bar, boxShadow: `0 0 10px ${home.ink}55` }}
        />
        {p.hasDraw && <div className="h-full transition-all" style={{ width: `${p.d * 100}%`, background: DRAW_BAR }} />}
        <div
          className="h-full transition-all"
          style={{ width: `${p.a * 100}%`, background: away.bar, boxShadow: `0 0 10px ${away.ink}55` }}
        />
      </div>
      <div className="tabular mt-1 flex items-center gap-x-1.5 overflow-hidden whitespace-nowrap text-[11px] text-slate-400">
        <span className="inline-flex shrink-0 items-center gap-1">
          <Dot color={home.ink} />
          <b style={{ color: home.ink }}>{fmtPct(p.h, 0)}</b>
        </span>
        <span className="min-w-0 max-w-[90px] shrink truncate">{match.home}</span>
        {p.hasDraw && (
          <span className="shrink-0"><span className="text-slate-400">•</span> <b style={{ color: DRAW_INK }}>{fmtPct(p.d, 0)}</b> D</span>
        )}
        <span className="shrink-0 text-slate-400">•</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Dot color={away.ink} />
          <b style={{ color: away.ink }}>{fmtPct(p.a, 0)}</b>
        </span>
        <span className="min-w-0 max-w-[90px] shrink truncate">{match.away}</span>
      </div>
    </div>
  );
}
