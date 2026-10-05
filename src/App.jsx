import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import OddsTicker from './components/OddsTicker';
import Logo from './components/Logo';
import { getSnapshot, refreshSnapshot } from './lib/api';
import { OddsProvider } from './lib/oddsFormat';
import { SlipProvider, useSlip } from './lib/slip';
import { MyBooksProvider } from './lib/myBooks';
import SlipBar from './components/SlipBar';
import ErrorBoundary from './components/ErrorBoundary';

// Route-level splitting — first load ships Today only.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Live = lazy(() => import('./pages/Live'));
const Compare = lazy(() => import('./pages/Compare'));
const Value = lazy(() => import('./pages/Value'));
const Builder = lazy(() => import('./pages/Builder'));
const Arb = lazy(() => import('./pages/Arb'));
const Performance = lazy(() => import('./pages/Performance'));
const History = lazy(() => import('./pages/History'));
const Volatility = lazy(() => import('./pages/Volatility'));
const Form = lazy(() => import('./pages/Form'));
const Tools = lazy(() => import('./pages/Tools'));
const Slip = lazy(() => import('./pages/Slip'));
const MatchDetail = lazy(() => import('./pages/MatchDetail'));
const Tips = lazy(() => import('./pages/Tips'));
const Tracker = lazy(() => import('./pages/Tracker'));
const Learn = lazy(() => import('./pages/Learn'));
const Responsible = lazy(() => import('./pages/Responsible'));
const Pro = lazy(() => import('./pages/Pro'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="shimmer h-8 w-48 rounded-lg" />
      <div className="shimmer mt-3 h-40 rounded-2xl" />
    </div>
  );
}

export default function App() {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    let live = true;
    getSnapshot().then((s) => live && setSnap(s)).catch(() => {});
    // Silent poll — status text updates in place, no page reload, no animation restart.
    const id = setInterval(() => {
      refreshSnapshot().then((s) => live && setSnap(s)).catch(() => {});
    }, 60000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  return (
    <BrowserRouter>
      <OddsProvider>
      <MyBooksProvider>
      <SlipProvider>
      <div className="min-h-screen bg-void text-slate-200">
        <Navbar />
        <OddsTicker />
        {snap && (
          <div aria-live="polite" className="truncate border-b border-white/5 bg-white/[0.02] px-4 py-1.5 text-center footnote">
            {!snap.matches?.length ? (
              <span>○ No fixtures yet — connect the feed or check back soon</span>
            ) : snap.metadata?.mode === 'live' ? (
              <span className="text-lime-300">● LIVE — real fixtures + multi-book odds • updated {snap.updatedAt ? new Date(snap.updatedAt).toLocaleTimeString() : 'just now'} • {snap.matches.length} matches</span>
            ) : snap.metadata?.mode === 'hybrid' ? (
              <span><span className="text-sky-300">● {snap.metadata?.counts?.real || snap.matches.length} real fixtures</span> • add a free odds key for full multi-book prices</span>
            ) : (
              <span><span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-slate-300">DEMO SAMPLE</span> • showing sample fixtures so you can explore — connect the feed for live odds • {snap.matches.length} matches</span>
            )}
          </div>
        )}
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<Live />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/value" element={<Value />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/arb" element={<Arb />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/history" element={<History />} />
          <Route path="/volatility" element={<Volatility />} />
          <Route path="/form" element={<Form />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/slip" element={<Slip />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/tips" element={<Tips />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/responsible" element={<Responsible />} />
          <Route path="/pro" element={<Pro />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
        <SlipBar />
        <MobileNav />
        <BottomPad />
        <footer className="border-t-2 border-supa bg-void px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
            <Logo size={30} />
            <nav className="flex flex-wrap justify-center gap-x-1 gap-y-1 text-xs text-slate-400" aria-label="Footer">
              <Link to="/" className="rounded px-2 py-2 hover:text-white">Today</Link>
              <Link to="/live" className="rounded px-2 py-2 hover:text-white">Live</Link>
              <Link to="/compare" className="rounded px-2 py-2 hover:text-white">Compare</Link>
              <Link to="/value" className="rounded px-2 py-2 hover:text-white">Hot deals</Link>
              <Link to="/builder" className="rounded px-2 py-2 hover:text-white">Builder</Link>
              <Link to="/arb" className="rounded px-2 py-2 hover:text-white">Arb</Link>
              <Link to="/volatility" className="rounded px-2 py-2 hover:text-white">Volatility</Link>
              <Link to="/form" className="rounded px-2 py-2 hover:text-white">Form</Link>
              <Link to="/tips" className="rounded px-2 py-2 hover:text-white">Tips</Link>
              <Link to="/performance" className="rounded px-2 py-2 hover:text-white">Performance</Link>
              <Link to="/history" className="rounded px-2 py-2 hover:text-white">History</Link>
              <Link to="/slip" className="rounded px-2 py-2 hover:text-white">Slip</Link>
              <Link to="/tools" className="rounded px-2 py-2 hover:text-white">Tools</Link>
              <Link to="/tracker" className="rounded px-2 py-2 hover:text-white">Tracker</Link>
              <Link to="/learn" className="rounded px-2 py-2 hover:text-white">Learn</Link>
              <Link to="/pro" className="rounded px-2 py-2 hover:text-white">Pro</Link>
              <Link to="/responsible" className="rounded px-2 py-2 hover:text-white">Play safe</Link>
            </nav>
            <div className="font-display text-xs tracking-widest text-slate-500">SCOUTED LIKE STRIKAS <span className="text-supa">•</span> PRICED LIKE PROS</div>
            <div className="max-w-2xl text-xs leading-relaxed text-slate-400">
              Supa Odds — analytics only. No real-money betting on this site. 18+ only. Bet only with books licensed by the Gaming Commission of Ghana. Betting can be addictive — play responsibly.
              <br />Odds shown for comparison. No profit guaranteed — bet only what you can afford to lose.
            </div>
          </div>
        </footer>
      </div>
      </SlipProvider>
      </MyBooksProvider>
      </OddsProvider>
    </BrowserRouter>
  );
}

function MobileNav() {
  const { legs } = useSlip();
  const item = ({ isActive }) =>
    `relative flex min-h-[44px] items-center justify-center px-0.5 py-2 text-[10px] font-bold tabular-nums min-[400px]:text-[11px] ${isActive ? 'text-lime-300' : 'text-slate-400'}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-supa bg-void/95 backdrop-blur md:hidden" aria-label="Primary">
      <div className="grid grid-cols-6 text-center">
        <NavLink to="/" end className={item}>Today</NavLink>
        <NavLink to="/live" className={item}>● Live</NavLink>
        <NavLink to="/compare" className={item}>Compare</NavLink>
        <NavLink to="/value" className={item}>Deals</NavLink>
        <NavLink to="/builder" className={item}>Build</NavLink>
        <NavLink to="/slip" className={({ isActive }) => `${item({ isActive })} ${isActive ? '' : 'text-lime-300'}`}>
          Slip{legs.length ? ` (${legs.length})` : ''}
          {legs.length > 0 && <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lime-400 px-1 text-[10px] text-black">{legs.length > 99 ? '99+' : legs.length}</span>}
        </NavLink>
      </div>
    </nav>
  );
}

// Spacer so the fixed mobile nav (+ floating slip bar when it exists, which
// wraps to two rows on narrow phones) never cover the footer.
function BottomPad() {
  const { legs } = useSlip();
  return <div aria-hidden className={legs.length ? 'h-60 md:h-28' : 'h-14 md:h-0'} />;
}
