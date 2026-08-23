// supabase/functions/twilio-voice-twiml/index.ts
//
// Voice Request URL for the TwiML App referenced by TWILIO_TWIML_APP_SID.
//
// When AudioChat places a call, twilioVoice.ts runs
//   device.connect({ params: { To: `user_<uuid>` } })
// Twilio then asks THIS endpoint what to do with that call, and connects the
// caller to whatever this returns. Without it the token mints fine and the call
// dies immediately, because Twilio has nowhere to ask.
//
// Deploy with verify_jwt = false: Twilio cannot present a Supabase JWT. The
// request is authenticated instead by Twilio's own request signature.
//
// Set this function's URL as the TwiML App's "Voice Request URL" (HTTP POST):
//   https://<project-ref>.supabase.co/functions/v1/twilio-voice-twiml

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Only ever dial a browser client identity minted by twilio-voice-token, which
// builds them as `user_${userId}` from an authenticated Supabase user id. This
// pattern is the toll-fraud guard: without it, anyone who found this URL could
// pass To=+1900... and bill premium-rate calls to the account.
const CLIENT_IDENTITY = /^user_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * Twilio signs each webhook: base64(HMAC-SHA1(authToken, url + sortedParams)).
 * For GET the params live in the query string and nothing is appended.
 * See https://www.twilio.com/docs/usage/security#validating-requests
 */
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
 * Twilio signs the URL exactly as configured in the TwiML App, i.e.
 *   https://<ref>.supabase.co/functions/v1/twilio-voice-twiml
 * but the edge runtime strips the /functions/v1 prefix before the function sees
 * the request, so req.url is https://<ref>.supabase.co/twilio-voice-twiml.
 * Signing that produced a mismatch and rejected every real Twilio call.
 *
 * Rather than assume one shape, build every URL that legitimately addresses
 * this endpoint and accept a signature matching any of them. All candidates are
 * this same function, so this widens nothing security-wise - the HMAC still has
 * to verify under TWILIO_AUTH_TOKEN.
 */
function candidateUrls(req: Request): string[] {
  const override = Deno.env.get('TWILIO_VOICE_WEBHOOK_URL');
  if (override) return [override];

  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? url.host;
  const search = url.search;
  const path = url.pathname.replace(/^\/functions\/v1/, '');

  return [
    `https://${host}/functions/v1${path}${search}`,
    `https://${host}${path}${search}`,
  ];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  const url = new URL(req.url);
  let params: Record<string, string> = {};

  if (req.method === 'POST') {
    const form = await req.formData();
    for (const [k, v] of form.entries()) params[k] = String(v);
  } else {
    for (const [k, v] of url.searchParams.entries()) params[k] = v;
  }

  // A bare visit with no call parameters - useful for confirming the function is
  // reachable at the URL pasted into the TwiML App.
  if (!params.To && !params.CallSid) {
    return new Response(
      'twilio-voice-twiml is deployed. Twilio POSTs here when a browser client places a call.',
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) {
    // Refuse rather than run unauthenticated: an open voice webhook lets anyone
    // place calls billed to this Twilio account.
    console.error('TWILIO_AUTH_TOKEN is not set - cannot verify Twilio signature, refusing the call.');
    return twiml('<Say>Calling is not fully configured. Please contact support.</Say><Hangup/>');
  }

  const signature = req.headers.get('X-Twilio-Signature') ?? '';
  const signedParams = req.method === 'POST' ? params : {};
  const candidates = candidateUrls(req);

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
    console.error('Rejected voice webhook: bad or missing X-Twilio-Signature', {
      hasSignature: !!signature,
      triedUrls: candidates,
    });
    return new Response('Forbidden', { status: 403 });
  }

  const to = params.To ?? '';
  if (!CLIENT_IDENTITY.test(to)) {
    console.error('Rejected voice webhook: To is not a browser client identity', { to });
    return twiml('<Say>That number cannot be dialled from this app.</Say><Hangup/>');
  }

  console.log('Bridging call', { from: params.From, to, callSid: params.CallSid });

  // answerOnBridge keeps the caller hearing ringing until the callee actually
  // answers, instead of Twilio answering immediately and going silent.
  return twiml(
    `<Dial answerOnBridge="true" timeout="30"><Client>${xmlEscape(to)}</Client></Dial>`
  );
});
