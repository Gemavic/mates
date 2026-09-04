// /api/create-payment — creates a NOWPayments hosted invoice.
// The PRICE and CONTENTS of every product come from api/_catalog.js,
// server-side. The client only sends a product id; it can never set its
// own price, and it can never disagree with what the webhook grants.
//
// Required Vercel environment variables:
//   NOWPAYMENTS_API_KEY        (from nowpayments.io dashboard)
//   SUPABASE_URL               (https://<project>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase -> Settings -> API -> service_role)

import crypto from 'node:crypto';
import { CATALOG } from './_catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { NOWPAYMENTS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!NOWPAYMENTS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'payments_not_configured' });
  }

  try {
    // 1. Authenticate the user from their Supabase access token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'not_signed_in' });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'invalid_session' });
    const user = await userResp.json();
    if (!user?.id) return res.status(401).json({ error: 'invalid_session' });

    // 2. Look the product up in the server-side catalog
    const { kind, id } = req.body || {};
    const product = CATALOG[kind]?.[id];
    if (!product) return res.status(400).json({ error: 'unknown_product' });

    // 3. Create the hosted invoice.
    //
    // The order id carries a per-attempt nonce. Without one, every
    // Starter purchase by the same person had the identical order id, and
    // the webhook's "first contact for this payment" fallback matches the
    // most recent still-pending row with that id — so if someone abandoned
    // one checkout and started another, the two payments' references could
    // be stamped onto each other's rows. The receipt would then quote a
    // blockchain payment that was not the one the buyer made, which is
    // exactly the document they would take to their bank.
    //
    // The webhook reads the id as kind:userId:productId by position, so a
    // fourth segment is ignored by every existing reader.
    const nonce = crypto.randomUUID().slice(0, 8);
    const orderId = `${kind}:${user.id}:${id}:${nonce}`;
    const origin = `https://${req.headers.host}`;
    const invoiceResp = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: product.usd,
        price_currency: 'usd',
        order_id: orderId,
        order_description: product.label,
        ipn_callback_url: `${origin}/api/crypto-webhook`,
        success_url: `${origin}/#success`,
        cancel_url: `${origin}/#cancel`,
      }),
    });

    const invoice = await invoiceResp.json();
    if (!invoiceResp.ok || !invoice.invoice_url) {
      console.error('NOWPayments invoice error:', invoice);
      return res.status(502).json({ error: 'invoice_failed' });
    }

    // 4. Record the attempt so it shows up immediately as "pending" in the
    // person's transaction history, and so the webhook has a row to
    // update regardless of which status NOWPayments reports next — not
    // just silently discarding everything short of 'finished' the way
    // this used to work. Best-effort: a tracking-row failure should never
    // block the actual checkout the person is trying to complete.
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/app_payment_intents`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: user.id,
          order_id: orderId,
          kind,
          product_id: id,
          amount_usd: product.usd,
          status: 'pending',
        }),
      });
    } catch (trackingErr) {
      console.error('Failed to record payment intent (non-fatal):', trackingErr);
    }

    return res.status(200).json({ invoice_url: invoice.invoice_url });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
