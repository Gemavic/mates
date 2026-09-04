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

import { CATALOG, TIERS, creditsFor } from './_catalog.js';
import { sendEmail, publicHost } from './_email.js';

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
      `${SUPABASE_URL}/rest/v1/app_payment_intents?select=*&user_id=eq.${user.id}&status=in.(${OPEN_STATUSES.join(',')})&order=created_at.desc&limit=10`,
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
      // provider_payment_id is only ever written by the IPN handler. Making
      // it a precondition meant this whole endpoint — the fallback for
      // "the webhook never arrived" — could only ever help when a webhook
      // HAD arrived. If the IPN secret is wrong, or NOWPayments' callback
      // fails through all its retries, the row keeps a null payment id
      // forever, this loop skipped it, and a paid purchase was never
      // credited by any route at all. So when there is no payment id, look
      // the payment up by the order id instead, which we always have.
      let payment = null;
      let discoveredPaymentId = null;

      if (intent.provider_payment_id) {
        // 3. Ask NOWPayments directly — this is the actual verification.
        const statusResp = await fetch(
          `https://api.nowpayments.io/v1/payment/${intent.provider_payment_id}`,
          { headers: { 'x-api-key': NOWPAYMENTS_API_KEY } }
        );
        if (!statusResp.ok) continue;
        payment = await statusResp.json().catch(() => null);
      } else {
        const listResp = await fetch(
          `https://api.nowpayments.io/v1/payment/?orderId=${encodeURIComponent(intent.order_id)}&limit=20&sortBy=created_at&orderBy=desc`,
          { headers: { 'x-api-key': NOWPAYMENTS_API_KEY } }
        );
        if (!listResp.ok) continue;
        const list = await listResp.json().catch(() => null);
        const all = Array.isArray(list?.data) ? list.data : [];

        // NEVER trust the query to have filtered. This endpoint may ignore
        // an unrecognised parameter and hand back the merchant's whole
        // recent payment history instead — in which case picking "the most
        // recent finished one" would credit this person for a payment made
        // by someone else entirely. So filter here, on the order id we
        // actually issued, which contains this user's own id and a nonce
        // unique to this one checkout attempt.
        const candidates = all.filter(
          (c) => c && String(c.order_id || '') === String(intent.order_id) && c.payment_id
        );
        payment =
          candidates.find((c) => c.payment_status === 'finished') || candidates[0] || null;

        // Without a payment id there is no idempotency key, and crediting
        // under a placeholder would poison the key for every later
        // purchase on the platform. Skip and let the next poll try again.
        if (!payment?.payment_id) continue;
        intent.provider_payment_id = String(payment.payment_id);
        discoveredPaymentId = intent.provider_payment_id;
      }

      const newStatus = payment?.payment_status;
      if (!newStatus || newStatus === intent.status) {
        // Nothing new to report, but if this poll is what discovered the
        // payment id, save it — otherwise the list lookup above is repeated
        // from scratch on every future poll for this intent.
        if (discoveredPaymentId) {
          await fetch(`${SUPABASE_URL}/rest/v1/app_payment_intents?id=eq.${intent.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider_payment_id: discoveredPaymentId,
              updated_at: new Date().toISOString(),
            }),
          });
        }
        continue;
      }

      // 4. If NOWPayments confirms it's actually finished, credit through
      //    the exact same idempotent RPCs the webhook uses — safe to call
      //    even if the webhook also eventually fires for the same
      //    payment, since credit_purchase/activate_subscription dedupe
      //    on payment_ref.
      if (newStatus === 'finished') {
        const paymentRef = `nowpayments:${intent.provider_payment_id}`;
        if (intent.kind === 'credits' && creditsFor(intent.product_id) !== null) {
          const pack = CATALOG.credits[intent.product_id];
          const { data } = await callRpc('credit_purchase', {
            p_user_id: user.id,
            p_credits: pack.credits,
            p_payment_ref: paymentRef,
          });
          // The webhook sends a receipt when IT credits a purchase. When
          // the webhook never arrived and this poll is what actually
          // credited the person, the receipt has to come from here too —
          // otherwise a payment that completes through the slow path
          // leaves the buyer with no record of it at all. credit_purchase
          // is idempotent, so `success` is true for exactly one of the two
          // routes and only that one sends.
          if (data?.success === true) {
            await sendEmail({
              userId: user.id,
              subject: 'Your Dates.care purchase receipt',
              kind: 'transactional',
              host: publicHost(req),
              lines: [
                'Thank you for your purchase.',
                '',
                `Item: ${pack.label}`,
                `Credits added: ${pack.credits}`,
                `Amount paid: USD $${pack.usd.toFixed(2)}`,
                'Paid with: Cryptocurrency (NOWPayments)',
                `Payment reference: ${paymentRef}`,
                `Date: ${new Date().toISOString().slice(0, 10)}`,
                `New balance: ${data.total_credits} credits`,
                '',
                'Credits are a prepaid balance for features inside Dates.care.',
                'They have no cash value and do not expire.',
              ],
            });
          }
        } else if (intent.kind === 'sub' && TIERS.includes(intent.product_id)) {
          const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
          const { data } = await callRpc('activate_subscription', {
            p_user_id: user.id,
            p_tier: intent.product_id,
            p_period_end: periodEnd,
            p_payment_ref: paymentRef,
          });
          if (data?.success === true) {
            const tierPrice = CATALOG.sub[intent.product_id]?.usd;
            await sendEmail({
              userId: user.id,
              subject: `Your Dates.care ${intent.product_id} subscription is active`,
              kind: 'transactional',
              host: publicHost(req),
              lines: [
                'Thank you for subscribing.',
                '',
                `Plan: ${intent.product_id} (31 days)`,
                ...(tierPrice ? [`Amount paid: USD $${tierPrice.toFixed(2)}`] : []),
                `Active until: ${periodEnd.slice(0, 10)}`,
                `Payment reference: ${paymentRef}`,
                '',
                'This plan does NOT auto-renew. You will never be billed automatically.',
                'You can end it any time under Settings -> Subscription.',
              ],
            });
          }
        }
      }

      // 5. Record the fresh status LAST, and only once the crediting above
      //    has returned. 'finished' is not an open status, so the moment
      //    this row is stamped finished it is never selected again — if the
      //    function had died between stamping and crediting, the purchase
      //    would have been marked paid with nothing granted and no route
      //    left to retry it. Crediting is idempotent, so doing it before
      //    the stamp costs at worst one wasted duplicate-ref call.
      await fetch(`${SUPABASE_URL}/rest/v1/app_payment_intents?id=eq.${intent.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(intent.provider_payment_id
            ? { provider_payment_id: intent.provider_payment_id }
            : {}),
          updated_at: new Date().toISOString(),
        }),
      });

      updated.push({ id: intent.id, status: newStatus });
    }

    return res.status(200).json({ checked: intents.length, updated });
  } catch (err) {
    console.error('check-payment-status error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
