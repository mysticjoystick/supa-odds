import TeamCrest from './TeamCrest';
import { teamInk } from '../lib/teamColor';
import { heatOf } from '../lib/ratings';

// Form battle: last-5 strips side by side with heat states + H2H scoreline.

export default function FormBattle({ match }) {
  const { form, h2h } = match || {};
  if (!form?.home?.length && !form?.away?.length && !h2h) return null;
  const pips = (arr) => (
    <span className="inline-flex gap-1">
      {(arr || []).map((c, i) => (
        <span
          key={i}
          data-r={c}
          title={c === 'W' ? 'Won' : c === 'D' ? 'Drew' : 'Lost'}
          className="form-pill"
        >
          {c}
        </span>
      ))}
    </span>
  );
  return (
    <div className="sticker p-4">
      <div className="mb-3 text-center text-[11px] font-bold tracking-widest text-amber-300">📊 FORM BATTLE</div>
      <div className="grid gap-2.5">
        {[match.home, match.away].map((name, i) => {
          const f = i === 0 ? form?.home : form?.away;
          const heat = heatOf(f);
          const ink = teamInk(name);
          return (
            <div key={name} className="flex flex-wrap items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
              <TeamCrest name={name} size={28} src={i === 0 ? match.crestHome : match.crestAway} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{name}</span>
              {heat && <span className={`text-[11px] font-extrabold ${heat.cls}`}>{heat.icon} {heat.label}</span>}
              {pips(f)}
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <span className="block h-full rounded-full" style={{ width: `${(((f || []).reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0)) / ((f || []).length * 3 || 1)) * 100}%`, background: ink }} />
              </span>
            </div>
          );
        })}
      </div>
      {h2h && (
        <div className="tabular mt-3 text-center text-xs text-slate-400">
          H2H <b className="text-white">{h2h.homeWins} – {h2h.draws} – {h2h.awayWins}</b>
        </div>
      )}
    </div>
  );
}
