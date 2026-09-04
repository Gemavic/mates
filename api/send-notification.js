// /api/send-notification — sends emails for likes, messages, matches,
// winks, gifts, and profile views. Requires a valid signed-in Supabase
// session so it can't be used as an open spam relay; only a small fixed
// set of templates can be triggered, never arbitrary subject/body text.
//
// These are treated as COMMERCIAL electronic messages, not transactional
// ones. "Someone liked your profile — come back and see" promotes the use
// of a paid service, so under CASL it needs consent, sender identification
// with a mailing address, and a working unsubscribe. All three are handled
// centrally in api/_email.js; this file just picks the template.
//
// Required Vercel environment variables:
//   RESEND_API_KEY, RECEIPT_FROM_EMAIL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Strongly recommended (CASL/CAN-SPAM identification):
//   BUSINESS_NAME, BUSINESS_ADDRESS, SUPPORT_EMAIL
//
// If these aren't set, the endpoint returns { sent: false, skipped: true }
// rather than erroring — notifications are a nice-to-have, never a blocker.

import { sendEmail, publicHost, escapeHtml, emailConfigured } from './_email.js';

const TEMPLATES = {
  like: {
    subject: (name) => `${name} liked your profile`,
    body: (name) => `${name} liked your profile on Dates.care. Open the app to see if it's a match.`,
    deeplink: '#likes',
    pref: 'email_likes',
  },
  message: {
    subject: (name) => `New message from ${name}`,
    body: (name) => `You have a new message from ${name} on Dates.care.`,
    deeplink: '#matches',
    pref: 'email_messages',
  },
  match: {
    subject: (name) => `It's a match with ${name}`,
    body: (name) => `You and ${name} liked each other. You can start chatting now.`,
    deeplink: '#matches',
    pref: 'email_matches',
  },
  wink: {
    subject: (name) => `${name} sent you a wink`,
    body: (name) => `${name} sent you a wink on Dates.care. Wink back or send a message.`,
    deeplink: '#likes',
    pref: 'email_likes',
  },
  gift: {
    subject: (name) => `${name} sent you a gift`,
    body: (name) => `${name} sent you a gift on Dates.care. Open your messages to see it.`,
    deeplink: '#matches',
    pref: 'email_messages',
  },
  profile_view: {
    subject: (name) => `${name} viewed your profile`,
    body: (name) => `${name} looked at your profile on Dates.care.`,
    deeplink: '#profile',
    pref: 'email_profile_views',
  },
};

// Per-category preference on top of the master email switch. A row that
// doesn't exist means the person hasn't changed anything, which counts as
// on — the master switch in _email.js is what an unsubscribe flips.
async function categoryAllowed(userId, prefColumn) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notification_settings?user_id=eq.${encodeURIComponent(userId)}&select=${prefColumn}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!resp.ok) return true;
    const rows = await resp.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return true;
    return rows[0][prefColumn] !== false;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!emailConfigured() || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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
    if (recipientId === sender.id) {
      return res.status(200).json({ sent: false, skipped: true, reason: 'self' });
    }
    const safeName = String(senderName).slice(0, 60);

    // 3. Per-category preference (the master switch is checked inside
    //    sendEmail, which is also what refuses a send after an unsubscribe)
    if (!(await categoryAllowed(recipientId, template.pref))) {
      return res.status(200).json({ sent: false, skipped: true, reason: 'category_off' });
    }

    const host = publicHost(req);
    const link = `https://${host}/${template.deeplink}`;

    const result = await sendEmail({
      userId: recipientId,
      subject: template.subject(safeName),
      kind: 'commercial',
      host,
      lines: [template.body(safeName), '', `Open Dates.care: ${link}`],
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <p style="margin:0 0 20px;font-size:16px;color:#111827">${escapeHtml(template.body(safeName))}</p>
        <p style="margin:0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#db2777;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600;font-size:15px">Open Dates.care</a></p>
      </div>`,
    });

    return res.status(200).json({
      sent: result.sent,
      skipped: !result.sent,
      ...(result.reason ? { reason: result.reason } : {}),
    });
  } catch (err) {
    console.error('send-notification error:', err);
    return res.status(200).json({ sent: false, error: 'internal_error' });
  }
}
