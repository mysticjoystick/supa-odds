// Goal expectancy from the totals market — honest, documented math.
// Only when a totals line with over/under prices exists; otherwise null
// (never guessed). Method: invert the fair over-probability to a Poisson
// mean for total goals, then split home/away by win expectation.
// The split is illustrative, labeled as such wherever shown.

function poissonOver(lambda, line) {
  // P(X > line) for integer thresholds (lines are x.5).
  const k = Math.floor(line);
  let p = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i <= k; i++) {
    p += term;
    term *= lambda / (i + 1);
  }
  return 1 - p;
}

function invertLambda(pOver, line) {
  if (!(pOver > 0 && pOver < 1)) return null;
  let lo = 0.05;
  let hi = 8;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (poissonOver(mid, line) < pOver) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function goalExpectancy(match, probs) {
  const t = match?.totals;
  if (!t?.line || !t.over?.o || !t.under?.o) return null;
  const q = 1 / t.over.o + 1 / t.under.o;
  if (!q) return null;
  const pOver = 1 / t.over.o / q; // devigged fair over-probability
  const lambda = invertLambda(pOver, t.line);
  if (lambda == null) return null;
  // Split by win expectation (dampened): share = 0.5 + (pH - pA) * 0.25.
  const pH = probs?.h ?? 0.5;
  const pA = probs?.a ?? 0.5;
  const share = Math.min(0.85, Math.max(0.15, 0.5 + (pH - pA) * 0.25));
  const home = lambda * share;
  const away = lambda * (1 - share);
  const overAt = (l, ln) => poissonOver(l, ln);
  return {
    line: t.line,
    total: lambda,
    home,
    away,
    // Team goal-line probabilities from each side's Poisson mean.
    lines: [0.5, 1.5, 2.5, 3.5].map((ln) => ({
      line: ln,
      homeOver: overAt(home, ln),
      awayOver: overAt(away, ln),
    })),
    fairOver: pOver,
  };
}
