import { Star } from 'lucide-react';

// FC-style 5-star display with fractional gold fill.
// value is in stars (e.g. 4.3). Rating out of 10 → pass rating / 2.
export default function Stars({ value = 0, max = 5, size = 14, className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const row = (filled) => (
    // w-max + shrink-0: the overlay row must NEVER compress — it gets
    // clipped by its parent instead. Compressed gold stars was a real bug.
    <span className="flex w-max shrink-0 gap-0.5" aria-hidden>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={`shrink-0 ${filled ? 'text-amber-300' : 'text-slate-300'}`}
          fill="currentColor"
          strokeWidth={0}
        />
      ))}
    </span>
  );
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      role="img"
      aria-label={`${Number(value).toFixed(1)} out of ${max} stars`}
      title={`${Number(value).toFixed(1)} / ${max} stars`}
    >
      {row(false)}
      <span className="absolute bottom-0 left-0 top-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row(true)}
      </span>
    </span>
  );
}

// 10-point rating → stars.
export const starsOf = (rating10) => (rating10 == null ? 0 : rating10 / 2);
