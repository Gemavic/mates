// supabase/functions/twilio-call-status/index.ts
//
// Twilio tells this endpoint when a call is answered and when it ends. It is
// the server's only source of truth for how long a paid call lasted: the
// browser shows a clock, but nothing the browser says moves any credits.
//
//   Video  - set as StatusCallback when twilio-video-token creates the room.
//            Events: participant-connected, participant-disconnected,
//            room-ended (+ others we ignore). ?session=<call_sessions.id>
//   Voice  - <Dial action=...&leg=dial> fires when the dialled leg finishes,
//            carrying DialCallStatus and DialCallDuration (seconds connected).
//            <Client statusCallback=...&leg=client statusCallbackEvent=
//            "answered completed"> fires as the callee's leg progresses.
//
// Deploy with verify_jwt = false: Twilio cannot present a Supabase JWT. Every
// request is authenticated by Twilio's own signature over the exact URL that
// was handed to it, query string included, so a forged callback cannot end
// somebody else's call early or mark it answered.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** Same shape as twilio-voice-twiml: the runtime strips /functions/v1. */
function candidateUrls(req: Request): string[] {
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? url.host;
  const search = url.search;
  const path = url.pathname.replace(/^\/functions\/v1/, '');
  return [
    `https://${host}/functions/v1${path}${search}`,
    `https://${host}${path}${search}`,
  ];
}

async function rpc(name: string, args: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await resp.json().catch(() => null);
  if (!resp.ok) console.error(`rpc ${name} failed`, resp.status, body);
  return body;
}

function twiml(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
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

  if (!params.AccountSid && !params.CallSid && !params.RoomSid) {
    return new Response('twilio-call-status is deployed. Twilio posts call events here.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN is not set - cannot verify Twilio signature.');
    return new Response('Not configured', { status: 500 });
  }

  const signature = req.headers.get('X-Twilio-Signature') ?? '';
  const signedParams = req.method === 'POST' ? params : {};
  let valid = false;
  if (signature) {
    for (const candidate of candidateUrls(req)) {
      if (await signatureIsValid(authToken, candidate, signedParams, signature)) {
        valid = true;
        break;
      }
    }
  }
  if (!valid) {
    console.error('Rejected call-status webhook: bad or missing X-Twilio-Signature');
    return new Response('Forbidden', { status: 403 });
  }

  const session = url.searchParams.get('session') ?? '';
  const leg = url.searchParams.get('leg') ?? '';
  if (!UUID.test(session)) {
    console.error('call-status webhook without a valid session id');
    return new Response('Bad Request', { status: 400 });
  }

  const at = params.Timestamp && !Number.isNaN(Date.parse(params.Timestamp))
    ? new Date(params.Timestamp).toISOString()
    : new Date().toISOString();

  // ----- Video (room status callbacks) -------------------------------------
  if (params.RoomSid) {
    const event = params.StatusCallbackEvent ?? '';
    const identity = params.ParticipantIdentity ?? '';

    if (event === 'participant-connected') {
      // The room is created by the caller's token request, so the first
      // identity to connect is normally the caller. The meter starts when a
      // SECOND identity is present - i.e. the person they called answered.
      const info = await rpc('call_session_peer_connected', {
        p_session_id: session,
        p_identity: identity,
        p_at: at,
      });
      console.log('video participant-connected', { session, identity, info });
    } else if (event === 'participant-disconnected') {
      // Either side leaving ends the paid conversation.
      const duration = Number.parseInt(params.ParticipantDuration ?? '', 10);
      const info = await rpc('end_call_session', {
        p_session_id: session,
        p_at: at,
        p_reason: 'participant_left',
        p_duration_seconds: null,
        p_event: `${event}:${identity}${Number.isFinite(duration) ? `:${duration}s` : ''}`,
      });
      console.log('video participant-disconnected', { session, identity, info });
    } else if (event === 'room-ended') {
      const info = await rpc('end_call_session', {
        p_session_id: session,
        p_at: at,
        p_reason: 'room_ended',
        p_duration_seconds: null,
        p_event: event,
      });
      console.log('video room-ended', { session, info });
    }
    return new Response('', { status: 204 });
  }

  // ----- Voice --------------------------------------------------------------
  if (leg === 'dial') {
    // <Dial action>: the dialled leg is over. DialCallDuration is the number
    // of seconds the two were actually connected - the billable time.
    const status = params.DialCallStatus ?? 'unknown';
    const duration = Number.parseInt(params.DialCallDuration ?? '', 10);
    const info = await rpc('end_call_session', {
      p_session_id: session,
      p_at: at,
      p_reason: status,
      p_duration_seconds: Number.isFinite(duration) ? duration : null,
      p_event: `dial:${status}`,
    });
    console.log('voice dial finished', { session, status, duration, info });
    // We are the TwiML for what happens next: nothing.
    return twiml('<Hangup/>');
  }

  if (leg === 'client') {
    // <Client statusCallback>: answered / completed on the callee's leg.
    const status = params.CallStatus ?? '';
    if (status === 'in-progress' || status === 'answered') {
      const info = await rpc('mark_call_answered', { p_session_id: session, p_at: at, p_event: `client:${status}` });
      console.log('voice answered', { session, info });
    } else if (status === 'completed' || status === 'busy' || status === 'no-answer' || status === 'failed' || status === 'canceled') {
      const duration = Number.parseInt(params.CallDuration ?? '', 10);
      const info = await rpc('end_call_session', {
        p_session_id: session,
        p_at: at,
        p_reason: status,
        p_duration_seconds: Number.isFinite(duration) ? duration : null,
        p_event: `client:${status}`,
      });
      console.log('voice client leg ended', { session, status, duration, info });
    }
    return new Response('', { status: 204 });
  }

  console.log('call-status: unrecognised callback shape', { session, leg, keys: Object.keys(params) });
  return new Response('', { status: 204 });
});
