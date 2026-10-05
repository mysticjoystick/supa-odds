// OddsLens bot — zero AI. ESPN scoreboards (+ embedded odds) -> public/snapshot.json
// Usage:
//   node bot/fetchOdds.js                  (real data, no key needed)
//   ODDS_API_KEY=xxx node bot/fetchOdds.js (adds multi-book odds via The Odds API)
//   npm run bot:watch                      (auto loop every 5 min)
//   node bot/fetchOdds.js -- --only epl,nba (quota saver when a key is set)
// Free odds key (optional): https://the-odds-api.com/ — put it in .env as ODDS_API_KEY.
// No samples: every snapshot row is a real ESPN fixture. Ever.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'snapshot.json');

const SPORT_KEYS = {
  epl: 'soccer_epl',
  laliga: 'soccer_spain_la_liga',
  seriea: 'soccer_italy_serie_a',
  bundes: 'soccer_germany_bundesliga',
  ligue1: 'soccer_france_ligue_one',
  ucl: 'soccer_uefa_champs_league',
  championship: 'soccer_england_championship',
  eredivisie: 'soccer_netherlands_eredivisie',
  nba: 'basketball_nba',
  nfl: 'americanfootball_nfl',
};

const LEAGUES = [
  { id: 'epl', name: 'Premier League', sport: 'Soccer', tier: 1 },
  { id: 'laliga', name: 'La Liga', sport: 'Soccer', tier: 2 },
  { id: 'nba', name: 'NBA', sport: 'Basketball', tier: 1 },
  { id: 'nfl', name: 'NFL', sport: 'American Football', tier: 1 },
  { id: 'seriea', name: 'Serie A', sport: 'Soccer', tier: 2 },
  { id: 'bundes', name: 'Bundesliga', sport: 'Soccer', tier: 3 },
  { id: 'ucl', name: 'Champions League', sport: 'Soccer', tier: 2 },
  { id: 'ligue1', name: 'Ligue 1', sport: 'Soccer', tier: 3 },
  { id: 'championship', name: 'Championship', sport: 'Soccer', tier: 3 },
  { id: 'eredivisie', name: 'Eredivisie', sport: 'Soccer', tier: 3 },
  { id: 'brazil', name: 'Brazil Série A', sport: 'Soccer', tier: 3 },
  // GPL has no odds-API coverage — mock/manual prices only, skipped in live fetch.
  { id: 'gpl', name: 'Ghana Premier League', sport: 'Soccer', tier: 2, manual: true },
];

// api.the-odds-api.com style book keys -> our display names
// Ghana books aren't on that feed — Pinnacle stays as the sharp ref for fair odds.
const BOOK_MAP = {
  pinnacle: 'Pinnacle',
  draftkings: 'DraftKings',
  fanduel: 'FanDuel',
  betmgm: 'BetMGM',
  bet365: 'Bet365',
  sportybet: 'SportyBet',
};
const BOOKS = ['Pinnacle', 'DraftKings', 'SportyBet', 'Betway', 'betPawa', 'Soccabet', '1xBet', '22Bet', 'MSport', 'Melbet', 'Betano', 'Betika'];

function americanToDecimal(american) {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

function toDecimal(price, oddsFormat) {
  if (price == null) return null;
  if (oddsFormat === 'american') return Number(americanToDecimal(price).toFixed(2));
  return Number(price);
}

async function fetchLeague(leagueId, apiKey) {
  const sport = SPORT_KEYS[leagueId];
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us,uk,eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${leagueId}: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.slice(0, 12) : [];
}

function normalizeEvent(ev, leagueId) {
  const prices = pricesFromEvent(ev);
  const pin = prices.Pinnacle || Object.values(prices)[0] || { h: 2.0, d: 3.4, a: 3.4 };
  const cur = pin.h || 2.0;
  return {
    id: `${leagueId}-${ev.id.slice(0, 8)}`,
    leagueId,
    home: ev.home_team,
    away: ev.away_team,
    startsIn: new Date(ev.commence_time).toLocaleString(),
    // Explicitly NOT live: only mergeScore() may flip this, and only from the
    // real scores feed. Never invent live status.
    live: false,
    status: 'upcoming',
    score: null,
    minute: null,
    real: true,
    sample: false,
    oddsStatus: 'live',
    prices: Object.fromEntries(BOOKS.filter((b) => prices[b]).map((b) => [b, prices[b]])),
    fair: { ...pin },
    open: { ...pin },
    movement: [+(cur * 1.06).toFixed(2), +(cur * 1.03).toFixed(2), +cur.toFixed(2)],
    news: 'Live API snapshot — fair = Pinnacle/sharp ref.',
  };
}

async function fetchScores(leagueId, apiKey) {
  // Scores endpoint marks games live/completed + carries latest score. Cheap, no odds cost.
  const sport = SPORT_KEYS[leagueId];
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${apiKey}&daysFrom=1&daysTo=1&dateFormat=iso`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${leagueId} scores: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function mergeScore(match, scores) {
  const hit = scores.find(
    (s) => s.home_team === match.home && s.away_team === match.away
  );
  if (!hit) return match;
  if (hit.completed) {
    return { ...match, live: false, status: 'final', score: scoreOf(hit), startsIn: 'Final' };
  }
  if (hit.commence_time && new Date(hit.commence_time) < new Date() && !hit.completed) {
    return { ...match, live: true, status: 'inplay', score: scoreOf(hit), minute: 'LIVE', startsIn: 'LIVE' };
  }
  return match;
}

function scoreOf(s) {
  if (!s.scores?.length) return match_score_fallback(s);
  const h = s.scores.find((x) => x.name === s.home_team);
  const a = s.scores.find((x) => x.name === s.away_team);
  if (h?.score == null || a?.score == null) return null;
  return { home: Number(h.score), away: Number(a.score) };
}

function match_score_fallback() {
  return null;
}

// ---- Odds history store (powers explorer / timeline / archive / volatility) ----
// public/history.json: { updatedAt, series: { "<match>|<book>|<outcome>": [[ts, odds], ...] } }
const HIST = join(ROOT, 'public', 'history.json');
const HIST_CAP = 96; // ~8h at 5-min ticks; keeps history.json light for mobile

function hkey(matchId, book, outcome) {
  return `${matchId}|${book}|${outcome}`;
}

function hashN(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

async function loadHistory() {
  try {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(HIST, 'utf8');
    const h = JSON.parse(raw);
    if (h && typeof h.series === 'object') return h;
  } catch { /* start fresh */ }
  return { updatedAt: null, series: {} };
}

function pushPoint(hist, matchId, book, outcome, ts, odds) {
  if (odds == null || !Number.isFinite(odds)) return;
  const k = hkey(matchId, book, outcome);
  const arr = hist.series[k] || (hist.series[k] = []);
  const last = arr[arr.length - 1];
  if (last && last[1] === odds) {
    last[0] = ts; // refresh timestamp, no duplicate point
    return;
  }
  arr.push([ts, odds]);
  if (arr.length > HIST_CAP) arr.splice(0, arr.length - HIST_CAP);
}

// First mock run seeds a 24h synthetic backfill so the explorer has shape.
// Deterministic noise (hash-seeded) — stable across runs.
function backfillSeries(hist, match, now) {
  for (const [book, p] of Object.entries(match.prices || {})) {
    for (const o of ['h', 'd', 'a']) {
      if (p[o] == null) continue;
      const k = hkey(match.id, book, o);
      if (hist.series[k]?.length) continue;
      const drift = match.movement?.length > 1 && o === 'h'
        ? (match.movement[0] - match.movement[match.movement.length - 1]) / match.movement[match.movement.length - 1]
        : (hashN(k) - 0.5) * 0.06;
      const pts = [];
      for (let i = 24; i >= 0; i--) {
        const t = now - i * 3600 * 1000;
        const prog = 1 - i / 24;
        const wob = Math.sin(i * 1.7 + hashN(k) * 9) * 0.008;
        pts.push([t, +(p[o] * (1 + drift * (1 - prog)) * (1 + wob)).toFixed(2)]);
      }
      hist.series[k] = pts.slice(-HIST_CAP);
    }
  }
}

// Team-name fuzzy match: odds feeds and ESPN rarely spell names identically.
const TEAM_ALIASES = {
  'man city': 'manchester city',
  'man utd': 'manchester united',
  'man united': 'manchester united',
  'la lakers': 'los angeles lakers',
  'psg': 'paris saint germain',
  'paris sg': 'paris saint germain',
  'bayern': 'bayern munich',
  'dortmund': 'borussia dortmund',
  'inter': 'internazionale',
  'milan': 'ac milan',
  'spurs': 'tottenham hotspur',
  'barca': 'barcelona',
  'madrid': 'real madrid',
};

function normTeam(s) {
  const clean = String(s || '')
    .normalize('NFD') // Atlético → Atletico so accents never break matching
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return TEAM_ALIASES[clean] || clean;
}

function sameTeams(h1, a1, h2, a2) {
  const a = normTeam(h1);
  const b = normTeam(a1);
  const c = normTeam(h2);
  const d = normTeam(a2);
  const eq = (x, y) => x === y || (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x)));
  return eq(a, c) && eq(b, d);
}

// SportyBet eventIds repeat across tournaments, so match ids key on
// league + teams + kickoff. Deterministic across runs (history stays joined);
// the numeric suffix is a last-resort guard, never hit in practice.
function sbMatchId(ev, usedIds) {
  const slug = (s) => normTeam(s).replace(/ /g, '').slice(0, 16) || 'x';
  const t = ev.commenceMs ? new Date(ev.commenceMs).getTime() : 0;
  const base = `sb-${ev.leagueId || 'x'}-${slug(ev.home)}-v-${slug(ev.away)}-${t || String(ev.sbId || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'x'}`;
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  let i = 2;
  while (usedIds.has(`${base}-${i}`)) i++;
  const id = `${base}-${i}`;
  usedIds.add(id);
  return id;
}

// Prices keyed by our display book names, from one odds-API event.
function pricesFromEvent(ev) {
  const prices = {};
  for (const bm of ev.bookmakers || []) {
    const name = BOOK_MAP[bm.key] || null;
    if (!name) continue;
    const h2h = (bm.markets || []).find((m) => m.key === 'h2h');
    if (!h2h) continue;
    const outs = Object.fromEntries((h2h.outcomes || []).map((o) => [o.name, o.price]));
    // outcomes are team names; map home/away/draw by matching
    const h = outs[ev.home_team] ?? null;
    const a = outs[ev.away_team] ?? null;
    const d = Object.entries(outs).find(([k]) => k !== ev.home_team && k !== ev.away_team)?.[1] ?? null;
    prices[name] = { h: h ? +h : null, d: d ? +d : null, a: a ? +a : null };
  }
  return prices;
}

function devigFair(h2h) {
  const { h, d, a } = h2h;
  if (h && d && a) {
    const t = 1 / h + 1 / d + 1 / a;
    return { h: +(h * t).toFixed(2), d: +(d * t).toFixed(2), a: +(a * t).toFixed(2) };
  }
  if (h && a) {
    const t = 1 / h + 1 / a;
    return { h: +(h * t).toFixed(2), d: null, a: +(a * t).toFixed(2) };
  }
  return null;
}

function devigOver(over, under) {
  if (!over || !under) return null;
  const t = 1 / over + 1 / under;
  return +((1 / (1 / over / t))).toFixed(2);
}

async function runOnce({ apiKey }) {
  const { fetchAllEspn } = await import('./espn.js');
  const { loadHealth, saveHealth, record, retry, isStale } = await import('./health.js');
  const now = Date.now();
  const hist = await loadHistory();
  const health = await loadHealth();
  // Previous snapshot = donor for stale carry-forward when a feed dies.
  let prevSnap = null;
  try {
    prevSnap = JSON.parse(await readFile(OUT, 'utf8'));
  } catch { /* first run */ }
  const prevSbAt = prevSnap?.metadata?.books?.SportyBet?.updatedAt || prevSnap?.updatedAt || null;
  const inScope = (x) => !x.manual && (ONLY.size === 0 || ONLY.has(x.id));
  const leagueIds = LEAGUES.filter(inScope).map((x) => x.id);

  // 1. REAL fixtures/scores via ESPN (free, no key) — retried, health-tracked.
  const espnRes = await retry('ESPN', () => fetchAllEspn(leagueIds));
  const real = espnRes.ok ? espnRes.value : [];
  record(health, 'espn', espnRes.ok, { count: real.length, error: espnRes.error });
  if (!espnRes.ok && prevSnap?.matches?.length) {
    // ESPN itself down: keep serving the previous board rather than wiping the site.
    for (const pm of prevSnap.matches) {
      if (!real.find((m) => m.id === pm.id)) real.push({ ...pm, live: false, status: pm.status === 'inplay' ? 'upcoming' : pm.status });
    }
    console.log(`ESPN down — carried ${prevSnap.matches.length} matches from previous snapshot`);
  }

  // 2. REAL odds via key, attached onto ESPN matches by team name.
  let attached = 0;
  if (apiKey) {
    for (const l of LEAGUES.filter(inScope)) {
      try {
        const cap = l.tier === 1 ? 12 : 6;
        const events = (await fetchLeague(l.id, apiKey)).slice(0, cap);
        for (const ev of events) {
          const priced = pricesFromEvent(ev);
          if (!Object.keys(priced).length) continue;
          const pin = priced.Pinnacle || Object.values(priced)[0];
          const cur = pin.h || 2.0;
          const pack = {
            prices: Object.fromEntries(BOOKS.filter((b) => priced[b]).map((b) => [b, priced[b]])),
            fair: { ...pin },
            open: { ...pin },
            movement: [+(cur * 1.06).toFixed(2), +(cur * 1.03).toFixed(2), +cur.toFixed(2)],
            news: 'Real odds via The Odds API — fair = Pinnacle/sharp ref.',
            oddsStatus: 'live',
          };
          const host = real.find((m) => m.leagueId === l.id && sameTeams(m.home, m.away, ev.home_team, ev.away_team));
          if (host && Object.keys(pack.prices).length) {
            Object.assign(host, pack);
            attached++;
          } else {
            const n = normalizeEvent(ev, l.id);
            if (Object.keys(n.prices).length) {
              n.real = true;
              n.sample = false;
              n.oddsStatus = 'live';
              real.push(n);
              attached++;
            }
          }
        }
        console.log(`ODDS ${l.id}: ${events.length} priced events`);
      } catch (e) {
        console.warn(`ODDS WARN ${l.id}: ${e.message}`);
      }
    }
  }

  // 2b. REAL SportyBet odds (free, no key) — retried; on failure the previous
  // snapshot's SportyBet prices are carried forward (marked stale, max 60 min).
  // Diagnostic: SPORTYBET_OFF=1 simulates an outage to test the watchdog.
  const carriedIds = new Set();
  let sbFresh = false;
  let sbCarried = 0;
  try {
    const { fetchSportyBet } = await import('./sportybet.js');
    const sbRes = await retry('SportyBet', async () => {
      if (process.env.SPORTYBET_OFF === '1') throw new Error('simulated outage (SPORTYBET_OFF=1)');
      return fetchSportyBet();
    });
    record(health, 'sportybet', sbRes.ok, { error: sbRes.error });
    if (!sbRes.ok) throw new Error(sbRes.error);
    const sbEvents = sbRes.value;
    sbFresh = true;
    let sbAttached = 0;
    let sbNew = 0;
    const usedIds = new Set(real.map((m) => m.id));
    for (const ev of sbEvents) {
      const host = real.find((m) => sameTeams(m.home, m.away, ev.home, ev.away));
      if (host) {
        if (ev.h2h && (ev.h2h.h || ev.h2h.a)) {
          host.prices = { ...(host.prices || {}), SportyBet: { h: ev.h2h.h ?? null, d: ev.h2h.d ?? null, a: ev.h2h.a ?? null } };
          host.oddsStatus = 'live';
          host.sbAt = new Date(now).toISOString();
          sbAttached++;
        }
        if (ev.totals && ev.totals.over && ev.totals.under) {
          const cur = host.totals;
          if (!cur || cur.line === ev.totals.line) {
            const overs = [cur?.over, { o: ev.totals.over, b: 'SportyBet' }].filter((x) => x?.o);
            const unders = [cur?.under, { o: ev.totals.under, b: 'SportyBet' }].filter((x) => x?.o);
            const over = overs.sort((a, b) => b.o - a.o)[0];
            const under = unders.sort((a, b) => b.o - a.o)[0];
            const fairOver = cur?.fairOver ?? devigOver(over.o, under.o);
            host.totals = { line: ev.totals.line, over, under, fairOver };
          }
        }
        if (ev.h2h && !host.fair) {
          host.fair = devigFair(ev.h2h);
          host.open = { ...ev.h2h };
          host.movement = [ev.h2h.h];
          host.news = 'Real odds via SportyBet feed.';
        }
      } else if (ev.leagueId) {
        const p = ev.h2h || {};
        const fair = ev.h2h ? devigFair(ev.h2h) : null;
        real.push({
          // Stable + unique: eventId alone repeats across tournaments, so key
          // on league + teams + kickoff (deduped below as a safety net).
          id: sbMatchId(ev, usedIds),
          leagueId: ev.leagueId,
          home: ev.home,
          away: ev.away,
          startsIn: ev.commenceMs ? new Date(ev.commenceMs).toLocaleString() : 'Upcoming',
          commenceISO: ev.commenceMs ? new Date(ev.commenceMs).toISOString() : null,
          live: false,
          status: 'upcoming',
          score: null,
          minute: null,
          real: true,
          sample: false,
          oddsStatus: 'live',
          sbAt: new Date(now).toISOString(),
          prices: ev.h2h ? { SportyBet: { h: p.h ?? null, d: p.d ?? null, a: p.a ?? null } } : {},
          fair,
          open: ev.h2h ? { ...ev.h2h } : null,
          movement: ev.h2h?.h ? [ev.h2h.h] : [],
          totals: ev.totals ? {
            line: ev.totals.line,
            over: { o: ev.totals.over, b: 'SportyBet' },
            under: { o: ev.totals.under, b: 'SportyBet' },
            fairOver: devigOver(ev.totals.over, ev.totals.under),
          } : null,
          news: `Real odds via SportyBet feed (${ev.tournament}).`,
        });
        sbNew++;
      }
    }
    console.log(`SportyBet: ${sbEvents.length} events, ${sbAttached} attached, ${sbNew} new`);
  } catch (e) {
    // Watchdog: feed dead even after retries — carry last good SportyBet prices
    // forward (max 60 min old) instead of wiping the comparison board.
    console.warn(`SportyBet DOWN: ${e.message} — attempting stale carry-forward`);
    if (prevSbAt && !isStale(prevSbAt) && prevSnap?.matches?.length) {
      const prevById = new Map(prevSnap.matches.map((m) => [m.id, m]));
      for (const m of real) {
        const pm = prevById.get(m.id);
        const sbp = pm?.prices?.SportyBet;
        if (sbp && (sbp.h || sbp.a) && !m.prices?.SportyBet) {
          m.prices = { ...(m.prices || {}), SportyBet: { ...sbp } };
          m.sbAt = prevSbAt;
          m.sbStale = true;
          if (pm.totals && JSON.stringify(pm.totals).includes('SportyBet') && !m.totals) m.totals = pm.totals;
          carriedIds.add(m.id);
          sbCarried++;
        }
      }
      console.log(`SportyBet: carried ${sbCarried} stale price sets (as of ${prevSbAt})`);
    } else {
      console.warn(`SportyBet: nothing fresh to carry (last good: ${prevSbAt || 'never'})`);
    }
  }
  // 2c. Match-detail enrichment (keyless): FotMob lineups/ratings/form +
  // ESPN headlines. Best-effort — the board ships fine without any of it.
  try {
    const { loadCache, saveCache, enrichMatches } = await import('./fotmob.js');
    const fcache = await loadCache();
    const fst = await enrichMatches(real, fcache, (msg) => console.log(msg));
    await saveCache(fcache);
    record(health, 'fotmob', true, { count: fst.attached, error: null });
    console.log(`FotMob: ${fst.leagues} leagues, ${fst.resolved} fixtures, ${fst.fresh} fresh, ${fst.attached} enriched`);
    const { enrichSquads } = await import('./fotmob.js');
    const sq = await enrichSquads(real, fcache);
    await saveCache(fcache);
    console.log(`FotMob squads: ${sq.teams} teams wanted, ${sq.fresh} fresh, ${sq.attached} matches rated`);
  } catch (e) {
    record(health, 'fotmob', false, { error: e.message });
    console.warn(`FotMob DOWN: ${e.message} — shipping without detail fields`);
  }
  try {
    const { fetchEspnNews } = await import('./espn.js');
    let newsCount = 0;
    for (const l of leagueIds) {
      try {
        const arts = await fetchEspnNews(l);
        if (!arts.length) continue;
        for (const m of real) {
          if (m.leagueId !== l) continue;
          const hn = normTeam(m.home).split(' ').filter((w) => w.length > 3);
          const an = normTeam(m.away).split(' ').filter((w) => w.length > 3);
          const hits = arts.filter((a) => {
            const t = `${a.headline} ${a.description}`.toLowerCase();
            return hn.some((w) => t.includes(w)) || an.some((w) => t.includes(w));
          });
          const rest = arts.filter((a) => !hits.includes(a));
          m.newsItems = [...hits, ...rest].slice(0, 3);
          if (m.newsItems.length) newsCount++;
        }
      } catch (e) {
        console.warn(`ESPN news skip ${l}: ${e.message}`);
      }
    }
    record(health, 'espn-news', true, { count: newsCount, error: null });
    console.log(`ESPN news: headlines on ${newsCount} matches`);
  } catch (e) {
    record(health, 'espn-news', false, { error: e.message });
    console.warn(`ESPN news DOWN: ${e.message}`);
  }
  //    (The TIPS archive in mock.js stays as historical grading records only.)
  const matches = real;
  const tips = [];
  let mode;
  let sources;
  let liveFlag;
  if (apiKey) {
    mode = 'live';
    sources = ['ESPN scoreboards + odds', 'multi-book odds feed'];
    liveFlag = true;
  } else {
    mode = 'hybrid';
    sources = ['ESPN scoreboards + odds (free)', 'SportyBet odds feed (free)'];
    liveFlag = false;
  }

  if (!hist.updatedAt) matches.forEach((m) => backfillSeries(hist, m, now));
  matches.forEach((m) => {
    const staleCarry = carriedIds.has(m.id);
    for (const [book, p] of Object.entries(m.prices || {})) {
      // Carried stale prices don't pollute the history trail.
      if (staleCarry && book === 'SportyBet') continue;
      for (const o of ['h', 'd', 'a']) pushPoint(hist, m.id, book, o, now, p[o]);
    }
  });
  hist.updatedAt = new Date(now).toISOString();

  const seenBooks = new Set();
  const seenLiveBooks = new Set();
  matches.forEach((m) => {
    const live = m.oddsStatus === 'live';
    Object.keys(m.prices || {}).forEach((b) => {
      seenBooks.add(b);
      if (live) seenLiveBooks.add(b);
    });
  });
  const allBooks = [...new Set([...BOOKS, ...seenBooks])];
  const bookMeta = Object.fromEntries(
    allBooks.map((b) => [
      b,
      seenBooks.has(b)
        ? { updatedAt: new Date(now).toISOString(), source: seenLiveBooks.has(b) ? 'live feed' : 'not in feed' }
        : { updatedAt: null, source: 'not in feed' },
    ])
  );
  // Watchdog override: carried SportyBet prices are honestly labeled stale,
  // keeping the previous timestamp so the UI can show their age.
  if (sbCarried > 0 && !sbFresh) {
    bookMeta.SportyBet = { updatedAt: prevSbAt, source: 'stale feed' };
  }
  record(health, 'oddsapi', !apiKey || attached > 0 || real.length > 0, {
    count: attached,
    error: apiKey && attached === 0 ? 'key set but nothing attached' : null,
  });
  await saveHealth(health);

  const snap = {
    matches,
    leagues: LEAGUES,
    books: BOOKS,
    tips,
    updatedAt: new Date(now).toISOString(),
    generatedAt: new Date(now).toISOString(),
    metadata: {
      mode,
      oddsUpdatedAt: seenLiveBooks.size ? new Date(now).toISOString() : null,
      scoresUpdatedAt: new Date(now).toISOString(),
      dataSources: sources,
      leagues: ONLY.size ? [...ONLY].join(',') : 'all',
      counts: { real: matches.length },
      historyPoints: Object.values(hist.series).reduce((s, a) => s + a.length, 0),
      books: bookMeta,
      health: Object.fromEntries(
        Object.entries(health.sources).map(([k, v]) => [k, { ok: v.ok, fails: v.fails, lastOk: v.lastOk, lastError: v.lastError, count: v.count }])
      ),
      staleCarry: sbCarried,
    },
    live: liveFlag,
    source: sources.join(' + '),
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snap, null, 2));
  await writeFile(HIST, JSON.stringify(hist));
  const counts = snap.metadata.counts;
  console.log(`Wrote ${mode} snapshot: ${matches.length} real matches -> public/snapshot.json`);
}

function argVal(args, flag, fallback) {
  const i = args.indexOf(flag);
  if (i === -1) return fallback;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function argList(args, flag) {
  const i = args.indexOf(flag);
  if (i === -1 || !args[i + 1]) return new Set();
  return new Set(args[i + 1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

// League filter for quota control, e.g. --only epl,nba
const ONLY = new Set();

async function main() {
  const args = process.argv.slice(2);
  const apiKey = process.env.ODDS_API_KEY || process.env.VITE_ODDS_API_KEY || '';
  const watch = args.includes('--watch');
  const intervalMin = argVal(args, '--interval-min', 5);
  for (const id of argList(args, '--only')) ONLY.add(id);
  if (ONLY.size) console.log(`League filter: ${[...ONLY].join(', ')}`);
  // NOTE: --mock is retired (samples removed). Every mode serves real ESPN data.

  await runOnce({ apiKey });
  if (!watch) return;

  console.log(`Watching every ${intervalMin} min (${apiKey ? 'live odds' : 'hybrid: ESPN real, no key needed'}). Ctrl+C to stop.`);
  setInterval(() => {
    runOnce({ apiKey }).catch((e) => console.error('watch tick failed:', e.message));
  }, intervalMin * 60 * 1000);
}

main().catch((e) => { console.error(e); process.exit(1); });
