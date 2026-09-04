// /api/unsubscribe — the CASL / CAN-SPAM opt-out mechanism.
//
// Reached from the "Unsubscribe" link in every commercial email and from
// the RFC 8058 List-Unsubscribe header that mail clients turn into their
// own native unsubscribe button.
//
// The rules being satisfied here:
//   * CASL s.6(2)(c) — the mechanism must be able to be "readily
//     performed". One click, no sign-in, no form, no survey.
//   * CASL s.11(1) — it must stay valid for 60 days after the message was
//     sent. The token carries its own signed expiry, set to exactly that.
//   * CASL s.11(2) / CAN-SPAM — the opt-out must be given effect within
//     10 business days. This one is applied on the spot.
//
// GET renders a confirmation page (link clicked by a person).
// POST is the one-click form mail clients submit; it answers 200 with no body.

import { verifyUnsubscribeToken } from './_email.js';

async function optOut(userId) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/user_notification_settings`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      email_notifications: false,
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  return resp.ok;
}

function page(title, message, ok) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Dates.care</title>
<style>
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#0f172a;color:#f8fafc;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;padding:24px}
 .card{max-width:520px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;text-align:center}
 h1{margin:0 0 12px;font-size:22px}
 p{margin:0 0 12px;color:#cbd5e1}
 .mark{font-size:40px;margin-bottom:8px}
 a{color:#f472b6}
 .addr{margin-top:24px;padding-top:16px;border-top:1px solid #334155;font-size:12px;color:#94a3b8}
</style></head><body><div class="card">
<div class="mark">${ok ? '✓' : '⚠️'}</div>
<h1>${title}</h1>
<p>${message}</p>
<p><a href="/#settings">Manage all notification settings</a></p>
<div class="addr">${process.env.BUSINESS_NAME || 'Dates.care'}<br>
${process.env.BUSINESS_ADDRESS || 'Dates.care, Ontario, Canada'}<br>
${process.env.SUPPORT_EMAIL || 'support@dates.care'}</div>
</div></body></html>`;
}

function confirmPage(token) {
  const safe = String(token).replace(/[^A-Za-z0-9_.\-]/g, '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Unsubscribe · Dates.care</title>
<style>
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#0f172a;color:#f8fafc;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;padding:24px}
 .card{max-width:520px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;text-align:center}
 h1{margin:0 0 12px;font-size:22px}
 p{margin:0 0 16px;color:#cbd5e1}
 button{width:100%;border:0;border-radius:9999px;padding:14px 20px;font:600 16px system-ui;
        background:#db2777;color:#fff;cursor:pointer}
 a{display:inline-block;margin-top:14px;color:#94a3b8;font-size:14px}
 .addr{margin-top:24px;padding-top:16px;border-top:1px solid #334155;font-size:12px;color:#94a3b8}
</style></head><body><div class="card">
<h1>Stop notification emails?</h1>
<p>Confirm below and Dates.care will stop sending you notification emails. It takes effect immediately.</p>
<p style="font-size:14px;color:#94a3b8">Purchase receipts will still be sent — they are your record of what you paid.</p>
<form method="POST" action="/api/unsubscribe?t=${safe}">
  <button type="submit">Unsubscribe me</button>
</form>
<a href="/#settings">No — take me to my notification settings</a>
<div class="addr">${process.env.BUSINESS_NAME || 'Dates.care'}<br>
${process.env.BUSINESS_ADDRESS || 'Dates.care, Ontario, Canada'}<br>
${process.env.SUPPORT_EMAIL || 'support@dates.care'}</div>
</div></body></html>`;
}

export default async function handler(req, res) {
  const token = (req.query && req.query.t) || (req.body && req.body.t) || '';
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    if (req.method === 'POST') return res.status(400).end();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res
      .status(400)
      .send(
        page(
          'This unsubscribe link has expired',
          'Unsubscribe links stay valid for 60 days. Sign in and turn notification emails off under Settings → Notifications, or email us and we will do it for you.',
          false
        )
      );
  }

  // A GET must never change anything. Corporate mail gateways, Outlook
  // Safe Links, and antivirus scanners fetch every URL in an email before
  // the recipient ever sees it — if the opt-out happened on GET, those
  // scanners would silently unsubscribe people who never clicked, and the
  // first they would know of it is that their alerts stopped. So GET shows
  // a button, and the button POSTs.
  //
  // This is also why RFC 8058 one-click is defined as a POST: mail clients
  // that surface a native Unsubscribe button submit to this same handler
  // with the token still in the query string, and that path is honoured
  // immediately below without any page being rendered.
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
      confirmPage(String(token))
    );
  }

  const ok = await optOut(userId);

  // One-click POST from a mail client wants a bare 200, not a page. A
  // person who clicked the button on the confirmation page wants the page.
  const wantsHtml = String(req.headers.accept || '').includes('text/html');
  if (!wantsHtml) return res.status(ok ? 200 : 500).end();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res
    .status(ok ? 200 : 500)
    .send(
      ok
        ? page(
            'You have been unsubscribed',
            'You will not receive any more notification emails from Dates.care. This took effect immediately. Purchase receipts are still sent, because they are your record of what you paid.',
            true
          )
        : page(
            "We couldn't complete that",
            'Something went wrong saving your preference. Please email us and we will unsubscribe you by hand.',
            false
          )
    );
}
