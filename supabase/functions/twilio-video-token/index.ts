import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TokenRequest {
  roomName: string;
  userId?: string;
}

/**
 * Twilio's REST API, authenticated with the same API key that signs tokens.
 */
async function twilioVideo(
  apiKey: string,
  apiSecret: string,
  path: string,
  form: Record<string, string>
): Promise<{ status: number; body: any }> {
  const resp = await fetch(`https://video.twilio.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${apiKey}:${apiSecret}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form).toString(),
  });
  const body = await resp.json().catch(() => null);
  return { status: resp.status, body };
}

async function serviceRpc(name: string, args: Record<string, unknown>): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await resp.json().catch(() => null);
  if (!resp.ok) console.error(`rpc ${name} failed`, resp.status, body);
  return resp.ok ? body : null;
}

/**
 * Read a secret with surrounding whitespace removed.
 *
 * A secret pasted into the dashboard can arrive with a trailing newline. It
 * is invisible in every UI, but the Account SID goes into the token's `sub`
 * claim verbatim, and Twilio rejects the whole token with "Invalid Access
 * Token issuer/subject" - which reads like the credentials are wrong rather
 * than one character too long.
 */
const secret = (name: string) => (Deno.env.get(name) ?? '').trim();

function generateVideoToken(accountSid: string, apiKey: string, apiSecret: string, roomName: string, identity: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 14400;

  const header = {
    cty: 'twilio-fpa;v=1',
    typ: 'JWT',
    alg: 'HS256'
  };

  const payload = {
    jti: `${apiKey}-${now}`,
    iss: apiKey,
    sub: accountSid,
    exp: exp,
    grants: {
      identity: identity,
      video: {
        room: roomName
      }
    }
  };

  const base64url = (str: string) => btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));

  const encoder = new TextEncoder();
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const key = encoder.encode(apiSecret);

  return crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => 
    crypto.subtle.sign('HMAC', cryptoKey, data)
  ).then(signature => {
    const base64Signature = base64url(String.fromCharCode(...new Uint8Array(signature)));
    return `${encodedHeader}.${encodedPayload}.${base64Signature}`;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const TWILIO_ACCOUNT_SID = secret('TWILIO_ACCOUNT_SID');
    const TWILIO_API_KEY = secret('TWILIO_API_KEY');
    const TWILIO_API_SECRET = secret('TWILIO_API_SECRET');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Twilio video credentials not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET.',
          testMode: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fail loudly here rather than minting a token Twilio will refuse. A
    // malformed SID or key produces an error at the far end of the call that
    // says nothing about which credential is wrong.
    if (!/^AC[0-9a-fA-F]{32}$/.test(TWILIO_ACCOUNT_SID) || !/^SK[0-9a-fA-F]{32}$/.test(TWILIO_API_KEY)) {
      console.error('Twilio credential is malformed; refusing to mint a token.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio credentials are misconfigured. Video calling is unavailable.',
          errorCode: 'TWILIO_CREDENTIALS_MALFORMED',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient.rpc(
      'check_and_update_rate_limit',
      {
        p_user_id: user.id,
        p_action_type: 'api_calls',
        p_increment: true,
      }
    );

    if (rateLimitError || !rateLimitCheck) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { roomName, userId }: TokenRequest = await req.json();

    if (!roomName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Room name is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // The identity used to come from the request body, so a caller could
    // mint a token that named somebody else in the room. It is the signed-in
    // user, full stop. A mismatched body value is rejected rather than ignored.
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden', errorCode: 'IDENTITY_MISMATCH' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Who pays is decided here, not by the browser. The caller is charged per
    // minute; the callee is not. A member is the callee for this room only if
    // a live invite in call_invites names them as such - that row is written
    // by the caller and is not something the callee can forge for themselves.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: invite } = await supabaseClient
      .from('call_invites')
      .select('id')
      .eq('room_name', roomName)
      .eq('callee_id', user.id)
      .in('status', ['ringing', 'accepted'])
      .gte('created_at', tenMinutesAgo)
      .limit(1)
      .maybeSingle();
    const isCallee = !!invite;

    // No token for a caller who cannot pay for one minute. Staff calling
    // grants and platinum/elite tiers pass, exactly as they do in spend_credits.
    const { data: gate, error: gateError } = isCallee
      ? { data: { allowed: true, reason: 'callee' }, error: null }
      : await supabaseClient.rpc('can_start_call', { p_kind: 'video' });
    if (gateError || !gate?.allowed) {
      const reason = gate?.reason ?? 'gate_failed';
      return new Response(
        JSON.stringify({
          success: false,
          error: reason === 'insufficient_credits'
            ? `You need at least ${gate?.per_minute ?? 50} credits to start a video call.`
            : 'You cannot start a call right now.',
          errorCode: reason.toUpperCase(),
          totalCredits: gate?.total_credits ?? null,
        }),
        {
          status: reason === 'insufficient_credits' ? 402 : 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const identity = `user_${user.id}`;

    // The meter. For the caller, open a call_sessions row and create the
    // Twilio room ourselves - with the callback that reports who joined and
    // left, and a MaxParticipantDuration equal to what this caller can pay
    // for. The browser used to run the meter; Twilio and the database now do.
    // The callee joins the room that already exists and pays nothing.
    let sessionId: string | null = null;
    let maxSeconds: number | null = null;
    if (!isCallee) {
      // Who is being called is on the invite the caller just wrote.
      const { data: outgoing } = await supabaseClient
        .from('call_invites')
        .select('callee_id')
        .eq('room_name', roomName)
        .eq('caller_id', user.id)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const session = await serviceRpc('start_call_session', {
        p_caller_id: user.id,
        p_callee_id: outgoing?.callee_id ?? null,
        p_kind: 'video',
        p_room_name: roomName,
        p_provider_sid: null,
      });
      if (!session?.allowed || !session.session_id) {
        const reason = session?.reason ?? 'session_failed';
        return new Response(
          JSON.stringify({
            success: false,
            error: reason === 'insufficient_credits'
              ? `You need at least ${session?.per_minute ?? 50} credits to start a video call.`
              : 'You cannot start a call right now.',
            errorCode: String(reason).toUpperCase(),
          }),
          { status: reason === 'insufficient_credits' ? 402 : 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      sessionId = session.session_id;
      maxSeconds = session.max_seconds;

      const callback = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-call-status?session=${sessionId}`;
      const room = await twilioVideo(TWILIO_API_KEY, TWILIO_API_SECRET, '/Rooms', {
        UniqueName: roomName,
        Type: 'group',
        MaxParticipants: '2',
        MaxParticipantDuration: String(maxSeconds),
        EmptyRoomTimeout: '1',
        UnusedRoomTimeout: '2',
        StatusCallback: callback,
        StatusCallbackMethod: 'POST',
      });

      if (room.status === 201 && room.body?.sid) {
        await serviceRpc('attach_call_provider_sid', { p_session_id: sessionId, p_provider_sid: room.body.sid });
      } else if (room.body?.code === 53113) {
        // A room by this name is already in progress (a very fast redial).
        // It carries the cap and callback of the session that created it.
        console.log('Room already in progress; joining it', { roomName });
      } else {
        // No room means no cap and no callbacks - a call we could not meter.
        // Refuse rather than connect it for free.
        console.error('Could not create Twilio room', room.status, room.body);
        await serviceRpc('end_call_session', {
          p_session_id: sessionId, p_at: new Date().toISOString(),
          p_reason: 'room_create_failed', p_duration_seconds: null, p_event: 'token',
        });
        return new Response(
          JSON.stringify({ success: false, error: 'Video calling is temporarily unavailable. Please try again shortly.', errorCode: 'ROOM_CREATE_FAILED' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const videoToken = await generateVideoToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      roomName,
      identity
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        token: videoToken,
        roomName,
        identity,
        sessionId,
        maxSeconds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating video token:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});