import { useEffect, useMemo, useState } from 'react';
import HistoryChart from '../components/HistoryChart';
import TeamCrest from '../components/TeamCrest';
import LeagueBadge from '../components/LeagueBadge';
import { Odds } from '../lib/oddsFormat';
import { useSnapshot } from '../hooks/useSnapshot';
import { getHistory, seriesFor, summarize, fmtTime } from '../lib/history';
import { MATCHES, LEAGUES } from '../lib/mock';
import { ProGate, ProTeaser } from '../lib/pro';

const OUTCOMES = [
  ['h', 'Home win (1)'],
  ['d', 'Draw (X)'],
  ['a', 'Away win (2)'],
];

function outcomeLabel(m, o) {
  return o === 'h' ? m.home : o === 'a' ? m.away : 'Draw';
}

function Explorer({ matches, leagues, books }) {
  const [league, setLeague] = useState(() => matches[0]?.leagueId || leagues[0]?.id || 'epl');
  const leagueMatches = useMemo(() => matches.filter((m) => m.leagueId === league), [matches, league]);
  const [matchId, setMatchId] = useState(null);
  const [book, setBook] = useState(null);
  const [outcome, setOutcome] = useState('h');
  const [hist, setHist] = useState(null);
  const [loadingHist, setLoadingHist] = useState(true);

  // Keep league valid as snapshot loads.
  useEffect(() => {
    if (!matches.length) return;
    if (!matches.some((m) => m.leagueId === league)) setLeague(matches[0].leagueId);
  }, [matches, league]);
  // Keep match selection valid.
  useEffect(() => {
    if (!leagueMatches.length) { setMatchId(null); return; }
    if (!leagueMatches.some((m) => m.id === matchId)) setMatchId(leagueMatches[0].id);
  }, [leagueMatches, matchId, league]);
  const match = leagueMatches.find((m) => m.id === matchId) || leagueMatches[0] || null;
  const availBooks = useMemo(() => books.filter((b) => match?.prices?.[b]), [books, match]);
  const availOutcomes = useMemo(() => OUTCOMES.filter(([o]) => match?.fair?.[o] != null), [match]);
  useEffect(() => {
    if (!availBooks.length) { setBook(null); return; }
    if (!availBooks.includes(book)) setBook(availBooks[0]);
  }, [availBooks, book]);
  useEffect(() => {
    if (!availOutcomes.length) return;
    if (!availOutcomes.some(([o]) => o === outcome)) setOutcome(availOutcomes[0][0]);
  }, [availOutcomes, outcome]);

  useEffect(() => {
    setLoadingHist(true);
    getHistory().then(setHist).catch(() => setHist({})).finally(() => setLoadingHist(false));
  }, []);

  const series = hist && match && book ? seriesFor(hist, match.id, book, outcome) : [];
  const sum = summarize(series);

  if (!matches.length) {
    return <div className="sticker p-6 text-center text-sm text-slate-400">No fixtures to explore yet — check back when the feed syncs.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <label className="text-xs text-slate-400">League
          <select value={league} onChange={(e) => setLeague(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 px-2 py-2 text-sm text-white">
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Match
          <select value={match?.id || ''} onChange={(e) => setMatchId(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 px-2 py-2 text-sm text-white">
            {leagueMatches.map((m) => <option key={m.id} value={m.id}>{m.home} vs {m.away}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Outcome
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 px-2 py-2 text-sm text-white">
            {availOutcomes.map(([o, l]) => <option key={o} value={o}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Book
          <select value={book || ''} onChange={(e) => setBook(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 px-2 py-2 text-sm text-white">
            {availBooks.length ? availBooks.map((b) => <option key={b} value={b}>{b}</option>) : <option value="">No priced books</option>}
          </select>
        </label>
      </div>

      {match && (
        <div className="sticker p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <TeamCrest name={match.home} size={26} src={match.crestHome} />
            <span className="font-bold text-white">{outcomeLabel(match, outcome)} <span className="text-xs font-normal text-slate-400">@ {book || '—'}</span></span>
            {sum && (
              <span className={`tabular ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${sum.changePct <= 0 ? 'bg-lime-400/15 text-lime-300' : 'bg-red-500/15 text-red-300'}`}>
                {sum.changePct <= 0 ? '▼' : '▲'} {Math.abs(sum.changePct).toFixed(1)}% all-time
              </span>
            )}
          </div>
          {loadingHist ? (
            <div className="shimmer h-32 rounded-xl" aria-label="Loading price trail" />
          ) : !book ? (
            <div className="rounded-xl bg-white/5 p-4 text-center text-xs text-slate-400">This match has no priced books yet — prices appear when the feed syncs.</div>
          ) : !series.length ? (
            <div className="rounded-xl bg-white/5 p-4 text-center text-xs text-slate-400">No tick history for {book} • {outcomeLabel(match, outcome)} yet — the archive fills as the feed ticks. Try another book or outcome.</div>
          ) : (
          <>
          <HistoryChart series={series} height={140} />
          {sum && (
            <div className="tabular mt-3 grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-5">
              {[['Open', sum.open], ['High', sum.high], ['Low', sum.low], ['Now', sum.now]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/5 p-2">
                  <div className="footnote">{l}</div>
                  <div className="font-extrabold text-white"><Odds v={v} /></div>
                </div>
              ))}
              <div className="rounded-xl bg-white/5 p-2">
                <div className="footnote">Biggest jump</div>
                <div className="font-extrabold text-white">{sum.biggest.pct >= 0 ? '+' : ''}{sum.biggest.pct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-400">{fmtTime(sum.biggest.at)}</div>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
}

function Archive({ matches, leagues }) {
  const rows = matches.map((m) => {
    // Home-price trail from the snapshot (open → now). Per-book ticks live in Explorer above.
    const o = m.movement?.length > 1 ? ((m.movement[m.movement.length - 1] - m.movement[0]) / m.movement[0]) * 100 : 0;
    return { m, move: o };
  });
  const byLeague = leagues.map((l) => {
    const rs = rows.filter((r) => r.m.leagueId === l.id);
    if (!rs.length) return null;
    const avg = rs.reduce((s, r) => s + Math.abs(r.move), 0) / rs.length;
    return { l, n: rs.length, avg };
  }).filter(Boolean).sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-4">
      <div className="sticker p-4">
        <div className="mb-2 panel-title">AVG ABSOLUTE MOVEMENT BY LEAGUE (RESEARCH)</div>
        {byLeague.map(({ l, n, avg }) => (
          <div key={l.id} className="flex items-center gap-3 py-1.5">
            <span className="w-40"><LeagueBadge id={l.id} name={l.name} size="sm" /></span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-sky-400" style={{ width: `${Math.min(100, avg * 12)}%` }} />
            </div>
            <span className="tabular w-24 text-right text-xs text-slate-300">{avg.toFixed(1)}% · {n} games</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto sticker">
        <table className="tabular w-full min-w-[560px] text-sm">
          <thead><tr className="text-left text-xs text-slate-400">
            <th className="px-4 py-2">Match</th><th>Open</th><th>Now</th><th>Move</th><th>Status</th>
          </tr></thead>
          <tbody>
            {rows.sort((a, b) => Math.abs(b.move) - Math.abs(a.move)).map(({ m, move }) => (
              <tr key={m.id} className="border-t border-white/5">
                <td className="px-4 py-2 text-slate-200">{m.home} vs {m.away}</td>
                <td className="py-2 text-slate-400">{m.movement?.[0]?.toFixed(2) || '—'}</td>
                <td className="py-2 font-bold text-white">{m.movement?.[m.movement.length - 1]?.toFixed(2) || '—'}</td>
                <td className={`py-2 font-bold ${move <= 0 ? 'text-lime-300' : 'text-red-300'}`}>{move <= 0 ? '▼' : '▲'} {Math.abs(move).toFixed(1)}%</td>
                <td className="py-2 text-xs text-slate-400">{m.live ? 'inplay' : m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Research framing: movement shows where money went, not who will win. Past line moves don't predict outcomes.</p>
    </div>
  );
}

export default function History() {
  const [tab, setTab] = useState('explorer');
  const snap = useSnapshot();
  const matches = snap?.matches?.length ? snap.matches : MATCHES;
  const leagues = snap?.leagues?.length ? snap.leagues : LEAGUES;
  const books = snap?.books?.length ? snap.books : ['Pinnacle'];
  return (
    <ProGate title="Odds history" blurb="Every tick archived: per-book trails, biggest jumps, and the closing-line archive.">
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Odds history</h1>
      <p className="text-sm text-slate-400">Explorer shows per-book tick trails from the archive. Closing-line table below uses the snapshot home-price trail (open → now). Movement describes money flow, not winners.</p>
      <ProTeaser />
      <div className="flex gap-2">
        {[['explorer', 'Explorer'], ['archive', 'Closing-line archive']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-sm ${tab === id ? 'bg-lime-400 font-bold text-black' : 'bg-white/10 text-slate-300'}`}>{l}</button>
        ))}
      </div>
      {tab === 'explorer'
        ? <Explorer matches={matches} leagues={leagues} books={books} />
        : <Archive matches={matches} leagues={leagues} />}
    </div>
    </ProGate>
  );
}
