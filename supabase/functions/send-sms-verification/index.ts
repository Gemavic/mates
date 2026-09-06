// send-sms-verification
//
// The verification code is generated HERE, stored HERE, and sent by Twilio.
// It is never returned to the caller.
//
// It used to arrive in the request body: the browser made the six digits,
// wrote them to the database itself, passed them here to be texted, and -
// whenever Twilio was unconfigured or refused - displayed them to the user
// in an alert box. Anyone could therefore verify a phone number they did not
// own. On a site where a verified badge is part of why someone agrees to
// meet a stranger, that badge has to be earned.
//
// Required Supabase Edge Function secrets:
//   TWILIO_ACCOUNT_SID    (starts with AC)
//   TWILIO_AUTH_TOKEN     (32 characters - NOT the API key secret)
//   TWILIO_PHONE_NUMBER   (an SMS-capable number you own, E.164, e.g. +1416...)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ success: false, error: 'Missing authorization' }, 401);
    }

    const asUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await asUser.auth.getUser();
    if (authError || !user) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }

    const { data: rateOk, error: rateErr } = await asUser.rpc('check_and_update_rate_limit', {
      p_user_id: user.id,
      p_action_type: 'api_calls',
      p_increment: true,
    });
    if (rateErr || !rateOk) {
      return json({
        success: false,
        error: 'Too many attempts. Please wait a few minutes and try again.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body?.phoneNumber ?? '').trim();
    if (!rawPhone) {
      return json({ success: false, error: 'A phone number is required.' }, 400);
    }

    // E.164. A bare 10-digit number is assumed to be US/Canada.
    let phone = rawPhone.replace(/[^0-9+]/g, '');
    if (!phone.startsWith('+')) phone = `+1${phone.replace(/\D/g, '')}`;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return json({
        success: false,
        error: 'That does not look like a valid phone number. Include the country code, e.g. +1 416 555 0123.',
        errorCode: 'BAD_NUMBER',
      }, 400);
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      // No code is generated, stored, or revealed when we cannot actually
      // send one. Failing closed is the whole point.
      const missing = [
        !TWILIO_ACCOUNT_SID && 'TWILIO_ACCOUNT_SID',
        !TWILIO_AUTH_TOKEN && 'TWILIO_AUTH_TOKEN',
        !TWILIO_PHONE_NUMBER && 'TWILIO_PHONE_NUMBER',
      ].filter(Boolean);
      console.error('SMS not configured. Missing secrets:', missing.join(', '));
      return json({
        success: false,
        error: 'Text-message verification is not switched on yet.',
        errorCode: 'SMS_NOT_CONFIGURED',
        missingSecrets: missing,
      }, 200);
    }

    if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
      console.error('TWILIO_ACCOUNT_SID does not start with AC - is it an API key SID?');
      return json({
        success: false,
        error: 'Text-message verification is misconfigured.',
        errorCode: 'SMS_NOT_CONFIGURED',
      }, 200);
    }

    // Generated server-side, with a CSPRNG rather than Math.random().
    const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');

    // Stored with the service role, into a column the member cannot read.
    const asService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // verification_requests.full_name is NOT NULL with no default, so an
    // upsert that creates the row must supply one. The client used to pass
    // it; now that the row can first be created here - by someone who
    // reaches the phone step before uploading anything - it has to come from
    // the profile instead, or the insert fails and phone verification
    // becomes impossible for that member.
    const { data: profile } = await asService
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const fullName =
      (profile?.full_name && String(profile.full_name).trim()) ||
      (user.user_metadata?.full_name && String(user.user_metadata.full_name).trim()) ||
      'Member';

    const { error: storeError } = await asService
      .from('verification_requests')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        phone_number: phone,
        otp_code: otp,
        otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (storeError) {
      console.error('Could not store the verification code:', storeError);
      return json({ success: false, error: 'Could not start verification. Please try again.' }, 500);
    }

    const message =
      `Your Dates.care verification code is: ${otp}\n\n` +
      `It expires in 10 minutes. If you did not ask for it, ignore this message.`;

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: TWILIO_PHONE_NUMBER, Body: message }),
      },
    );

    const responseText = await twilioResponse.text();

    if (!twilioResponse.ok) {
      let err: any = {};
      try { err = JSON.parse(responseText); } catch { err = { message: responseText }; }
      console.error('Twilio refused the message:', twilioResponse.status, err);

      // The stored code is cleared: no code was delivered, so none should work.
      await asService
        .from('verification_requests')
        .update({ otp_code: null, otp_expires_at: null })
        .eq('user_id', user.id);

      const codeMap: Record<number, { errorCode: string; error: string }> = {
        20003: { errorCode: 'SMS_NOT_CONFIGURED', error: 'Text-message verification is misconfigured.' },
        21211: { errorCode: 'BAD_NUMBER', error: 'That phone number was rejected as invalid.' },
        21608: { errorCode: 'UNVERIFIED_TRIAL_NUMBER', error: 'Our SMS account is still in trial mode and can only text numbers it has been given in advance.' },
        21606: { errorCode: 'SMS_NOT_CONFIGURED', error: 'Text-message verification is misconfigured.' },
        21614: { errorCode: 'BAD_NUMBER', error: 'That number cannot receive text messages.' },
      };
      const mapped = codeMap[err?.code] ?? {
        errorCode: 'SEND_FAILED',
        error: 'We could not send the code. Please check the number and try again.',
      };

      return json({ success: false, ...mapped, twilioCode: err?.code ?? null }, 200);
    }

    const twilioData = JSON.parse(responseText);
    console.log('Verification SMS accepted by Twilio. SID:', twilioData.sid);

    return json({ success: true, message: 'Verification code sent.' });
  } catch (error: any) {
    console.error('send-sms-verification failed:', error);
    return json({ success: false, error: 'An unexpected error occurred.' }, 500);
  }
});
