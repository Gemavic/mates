// supabase/functions/support-voice/index.ts
//
// "A call comes in" webhook for the support number (+1 209 348 6842).
//
// The number was still on Twilio's default demo greeting: it answered, played
// music, and hung up without reaching anybody. A caller with a payment problem
// sat through it and gave up, and nobody ever knew they had called.
//
// This answers briefly, rings a real phone, and takes a message if that phone
// does not pick up.
//
// Set as the number's Voice "A call comes in" webhook (HTTP POST):
//   https://<project-ref>.supabase.co/functions/v1/support-voice
// Deploy with verify_jwt = false - Twilio cannot present a Supabase JWT; the
// request is authenticated by Twilio's own signature instead.
//
// Required secret:
//   SUPPORT_FORWARD_NUMBER  E.164, e.g. +1416...  The phone to ring.
//                           Kept in secrets, never in the repo.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Only ever dial the number in SUPPORT_FORWARD_NUMBER. Nothing a caller sends
// can influence who gets dialled, so this cannot be turned into a relay for
// premium-rate calls billed to the account.
const E164 = /^\+[1-9]\d{7,14}$/;

const GREETING =
  'Thank you for calling Dates Care. Please hold while we connect you to our support team.';
const VOICEMAIL_PROMPT =
  'Sorry, nobody is available right now. Please leave your name, number and message after the tone, and we will call you back.';
const NO_FORWARD_PROMPT =
  'Thank you for calling Dates Care. Our phone line is not staffed at the moment. ' +
  'Please leave a message after the tone, or email support at dates dot care.';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twiml(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
  );
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureIsValid(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): Promise<boolean> {
  let payload = url;
  for (const key of Object.keys(params).sort()) payload += key + params[key];

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  return constantTimeEquals(expected, signature);
}

/**
 * The edge runtime strips /functions/v1 before the function sees the request,
 * but Twilio signs the URL exactly as configured. Accept a signature matching
 * either shape - both address this same function, so this widens nothing.
 */
function candidateUrls(req: Request): string[] {
  const override = Deno.env.get('TWILIO_SUPPORT_WEBHOOK_URL');
  if (override) return [override];

  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? url.host;
  const path = url.pathname.replace(/^\/functions\/v1/, '');

  return [
    `https://${host}/functions/v1${path}${url.search}`,
    `https://${host}${path}${url.search}`,
  ];
}

/** Record a message, then end the call politely. */
function voicemail(prompt: string): string {
  return (
    `<Say voice="alice">${xmlEscape(prompt)}</Say>` +
    `<Record maxLength="120" playBeep="true" trim="trim-silence"/>` +
    `<Say voice="alice">We did not receive a message. Goodbye.</Say>` +
    `<Hangup/>`
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200 });

  const url = new URL(req.url);
  const params: Record<string, string> = {};

  if (req.method === 'POST') {
    const form = await req.formData();
    for (const [k, v] of form.entries()) params[k] = String(v);
  } else {
    for (const [k, v] of url.searchParams.entries()) params[k] = v;
  }

  // A bare visit, for confirming the URL pasted into the console is reachable.
  if (!params.CallSid) {
    return new Response(
      'support-voice is deployed. Twilio POSTs here when someone calls the support number.',
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN is not set - refusing to answer unauthenticated.');
    return twiml(`<Say voice="alice">${xmlEscape(NO_FORWARD_PROMPT)}</Say><Hangup/>`);
  }

  const signature = req.headers.get('X-Twilio-Signature') ?? '';
  const candidates = candidateUrls(req);
  const signedParams = req.method === 'POST' ? params : {};

  let valid = false;
  if (signature) {
    for (const candidate of candidates) {
      if (await signatureIsValid(authToken, candidate, signedParams, signature)) {
        valid = true;
        break;
      }
    }
  }

  if (!valid) {
    console.error('Rejected support webhook: bad or missing X-Twilio-Signature', {
      hasSignature: !!signature,
      triedUrls: candidates,
    });
    return new Response('Forbidden', { status: 403 });
  }

  const forwardTo = (Deno.env.get('SUPPORT_FORWARD_NUMBER') ?? '').trim();

  // No number configured, or a malformed one: take a message rather than drop
  // the caller the way the demo greeting did.
  if (!E164.test(forwardTo)) {
    if (forwardTo) {
      console.error('SUPPORT_FORWARD_NUMBER is not valid E.164 - taking a message instead.');
    }
    return twiml(voicemail(NO_FORWARD_PROMPT));
  }

  // callerId must be a number owned by the account, so use the number that was
  // dialled. Using the caller's own number here would be rejected by Twilio.
  const calledNumber = params.To ?? '';
  const callerId = E164.test(calledNumber) ? calledNumber : forwardTo;

  console.log('Forwarding support call', { from: params.From, callSid: params.CallSid });

  // answerOnBridge keeps the caller hearing ringing rather than dead air, and
  // the call only counts as answered once a human actually picks up.
  return twiml(
    `<Say voice="alice">${xmlEscape(GREETING)}</Say>` +
    `<Dial answerOnBridge="true" timeout="25" callerId="${xmlEscape(callerId)}">` +
    `<Number>${xmlEscape(forwardTo)}</Number>` +
    `</Dial>` +
    voicemail(VOICEMAIL_PROMPT)
  );
});
