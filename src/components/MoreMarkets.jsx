import { Link } from 'react-router-dom';
import { Odds } from '../lib/oddsFormat';
import ValueBadge from './ValueBadge';

// Totals (O/U) + BTTS panels with best price vs fair-implied EV. Research framing.
export default function MoreMarkets({ match }) {
  const t = match.totals;
  const b = match.btts;
  if (!t && !b) return null;
  const isHoops = match.leagueId === 'nba';
  const goalWord = isHoops ? 'pts' : 'goals';

  const evOf = (price, fair) => (fair > 1 ? (1 / fair) * price - 1 : 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {t && (
        <div className="sticker p-4">
          <div className="mb-2 panel-title">
            TOTALS — {isHoops ? `O/U ${t.line} PTS` : `O/U ${t.line} GOALS`}
          </div>
          {[
            ['Over', t.over, t.fairOver, 1 / t.fairOver],
            ['Under', t.under, t.fairOver > 1 ? t.fairOver / (t.fairOver - 1) : null, t.fairOver > 1 ? 1 - 1 / t.fairOver : null],
          ].map(([label, side, fair]) => {
            const ev = evOf(side.o, fair);
            return (
              <div key={label} className="tabular mb-1.5 flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span className="text-slate-300">{label} {t.line} <span className="text-xs text-slate-400">({side.b})</span></span>
                <span className="flex items-center gap-2">
                  <b className="text-white"><Odds v={side.o} /></b>
                  <ValueBadge ev={ev} />
                  <Link
                    to="/tracker"
                    state={{ prefill: { match: `${match.home} vs ${match.away}`, pick: `${label} ${t.line} @ ${side.b}`, taken: side.o, close: side.o, fair, ev, book: side.b, leagueId: match.leagueId, market: 'totals', source: 'Supa Odds' } }}
                    className="rounded-lg bg-lime-400/15 px-2 py-1 text-[11px] font-bold text-lime-300 hover:bg-lime-400/25"
                  >
                    + Log
                  </Link>
                </span>
              </div>
            );
          })}
          <div className="mt-1 footnote">Fair over {t.fairOver.toFixed(2)} (sharp ref). {match.live && match.score ? `Live score ${match.score.home}–${match.score.away} — pace matters more than the line now.` : 'Pre-match: compare pace + xG, not gut feel.'}</div>
        </div>
      )}
      {b && (
        <div className="sticker p-4">
          <div className="mb-2 panel-title">BOTH TEAMS TO SCORE</div>
          {[
            ['Yes', b.yes, b.fairYes],
            ['No', b.no, b.fairYes > 1 ? b.fairYes / (b.fairYes - 1) : null],
          ].map(([label, side, fair]) => {
            const ev = evOf(side.o, fair);
            return (
              <div key={label} className="tabular mb-1.5 flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span className="text-slate-300">{label} <span className="text-xs text-slate-400">({side.b})</span></span>
                <span className="flex items-center gap-2">
                  <b className="text-white"><Odds v={side.o} /></b>
                  <ValueBadge ev={ev} />
                  <Link
                    to="/tracker"
                    state={{ prefill: { match: `${match.home} vs ${match.away}`, pick: `BTTS ${label} @ ${side.b}`, taken: side.o, close: side.o, fair, ev, book: side.b, leagueId: match.leagueId, market: 'btts', source: 'Supa Odds' } }}
                    className="rounded-lg bg-lime-400/15 px-2 py-1 text-[11px] font-bold text-lime-300 hover:bg-lime-400/25"
                  >
                    + Log
                  </Link>
                </span>
              </div>
            );
          })}
          <div className="mt-1 footnote">
            {match.stats?.h2h || 'Check H2H scoring patterns before weighing this market.'}
          </div>
        </div>
      )}
    </div>
  );
}
