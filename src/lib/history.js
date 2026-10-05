// Odds-history reader — loads public/history.json written by the bot.
// Series key: "<matchId>|<book>|<outcome>" -> [[timestampMs, decimalOdds], ...]

let histCache = null;

export async function getHistory() {
  if (histCache) return histCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}history.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    histCache = await res.json();
    if (!histCache?.series) throw new Error('empty history');
    return histCache;
  } catch {
    histCache = { updatedAt: null, series: {} };
    return histCache;
  }
}

export function refreshHistory() {
  histCache = null;
  return getHistory();
}

export function seriesFor(hist, matchId, book, outcome) {
  return hist?.series?.[`${matchId}|${book}|${outcome}`] || [];
}

// Open / high / low / now / move% / biggest single jump / ~hourly samples.
export function summarize(series) {
  if (!series.length) return null;
  const open = series[0][1];
  const now = series[series.length - 1][1];
  let high = open;
  let low = open;
  let biggest = { from: open, to: open, pct: 0, at: series[0][0] };
  for (let i = 0; i < series.length; i++) {
    const v = series[i][1];
    if (v > high) high = v;
    if (v < low) low = v;
    if (i > 0) {
      const prev = series[i - 1][1];
      const pct = ((v - prev) / prev) * 100;
      if (Math.abs(pct) > Math.abs(biggest.pct)) biggest = { from: prev, to: v, pct, at: series[i][0] };
    }
  }
  const changePct = ((now - open) / open) * 100;
  // thin to ~13 points for tables
  const step = Math.max(1, Math.floor(series.length / 13));
  const hourly = series.filter((_, i) => i % step === 0 || i === series.length - 1);
  return { open, high, low, now, changePct, biggest, hourly, points: series.length };
}

export const fmtTime = (ts) =>
  new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
