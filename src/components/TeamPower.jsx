import { teamInk } from '../lib/teamColor';
import { formPoints, heatOf } from '../lib/ratings';
import Stars from './Stars';

// Honest team power: overall stars + form + fair chance, each expandable to
// show its real inputs. No invented attack/midfield splits.
function Bar({ label, pct, color, detail, hint }) {
  return (
    <div title={hint}>
      <div className="flex items-center justify-between footnote">
        <span>{label}</span>
        <b className="tabular text-slate-200">{detail}</b>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, Math.min(100, pct))}%`, background: color }} />
      </div>
    </div>
  );
}

export default function TeamPower({ match, overall, fairH, fairA }) {
  const sides = [
    { name: match.home, form: match.form?.home, fair: fairH },
    { name: match.away, form: match.form?.away, fair: fairA },
  ];
  if (!overall.home && !overall.away && !sides.some((s) => s.form?.length)) return null;
  const card = (s, ov) => {
    const ink = teamInk(s.name);
    const stars = ov != null ? Math.min(5, ov / 20) : null;
    return (
      <div>
        <div className="truncate text-sm font-extrabold text-white">{s.name}</div>
        {ov != null && (
          <>
            <div className="tabular text-3xl font-black" style={{ color: ink }}>{ov}</div>
            <Stars value={stars} size={13} className="justify-center" />
          </>
        )}
      </div>
    );
  };
  return (
    <div className="overflow-hidden sticker p-4 sm:p-5">
      <div className="mb-1 text-center text-[11px] font-bold tracking-widest text-amber-300">🏆 TEAM POWER</div>
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        {card(sides[0], overall.home)}
        <div className="text-xl font-black text-slate-400">VS</div>
        {card(sides[1], overall.away)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map((s) => {
          const ink = teamInk(s.name);
          const f = formPoints(s.form);
          const heat = heatOf(s.form);
          return (
            <div key={s.name} className="space-y-2 rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ink }} />
                <span className="truncate text-xs font-bold text-white">{s.name}</span>
                {heat && <span className={`ml-auto text-[11px] font-extrabold ${heat.cls}`}>{heat.icon} {heat.label}</span>}
              </div>
              {f && (
                <Bar
                  label="Form"
                  pct={(f.avg / 3) * 100}
                  color={ink}
                  detail={`${f.pts} pts / last ${f.n}`}
                  hint={`Last ${f.n}: ${(s.form || []).join(' ')} — 3 pts a win`}
                />
              )}
              {s.fair != null && (
                <Bar
                  label="Fair chance"
                  pct={s.fair * 100}
                  color={ink}
                  detail={`${Math.round(s.fair * 100)}%`}
                  hint="True price from the sharp books, sums to 100%"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
