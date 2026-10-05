// ESPN free scoreboards — real fixtures, kickoff times, live scores. No key.
// Docs: unofficial site.api.espn.com scoreboard endpoints (CORS-open, stable for years).

const LEAGUE_PATHS = {
  epl: 'soccer/eng.1',
  laliga: 'soccer/esp.1',
  seriea: 'soccer/ita.1',
  bundes: 'soccer/ger.1',
  ligue1: 'soccer/fra.1',
  ucl: 'soccer/uefa.champions',
  championship: 'soccer/eng.2',
  eredivisie: 'soccer/ned.1',
  nba: 'basketball/nba',
  nfl: 'football/nfl',
  // gpl: no ESPN coverage — stays manual/sample.
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.espn.com/',
  Origin: 'https://www.espn.com',
};

export async function fetchEspnLeague(leagueId) {
  const path = LEAGUE_PATHS[leagueId];
  if (!path) return [];
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${leagueId}: ESPN HTTP ${res.status}`);
  const data = await res.json();
  return normalizeScoreboard(leagueId, data);
}

function normalizeScoreboard(leagueId, data) {
  const out = [];
  for (const ev of data?.events || []) {
    try {
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((c) => c.homeAway === 'home');
      const away = comp?.competitors?.find((c) => c.homeAway === 'away');
      if (!home?.team?.displayName || !away?.team?.displayName) continue;
      const state = ev.status?.type?.state; // pre | in | post
      const completed = ev.status?.type?.completed === true;
      const hs = home.score != null && home.score !== '' ? Number(home.score) : null;
      const as = away.score != null && away.score !== '' ? Number(away.score) : null;
      const hasScore = hs != null && as != null;
      const m = {
        id: `esp-${ev.id}`,
        leagueId,
        home: home.team.displayName,
        away: away.team.displayName,
        homeAbbr: home.team.abbreviation,
        awayAbbr: away.team.abbreviation,
        // ESPN CDN logos (CORS-open, hotlinkable) — client renders instantly,
        // no runtime badge search needed.
        crestHome: home.team.logo || null,
        crestAway: away.team.logo || null,
        startsIn: completed ? 'Final' : new Date(ev.date).toLocaleString(),
        commenceISO: ev.date,
        live: state === 'in',
        status: completed ? 'final' : state === 'in' ? 'inplay' : 'upcoming',
        score: hasScore && (state === 'in' || completed) ? { home: hs, away: as } : null,
        minute: state === 'in' ? espnClock(ev) : null,
        prices: {}, // filled below when ESPN carries odds; else needs ODDS_API_KEY
        fair: null,
        open: null,
        movement: [],
        news: 'Real fixture via ESPN scoreboard. Prices need ODDS_API_KEY.',
        oddsStatus: 'needs-key',
        real: true,
        sample: false,
      };
      attachEspnOdds(m, comp?.odds);
      out.push(m);
    } catch { /* skip malformed events */ }
  }
  return out;
}

function espnClock(ev) {
  const d = ev.status?.displayClock;
  if (d && d !== "0'") return String(d);
  const detail = ev.status?.type?.shortDetail || ev.status?.type?.detail;
  return detail ? String(detail) : 'LIVE';
}

// ---- Real odds parsing (DraftKings feed embedded in ESPN scoreboards, free) ----
// American strings ("+800" / "-340") -> decimal. Returns null when absent.
export function americanToDecimal(a) {
  if (a == null || a === '') return null;
  const n = Number(String(a).replace('−', '-'));
  if (!Number.isFinite(n) || n === 0) return null;
  const dec = n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
  return +dec.toFixed(2);
}

function pickOdds(node) {
  if (!node) return null;
  const cur = node.close?.odds ?? node.open?.odds ?? node.odds ?? null;
  const open = node.open?.odds ?? null;
  return { cur: americanToDecimal(cur), open: americanToDecimal(open) };
}

function pickLine(node) {
  if (!node) return null;
  const raw = node.close?.line ?? node.open?.line ?? node.line ?? null;
  if (raw == null) return null;
  const n = Number(String(raw).replace(/^[oOuU]/, ''));
  return Number.isFinite(n) ? n : null;
}

function devig2(h, a) {
  const t = 1 / h + 1 / a;
  return t ? [1 / h / t, 1 / a / t] : [0.5, 0.5];
}

function devig3(h, d, a) {
  const t = 1 / h + 1 / d + 1 / a;
  return t ? [1 / h / t, 1 / d / t, 1 / a / t] : [0.33, 0.33, 0.34];
}

// Attach parsed odds onto a normalized match. Returns true if any price landed.
export function attachEspnOdds(match, oddsObj) {
  const o = Array.isArray(oddsObj) ? oddsObj[0] : oddsObj;
  if (!o) return false;
  const BOOK = o.provider?.displayName || 'DraftKings';
  let landed = false;

  // 1X2 moneyline (soccer): moneyline.{home,away,draw} or homeTeamOdds-style
  const ml = o.moneyline || {};
  const hOdds = pickOdds(ml.home) || pickOdds(o.homeTeamOdds);
  const aOdds = pickOdds(ml.away) || pickOdds(o.awayTeamOdds);
  const dOdds = pickOdds(ml.draw) || (o.drawOdds?.moneyLine != null ? { cur: americanToDecimal(o.drawOdds.moneyLine), open: null } : null);
  if (hOdds?.cur && aOdds?.cur) {
    const prices = { h: hOdds.cur, a: aOdds.cur };
    if (dOdds?.cur) prices.d = dOdds.cur;
    match.prices = { [BOOK]: prices };
    let ph;
    let pa;
    let pd = null;
    if (dOdds?.cur) {
      [ph, pd, pa] = devig3(hOdds.cur, dOdds.cur, aOdds.cur);
    } else {
      [ph, pa] = devig2(hOdds.cur, aOdds.cur);
    }
    match.fair = dOdds?.cur
      ? { h: +(1 / ph).toFixed(2), d: +(1 / pd).toFixed(2), a: +(1 / pa).toFixed(2) }
      : { h: +(1 / ph).toFixed(2), d: null, a: +(1 / pa).toFixed(2) };
    match.open = {
      h: hOdds.open || hOdds.cur,
      d: dOdds?.cur ? dOdds.open || dOdds.cur : null,
      a: aOdds.open || aOdds.cur,
    };
    match.movement = [match.open.h, hOdds.cur];
    landed = true;
  }

  // Totals (soccer total.over/under, US total/total resp.)
  const tot = o.total || o.totals || null;
  const overNode = tot?.over;
  const underNode = tot?.under;
  const over = pickOdds(overNode);
  const under = pickOdds(underNode);
  const line = pickLine(overNode) ?? pickLine(underNode) ?? (Number.isFinite(+o.overUnder) ? +o.overUnder : null);
  if (line != null && over?.cur && under?.cur) {
    const [po] = devig2(over.cur, under.cur);
    match.totals = {
      line,
      over: { o: over.cur, b: BOOK },
      under: { o: under.cur, b: BOOK },
      fairOver: +(1 / po).toFixed(2),
    };
    landed = true;
  } else if (line != null) {
    match.totalsLine = line; // line known, prices missing
  }

  if (landed) {
    match.news = `Real odds via ESPN (${BOOK} feed) — fair devigged from the same book.`;
    match.oddsStatus = 'live';
  }
  return landed;
}

export async function fetchAllEspn(leagueIds) {
  const all = [];
  for (const id of leagueIds) {
    try {
      const ms = await fetchEspnLeague(id);
      console.log(`ESPN ${id}: ${ms.length} events (${ms.filter((m) => m.live).length} live)`);
      all.push(...ms);
    } catch (e) {
      console.warn(`ESPN skip ${id}: ${e.message}`);
    }
  }
  return all;
}

// League headlines (free, no key) — powers the match News tab.
export async function fetchEspnNews(leagueId) {
  const path = LEAGUE_PATHS[leagueId];
  if (!path) return [];
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/news`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${leagueId} news: HTTP ${res.status}`);
  const data = await res.json();
  return (data?.articles || []).slice(0, 8).map((a) => ({
    headline: a.headline || '',
    description: (a.description || '').slice(0, 220),
    published: a.published || null,
    image: a.images?.[0]?.url || null,
    url: a.links?.web?.href || null,
  })).filter((a) => a.headline);
}
