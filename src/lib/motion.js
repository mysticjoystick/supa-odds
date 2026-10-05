// Shared motion system — every page animates the same way.
// Same springs, same stagger caps as the Bet Builder, all
// prefers-reduced-motion safe (see index.css guards).
// Usage: <motion.div {...rise(i)} /> or <motion.div variants={list} ... />

// Capped stagger delay — keeps long lists from cascading forever.
export const staggerDelay = (i, step = 0.06, cap = 0.3) =>
  Math.min((i || 0) * step, cap);

export const springSoft = { type: 'spring', stiffness: 320, damping: 28 };

// Card entrance: fade + rise + settle. Spread onto motion.div with an index.
export const rise = (i = 0, step = 0.06, cap = 0.3) => ({
  layout: true,
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: { ...springSoft, delay: staggerDelay(i, step, cap) },
});

// Gentler row entrance for dense tables (slide-in, no scale).
export const slideRow = (i = 0, step = 0.03, cap = 0.4) => ({
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: staggerDelay(i, step, cap), duration: 0.3 },
});

// Bottom sheet (SlipBar): slide up + backdrop fade pair.
export const sheet = {
  initial: { opacity: 0, y: 48 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 48 },
  transition: { type: 'spring', stiffness: 380, damping: 34 },
};

export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

// Confidence / probability bars.
export const barTo = (pct, i = 0) => ({
  initial: { width: 0 },
  animate: { width: `${Math.max(0, Math.min(100, pct))}%` },
  transition: { delay: 0.2 + staggerDelay(i), duration: 0.6, ease: 'easeOut' },
});

// Pop on value change (payouts, totals).
export const popKey = {
  initial: { scale: 0.92, opacity: 0.4 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: 'spring', stiffness: 500, damping: 28 },
};
