import { BOOKS } from '../lib/mock';
import { useMyBooks } from '../lib/myBooks';

// "My books" — the 2-3 books the user actually pays with.
// Filters Compare / Slip / Match pages down to those books.
const GHANA_FIRST = ['SportyBet', 'Betway', 'betPawa', 'Soccabet', 'MSport', 'Betika', 'Betano', 'Melbet', '1xBet', '22Bet', 'Pinnacle', 'DraftKings'];

export default function MyBooksPicker({ compact = false }) {
  const { myBooks, toggle, setAll } = useMyBooks();
  const ordered = [...GHANA_FIRST.filter((b) => BOOKS.includes(b)), ...BOOKS.filter((b) => !GHANA_FIRST.includes(b))];
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.02] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-wide text-slate-300">MY BOOKS</span>
        <span className="footnote">
          {myBooks.length ? `${myBooks.length} selected — we compare only these` : 'none selected — showing all books for now'}
        </span>
        <button onClick={() => setAll(BOOKS)} className="ml-auto rounded px-2 py-2 text-[11px] font-bold text-lime-300 hover:underline">All</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ordered.map((b) => {
          const on = myBooks.includes(b);
          return (
            <button
              key={b}
              onClick={() => toggle(b)}
              aria-pressed={on}
              title={on ? `Hide ${b}` : `Show ${b}`}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${on ? 'bg-gold text-ink shadow-[2px_2px_0_#e63329]' : 'bg-white/10 text-slate-400 hover:bg-white/15'}`}
            >
              {on ? '✓ ' : ''}{b}
            </button>
          );
        })}
      </div>
    </div>
  );
}
