// Supa Odds math — pure functions, decimal odds, zero AI needed.

export const implied = (decimal) => (decimal > 1 ? 1 / decimal : 0);

export const devig2Way = (a, b) => {
  const ia = implied(a);
  const ib = implied(b);
  const total = ia + ib;
  if (!total) return [0.5, 0.5];
  return [ia / total, ib / total];
};

export const devig3Way = (h, d, a) => {
  const ih = implied(h);
  const id = implied(d);
  const ia = implied(a);
  const total = ih + id + ia;
  if (!total) return [0.33, 0.33, 0.34];
  return [ih / total, id / total, ia / total];
};

export const fairOdds = (prob) => (prob > 0 ? 1 / prob : 0);

// EV% = (trueProb * decimal) - 1
export const evPercent = (trueProb, decimal) => trueProb * decimal - 1;

// CLV% = (yourOdds / closingOdds - 1) * 100
export const clvPercent = (yourOdds, closingOdds) => {
  if (!yourOdds || !closingOdds) return 0;
  return (yourOdds / closingOdds - 1) * 100;
};

export const bestPrice = (prices) => Math.max(...prices.filter(Boolean));

export const kellyStake = (prob, decimal, bankroll, fraction = 0.25) => {
  const b = decimal - 1;
  if (b <= 0) return 0;
  const q = 1 - prob;
  const f = (b * prob - q) / b;
  return Math.max(0, f * fraction * bankroll);
};

// Single source for stake sizing — quarter-Kelly capped at 5% so high-odds
// picks can't nuke the roll. Flat 1% for no-edge / favorite staking.
export const suggestedStake = ({ fairProb, market, bank }) => {
  if (!fairProb || !market || market <= 1 || !bank) return 0;
  const raw = kellyStake(fairProb, market, bank, 0.25);
  return Math.max(0, Math.min(raw, bank * 0.05));
};

export const flatStake = (bank) => (bank > 0 ? bank * 0.01 : 0);

// Single source for stake inputs — floor to whole cedis, min 1.
// Returns `fallback` when the text is empty/invalid so typing never snaps.
export const DEFAULT_STAKE = 50;
export const parseStakeText = (text, fallback = DEFAULT_STAKE) => {
  const n = Number(text);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return Number.isFinite(fallback) && fallback >= 1 ? Math.floor(fallback) : DEFAULT_STAKE;
};

export const fmtDec = (n) => (n ? Number(n).toFixed(2) : '-');
export const fmtPct = (n, digits = 1) => `${(n * 100).toFixed(digits)}%`;
