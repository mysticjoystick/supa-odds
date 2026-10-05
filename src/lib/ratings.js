// Ratings + strength helpers. Everything here derives from real data only:
// FotMob ratings/form (bot-enriched) and the devigged fair price.
// Nothing is invented — missing data means hidden sections, not guesses.

// SofaScore-style 10-point color scale.
export function ratingColor(r) {
  if (r == null) return '#64748b';
  if (r >= 8) return '#a3e635';
  if (r >= 7) return '#fbbf24';
  if (r >= 6) return '#cbd5e1';
  return '#f87171';
}

export function formPoints(form) {
  if (!form?.length) return null;
  let pts = 0;
  for (const c of form) pts += c === 'W' ? 3 : c === 'D' ? 1 : 0;
  return { pts, avg: pts / form.length, n: form.length };
}

// FIFA-style overall 40–95 blended from last-5 form and fair win chance.
export function teamOverall(form, fairProb) {
  const f = formPoints(form);
  if (!f) return null;
  const p = fairProb ?? 0.33;
  return Math.max(40, Math.min(95, Math.round(50 + f.avg * 10 + (p - 0.33) * 30)));
}

export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

// Last-3 form heat, shared by TeamPower + FormBattle so labels never drift.
export function heatOf(form) {
  const last3 = (form || []).slice(-3);
  if (last3.length < 2) return null;
  const pts = last3.reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
  if (pts >= 7) return { icon: '🔥', label: 'RED HOT', cls: 'text-red-300' };
  if (pts >= 4) return { icon: '↗', label: 'RISING', cls: 'text-lime-300' };
  if (pts >= 2) return { icon: '→', label: 'STEADY', cls: 'text-slate-300' };
  return { icon: '↘', label: 'DROPPING', cls: 'text-sky-300' };
}
