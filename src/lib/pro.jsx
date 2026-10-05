import { useSyncExternalStore, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';

// Pro plan — PAUSED. Everything is free while Pro is "coming soon".
// Flip COMING_SOON to false to re-enable GH₵50/mo gating + checkout.
export const COMING_SOON = true;
export const PRO_PLAN = {
  id: 'oddslens-pro-monthly',
  name: 'Supa Odds Pro',
  price: 50,
  currency: 'GHS',
  days: 30,
  // Pages gated behind Pro. Edit freely — gating reads this list.
  gated: ['/arb', '/history', 'volatility'],
};

const KEY = 'oddslens-pro';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY)) || {};
    if (s.active && s.expiresAt && new Date(s.expiresAt).getTime() > Date.now()) return s;
    return { active: false };
  } catch {
    return { active: false };
  }
}

let state = load();
const listeners = new Set();
function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function activatePro({ txRef, demo, days = PRO_PLAN.days }) {
  const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
  state = { active: true, plan: PRO_PLAN.id, txRef, demo: !!demo, startedAt: new Date().toISOString(), expiresAt };
  emit();
  return state;
}

export function cancelPro() {
  state = { active: false };
  emit();
}

export function usePro() {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => (state.active && new Date(state.expiresAt).getTime() > Date.now() ? 'on' : 'off')
  );
  const isPro = state.active && new Date(state.expiresAt || 0).getTime() > Date.now();
  const daysLeft = isPro ? Math.max(0, Math.ceil((new Date(state.expiresAt).getTime() - Date.now()) / 86400000)) : 0;
  return { isPro, daysLeft, state, activatePro, cancelPro };
}

export function isGated(path) {
  return PRO_PLAN.gated.some((g) => (g === 'volatility' ? path === '/volatility' : path === g));
}

// Wrap a pro page: free users get a teaser + upgrade CTA, pro users get content.
// While COMING_SOON, everyone gets content and /pro shows the notify form.
export function ProGate({ title, blurb, children }) {
  const { isPro } = usePro();
  if (isPro || COMING_SOON) return <>{children}</>;
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
        <Crown size={26} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-normal text-white">{title} is Pro</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{blurb}</p>
      <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-left text-sm text-slate-300">
        <div className="font-bold text-white">Supa Odds Pro — GH₵{PRO_PLAN.price}/mo</div>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-400">
          <li>Arb scanner, full odds history + archive, market movers</li>
          <li>Pay with MTN MoMo in seconds</li>
        </ul>
      </div>
      <Link to="/pro" className="mt-5 inline-block rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-extrabold text-black hover:bg-amber-300">
        Upgrade to Pro →
      </Link>
    </div>
  );
}

// Slim waitlist banner for Pro-track pages while everything is free.
export function ProTeaser() {
  const { isPro } = usePro();
  if (isPro || !COMING_SOON) return null;
  return (
    <Link to="/pro" className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200 hover:bg-amber-400/[0.12]">
      <Crown size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">This stays free — Pro bundles it with arb + full archive. <b className="whitespace-nowrap">Join the waitlist →</b></span>
    </Link>
  );
}

export function ProBadge() {  const { isPro, daysLeft } = usePro();
  if (!isPro) return null;
  return (
    <Link to="/pro" title={`Pro active — ${daysLeft} days left`} className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-black">
      <Crown size={12} /> PRO
    </Link>
  );
}
