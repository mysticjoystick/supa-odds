// Live-room commentary — rule-based color lines woven around real match events.
// Nothing here predicts anything; it's atmosphere + state of play.

const SOCCER_FILLERS = [
  'Tempo dipping as both midfields squeeze the space.',
  'Crowd rising — every duel getting a reaction now.',
  'Full-backs pushed high on both sides. Width is the weapon.',
  'A lull while the physio checks a knock. Play about to resume.',
  'Pressing triggers everywhere — no easy out-balls.',
  'Set-piece coming up. These have decided tight games all season.',
];

const HOOPS_FILLERS = [
  'Pace is frantic — both teams running after makes.',
  'Timeout. Coaches drawing up the next three possessions.',
  'Free-throw shooting keeping this closer than the flow suggests.',
  'Bench units in — watch the energy swing.',
  'Rebound battle tilting the game right now.',
  'Crowd on its feet as the run stretches.',
];

export function fillersFor(match) {
  return match.leagueId === 'nba' ? HOOPS_FILLERS : SOCCER_FILLERS;
}

// Interleave events with atmosphere lines for a live-blog feel.
export function buildFeed(match) {
  const lines = [];
  lines.push({ min: '0’', team: null, type: 'info', text: `We're underway — ${match.home} vs ${match.away}. ${match.news}` });
  const fillers = fillersFor(match);
  (match.events || []).forEach((e, i) => {
    lines.push(e);
    if (fillers[i % fillers.length]) {
      lines.push({ min: e.min, team: null, type: 'note', text: fillers[i % fillers.length] });
    }
  });
  return lines;
}

// Momentum proxy 0..100 (home share): xG share for soccer, score+form blend otherwise.
export function momentum(match) {
  const s = match.stats;
  if (s?.home?.xg && s?.away?.xg) {
    const tot = s.home.xg + s.away.xg || 1;
    return Math.round((s.home.xg / tot) * 100);
  }
  if (match.score) {
    const tot = match.score.home + match.score.away || 1;
    return Math.round((match.score.home / tot) * 100);
  }
  return 50;
}
