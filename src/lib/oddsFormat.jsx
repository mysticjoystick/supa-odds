import { createContext, useContext, useEffect, useState } from 'react';

// Global odds-format state (decimal / fractional / american), persisted.
const Ctx = createContext({ format: 'dec', setFormat: () => {} });

export function OddsProvider({ children }) {
  const [format, setFormat] = useState(() => {
    try {
      return localStorage.getItem('oddslens-odds-fmt') || 'dec';
    } catch {
      return 'dec';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('oddslens-odds-fmt', format);
    } catch { /* ignore */ }
  }, [format]);
  return <Ctx.Provider value={{ format, setFormat }}>{children}</Ctx.Provider>;
}

export const useOddsFormat = () => useContext(Ctx);

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

export function toFractional(dec) {
  if (!dec || dec <= 1) return '—';
  const x = dec - 1;
  let best = [Math.round(x), 1];
  let err = Math.abs(x - best[0]);
  for (let q = 1; q <= 20; q++) {
    const p = Math.round(x * q);
    const e = Math.abs(x - p / q);
    if (e < err) {
      err = e;
      best = [p, q];
    }
  }
  const g = gcd(best[0], best[1]) || 1;
  return `${best[0] / g}/${best[1] / g}`;
}

export function toAmerican(dec) {
  if (!dec || dec <= 1) return '—';
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
  return `-${Math.round(100 / (dec - 1))}`;
}

export function formatOdds(dec, format) {
  if (dec == null) return '—';
  if (format === 'frac') return toFractional(dec);
  if (format === 'us') return toAmerican(dec);
  return Number(dec).toFixed(2);
}

// Drop-in odds readout in the user's chosen format. Charts stay decimal.
export function Odds({ v, className = '' }) {
  const { format } = useOddsFormat();
  return <span className={`tabular ${className}`}>{formatOdds(v, format)}</span>;
}

export function FormatToggle() {
  const { format, setFormat } = useOddsFormat();
  const opts = [['dec', '1.91'], ['frac', '10/11'], ['us', '-110']];
  return (
    <span className="flex overflow-hidden rounded-full border border-white/15 bg-white/5 text-xs font-bold" role="group" aria-label="Odds format">
      {opts.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setFormat(id)}
          title={id === 'dec' ? 'Decimal' : id === 'frac' ? 'Fractional' : 'American'}
          aria-pressed={format === id}
          className={`min-h-[44px] px-2 transition-colors sm:px-3 ${format === id ? 'bg-lime-400 text-black' : 'text-slate-400 hover:text-white'}`}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
