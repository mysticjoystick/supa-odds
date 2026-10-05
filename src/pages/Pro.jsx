import { useState } from 'react';
import { Crown, Smartphone, ShieldCheck, CreditCard } from 'lucide-react';
import { PRO_PLAN, COMING_SOON, usePro, activatePro, cancelPro } from '../lib/pro';

const PAY_API = (import.meta.env.VITE_PAY_API || 'http://localhost:8787').replace(/\/$/, '');

function ghValid(n) {
  const d = String(n || '').replace(/\D/g, '');
  return /^0\d{9}$/.test(d) || /^233\d{9}$/.test(d);
}

function emailValid(e) {
  return /^\S+@\S+\.\S+$/.test(String(e || ''));
}

// --- MTN direct (demo; live via bot/momo.js + keys) ---
function MtnTab() {
  const [msisdn, setMsisdn] = useState('');
  const [step, setStep] = useState('idle');
  const [msg, setMsg] = useState('');

  const startDemo = () => {
    if (!ghValid(msisdn)) {
      setMsg('Enter a valid Ghana MoMo number (e.g. 054 123 4567).');
      setStep('error');
      return;
    }
    setMsg('');
    setStep('prompt');
    setTimeout(() => setStep('waiting'), 2500);
    setTimeout(() => {
      activatePro({ txRef: `DEMO-${Date.now().toString(36).toUpperCase()}`, demo: true });
      setStep('done');
    }, 9000);
  };

  return (
    <div>
      {(step === 'idle' || step === 'error') && (
        <>
          <div className="flex gap-2">
            <input
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              placeholder="054 123 4567"
              inputMode="tel"
              className="tabular flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder:text-slate-400 focus:border-amber-400/50 focus:outline-none"
            />
            <button onClick={startDemo} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-amber-300">
              Pay
            </button>
          </div>
          {msg && <div className="mt-2 text-xs text-red-300">{msg}</div>}
          <div className="mt-2 footnote">
            DEMO CHECKOUT — approves automatically, no real money moves. Live MTN (bot/momo.js) activates with sandbox/production keys in .env.
          </div>
        </>
      )}
      {step === 'prompt' && (
        <div className="py-4 text-center text-sm text-slate-300">
          <div className="mx-auto mb-2 h-8 w-8 animate-pulse rounded-full bg-amber-400/30" />
          Prompt pushed to <b className="text-white">{msisdn}</b> — check your phone…
        </div>
      )}
      {step === 'waiting' && (
        <div className="py-4 text-center text-sm text-slate-300">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          Waiting for you to enter MoMo PIN on your phone…
        </div>
      )}
      {step === 'done' && (
        <div className="py-4 text-center">
          <div className="text-lg font-extrabold text-lime-300">Payment approved — welcome to Pro 🎉</div>
          <div className="mt-1 text-xs text-slate-400">Arb, History and Movers are unlocked for {PRO_PLAN.days} days on this device.</div>
        </div>
      )}
    </div>
  );
}

// --- Paystack (Route B): real checkout via local pay server, demo fallback ---
function PaystackTab() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('idle'); // idle|error|opened|verifying|done|demo
  const [msg, setMsg] = useState('');
  const [ref, setRef] = useState('');

  const demoApprove = (label) => {
    setMsg(label);
    setStep('demo');
    setTimeout(() => {
      activatePro({ txRef: `DEMO-PS-${Date.now().toString(36).toUpperCase()}`, demo: true });
      setStep('done');
    }, 6000);
  };

  const pay = async () => {
    if (!emailValid(email)) {
      setMsg('Enter a valid email for your receipt.');
      setStep('error');
      return;
    }
    setMsg('');
    try {
      const res = await fetch(`${PAY_API}/api/paystack/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `pay server HTTP ${res.status}`);
      setRef(j.reference);
      window.open(j.authorization_url, '_blank', 'noopener');
      setStep('opened');
    } catch (e) {
      // No server / no keys: clearly-labeled demo so the flow stays testable.
      demoApprove(`Pay server unreachable (${e.message}). Running DEMO checkout instead — no real money moves.`);
    }
  };

  const verify = async () => {
    setStep('verifying');
    setMsg('');
    try {
      const res = await fetch(`${PAY_API}/api/paystack/verify?reference=${encodeURIComponent(ref)}`);
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      if (j.paid) {
        activatePro({ txRef: j.reference, demo: false });
        setStep('done');
      } else {
        setMsg(`Not paid yet (status: ${j.rawStatus || 'unknown'}). Complete the MoMo approval on your phone, then retry.`);
        setStep('opened');
      }
    } catch (e) {
      setMsg(`Verify failed: ${e.message}`);
      setStep('opened');
    }
  };

  return (
    <div>
      {(step === 'idle' || step === 'error') && (
        <>
          <div className="grid gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" className="rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder:text-slate-400 focus:border-amber-400/50 focus:outline-none" />
            <div className="flex gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="054 123 4567 (optional)" inputMode="tel" className="tabular flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder:text-slate-400 focus:border-amber-400/50 focus:outline-none" />
              <button onClick={pay} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-amber-300">
                Pay GH₵{PRO_PLAN.price}
              </button>
            </div>
          </div>
          {msg && <div className="mt-2 text-xs text-red-300">{msg}</div>}
          <div className="mt-2 footnote">Secure Paystack checkout (MoMo + card). Server: {PAY_API} must be running with keys for real money.</div>
        </>
      )}
      {step === 'opened' && (
        <div className="py-3 text-center text-sm text-slate-300">
          <div className="mb-1 font-bold text-white">Checkout open — ref <code className="rounded bg-white/10 px-1 text-xs">{ref}</code></div>
          <p className="mb-3 text-xs text-slate-400">Approve the MoMo prompt on your phone, then come back.</p>
          <button onClick={verify} className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-lime-300">
            I've paid — verify
          </button>
          {msg && <div className="mt-2 text-xs text-amber-300">{msg}</div>}
        </div>
      )}
      {step === 'verifying' && (
        <div className="py-4 text-center text-sm text-slate-300">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
          Confirming with Paystack…
        </div>
      )}
      {step === 'demo' && (
        <div className="py-3 text-center text-sm text-slate-300">
          <div className="mx-auto mb-2 h-8 w-8 animate-pulse rounded-full bg-amber-400/30" />
          {msg}
        </div>
      )}
      {step === 'done' && (
        <div className="py-4 text-center">
          <div className="text-lg font-extrabold text-lime-300">Payment approved — welcome to Pro 🎉</div>
          <div className="mt-1 text-xs text-slate-400">Arb, History and Movers are unlocked for {PRO_PLAN.days} days on this device.</div>
        </div>
      )}
    </div>
  );
}

export default function Pro() {
  const { isPro, daysLeft, state } = usePro();
  const [method, setMethod] = useState('paystack');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyState, setNotifyState] = useState('idle'); // idle|error|done

  if (COMING_SOON && !isPro) {
    const notify = () => {
      if (!/^\S+@\S+\.\S+$/.test(notifyEmail)) {
        setNotifyState('error');
        return;
      }
      try {
        const list = JSON.parse(localStorage.getItem('oddslens-pro-waitlist') || '[]');
        if (!list.includes(notifyEmail)) list.push(notifyEmail);
        localStorage.setItem('oddslens-pro-waitlist', JSON.stringify(list));
      } catch { /* ignore */ }
      setNotifyState('done');
    };
    return (
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-14 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Crown size={26} />
        </div>
        <h1 className="font-display mt-3 text-3xl font-normal text-white">Supa Odds Pro — coming soon</h1>
        <p className="mx-auto max-w-md text-sm text-slate-400">
          Arb scanner, full odds history and market movers in one membership — GH₵{PRO_PLAN.price}/month via MoMo.
          Everything is free while we finish it. Drop your email and you&apos;ll hear first.
        </p>
        <div className="halftone sticker mx-auto max-w-md p-4 text-left text-sm">
          <div className="panel-title mb-2">FREE vs PRO</div>
          {[
            ['Today, Builder, Compare, Slip, Tracker', 'Free forever'],
            ['Arb scanner + full history + movers', 'Pro'],
          ].map(([f, tag]) => (
            <div key={f} className="stat-row mb-1.5">
              <span className="text-slate-300">{f}</span>
              <b className={tag === 'Pro' ? 'text-amber-300' : 'text-lime-300'}>{tag}</b>
            </div>
          ))}
        </div>
        {notifyState === 'done' ? (
          <div className="mx-auto max-w-md rounded-2xl border border-lime-400/30 bg-lime-400/[0.06] p-4 text-sm font-bold text-lime-300">
            You're on the list — we'll shout when Pro opens. 🎉
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="flex gap-2">
              <input
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white placeholder:text-slate-400 focus:border-amber-400/50 focus:outline-none"
              />
              <button onClick={notify} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-amber-300">
                Notify me
              </button>
            </div>
            {notifyState === 'error' && <div className="mt-2 text-xs text-red-300">Enter a valid email.</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Crown size={26} />
        </div>
        <h1 className="font-display mt-3 text-3xl font-normal text-white">Supa Odds Pro</h1>
        <p className="mt-1 text-sm text-slate-400">Power research for serious followers — GH₵{PRO_PLAN.price}/month.</p>
      </div>

      <div className="grid gap-2 sticker p-5 text-sm">
        {[
          'Arb scanner across every live book',
          'Full odds history + closing-line archive',
          'Market movers dashboard',
          'Everything else stays free forever',
        ].map((f) => (
          <div key={f} className="flex items-center gap-2 text-slate-300"><ShieldCheck size={15} className="shrink-0 text-lime-300" />{f}</div>
        ))}
      </div>

      {isPro ? (
        <div className="rounded-2xl border border-lime-400/30 bg-lime-400/[0.06] p-5 text-center">
          <div className="font-extrabold text-lime-300">Pro active — {daysLeft} days left</div>
          <div className="mt-1 text-xs text-slate-400">
            {state.demo ? 'Demo subscription (no real money moved).' : `Receipt ${state.txRef}`} • expires {state.expiresAt ? new Date(state.expiresAt).toLocaleDateString() : '—'}
          </div>
          <button onClick={cancelPro} className="mt-3 rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/15">
            Cancel Pro on this device
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-400/30 bg-panel p-5">
          <div className="mb-3 flex gap-2">
            {[
              ['paystack', 'Paystack', CreditCard],
              ['mtn', 'MTN direct', Smartphone],
            ].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setMethod(id)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold ${method === id ? 'bg-amber-400 text-black' : 'bg-white/10 text-slate-300'}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
          {method === 'paystack' ? <PaystackTab /> : <MtnTab />}
        </div>
      )}

      <div className="halftone sticker p-4 text-xs leading-relaxed text-slate-400">
        <span className="font-display text-[11px] tracking-widest text-amber-300">PLAY SAFE</span> — betting can be addictive.
        Pro is research tooling, not a promise of profit. 18+ only, Ghana only.
      </div>
    </div>
  );
}
