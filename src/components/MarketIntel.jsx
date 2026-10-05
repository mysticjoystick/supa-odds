import { Link } from 'react-router-dom';
import LeagueBadge from './LeagueBadge';
import TeamCrest from './TeamCrest';
import { leagueMovers, divergenceStats, steamList, moveOf, spreadOf } from '../lib/market';

// Market intelligence — analytics product, not picks:
// which leagues move most, where books disagree, how often gaps appear,
// biggest steam. Opening → current → (close≈now until final).
export default function MarketIntel({ matches, leagues }) {
  const movers = leagueMovers(matches);
  const div = divergenceStats(matches, 5);
  const steam = steamList(matches, 8);
  const leagueName = (id) => leagues.find((l) => l.id === id)?.name || id;
  const maxAvg = Math.max(0.1, ...movers.map((r) => r.avg));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="sticker p-4">
        <div className="mb-1 panel-title">WHICH LEAGUES MOVE MOST</div>
        <div className="mb-2 footnote">Avg |open → now| on the home price. High = money moves late; low = settled boards.</div>
        {!movers.length && <div className="text-xs text-slate-400">No boards yet.</div>}
        {movers.slice(0, 6).map((r) => (
          <div key={r.leagueId} className="flex items-center gap-2 py-1">
            <span className="w-36 truncate"><LeagueBadge id={r.leagueId} name={leagueName(r.leagueId)} size="sm" /></span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-sky-400" style={{ width: `${Math.min(100, (r.avg / maxAvg) * 100)}%` }} />
            </div>
            <span className="tabular w-24 text-right text-xs text-slate-300">{r.avg.toFixed(1)}% · {r.n}</span>
          </div>
        ))}
      </div>

      <div className="sticker p-4">
        <div className="mb-1 panel-title">BOOK DISAGREEMENT — HOME PRICE</div>
        <div className="mb-2 footnote">
          {div.n ? (
            <><b className="text-white">{div.discrepN}/{div.n}</b> boards disagree ≥5% ({div.freq.toFixed(0)}%) • avg spread <b className="text-white">{div.avgSpread.toFixed(1)}%</b>. Wide spreads = line-shopping matters most.</>
          ) : 'Spreads appear when 2+ books price a match.'}
        </div>
        <div className="space-y-1.5">
          {div.top.map(({ m, spreadPct, best, worst }) => (
            <Link key={m.id} to={`/match/${m.id}`} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 hover:bg-white/[0.06]">
              <TeamCrest name={m.home} size={20} src={m.crestHome} />
              <span className="flex-1 truncate text-xs text-slate-200">{m.home} vs {m.away}</span>
              <span className="tabular footnote">{worst.book} {worst.v.toFixed(2)} → {best.book} {best.v.toFixed(2)}</span>
              <b className={`tabular text-xs ${spreadPct >= 5 ? 'text-amber-300' : 'text-slate-300'}`}>{spreadPct.toFixed(1)}%</b>
            </Link>
          ))}
          {!div.top.length && <div className="text-xs text-slate-400">Need 2+ books per match to measure disagreement.</div>}
        </div>
      </div>

      <div className="sticker p-4 md:col-span-2">
        <div className="mb-1 flex items-center gap-2 panel-title">
          STEAM BOARD — OPEN → NOW
          <span className="font-normal text-slate-500">▼ shortened (money in) • ▲ drifted • {steam.length} boards moved ≥8%</span>
        </div>
        {!steam.length ? (
          <div className="text-xs text-slate-400">No steam ≥8% right now — calm market. Lower moves live under Movers.</div>
        ) : (
          <div className="grid gap-1.5 md:grid-cols-2">
            {steam.slice(0, 6).map(({ m, move, abs }) => {
              const open = m.movement?.[0];
              const now = m.movement?.[m.movement.length - 1];
              const s = spreadOf(m, 'h');
              return (
                <Link key={m.id} to={`/match/${m.id}`} className="tabular flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs hover:bg-white/[0.06]">
                  <span className="flex-1 truncate text-slate-200"><b className="text-white">{m.home}</b> vs {m.away}</span>
                  <span className="text-slate-500">{open?.toFixed(2)} → {now?.toFixed(2)}</span>
                  <b className={move <= 0 ? 'text-lime-300' : 'text-red-300'}>{move <= 0 ? '▼' : '▲'} {abs.toFixed(1)}%</b>
                  {s && <span className="hidden text-slate-400 lg:inline">spread {s.spreadPct.toFixed(1)}%</span>}
                </Link>
              );
            })}
          </div>
        )}
        <div className="mt-2 footnote">
          Opening {`→`} current {`→`} closing (close locks at final; until then now ≈ close). Movement describes money flow — chasing steam after the move usually means the value is gone. Full per-book trails in History.
        </div>
      </div>
    </div>
  );
}

export { moveOf };
