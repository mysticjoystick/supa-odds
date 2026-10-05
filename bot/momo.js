// MTN MoMo Collections (Ghana) — request-to-pay + status, sandbox-ready.
// Docs: https://momodeveloper.mtn.com/docs/services/collection/
// Modes:
//   - Demo (default in UI): simulated prompt + approval. NO real money moves.
//   - Sandbox: free MTN developer account, test money. Needs env below.
//   - Production: MTN approval + registered business + hosted callback URL.
//
// Env (sandbox):
//   MOMO_BASE=https://sandbox.momodeveloper.mtn.com
//   MOMO_USER_ID=<API user from sandbox provisioning>
//   MOMO_API_KEY=<API key for that user>
//   MOMO_SUB_KEY=<Collections subscription key>
//   MOMO_ENV=sandbox            (production: your target environment string)
//   MOMO_CALLBACK=https://your-server.example/momo/callback  (optional for sandbox)

import { randomUUID } from 'node:crypto';

const BASE = process.env.MOMO_BASE || 'https://sandbox.momodeveloper.mtn.com';
const USER = process.env.MOMO_USER_ID || '';
const KEY = process.env.MOMO_API_KEY || '';
const SUB = process.env.MOMO_SUB_KEY || '';
const ENV = process.env.MOMO_ENV || 'sandbox';

function need(name, v) {
  if (!v) throw new Error(`Missing ${name} — copy .env.example sandbox block into .env`);
}

export function configStatus() {
  const missing = ['MOMO_USER_ID', 'MOMO_API_KEY', 'MOMO_SUB_KEY'].filter((k) => !process.env[k]);
  return { sandbox: BASE.includes('sandbox'), env: ENV, ready: missing.length === 0, missing };
}

async function token() {
  need('MOMO_USER_ID', USER);
  need('MOMO_API_KEY', KEY);
  need('MOMO_SUB_KEY', SUB);
  const res = await fetch(`${BASE}/collection/token/`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': SUB,
      Authorization: `Basic ${Buffer.from(`${USER}:${KEY}`).toString('base64')}`,
    },
  });
  if (!res.ok) throw new Error(`MoMo token HTTP ${res.status}`);
  const j = await res.json();
  if (!j.access_token) throw new Error('MoMo token response had no access_token');
  return j.access_token;
}

// Ghana MSISDN normalize: 0541234567 / +233541234567 -> 233541234567 (partyIdType MSISDN).
export function normalizeMsisdn(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (/^0\d{9}$/.test(d)) d = `233${d.slice(1)}`;
  if (!/^233\d{9}$/.test(d)) throw new Error('Enter a valid Ghana MoMo number (e.g. 054 123 4567)');
  return d;
}

// Step 1: push a payment prompt to the customer's phone. Returns referenceId to poll.
export async function requestToPay({ amount, currency = 'GHS', msisdn, externalId, payerMessage = 'Supa Odds Pro', payeeNote = 'Supa Odds Pro monthly' }) {
  const access = await token();
  const partyId = normalizeMsisdn(msisdn);
  const referenceId = randomUUID();
  const body = {
    amount: String(amount),
    currency,
    externalId: String(externalId || referenceId),
    payer: { partyIdType: 'MSISDN', partyId },
    payerMessage: String(payerMessage).slice(0, 160),
    payeeNote: String(payeeNote).slice(0, 160),
  };
  const res = await fetch(`${BASE}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': SUB,
      Authorization: `Bearer ${access}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': ENV,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status !== 202 && !res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`MoMo requesttopay HTTP ${res.status} ${t.slice(0, 200)}`);
  }
  return { referenceId, partyId };
}

// Step 2: poll until SUCCESSFUL / FAILED / PENDING.
export async function paymentStatus(referenceId) {
  const access = await token();
  const res = await fetch(`${BASE}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': SUB,
      Authorization: `Bearer ${access}`,
      'X-Target-Environment': ENV,
    },
  });
  if (!res.ok) throw new Error(`MoMo status HTTP ${res.status}`);
  const j = await res.json();
  return { status: j.status, amount: j.amount, currency: j.currency, payer: j.payer, raw: j };
}

export async function waitForPayment(referenceId, { tries = 20, everyMs = 6000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const s = await paymentStatus(referenceId);
    if (s.status === 'SUCCESSFUL' || s.status === 'FAILED') return s;
    await new Promise((r) => setTimeout(r, everyMs));
  }
  const s = await paymentStatus(referenceId).catch(() => ({ status: 'PENDING' }));
  return s;
}

// CLI: node bot/momo.js --check | --demo
if (process.argv[1]?.endsWith('momo.js')) {
  const arg = process.argv[2];
  if (arg === '--check') {
    console.log(JSON.stringify(configStatus(), null, 2));
  } else if (arg === '--demo') {
    console.log('DEMO MODE — no real money moves.');
    console.log('Simulating: prompt pushed to 0540000000, approved in ~10s...');
    await new Promise((r) => setTimeout(r, 2000));
    console.log(JSON.stringify({ referenceId: randomUUID(), status: 'SUCCESSFUL', amount: '50', currency: 'GHS' }, null, 2));
  } else {
    console.log('Usage: node bot/momo.js --check | --demo');
  }
}
