// Feed watchdog — retries, per-source health across runs, stale carry-forward.
// State: bot/health.json { sources: { espn: {ok,lastOk,fails,lastError,count}, ... } }

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEALTH_PATH = join(ROOT, 'bot', 'health.json');
const STALE_AFTER_MIN = 60;

function blank() {
  return { ok: true, lastOk: null, fails: 0, lastError: null, count: 0 };
}

export async function loadHealth() {
  try {
    const raw = await readFile(HEALTH_PATH, 'utf8');
    const h = JSON.parse(raw);
    if (h && typeof h.sources === 'object') return h;
  } catch { /* start fresh */ }
  return { updatedAt: null, sources: {} };
}

export async function saveHealth(h) {
  h.updatedAt = new Date().toISOString();
  await mkdir(dirname(HEALTH_PATH), { recursive: true });
  await writeFile(HEALTH_PATH, JSON.stringify(h, null, 2));
}

export function record(h, name, ok, { count = 0, error = null } = {}) {
  const s = h.sources[name] || (h.sources[name] = blank());
  if (ok) {
    s.ok = true;
    s.lastOk = new Date().toISOString();
    s.fails = 0;
    s.lastError = null;
    s.count = count;
  } else {
    s.ok = false;
    s.fails += 1;
    s.lastError = error;
  }
  return s;
}

// Retry with backoff: fn() must throw on failure. Returns {ok, value, error, attempts}.
export async function retry(name, fn, tries = 3, baseMs = 2000) {
  let error = null;
  for (let i = 1; i <= tries; i++) {
    try {
      const value = await fn();
      if (i > 1) console.log(`${name}: recovered on attempt ${i}/${tries}`);
      return { ok: true, value, error: null, attempts: i };
    } catch (e) {
      error = e.message;
      console.warn(`${name}: attempt ${i}/${tries} failed — ${e.message}`);
      if (i < tries) await new Promise((r) => setTimeout(r, baseMs * i));
    }
  }
  return { ok: false, value: null, error, attempts: tries };
}

export function isStale(isoTs, afterMin = STALE_AFTER_MIN) {
  if (!isoTs) return true;
  return Date.now() - new Date(isoTs).getTime() > afterMin * 60 * 1000;
}
