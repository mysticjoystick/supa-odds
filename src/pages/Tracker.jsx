import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clvPercent } from '../lib/math';
import { readEdges, gradeEdge, deleteEdge } from '../lib/edgeLog';
import { slideRow } from '../lib/motion';

export const JOURNAL_KEY = 'oddslens-journal';

// Shared reader so calibration can grade the user's own history too.
export function readJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || [];
  } catch {
    return [];
  }
}

const EMPTY = { match: '', pick: '', stake: 10, taken: 2.0, close: 1.95, won: false, leagueId: '', market: '', book: '', fair: '', ev: '', source: '' };

function statusOf(r) {
  if (r.void) return 'void';
  if (!r.graded) return 'pending';
  return r.won ? 'won' : 'lost';
}

export default function Tracker() {
  const [rows, setRows] = useState(readJournal);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [confirmDel, setConfirmDel] = useState(null);
  const location = useLocation();
  const consumed = useRef(false);
  // One-tap prefill from match pages (+ Log buttons) — applied once.
  useEffect(() => {
    if (!consumed.current && location.state?.prefill) {
      consumed.current = true;
      setForm({ ...EMPTY, ...location.state.prefill });
      window.history.replaceState({}, '');
    }
  }, [location.state]);
  useEffect(() => {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(rows));
    } catch { /* ignore */ }
  }, [rows]);

  const validate = (f) => {
    if (!f.match.trim()) return 'Add the match (e.g. Hearts vs Kotoko).';
    if (!f.pick.trim()) return 'Add your pick (e.g. Home @ SportyBet).';
    if (!Number.isFinite(+f.stake) || +f.stake <= 0) return 'Stake must be more than 0.';
    if (!Number.isFinite(+f.taken) || +f.taken <= 1) return 'Taken price must be above 1.01.';
    if (!Number.isFinite(+f.close) || +f.close <= 1) return 'Close price must be above 1.01.';
    return '';
  };

  const save = () => {
    const msg = validate(form);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    const clean = { ...form, match: form.match.trim(), pick: form.pick.trim(), stake: +form.stake, taken: +form.taken, close: +form.close };
    if (editingId) {
      setRows(rows.map((x) => (x.id === editingId ? { ...clean, id: editingId, graded: x.graded, won: x.won, void: x.void } : x)));
      setEditingId(null);
    } else {
      setRows([{ ...clean, id: Date.now(), graded: false, void: false }, ...rows]);
    }
    setForm(EMPTY);
  };
  const startEdit = (r) => {
    setEditingId(r.id);
    setError('');
    setForm({ ...EMPTY, match: r.match || '', pick: r.pick || '', stake: r.stake, taken: r.taken, close: r.close, won: !!r.won, leagueId: r.leagueId || '', market: r.market || '', book: r.book || '', fair: r.fair ?? '', ev: r.ev ?? '', source: r.source || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };
  const setStatus = (id, status) => {
    setRows(rows.map((x) => {
      if (x.id !== id) return x;
      if (status === 'pending') return { ...x, graded: false, won: false, void: false };
      if (status === 'void') return { ...x, graded: true, void: true };
      return { ...x, graded: true, void: false, won: status === 'won' };
    }));
  };
  const exportCsv = () => {
    const head = 'match,pick,stake,taken,close,result,clv_pct,league,market,book,fair,ev,source\n';
    const lines = rows.map((r) =>
      [r.match, r.pick, r.stake, r.taken, r.close, statusOf(r), clvPercent(+r.taken, +r.close).toFixed(2), r.leagueId, r.market, r.book, r.fair, r.ev != null && r.ev !== '' ? (+r.ev * 100).toFixed(1) + '%' : '', r.source]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([head + lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'oddslens-journal.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const gradedRows = useMemo(() => rows.filter((r) => r.graded && !r.void && Number.isFinite(+r.stake) && +r.stake > 0), [rows]);
  const avgClv = gradedRows.length ? gradedRows.reduce((s, r) => s + clvPercent(+r.taken, +r.close), 0) / gradedRows.length : null;
  const roi = gradedRows.length ? gradedRows.reduce((s, r) => s + (r.won ? (+r.stake * (+r.taken - 1)) : -+r.stake), 0) / gradedRows.reduce((s, r) => s + +r.stake, 0) * 100 : null;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let pool = rows.filter((r) => {
      if (filter !== 'all' && statusOf(r) !== filter) return false;
      if (needle && !`${r.match} ${r.pick} ${r.book} ${r.market}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === 'clv') pool = [...pool].sort((a, b) => clvPercent(+b.taken, +b.close) - clvPercent(+a.taken, +a.close));
    else if (sort === 'stake') pool = [...pool].sort((a, b) => (+b.stake || 0) - (+a.stake || 0));
    else pool = [...pool].sort((a, b) => (b.id || 0) - (a.id || 0));
    return pool;
  }, [rows, filter, query, sort]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-normal text-white">Bet journal + <span title="Closing-line value: whether your odds beat the final odds. Positive over many bets means a real edge">CLV</span> tracker</h1>
          <p className="mt-1 text-xs text-slate-400">Stored only on this device. ROI + Avg CLV count graded wins/losses only — pending and voids never inflate losses.</p>
        </div>
        {!!rows.length && (
          <button onClick={exportCsv} className="ml-auto rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
            ⬇ Export CSV
          </button>
        )}
      </div>
      <div className="tabular flex flex-wrap gap-3 text-sm">
        <div className="rounded-xl bg-white/5 px-4 py-2" title="All rows including pending">Bets <b className="text-white">{rows.length}</b></div>
        <div className="rounded-xl bg-white/5 px-4 py-2" title="Graded wins/losses only">Graded <b className="text-white">{gradedRows.length}</b></div>
        <div className="rounded-xl bg-white/5 px-4 py-2" title="Closing-line value vs the final odds — positive over many bets means a real edge">Avg CLV <b className={avgClv == null ? 'text-slate-400' : avgClv >= 0 ? 'text-lime-300' : 'text-red-300'}>{avgClv == null ? '—' : `${avgClv.toFixed(2)}%`}</b></div>
        <div className="rounded-xl bg-white/5 px-4 py-2" title="Return on investment: profit per cedi staked on graded bets">ROI <b className={roi == null ? 'text-slate-400' : roi >= 0 ? 'text-lime-300' : 'text-red-300'}>{roi == null ? '—' : `${roi.toFixed(1)}%`}</b></div>
      </div>
      <div className={`grid gap-2 rounded-2xl border p-4 md:grid-cols-7 ${editingId ? 'border-amber-400/40 bg-amber-400/[0.04]' : 'border-white/10 bg-panel'}`}>
        <label className="text-xs text-slate-400">Match
          <input placeholder="Hearts vs Kotoko" aria-label="Match" value={form.match} onChange={(e) => setForm({ ...form, match: e.target.value })} className="mt-1 w-full field text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400">Pick
          <input placeholder="Home @ SportyBet" aria-label="Pick" value={form.pick} onChange={(e) => setForm({ ...form, pick: e.target.value })} className="mt-1 w-full field text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400">Stake (GH₵)
          <input type="number" min="0.01" step="0.01" aria-label="Stake in cedis" value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} className="tabular mt-1 w-full field text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400"><span title="The odds you got when you placed the bet">Taken — odds you got</span>
          <input type="number" min="1.01" step="0.01" aria-label="Taken price — odds you got" value={form.taken} onChange={(e) => setForm({ ...form, taken: e.target.value })} className="tabular mt-1 w-full field text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400"><span title="Final odds just before kickoff — update this when you grade. Beating the close means you found value">Close — final odds</span>
          <input type="number" min="1.01" step="0.01" aria-label="Closing price — final odds" value={form.close} onChange={(e) => setForm({ ...form, close: e.target.value })} className="tabular mt-1 w-full field text-sm text-white" />
        </label>
        <div className="flex items-end gap-2 md:col-span-2">
          <button onClick={save} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${editingId ? 'bg-amber-400 text-black' : 'bg-lime-400 text-black'}`}>
            {editingId ? '✓ Save' : '+ Log'}
          </button>
          {editingId ? (
            <button onClick={cancelEdit} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white">Cancel</button>
          ) : null}
        </div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
      {(form.leagueId || form.market || form.book || form.source) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500">Auto-tagged:</span>
          {[form.source && `src ${form.source}`, form.leagueId && `lg ${form.leagueId}`, form.market && `mkt ${form.market}`, form.book && `book ${form.book}`, form.fair !== '' && form.fair != null && `fair ${form.fair}`, form.ev !== '' && form.ev != null && `EV ${(Number(form.ev) * 100).toFixed(1)}%`]
            .filter(Boolean)
            .map((c) => (
              <span key={c} className="rounded-full bg-lime-400/10 px-2 py-0.5 font-semibold text-lime-300">{c}</span>
            ))}
          <span className="text-slate-400">· update the close price when you grade</span>
        </div>
      )}
      {!!rows.length && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search journal…" aria-label="Search journal"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by result"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="all">All results</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort journal"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">
            <option value="newest">Newest first</option>
            <option value="clv">Best CLV first</option>
            <option value="stake">Biggest stake first</option>
          </select>
          <span className="footnote">{visible.length} of {rows.length}</span>
        </div>
      )}
      <div className="space-y-2">
        {visible.map((r, i) => {
          const st = statusOf(r);
          return (
          <motion.div key={r.id} {...slideRow(i)} className={`tabular flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm text-slate-300 transition-shadow hover:shadow-[3px_3px_0_#e63329] ${editingId === r.id ? 'border-amber-400/40 bg-amber-400/[0.05]' : 'border-white/10 bg-white/[0.03]'}`}>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st === 'won' ? 'bg-lime-400/15 text-lime-300' : st === 'lost' ? 'bg-red-500/15 text-red-300' : st === 'void' ? 'bg-white/10 text-slate-400' : 'bg-sky-400/15 text-sky-300'}`}>{st.toUpperCase()}</span>
            <span className="font-semibold text-white">{r.pick}</span><span>{r.match}</span>
            {(r.market || r.book) && <span className="text-xs text-slate-400">{[r.market, r.book].filter(Boolean).join(' • ')}</span>}
            <span>GH₵{r.stake}</span><span title="Odds you got when you placed the bet">taken {r.taken}</span><span title="Final odds just before kickoff — beating the close means you found value">close {r.close}</span>
            <span title="Closing-line value: did your price beat the final price? Positive over many bets = real edge" className={clvPercent(+r.taken, +r.close) >= 0 ? 'text-lime-300' : 'text-red-300'}>CLV {clvPercent(+r.taken, +r.close).toFixed(1)}%</span>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              <button onClick={() => setStatus(r.id, 'won')} aria-pressed={st === 'won'} title="Mark won" className={`min-h-[44px] rounded-lg px-3 text-xs font-bold ${st === 'won' ? 'bg-lime-400 text-black' : 'bg-white/10 hover:bg-white/15'}`}>Won</button>
              <button onClick={() => setStatus(r.id, 'lost')} aria-pressed={st === 'lost'} title="Mark lost" className={`min-h-[44px] rounded-lg px-3 text-xs font-bold ${st === 'lost' ? 'bg-red-400 text-black' : 'bg-white/10 hover:bg-white/15'}`}>Lost</button>
              <button onClick={() => setStatus(r.id, 'void')} aria-pressed={st === 'void'} title="Mark void (refunded, excluded from stats)" className={`rounded px-2 py-2 text-[11px] ${st === 'void' ? 'bg-white/20 font-bold text-white' : 'text-slate-400 hover:text-white'}`}>Void</button>
              <button onClick={() => startEdit(r)} className="rounded px-2 py-2 footnote hover:text-white" title="Edit details including closing price">edit</button>
              {confirmDel === r.id ? (
                <span className="flex gap-1">
                  <button onClick={() => { setRows(rows.filter((x) => x.id !== r.id)); setConfirmDel(null); }} className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">confirm?</button>
                  <button onClick={() => setConfirmDel(null)} className="rounded bg-white/10 px-2 py-0.5 text-xs">keep</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(r.id)} className="rounded bg-white/10 px-2 py-0.5 text-xs" title="Delete entry">del</button>
              )}
            </span>
          </motion.div>
          );
        })}
        {!rows.length && <div className="sticker p-6 text-sm text-slate-400">No bets yet. Log your first — CLV tells you if you beat the market. Graded entries also feed Tools → Calibration.</div>}
        {!!rows.length && !visible.length && <div className="sticker p-6 text-center text-sm text-slate-400">Nothing matches — clear the search or pick All results.</div>}
      </div>
      <EdgeInbox />
    </div>
  );
}

function EdgeInbox() {
  const [edges, setEdges] = useState(readEdges);
  const [closeMap, setCloseMap] = useState({});
  const refresh = () => setEdges(readEdges());
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  if (!edges.length) return null;
  return (
    <div className="rounded-2xl border border-lime-400/25 bg-lime-400/[0.04] p-4">
      <div className="mb-1 text-xs font-bold tracking-wide text-lime-300">
        DETECTED EDGES — CLOSE THE LOOP ({edges.filter((e) => e.graded).length}/{edges.length} graded)
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Every +Track becomes a dataset row: detection odds → <b className="text-slate-200">update the close</b> → mark won/lost.
        Graded rows feed Performance → Edge calibration (EV range → win rate → ROI → CLV).
      </p>
      <div className="space-y-2">
        {edges.slice(0, 20).map((e, i) => (
          <motion.div key={e.id} {...slideRow(i)} className="tabular flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition-shadow hover:shadow-[3px_3px_0_#e63329]">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.graded ? (e.won ? 'bg-lime-400/15 text-lime-300' : 'bg-red-500/15 text-red-300') : 'bg-sky-400/15 text-sky-300'}`}>
              {e.graded ? (e.won ? 'WON' : 'LOST') : 'PENDING'}
            </span>
            <span className="font-semibold text-white">{e.pick}</span>
            <span className="text-slate-500">{e.match} • det {Number(e.taken).toFixed(2)} • fair {e.fair != null ? Number(e.fair).toFixed(2) : '—'} • EV {e.ev != null ? `${(e.ev * 100).toFixed(1)}%` : '—'}</span>
            {!e.graded ? (
              <span className="ml-auto flex flex-wrap items-center gap-1.5">
                <label className="flex items-center gap-1 text-slate-400">close
                  <input
                    type="number" step="0.01" min="1.01" defaultValue={e.close ?? e.taken}
                    onChange={(e2) => setCloseMap({ ...closeMap, [e.id]: Number(e2.target.value) })}
                    className="w-20 rounded-lg bg-white/10 px-2 py-1 text-white" aria-label={`Closing price for ${e.pick}`} />
                </label>
                <button onClick={() => { gradeEdge(e.id, { close: closeMap[e.id] || e.close || e.taken, graded: true, won: true }); refresh(); }} className="rounded bg-lime-400 px-2 py-1 font-bold text-black">Won</button>
                <button onClick={() => { gradeEdge(e.id, { close: closeMap[e.id] || e.close || e.taken, graded: true, won: false }); refresh(); }} className="rounded bg-red-400 px-2 py-1 font-bold text-black">Lost</button>
                <button onClick={() => { gradeEdge(e.id, { close: closeMap[e.id] || e.close || e.taken }); refresh(); }} className="rounded bg-white/10 px-2 py-1" title="Save close without grading">save close</button>
                <button onClick={() => { deleteEdge(e.id); refresh(); }} className="rounded bg-white/10 px-2 py-1">del</button>
              </span>
            ) : (
              <span className="ml-auto flex items-center gap-1.5">
                <span className={clvPercent(+e.taken, +e.close) >= 0 ? 'text-lime-300' : 'text-red-300'}>CLV {clvPercent(+e.taken, +e.close).toFixed(1)}%</span>
                <button onClick={() => { deleteEdge(e.id); refresh(); }} className="rounded bg-white/10 px-2 py-1">del</button>
              </span>
            )}
          </motion.div>
        ))}
      </div>
      {edges.length > 20 && <div className="mt-2 footnote">Showing 20 newest of {edges.length} — oldest stay in the calibration set.</div>}
    </div>
  );
}
