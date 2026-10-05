import { useSyncExternalStore, useCallback } from 'react';
import { Star } from 'lucide-react';

const KEY = 'oddslens-favs';
let favs = new Set();
try {
  favs = new Set(JSON.parse(localStorage.getItem(KEY)) || []);
} catch { /* ignore */ }

const listeners = new Set();
function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...favs]));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function snapshot() {
  return [...favs].join('|');
}

export function useFavorites() {
  useSyncExternalStore(subscribe, snapshot);
  const toggle = useCallback((team) => {
    if (favs.has(team)) favs.delete(team);
    else favs.add(team);
    emit();
  }, []);
  return { favs, toggle, has: (t) => favs.has(t) };
}

export function FavStar({ team, size = 14 }) {
  const { has, toggle } = useFavorites();
  const on = has(team);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(team);
      }}
      title={on ? `Unfollow ${team}` : `Follow ${team}`}
      aria-label={on ? `Unfollow ${team}` : `Follow ${team}`}
      aria-pressed={on}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${on ? 'text-amber-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
    >
      <Star size={size} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
