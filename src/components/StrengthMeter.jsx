import { getWinProbs } from './WinChance';
import { teamInk } from '../lib/teamColor';
import { formPoints, teamOverall } from '../lib/ratings';
import Stars from './Stars';

// Video-game style team strength: FIFA-like overall blended from REAL last-5
// form and the fair win chance. H2H shown as a scoreline, never a bar.
function FormPips({ form }) {
  if (!form?.length) return <span className="footnote">no recent form</span>;
  return (
    <span className="inline-flex gap-1" title={`Last ${form.length}: ${form.join(' ')}`}>
      {form.map((c, i) => (
        <span
          key={i}
          className={`grid h-5 w-5 place-items-center rounded text-[10px] font-extrabold ${
            c === 'W' ? 'bg-lime-400/20 text-lime-300' : c === 'D' ? 'bg-white/10 text-slate-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

export default function StrengthMeter({ match }) {
  const p = getWinProbs(match);
  if (!match?.form && !p) return null;
  const sides = [
    { name: match.home, form: match.form?.home, prob: p?.h },
    { name: match.away, form: match.form?.away, prob: p?.a },
  ];
  const showForm = sides.some((s) => s.form?.length);
  if (!showForm && !p) return null;
  return (
    <div className="sticker p-4 sm:p-5">
      <div className="mb-3 panel-title">TEAM STRENGTH — FORM + FAIR CHANCE</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map((s) => {
          const f = formPoints(s.form);
          const overall = teamOverall(s.form, s.prob);
          const ink = teamInk(s.name);
          const stars = overall != null ? Math.min(5, overall / 20) : null;
          return (
            <div key={s.name} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ink }} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{s.name}</span>
                {overall != null && (
                  <span className="tabular text-2xl font-black" style={{ color: ink }} title="Overall blends last-5 form with fair win chance">
                    {overall}
                  </span>
                )}
              </div>
              {stars != null && (
                <div className="mt-1 flex items-center gap-1.5" title={`Club rating ${stars.toFixed(1)} out of 5 stars`}>
                  <Stars value={stars} size={13} />
                  <span className="tabular text-[11px] font-bold text-slate-400">{stars.toFixed(1)}★</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2 footnote">
                <span>Form</span>
                <FormPips form={s.form} />
              </div>
              {f && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5" title={`${f.pts} pts from last ${f.n}`}>
                  <div className="h-full rounded-full" style={{ width: `${(f.avg / 3) * 100}%`, background: ink }} />
                </div>
              )}
              {s.prob != null && (
                <>
                  <div className="mt-2 flex items-center justify-between gap-2 footnote">
                    <span>Fair chance</span>
                    <b className="tabular text-slate-200">{Math.round(s.prob * 100)}%</b>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${s.prob * 100}%`, background: ink }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {match.h2h && (
        <div className="tabular mt-3 text-center footnote">
          Head-to-head: <b className="text-slate-300">{match.h2h.homeWins}</b> {match.home} wins · <b className="text-slate-300">{match.h2h.draws}</b> draws · <b className="text-slate-300">{match.h2h.awayWins}</b> {match.away} wins
        </div>
      )}
    </div>
  );
}
