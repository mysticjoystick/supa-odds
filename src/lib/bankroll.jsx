import { useSyncExternalStore, useCallback } from 'react';

const KEY = 'oddslens-bankroll';
const DEFAULT_BANK = 1000;

function load() {
  try {
    const n = Number(localStorage.getItem(KEY));
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  } catch { /* ignore */ }
  return DEFAULT_BANK;
}

let bank = load();
const listeners = new Set();
function emit() {
  try {
    localStorage.setItem(KEY, String(bank));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useBankroll() {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => bank
  );
  const setBank = useCallback((n) => {
    const v = Math.floor(Number(n));
    if (!Number.isFinite(v) || v <= 0) return;
    bank = v;
    emit();
  }, []);
  return { bank, setBank };
}
