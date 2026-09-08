// POST /api/support-ticket
//
// The Help page's contact form used to generate 'TKT-' + Math.random(),
// show "Support Ticket Created!" and send nothing at all. Someone reporting
// a scam or an underage account believed it had been filed.
//
// Now: the ticket is written to support_tickets by the service role (the
// row is the ticket - the reference the member sees is real), and an email
// goes to the support inbox. Email is best-effort: if Resend is not
// configured the ticket is still saved, and the response says so honestly.
//
// Signed-in members are linked to their account; signed-out visitors may
// still file, because "I cannot log in" is itself a support ticket.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional env: RESEND_API_KEY, RECEIPT_FROM_EMAIL, SUPPORT_EMAIL

import crypto from 'node:crypto';
import { escapeHtml, BUSINESS } from './_email.js';

const MAX = { name: 100, email: 200, subject: 150, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(v, max) {
  return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function makeRef() {
  // 8 characters from an unambiguous alphabet: no 0/O, no 1/I/L.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return `DC-${out.slice(0, 4)}-${out.slice(4)}`;
}

async function whoIs(req, SUPABASE_URL, SERVICE_KEY) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { id: u.id, email: u.email || null } : null;
  } catch {
    return null;
  }
}

async function mailSupport({ ref, name, email, subject, message, userId }) {
  const { RESEND_API_KEY, RECEIPT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !RECEIPT_FROM_EMAIL) return { sent: false, reason: 'not_configured' };

  const to = BUSINESS.supportEmail;
  const text = [
    `Ticket ${ref}`,
    `From: ${name} <${email}>`,
    userId ? `Account: ${userId}` : 'Account: not signed in',
    `Subject: ${subject}`,
    '',
    message,
  ].join('\n');

  const html = `
    <p><strong>Ticket ${escapeHtml(ref)}</strong></p>
    <p>From: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;<br>
       Account: ${userId ? escapeHtml(userId) : 'not signed in'}<br>
       Subject: ${escapeHtml(subject)}</p>
    <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RECEIPT_FROM_EMAIL,
        to,
        reply_to: email,
        subject: `[${ref}] ${subject}`,
        text,
        html,
      }),
    });
    if (!resp.ok) {
      console.error('support-ticket: Resend failed', resp.status, await resp.text().catch(() => ''));
      return { sent: false, reason: 'send_failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error('support-ticket: Resend threw', err);
    return { sent: false, reason: 'exception' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'not_configured' });
  }

  const body = req.body || {};
  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email).toLowerCase();
  const subject = clean(body.subject, MAX.subject);
  const message = String(body.message ?? '').trim().slice(0, MAX.message);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const user = await whoIs(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
  const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32) : null;
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);

  // Crude flood control: more than 5 tickets from one IP in an hour is not
  // a person with a problem.
  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const countResp = await fetch(
      `${SUPABASE_URL}/rest/v1/support_tickets?ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact' } }
    );
    const range = countResp.headers.get('content-range') || '';
    const total = Number(range.split('/')[1] || 0);
    if (total >= 5) return res.status(429).json({ error: 'too_many_tickets' });
  }

  const ref = makeRef();
  const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      ticket_ref: ref,
      user_id: user?.id ?? null,
      name,
      email,
      subject,
      message,
      ip_hash: ipHash,
      user_agent: userAgent,
    }),
  });

  if (!insertResp.ok) {
    console.error('support-ticket: insert failed', insertResp.status, await insertResp.text().catch(() => ''));
    return res.status(500).json({ error: 'save_failed' });
  }

  const mail = await mailSupport({ ref, name, email, subject, message, userId: user?.id ?? null });

  return res.status(200).json({ ticketRef: ref, emailed: mail.sent === true });
}
