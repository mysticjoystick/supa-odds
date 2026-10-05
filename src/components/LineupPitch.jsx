import { ratingColor } from '../lib/ratings';
import { teamInk } from '../lib/teamColor';

// Formation pitch: XI dots positioned from FotMob pitch coordinates,
// tinted by player rating. Display-only.
function Side({ team, flip }) {
  const ink = teamInk(team.name);
  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ink }} />
        <span className="truncate text-xs font-bold text-white">{team.name}</span>
        <span className="footnote">{team.formation}</span>
        {team.rating != null && (
          <span className="tabular ml-auto text-[11px] font-bold text-slate-300" title="FotMob team rating">★ {Number(team.rating).toFixed(1)}</span>
        )}
      </div>
      <div
        className="relative h-64 overflow-hidden rounded-xl border border-white/10"
        style={{
          background: 'linear-gradient(180deg, #0d2818 0%, #10331e 50%, #0d2818 100%)',
        }}
        role="img"
        aria-label={`${team.name} formation ${team.formation}`}
      >
        {/* pitch lines */}
        <div className="pointer-events-none absolute inset-2 rounded-lg border border-white/15" />
        <div className="pointer-events-none absolute left-1/2 top-2 bottom-2 w-px bg-white/15" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        {team.xi.map((p, i) => {
          const left = p.y == null ? 50 : Math.min(94, Math.max(6, p.y * 100));
          const topRaw = p.x == null ? 50 : p.x * 100;
          const top = Math.min(92, Math.max(8, flip ? topRaw : 100 - topRaw));
          const c = ratingColor(p.rating);
          return (
            <div
              key={`${p.name}-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${left}%`, top: `${top}%` }}
              title={`${p.name}${p.rating != null ? ` — rated ${Number(p.rating).toFixed(1)}` : ''}`}
            >
              <span
                className="tabular mx-auto grid h-6 w-6 place-items-center rounded-full border text-[10px] font-extrabold"
                style={{ backgroundColor: '#0a0e1a', borderColor: c, color: c }}
              >
                {p.shirt || p.name?.split(' ').map((w) => w[0]).slice(-2).join('')}
              </span>
              <span className="mt-0.5 block max-w-[64px] truncate text-[9px] font-semibold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                {p.name?.split(' ').slice(-1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LineupPitch({ match }) {
  const lu = match?.lineups;
  if (!lu?.home?.xi?.length) {
    return (
      <div className="sticker p-6 text-center text-sm text-slate-500">
        <div className="text-lg font-bold text-slate-300">Lineups not out yet</div>
        <p className="mt-1 text-xs">Confirmed XIs usually drop about an hour before kickoff — check back then.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Side team={lu.home} flip={false} />
        <Side team={lu.away} flip />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {['home', 'away'].map((k) => {
          const t = lu[k];
          if (!t.subs?.length && !t.missing?.length) return null;
          return (
            <div key={k} className="sticker p-4">
              <div className="mb-2 panel-title">{t.name?.toUpperCase()} — BENCH + OUT</div>
              {!!t.subs?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {t.subs.map((s, i) => (
                    <span key={i} title={s.name} className="max-w-[130px] truncate rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-slate-300">
                      {s.shirt ? `${s.shirt} · ` : ''}{s.name}
                    </span>
                  ))}
                </div>
              )}
              {!!t.missing?.length && (
                <div className="mt-2 footnote">
                  <span className="font-bold text-red-300">Out: </span>{t.missing.join(' • ')}
                </div>
              )}
              {t.coach && <div className="mt-2 footnote">Coach: <b className="text-slate-300">{t.coach}</b></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
