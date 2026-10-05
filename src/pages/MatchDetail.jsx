import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MovementChart from '../components/MovementChart';
import TeamCrest from '../components/TeamCrest';
import LiveBadge from '../components/LiveBadge';
import TeamStats from '../components/TeamStats';
import WhyBet from '../components/WhyBet';
import BookHistory from '../components/BookHistory';
import MoreMarkets from '../components/MoreMarkets';
import PopularMarkets from '../components/MarketButtons';
import { bestPerMatch, MIN_EDGE } from '../lib/value';
import DataQuality from '../components/DataQuality';
import { useSnapshot } from '../hooks/useSnapshot';
import { MATCHES, BOOKS, LEAGUES } from '../lib/mock';
import { useSlip } from '../lib/slip';
import { leg1X2 } from '../lib/markets';
import { Odds } from '../lib/oddsFormat';
import LeagueBadge from '../components/LeagueBadge';
import { teamInk } from '../lib/teamColor';
import { fullDateLabel, shortKickoff } from '../lib/dates';
import SampleBadge from '../components/SampleBadge';
import FairGauge from '../components/FairGauge';
import OutcomeCards from '../components/OutcomeCards';
import PayoutCalculator from '../components/PayoutCalculator';
import GoalExpectancy from '../components/GoalExpectancy';
import ValueBreakdown from '../components/ValueBreakdown';
import StrengthMeter from '../components/StrengthMeter';
import LineupPitch from '../components/LineupPitch';
import RatingsPanel from '../components/RatingsPanel';
import NewsPanel from '../components/NewsPanel';
import FormStrip from '../components/FormStrip';
import { FavStar } from '../components/Favorites';

// Hero slip CTA — the match's best-priced outcome, one tap into the slip.
function HeroSlipBtn({ match, best, hasEdge }) {
  const { toggle, has } = useSlip();
  const leg = leg1X2(match, best.key);
  if (!leg) return null;
  const active = has(leg.matchId, leg.outcome, leg.market);
  const pick = best.key === 'h' ? match.home : best.key === 'a' ? match.away : 'Draw';
  return (
    <button
      onClick={() => toggle(leg)}
      aria-pressed={active}
      title={active ? `In slip @ ${leg.book} — tap to remove` : `Best price: ${pick} @ ${best.market} (${best.book})${hasEdge ? ' — flagged +EV vs the true price' : ''}`}
      className={`comic-btn inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-extrabold transition-all ${active ? 'bg-gold text-ink' : 'bg-lime-400 text-black hover:bg-lime-300 brand-glow'}`}
    >
      {active ? `✓ In slip @ ${leg.book}` : <>{pick} @ <Odds v={best.market} /> <span className="font-semibold opacity-70">({best.book})</span> + Slip</>}
    </button>
  );
}

export default function MatchDetail() {  const { id } = useParams();
  const navigate = useNavigate();
  const snap = useSnapshot();
  const pool = snap ? (snap.matches || []) : MATCHES;
  const m = pool.find((x) => String(x.id) === String(id));
  const [tab, setTab] = useState('overview');
  const goBack = (e) => {
    e.preventDefault();
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  if (!snap) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-6">
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="shimmer h-48 rounded-2xl" />
      </div>
    );
  }
  if (!m) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="mt-3 font-display text-2xl font-normal text-white">Match not found</h1>
        <p className="mt-2 text-sm text-slate-400">It may have finished and rolled off the board, or the link is stale. Try Today or Live.</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button onClick={goBack} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">← Back</button>
          <Link to="/" className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-black">Today</Link>
          <Link to="/live" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15">Live</Link>
        </div>
      </div>
    );
  }
  const hasPrices = Object.keys(m.prices || {}).length > 0 && !!m.fair;
  const best = bestPerMatch(m);
  const hasEdge = !!best && best.ev >= MIN_EDGE;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lineups', label: 'Lineups' },
    { id: 'ratings', label: 'Ratings' },
    ...(m.newsItems?.length ? [{ id: 'news', label: `News · ${m.newsItems.length}` }] : []),
    { id: 'stats', label: 'Stats' },
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview';
  const leagueName = (snap?.leagues?.length ? snap.leagues : LEAGUES).find((l) => l.id === m.leagueId)?.name || m.leagueId;
  const inkH = teamInk(m.home);
  const inkA = teamInk(m.away);
  const formPips = (arr) => (
    <span className="inline-flex justify-center gap-1" title="Last results — W won, D drew, L lost (most recent last)">
      {(arr || []).map((c, i) => (
        <span
          key={i}
          title={c === 'W' ? 'Won' : c === 'D' ? 'Drew' : 'Lost'}
          className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-extrabold ${
            c === 'W' ? 'bg-lime-400/20 text-lime-300' : c === 'D' ? 'bg-white/10 text-slate-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {c}
        </span>
      ))}
    </span>
  );
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <button onClick={goBack} className="inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-300 hover:text-white">← back</button>

      {/* VS match hero */}
      <div className="hero-grid halftone relative overflow-hidden rounded-3xl border-2 border-white/15 bg-void px-4 py-6 shadow-[6px_6px_0_#e63329] sm:px-8">
        <div className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: `${inkH}26` }} />
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full blur-3xl" style={{ backgroundColor: `${inkA}26` }} />
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center sm:gap-4">
          <div className="min-w-0 [&>img]:mx-auto [&>span]:mx-auto">
            <TeamCrest name={m.home} size={64} src={m.crestHome} />
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="min-w-0 truncate text-sm font-extrabold text-white sm:text-2xl">{m.home}</span>
              <FavStar team={m.home} size={16} />
            </div>
            {!!m.form?.home?.length && <div className="mt-2">{formPips(m.form.home)}</div>}
          </div>
          <div className="flex flex-col items-center gap-1.5 px-1 pt-1">
            {m.live && m.score ? (
              <div className="font-display tabular text-4xl font-normal tracking-tight text-white sm:text-5xl">
                {m.score.home} <span className="text-supa">–</span> {m.score.away}
              </div>
            ) : (
              <div className="font-display text-glow text-2xl font-normal tracking-wide text-slate-500 sm:text-3xl">VS</div>
            )}
            <div className="tabular mt-1 inline-block whitespace-nowrap rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-xs font-bold text-gold sm:text-sm">
              <span className="sm:hidden">{shortKickoff(m) || m.startsIn}</span>
              <span className="hidden sm:inline">{fullDateLabel(m) || m.startsIn}</span>
            </div>
            <LeagueBadge id={m.leagueId} name={leagueName} size="sm" />
            <div className="mt-1 flex items-center gap-1.5">
              <SampleBadge match={m} />
              {m.live && <LiveBadge minute={m.minute} score={m.score} />}
            </div>
          </div>
          <div className="min-w-0 [&>img]:mx-auto [&>span]:mx-auto">
            <TeamCrest name={m.away} size={64} src={m.crestAway} />
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="min-w-0 truncate text-sm font-extrabold text-white sm:text-2xl">{m.away}</span>
              <FavStar team={m.away} size={16} />
            </div>
            {!!m.form?.away?.length && <div className="mt-2">{formPips(m.form.away)}</div>}
          </div>
        </div>
        {!!m.news && (
          <p className="relative mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-slate-400">{m.news}</p>
        )}
        {best?.book && (
          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
            <HeroSlipBtn match={m} best={best} hasEdge={hasEdge} />
          </div>
        )}
      </div>
      {best?.book && (
        <FairGauge
          pick={best.key === 'h' ? m.home : best.key === 'a' ? m.away : 'Draw'}
          book={best.book}
          market={best.market}
          fair={best.fair}
          hasEdge={hasEdge}
        />
      )}
      {best?.book && (
        <PayoutCalculator match={m} />
      )}

      {/* segmented tabs — empty sections stay hidden, never guessed */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1" role="tablist" aria-label="Match sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] flex-1 shrink-0 whitespace-nowrap rounded-xl px-3 text-sm transition-all ${
              activeTab === t.id
                ? 'bg-lime-400 font-extrabold text-black shadow-[0_0_16px_rgba(163,230,53,0.3)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {!hasPrices ? (
              <div className="rounded-2xl border border-sky-400/25 bg-sky-400/[0.05] p-6 text-sm text-slate-300">
                <div className="font-bold text-sky-300">Real fixture, no odds yet</div>
                <p className="mt-1 text-slate-400">Teams, kickoff and scores are live. Prices appear when the odds feed syncs — check back soon.</p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-white/15 bg-panel p-4 shadow-[4px_4px_0_#e63329] sm:p-5">
                <OutcomeCards match={m} />
                <div className="panel-title mb-2 mt-5 flex items-center gap-1">
                  VALUE CHAIN — MARKET → TRUE PRICE → EDGE
                  <span title="Market: best book price. True: what sharp books imply. Edge: how far the book pays above true." className="grid h-4 w-4 cursor-help place-items-center rounded-full bg-white/10 text-[10px] text-slate-400">?</span>
                </div>
                <ValueBreakdown match={m} />
                <div className="mt-3 text-xs text-slate-400">Books: {(snap?.books?.length ? snap.books : BOOKS).join(' • ')}. <span title="Pinnacle takes sharp, high-limit action — its prices are the honest yardstick every book is measured against">Sharp ref: Pinnacle</span>.</div>
              </div>
            )}
            <div className="space-y-4">
              <StrengthMeter match={m} />
              <WhyBet match={m} />
            </div>
          </div>
          <GoalExpectancy match={m} />
          <PopularMarkets match={m} />
          <MoreMarkets match={m} />
        </div>
      )}

      {activeTab === 'lineups' && <LineupPitch match={m} />}
      {activeTab === 'ratings' && <RatingsPanel match={m} />}
      {activeTab === 'news' && <NewsPanel match={m} />}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <FormStrip match={m} />
          <div className="grid gap-4 md:grid-cols-2">
            {m.movement?.length > 1 ? (
              <MovementChart data={m.movement} label="Home odds movement" />
            ) : (
              <div className="sticker p-6 text-sm text-slate-400">
                No price trail yet — movement appears once live multi-book prices flow in.
              </div>
            )}
            <TeamStats match={m} />
          </div>
          <BookHistory match={m} outcome="h" books={snap?.books} />
          <DataQuality snap={snap} match={m} />
        </div>
      )}
    </div>
  );
}
