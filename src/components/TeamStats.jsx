import { Link } from 'react-router-dom';
import TeamCrest from './TeamCrest';

function FormPills({ form }) {
  return (
    <span className="flex gap-1">
      {(form || []).map((r, i) => (
        <span
          key={i}
          data-r={r}
          title={r === 'W' ? 'Won' : r === 'D' ? 'Drew' : 'Lost'}
          className="form-pill"
        >
          {r}
        </span>
      ))}
    </span>
  );
}

function StatBar({ label, home, away, lowerBetter = false, suffix = '' }) {
  if (home == null || away == null) return null;
  const total = home + away || 1;
  const hpct = Math.round((home / total) * 100);
  const hBetter = lowerBetter ? home < away : home > away;
  return (
    <div className="py-1">
      <div className="tabular mb-1 flex justify-between text-xs">
        <span className={hBetter ? 'font-bold text-lime-300' : 'text-slate-300'}>{home}{suffix}</span>
        <span className="text-slate-500">{label}</span>
        <span className={!hBetter ? 'font-bold text-lime-300' : 'text-slate-300'}>{away}{suffix}</span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-white/5">
        <div className="rounded-full bg-lime-400/70" style={{ width: `${hpct}%` }} />
        <div className="rounded-full bg-sky-400/70" style={{ width: `${100 - hpct}%` }} />
      </div>
    </div>
  );
}

export default function TeamStats({ match }) {
  const s = match.stats;
  if (!s) {
    return (
      <div className="halftone sticker p-6 text-center text-sm text-slate-400">
        No team stats on this fixture yet — try the <Link to="/form" className="font-bold text-lime-300 hover:underline">Form explorer →</Link>
      </div>
    );
  }
  const isHoops = !s.home.xg;
  return (
    <div className="sticker p-4">
      <div className="mb-3 panel-title">TEAM STATS — LAST 5 + SEASON AVG</div>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          [match.home, s.home, '#a3e635', match.crestHome],
          [match.away, s.away, '#38bdf8', match.crestAway],
        ].map(([name, t, , crest]) => (
          <div key={name} className="rounded-xl bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center gap-2">
              <TeamCrest name={name} size={28} src={crest} />
              <span className="font-bold text-white">{name}</span>
            </div>
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Form</span>
              <FormPills form={t.form} />
            </div>
            <div className="tabular space-y-1 text-xs text-slate-400">
              <div className="flex justify-between"><span>{isHoops ? 'Scored' : 'Goals for'}</span><b className="text-white">{t.gf}</b></div>
              <div className="flex justify-between"><span>{isHoops ? 'Allowed' : 'Goals against'}</span><b className="text-white">{t.ga}</b></div>
              <div className="flex justify-between"><span>Venue</span><b className="text-white">{t.homeRecord}</b></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-white/5 pt-2">
        {!isHoops && (
          <>
            <StatBar label="Expected goals (xG)" home={s.home.xg} away={s.away.xg} />
            <StatBar label="xG allowed" home={s.home.xga} away={s.away.xga} lowerBetter />
          </>
        )}
        <StatBar label={isHoops ? 'Points scored' : 'Goals scored'} home={s.home.gf} away={s.away.gf} />
      </div>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-slate-300">⚔️ <b className="text-white">H2H:</b> {s.h2h}</div>
        <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-slate-300">🏥 <b className="text-white">News:</b> {s.injuries.join(' • ')}</div>
      </div>
    </div>
  );
}
