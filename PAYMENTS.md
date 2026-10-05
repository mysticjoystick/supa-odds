# Payments — going live with real money (dev notes, not user docs)

The Pro page ships demos only until the steps below are done.

## Paystack
1. Free signup at dashboard.paystack.com.
2. Put test keys in `.env` as `PAYSTACK_SECRET_KEY`.
3. Run the pay server (`npm run pay:server`).
4. Verify with a test MoMo payment, then complete KYC for live keys.

## MTN direct
1. Wire `bot/momo.js` with sandbox keys.
2. Get MTN production approval for live traffic.

Until then: demos only. 18+, Ghana only.
