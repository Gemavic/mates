# Crypto Payments Setup (NOWPayments)

Everything is coded and deployed. To switch payments ON, you only need to
create a NOWPayments account and set four environment variables in Vercel.
Until these are set, checkout buttons show a friendly "payments not yet
enabled" message — nothing breaks.

## How money flows

1. User picks a credit package or subscription → app calls `/api/create-payment`
2. The server (not the browser) looks up the real price and creates a hosted
   NOWPayments invoice with a **unique payment address** for that purchase
3. User pays in any supported coin on the NOWPayments page
4. After blockchain confirmation, NOWPayments calls `/api/crypto-webhook`
   with an HMAC-SHA512 signed message
5. The webhook verifies the signature and calls the database:
   - `credit_purchase(...)` for credit packs
   - `activate_subscription(...)` for Silver/Gold/Platinum/Elite
6. Both are idempotent per payment — retries can never double-credit

Nobody can credit themselves: prices live server-side, the webhook requires a
valid signature, and the database functions only accept the service role.

## Setup steps (~20 minutes)

### 1. NOWPayments account
- Sign up at nowpayments.io (business account)
- Add your payout wallet(s) — where your revenue gets sent
- Dashboard → Settings → **API keys** → create one → copy it
- Dashboard → Settings → **IPN** → set/generate the **IPN secret** → copy it

### 2. Vercel environment variables
Vercel → your `mates` project → Settings → Environment Variables.
Add these four, enabled for **Production** (and Preview if you want):

| Name | Value |
|---|---|
| `NOWPAYMENTS_API_KEY` | from step 1 |
| `NOWPAYMENTS_IPN_SECRET` | from step 1 |
| `SUPABASE_URL` | `https://<your-project-id>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key |

⚠️ The service_role key is all-powerful. It only ever lives in Vercel env
vars, used by the serverless functions. NEVER put it in client code or any
`VITE_`-prefixed variable.

### 3. Redeploy
Env var changes need a redeploy: Deployments → latest → ⋯ → Redeploy.

### 4. Test with a small real payment
- Sign in with a test account → buy the Starter pack
- Pay the invoice (pick a cheap/fast coin; NOWPayments also has a sandbox at
  account.sandbox.nowpayments.io if you prefer test-money first — use a
  sandbox API key + set the API URL accordingly while testing)
- After confirmation, the account balance should increase automatically
- Check Vercel → Logs for the webhook entries if anything looks off

## Product catalog (server-side prices)

Defined in `api/create-payment.js` — edit there to change prices:

- Credits: starter $14.99 → 60, popular $29.99 → 125, premium $79.99 → 500
- Subscriptions (monthly): silver $19.99, gold $39.99, platinum $79.99,
  elite $149.99 (31-day period per payment)

Note: crypto payments have no recurring billing — subscriptions here are
"pay for a month, get 31 days." Renewal = user pays again. When you get a
card processor (CCBill/Segpay), true auto-renewal comes with it and plugs
into the same `activate_subscription` function.

## Subscription checkout buttons

Credit-pack purchases are fully wired into the existing payment modal.
To sell subscriptions from the Upgrade page, call the helper with the tier:

```ts
import { startCryptoCheckout } from '@/lib/cryptoCheckout';
await startCryptoCheckout('sub', 'gold'); // silver | gold | platinum | elite
```
