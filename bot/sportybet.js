// SportyBet Ghana public odds — no key. Discovered from their own site traffic
// (api/gh/factsCenter/pcUpcomingEvents). Free, pre-match 1X2 + totals.
// Be polite: small pageSize, few pages, reuse the 5-min bot cadence.

const BASE = 'https://www.sportybet.com/api/gh/factsCenter/pcUpcomingEvents';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.sportybet.com/gh/sport/football',
  Origin: 'https://www.sportybet.com',
};
const MARKET_IDS = '1,18,10,29,11,26,36,14,60100';
const PAGE_SIZE = 100;
const MAX_PAGES = 6;

// category + tournament -> our league ids (GPL first: it also contains "Premier League").
function leagueOf(category, tournament) {
  const c = `${category} ${tournament}`.toLowerCase();
  if (c.includes('ghana')) return 'gpl';
  // Brazil's Serie A is not Italy's — it gets its own league below.
  if (c.includes('brazil') || c.includes('brasileir') || c.includes('copa do brasil')) return 'brazil';
  // Every country has a "Premier League" — only England's is our EPL.
  if (c.includes('premier league') && !/(england|english)/.test(c)) {
    if (!/(ukrain|russia|belarus|kazakh|armenia|georgia|moldova|bosnia|albania|kosovo|malta|cyprus|lithuania|latvia|estonia|finland|norway|sweden|denmark|iceland|ireland|scotland|wales|australia|egypt|nigeria|israel|turkey|greece|portugal|belgium|austria|switzerland|poland|czech|slovak|hungar|romania|bulgar|serbia|croatia|slovenia|montenegro|macedonia)/.test(c)) return 'epl';
    return null;
  }
  if (c.includes('champions league') && c.includes('uefa')) return 'ucl';
  if (c.includes('championship')) return 'championship';
  if (c.includes('premier league')) return 'epl';
  if (c.includes('laliga') || c.includes('la liga')) return 'laliga';
  if (c.includes('serie a')) return 'seriea';
  if (c.includes('bundesliga')) return 'bundes';
  if (c.includes('ligue 1')) return 'ligue1';
  if (c.includes('eredivisie')) return 'eredivisie';
  return null;
}

export async function fetchSportyBet() {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}?sportId=sr%3Asport%3A1&marketId=${encodeURIComponent(MARKET_IDS)}&pageSize=${PAGE_SIZE}&pageNum=${page}&option=1&_t=${Date.now()}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`SportyBet HTTP ${res.status} (page ${page})`);
    const j = await res.json();
    if (j.bizCode !== 0 && j.bizCode !== '0' && j.bizCode !== 10000 && j.bizCode !== '10000') throw new Error(`SportyBet bizCode ${j.bizCode}: ${j.message}`);
    const tournaments = j.data?.tournaments || [];
    let n = 0;
    for (const t of tournaments) {
      const leagueId = leagueOf(t.categoryName, t.name);
      for (const e of t.events || []) {
        const ev = normalize(e, leagueId, t.name);
        if (ev) {
          out.push(ev);
          n++;
        }
      }
    }
    if (n === 0) break;
  }
  return out;
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) && n > 1 ? +n.toFixed(2) : null;
}

function normalize(e, leagueId, tournament) {
  if (!e.homeTeamName || !e.awayTeamName) return null;
  if (e.status !== 0 && e.matchStatus && e.matchStatus !== 'Not start') return null;
  if (e.estimateStartTime && e.estimateStartTime < Date.now() - 3 * 3600 * 1000) return null; // finished
  const markets = e.markets || [];
  const ml = markets.find((m) => m.id === '1' && Array.isArray(m.outcomes));
  let h2h = null;
  if (ml) {
    const get = (desc) => {
      const o = ml.outcomes.find((x) => x.desc === desc && x.isActive !== 0 && x.odds);
      return o ? num(o.odds) : null;
    };
    const h = get('Home');
    const d = get('Draw');
    const a = get('Away');
    if (h && a) h2h = { h, d, a };
  }
  // Totals: market id 18, outcomes "Over X.X"/"Under X.X", specifier "total=X.X".
  // Prefer the main 2.5 line.
  let totals = null;
  const ouMarkets = markets.filter((m) => m.id === '18' && Array.isArray(m.outcomes));
  ouMarkets.sort((a, b) => {
    const la = String(a.specifier || '');
    const lb = String(b.specifier || '');
    if (la.includes('2.5') && !lb.includes('2.5')) return -1;
    if (lb.includes('2.5') && !la.includes('2.5')) return 1;
    return 0;
  });
  for (const m of ouMarkets) {
    const outs = m.outcomes || [];
    const isOn = (x) => x && x.odds && x.isActive !== 0 && x.active !== 0;
    const over = outs.find((x) => /^over\b/i.test(x.desc || ''));
    const under = outs.find((x) => /^under\b/i.test(x.desc || ''));
    const spec = String(m.specifier || '');
    const lm = /(\d+(?:\.\d+)?)/.exec(spec);
    if (isOn(over) && isOn(under) && lm) {
      totals = { line: +lm[1], over: num(over.odds), under: num(under.odds) };
      if (totals.over && totals.under) break;
      totals = null;
    }
  }
  if (!h2h && !totals) return null;
  return {
    sbId: String(e.eventId || e.gameId || ''),
    home: e.homeTeamName,
    away: e.awayTeamName,
    leagueId, // may be null (other leagues) — caller decides
    tournament,
    commenceMs: e.estimateStartTime,
    h2h, // {h,d,a} decimal or nulls
    totals, // {line, over, under} decimal or null
  };
}
