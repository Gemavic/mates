// /api/check-payment-status — actively asks NOWPayments' own API for the
// real status of the caller's own pending payments, instead of only
// waiting on their push-based IPN webhook (which can be delayed or, in
// rare cases, fail to arrive at all). This talks directly to NOWPayments'
// authoritative system using our own API key — it is NOT based on
// anything the client submits (no screenshots, no client-asserted
// amounts), so it carries the same trust guarantees as the webhook path.
//
// Required Vercel environment variables:
//   NOWPAYMENTS_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

// Must mirror the credits catalog in create-payment.js / crypto-webhook.js
const CREDIT_PACKAGES = { starter: 60, popular: 125, premium: 500 };
const TIERS = ['silver', 'gold', 'platinum', 'elite'];
const OPEN_STATUSES = ['pending', 'waiting', 'confirming', 'sending', 'partially_paid'];

async function callRpc(name, args) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { NOWPAYMENTS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!NOWPAYMENTS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'not_configured' });
  }

  try {
    // 1. Authenticate the caller — this endpoint only ever acts on the
    //    signed-in user's OWN payment intents, never anyone else's, and
    //    never based on anything the client tells us about the payment.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'not_signed_in' });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'invalid_session' });
    const user = await userResp.json();
    if (!user?.id) return res.status(401).json({ error: 'invalid_session' });

    // 2. Find this user's still-open payment intents
    const intentsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/app_payment_intents?user_id=eq.${user.id}&status=in.(${OPEN_STATUSES.join(',')})&order=created_at.desc&limit=10`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const intents = await intentsResp.json().catch(() => []);
    if (!Array.isArray(intents) || intents.length === 0) {
      return res.status(200).json({ checked: 0, updated: [] });
    }

    const updated = [];

    for (const intent of intents) {
      if (!intent.provider_payment_id) continue; // no payment_id yet — nothing to check

      // 3. Ask NOWPayments directly — this is the actual verification.
      const statusResp = await fetch(
        `https://api.nowpayments.io/v1/payment/${intent.provider_payment_id}`,
        { headers: { 'x-api-key': NOWPAYMENTS_API_KEY } }
      );
      if (!statusResp.ok) continue;
      const payment = await statusResp.json().catch(() => null);
      const newStatus = payment?.payment_status;
      if (!newStatus || newStatus === intent.status) continue;

      // 4. Record the fresh status either way
      await fetch(`${SUPABASE_URL}/rest/v1/app_payment_intents?id=eq.${intent.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }),
      });

      // 5. If NOWPayments confirms it's actually finished, credit through
      //    the exact same idempotent RPCs the webhook uses — safe to call
      //    even if the webhook also eventually fires for the same
      //    payment, since credit_purchase/activate_subscription dedupe
      //    on payment_ref.
      if (newStatus === 'finished') {
        const paymentRef = `nowpayments:${intent.provider_payment_id}`;
        if (intent.kind === 'credits' && CREDIT_PACKAGES[intent.product_id]) {
          await callRpc('credit_purchase', {
            p_user_id: user.id,
            p_credits: CREDIT_PACKAGES[intent.product_id],
            p_payment_ref: paymentRef,
          });
        } else if (intent.kind === 'sub' && TIERS.includes(intent.product_id)) {
          const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
          await callRpc('activate_subscription', {
            p_user_id: user.id,
            p_tier: intent.product_id,
            p_period_end: periodEnd,
            p_payment_ref: paymentRef,
          });
        }
      }

      updated.push({ id: intent.id, status: newStatus });
    }

    return res.status(200).json({ checked: intents.length, updated });
  } catch (err) {
    console.error('check-payment-status error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
