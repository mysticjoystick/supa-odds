import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TeamCrest from '../components/TeamCrest';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES, LEAGUES } from '../lib/mock';

function pills(form) {
  return (
    <span className="flex gap-1">
      {(form || []).map((r, i) => (
        <span key={i} data-r={r} title={r === 'W' ? 'Won' : r === 'D' ? 'Drew' : 'Lost'} className="form-pill">{r}</span>
      ))}
    </span>
  );
}

function pts(form) {
  return (form || []).reduce((s, r) => s + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
}

export default function Form() {
  const snap = useSnapshot();
  const matches = snap?.matches?.length ? snap.matches : MATCHES;
  const leagues = snap?.leagues?.length ? snap.leagues : LEAGUES;
  const [league, setLeague] = useState('all');
  const [q, setQ] = useState('');
  const teams = useMemo(() => {
    const map = new Map();
    for (const m of matches) {
      if (league !== 'all' && m.leagueId !== league) continue;
      if (!m.stats) continue;
      const put = (name, t, venue) => {
        if (!map.has(name)) map.set(name, { name, t, matchId: m.id, matchLabel: `${m.home} vs ${m.away}`, leagueId: m.leagueId, venue });
      };
      put(m.home, m.stats.home, 'home');
      put(m.away, m.stats.away, 'away');
    }
    const needle = q.trim().toLowerCase();
    let list = [...map.values()];
    if (needle) list = list.filter((t) => t.name.toLowerCase().includes(needle));
    return list.sort((a, b) => pts(b.t.form10 || b.t.form) - pts(a.t.form10 || a.t.form));
  }, [matches, league, q]);
  const [sel, setSel] = useState(null);
  const cur = teams.find((t) => t.name === sel) || teams[0] || null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Form explorer</h1>
      <p className="max-w-2xl text-sm text-slate-400">Last 5 / last 10, venue splits, scoring and xG — raw numbers for your own research. No picks attached. For H2H and team news, open the match page. <b className="text-slate-300">Form tells you who&apos;s hot — prices tell you if it pays.</b></p>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/compare" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white hover:bg-white/10">Compare prices →</Link>
        <Link to="/builder" className="inline-flex min-h-[44px] items-center rounded-xl bg-lime-400 px-3 text-xs font-extrabold text-black hover:bg-lime-300">✦ Build a ticket →</Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!!leagues.length && (
          <select value={league} onChange={(e) => { setLeague(e.target.value); setSel(null); }} aria-label="Filter by league"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams…" aria-label="Search teams"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-400" />
        <span className="footnote">{teams.length} teams</span>
      </div>
      {!teams.length && (
        <div className="sticker p-6 text-center text-sm text-slate-400">
          No team data in this view yet — try All leagues, clear the search, or check back when the feed syncs.
        </div>
      )}
      {!!teams.length && (
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
          {teams.map((t, i) => (
            <button key={t.name} onClick={() => setSel(t.name)} aria-pressed={cur?.name === t.name}
              className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${cur?.name === t.name ? 'border-lime-400/40 bg-lime-400/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <span className="tabular w-5 text-xs text-slate-400">{i + 1}</span>
              <TeamCrest name={t.name} size={24} />
              <span className="flex-1 truncate text-sm font-semibold text-white">{t.name}</span>
              <span className="tabular text-xs text-slate-400">{pts(t.t.form10 || t.t.form)}pts</span>
            </button>
          ))}
        </div>
        {cur && (
          <div className="space-y-3 sticker p-5">
            <div className="flex items-center gap-3">
              <TeamCrest name={cur.name} size={44} />
              <div>
                <div className="text-xl font-extrabold text-white">{cur.name}</div>
                <div className="footnote">Next listed: {cur.matchLabel} • as {cur.venue}</div>
                <Link to={`/match/${cur.matchId}`} className="text-xs text-lime-300 hover:underline">view match (H2H + news) →</Link>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <div className="mb-2 text-xs text-slate-400">LAST 5</div>
                {pills(cur.t.form)}
                <div className="mb-2 mt-3 text-xs text-slate-400">LAST 10</div>
                {pills(cur.t.form10 || cur.t.form)}
              </div>
              <div className="tabular space-y-1.5 rounded-xl bg-white/[0.03] p-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Scored</span><b className="text-white">{cur.t.gf ?? '—'}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Conceded</span><b className="text-white">{cur.t.ga ?? '—'}</b></div>
                {cur.t.xg != null && <div className="flex justify-between"><span className="text-slate-500">xG / xGA</span><b className="text-white">{cur.t.xg} / {cur.t.xga}</b></div>}
                <div className="flex justify-between"><span className="text-slate-500">Venue split</span><b className="text-white">{cur.t.homeRecord ?? '—'}</b></div>
              </div>
            </div>
            <p className="text-xs text-slate-400">Form-table points rank recent results only — injuries, fixtures and motivation matter just as much. Venue split shown is from the next listed fixture.</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
