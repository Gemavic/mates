// /api/create-payment — creates a NOWPayments hosted invoice.
// The PRICE and CONTENTS of every product are defined HERE, server-side.
// The client only sends a product id; it can never set its own price.
//
// Required Vercel environment variables:
//   NOWPAYMENTS_API_KEY        (from nowpayments.io dashboard)
//   SUPABASE_URL               (https://<project>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role)

const CATALOG = {
  credits: {
    starter: { usd: 14.99, credits: 60, label: 'Starter — 50 credits + 10 bonus' },
    popular: { usd: 29.99, credits: 125, label: 'Popular — 100 credits + 25 bonus' },
    premium: { usd: 79.99, credits: 500, label: 'Premium — 450 credits + 50 bonus' },
  },
  sub: {
    silver: { usd: 19.99, label: 'Silver monthly subscription' },
    gold: { usd: 39.99, label: 'Gold monthly subscription' },
    platinum: { usd: 79.99, label: 'Platinum monthly subscription' },
    elite: { usd: 149.99, label: 'Elite monthly subscription' },
  },
};

module.exports = async (req, res) => {
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

    // 3. Create the hosted invoice
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
        order_id: `${kind}:${user.id}:${id}`,
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

    return res.status(200).json({ invoice_url: invoice.invoice_url });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
};
