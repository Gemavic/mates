// supabase/functions/call-reconcile/index.ts
//
// The database meters calls by itself (pg_cron -> call_metering_tick). What it
// cannot do is hang a call up: that takes a Twilio REST call. When the meter
// finds a caller who can no longer pay it sets hangup_requested, and the tick
// posts here. This function ends those rooms and calls at Twilio and records
// that it did.
//
// Deploy with verify_jwt = false. The cron authenticates with a shared key
// held in Vault (x-reconcile-key), checked by call_reconcile_key_matches().
// Anything else is refused.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const secret = (name: string) => (Deno.env.get(name) ?? '').trim();

async function rpc(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; body: any }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await resp.json().catch(() => null);
  if (!resp.ok) console.error(`rpc ${name} failed`, resp.status, body);
  return { ok: resp.ok, body };
}

async function twilioPost(url: string, auth: string, form: Record<string, string>): Promise<{ status: number; body: any }> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(auth), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
  const body = await resp.json().catch(() => null);
  return { status: resp.status, body };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const key = req.headers.get('x-reconcile-key') ?? '';
  const check = await rpc('call_reconcile_key_matches', { p_key: key });
  if (!check.ok || check.body !== true) {
    return new Response('Forbidden', { status: 403 });
  }

  const accountSid = secret('TWILIO_ACCOUNT_SID');
  const authToken = secret('TWILIO_AUTH_TOKEN');
  const apiKey = secret('TWILIO_API_KEY');
  const apiSecret = secret('TWILIO_API_SECRET');

  const due = await rpc('call_hangups_due', {});
  const list: Array<{ id: string; kind: string; provider_sid: string | null; room_name: string | null }> =
    Array.isArray(due.body) ? due.body : [];

  const results: Array<Record<string, unknown>> = [];
  for (const s of list) {
    let outcome: Record<string, unknown> = { id: s.id, kind: s.kind };
    try {
      if (s.kind === 'video') {
        // Rooms are addressable by SID or, while in progress, by UniqueName.
        const target = s.provider_sid || s.room_name;
        if (!target || !apiKey || !apiSecret) throw new Error('no room target or video credentials');
        const r = await twilioPost(`https://video.twilio.com/v1/Rooms/${encodeURIComponent(target)}`, `${apiKey}:${apiSecret}`, { Status: 'completed' });
        outcome.twilio = r.status;
        // 404 / already completed both mean the room is over.
        if (r.status >= 400 && r.status !== 404 && r.body?.code !== 53118) throw new Error(`twilio ${r.status} ${JSON.stringify(r.body)}`);
      } else {
        if (!s.provider_sid || !accountSid || !authToken) throw new Error('no call sid or voice credentials');
        const r = await twilioPost(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${encodeURIComponent(s.provider_sid)}.json`, `${accountSid}:${authToken}`, { Status: 'completed' });
        outcome.twilio = r.status;
        if (r.status >= 400 && r.status !== 404) throw new Error(`twilio ${r.status} ${JSON.stringify(r.body)}`);
      }
      await rpc('mark_call_hung_up', { p_session_id: s.id });
      // The status callback will close the session with the true duration;
      // if it never arrives the cron closes it at the cap.
      outcome.hung_up = true;
    } catch (err) {
      console.error('Could not hang up call', s, err);
      outcome.error = String(err);
    }
    results.push(outcome);
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
