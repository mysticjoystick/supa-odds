// FotMob enrichment (unofficial, keyless) — lineups, ratings, form, h2h.
// Bot-side only: cached, capped, health-tracked. Never blocks the snapshot;
// when FotMob is unreachable the board simply ships without detail fields
// and the client hides those tabs.

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.fotmob.com/',
};

// Our league ids -> FotMob competition ids (leagues + domestic cups,
// so cup ties listed under a league still resolve).
export const FOTMOB_LEAGUES = {
  epl: [47, 132, 133],
  laliga: [87, 140, 138],
  seriea: [55, 86, 141],
  bundes: [54, 146, 209],
  ligue1: [53, 110, 134],
  ucl: [42],
  championship: [48, 64, 123, 124],
  eredivisie: [57, 111],
  brazil: [268, 8814],
};

const FIXTURE_TTL = 12 * 3600 * 1000;
const DETAIL_TTL = 6 * 3600 * 1000;
const MAX_FRESH_PER_RUN = 12; // stay polite

async function fmGet(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Capped parallel pool — sequential fetches made the bot crawl when FotMob
// was slow; 4 at a time keeps a 5-minute cadence with headroom.
async function pool(items, limit, fn) {
  const it = items[Symbol.iterator]();
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let n = it.next(); !n.done; n = it.next()) await fn(n.value);
  });
  await Promise.all(workers);
}

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Short names FotMob uses vs ours.
const TEAM_HINTS = {
  'man city': 'manchester city',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'spurs': 'tottenham',
  'tottenham hotspur': 'tottenham',
  'brighton hove albion': 'brighton',
  'west ham united': 'west ham',
  'newcastle united': 'newcastle',
  'leeds united': 'leeds',
  'nottingham forest': 'nottingham',
  'paris saint germain': 'psg',
  'athletic club': 'athletic bilbao',
  'inter': 'inter',
  'internazionale': 'inter',
  'milan': 'milan',
  'ac milan': 'milan',
  'borussia dortmund': 'dortmund',
  'bayern munich': 'bayern',
  'bayer leverkusen': 'leverkusen',
  'rb leipzig': 'leipzig',
  'vfb stuttgart': 'stuttgart',
  'monchengladbach': 'gladbach',
  'borussia m gladbach': 'monchengladbach',
  'wolves': 'wolverhampton',
  'cologne': 'koln',
  'nuremberg': 'nurnberg',
  '1 nuremberg': 'nurnberg',
  'atletico mineiro mg': 'atletico mg',
  'red bull bragantino sp': 'rb bragantino',
  'eintracht frankfurt': 'frankfurt',
  'sporting cp': 'sporting',
};

function sameTeam(a, b) {
  const strip = (s) => s.replace(/ [a-z]{2}$/, ''); // trailing state codes: "… sp", "… mg"
  const x = strip(TEAM_HINTS[norm(a)] || norm(a));
  const y = strip(TEAM_HINTS[norm(b)] || norm(b));
  if (!x || !y) return false;
  if (x === y) return true;
  // token overlap: "real sociedad" vs "real sociedad san sebastian b"?
  // require the shorter to be a whole token-substring of the longer.
  if (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))) return true;
  const xt = x.split(' ').filter((w) => w.length > 2);
  if (!xt.length) return false;
  const yt = new Set(y.split(' '));
  const hit = xt.filter((w) => yt.has(w)).length;
  return hit >= Math.min(2, xt.length);
}

function kickoffMs(m) {
  if (m.commenceISO) {
    const t = new Date(m.commenceISO).getTime();
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function pickPlayer(p, ratings) {
  const r = ratings?.[p.id];
  return {
    name: p.name,
    shirt: p.shirtNumber || null,
    pos: p.positionId ?? null,
    x: p.horizontalLayout?.x ?? p.verticalLayout?.y ?? null,
    y: p.horizontalLayout?.y ?? p.verticalLayout?.x ?? null,
    rating: p.performance?.rating ?? r ?? null,
    goals: p.performance?.goals ?? null,
  };
}

function ratingOf(ps, pid) {
  const p = ps?.[pid];
  const top = p?.stats?.find?.((s) => s.key === 'top_stats');
  return top?.stats?.['FotMob rating']?.stat?.value ?? null;
}

function topPlayersOf(ps, n = 6) {
  if (!ps) return [];
  return Object.entries(ps)
    .map(([pid, p]) => {
      const top = p.stats?.find?.((s) => s.key === 'top_stats')?.stats || {};
      return {
        id: pid,
        name: p.name,
        team: p.teamName,
        rating: top['FotMob rating']?.stat?.value ?? null,
        goals: top.Goals?.stat?.value ?? 0,
        assists: top.Assists?.stat?.value ?? 0,
        minutes: top['Minutes played']?.stat?.value ?? null,
      };
    })
    .filter((p) => p.rating != null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, n);
}

// matchFacts.teamForm is [homeLast5[], awayLast5[]]; each item carries
// resultString W/D/L from that team's perspective.
function formOf(matchFacts) {
  try {
    const tf = matchFacts?.teamForm;
    if (!Array.isArray(tf) || tf.length < 2) return null;
    const read = (arr) => (Array.isArray(arr) ? arr : [])
      .slice(0, 5)
      .map((g) => String(g.resultString || '').toUpperCase()[0])
      .filter((c) => 'WDL'.includes(c));
    const home = read(tf[0]);
    const away = read(tf[1]);
    if (!home.length && !away.length) return null;
    return { home, away };
  } catch {
    return null;
  }
}

export function compactDetails(md) {
  const c = md?.content;
  if (!c) return null;
  const out = {};
  const lu = c.lineup;
  if (lu?.homeTeam?.starters?.length) {
    const side = (t) => ({
      name: t.name,
      formation: t.formation || null,
      rating: t.rating ?? null,
      coach: t.coach?.name || t.coach || null,
      xi: (t.starters || []).map((p) => pickPlayer(p, null)).map((p) => ({
        ...p,
        rating: p.rating ?? ratingOf(c.playerStats, String(p.id ?? '')) ?? null,
      })),
      subs: (t.subs || []).slice(0, 9).map((p) => ({ name: p.name, shirt: p.shirtNumber || null })),
      missing: (t.unavailable || []).slice(0, 6).map((p) => (typeof p === 'string' ? p : p.name)).filter(Boolean),
    });
    // backfill xi ratings from playerStats when lineup lacks performance
    for (const t of [side(lu.homeTeam)]) {
      for (const p of t.xi) {
        if (p.rating == null) {
          const hit = Object.values(c.playerStats || {}).find((q) => q.name === p.name);
          const top = hit?.stats?.find?.((s) => s.key === 'top_stats')?.stats;
          if (top?.['FotMob rating']?.stat?.value != null) p.rating = top['FotMob rating'].stat.value;
        }
      }
    }
    out.lineups = { home: side(lu.homeTeam), away: side(lu.awayTeam) };
  }
  const tops = topPlayersOf(c.playerStats, 8);
  if (tops.length) out.topPlayers = tops;
  const pom = c.matchFacts?.playerOfTheMatch;
  if (pom?.name || pom?.[0]?.name) {
    const p = pom.name ? pom : pom[0];
    out.starMen = { name: p.name, team: p.teamName || null, rating: p.rating ?? null };
  }
  const form = formOf(c.matchFacts);
  if (form) out.form = form;
  // h2h.summary is [homeWins, draws, awayWins].
  const sum = c.h2h?.summary;
  if (Array.isArray(sum) && sum.length >= 3 && sum.some((n) => Number.isFinite(n))) {
    out.h2h = { homeWins: sum[0], draws: sum[1], awayWins: sum[2] };
  }
  return Object.keys(out).length ? out : null;
}

function resolveFixture(match, fixtures) {
  const t = kickoffMs(match);
  let best = null;
  for (const f of fixtures) {
    if (!sameTeam(match.home, f.home?.name) || !sameTeam(match.away, f.away?.name)) continue;
    const ft = f.status?.utcTime ? new Date(f.status.utcTime).getTime() : null;
    if (t && ft && Math.abs(t - ft) > 3 * 86400000) continue; // same tie, wrong leg/date
    best = f;
    if (t && ft && Math.abs(t - ft) < 86400000) break; // close enough, take it
  }
  return best;
}

export async function enrichMatches(matches, cache, log = () => {}) {
  const now = Date.now();
  const stats = { leagues: 0, resolved: 0, fresh: 0, attached: 0 };
  cache.fixtures = cache.fixtures || {};
  cache.details = cache.details || {};
  // Resolve FotMob ids for the whole board (cheap, from cached league
  // fixtures) but only pull matchDetails near kickoff — lineups/ratings
  // only exist from ~a day out. Override window for backfill/testing:
  // FOTMOB_WINDOW_DAYS=8 node bot/fetchOdds.js
  const NEAR_PAST = 86400000;
  const winDays = Number(process.env.FOTMOB_WINDOW_DAYS) || 2;
  const NEAR_FUTURE = winDays * 86400000;
  const cands = (matches || []).filter(
    (m) => FOTMOB_LEAGUES[m.leagueId] && !m.lineups && kickoffMs(m) != null
  );
  if (!cands.length) return stats;
  const byLeague = new Map();
  for (const m of cands) {
    if (!byLeague.has(m.leagueId)) byLeague.set(m.leagueId, []);
    byLeague.get(m.leagueId).push(m);
  }
  for (const [leagueId, ms] of byLeague) {
    const fids = FOTMOB_LEAGUES[leagueId];
    // Merge first + second division fixtures (cached per competition).
    let all = [];
    try {
      for (const fid of fids) {
        const ckey = `${leagueId}:${fid}`;
        let fx = cache.fixtures[ckey];
        if (!fx || now - fx.at > FIXTURE_TTL) {
          const L = await fmGet(`https://www.fotmob.com/api/data/leagues?id=${fid}`);
          fx = { at: now, all: L.fixtures?.allMatches || [] };
          cache.fixtures[ckey] = fx;
        }
        all = all.concat(fx.all || []);
      }
      stats.leagues++;
    } catch (e) {
      log(`fotmob league skip ${leagueId}: ${e.message}`);
      continue;
    }
      const jobs = [];
      for (const m of ms) {
        try {
          const f = resolveFixture(m, all);
          if (!f) continue;
          stats.resolved++;
          const fid = String(f.id);
          m.fotmobId = fid;
          m.fmHomeId = f.home?.id != null ? String(f.home.id) : null;
          m.fmAwayId = f.away?.id != null ? String(f.away.id) : null;
          const kt = kickoffMs(m);
          const near = kt > now - NEAR_PAST && kt < now + NEAR_FUTURE;
          const finished = !!f.status?.finished;
          const det = cache.details[fid];
          if (!near || (det && (finished || now - det.at <= DETAIL_TTL))) {
            // Too far out, or cache is fresh — attach what we have, no fetch.
            if (det) attach(m, det.data, stats);
            continue;
          }
          jobs.push({ m, fid, finished });
        } catch (e) {
          log(`fotmob skip ${m.home} v ${m.away}: ${e.message}`);
        }
      }
      // Over the cap? Attach stale cache for the overflow, fetch the rest.
      const fresh = jobs.slice(0, MAX_FRESH_PER_RUN);
      for (const j of jobs.slice(MAX_FRESH_PER_RUN)) {
        const det = cache.details[j.fid];
        if (det) attach(j.m, det.data, stats);
      }
      await pool(fresh, 4, async ({ m, fid, finished }) => {
        try {
          const md = await fmGet(`https://www.fotmob.com/api/data/matchDetails?matchId=${fid}`);
          const det = { at: Date.now(), finished, data: compactDetails(md) };
          cache.details[fid] = det;
          stats.fresh++;
          attach(m, det.data, stats);
        } catch (e) {
          log(`fotmob skip ${m.home} v ${m.away}: ${e.message}`);
        }
      });
  }
  // Prune stale detail cache (finished older than 7d, or anything older than 14d).
  for (const [k, v] of Object.entries(cache.details)) {
    if (now - v.at > 14 * 86400000) delete cache.details[k];
  }
  return stats;
}

function attach(m, data, stats) {
  if (!data) return;
  if (data.lineups) m.lineups = data.lineups;
  if (data.topPlayers) m.topPlayers = data.topPlayers;
  if (data.starMen) m.starMen = data.starMen;
  if (data.form) m.form = data.form;
  if (data.h2h) m.h2h = data.h2h;
  stats.attached++;
}

// ---- Season squad ratings (pre-match Ratings tab) ----
// teams?id= carries season ratings per squad member. Cached 7 days per team,
// capped per run — ~40 teams on a board, fetched once a week.

const SQUAD_TTL = 7 * 86400000;
const MAX_SQUADS_PER_RUN = 25;

function compactSquad(t) {
  try {
    const groups = t?.squad?.squad || [];
    const members = groups.flatMap((g) => g.members || []).filter((p) => !p.excludeFromRanking && p.rating != null);
    return members
      .map((p) => ({
        id: p.id,
        name: p.name,
        rating: p.rating,
        goals: p.goals ?? 0,
        assists: p.assists ?? 0,
        pos: p.positionIdsDesc || null,
        shirt: p.shirtNumber || null,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 7);
  } catch {
    return [];
  }
}

export async function enrichSquads(matches, cache, log = () => {}) {
  const now = Date.now();
  const stats = { teams: 0, fresh: 0, attached: 0 };
  cache.squads = cache.squads || {};
  const want = new Map(); // teamId -> { side, match }
  for (const m of matches || []) {
    if (!FOTMOB_LEAGUES[m.leagueId] || m.squadRatings) continue;
    if (m.fmHomeId && !cache.squads[m.fmHomeId]?.data?.length) want.set(String(m.fmHomeId), true);
    if (m.fmAwayId && !cache.squads[m.fmAwayId]?.data?.length) want.set(String(m.fmAwayId), true);
  }
  const ids = [...want.keys()];
  stats.teams = ids.length;
  const todo = [];
  for (const tid of ids) {
    const hit = cache.squads[tid];
    // Pre-id cache entries refetch once so every player gets a headshot id.
    if (hit && hit.data?.length && hit.data[0]?.id && now - hit.at < SQUAD_TTL) continue;
    if (todo.length >= MAX_SQUADS_PER_RUN) continue;
    todo.push(tid);
  }
  await pool(todo, 4, async (tid) => {
    try {
      const t = await fmGet(`https://www.fotmob.com/api/data/teams?id=${tid}`, 8000);
      cache.squads[tid] = { at: Date.now(), data: compactSquad(t) };
      stats.fresh++;
    } catch (e) {
      log(`fotmob squad skip ${tid}: ${e.message}`);
    }
  });
  for (const m of matches || []) {
    if (!FOTMOB_LEAGUES[m.leagueId] || m.squadRatings) continue;
    const h = m.fmHomeId ? cache.squads[String(m.fmHomeId)]?.data : null;
    const a = m.fmAwayId ? cache.squads[String(m.fmAwayId)]?.data : null;
    if (h?.length || a?.length) {
      m.squadRatings = { home: h || [], away: a || [] };
      stats.attached++;
    }
  }
  // Prune squads older than 30d.
  for (const [k, v] of Object.entries(cache.squads)) {
    if (now - v.at > 30 * 86400000) delete cache.squads[k];
  }
  return stats;
}

// ---- cache file helpers (bot-local, gitignored) ----
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE = join(dirname(fileURLToPath(import.meta.url)), 'fotmob-cache.json');

export async function loadCache() {
  try {
    const raw = await readFile(CACHE, 'utf8');
    const c = JSON.parse(raw);
    if (c && typeof c === 'object') return c;
  } catch { /* start fresh */ }
  return { fixtures: {}, details: {} };
}

export async function saveCache(cache) {
  try {
    await mkdir(dirname(CACHE), { recursive: true });
    await writeFile(CACHE, JSON.stringify(cache));
  } catch { /* cache is best-effort */ }
}
