// One-tap bet journal — "I placed this" logging for personal profit tracking.
// Device-local. Pending until graded in Tracker (Won/Lost).

export const JOURNAL_KEY = 'oddslens-journal';

export function readJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY)) || [];
  } catch {
    return [];
  }
}

function writeJournal(rows) {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
}

// Has this exact pick already been logged and left pending?
export function hasPendingBet(match, pick) {
  const tag = `${match}||${pick}`;
  return readJournal().some(
    (r) => !r.graded && !r.void && `${r.match}||${r.pick}` === tag
  );
}

// Log a placed bet. Returns true if it was new, false if already tracked.
export function logBet({ match, pick, stake, taken, book, leagueId, market, fair, ev, source }) {
  const rows = readJournal();
  const tag = `${match}||${pick}`;
  if (rows.some((r) => !r.graded && !r.void && `${r.match}||${r.pick}` === tag)) return false;
  const row = {
    id: Date.now(),
    match,
    pick,
    stake: +stake || 0,
    taken: +taken,
    close: +taken, // no line move yet — update when grading
    book: book || '',
    leagueId: leagueId || '',
    market: market || '',
    fair: fair ?? '',
    ev: ev ?? '',
    source: source || 'value-board',
    graded: false,
    won: false,
    void: false,
  };
  writeJournal([row, ...rows]);
  try {
    window.dispatchEvent(new CustomEvent('oddslens-journal', { detail: { id: row.id } }));
  } catch { /* ignore */ }
  return true;
}
