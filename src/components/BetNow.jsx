import { betUrl } from '../lib/bookLinks';

// "Bet now" deep link — opens the book so the user confirms the live price there.
// Always paired with a confirm-odds note; we never place bets.
// variant="primary" (solid lime, real +EV) or "ghost" (outline, no edge).
export default function BetNow({ book, label = 'Bet now', className = '', variant = 'primary' }) {
  if (!book) return null;
  const tone = variant === 'ghost'
    ? 'border-2 border-gold/60 bg-transparent text-gold hover:bg-gold/10'
    : 'bg-lime-400 text-black hover:bg-lime-300';
  return (
    <a
      href={betUrl(book)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${book} to confirm this price — odds change fast`}
      className={`comic-btn inline-flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2.5 text-xs font-extrabold transition-colors ${tone} ${className}`}
    >
      {label} @ {book} ↗
    </a>
  );
}
