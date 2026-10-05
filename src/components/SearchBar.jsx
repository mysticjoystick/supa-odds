import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import TeamCrest from './TeamCrest';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES } from '../lib/mock';

export default function SearchBar({ onNav, className = '' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef(null);
  const snap = useSnapshot();
  const matches = snap?.matches?.length ? snap.matches : MATCHES;
  const needle = q.trim().toLowerCase();
  const showEmpty = open && needle.length >= 2;
  const results = useMemo(() => {
    if (needle.length < 2) return [];
    return matches
      .filter((m) => `${m.home} ${m.away}`.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [needle, matches]);

  const close = () => {
    setOpen(false);
    setHi(0);
  };

  const pick = () => {
    setQ('');
    close();
    onNav?.();
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setHi((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setHi((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results.length) {
      const target = results[hi] || results[0];
      if (target && open) {
        e.preventDefault();
        document.getElementById(`search-result-${target.id}`)?.click();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(close, 120)}
        onKeyDown={onKeyDown}
        placeholder="Search teams…"
        role="combobox"
        aria-expanded={open && needle.length >= 2}
        aria-controls="team-search-listbox"
        aria-autocomplete="list"
        aria-activedescendant={results[hi] ? `search-result-${results[hi].id}` : undefined}
        aria-label="Search teams"
        className="w-full min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-slate-400 focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      />
      {!!q && (
        <button onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-500 hover:text-white">
          <X size={16} />
        </button>
      )}
      {showEmpty && (
        <div id="team-search-listbox" role="listbox" aria-label="Matching matches"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[50vh] overflow-y-auto rounded-xl border border-white/10 bg-panel shadow-2xl">
          {!results.length ? (
            <div className="px-3 py-3 text-xs text-slate-400">No teams found for “{q.trim()}” — try another spelling.</div>
          ) : (
            results.map((m, idx) => (
              <Link
                id={`search-result-${m.id}`}
                key={m.id}
                to={`/match/${m.id}`}
                role="option"
                aria-selected={idx === hi}
                onMouseDown={(e) => e.preventDefault()}
                onClick={pick}
                onMouseEnter={() => setHi(idx)}
                className={`flex min-h-[44px] items-center gap-2 px-3 py-2 ${idx === hi ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <TeamCrest name={m.home} size={22} src={m.crestHome} />
                <span className="flex-1 truncate text-sm text-slate-200" title={`${m.home} vs ${m.away}`}>
                  <b className="text-white">{m.home}</b> vs <b className="text-white">{m.away}</b>
                </span>
                {m.live && <span role="img" aria-label="Live now" className="h-2 w-2 shrink-0 rounded-full bg-red-400" />}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
