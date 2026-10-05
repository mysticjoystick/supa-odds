import { Link } from 'react-router-dom';
import TeamCrest from './TeamCrest';

// Recent form, head-to-head, and kickoff context — all from real data.
export default function FormStrip({ match }) {
  const form = match?.form;
  const pills = (arr) => (
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
      {(!arr || !arr.length) && <span className="footnote">—</span>}
    </span>
  );
  if (!form && !match?.h2h) {
    return (
      <div className="halftone sticker p-6 text-center text-sm text-slate-400">
        No form data on this fixture yet — see every team in the <Link to="/form" className="font-bold text-lime-300 hover:underline">Form explorer →</Link>
      </div>
    );
  }
  return (
    <div className="sticker p-4">
      <div className="mb-3 panel-title">FORM + HEAD-TO-HEAD</div>
      <div className="grid gap-2.5">
        {[match.home, match.away].map((name, i) => (
          <div key={name} className="flex items-center gap-2.5">
            <TeamCrest name={name} size={26} src={i === 0 ? match.crestHome : match.crestAway} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{name}</span>
            {pills(form?.[i === 0 ? 'home' : 'away'])}
          </div>
        ))}
      </div>
      {match.h2h && (
        <div className="tabular mt-3 border-t border-white/5 pt-2.5 text-center text-xs text-slate-400">
          H2H <b className="text-white">{match.h2h.homeWins} – {match.h2h.draws} – {match.h2h.awayWins}</b>
          <span className="text-slate-500"> ({match.home} wins – draws – {match.away} wins)</span>
        </div>
      )}
    </div>
  );
}
