import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import Logo from './Logo';
import SearchBar from './SearchBar';
import { useSlip } from '../lib/slip';
import { FormatToggle } from '../lib/oddsFormat';
import { ProBadge, usePro, COMING_SOON } from '../lib/pro';

const DIRECT = [
  ['/', 'Today'],
  ['/live', '● Live'],
  ['/builder', '✦ Bet Builder'],
];

const GROUPS = [
  {
    label: 'Markets',
    links: [
      ['/compare', 'Compare', 'Every book side by side'],
      ['/value', 'Hot deals', '+EV board vs true price'],
      ['/arb', 'Arb', 'Cross-book guarantees'],
      ['/history', 'History', 'Price trails + archive'],
      ['/volatility', 'Volatility', 'Leagues, spreads, steam'],
      ['/performance', 'Performance', 'What the ledger says'],
    ],
  },
  {
    label: 'Explore',
    links: [
      ['/form', 'Form', 'Team research, no picks'],
      ['/tools', 'Tools', 'Odds calculator + calibration'],
      ['/tips', 'Tips', 'Tracked algo + human'],
      ['/learn', 'Learn', 'EV, CLV, bankroll guides'],
      ['/tracker', 'Tracker', 'Your bet journal + CLV'],
      ['/responsible', 'Safe', 'Play-safe guardrails'],
    ],
  },
];

const PERSONAL = [
  ['/tracker', 'Tracker'],
  ['/responsible', 'Safe'],
];

const linkCls = ({ isActive }) =>
  `inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-2 text-sm transition-all ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;

function UpgradeLink() {
  const { isPro } = usePro();
  if (isPro) return null;
  if (COMING_SOON) {
    return (
      <NavLink to="/pro" className="hidden whitespace-nowrap rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-amber-400/25 xl:block">
        Pro · soon
      </NavLink>
    );
  }
  return (
    <NavLink to="/pro" className="hidden whitespace-nowrap rounded-full bg-amber-400 px-3 py-2.5 text-xs font-extrabold text-black hover:bg-amber-300 xl:block">
      Upgrade
    </NavLink>
  );
}

function Drop({ group, onNav, align = 'left' }) {
  const loc = useLocation();
  const active = group.links.some(([to]) => loc.pathname === to);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuId = `nav-menu-${group.label.toLowerCase()}`;
  // Touch + keyboard support: close on outside tap / Escape, open on focus.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);
  return (
    <div ref={wrapRef} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen(!open)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className={`inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg px-3 text-sm transition-all ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      >
        {group.label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
      {open && (
        <div className={`absolute top-full z-50 w-64 pt-1 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <motion.div
            id={menuId} role="menu" aria-label={group.label}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl"
          >
            {group.links.map(([to, label, desc]) => (
              <NavLink
                key={to}
                to={to}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onNav?.();
                }}
                className={({ isActive }) =>
                  `block px-4 py-3 transition-colors ${isActive ? 'bg-lime-400/10' : 'hover:bg-white/5'}`
                }
              >
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </NavLink>
            ))}
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [mobile, setMobile] = useState(false);
  const loc = useLocation();
  useEffect(() => setMobile(false), [loc.pathname]);
  let slipCount = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    slipCount = useSlip().legs.length;
  } catch { slipCount = 0; }

  return (
    <header className="sticky top-0 z-50 border-b-2 border-supa bg-void/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
        <Link to="/" className="shrink-0 transition-transform hover:scale-[1.02]">
          <Logo />
        </Link>

        {/* desktop — full links only where they fit (>=1280px); laptops get the burger + full panel */}
        <nav className="ml-3 hidden min-w-0 items-center gap-1 xl:flex">
          {DIRECT.map(([to, label]) => (
            <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>
          ))}
          <NavLink to="/slip" className={({ isActive }) => `relative inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl border-2 border-gold px-3 text-sm tabular-nums transition-all ${isActive ? 'bg-supa font-bold text-white shadow-[2px_2px_0_#ffb800]' : 'bg-supa font-bold text-white shadow-[2px_2px_0_#ffb800] hover:brightness-110'}`}>
            Slip{slipCount ? ` (${slipCount})` : ''}
          </NavLink>
          {GROUPS.map((g) => <Drop key={g.label} group={g} align={g.label === 'Explore' ? 'right' : 'left'} />)}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="hidden min-w-0 w-full max-w-[150px] sm:block sm:max-w-[170px] xl:max-w-[220px]"><SearchBar onNav={() => {}} className="w-full" /></div>
          <span className="flex shrink-0 items-center gap-1.5">
            <FormatToggle />
          </span>
          <ProBadge />
          <UpgradeLink />
        </div>

        {/* mobile toggle */}
        <button onClick={() => setMobile(!mobile)} className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-lg bg-white/10 text-white xl:hidden" aria-label={mobile ? 'Close menu' : 'Open menu'} aria-expanded={mobile}>
          {mobile ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* mobile panel */}
      <AnimatePresence>
      {mobile && (
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="max-h-[calc(100dvh-60px)] space-y-4 overflow-y-auto border-t border-white/10 px-4 py-4 xl:hidden" aria-label="Mobile"
        >
          <div className="flex items-center gap-2 sm:hidden">
            <div className="min-w-0 flex-1"><SearchBar onNav={() => setMobile(false)} className="w-full" /></div>
            <span className="ml-auto shrink-0 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-1 text-[11px] font-bold text-lime-300">18+</span>
          </div>
          <NavLink to="/pro" className="block rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-center text-sm font-extrabold text-amber-300">
            {COMING_SOON ? 'Pro — coming soon, join the list' : 'Upgrade to Pro'}
          </NavLink>
          <div className="flex flex-wrap gap-1.5">
            {DIRECT.map(([to, label]) => (
              <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>
            ))}
            <NavLink to="/slip" className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-gold bg-supa px-3 text-sm font-bold tabular-nums text-white shadow-[2px_2px_0_#ffb800]">Slip{slipCount ? ` (${slipCount})` : ''}</NavLink>
            {PERSONAL.map(([to, label]) => (
              <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>
            ))}
          </div>
          {GROUPS.map((g) => (
            <div key={g.label}>
              <div className="mb-1 text-[11px] font-bold tracking-widest text-slate-500">{g.label.toUpperCase()}</div>
              <div className="grid grid-cols-2 gap-1">
                {g.links.map(([to, label, desc]) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `block min-h-[44px] rounded-lg px-3 py-2 transition-all ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    <span className="block text-sm">{label}</span>
                    {!!desc && <span className="block text-[11px] font-normal text-slate-400">{desc}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </motion.nav>
      )}
      </AnimatePresence>
    </header>
  );
}
