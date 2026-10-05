// OddsLens pay server — keeps SECRET keys off the browser.
// Local dev: node bot/server.js  (or npm run pay:server)
// Production: host this (Render/Railway/VPS), set PAY_PORT + secrets in env,
// point VITE_PAY_API at its public URL, and register its /api/paystack/webhook
// URL in the Paystack dashboard.
//
// Endpoints:
//   GET  /api/health
//   POST /api/paystack/initialize  { email, phone? } -> { authorization_url, reference }
//   GET  /api/paystack/verify?reference=... -> { paid, ... }
//   POST /api/paystack/webhook     (Paystack server -> us, signature-checked)

import http from 'node:http';

const PORT = Number(process.env.PAY_PORT || 8787);

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-paystack-signature',
  });
  res.end(body);
}

function readBody(req, raw = false) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (raw) return resolve(buf);
      try {
        resolve(buf.length ? JSON.parse(buf.toString('utf8')) : {});
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === 'OPTIONS') return send(res, 204, {});

    if (req.method === 'GET' && url.pathname === '/api/health') {
      const { configStatus } = await import('./paystack.js');
      return send(res, 200, { ok: true, paystack: configStatus(), time: new Date().toISOString() });
    }

    if (req.method === 'POST' && url.pathname === '/api/paystack/initialize') {
      const { initialize, PRO_PRICE_PESWAS } = await import('./paystack.js');
      const body = await readBody(req);
      const data = await initialize({ email: body.email, phone: body.phone, amountPesewas: PRO_PRICE_PESWAS });
      return send(res, 200, { ok: true, authorization_url: data.authorization_url, reference: data.reference });
    }

    if (req.method === 'GET' && url.pathname === '/api/paystack/verify') {
      const { verify } = await import('./paystack.js');
      const reference = url.searchParams.get('reference');
      if (!reference) return send(res, 400, { ok: false, error: 'missing ?reference=' });
      const v = await verify(reference);
      return send(res, 200, { ok: true, ...v });
    }

    if (req.method === 'POST' && url.pathname === '/api/paystack/webhook') {
      const raw = await readBody(req, true);
      const { webhookValid } = await import('./paystack.js');
      const valid = await webhookValid(raw, req.headers['x-paystack-signature']);
      if (!valid) return send(res, 401, { ok: false, error: 'bad signature' });
      const event = JSON.parse(raw.toString('utf8') || '{}');
      // Production: persist successful charges here (DB) so unlocks survive devices.
      console.log(`webhook ${event.event} ref=${event.data?.reference} amount=${event.data?.amount}${event.data?.currency}`);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { ok: false, error: 'unknown route' });
  } catch (e) {
    return send(res, 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, () => console.log(`OddsLens pay server on http://localhost:${PORT} (set PAY_PORT to change)`));
