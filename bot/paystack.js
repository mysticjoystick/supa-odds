// Paystack (Route B) — MoMo + card checkout without MTN direct approval.
// Docs: https://paystack.com/docs/payments/accept-payments/
// Sign up at https://dashboard.paystack.com/ (Ghana businesses supported),
// grab TEST keys first, go live with KYC when ready.
//
// GH₵50 Pro = 5000 pesewas (Paystack amounts are integer minor units).
// Channels limited to mobile_money (+card fallback) for Ghana.

const API = 'https://api.paystack.co';
const SECRET = process.env.PAYSTACK_SECRET_KEY || '';

function need() {
  if (!SECRET) throw new Error('Missing PAYSTACK_SECRET_KEY — paste a test key from dashboard.paystack.com into .env');
}

async function call(method, path, body) {
  need();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.status !== true) {
    throw new Error(`Paystack ${method} ${path} failed: ${j.message || `HTTP ${res.status}`}`);
  }
  return j.data;
}

export function configStatus() {
  return {
    mode: SECRET.startsWith('sk_test_') ? 'test' : SECRET.startsWith('sk_live_') ? 'LIVE' : 'missing',
    ready: !!SECRET,
    missing: SECRET ? [] : ['PAYSTACK_SECRET_KEY'],
  };
}

// Step 1: create checkout. Returns { authorization_url, reference }.
export async function initialize({ email, amountPesewas, phone, plan = 'oddslens-pro-monthly' }) {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid email is required for receipts');
  return call('POST', '/transaction/initialize', {
    email,
    amount: amountPesewas,
    currency: 'GHS',
    channels: ['mobile_money', 'card'],
    metadata: { plan, phone: phone || '', product: 'Supa Odds Pro' },
  });
}

// Step 2: confirm after the customer pays. Returns { paid, amountGhs, email, reference }.
export async function verify(reference) {
  const d = await call('GET', `/transaction/verify/${encodeURIComponent(reference)}`);
  return {
    paid: d.status === 'success',
    rawStatus: d.status,
    amountGhs: (d.amount || 0) / 100,
    currency: d.currency,
    email: d.customer?.email,
    reference: d.reference,
  };
}

// Webhook authenticity: x-paystack-signature === HMAC-SHA512(secret, rawBody).
export async function webhookValid(rawBody, signature) {
  need();
  const { createHmac, timingSafeEqual } = await import('node:crypto');
  const digest = createHmac('sha512', SECRET).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(String(signature || '')));
  } catch {
    return false;
  }
}

export const PRO_PRICE_PESWAS = 5000; // GH₵50

// CLI: node bot/paystack.js --check | --demo
if (process.argv[1]?.endsWith('paystack.js')) {
  const arg = process.argv[2];
  if (arg === '--check') {
    console.log(JSON.stringify(configStatus(), null, 2));
  } else if (arg === '--demo') {
    console.log('DEMO MODE — no real money moves.');
    console.log(JSON.stringify({ authorization_url: 'https://paystack.demo/checkout/oddslens-pro', reference: `DEMO-${Date.now().toString(36).toUpperCase()}`, status: 'simulation — approve in UI' }, null, 2));
  } else {
    console.log('Usage: node bot/paystack.js --check | --demo');
  }
}
