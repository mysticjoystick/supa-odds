import { formPoints } from '../lib/ratings';

// Scout's take: template-generated strictly from real data.
// Never predicts — describes rating/form/goal edges only.
export function scoutsTake(match, home, away) {
  const lines = [];
  const best = (list) => (list || []).filter((p) => p.rating != null).sort((a, b) => b.rating - a.rating)[0] || null;
  const scorer = (list) => (list || []).filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals)[0] || null;
  const bh = best(home);
  const ba = best(away);
  if (bh && ba) {
    const gap = Math.abs(bh.rating - ba.rating);
    lines.push(
      gap < 0.3
        ? `Star power is level — ${bh.name} (${bh.rating.toFixed(1)}) and ${ba.name} (${ba.rating.toFixed(1)}) cancel each other out on ratings.`
        : bh.rating > ba.rating
          ? `${bh.name} (${bh.rating.toFixed(1)}) is the highest-rated player on either side — ${match.home} own the individual edge.`
          : `${ba.name} (${ba.rating.toFixed(1)}) is the highest-rated player on either side — ${match.away} own the individual edge.`
    );
  } else if (bh || ba) {
    const p = bh || ba;
    lines.push(`${p.name} leads all rated players at ${p.rating.toFixed(1)}.`);
  }
  const sh = scorer(home);
  const sa = scorer(away);
  if (sh || sa) {
    const bits = [];
    if (sh) bits.push(`${sh.name} (${sh.goals}⚽ for ${match.home})`);
    if (sa) bits.push(`${sa.name} (${sa.goals}⚽ for ${match.away})`);
    lines.push(`Goals live with ${bits.join(' and ')}.`);
  }
  const fh = formPoints(match.form?.home);
  const fa = formPoints(match.form?.away);
  if (fh && fa) {
    lines.push(
      fh.avg === fa.avg
        ? `Form is identical over the last five (${(match.form.home || []).join('')} vs ${(match.form.away || []).join('')}) — nothing separates them.`
        : fh.avg > fa.avg
          ? `${match.home} carry the hotter hand: ${(match.form.home || []).join('')} vs ${(match.form.away || []).join('')}.`
          : `${match.away} carry the hotter hand: ${(match.form.away || []).join('')} vs ${(match.form.home || []).join('')}.`
    );
  }
  if (match.h2h && (match.h2h.homeWins != null)) {
    lines.push(`History says ${match.home}: ${match.h2h.homeWins} wins, ${match.h2h.draws} draws, ${match.h2h.awayWins} ${match.away} wins.`);
  }
  return lines.slice(0, 4);
}

export default function ScoutsTake({ match, home, away, kind }) {
  const lines = scoutsTake(match, home, away);
  if (!lines.length) return null;
  return (
    <div className="halftone rounded-2xl border-2 border-sky-400/40 bg-sky-400/[0.05] p-4 shadow-[4px_4px_0_#e63329]">
      <div className="mb-2 text-[11px] font-bold tracking-widest text-sky-300">📰 SCOUT'S TAKE — {kind === 'match' ? 'FULL TIME' : 'THIS SEASON'}</div>
      <ul className="space-y-1.5">
        {lines.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug text-slate-200">
            <span className="shrink-0 text-sky-400">▸</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 footnote">Built only from ratings, goals and form above — not a prediction.</div>
    </div>
  );
}
