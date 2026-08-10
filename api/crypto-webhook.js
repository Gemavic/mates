// /api/crypto-webhook — NOWPayments IPN handler.
// Verifies the HMAC-SHA512 signature, then (on final confirmation) calls the
// service-role-only database functions:
//   credit_purchase(user, credits, ref)          for pay-as-you-go top-ups
//   activate_subscription(user, tier, end, ref)  for monthly plans
// Both functions are idempotent per payment reference, so webhook retries
// and replays can never double-credit.
//
// Required Vercel environment variables:
//   NOWPAYMENTS_IPN_SECRET     (NOWPayments dashboard → Settings → IPN)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import crypto from 'node:crypto';

// Must mirror the credits catalog in create-payment.js
const CREDIT_PACKAGES = { starter: 60, popular: 125, premium: 500 };
const TIERS = ['silver', 'gold', 'platinum', 'elite'];

function sortObject(obj) {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(obj[key]);
        return acc;
      }, {});
  }
  return obj;
}

async function sendReceiptEmail(userId, subject, lines) {
  // Optional: requires RESEND_API_KEY and RECEIPT_FROM_EMAIL env vars.
  // Silently skipped when not configured — never blocks crediting.
  const { RESEND_API_KEY, RECEIPT_FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!RESEND_API_KEY || !RECEIPT_FROM_EMAIL) return;
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!userResp.ok) return;
    const user = await userResp.json();
    if (!user?.email) return;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RECEIPT_FROM_EMAIL,
        to: user.email,
        subject,
        text:
          lines.join('\n') +
          '\n\nThis charge will appear from Dates (dates.care).' +
          '\nRefund & cancellation policy: https://' +
          (process.env.PUBLIC_HOST || 'dates.care') +
          '/#payment-refund' +
          '\nQuestions? Reply to this email or use Help & Support in the app.',
      }),
    });
  } catch (err) {
    console.error('Receipt email failed (non-fatal):', err);
  }
}

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

// Records the current status against the tracking row created when the
// invoice was first generated — this runs on EVERY IPN call, not just the
// final 'finished' one, so a person can see "pending"/"confirming"/
// "failed" in their transaction history instead of nothing at all until
// (if ever) it completes. provider_payment_id is the reliable match once
// known; the very first call for a given order_id falls back to matching
// the most recent still-pending row and stamps the payment id onto it so
// every later call for the same payment matches directly and
// unambiguously, even if the same order_id is reused by a later, separate
// purchase attempt.
async function recordPaymentStatus(orderId, paymentId, status) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    if (paymentId) {
      const byPaymentId = await fetch(
        `${SUPABASE_URL}/rest/v1/app_payment_intents?provider_payment_id=eq.${encodeURIComponent(paymentId)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
        }
      );
      const updated = await byPaymentId.json().catch(() => []);
      if (byPaymentId.ok && Array.isArray(updated) && updated.length > 0) return;
    }

    // First contact for this payment — attach paymentId to the most recent
    // matching pending row so future updates match directly by paymentId.
    await fetch(
      `${SUPABASE_URL}/rest/v1/app_payment_intents?order_id=eq.${encodeURIComponent(orderId)}&status=eq.pending&order=created_at.desc&limit=1`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status,
          provider_payment_id: paymentId ? String(paymentId) : null,
          updated_at: new Date().toISOString(),
        }),
      }
    );
  } catch (err) {
    // Status tracking is informational only — never let it block crediting
    console.error('Failed to record payment intent status (non-fatal):', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { NOWPAYMENTS_IPN_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!NOWPAYMENTS_IPN_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'crypto-webhook misconfigured. Missing:',
      [
        !NOWPAYMENTS_IPN_SECRET && 'NOWPAYMENTS_IPN_SECRET',
        !SUPABASE_URL && 'SUPABASE_URL',
        !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
      ].filter(Boolean).join(', ')
    );
    return res.status(500).json({ error: 'webhook_not_configured' });
  }

  try {
    const body = req.body || {};

    // 1. Verify signature (HMAC-SHA512 of the alphabetically-sorted JSON body)
    const received = req.headers['x-nowpayments-sig'];
    const expected = crypto
      .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
      .update(JSON.stringify(sortObject(body)))
      .digest('hex');

    if (
      !received ||
      received.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
    ) {
      console.error('IPN signature mismatch');
      return res.status(401).json({ error: 'bad_signature' });
    }

    // 2. Record the status for transaction-history visibility on EVERY
    //    call, then only act on final confirmation for actual crediting.
    //    All other statuses (waiting/confirming/partially_paid/expired/
    //    failed/etc.) are now tracked, not silently discarded.
    const status = body.payment_status;
    const paymentId = body.payment_id;
    const orderId = body.order_id || '';

    await recordPaymentStatus(orderId, paymentId, status);

    if (status !== 'finished') {
      if (status === 'partially_paid') {
        console.warn(`Partial payment ${paymentId} for ${orderId} — not credited.`);
      }
      return res.status(200).json({ received: true, status });
    }

    // 3. Parse order_id: "credits:<userId>:<packageId>" or "sub:<userId>:<tier>"
    const [kind, userId, itemId] = orderId.split(':');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId || ''
    );
    if (!isUuid) {
      console.error('Bad order_id in IPN:', orderId);
      return res.status(200).json({ received: true, error: 'bad_order_id' });
    }

    const paymentRef = `nowpayments:${paymentId}`;

    if (kind === 'credits' && CREDIT_PACKAGES[itemId]) {
      const { ok, data } = await callRpc('credit_purchase', {
        p_user_id: userId,
        p_credits: CREDIT_PACKAGES[itemId],
        p_payment_ref: paymentRef,
      });
      console.log('credit_purchase:', ok, JSON.stringify(data));
      if (data?.success === true) {
        await sendReceiptEmail(userId, 'Your Dates purchase receipt', [
          'Thank you for your purchase!',
          '',
          `Item: ${CREDIT_PACKAGES[itemId]} credits (${itemId} pack)`,
          `Payment reference: ${paymentRef}`,
          `New balance: ${data.total_credits} credits`,
        ]);
      }
      // duplicate_payment_ref on retries is expected and fine
      return res.status(200).json({ received: true, credited: data?.success === true });
    }

    if (kind === 'sub' && TIERS.includes(itemId)) {
      const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
      const { ok, data } = await callRpc('activate_subscription', {
        p_user_id: userId,
        p_tier: itemId,
        p_period_end: periodEnd,
        p_payment_ref: paymentRef,
      });
      console.log('activate_subscription:', ok, JSON.stringify(data));
      if (data?.success === true) {
        await sendReceiptEmail(userId, `Your Dates ${itemId} subscription is active`, [
          'Thank you for subscribing!',
          '',
          `Plan: ${itemId.charAt(0).toUpperCase() + itemId.slice(1)} (31 days)`,
          `Active until: ${periodEnd}`,
          `Payment reference: ${paymentRef}`,
          '',
          'Crypto subscriptions do not auto-renew — you are never charged automatically.',
        ]);
      }
      return res.status(200).json({ received: true, activated: data?.success === true });
    }

    console.error('Unknown product in IPN:', orderId);
    return res.status(200).json({ received: true, error: 'unknown_product' });
  } catch (err) {
    console.error('crypto-webhook error:', err);
    // Non-200 makes NOWPayments retry, which is what we want on transient errors
    return res.status(500).json({ error: 'internal_error' });
  }
}
