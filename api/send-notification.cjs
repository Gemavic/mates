// /api/send-notification — sends real emails for likes, messages, matches,
// winks, gifts, and profile views. Requires a valid signed-in Supabase
// session so it can't be used as an open spam relay; only a small fixed
// set of templates can be triggered, never arbitrary subject/body text.
//
// Required Vercel environment variables (same as the payment receipts):
//   RESEND_API_KEY, RECEIPT_FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// If these aren't set, the endpoint returns { sent: false, skipped: true }
// rather than erroring — notifications are a nice-to-have, never a blocker.

const TEMPLATES = {
  like: {
    subject: (name) => `💖 ${name} liked your profile!`,
    body: (name) => `${name} liked your profile on Dates. Check them out and see if it's a match!`,
  },
  message: {
    subject: (name) => `💬 New message from ${name}`,
    body: (name) => `You have a new message from ${name}. Don't keep them waiting!`,
  },
  match: {
    subject: (name) => `🎉 It's a match with ${name}!`,
    body: (name) => `Congratulations! You and ${name} liked each other. Start chatting now!`,
  },
  wink: {
    subject: (name) => `😉 ${name} sent you a wink!`,
    body: (name) => `${name} sent you a playful wink. Wink back or send a message!`,
  },
  gift: {
    subject: (name) => `🎁 ${name} sent you a gift!`,
    body: (name) => `${name} sent you a gift on Dates. Open your messages to see it!`,
  },
  profile_view: {
    subject: (name) => `👀 ${name} viewed your profile`,
    body: (name) => `${name} checked out your profile. Take a look at theirs too!`,
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { RESEND_API_KEY, RECEIPT_FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    process.env;

  // Notifications are optional infra — never block the app if unconfigured.
  if (!RESEND_API_KEY || !RECEIPT_FROM_EMAIL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ sent: false, skipped: true, reason: 'not_configured' });
  }

  try {
    // 1. Authenticate the sender via their Supabase session
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'not_signed_in' });

    const senderResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!senderResp.ok) return res.status(401).json({ error: 'invalid_session' });
    const sender = await senderResp.json();
    if (!sender?.id) return res.status(401).json({ error: 'invalid_session' });

    // 2. Validate the request against the fixed template set
    const { type, recipientId, senderName } = req.body || {};
    const template = TEMPLATES[type];
    if (!template || !recipientId || !senderName) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    const safeName = String(senderName).slice(0, 60);

    // 3. Look up the recipient's email (service role required for this)
    const recipientResp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${recipientId}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!recipientResp.ok) {
      return res.status(200).json({ sent: false, skipped: true, reason: 'recipient_not_found' });
    }
    const recipient = await recipientResp.json();
    if (!recipient?.email) {
      return res.status(200).json({ sent: false, skipped: true, reason: 'no_recipient_email' });
    }

    // 4. Send via Resend
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RECEIPT_FROM_EMAIL,
        to: recipient.email,
        subject: template.subject(safeName),
        text:
          template.body(safeName) +
          `\n\nOpen Dates to respond: https://${req.headers.host}/#discovery` +
          `\n\nDon't want these emails? Manage notification preferences in Settings.`,
      }),
    });

    if (!emailResp.ok) {
      const errText = await emailResp.text().catch(() => '');
      console.error('Resend send failed:', errText);
      return res.status(200).json({ sent: false, skipped: false, error: 'send_failed' });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('send-notification error:', err);
    return res.status(200).json({ sent: false, error: 'internal_error' });
  }
};
