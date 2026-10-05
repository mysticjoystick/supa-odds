import { useEffect, useState } from 'react';
import { getSnapshot, refreshSnapshot } from '../lib/api';

// Shared live-data hook — loads snapshot.json (bot output) with demo-sample fallback,
// then silently re-polls so live scores/odds update without page reload.
// Manual refreshSnapshot() calls notify all mounted hooks immediately.
const listeners = new Set();

function notifyAll(snap) {
  for (const fn of listeners) {
    try { fn(snap); } catch { /* ignore */ }
  }
}

// Refresh once and push to every mounted useSnapshot hook.
export async function refreshAllSnapshots() {
  const s = await refreshSnapshot();
  notifyAll(s);
  return s;
}

export function useSnapshot(pollMs = 60000) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    const apply = (s) => live && setData(s);
    listeners.add(apply);
    getSnapshot()
      .then(apply)
      .catch(() => {});
    const id = setInterval(() => {
      refreshSnapshot()
        .then((s) => {
          if (!live) return;
          setData(s);
          notifyAll(s);
        })
        .catch(() => {});
    }, pollMs);
    return () => {
      live = false;
      listeners.delete(apply);
      clearInterval(id);
    };
  }, [pollMs]);
  return data;
}
