import { useEffect, useState } from 'react';

const TIME_KEY = 'oddslens-screen-sec';
const WEEK_KEY = 'oddslens-week-start';
const BUDGET_KEY = 'oddslens-weekly-min';
const SESSION_KEY = 'oddslens-session-min';

function load(n, fb) {
  try {
    const v = localStorage.getItem(n);
    if (v == null) return fb;
    const num = +v;
    return Number.isFinite(num) && num >= 0 ? num : fb;
  } catch {
    return fb;
  }
}

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default function Responsible() {
  const [totalSec, setTotalSec] = useState(() => {
    try {
      // Weekly window — reset the counter when a new week starts.
      const wk = localStorage.getItem(WEEK_KEY);
      const now = weekStart();
      if (wk !== now) {
        localStorage.setItem(WEEK_KEY, now);
        localStorage.setItem(TIME_KEY, '0');
        return 0;
      }
    } catch { /* ignore */ }
    return load(TIME_KEY, 0);
  });
  const [budget, setBudget] = useState(() => load(BUDGET_KEY, 180));
  const [sessionLen, setSessionLen] = useState(() => load(SESSION_KEY, 30));
  const [sessionSec, setSessionSec] = useState(0);
  const [m1, setM1] = useState('2.00');
  const [m2, setM2] = useState('2.00');

  // Counts visible time on this page only — kept honest in the label below.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      setTotalSec((s) => {
        const n = s + 5;
        try {
          localStorage.setItem(TIME_KEY, String(n));
        } catch { /* ignore */ }
        return n;
      });
      setSessionSec((s) => s + 5);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BUDGET_KEY, String(Math.max(0, budget || 0)));
    } catch { /* ignore */ }
  }, [budget]);
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, String(Math.max(0, sessionLen || 0)));
    } catch { /* ignore */ }
  }, [sessionLen]);

  const totalMin = Math.floor(totalSec / 60);
  const sessMin = Math.floor(sessionSec / 60);
  const safeBudget = Math.max(1, budget || 1);
  const safeSession = Math.max(1, sessionLen || 1);
  const overSession = sessMin >= safeSession;
  const budgetPct = Math.min(100, (totalMin / safeBudget) * 100);

  // margin demo: two-way market overround
  const n1 = Number(m1);
  const n2 = Number(m2);
  const marginValid = Number.isFinite(n1) && Number.isFinite(n2) && n1 > 1 && n2 > 1;
  const overround = marginValid ? (1 / n1 + 1 / n2 - 1) * 100 : null;

  const clampBudget = (v) => {
    const n = Math.round(Number(v));
    setBudget(!Number.isFinite(n) || n < 0 ? 0 : Math.min(10080, n));
  };
  const clampSession = (v) => {
    const n = Math.round(Number(v));
    setSessionLen(!Number.isFinite(n) || n < 1 ? 1 : Math.min(480, n));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-normal text-white">Play safe</h1>
      <p className="max-w-2xl text-sm text-slate-400">
        Supa Odds is a research site, not a bookmaker. Betting outcomes are uncertain, margins guarantee the average player loses over time,
        and past results never predict future ones. These tools help you stay in control.
      </p>

      {overSession && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">
          ⏰ Session reminder: you've been on this page {sessMin} min (your limit: {safeSession} min). Consider a break.
          <button onClick={() => setSessionSec(0)} className="ml-3 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-black">Reset timer</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="sticker p-5">
          <div className="mb-1 panel-title">TIME ON THIS PAGE, THIS WEEK (THIS DEVICE)</div>
          <div className="tabular text-3xl font-extrabold text-white">{totalMin} <span className="text-sm font-normal text-slate-500">min this week • {sessMin} this visit</span></div>
          <label className="mt-4 block text-sm text-slate-300">Weekly time budget (min)
            <input type="number" min="0" max="10080" value={budget} onChange={(e) => clampBudget(e.target.value)} aria-label="Weekly time budget in minutes" className="tabular mt-1 w-28 field text-white" />
          </label>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${budgetPct.toFixed(0)} percent of weekly budget used`}>
            <div className={`h-full rounded-full ${budgetPct >= 100 ? 'bg-red-400' : budgetPct >= 80 ? 'bg-amber-400' : 'bg-lime-400'}`} style={{ width: `${budgetPct}%` }} />
          </div>
          <div className="tabular mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>{budgetPct.toFixed(0)}% of budget used • resets Monday</span>
            <button onClick={() => { setTotalSec(0); try { localStorage.setItem(TIME_KEY, '0'); } catch { /* ignore */ } }} className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-white hover:bg-white/15">Reset week</button>
          </div>
          <label className="mt-3 block text-sm text-slate-300">Session reminder every (min)
            <input type="number" min="1" max="480" value={sessionLen} onChange={(e) => clampSession(e.target.value)} aria-label="Session reminder interval in minutes" className="tabular mt-1 w-28 field text-white" />
          </label>
        </div>

        <div className="sticker p-5">
          <div className="mb-1 panel-title">BOOKMAKER MARGIN DEMO</div>
          <p className="mb-3 text-xs text-slate-400">Enter any two-way prices — the overround is the book's cut, taken before you start.</p>
          <div className="flex gap-2">
            <label className="w-full text-xs text-slate-400">Price A
              <input type="number" step="0.01" min="1.01" value={m1} onChange={(e) => setM1(e.target.value)} aria-label="First price" className="tabular mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-white" />
            </label>
            <label className="w-full text-xs text-slate-400">Price B
              <input type="number" step="0.01" min="1.01" value={m2} onChange={(e) => setM2(e.target.value)} aria-label="Second price" className="tabular mt-1 w-full rounded-lg bg-white/10 px-3 py-2 text-white" />
            </label>
          </div>
          {!marginValid && <div className="mt-2 text-xs text-red-300">Both prices must be above 1.01.</div>}
          <div className="tabular mt-3 rounded-xl bg-white/5 p-3 text-center">
            <div className="text-2xl font-extrabold text-amber-300">{overround == null ? '—' : `${overround.toFixed(1)}%`}</div>
            <div className="text-xs text-slate-400">{overround == null ? 'Enter two valid prices to see the margin' : `margin ≈ GH₵${overround.toFixed(1)} kept per GH₵100 staked, on average`}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm leading-relaxed text-amber-200">
        <b>Ground rules.</b> 18+ only, Ghana. Use only books licensed by the Gaming Commission of Ghana. Set a deposit and time limit before you start, never chase losses,
        never borrow to bet, and treat any staking as entertainment spending — not income. If it stops being fun, stop.
        <span className="mt-2 block text-xs text-amber-200/80">Need support? Contact the Gaming Commission of Ghana or a local counselling helpline. This page stores limits only on this device — books and payment apps have their own self-exclusion tools; use those too.</span>
      </div>
    </div>
  );
}
