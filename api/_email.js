// api/_email.js — the one place this app sends email from.
//
// Files under /api whose name starts with "_" are NOT routed by Vercel,
// so this is a shared library, not an endpoint.
//
// Why it exists: every message we send has to satisfy two different sets
// of rules at once, and getting them right in four separate copies of a
// fetch() call was never going to happen.
//
//   CASL (Canada, where Dates is operated from). Section 6 says a
//   Commercial Electronic Message must (a) be sent with consent,
//   (b) identify the sender AND give a mailing address plus one other
//   contact method, all valid for 60 days after sending, and (c) carry an
//   unsubscribe mechanism that is readily performed and honoured within
//   10 business days. Section 6(6) exempts messages that "facilitate,
//   complete or confirm a commercial transaction the recipient previously
//   agreed to" — that is what a purchase receipt is — from the consent and
//   unsubscribe requirements. We still identify ourselves in those, because
//   there is no reason not to, and a receipt with no address on it looks
//   like a phishing attempt.
//
//   CAN-SPAM (United States, where most members are). Requires accurate
//   headers, a non-deceptive subject, a physical postal address, a clear
//   opt-out, and opt-outs honoured within 10 business days.
//
// The practical rule this module enforces: kind: 'transactional' sends
// unconditionally with identification; kind: 'commercial' additionally
// requires the recipient not to have unsubscribed, and carries a working
// one-click unsubscribe link plus a List-Unsubscribe header.

import crypto from 'node:crypto';

const BUSINESS = {
  name: process.env.BUSINESS_NAME || 'Dates.care',
  // CASL requires a mailing address at which the sender can be contacted
  // for 60 days after the message is sent. Set BUSINESS_ADDRESS in Vercel
  // to your real one — the fallback is deliberately obvious so an
  // unconfigured deployment is easy to spot in a test send.
  address: process.env.BUSINESS_ADDRESS || 'Dates.care, Ontario, Canada',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@dates.care',
};

export function publicHost(req) {
  return (
    process.env.PUBLIC_HOST ||
    (req && req.headers && req.headers.host) ||
    'www.dates.care'
  );
}

export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RECEIPT_FROM_EMAIL);
}

// ---------------------------------------------------------------------
// Unsubscribe tokens
// ---------------------------------------------------------------------
// Signed, self-contained, and valid for 60 days — which is exactly the
// window CASL requires the mechanism to keep working for. No database
// round-trip needed to validate one, so /api/unsubscribe stays fast and
// works even if the token is clicked from a mail client's link scanner.

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function unsubSecret() {
  // Never exposed to the browser. Falls back to the service-role key so
  // this works without adding yet another env var; set UNSUBSCRIBE_SECRET
  // if you would rather it be rotatable on its own.
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function makeUnsubscribeToken(userId, expiresAt) {
  const exp = expiresAt || Date.now() + SIXTY_DAYS_MS;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', unsubSecret()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyUnsubscribeToken(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const payload = Buffer.from(body, 'base64url').toString('utf8');
    const expected = crypto.createHmac('sha256', unsubSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const [userId, exp] = payload.split('.');
    if (!userId || !exp) return null;
    if (Date.now() > Number(exp)) return null;
    return userId;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------

// Reads the recipient's stored preference. A row that does not exist yet
// counts as "still subscribed" for transactional mail and — because the
// person gave express consent to service notifications when they created
// the account and agreed to the terms — for notification mail too. Anyone
// who unsubscribes gets a row with email_notifications = false, and that
// is checked before every commercial send.
export async function hasEmailConsent(userId) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_notification_settings?user_id=eq.${encodeURIComponent(userId)}&select=email_notifications`,
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
    return rows[0].email_notifications !== false;
  } catch {
    // A preferences lookup that fails must not silently turn into
    // "assume they unsubscribed" — that would drop receipts too.
    return true;
  }
}

export async function lookupEmail(userId) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    return user?.email || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Footers
// ---------------------------------------------------------------------

function footerText({ kind, host, unsubUrl }) {
  const lines = [
    '',
    '—',
    `${BUSINESS.name}`,
    BUSINESS.address,
    `Contact: ${BUSINESS.supportEmail} · https://${host}/#help`,
  ];
  if (kind === 'transactional') {
    lines.push(
      '',
      'You are receiving this because it confirms a purchase you made.',
      'Transactional messages like receipts are sent regardless of your',
      'notification preferences, so you always have a record of what you paid.',
      `Refund & cancellation policy: https://${host}/#payment-refund`
    );
  } else {
    lines.push(
      '',
      'You are receiving this because you have notifications turned on for',
      `your ${BUSINESS.name} account.`,
      `Unsubscribe from these emails: ${unsubUrl}`,
      'You can also change what you receive under Settings → Notifications.',
      'Unsubscribes take effect immediately.'
    );
  }
  return lines.join('\n');
}

function footerHtml({ kind, host, unsubUrl }) {
  const common = `
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6">
      <strong>${escapeHtml(BUSINESS.name)}</strong><br>
      ${escapeHtml(BUSINESS.address)}<br>
      <a href="mailto:${escapeHtml(BUSINESS.supportEmail)}" style="color:#6b7280">${escapeHtml(BUSINESS.supportEmail)}</a>
      &middot; <a href="https://${escapeHtml(host)}/#help" style="color:#6b7280">Help &amp; Support</a>
    </p>`;
  if (kind === 'transactional') {
    return `${common}
    <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">
      You are receiving this because it confirms a purchase you made. Receipts are
      sent regardless of your notification preferences so you always have a record
      of what you paid.
      <a href="https://${escapeHtml(host)}/#payment-refund" style="color:#9ca3af">Refund &amp; cancellation policy</a>.
    </p>`;
  }
  return `${common}
    <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">
      You are receiving this because notifications are on for your account.
      <a href="${escapeHtml(unsubUrl)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
      &middot; <a href="https://${escapeHtml(host)}/#settings" style="color:#9ca3af">Notification settings</a><br>
      Unsubscribes take effect immediately.
    </p>`;
}

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------
// The send
// ---------------------------------------------------------------------

/**
 * @param {object}   opts
 * @param {string}   opts.userId        recipient's auth user id
 * @param {string}   opts.subject
 * @param {string[]} opts.lines         plain-text body, one line per entry
 * @param {string}  [opts.html]         optional HTML body (footer appended)
 * @param {'transactional'|'commercial'} opts.kind
 * @param {string}  [opts.host]
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
export async function sendEmail({ userId, subject, lines, html, kind, host }) {
  const { RESEND_API_KEY, RECEIPT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !RECEIPT_FROM_EMAIL) {
    return { sent: false, reason: 'not_configured' };
  }

  const theHost = host || publicHost(null);

  if (kind === 'commercial') {
    const consented = await hasEmailConsent(userId);
    if (!consented) return { sent: false, reason: 'unsubscribed' };
  }

  const to = await lookupEmail(userId);
  if (!to) return { sent: false, reason: 'no_email' };

  const token = makeUnsubscribeToken(userId);
  const unsubUrl = `https://${theHost}/api/unsubscribe?t=${token}`;

  const headers = {};
  if (kind === 'commercial') {
    // RFC 8058 one-click unsubscribe — mail clients surface this as a
    // native "Unsubscribe" button, which is the readiest mechanism there is.
    headers['List-Unsubscribe'] = `<${unsubUrl}>, <mailto:${BUSINESS.supportEmail}?subject=unsubscribe>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const body = {
    from: RECEIPT_FROM_EMAIL,
    to,
    subject,
    text: lines.join('\n') + '\n' + footerText({ kind, host: theHost, unsubUrl }),
  };
  if (html) body.html = html + footerHtml({ kind, host: theHost, unsubUrl });
  if (Object.keys(headers).length) body.headers = headers;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('Resend send failed:', resp.status, errText);
      return { sent: false, reason: 'send_failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error('Email send threw (non-fatal):', err);
    return { sent: false, reason: 'exception' };
  }
}

export { BUSINESS };
