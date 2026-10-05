// Live layer: tries /snapshot.json written by bot/fetchOdds.js.
// Demo fallback uses bundled sample fixtures so every page renders
// something useful offline — always flagged as demo, never as live.

import { MATCHES, LEAGUES, BOOKS, TIPS } from './mock';

let cache = null;

async function load() {
  try {
    // cache-busting query so silent polls actually pick up bot rewrites
    const res = await fetch(`${import.meta.env.BASE_URL}snapshot.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const live = await res.json();
    if (!live?.matches?.length) throw new Error('empty snapshot');
    cache = { ...live, live: true };
    return cache;
  } catch {
    cache = {
      matches: MATCHES,
      leagues: LEAGUES,
      books: BOOKS,
      tips: TIPS,
      updatedAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      metadata: {
        mode: 'demo',
        isDemo: true,
        oddsUpdatedAt: null,
        scoresUpdatedAt: null,
        dataSources: ['demo-sample'],
        historyPoints: 0,
      },
      live: false,
      isDemo: true,
      source: 'demo-sample',
    };
    return cache;
  }
}

export async function getSnapshot() {
  if (cache) return cache;
  return load();
}

// Silent refresh — updates status bar only, never reloads the page.
export async function refreshSnapshot() {
  return load();
}
