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
import { CATALOG, TIERS, creditsFor } from './_catalog.js';
import { sendEmail, publicHost, escapeHtml, BUSINESS } from './_email.js';

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

// A purchase receipt is a transactional message: CASL s.6(6)(b) exempts a
// message that "facilitates, completes or confirms a commercial
// transaction the person previously agreed to" from the consent and
// unsubscribe requirements, and CAN-SPAM treats it as a transactional or
// relationship message. So this is sent whatever the person's notification
// preferences say — it is their record of what they paid, and withholding
// it because they turned off match alerts would be indefensible.
//
// It still carries full sender identification and a mailing address,
// because a receipt without one reads like a phishing attempt.
async function sendReceiptEmail(userId, subject, lines, host) {
  const { sent, reason } = await sendEmail({
    userId,
    subject,
    lines,
    html: receiptHtml(subject, lines, host),
    kind: 'transactional',
    host,
  });
  if (!sent && reason !== 'not_configured') {
    console.error('Receipt email not delivered:', reason);
  }
  return sent;
}

function receiptHtml(subject, lines, host) {
  const rows = lines
    .filter((l) => l !== '')
    .map((l) => {
      const idx = l.indexOf(': ');
      if (idx > 0 && idx < 40) {
        return `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">${escapeHtml(l.slice(0, idx))}</td>` +
               `<td style="padding:6px 0;text-align:right;color:#111827;font-size:14px;font-weight:600">${escapeHtml(l.slice(idx + 2))}</td></tr>`;
      }
      return `<tr><td colspan="2" style="padding:6px 0;color:#374151;font-size:14px">${escapeHtml(l)}</td></tr>`;
    })
    .join('');
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111827">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:13px">Receipt from ${escapeHtml(BUSINESS.name)} &middot; ${new Date().toLocaleDateString('en-CA')}</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">${rows}</table>
    <p style="margin:20px 0 0;color:#374151;font-size:14px">This charge appears on your statement from <strong>Dates (dates.care)</strong>.</p>
    <p style="margin:8px 0 0"><a href="https://${escapeHtml(host)}/#credit-history" style="color:#db2777;font-size:14px">View your billing history</a></p>
  </div>`;
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
    const host = publicHost(req);
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

    if (kind === 'credits' && creditsFor(itemId) !== null) {
      const granted = creditsFor(itemId);
      const pack = CATALOG.credits[itemId];
      const { ok, data } = await callRpc('credit_purchase', {
        p_user_id: userId,
        p_credits: granted,
        p_payment_ref: paymentRef,
      });
      console.log('credit_purchase:', ok, JSON.stringify(data));
      if (data?.success === true) {
        await sendReceiptEmail(
          userId,
          'Your Dates.care purchase receipt',
          [
            'Thank you for your purchase.',
            '',
            `Item: ${pack.label}`,
            `Credits added: ${granted}`,
            `Amount paid: USD $${pack.usd.toFixed(2)}`,
            `Paid with: Cryptocurrency (NOWPayments)`,
            `Payment reference: ${paymentRef}`,
            `Date: ${new Date().toISOString().slice(0, 10)}`,
            `New balance: ${data.total_credits} credits`,
            '',
            'Credits are a prepaid balance for features inside Dates.care.',
            'They have no cash value and do not expire.',
          ],
          host
        );
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
        const tierPrice = CATALOG.sub[itemId]?.usd;
        await sendReceiptEmail(
          userId,
          `Your Dates.care ${itemId} subscription is active`,
          [
            'Thank you for subscribing.',
            '',
            `Plan: ${itemId.charAt(0).toUpperCase() + itemId.slice(1)} (31 days)`,
            ...(tierPrice ? [`Amount paid: USD $${tierPrice.toFixed(2)}`] : []),
            `Paid with: Cryptocurrency (NOWPayments)`,
            `Active until: ${periodEnd.slice(0, 10)}`,
            `Payment reference: ${paymentRef}`,
            '',
            // The disclosure California's Automatic Renewal Law wants on
            // the acknowledgement: what the terms are, and how to cancel.
            'This plan does NOT auto-renew. Crypto payments cannot be charged',
            'again without you starting a new payment yourself, so you will',
            'never be billed automatically.',
            'You can end the plan at any time under Settings -> Subscription,',
            'or by replying to this email.',
          ],
          host
        );
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
